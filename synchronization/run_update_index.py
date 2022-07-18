#!/usr/bin/env python3
import os
import datetime
import typing
import argparse
import logging
import database_service
from database_service import EntryStatus

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser(
        description="Create/update an index file")
    parser.add_argument(
        "--prankweb-directory",
        help="Path to prankweb prediction directory to import.")
    parser.add_argument(
        "--pdb-file",
        help="Path to file with PDB codes, each line with one code.")
    parser.add_argument(
        "--data",
        help="Path to database directory.",
        required=True)
    return vars(parser.parse_args())


def main(args):
    _init_logging()
    data_directory = args["data"]
    os.makedirs(data_directory, exist_ok=True)
    database = database_service.load_database(data_directory)
    new_codes = []
    if "server_directory" in args:
        new_codes.extend(list_prankweb_predictions(args["server_directory"]))
    if "pdb_file" in args:
        new_codes.extend(list_prankweb_predictions(args["pdb_file"]))
    add_pdb_to_database(database, new_codes)
    database_service.save_database(data_directory, database)
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def list_prankweb_predictions(predictions_directory: str) -> typing.List[str]:
    return [
        code.lower()
        for subdir in os.listdir(predictions_directory)
        for code in os.listdir(os.path.join(predictions_directory, subdir))
        if "_" not in code
    ]


def list_from_file(path: str) -> typing.List[str]:
    with open(path, encoding="utf-f") as stream:
        return [
            code.rstrip().lstrip().upper()
            for code in stream
        ]


def add_pdb_to_database(database, new_codes: typing.List[str]):
    from_date = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%SZ")
    for code in new_codes:
        if code in database["data"]:
            continue
        database["data"][code] = {
            "status": EntryStatus.NEW.value,
            "importDate": from_date,
        }


if __name__ == "__main__":
    main(_read_arguments())
