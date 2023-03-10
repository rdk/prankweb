#!/usr/bin/env python3
#
# Run a sample task.
#
import os
import sys
import datetime
import enum
import json

class Status(enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    SUCCESSFUL = "successful"

def _load_json(path: str):
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)

def _save_status_file(path: str, status: any):
    now = datetime.datetime.today()
    status["lastChange"] = now.strftime('%Y-%m-%dT%H:%M:%S')
    _save_json(path, status)


def _save_json(path: str, content: any):
    path_swp = path + ".swp"
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)
    os.replace(path_swp, path)

def get_prediction_path(docking_directory: str):
    #currently assuming that the docking and predictions paths are different just by the name
    return os.path.join(str.replace(docking_directory, "docking", "predictions"), "public", "prediction.json")

def execute_directory_task(directory: str):
    #print(os.listdir(os.path.join(directory, "..", "..", "..", "..")))
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return
    #first update the status file
    status_file = os.path.join(directory, "info.json")
    status = _load_json(status_file)

    status["status"] = Status.RUNNING.value
    _save_status_file(status_file, status)

    #then load the prediction file
    pred_path = get_prediction_path(directory)
    prediction = _load_json(pred_path)

    #parse the prediction file and do some calculations
    obj = []
    for pocket in prediction["pockets"]:
        obj.append({
            "rank": pocket["rank"],
            "count": len(pocket["residues"])
        })
    
    final_obj = json.dumps(obj)

    #save the result file
    os.makedirs(os.path.join(directory, "public"), exist_ok=True)
    result_file = os.path.join(directory, "public", "result.json")

    with open(result_file, "w", encoding="utf-8") as stream:
        try:
            stream.write(final_obj)
        finally:
            stream.flush()
    
    #update the status file
    status["status"] = Status.SUCCESSFUL.value
    _save_status_file(status_file, status)

    """
    log_file = os.path.join(directory, "logTest")
    with open(log_file, "w", encoding="utf-8") as stream:
        try:
            stream.write(f"Starting task at {datetime.datetime.now()}")
            stream.write(f"Directory: {directory}")
            stream.write(f"Prediction: {prediction}")
        finally:
            stream.flush()
    """

def main(arguments):
    pass

if __name__ == "__main__":
    main(sys.argv[1:])
