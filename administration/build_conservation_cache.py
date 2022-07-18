#!/usr/bin/env python3
# Given directory with computed conservation  adds them to a conservation
# cache directory.
import typing
import logging
import argparse
import os
from conservation_cache import add_to_cache, create_conservation_from_hom_file

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input", required=True,
        help="Directory with conservations files *.hom'.")
    parser.add_argument(
        "--cache-directory", required=True,
        help="Directory with where the cache files are saved.")
    parser.add_argument(
        "--buffer-size", default=100000, type=int,
        help="How many sequences to keep in memory.")
    return vars(parser.parse_args())


def main(arguments):
    _init_logging()
    buffer = []
    logger.info("Collecting conservations ...")
    files = os.listdir(arguments["input"])
    logger.info(f"Found {len(files)} conservations.")
    for file_name in files:
        path = os.path.join(arguments["input"], file_name)
        buffer.append(create_conservation_from_hom_file(path))
        if len(buffer) > arguments["buffer_size"]:
            logger.info("Saving to cache ...")
            add_to_cache(arguments["cache_directory"], buffer)
            buffer.clear()
    logger.info("Saving to cache ...")
    add_to_cache(arguments["cache_directory"], buffer)
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


if __name__ == "__main__":
    main(_read_arguments())
