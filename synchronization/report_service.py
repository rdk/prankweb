#!/usr/bin/env python3
import json
import os
import typing
import shutil
import datetime

_state = {
    "new": [],
    "prediction": {
        "finished": [],
        "failed": [],
    },
    "funpdbe": {
        "finished": [],
        "empty": [],
        "failed": [],
    },
    "statistics": {}
}


def on_new_pdb_records(pdb: typing.List[str]) -> None:
    _state["new"].extend(pdb)


def on_prediction_finished(pdb: str) -> None:
    _state["prediction"]["finished"].extend(pdb)


def on_prediction_failed(pdb: str) -> None:
    _state["prediction"]["failed"].extend(pdb)


def on_funpdbe_conversion_finished(pdb: str) -> None:
    _state["funpdbe"]["failed"].extend(pdb)


def on_funpdbe_conversion_empty(pdb: str) -> None:
    _state["funpdbe"]["empty"].extend(pdb)


def on_funpdbe_conversion_failed(pdb: str) -> None:
    _state["funpdbe"]["failed"].extend(pdb)


def on_counts(counts: typing.Dict[str, int]) -> None:
    _state["statistics"] = counts


def synchronize_report(path: str) -> None:
    if os.path.exists(path):
        report = _load_json(path)
    else:
        # Create new report object.
        report = {"metadata": {"version": 1}, "data": []}
    today = _load_today_or_create(report["data"])
    _add_state_to_report(today)
    _save_json(path, report)


def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def _load_today_or_create(reports: typing.List):
    key = datetime.datetime.now().strftime("%Y-%m-%d")
    if len(reports) > 1 and reports[-1]["date"] == key:
        return reports[-1]
    else:
        return _create_report(key)


def _create_report(date: str):
    return {
        "new": [],
        "prediction": {
            "finished": [],
            "failed": [],
        },
        "funpdbe": {
            "finished": [],
            "empty": [],
            "failed": [],
        },
        "statistics": {},
        "date": date,
        "updated": ""
    }


def _add_state_to_report(report):
    _add_uniq(report["new"], _state["new"])
    _add_uniq(report["prediction"]["finished"],
              _state["prediction"]["finished"])
    _add_uniq(report["prediction"]["failed"],
              _state["prediction"]["failed"])
    _add_uniq(report["funpdbe"]["finished"],
              _state["funpdbe"]["finished"])
    _add_uniq(report["funpdbe"]["empty"],
              _state["funpdbe"]["empty"])
    _add_uniq(report["funpdbe"]["failed"],
              _state["funpdbe"]["failed"])
    report["updated"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _add_uniq(left: typing.List[str], right: typing.List[str]):
    left.extend([item for item in right if item not in left])


def _save_json(path: str, content):
    path_swp = path + ".swp"
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=False, indent=2)
    os.replace(path_swp, path)
