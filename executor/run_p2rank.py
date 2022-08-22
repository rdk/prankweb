#!/usr/bin/env python3
#
# Run p2rank without the task, designed to be used as a docker command
# to allow p2rank execution inside the docker.
#

import os
import argparse
import sys

from model import *
from executor import execute


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pdb", required=False,
        help="PDB code.")
    parser.add_argument(
        "--pdb-file", required=False,
        help="Absolute path to PDB file.")
    parser.add_argument(
        "--working", default="./working",
        help="Input directory.")
    parser.add_argument(
        "--output", default="./",
        help="Output directory.")
    parser.add_argument(
        "--conservation", action="store_true",
        help="Use conservation.")
    this_directory = os.path.dirname(os.path.realpath(__file__))
    parser.add_argument(
        "--p2rank",
        default=this_directory + "/p2rank.sh",
        help="Path to executable p2rank script.",
    )
    return vars(parser.parse_args())


def main():
    arguments = _read_arguments()
    configuration = Execution(
        p2rank=arguments["p2rank"],
        java_tools=os.environ.get("JAVA_TOOLS_CMD", None),
        working_directory=arguments["working"],
        output_directory=arguments["output"],
        output_type=OutputType.P2RANK,
        stdout=sys.stdout,
        stderr=sys.stderr,
        p2rank_configuration=_get_p2rank_configuration(arguments),
        structure_code=arguments["pdb"],
        structure_file=arguments["pdb_file"]
    )
    execute(configuration)


def _get_p2rank_configuration(arguments):
    if arguments["conservation"]:
        return P2rankConfigurations.HMM.value
    else:
        return P2rankConfigurations.DEFAULT.value,


if __name__ == "__main__":
    main()
