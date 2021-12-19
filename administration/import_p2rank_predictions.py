#!/usr/bin/env python3
import argparse
import os
import typing
import logging
import shutil
import pathlib
import json
import zipfile
import functools
import dataclasses
import datetime
import subprocess
import collections
import csv
import multiprocessing

logger = logging.getLogger(__name__)

ResidueScore = collections.namedtuple("ResidueScore", ["code", "value"])


@dataclasses.dataclass
class Arguments:
    java_tools: str
    working_directory: str
    conservation_directory: str
    structure_directory: str
    prediction_directory: str
    visualization_directory: str
    output_directory: str
    database_name: str
    parallel: bool
    now = datetime.datetime.today().strftime('%Y-%m-%dT%H:%M:%S')


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--conservation", required=True,
        help="Directory with conservations in format 'pdb{code}_{chain}.hom'.")
    parser.add_argument(
        "--structure", required=True,
        help="Directory with structure files in format 'pdb{code}.ent.gz'")
    parser.add_argument(
        "--prediction", required=True,
        help="Directory with computed predictions in format "
             "'pdb{code}.ent.gz_predictions.csv' and "
             "'pdb{code}.ent.gz_residues.csv")
    parser.add_argument(
        "--visualization", required=True,
        help="Directory with p2rank visualisation output. Must contains "
             "the data folder and files in format 'pdb{code}.ent.gz.pml'.")
    parser.add_argument(
        "--output", required=True,
        help="Output folder with predictions. E.g. /database/v01")
    parser.add_argument(
        "--database", required=True,
        help="Name of target prankweb database. E.g. v1")
    parser.add_argument(
        "--java-tools", required=True,
        help="Path to java-tool executable from prankweb project.")
    parser.add_argument(
        "--working", required=True,
        help="Path to working directory.")
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Path to working directory.")
    return vars(parser.parse_args())


def main(arguments):
    logging.basicConfig(level=logging.DEBUG)
    _import(Arguments(
        arguments["java_tools"],
        arguments["working"],
        arguments["conservation"],
        arguments["structure"],
        arguments["prediction"],
        arguments["visualizations"],
        arguments["output"],
        arguments["database"],
        arguments["parallel"],
    ))


def _import(arguments: Arguments):
    codes_to_import = [
        name[3:7]
        for name in os.listdir(arguments.prediction_directory)
        if name.endswith("_predictions.csv")
    ]
    logger.info(f"Collected {len(codes_to_import)} codes for import")
    if arguments.parallel:
        cpu_cures_to_use = multiprocessing.cpu_count() - 2
        logger.info(f"Starting computations on {cpu_cures_to_use} cores")
        with multiprocessing.Pool(cpu_cures_to_use) as pool:
            pool.starmap(_import_code_wrap, [
                (arguments, code)
                for code in codes_to_import
            ])
            pool.join()
    else:
        for code in codes_to_import:
            _import_code_wrap(arguments, code)
    logger.info("Finished")


def _import_code_wrap(arguments: Arguments, code: str):
    try:
        _import_code(arguments, code)
        return None
    except:
        return code


def _import_code(arguments: Arguments, code: str):
    root_dir = os.path.join(arguments.working_directory, code)
    os.makedirs(root_dir, exist_ok=True)
    public_dir = os.path.join(root_dir, "public")

    structure_file = os.path.join(
        arguments.structure_directory,
        f"pdb{code}.ent.gz")

    conservation = _find_conservation(arguments, code)

    p2rank_predictions_file = os.path.join(
        arguments.prediction_directory,
        f"pdb{code}.ent.gz_predictions.csv")

    # public/structure.pdb.gz
    shutil.copy(
        structure_file,
        os.path.join(public_dir, "structure.pdb.gz")
    )

    # prediction.zip
    _zip_directory(
        os.path.join(public_dir, "prediction.zip"),
        {
            "structure.pdb_predictions.csv":
                p2rank_predictions_file,
            "structure.pdb_residues.csv": os.path.join(
                arguments.prediction_directory,
                f"pdb{code}.ent.gz_residues.csv"),
            "visualizations/structure.pdb.pml": os.path.join(
                arguments.visualization_directory,
                f"pdb{code}.ent.gz.pml"),
            "visualizations/data/structure.pdb": os.path.join(
                arguments.visualization_directory, "data",
                f"pdb{code}.ent.gz"),
            "structure.pdb_points.pdb.gz": os.path.join(
                arguments.visualization_directory, "data",
                f"pdb{code}.ent.gz_points.pdb.gz"),
            **{
                f"conservation/conservation-{chain}": path
                for chain, path in conservation
            }
        }
    )

    # log
    pathlib.Path(os.path.join(root_dir, "log")).touch()

    # info.json
    info_file = os.path.join(root_dir, "info.json")
    with open(info_file, "w", encoding="utf-8") as stream:
        json.dump({
            "id": code,
            "database": arguments.database_name,
            "created": arguments.now,
            "lastChange": arguments.now,
            "status": "successful",
            "metadata": {
                "predictionName": code.upper(),
                "structureName": "structure.pdb"
            }
        }, stream)

    # prediction.json
    java_tools_file = os.path.join(root_dir, "java-tools.json")
    _execute_command(
        f"{arguments.java_tools} structure-info"
        f" --input={structure_file}"
        f" --output={java_tools_file}"
    )

    prediction_file = os.path.join(public_dir, "prediction.json")
    with open(prediction_file, "w", encoding="utf-8") as stream:
        json.dump({
            "structure": _load_structure_file(structure_file, conservation),
            "pockets": _load_pockets(p2rank_predictions_file),
            "metadata": {},
        }, stream, indent=2)

    os.remove(java_tools_file)

    # move
    target = os.path.join(arguments.output_directory, code.upper())
    os.rename(root_dir, target)


def _find_conservation(
        arguments: Arguments, code: str) -> typing.Dict[str, str]:
    """Dictionary with chain and file path."""

    def select_chain(name: str) -> str:
        return name[8:name.rindex(".")]

    return {
        select_chain(file_name):
            os.path.join(arguments.conservation_directory, file_name)
        for file_name in _list_directory(arguments.conservation_directory)
        if code in file_name
    }


@functools.lru_cache(maxsize=2)
def _list_directory(path: str):
    return os.listdir(path)


def _zip_directory(output_path: str, entries: typing.Dict[str, str]):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as stream:
        for path_in_zip, path in entries.items():
            stream.write(path, path_in_zip)


def _execute_command(command: str):
    result = subprocess.run(command, shell=True, env=os.environ.copy())
    result.check_returncode()


# region From output_prankweb.py


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
        assert len(structure["sequence"]) == len(chain_scores), \
            f"Sequences for chain {chain} " \
            f"'{structure['sequence']}' " \
            f"'{chain_scores} " \
            " must have same size."
        for index, score in zip(index_range, chain_scores):
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


# endregion

if __name__ == "__main__":
    main(_read_arguments())
