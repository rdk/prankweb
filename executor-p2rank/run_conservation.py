#!/usr/bin/env python3
#
# Just calculate (or get from cache) a conservation
#

import os
import argparse
import shutil
import logging
import subprocess
import sys

from model import *
import conservation_wrapper

logging.getLogger().setLevel(logging.DEBUG)
logger = logging.getLogger("prankweb")


@dataclass
class ConservationExecution:
    # Input fasta file
    fasta_file: str
    # Path to the working directory.
    working_directory: str
    # Path to the output directory.
    output_directory: str
    # Used for standard output
    stdout: typing.TextIO
    # Used for error output
    stderr: typing.TextIO
    # Selected configuration pipeline.
    conservation: ConservationType = ConservationType.NONE
    # Optional, shell execution function.
    execute_command: typing.Optional[typing.Callable] = None
    # If true and files produced by external command, the command is not
    # executed.
    lazy_execution: bool = False


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--file",
        required=False,
        help="Absolute path to fasta file.")
    parser.add_argument(
        "--working",
        default="./working",
        help="Input directory.")
    parser.add_argument(
        "--output",
        default="./",
        help="Output directory.")
    return vars(parser.parse_args())

def _create_execute_command(configuration: Execution):
    if configuration.execute_command is not None:
        return

    def execute_command(command: str, ignore_return_code: bool = True):
        logger.debug(f"Executing '{command}' ...")
        result = subprocess.run(
            command,
            shell=True,
            env=os.environ.copy(),
            stdout=configuration.stdout,
            stderr=configuration.stderr,
        )
        # Throw for non-zero (failure) return code.
        if not ignore_return_code:
            result.check_returncode()
        logger.debug(f"Executing '{command}' ... done")

    configuration.execute_command = execute_command

def main(arguments):
    _setuplog_handler()

    configuration = ConservationExecution(
        fasta_file=arguments["file"],
        working_directory=arguments["working"],
        output_directory=arguments["output"],
        stdout=sys.stdout,
        stderr=sys.stderr,
        conservation=ConservationType.HMM
    )
    _create_execute_command(configuration)

    out_file_name = configuration.output_directory + "/" + os.path.basename(configuration.fasta_file).removesuffix('.fasta') + ".hom"

    conservation_wrapper.compute_hmm_based_conservation(
        configuration.fasta_file, configuration.working_directory, out_file_name, configuration.execute_command)

    logger.info("Done. Conservation out file: " + out_file_name)


def _setuplog_handler():
    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] : %(message)s",
        "%Y-%m-%dT%H:%M:%S")
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)


if __name__ == "__main__":
    main(_read_arguments())
