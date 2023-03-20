#!/usr/bin/env python3
#
# Remove directories with running predictions, use this
# only if executor-p2rank is not running!
#
import json
import typing
import logging
import argparse
import shutil
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--database", required=True,
        help="Path of target prankweb database directory, e.g. 'v3'.")
    parser.add_argument(
        "--queued", action="store_true",
        help="If set queued tasks are removed.")
    parser.add_argument(
        "--running", action="store_true",
        help="If set failed tasks are removed.")
    parser.add_argument(
        "--failed", action="store_true",
        help="If set failed tasks are removed.")
    parser.add_argument(
        "--user-upload", action="store_true",
        help="If set is used for flat directories like user-upload.")

    return vars(parser.parse_args())


def main(arguments):
    _init_logging()
    logger.info("Scanning jobs ...")
    predictions = list_prankweb_predictions(
        arguments["database"], arguments["user_upload"])
    removed_counter = 0
    for (code, directory) in predictions:
        info_path = os.path.join(directory, "info.json")
        if not os.path.exists(info_path):
            logger.info(f"Removing prediction '{code}' with no info.json file.")
            removed_counter += 1
            shutil.rmtree(directory)
            continue
        with open(info_path) as stream:
            info = json.load(stream)
        if should_be_deleted(info, arguments):
            logger.info(f"Removing '{code}' in '{directory}'.")
            removed_counter += 1
            shutil.rmtree(directory)
    logger.info(f"Removed {removed_counter} out of {len(predictions)}.")
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def list_prankweb_predictions(
        predictions_directory: str, user_predictions: bool) \
        -> typing.List[typing.Tuple[str, str]]:
    if user_predictions:
        return [
            (
                code.lower(),
                os.path.join(predictions_directory, code)
            )
            for code in os.listdir(predictions_directory)
        ]

    return [
        (
            code.lower(),
            os.path.join(os.path.join(predictions_directory, subdir), code)
        )
        for subdir in os.listdir(predictions_directory)
        for code in os.listdir(os.path.join(predictions_directory, subdir))
    ]


def should_be_deleted(info, arguments):
    return (info["status"] == "running" and arguments["running"]) or \
           (info["status"] == "queued" and arguments["queued"]) or \
           (info["status"] == "failed" and arguments["failed"])


if __name__ == "__main__":
    main(_read_arguments())
