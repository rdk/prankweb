#!/usr/bin/env python3
#
# Run p2rank task.
#
import os
import argparse
import sys
import json
import datetime
import subprocess
import logging
import shutil

from model import *
from executor import execute


class Status(enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    SUCCESSFUL = "successful"


logging.getLogger().setLevel(logging.DEBUG)
logger = logging.getLogger("prankweb")


def _read_arguments() -> typing.Dict[str, any]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--directory",
        required=True,
        help="Directory with task to execute.")
    parser.add_argument(
        "--keep-working",
        action="store_true",
        help="Keep working data.")
    parser.add_argument(
        "--lazy-execution",
        action="store_true",
        help="If true use existing files from external commands.")
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Log to stdout instead of a file.")
    return vars(parser.parse_args())


def main():
    arguments = _read_arguments()
    directory = arguments["directory"]
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return
    execute_directory_task(
        directory,
        arguments["keep_working"],
        arguments["lazy_execution"],
        arguments["stdout"])


def execute_directory_task(
        directory: str,
        keep_working: bool = False,
        lazy_execution: bool = False,
        stdout: bool = False):
    log_file = os.path.join(directory, "log")
    with open(log_file, "w", encoding="utf-8") as stream:
        if stdout:
            stream = sys.stdout
        handler = _create_log_handler(stream)
        logging.getLogger().addHandler(handler)
        try:
            _execute_directory_task(
                directory, stream, keep_working, lazy_execution)
        finally:
            handler.flush()
            logging.getLogger().removeHandler(handler)
            stream.flush()


def _create_log_handler(stream: typing.TextIO):
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] : %(message)s",
        "%Y-%m-%dT%H:%M:%S")
    handler.setFormatter(formatter)
    return handler


def _execute_directory_task(
        directory: str, stream,
        keep_working: bool, lazy_execution: bool):
    status_file = os.path.join(directory, "info.json")
    status = _load_json(status_file)

    # We can check here if the task is running but, we assume that
    # should we run given task it is regardless of the initial state.

    status["status"] = Status.RUNNING.value
    _save_status_file(status_file, status)

    configuration = _load_json(
        os.path.join(directory, "input", "configuration.json"))

    this_directory = os.path.dirname(os.path.realpath(__file__))

    execution = Execution(
        p2rank=os.path.join(this_directory, "p2rank.sh"),
        java_tools=os.environ.get("JAVA_TOOLS_CMD", None),
        working_directory=os.path.join(directory, "working"),
        output_directory=os.path.join(directory, "public"),
        output_type=OutputType.PRANKWEB,
        stdout=stream,
        stderr=stream,
        p2rank_configuration=configuration.get("p2rank_configuration", None),
        structure_code=configuration.get("structure_code", None),
        structure_file=_structure_path(directory, configuration),
        structure_uniprot=configuration.get("structure_uniprot", None),
        structure_sealed=configuration.get("structure_sealed", False),
        chains=configuration.get("chains", []),
        conservation=_conservation_type(configuration),
        lazy_execution=lazy_execution
    )
    try:
        result = execute(execution)
        status["status"] = Status.SUCCESSFUL.value
        status["metadata"] = {
            **status.get("metadata", {}),
            "predictionName": _output_name(execution),
            "structureName": result.output_structure_file,
        }
    except subprocess.CalledProcessError:
        status["status"] = Status.FAILED.value
        logger.exception("External process failed.")
    except:
        status["status"] = Status.FAILED.value
        logger.exception("Execution failed.")

    _save_status_file(status_file, status)

    if not keep_working:
        shutil.rmtree(os.path.join(directory, "working"))


def _load_json(path: str):
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)


def _save_status_file(path: str, status: any):
    now = datetime.datetime.today()
    status["lastChange"] = now.strftime('%Y-%m-%dT%H:%M:%S')
    _save_json(path, status)


def _save_json(path: str, content: any):
    path_swp = path + ".swp"
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)
    os.replace(path_swp, path)


def _structure_path(directory: str, configuration):
    structure_file = configuration.get("structure_file", None)
    if not structure_file:
        return None
    return os.path.join(directory, "input", structure_file)


def _conservation_type(configuration):
    if "conservation" not in configuration:
        return ConservationType.NONE
    name = configuration["conservation"]
    for conservationType in ConservationType:
        if conservationType.value == name:
            return conservationType
    return ConservationType.NONE


def _output_name(execution: Execution):
    if execution.structure_file:
        file = execution.structure_file
        return file[file.rindex("/") + 1:file.rindex(".")]
    elif execution.structure_code:
        suffix = ("_" + ",".join(execution.chains)) if execution.chains else ""
        return execution.structure_code + suffix
    elif execution.structure_uniprot:
        return execution.structure_uniprot
    else:
        return "prediction-without-name"


if __name__ == "__main__":
    main()
