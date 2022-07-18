#!/usr/bin/env python3
#
# Remove directories with running predictions, use this
# only if executor is not running!
#
import json
import typing
import logging
import argparse
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--database", required=True,
        help="Name of target prankweb database. E.g. v1")
    return vars(parser.parse_args())


def main(args):
    _init_logging()
    logger.info("Scanning jobs ...")
    for code in list_prankweb_predictions(args["server_directory"]):
        directory = os.path.join(
            args["server_directory"],
            code[1:2].capitalize(),
            code.capitalize())
        with open(os.path.join(directory, "info.json")) as stream:
            info = json.load(stream)
        if info["status"] == "running":
            logger.info(f"Removing running task in '{directory}'.")
            os.removedirs(directory)

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


if __name__ == "__main__":
    main(_read_arguments())
