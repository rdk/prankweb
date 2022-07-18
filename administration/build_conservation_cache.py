#!/usr/bin/env python3
# Given directory with computed conservation  adds them to a conservation
# cache directory.
import typing
import logging
import argparse
import hashlib
import json
import os
import collections

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
    for file_name in files:
        path = os.path.join(arguments["input"], file_name)
        buffer.append(load_conservation_from_hom_file(path))
        if len(buffer) > arguments["buffer_size"]:
            logger.info("Saving to cache ...")
            add_add_to_cache(arguments["cache_directory"], buffer)
            buffer.clear()
    logger.info("Saving to cache ...")
    add_add_to_cache(arguments["cache_directory"], buffer)
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def load_conservation_from_hom_file(path: str):
    with open(path) as stream:
        sequence = []
        score = []
        for line in stream:
            tokens = line.split()
            sequence.append(tokens[2])
            score.append(tokens[1])
    return {
        "sequence": "".join(sequence),
        "score": score,
    }


def add_add_to_cache(directory: str, items):
    grouped_by_hash = collections.defaultdict(list)
    for item in items:
        grouped_by_hash[hash_sequence(item["sequence"])].append(item)
    for group_hash, items in grouped_by_hash.items():
        path = os.path.join(directory, group_hash + ".jsonl")
        content = read_cache_file(path)
        # Add only new one.
        sequences = {item["sequence"] for item in content}
        content.extend([
            item for item in items
            if item["sequence"] not in sequences])
        write_cache_file(path, content)


def hash_sequence(sequence: str) -> str:
    return hashlib.md5(sequence.encode("ascii")).hexdigest()


def read_cache_file(path: str):
    with open(path, encoding="utf-8") as stream:
        return [
            json.loads(line)
            for line in stream
        ]


def write_cache_file(path: str, content):
    swap_path = path + ".swp"
    with open(swap_path, "w", encoding="utf-8") as stream:
        for record in content:
            json.dump(record, stream, ensure_ascii=False)
            stream.write("\n")
    os.replace(swap_path, path)


if __name__ == "__main__":
    main(_read_arguments())
