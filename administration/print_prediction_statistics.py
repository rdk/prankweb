#!/usr/bin/env python3
#
# For given prediction directory {code[2:3]}/{code} load all predictions
# and print statistics.
#
import argparse
import os
import typing
import logging
import json
import dataclasses
import collections

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@dataclasses.dataclass
class Prediction:
    code: str
    status: str
    predicted_sites: typing.Optional[int]


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--database", required=True,
        help="Directory with prankweb predictions, e.g. 'v3'.")
    parser.add_argument(
        "--pocket-size", action="store_true",
        help="Also print information about pocket sizes.")
    return vars(parser.parse_args())


def main(arguments):
    _init_logging()
    logger.info("Collecting predictions ...")
    directories = collect_predictions_directories(arguments["database"])
    logger.info(f"Found {len(directories)} prediction directories")
    logger.info("Loading predictions ...")
    count_pockets = arguments["pocket_size"]
    predictions = [load_prediction(directory, count_pockets)
                   for directory in directories]
    print_statistics(predictions, count_pockets)
    logger.info("All done")


def _init_logging():
    formatter = logging.Formatter(
        "%(asctime)s %(name)s [%(levelname)s] : %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")

    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(formatter)

    logger.addHandler(handler)


def collect_predictions_directories(
        predication_directory: str) -> typing.List[str]:
    return [
        os.path.join(predication_directory, directory, code)
        for directory in os.listdir(predication_directory)
        for code in os.listdir(os.path.join(predication_directory, directory))
    ]


def load_prediction(directory: str, load_pockets: bool) -> Prediction:
    info_file = os.path.join(directory, "info.json")
    if not os.path.exists(info_file):
        return Prediction(directory[-4:].lower(), "missing", None)
    info = load_json(info_file)

    prediction_file = os.path.join(directory, "public", "prediction.json")
    predicted_site = None
    if load_pockets and os.path.exists(prediction_file):
        prediction = load_json(prediction_file)
        predicted_site = len(prediction["pockets"])

    return Prediction(info["id"], info["status"], predicted_site)


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def print_statistics(predictions: typing.List[Prediction], print_pockets: bool):
    by_status = collections.defaultdict(int)
    by_pockets = collections.defaultdict(int)
    for prediction in predictions:
        by_status[str(prediction.status)] += 1
        by_pockets[prediction.predicted_sites] += 1
    print("Loaded: ", len(predictions))
    print("Status")
    for key, value in by_status.items():
        print(f"  {key} : {value}")
    if print_pockets:
        print("Pockets")
        for key in sorted(by_pockets.keys()):
            value = by_pockets[key]
            print(f"  {str(key).rjust(6)} : {str(value).rjust(6)}")


if __name__ == "__main__":
    main(_read_arguments())
