#!/usr/bin/env python3
#
# Wrap conservation pipeline to provide simple API.
#

import os
import typing
import shutil

from conservation_hmm_based import \
    compute_conservation as compute_hmm_conservation
from conservation_alignment_based import \
    compute_conservation as compute_alignment_conservation, Configuration

_cache = {}

_cache_size_limit = 16


def compute_hmm_based_conservation(
        fasta_file: str,
        working_dir: str,
        output_file: str,
        execute_command: typing.Callable[[str], None]):
    cached = _get_cache_file("hmm", fasta_file)
    if cached is not None:
        shutil.copy(cached, output_file)

    compute_hmm_conservation(
        fasta_file,
        os.environ.get("HMM_SEQUENCE_FILE", None),
        working_dir,
        output_file,
        execute_command,
        True,
        1000)
    _add_cache_file("hmm", fasta_file, output_file)


def _get_cache_file(method, fasta_file):
    key = method + _read_fasta(fasta_file)
    return _cache.get(key, None)


def _read_fasta(path):
    with open(path, "r") as stream:
        stream.readline()
        return stream.read()


def _add_cache_file(method, fasta_file, output_file):
    if len(_cache) > _cache_size_limit:
        _cache.clear()

    key = method + _read_fasta(fasta_file)
    _cache[key] = output_file


def compute_alignment_based_conservation(
        fasta_file: str,
        working_dir: str,
        output_file: str,
        execute_command: typing.Callable[[str], None]):
    cached = _get_cache_file("alignment", fasta_file)
    if cached is not None:
        shutil.copy(cached, output_file)
    #
    configuration = Configuration()
    configuration.execute_command = execute_command
    configuration.blast_databases = ["swissprot", "uniref50", "uniref90"]
    compute_alignment_conservation(
        fasta_file,
        working_dir,
        output_file,
        configuration)
    _add_cache_file("alignment", fasta_file, output_file)
