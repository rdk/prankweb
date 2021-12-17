import os
import shutil
import zipfile
import json
import csv
import logging
import collections

from model import *

logger = logging.getLogger("prankweb.output")
logger.setLevel(logging.DEBUG)

ResidueScore = collections.namedtuple("ResidueScore", ["code", "value"])


def _prepare_output_prankweb(
        p2rank_output: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        configuration: Execution) -> ExecutionResult:
    output_directory = configuration.output_directory
    output_structure_file = \
        "structure." + _extension(structure.raw_structure_file)
    os.makedirs(output_directory, exist_ok=True)
    _zip_directory(
        p2rank_output,
        os.path.join(output_directory, "p2rank.zip"))
    shutil.copy(
        structure.raw_structure_file,
        os.path.join(output_directory, output_structure_file))
    shutil.copy(
        os.path.join(p2rank_output, "structure.pdb_predictions.csv"),
        os.path.join(output_directory, "p2rank-predictions.csv")
    )
    shutil.copy(
        os.path.join(p2rank_output, "structure.pdb_residues.csv"),
        os.path.join(output_directory, "p2rank-residues.csv")
    )
    prediction_file = os.path.join(output_directory, "prediction.json")
    _prepare_prediction_file(
        prediction_file, structure, conservation,
        p2rank_output, configuration)
    return ExecutionResult(output_structure_file=output_structure_file)


def _zip_directory(directory_to_zip: str, output: str):
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as stream:
        for root, dirs, files in os.walk(directory_to_zip):
            for file in files:
                path_in_zip = os.path.relpath(
                    os.path.join(root, file), os.path.join(directory_to_zip)
                )
                stream.write(os.path.join(root, file), path_in_zip)


def _extension(file_name: str) -> str:
    """For 'name.ext' return 'ext'."""
    return file_name[file_name.rindex(".") + 1:]


def _prepare_prediction_file(
        output_file: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        p2rank_output: str,
        configuration: Execution):
    predictions_file = os.path.join(
        p2rank_output, "structure.pdb_predictions.csv")

    structure_file = os.path.join(
        configuration.working_directory, "structure-information.json")

    configuration.execute_command(
        f"{configuration.java_tools} structure-info"
        f" --input={structure.raw_structure_file}"
        f" --output={structure_file}"
    )

    with open(output_file, "w", encoding="utf-8") as stream:
        json.dump({
            "structure": _load_structure_file(structure_file, conservation),
            "pockets": _load_pockets(predictions_file),
            "metadata": {
                **structure.metadata,
            },
        }, stream, indent=2)


def _load_pockets(predictions_file: str):
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


def _load_structure_file(
        structure_file: str, conservation: typing.Dict[str, str]):
    with open(structure_file, encoding="utf-8") as stream:
        structure = json.load(stream)

    scores = {
        **structure["scores"]
    }

    if conservation := _prepare_conservation(structure, conservation):
        scores["conservation"] = conservation

    return {
        "indices": structure["indices"],
        "sequence": structure["sequence"],
        "binding": structure["binding"],
        "regions": [
            {
                "name": region["name"],
                "start": region["start"],
                "end": region["end"],
            }
            for region in structure["regions"]
        ],
        "scores": scores
    }


def _prepare_conservation(structure, conservation: typing.Dict[str, str]):
    if len(conservation) == 0:
        return None
    result = []
    # We know regions are sorted.
    for region in structure["regions"]:
        chain = region["name"]
        conservation_file = conservation.get(chain, None)
        if not conservation_file:
            raise RuntimeError(f"Missing conservation for '{chain}'")
        chain_scores = _read_conservation_file(conservation_file)
        index_range = range(region["start"], region["end"])
        for index, score in zip(index_range, chain_scores):
            # We use masked version, so there can be X in the
            # computed conservation instead of other code.
            assert structure["sequence"][index] == score.code and \
                   not score.code == "X", \
                f'{chain} {index} ' \
                f'expected: "{structure["sequence"][index]}" ' \
                f'actual: "{score.code}"'
            result.append(score.value)
    return result


def _read_conservation_file(path: str) -> typing.List[ResidueScore]:
    result = []
    with open(path, encoding="utf-8") as stream:
        for index, line in enumerate(stream):
            index, value, code = line.strip().split("\t")
            # We utilize 0 as the minimal value not.
            final_value = max(0, float(value))
            result.append(ResidueScore(code, final_value))
    return result
