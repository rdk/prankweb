#!/usr/bin/env python3
#
# Wrap conservation pipeline to provide simple API.
#

import os
import typing

from conservation_hmm_based import \
    compute_conservation as compute_hmm_conservation
from conservation_alignment_based import \
    compute_conservation as compute_alignment_conservation, Configuration


def compute_hmm_based_conservation(
        fasta_file: str,
        working_dir: str,
        output_file: str,
        execute_command: typing.Callable[[str], None]):
    compute_hmm_conservation(
        fasta_file,
        os.environ.get("HMM_SEQUENCE_FILE", None),
        working_dir,
        output_file,
        execute_command,
        True,
        1000)


def compute_alignment_based_conservation(
        fasta_file: str,
        working_dir: str,
        output_file: str,
        execute_command: typing.Callable[[str], None]):
    configuration = Configuration()
    configuration.execute_command = execute_command
    configuration.blast_databases = ["swissprot", "uniref50", "uniref90"]
    compute_alignment_conservation(
        fasta_file,
        working_dir,
        output_file,
        configuration)
