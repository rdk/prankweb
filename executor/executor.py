#!/usr/bin/env python3
#
# Given a configuration executes p2rank and all components.
#
import json
import enum
import os
import sys
import typing
import logging
import requests
import shutil
import subprocess
import zipfile
import csv
from dataclasses import dataclass

import conservation_wrapper
from output_prankweb import _prepare_output_prankweb


class ConservationType(enum.Enum):
    ALIGNMENT = "alignment"
    HMM = "hmm"
    NONE = "none"


class OutputType(enum.Enum):
    PRANKWEB = "prankweb"
    P2RANK = "p2rank"


@dataclass
class Execution:
    # Path to p2rank executable script.
    p2rank: str
    # Path to protein-utils
    protein_utils: str
    # Path to the working directory.
    working_directory: str
    # Path to the output directory.
    output_directory: str
    # Output type, determine output files.
    output_type: OutputType
    # Used for standard output
    stdout: typing.TextIO
    # Used for error output
    stderr: typing.TextIO
    # PDB structure code.
    structure_code: typing.Optional[str] = None
    # Absolute path to input structure file.
    structure_file: typing.Optional[str] = None
    # Uniprot structure code.
    structure_uniprot: typing.Optional[str] = None
    # If true the input structure is used without change.
    structure_sealed: bool = False
    # Allow filtering of chains. Leave empty to use all.
    chains: typing.List[str] = list
    # Selected configuration pipeline.
    conservation: ConservationType = ConservationType.NONE
    # Optional, shell execution function.
    execute_command: typing.Optional[typing.Callable] = None


@dataclass
class ExecutionResult:
    # Output structure file.
    output_structure_file: typing.Optional[str] = None


@dataclass
class Structure:
    # File as provided by the user.
    raw_structure_file: str
    # File to used for predictions.
    structure_file: str
    # Optional, collection of FASTA files for given chains.
    sequence_files: typing.Dict[str, str]
    # Optional, score to show on protein surface for each chain.
    score_files: typing.Dict[str, str] = dict
    # Optional, metadata that should be stored into output prediction file.
    metadata: typing.Dict[str, any] = dict


logger = logging.getLogger("prankweb.executor")
logger.setLevel(logging.DEBUG)


def execute(configuration: Execution) -> ExecutionResult:
    _prepare_directories(configuration)
    _create_execute_command(configuration)
    structure = _prepare_structure(configuration)
    conservation = _prepare_conservation(structure, configuration)
    p2rank_input = _prepare_p2rank_input(
        structure, configuration, conservation)
    p2rank_output = os.path.join(
        configuration.working_directory, "p2rank-output")
    _execute_p2rank(p2rank_input, p2rank_output, configuration)
    result = _prepare_output(
        p2rank_output, structure, conservation, configuration)
    logger.info("All done")
    return result


def _prepare_directories(configuration: Execution):
    os.makedirs(configuration.working_directory, exist_ok=True)


def _create_execute_command(configuration: Execution):
    if configuration.execute_command is not None:
        return

    def execute_command(command: str):
        # if "hmmer-3.3.2" in command:
        #     logger.debug(f"Ignore '{command}'")
        #     return

        logger.debug(f"Executing '{command}' ...")
        result = subprocess.run(
            command,
            shell=True,
            env=os.environ.copy(),
            stdout=configuration.stdout,
            stderr=configuration.stderr,
        )
        # Throw for non-zero (failure) return code.
        result.check_returncode()
        logger.debug(f"Executing '{command}' ... done")

    configuration.execute_command = execute_command


# region Prepare structure

def _prepare_structure(configuration: Execution) -> Structure:
    metadata = {}
    logger.info("Preparing structure ...")
    raw_structure_file = _prepare_raw_structure_file(configuration, metadata)
    structure_file = _filter_raw_structure_file(
        raw_structure_file, configuration)
    fasta_files = _prepare_fasta_files(structure_file, configuration)
    return Structure(
        raw_structure_file,
        structure_file,
        fasta_files,
        metadata=metadata
    )


def _prepare_raw_structure_file(
        configuration: Execution, metadata:
        typing.Dict[str, any]) -> str:
    result = os.path.join(configuration.working_directory, "structure-raw")
    if configuration.structure_code is not None:
        result += ".pdb"
        _download_from_pdb(configuration.structure_code, result)
    elif configuration.structure_file is not None:
        result += _extension(configuration.structure_file)
        shutil.copy(configuration.structure_file, result)
    elif configuration.structure_uniprot is not None:
        result += ".cif"
        _download_from_alpha_fold(
            configuration.structure_uniprot, result, metadata)
    else:
        raise Exception("Missing structure.")
    return result


def _download_from_pdb(code: str, destination: str) -> None:
    url = f"https://files.rcsb.org/download/{code}.pdb"
    _download(url, destination)


def _download(url: str, destination: str) -> None:
    logger.debug(f"Downloading '{url}' to '{destination}' ...")
    response = requests.get(url)
    with open(destination, "wb") as stream:
        stream.write(response.content)


def _extension(file_name: str) -> str:
    """For 'name.ext' return 'ext'."""
    return file_name[file_name.rindex("."):]


def _download_from_alpha_fold(
        code: str, destination: str, metadata: typing.Dict[str, any]) -> any:
    entry_url = f"https://alphafold.ebi.ac.uk/api/prediction/{code}"
    entry_response = requests.get(entry_url)
    entry_content = json.loads(entry_response.content)
    metadata["alpha-fold"] = entry_content
    assert len(entry_content) == 1
    cif_url = entry_content[0]["cifUrl"]
    _download(cif_url, destination)


def _filter_raw_structure_file(
        raw_file: str, configuration: Execution) -> str:
    if configuration.structure_sealed:
        return raw_file
    result = os.path.join(
        configuration.working_directory,
        "structure" + _extension(raw_file)
    )
    command = f"{configuration.protein_utils} filter-structure" + \
              f" --input {raw_file}" + \
              f" --output {result} "
    if configuration.chains:
        command += "--chains=" + ",".join(configuration.chains)
    configuration.execute_command(command)
    return result


def _prepare_fasta_files(
        structure_file: str, configuration: Execution) \
        -> typing.Dict[str, str]:
    output = os.path.join(configuration.working_directory, "fasta")
    os.makedirs(output, exist_ok=True)
    configuration.execute_command(
        f"{configuration.p2rank} analyze fasta-raw"
        f" --f {structure_file}"
        f" --o {output}"
    )
    return {
        # The fifth one is the code, for example: 2W83_A.fasta
        name[name.rindex("_") + 1:name.rindex(".")]: os.path.join(output, name)
        for name in os.listdir(output) if name.endswith(".fasta")
    }


# endregion

# region Compute conservation

def _prepare_conservation(
        structure: Structure, configuration: Execution) \
        -> typing.Dict[str, str]:
    if configuration.conservation == ConservationType.NONE:
        return {}
    logger.info("Computing conservation ...")
    output_directory = os.path.join(
        configuration.working_directory,
        "conservation")
    os.makedirs(output_directory, exist_ok=True)
    result = {}
    for chain, fasta_file in structure.sequence_files.items():
        working_directory = os.path.join(
            configuration.working_directory,
            f"conservation-{chain}")
        os.makedirs(working_directory, exist_ok=True)
        output_file = os.path.join(output_directory, f"conservation-{chain}")
        _prepare_conservation_for_chain(
            fasta_file, working_directory, output_file,
            configuration)
        result[chain] = output_file
    return result


def _prepare_conservation_for_chain(
        fasta_file: str,
        working_directory: str,
        output_file: str,
        configuration: Execution):
    conservation_type = configuration.conservation
    if conservation_type == ConservationType.ALIGNMENT:
        conservation_wrapper.compute_alignment_based_conservation(
            fasta_file, working_directory, output_file,
            configuration.execute_command)
    elif conservation_type == ConservationType.HMM:
        conservation_wrapper.compute_hmm_based_conservation(
            fasta_file, working_directory, output_file,
            configuration.execute_command)
    else:
        raise Exception("Unknown conservation type!")


# endregion

# region Execute p2rank

def _prepare_p2rank_input(
        structure: Structure,
        configuration: Execution,
        conservation: typing.Dict[str, str]) -> str:
    directory = os.path.join(configuration.working_directory, "p2rank-input")
    os.makedirs(directory, exist_ok=True)
    structure_file = os.path.join(directory, "structure.pdb")
    shutil.copy(structure.structure_file, structure_file)
    for chain, file in conservation.items():
        shutil.copy(
            file,
            os.path.join(directory, f"structure{chain.upper()}.hom"))
    return structure_file


def _execute_p2rank(
        input_structure: str, output_directory: str,
        configuration: Execution):
    configuration_files = {
        ConservationType.NONE: "default",
        ConservationType.ALIGNMENT: "conservation",
        ConservationType.HMM: "conservation_hmm"
    }
    command = (
        f"{configuration.p2rank} predict "
        f"-c {configuration_files[configuration.conservation]} "
        f"-threads 1 "
        f"-f {input_structure} "
        f"-o {output_directory} "
        f"--log_to_console 1"
    )
    configuration.execute_command(command)


# endregion


def _prepare_output(
        p2rank_output: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        configuration: Execution) -> ExecutionResult:
    logger.info("Collecting output ...")
    if configuration.output_type == OutputType.P2RANK:
        return _prepare_output_p2rank(p2rank_output, configuration)
    elif configuration.output_type == OutputType.PRANKWEB:
        return _prepare_output_prankweb(
            p2rank_output, structure, conservation, configuration)
    else:
        raise Exception("Invalid output type!")


def _prepare_output_p2rank(
        p2rank_output: str, configuration: Execution) -> ExecutionResult:
    for file in os.listdir(p2rank_output):
        source = os.path.join(p2rank_output, file)
        target = os.path.join(configuration.output_directory, file)
        os.rename(source, target)
    return ExecutionResult()
