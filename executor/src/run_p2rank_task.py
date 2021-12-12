#!/usr/bin/env python3
#
# Run p2rank task.
#
import os
import argparse
import typing
import json
import enum
import datetime
import subprocess
import shutil
import logging

from p2rank_executor import \
    ExecutorConfiguration, \
    ConservationType, \
    OutputType, \
    execute


class Status(enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    SUCCESSFUL = "successful"


logging.getLogger().setLevel(logging.DEBUG)
logger = logging.getLogger("prankweb")


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--directory", required=True, help="Directory with task to execute.")
    return vars(parser.parse_args())


def main():
    arguments = _read_arguments()
    directory = arguments["directory"]
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return
    execute_directory_task(directory)


def execute_directory_task(directory: str):
    log_file = os.path.join(directory, "log")
    with open(log_file, "w", encoding="utf-8") as stream:
        handler = _create_log_handler(stream)
        logger.addHandler(handler)
        try:
            _execute_directory_task(directory, stream)
        finally:
            handler.flush()
            logger.removeHandler(handler)
            stream.flush()


def _create_log_handler(stream: typing.TextIO):
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] : %(message)s",
        "%Y-%m-%dT%H:%M:%S")
    handler.setFormatter(formatter)
    return handler


def _execute_directory_task(directory: str, stream):
    status_file = os.path.join(directory, "info.json")
    status = load_json(status_file)

    # We can check here if the task is running but, we assume that
    # should we run given task it is regardless of the initial state.

    status["status"] = Status.RUNNING.value
    save_status_file(status_file, status)

    configuration_file = os.path.join(directory, "input", "configuration.json")
    user_configuration = load_json(configuration_file)

    structure = user_configuration["structure"]
    conservation = user_configuration["conservation"]

    pdb_path = os.path.join(directory, "input", structure["file"]) \
        if "file" in structure and structure["file"] is not None else None

    conservation_type = ConservationType.HMM \
        if conservation["compute"] else ConservationType.NONE

    this_directory = os.path.dirname(os.path.realpath(__file__))

    configuration = ExecutorConfiguration(
        structure["code"],
        pdb_path,
        conservation_type,
        os.path.join(this_directory, "p2rank.sh"),
        os.path.join(directory, "working"),
        os.path.join(directory, "public"),
        OutputType.PRANKWEB,
        structure["chains"],
        structure["sealed"],
        stream,
        stream
    )
    try:
        execute(configuration)
        status["status"] = Status.SUCCESSFUL.value
    except subprocess.CalledProcessError:
        status["status"] = Status.FAILED.value
        logger.exception("External process failed.")
    except:
        status["status"] = Status.FAILED.value
        logger.exception("Execution failed.")

    shutil.rmtree(os.path.join(directory, "working"))
    save_status_file(status_file, status)


def load_json(path: str):
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)


def save_status_file(path: str, status: any):
    now = datetime.datetime.today()
    status["lastChange"] = now.strftime('%Y-%m-%dT%H:%M:%S')
    save_json(path, status)


def save_json(path: str, content: any):
    path_swp = path + ".swp"
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)
    os.replace(path_swp, path)


if __name__ == "__main__":
    main()
