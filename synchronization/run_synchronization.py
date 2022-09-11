#!/usr/bin/env python3
import collections
import os
import datetime
import shutil
import zipfile
import typing
import argparse
import logging

import database_service
from database_service import EntryStatus
import pdb_service
import prankweb_service
import p2rank_to_funpdbe

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _read_arguments() -> typing.Dict[str, str]:
    from_date = datetime.datetime.today() - datetime.timedelta(weeks=2)
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--server",
        default="https://prankweb.cz",
        help="URL of prankweb server, without '/' at the end.")
    parser.add_argument(
        "--server-directory",
        help="Optional path to prediction directory.")
    parser.add_argument(
        "--data",
        help="Path to database directory.")
    parser.add_argument(
        "--from",
        default=from_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        help="XSD data to from which update in format 2021-12-01T00:00:00Z.")
    parser.add_argument(
        "--p2rank-version",
        help="Used p2rank version.")
    parser.add_argument(
        "--retry-prankweb",
        help="Re-run failed tasks.",
        action="store_true",
        default=False)
    parser.add_argument(
        "--queue-limit",
        help="Limit the number of execution in a queue "
             "managed by the synchronization.",
        type=int,
        default=4)
    return vars(parser.parse_args())


def main(args):
    _init_logging()
    data_directory = args["data"]
    os.makedirs(data_directory, exist_ok=True)
    database = database_service.load_database(data_directory)
    logger.info(f"Fetching PDB records from '{args['from']} ...")
    new_pdb_records = pdb_service.get_deposited_from(args["from"])
    logger.info(f"Found {len(new_pdb_records)} new records.")
    logger.debug("New records: " + ",".join(
        [record.code for record in new_pdb_records]))
    add_pdb_to_database(database, new_pdb_records)
    database_service.save_database(data_directory, database)
    if args["retry_prankweb"]:
        counter = change_prankweb_failed_to_new(database)
        database_service.save_database(data_directory, database)
        logger.info(f"Reverted {counter} prankweb failed tasks.")
    logger.info("Synchronizing with prankweb server ...")
    prankweb_service.initialize(args["server"], args["server_directory"])
    synchronize_prankweb_with_database(database, args["queue_limit"])
    database["pdb"]["lastSynchronization"] = args["from"]
    database_service.save_database(data_directory, database)
    logger.info("Downloading result from prankweb server ...")
    try:
        prepare_funpdbe_files(args["p2rank_version"], data_directory, database)
    except:
        database_service.save_database(data_directory, database)
        logger.info("Can't prepare functional PDBe files.")
    database_service.save_database(data_directory, database)
    log_status_count(database)
    logger.info("All done")


def _init_logging():
    """Setup logging for the script."""
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logging.getLogger().addHandler(handler)


def add_pdb_to_database(
        database, new_records: typing.List[pdb_service.PdbRecord]):
    """Add given records to database as new records."""
    from_date = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%SZ")
    for record in new_records:
        if record.code in database["data"]:
            continue
        database["data"][record.code] = {
            "status": EntryStatus.NEW.value,
            "createDate": from_date,
            "pdbReleaseDate": record.release,
        }


def change_prankweb_failed_to_new(database):
    result = 0
    for code, record in database["data"].items():
        if record["status"] == EntryStatus.PRANKWEB_FAILED.value:
            record["status"] = EntryStatus.NEW.value
    return result


def synchronize_prankweb_with_database(database, queue_limit):
    """Synchronize database with prankweb."""
    # Check those that we track as queued.
    logger.info("Checking queued ...")
    queued_count = 0
    for code, record in database["data"].items():
        if record["status"] == EntryStatus.PRANKWEB_QUEUED.value:
            request_computation_from_prankweb_for_code(code, record)
        if record["status"] == EntryStatus.PRANKWEB_QUEUED.value:
            queued_count += 1
    logger.info(f"Queued size {queued_count}")
    # Start new predictions, so the queued size is under given limit.
    for code, record in database["data"].items():
        if queued_count > queue_limit:
            break
        if record["status"] == EntryStatus.NEW.value:
            request_computation_from_prankweb_for_code(code, record)
        if record["status"] == EntryStatus.PRANKWEB_QUEUED.value:
            queued_count += 1


def request_computation_from_prankweb_for_code(code: str, record):
    """Request computation or check for status."""
    response = prankweb_service.retrieve_info(code)
    if response.status == -1:
        # This indicates error with the connection.
        logging.warning(f"Can't connect to server to check '{code}'.")
        return
    if not 199 < response.status < 299:
        record["status"] = EntryStatus.PRANKWEB_FAILED.value
        logger.warning(
            f"Request failed for '{code}' {response.status}\n   {response.body}")
        return
    # Make the time same as for the rest of the application.
    record["prankwebCreatedDate"] = response.body["created"] + "Z"
    record["prankwebCheckDate"] = response.body["lastChange"] + "Z"
    if response.body["status"] == "successful":
        record["status"] = EntryStatus.PREDICTED.value
    elif response.body["status"] == "failed":
        record["status"] = EntryStatus.PRANKWEB_FAILED.value
    elif response.body["status"] == "queued" or \
            response.body["status"] == "running":
        # For both we see it as queued for completion.
        record["status"] = EntryStatus.PRANKWEB_QUEUED.value
    else:
        # We do not know what to do.
        ...
    logger.debug(f"Status changed to '{record['status']}' for '{code}' "
                 f" due to response '{response.body['status']}'")


def prepare_funpdbe_files(p2rank_version: str, data_directory: str, database):
    ftp_directory = get_ftp_directory(data_directory)
    os.makedirs(ftp_directory, exist_ok=True)
    configuration = funpdbe_configuration(p2rank_version)
    os.makedirs(os.path.join(data_directory, "working"), exist_ok=True)
    for code, record in database["data"].items():
        prepare_funpdbe_file(
            ftp_directory, data_directory, configuration, code, record)


def prepare_funpdbe_file(
        ftp_directory: str, data_directory: str,
        configuration: p2rank_to_funpdbe.Configuration,
        code: str, record):
    if not record["status"] == EntryStatus.PREDICTED.value:
        return
    working_directory = os.path.join(data_directory, "working", code)
    os.makedirs(working_directory, exist_ok=True)
    predictions_file, residues_file = retrieve_prediction_files(
        working_directory, code)
    if residues_file is None or residues_file is None:
        logger.error(f"Can't obtain prediction files for {code}, "
                     f"record ignored.")
        record["status"] = EntryStatus.FUNPDBE_FAILED.value
        return
    working_output = os.path.join(working_directory, f"{code.lower()}.json")
    try:
        p2rank_to_funpdbe.convert_p2rank_to_pdbe(
            configuration, code, predictions_file, residues_file,
            working_output)
        record["status"] = EntryStatus.CONVERTED.value
    except p2rank_to_funpdbe.EmptyPrediction:
        logger.error(f"Empty prediction for {code}, record ignored.")
        record["status"] = EntryStatus.EMPTY.value
        return
    except Exception as ex:
        logger.exception(f"Can't convert {code} to FunPDBe record.")
        error_log_file = os.path.join(working_directory, "error.log")
        with open(error_log_file, "w") as stream:
            stream.write(str(ex))
        record["status"] = EntryStatus.FUNPDBE_FAILED.value
        return
    target_directory = os.path.join(ftp_directory, code.lower()[1:3])
    os.makedirs(target_directory, exist_ok=True)
    target_output = os.path.join(target_directory, f"{code.lower()}.json")
    shutil.move(working_output, target_output)
    shutil.rmtree(working_directory)
    logger.debug(f"Done processing '{code}'.")


def get_ftp_directory(data_directory: str):
    return os.path.join(data_directory, "ftp")


def retrieve_prediction_files(working_directory: str, code: str):
    zip_path = retrieve_archive(working_directory, code)
    if zip_path is None:
        return None, None
    unpack_from_zip(
        zip_path,
        {"structure.pdb_predictions.csv", "structure.pdb_residues.csv"},
        working_directory
    )
    unpack_from_zip(
        zip_path,
        {"structure.pdb_predictions.csv", "structure.pdb_residues.csv"},
        working_directory
    )
    predictions_file = os.path.join(
        working_directory,
        "structure.pdb_predictions.csv")
    residues_file = os.path.join(
        working_directory,
        "structure.pdb_residues.csv")
    return predictions_file, residues_file


def retrieve_archive(working_directory: str, code: str):
    download_path = os.path.join(working_directory, f"{code}.zip")
    try:
        prankweb_service.retrieve_archive(code, download_path)
        return download_path
    except:
        logger.exception("Can't retrieve prankweb archive.")
        return None


def unpack_from_zip(zip_path: str, extract: typing.Set[str], destination: str):
    with zipfile.ZipFile(zip_path, "r") as zip_file:
        for file_name in zip_file.namelist():
            if file_name not in extract:
                continue
            zip_file.extract(file_name, destination)


def funpdbe_configuration(p2rank_version: str) \
        -> p2rank_to_funpdbe.Configuration:
    return p2rank_to_funpdbe.Configuration(
        "p2rank",
        "3.0",
        datetime.date.today().strftime("%d/%m/%Y"),
        prankweb_service.prediction_url_template(),
        p2rank_version
    )


def log_status_count(database):
    """Count and log the number of predictions for each type."""
    count_by_status = collections.defaultdict(int)
    for code, record in database["data"].items():
        count_by_status[record["status"]] += 1
    message = "\n".join(
        [f"    {name}: {value}" for name, value in count_by_status.items()])
    logger.info("Server synchronization summary: \n" + message)


if __name__ == "__main__":
    main(_read_arguments())
