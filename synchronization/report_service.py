#!/usr/bin/env python3
import json
import os
import typing
import datetime

from database_service import EntryStatus

_state = {
    # New codes.
    "new": [],
    # Result of p2rank prediction.
    # Values are removed from predicted once processed by funPDBe.
    "predicted": [],
    "prankweb-failed": [],
    # Results of funPDBe processing.
    "converted": [],
    "empty": [],
    "funpdbe-failed": [],
    # Statistics.
    "statistics": {}
}


def on_new_pdb_records(pdb_codes: typing.List[str]) -> None:
    _state["new"].extend(pdb_codes)


def on_prediction_finished(pdb_code: str) -> None:
    _state["predicted"].append(pdb_code)


def on_prediction_failed(pdb_code: str) -> None:
    _state["prankweb-failed"].append(pdb_code)


def on_funpdbe_conversion_finished(pdb_code: str) -> None:
    _state["predicted"].remove(pdb_code)
    _state["converted"].append(pdb_code)


def on_funpdbe_conversion_empty(pdb_code: str) -> None:
    _state["predicted"].remove(pdb_code)
    _state["empty"].append(pdb_code)


def on_funpdbe_conversion_failed(pdb_code: str) -> None:
    _state["predicted"].remove(pdb_code)
    _state["funpdbe-failed"].append(pdb_code)


def on_counts(counts: typing.Dict[EntryStatus, int]) -> None:
    _state["statistics"] = counts


def synchronize_report(path: str) -> None:
    if os.path.exists(path):
        report = _load_json(path)
    else:
        # Create new report object.
        report = {"metadata": {"version": 1}, "data": []}
    today = _load_or_create_today_report(report["data"])
    _add_state_to_report(today)
    _save_json(path, report)


def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def _load_or_create_today_report(reports: typing.List):
    key = datetime.datetime.now().strftime("%Y-%m-%d")
    if len(reports) > 0 and reports[-1]["date"] == key:
        return reports[-1]
    else:
        new_report = _create_report(key)
        reports.append(new_report)
        return new_report


def _create_report(date: str):
    return {
        "new": [],
        "report": {
            "predicted": [],
            "converted": [],
            "empty": [],
            "funpdbe-failed": [],
            "prankweb-failed": [],
        },
        "statistics": {},
        "date": date,
        "updated": ""
    }


def _add_state_to_report(report):
    _add_uniq(report["new"], _state["new"])
    _add_uniq(report["report"]["predicted"], _state["predicted"])
    _add_uniq(report["report"]["converted"], _state["converted"])
    _add_uniq(report["report"]["empty"], _state["empty"])
    _add_uniq(report["report"]["funpdbe-failed"], _state["funpdbe-failed"])
    _add_uniq(report["report"]["prankweb-failed"], _state["prankweb-failed"])
    report["statistics"] = _state["statistics"]
    report["updated"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _add_uniq(left: typing.List[str], right: typing.List[str]):
    left.extend([item for item in right if item not in left])


def _save_json(path: str, content):
    path_swp = path + ".swp"
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=False, indent=2)
    os.replace(path_swp, path)
