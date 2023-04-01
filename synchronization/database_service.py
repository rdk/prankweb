#!/usr/bin/env python3
import os
import json
import enum


class EntryStatus(enum.Enum):
    # New record imported from PDB database.
    NEW = "new"
    # Task submitted to prediction server not yet evaluated.
    PRANKWEB_QUEUED = "waiting"
    # Prediction for given code failed.
    PRANKWEB_FAILED = "prankweb-failed"
    # We have prediction.
    PREDICTED = "predicted"
    # Extra status, we can not submit empty predictions, yet they are not
    # failures.
    EMPTY = "empty"
    # Conversion to funPDBe format failed.
    FUNPDBE_FAILED = "funpdbe-failed"
    # We have the file to submit to funPDBe.
    CONVERTED = "converted"


def load_database(directory: str):
    if not os.path.exists(_get_database_file(directory)):
        # Create default database.
        return {
            "version": "1",
            "pdb": {},
            "data": {}
        }
    with open(_get_database_file(directory), "r", encoding="utf-8") as stream:
        return json.load(stream)


def _get_database_file(directory: str):
    return os.path.join(directory, "index.json")


def save_database(directory: str, database):
    destination = _get_database_file(directory)
    destination_swp = destination + ".swp"
    with open(destination_swp, "w", encoding="utf-8") as stream:
        json.dump(database, stream, ensure_ascii=False, indent=2)
    os.replace(destination_swp, destination)
