#!/usr/bin/env python3
import os
import datetime
import shutil
from dataclasses import dataclass

import zipfile
import typing
import argparse
import logging
import database_service
from database_service import EntryStatus
import pdb_service
import prankweb_service
import pdbe_service
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
    # parser.add_argument(
    #     "--ftp-url",
    #     default="ftp-private.ebi.ac.uk",
    #     help="FTP server url")
    # parser.add_argument(
    #     "--ftp-user",
    #     help="FTP user name.")
    # parser.add_argument(
    #     "--ftp-password",
    #     help="FTP password.")
    parser.add_argument(
        "--p2rank-version",
        help="Used p2rank version.")
    parser.add_argument(
        "--strict-funpdbe",
        help="Stop on any FunPDBe related error.",
        action="store_true",
        default=False)
    return vars(parser.parse_args())


def main(args):
    _init_logging()
    data_directory = args["data"]
    os.makedirs(data_directory, exist_ok=True)
    database = database_service.load_database(data_directory)
    logger.info("Fetching PDB records from '" + args["from"] + "' ...")
    new_pdb_records = pdb_service.get_deposited_from(args["from"])
    add_pdb_to_database(database, new_pdb_records)
    database_service.save_database(data_directory, database)
    logger.info("Synchronizing with prankweb server ...")
    prankweb_service.initialize(args["server"], args["server_directory"])
    synchronize_prankweb(database)
    database["pdb"]["lastSynchronization"] = args["from"]
    database_service.save_database(data_directory, database)
    logger.info("Downloading result from prankweb server ...")
    try:
        prepare_funpdbe_files(
            args["strict_funpdbe"], args["p2rank_version"],
            data_directory, database)
    except:
        database_service.save_database(data_directory, database)
        logger.info("Can't prepare functional PDBe files.")
    database_service.save_database(data_directory, database)
    # This part of code has never been tested as we do employ
    # external tool to deal with FTP upload.
    #
    # if args["ftp_user"] is None:
    #     logger.info("Skipping upload to FTP server as no user is provided.")
    # else:
    #     logger.info("Uploading to FTP server ...")
    #     upload_to_funpdbe(
    #         args["ftp_url"], args["ftp_user"], args["ftp_password"],
    #         data_directory, database)
    #     database_service.save_database(data_directory, database)
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def add_pdb_to_database(
        database, new_records: typing.List[pdb_service.PdbRecord]):
    from_date = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%SZ")
    for record in new_records:
        if record.code in database["data"]:
            continue
        database["data"][record.code] = {
            "status": EntryStatus.NEW.value,
            "createDate": from_date,
            "pdbReleaseDate": record.release,
        }


def synchronize_prankweb(database):
    status_to_update = [
        EntryStatus.NEW.value,
        EntryStatus.PRANKWEB_QUEUED.value,
    ]
    for code, record in database["data"].items():
        if record["status"] not in status_to_update:
            continue
        logger.info(f"Checking prankweb for '{code}'")
        response = prankweb_service.retrieve_info(code)
        if response.status == -1:
            # This indicates error with the connection.
            logging.info("Can't connect to server.")
            continue
        if not 199 < response.status < 299:
            record["status"] = EntryStatus.PRANKWEB_FAILED.value
            logger.info(
                f"Request failed {code} {response.status}\n   {response.body}")
            continue
        # Make the time same as for the rest of the application.
        record["prankwebCreatedDate"] = response.body["created"] + "Z"
        record["prankwebCheckDate"] = response.body["lastChange"] + "Z"
        logger.info("Status:" + record["status"])
        if response.body["status"] == "successful":
            record["status"] = EntryStatus.PREDICTED.value
            continue
        elif response.body["status"] == "failed":
            record["status"] = EntryStatus.PRANKWEB_FAILED.value
            continue
        else:
            # The prediction is still running, so no change here.
            ...


def prepare_funpdbe_files(
        strict_mode: bool, p2rank_version: str, data_directory: str, database):
    ftp_directory = get_ftp_directory(data_directory)
    os.makedirs(ftp_directory, exist_ok=True)
    configuration = funpdbe_configuration(p2rank_version)
    os.makedirs(os.path.join(data_directory, "working"), exist_ok=True)
    for code, record in database["data"].items():
        prepare_funpdbe_file(
            strict_mode, ftp_directory, data_directory, configuration,
            code, record)


def prepare_funpdbe_file(
        strict_mode: bool, ftp_directory: str, data_directory: str,
        configuration: p2rank_to_funpdbe.Configuration,
        code: str, record):
    if not record["status"] == EntryStatus.PREDICTED.value:
        return
    working_directory = os.path.join(data_directory, "working", code)
    os.makedirs(working_directory, exist_ok=True)
    predictions_file, residues_file = retrieve_prediction_files(
        working_directory, code)
    if residues_file is None or residues_file is None:
        logger.exception(f"Can't obtain prediction files for {code}, "
                         f"record ignored.")
        if strict_mode:
            raise RuntimeError(f"Failed to prepare '{code}'.")
        else:
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
        logger.exception(f"Can't convert {code}, record ignored.")
        record["status"] = EntryStatus.FUNPDBE_FAILED.value
        error_log_file = os.path.join(working_directory, "error.log")
        with open(error_log_file, "w") as stream:
            stream.write(str(ex))
        if strict_mode:
            raise RuntimeError(f"Failed to prepare '{code}'.")
        else:
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
        logger.exception(f"Can't obtain {code} archive, record ignored.")
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


def upload_to_funpdbe(
        server: str, username: str, password: str,
        data_directory: str, database):
    configuration = pdbe_service.Configuration(server, username, password)
    ftp_directory = get_ftp_directory(data_directory)
    for code, record in database["data"].items():
        if not record["status"] == EntryStatus.CONVERTED.value:
            continue
        logger.info(f"Uploading {code}")
        source_directory = os.path.join(ftp_directory, code.lower()[1:3])
        try:
            pdbe_service.upload_to_ftp(configuration, code, source_directory)
        except:
            logger.exception(f"Can't upload {code}.")
            continue
        record["status"] = EntryStatus.SUBMITTED.value


if __name__ == "__main__":
    main(_read_arguments())
