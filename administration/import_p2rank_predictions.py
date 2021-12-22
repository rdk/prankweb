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
import multiprocessing

import output_prankweb

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
    parallel: int
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
        "--thread", default=1,
        help="Number of threads to use.")
    return vars(parser.parse_args())


def main(arguments):
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] - %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        level=logging.DEBUG)
    _import(Arguments(
        arguments["java_tools"],
        arguments["working"],
        arguments["conservation"],
        arguments["structure"],
        arguments["prediction"],
        arguments["visualization"],
        arguments["output"],
        arguments["database"],
        min(arguments["thread"], 1),
    ))


def _import(args: Arguments):
    logger.info("Collecting codes for import ...")
    codes_to_import = _collect_codes_for_import(args)
    logger.info(f"Collected {len(codes_to_import)} codes for import")
    logger.info("Preparing data to working directory ...")
    _execute_map_with_args(
        args, _import_data_into_working_directory, codes_to_import)
    logger.info("Running java-tools ...")

    logger.info("Processing and importing to output directory  ...")
    _execute_map_with_args(
        args, _import_data_to_target_directory, codes_to_import)
    logger.info("Finished")


def _collect_codes_for_import(args: Arguments):
    return [
        name[3:7]
        for name in os.listdir(args.prediction_directory)
        if name.endswith("_predictions.csv")
    ]


def _execute_map_with_args(args: Arguments, callback, arguments):
    result = []
    if args.parallel > 1:
        cpu_cures_to_use = args.parallel
        logger.info(f"Starting computations on {cpu_cures_to_use} cores")
        with multiprocessing.Pool(cpu_cures_to_use) as pool:
            call_arguments = [(args, code) for code in arguments]
            result = pool.starmap(callback, call_arguments)
    else:
        logger.info(f"Starting using single cores")
        for code in arguments:
            result.append(callback(args, code))
    logger.info("All executed")
    return result


def _import_data_into_working_directory(args: Arguments, code: str) -> str:
    root_dir = os.path.join(args.working_directory, code)
    os.makedirs(root_dir, exist_ok=True)
    public_dir = os.path.join(root_dir, "public")
    os.makedirs(public_dir, exist_ok=True)

    structure_file = os.path.join(
        args.structure_directory,
        f"pdb{code}.ent.gz")

    conservation = _find_conservation(args, code)

    p2rank_predictions_file = os.path.join(
        args.prediction_directory,
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
                args.prediction_directory,
                f"pdb{code}.ent.gz_residues.csv"),
            "visualizations/structure.pdb.pml": os.path.join(
                args.visualization_directory,
                f"pdb{code}.ent.gz.pml"),
            "visualizations/data/structure.pdb": os.path.join(
                args.visualization_directory, "data",
                f"pdb{code}.ent.gz"),
            "structure.pdb_points.pdb.gz": os.path.join(
                args.visualization_directory, "data",
                f"pdb{code}.ent.gz_points.pdb.gz"),
            **{
                f"conservation/conservation-{chain}": path
                for chain, path in conservation.items()
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
            "database": args.database_name,
            "created": args.now,
            "lastChange": args.now,
            "status": "successful",
            "metadata": {
                "predictionName": code.upper(),
                "structureName": "structure.pdb"
            }
        }, stream)

    # prediction.json
    java_tools_file = os.path.join(root_dir, "java-tools.json")
    return f"structure-info  " \
           f"--input={structure_file}  " \
           f"--output={java_tools_file}"


def _find_conservation(
        args: Arguments, code: str) -> typing.Dict[str, str]:
    """Dictionary with chain and file path."""

    def select_chain(name: str) -> str:
        return name[8:name.rindex(".")]

    return {
        select_chain(file_name):
            os.path.join(args.conservation_directory, file_name)
        for file_name in _list_directory(args.conservation_directory)
        if code in file_name
    }


@functools.lru_cache(maxsize=2)
def _list_directory(path: str):
    return os.listdir(path)


def _zip_directory(output_path: str, entries: typing.Dict[str, str]):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as stream:
        for path_in_zip, path in entries.items():
            stream.write(path, path_in_zip)


def _execute_java_tools(args: Arguments, commands: typing.List[str]):
    command_file = os.path.join(args.working_directory, "commands.txt")
    with open(command_file, "w") as stream:
        stream.writelines(commands)
    command = f"{args.java_tools} exec --input {command_file}"
    result = subprocess.run(command, shell=True, env=os.environ.copy())
    result.check_returncode()


def _import_data_to_target_directory(args: Arguments, code: str) -> None:
    root_dir = os.path.join(args.working_directory, code)
    java_tools_file = os.path.join(root_dir, "java-tools.json")

    if not os.path.exists(java_tools_file):
        logger.error(f"Missing structure information file: {java_tools_file}")
        return

    public_dir = os.path.join(root_dir, "public")
    conservation = _find_conservation(args, code)
    p2rank_predictions_file = os.path.join(
        args.prediction_directory,
        f"pdb{code}.ent.gz_predictions.csv")

    prediction_file = os.path.join(public_dir, "prediction.json")
    with open(prediction_file, "w", encoding="utf-8") as stream:
        json.dump({
            "structure": output_prankweb.load_structure_file(
                java_tools_file, conservation),
            "pockets": output_prankweb.load_pockets(
                p2rank_predictions_file),
            "metadata": {},
        }, stream, indent=2)

    os.remove(java_tools_file)

    target = os.path.join(
        args.output_directory,
        code.upper()[1:3],
        code.upper()
    )
    os.rename(root_dir, target)

if __name__ == "__main__":
    main(_read_arguments())
