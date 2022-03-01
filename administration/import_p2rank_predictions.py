#!/usr/bin/env python3
import abc
import argparse
import os
import typing
import logging
import shutil
import json
import zipfile
import functools
import dataclasses
import datetime
import subprocess
import collections
import multiprocessing
import gzip

import output_prankweb as output_prankweb

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

ResidueScore = collections.namedtuple("ResidueScore", ["code", "value"])


@dataclasses.dataclass
class Arguments:
    java_tools: str
    working_directory: str
    conservation_directory: str
    prediction_directory: str
    structure_directory: str
    output_directory: str
    failed_directory: str
    database_name: str
    parallel: int
    input_type: str
    now = datetime.datetime.today().strftime('%Y-%m-%dT%H:%M:%S')


class AbstractContext(abc.ABC):

    def predictions_dir(self) -> str:
        ...

    def visualization_directory(self) -> str:
        ...

    def structure_file(self, code) -> str:
        """Path to source structure file."""
        ...

    def structure_file_name(self) -> str:
        """Name of a structure in target directory."""
        ...


class PdbContext(AbstractContext):

    def __init__(self, args: Arguments):
        self._args = args

    def predictions_dir(self):
        return os.path.join(
            self._args.prediction_directory,
            "predictions")

    def visualization_directory(self):
        return os.path.join(
            self._args.prediction_directory,
            "visualizations")

    def structure_file(self, code):
        return os.path.join(
            self._args.structure_directory,
            code[1:3],
            f"pdb{code}.ent.gz")

    def structure_file_name(self) -> str:
        return "structure.pdb"


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--conservation", required=True,
        help="Directory with conservations in format 'pdb{code}_{chain}.hom'.")
    parser.add_argument(
        "--prediction", required=True,
        help="Directory with predictions. Content given by input-type.")
    parser.add_argument(
        "--structure", required=True,
        help="Directory with structures. Content given by input-type.")
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
        "--failed", required=True,
        help="Path to directory where failed imports should be moved.")
    parser.add_argument(
        "--thread", default=1,
        help="Number of threads to use.")
    parser.add_argument(
        "--input-type", default="pdb",
        help="'pdb', 'alphafold'")
    return vars(parser.parse_args())


def main(arguments):
    _init_logging()

    import_predictions(Arguments(
        arguments["java_tools"],
        arguments["working"],
        arguments["conservation"],
        arguments["prediction"],
        arguments["structure"],
        arguments["output"],
        arguments["failed"],
        arguments["database"],
        min(arguments["thread"], 1),
        arguments["input_type"]
    ))


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def import_predictions(args: Arguments):
    os.makedirs(args.output_directory, exist_ok=True)
    os.makedirs(args.failed_directory, exist_ok=True)
    #
    logger.info("Collecting codes for import ...")
    codes_to_import = collect_codes_for_import(args)
    logger.info(f"Collected {len(codes_to_import)} codes for import")
    logger.info("Preparing data to working directory ...")
    execute_map_with_args(
        args, codes_to_import, import_data_into_working_directory)
    logger.info("Running java-tools ...")
    execute_java_tools(args, codes_to_import)
    logger.info("Processing and importing to output directory  ...")
    execute_map_with_args(
        args, codes_to_import, import_data_to_target_directory)
    logger.info("Finished")


def collect_codes_for_import(args: Arguments):
    """Return PDB codes available for import."""
    return [
        name[3:7]
        for name in os.listdir(with_context(args).predictions_dir())
        if name.endswith("_predictions.csv")
    ]


def with_context(args: Arguments) -> AbstractContext:
    if args.input_type == "pdb":
        return PdbContext(args)
    else:
        raise RuntimeError("Unknown input type")


def execute_map_with_args(args: Arguments, codes: typing.List[str], callback):
    """Execute callback for with args and one code."""
    result = []
    if args.parallel > 1:
        cpu_cures_to_use = args.parallel
        logger.info(f"Starting computations on {cpu_cures_to_use} cores")
        with multiprocessing.Pool(cpu_cures_to_use) as pool:
            call_arguments = [(args, code) for code in codes]
            result = pool.starmap(callback, call_arguments)
    else:
        logger.info(f"Starting using single cores")
        for code in codes:
            result.append(callback(args, code))
    logger.info("All executed")
    return result


def import_data_into_working_directory(args: Arguments, code: str):
    """Collect files to the working code directory."""
    root_dir = os.path.join(args.working_directory, code.upper())
    os.makedirs(root_dir, exist_ok=True)
    public_dir = os.path.join(root_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    ctx = with_context(args)

    conservation = find_conservation(args.conservation_directory, code)

    p2rank_predictions_file = os.path.join(
        ctx.predictions_dir(),
        f"pdb{code}.ent.gz_predictions.csv")

    # public/structure.*.gz
    shutil.copy(
        ctx.structure_file(code),
        os.path.join(public_dir, ctx.structure_file_name() + ".gz")
    )

    # structure.*.gz - for java-tools
    gunzip(
        ctx.structure_file(code),
        os.path.join(root_dir, ctx.structure_file_name())
    )

    # prediction.zip
    zip_directory(
        os.path.join(public_dir, "prankweb.zip"),
        {
            "structure.pdb_predictions.csv":
                p2rank_predictions_file,
            "structure.pdb_residues.csv": os.path.join(
                ctx.predictions_dir(),
                f"pdb{code}.ent.gz_residues.csv"),
            "visualizations/structure.pdb.pml": os.path.join(
                ctx.visualization_directory(),
                f"pdb{code}.ent.gz.pml"),
            "visualizations/data/structure.pdb": os.path.join(
                ctx.visualization_directory(), "data",
                f"pdb{code}.ent.gz"),
            "visualizations/data/structure.pdb_points.pdb.gz": os.path.join(
                ctx.visualization_directory(), "data",
                f"pdb{code}.ent.gz_points.pdb.gz"),
            **{
                f"conservation/conservation-{chain}": path
                for chain, path in conservation.items()
            }
        }
    )

    # log
    with open(os.path.join(root_dir, "log"), "w", encoding="utf-8") as stream:
        stream.write("Imported using 'import_p2rank_predictions.py'.")

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
                "structureName": ctx.structure_file_name()
            }
        }, stream)


def find_conservation(
        conservation_directory: str, code: str) -> typing.Dict[str, str]:
    """Dictionary with chain and file path."""

    def select_chain(name: str) -> str:
        return name[8:name.rindex(".")]

    return {
        select_chain(file_name):
            os.path.join(conservation_directory, file_name)
        for file_name in list_directory(conservation_directory)
        if code in file_name
    }


@functools.lru_cache(maxsize=2)
def list_directory(path: str):
    return os.listdir(path)


def gunzip(source: str, target: str):
    with gzip.open(source, "rb") as input_stream:
        with open(target, "wb") as output_stream:
            shutil.copyfileobj(input_stream, output_stream)


def zip_directory(output_path: str, entries: typing.Dict[str, str]):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as stream:
        for path_in_zip, path in entries.items():
            stream.write(path, path_in_zip)


def execute_java_tools(args: Arguments, codes_to_import: typing.List[str]):
    ctx = with_context(args)

    def java_tools_input(code: str) -> str:
        return os.path.join(
            args.working_directory,
            code.upper(),
            ctx.structure_file_name())

    def java_tools_output(code: str) -> str:
        return os.path.join(
            args.working_directory,
            code.upper(),
            "java-tools.json")

    commands = [
        f"structure-info"
        f" -i {java_tools_input(code)}"
        f" -o {java_tools_output(code)}\n"
        for code in codes_to_import
        if not os.path.exists(java_tools_output(code))
    ]

    command_file = os.path.join(args.working_directory, "commands.txt")
    with open(command_file, "w") as stream:
        stream.writelines(commands)
    command = f"{args.java_tools} exec --input {command_file}"
    result = subprocess.run(command, shell=True, env=os.environ.copy())
    result.check_returncode()


def import_data_to_target_directory(args: Arguments, code: str) -> None:
    """Process java-tools output and move to target directory."""
    ctx = with_context(args)
    root_dir = os.path.join(args.working_directory, code.upper())
    java_tools_file = os.path.join(root_dir, "java-tools.json")

    if not os.path.exists(java_tools_file):
        logger.error(f"Missing structure information file: {java_tools_file}")
        target_path = os.path.join(args.failed_directory, code)
        shutil.move(root_dir, target_path)
        return

    public_dir = os.path.join(root_dir, "public")
    conservation = find_conservation(args.conservation_directory, code)
    p2rank_predictions_file = os.path.join(
        ctx.predictions_dir(),
        f"pdb{code}.ent.gz_predictions.csv")

    prediction_file = os.path.join(public_dir, "prediction.json")
    try:
        content = {
            "structure": output_prankweb.load_structure_file(
                java_tools_file, conservation),
            "pockets": output_prankweb.load_pockets(
                p2rank_predictions_file),
            "metadata": {},
        }
    except RuntimeError:
        os.rename(root_dir, os.path.join(
            args.failed_directory,
            code.upper()
        ))
        return

    with open(prediction_file, "w", encoding="utf-8") as stream:
        json.dump(content, stream, indent=2)

    # Remove temporary files.
    os.remove(java_tools_file)
    os.remove(os.path.join(
        args.working_directory,
        code.upper(),
        ctx.structure_file_name()))
    # Move to target
    os.makedirs(
        os.path.join(args.output_directory, code.upper()[1:3]),
        exist_ok=True)
    os.rename(
        root_dir,
        os.path.join(
            args.output_directory,
            code.upper()[1:3],
            code.upper()
        ))


if __name__ == "__main__":
    main(_read_arguments())
