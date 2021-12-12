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

PROTEIN_UTILS = os.environ.get("PROTEIN_UTILS_CMD", None)


class ConservationType(enum.Enum):
    ALIGNMENT = "alignment"
    HMM = "hmm"
    NONE = "none"


class OutputType(enum.Enum):
    PRANKWEB = "prankweb"
    P2RANK = "p2rank"


@dataclass
class ExecutorConfiguration:
    # PDB structure code.
    pdb_code: str
    # Absolute path to input structure file.
    structure_file: str
    # Selected configuration pipeline.
    conservation: ConservationType
    # Path to p2rank executable script.
    p2rank: str
    # Path to the working directory.
    working_directory: str
    # Path to the output directory.
    output_directory: str
    # Output type, determine output files.
    output: OutputType
    # Allow filtering of chains. Leave empty to use all.
    chains: typing.List[str]
    # If true the input structure is used without change.
    sealed_structure: bool
    # Used for standard output
    stdout: typing.TextIO
    # Used for error output
    stderr: typing.TextIO
    # Internal do not use.
    execute_command: typing.Optional[typing.Callable] = None


@dataclass
class Structure:
    # File as provided by the user.
    raw_file: str
    # File to used for predictions.
    file: str
    # Collection of FASTA files for given chains.
    fasta_files: typing.Dict[str, str]
    # Collection of chains
    chains: typing.List[str]


logger = logging.getLogger("prankweb.executor")
logger.setLevel(logging.DEBUG)


def execute(configuration: ExecutorConfiguration) -> None:
    _prepare_directories(configuration)
    _create_execute_command(configuration)
    structure = _prepare_structure(configuration)
    conservation = _prepare_conservation(structure, configuration)
    p2rank_input = _prepare_p2rank_input(
        structure, configuration, conservation)
    p2rank_output = os.path.join(
        configuration.working_directory, "p2rank-output")
    _execute_p2rank(p2rank_input, p2rank_output, configuration)
    _prepare_output(p2rank_output, structure, conservation, configuration)
    logger.info("All done")


def _prepare_directories(configuration: ExecutorConfiguration):
    os.makedirs(configuration.working_directory, exist_ok=True)


def _create_execute_command(configuration: ExecutorConfiguration):
    def execute_command(command: str):
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


def _prepare_structure(configuration: ExecutorConfiguration) -> Structure:
    logger.info("Preparing structure ...")
    raw_structure_file = _prepare_raw_structure_file(configuration)
    structure_file = _prepare_structure_file(raw_structure_file, configuration)
    fasta_files = _prepare_fasta_files(structure_file, configuration)
    return Structure(
        raw_structure_file,
        structure_file,
        fasta_files,
        list(fasta_files.keys())
    )


def _prepare_raw_structure_file(configuration: ExecutorConfiguration) -> str:
    result = os.path.join(
        configuration.working_directory,
        "structure-raw.pdb"
    )
    if configuration.pdb_code is not None:
        url = f"https://files.rcsb.org/download/{configuration.pdb_code}.pdb"
        _download(url, result)
    elif configuration.structure_file is not None:
        shutil.copy(configuration.structure_file, result)
    else:
        raise Exception("Missing structure.")
    return result


def _download(url: str, destination: str) -> None:
    logger.debug(f"Downloading '{url}' to '{destination}' ...")
    response = requests.get(url)
    with open(destination, "wb") as stream:
        stream.write(response.content)


def _prepare_structure_file(
        raw_file: str, configuration: ExecutorConfiguration) -> str:
    if configuration.sealed_structure:
        return raw_file

    result = os.path.join(configuration.working_directory, "structure.pdb")
    command = f"{PROTEIN_UTILS} filter-structure" + \
              f" --input {raw_file}" + \
              f" --output {result} "
    if configuration.chains:
        command += "--chains=" + ",".join(configuration.chains)
    configuration.execute_command(command)
    return result


def _prepare_fasta_files(
        structure_file: str, configuration: ExecutorConfiguration) \
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


def _prepare_conservation(
        structure: Structure, configuration: ExecutorConfiguration) \
        -> typing.Dict[str, str]:
    if configuration.conservation == ConservationType.NONE:
        return {}
    logger.info("Computing conservation ...")
    output_directory = os.path.join(
        configuration.working_directory,
        "conservation")
    os.makedirs(output_directory, exist_ok=True)
    result = {}
    for chain, fasta_file in structure.fasta_files.items():
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
        configuration: ExecutorConfiguration):
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


def _prepare_p2rank_input(
        structure: Structure,
        configuration: ExecutorConfiguration,
        conservation: typing.Dict[str, str]) -> str:
    directory = os.path.join(configuration.working_directory, "p2rank-input")
    os.makedirs(directory, exist_ok=True)
    structure_file = os.path.join(directory, "structure.pdb")
    shutil.copy(structure.file, structure_file)
    for chain, file in conservation.items():
        shutil.copy(
            file,
            os.path.join(directory, f"structure{chain.upper()}.hom"))
    return structure_file


def _execute_p2rank(
        input_structure: str, output_directory: str,
        configuration: ExecutorConfiguration):
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


def _prepare_output(
        p2rank_output: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        configuration: ExecutorConfiguration):
    logger.info("Collecting output ...")
    if configuration.output == OutputType.P2RANK:
        _prepare_output_p2rank(p2rank_output, configuration)
    elif configuration.output == OutputType.PRANKWEB:
        _prepare_output_prankweb(
            p2rank_output, structure, conservation, configuration)
    else:
        raise Exception("Invalid output type!")


def _prepare_output_p2rank(
        p2rank_output: str,
        configuration: ExecutorConfiguration):
    for file in os.listdir(p2rank_output):
        source = os.path.join(p2rank_output, file)
        target = os.path.join(configuration.output_directory, file)
        os.rename(source, target)


def _prepare_output_prankweb(
        p2rank_output: str,
        structure: Structure, conservation: typing.Dict[str, str],
        configuration: ExecutorConfiguration):
    output = configuration.output_directory
    os.makedirs(output, exist_ok=True)
    _zip_directory(p2rank_output, os.path.join(output, "p2rank.zip"))
    shutil.copy(structure.raw_file, os.path.join(output, "structure.pdb"))
    prediction_file = os.path.join(output, "prediction.json")
    _prepare_prediction_file(
        prediction_file, structure, conservation, p2rank_output, configuration)


def _zip_directory(directory_to_zip: str, output: str):
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as stream:
        for root, dirs, files in os.walk(directory_to_zip):
            for file in files:
                path_in_zip = os.path.relpath(
                    os.path.join(root, file), os.path.join(directory_to_zip)
                )
                stream.write(os.path.join(root, file), path_in_zip)


def _prepare_prediction_file(
        output_file: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        p2rank_output: str,
        configuration: ExecutorConfiguration):
    structure_file = os.path.join(
        configuration.working_directory, "structure-information.json")

    configuration.execute_command(
        f"{PROTEIN_UTILS} select-binding-site"
        f" --structure={structure.raw_file}"
        f" --output={structure_file}"
    )

    structure = _load_structure_file(structure_file)

    predictions_file = os.path.join(
        p2rank_output, "structure.pdb_predictions.csv")
    pockets = _prepare_pockets(predictions_file)

    with open(output_file, "w", encoding="utf-8") as stream:
        json.dump({
            "structure": structure,
            "pockets": pockets
        }, stream, indent=2)


def _prepare_pockets(predictions_file: str):
    with open(predictions_file) as stream:
        reader = csv.reader(stream)
        head = [value.strip() for value in next(reader)]
        predictions = [{
            key: value.strip()
            for key, value in zip(head, row)
        } for row in reader]
    return [
        {
            "name": prediction["name"],
            "rank": prediction["rank"],
            "score": prediction["score"],
            "probability": prediction["probability"],
            "center": [
                prediction["center_x"],
                prediction["center_y"],
                prediction["center_z"]
            ],
            "residues": prediction["residue_ids"].split(" "),
            "surface": prediction["surf_atom_ids"].split(" ")
        }
        for prediction in predictions
    ]


def _load_structure_file(structure_file):
    with open(structure_file, encoding="utf-8") as stream:
        structure = json.load(stream)

    return {
        "indices": structure["indices"],
        "sequence": structure["seq"],
        "binding": structure["bindingSites"],
        "regions": [
            {
                "name": region["regionName"],
                "start": region["start"],
                "end": region["end"],
            }
            for region in structure["regions"]
        ],
        "scores": []  # TODO Load conservation
    }
