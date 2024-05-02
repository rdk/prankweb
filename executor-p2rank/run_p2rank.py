#!/usr/bin/env python3
#
# Run p2rank without the task, designed to be used as a docker command
# to allow p2rank execution inside the docker.
#

import os
import argparse
import shutil
import logging

import sys

from model import *
from executor import execute

logging.getLogger().setLevel(logging.DEBUG)
logger = logging.getLogger("prankweb")

def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pdb-code",
        required=False,
        help="PDB code.")
    parser.add_argument(
        "--file",
        required=False,
        help="Absolute path to PDB/mmCIF file.")
    parser.add_argument(
        "--working",
        default="./working",
        help="Input directory.")
    parser.add_argument(
        "--output",
        default="./",
        help="Output directory.")
    parser.add_argument(
        "--conservation",
        action="store_true",
        help="Use conservation.")
    this_directory = os.path.dirname(os.path.realpath(__file__))
    parser.add_argument(
        "--p2rank",
        default=this_directory + "/p2rank.sh",
        help="Path to executable p2rank script.")
    parser.add_argument(
        "--keep-working",
        action="store_true",
        help="Preserve working directory.")
    return vars(parser.parse_args())


def main(arguments):
    _setuplog_handler()
    configuration = Execution(
        p2rank=arguments["p2rank"],
        java_tools=os.environ.get("JAVA_TOOLS_CMD", None),
        working_directory=arguments["working"],
        output_directory=arguments["output"],
        output_type=OutputType.P2RANK,
        stdout=sys.stdout,
        stderr=sys.stderr,
        structure_sealed=True,
        conservation=_get_conservation_type(arguments),
        p2rank_configuration=_get_p2rank_configuration(arguments),
        structure_code=arguments["pdb_code"],
        structure_file=arguments["file"]
    )
    execute(configuration)
    #if not arguments.get("keep-working", False):
    #    shutil.rmtree(arguments["working"])


def _setuplog_handler():
    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] : %(message)s",
        "%Y-%m-%dT%H:%M:%S")
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)


def _get_conservation_type(arguments):
    if arguments["conservation"]:
        return ConservationType.HMM
    else:
        return ConservationType.NONE


def _get_p2rank_configuration(arguments):
    if arguments["conservation"]:
        return P2rankConfigurations.HMM.value
    else:
        return P2rankConfigurations.DEFAULT.value


if __name__ == "__main__":
    main(_read_arguments())
