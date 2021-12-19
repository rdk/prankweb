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

logger = logging.getLogger(__name__)


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input", required=True,
        help="Input folder with v1 predictions.")
    parser.add_argument(
        "--output", required=True,
        help="Output folder with predictions. E.g. /database/v01")
    parser.add_argument(
        "--database", required=True,
        help="Name of target prankweb database. E.g. v1")
    parser.add_argument(
        "--pdbe",
        help="Path to directory with predictions for FunPDBe input."
             "Directory 'p2rank-predictions' with files "
             "'{}.pdb_predictions.csv' and '{}.pdb_residues.csv'."
             "Directory 'conservation' with files '{}.pdb.seq.fasta.hom'")
    return vars(parser.parse_args())


def main(arguments):
    logging.basicConfig(level=logging.DEBUG)
    files = os.listdir(arguments["input"])
    for index, directory_name in enumerate(files):
        source_directory = os.path.join(
            arguments["input"],
            directory_name)
        if not os.path.isdir(source_directory):
            continue
        target_directory = os.path.join(
            arguments["output"],
            directory_name[1:3],
            directory_name)
        logger.info(f"Converting {index + 1}/{len(files)} : {directory_name}")
        try:
            _import(source_directory,
                    target_directory,
                    arguments["database"],
                    arguments.get("pdbe", None))
        except:
            shutil.rmtree(target_directory)
            logger.exception(f"Import failed for: {directory_name}")


def _import(
        source: str,
        target: str,
        database: str,
        pdb_directory: typing.Optional[str]):
    os.makedirs(target, exist_ok=True)
    code = _import_info(source, target, database)
    os.makedirs(os.path.join(target, "public"), exist_ok=True)
    _import_public(source, target, code, pdb_directory)
    _import_stdout(source, target)


def _import_public(
        source_dir: str, target_dir: str, code: str,
        funpdbe_directory: typing.Optional[str]):
    shutil.copy(
        os.path.join(source_dir, "public", "structure.pdb.gz"),
        os.path.join(target_dir, "public"))
    sequence = _load_json(
        os.path.join(source_dir, "public", "sequence.json"))
    prediction = _load_json(
        os.path.join(source_dir, "public", "prediction.json"))
    content = {
        "structure": {
            "indices": sequence["indices"],
            "sequence": sequence["seq"],
            "binding": sequence["bindingSites"],
            "regions": [
                {
                    "name": region["regionName"],
                    "start": region["start"],
                    "end": region["end"],
                }
                for region in sequence["regions"]
            ],
            "scores": {}
        },
        "pockets": [
            {
                "name": pocket["name"],
                "rank": pocket["rank"],
                "score": pocket["score"],
                "probability": None,
                "center": [
                    pocket["centerX"],
                    pocket["centerY"],
                    pocket["centerZ"],
                ],
                "residues": pocket["residueIds"],
                "surface": pocket["surfAtomIds"],
            }
            for pocket in prediction
        ],
        "metadata": {}
    }

    if sequence["scores"]:
        content["structure"]["scores"]["conservation"] = sequence["scores"]

    if funpdbe_directory is not None:
        _create_prankweb(target_dir, code, funpdbe_directory)

    _save_json(os.path.join(target_dir, "public", "prediction.json"), content)


def _load_json(path: str):
    with open(path) as stream:
        return json.load(stream)


def _create_prankweb(
        target_dir: str,
        code: str,
        funpdbe_directory: str):
    code = code.lower()
    prediction_file = os.path.join(
        funpdbe_directory, "p2rank-predictions", f"{code}.pdb_predictions.csv")
    residues_file = os.path.join(
        funpdbe_directory, "p2rank-predictions", f"{code}.pdb_residues.csv")
    conservation_directory = os.path.join(funpdbe_directory, "conservation")

    conservation_files = {
        "conservation-" + name[4: name.index(".")]:
            os.path.join(conservation_directory, name)
        for name in _list_files(conservation_directory)
        if name.startswith(code)
    }

    output_file = os.path.join(target_dir, "public", "prankweb.zip")

    with zipfile.ZipFile(output_file, "w") as output_zip:
        if os.path.exists(prediction_file):
            output_zip.write(prediction_file, f"structure.pdb_predictions.csv")
        if os.path.exists(residues_file):
            output_zip.write(residues_file, f"structure.pdb_residues.csv")
        for zip_name, path in conservation_files.items():
            if os.path.exists(residues_file):
                output_zip.write(path, f"conservation/{zip_name}")


@functools.lru_cache(maxsize=2)
def _list_files(path: str):
    return os.listdir(path)


def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=False)


def _import_info(source_dir: str, target_dir: str, database: str):
    source = _load_json(os.path.join(source_dir, "status.json"))
    code = source["id"]
    info_content = {
        "id": code.upper(),
        "database": database,
        "created": source["created"],
        "lastChange": source["lastChange"],
        "status": "successful",
        "metadata": {
            "predictionName": source["id"],
            "structureName": "structure.pdb",
        }
    }
    _save_json(os.path.join(target_dir, "info.json"), info_content)
    return code.lower()


def _import_stdout(source_dir: str, target_dir: str):
    # We just create an empty file.
    pathlib.Path(os.path.join(target_dir, "log")).touch()


if __name__ == "__main__":
    main(_read_arguments())
