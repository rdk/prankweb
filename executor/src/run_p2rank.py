#!/usr/bin/env python3
#
# Run p2rank without the task, designed to be used as a docker command
# to allow p2rank execution inside the docker.
#

import os
import argparse
import sys
import typing

from p2rank_executor import \
    ExecutorConfiguration, \
    ConservationType, \
    OutputType, \
    execute


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
    configuration = ExecutorConfiguration(
        arguments["pdb"],
        arguments["pdb_file"],
        ConservationType.HMM
        if arguments["conservation"] else ConservationType.NONE,
        arguments["p2rank"],
        arguments["working"],
        arguments["output"],
        OutputType.P2RANK,
        [],
        True,
        sys.stdout,
        sys.stderr
    )
    execute(configuration)


if __name__ == "__main__":
    main()
