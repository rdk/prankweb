#!/usr/bin/env python3
#
# Run a sample task.
#
import os
import sys
import datetime
import enum
import json
import time

"""
A class to represent a task status. 
Notice that those values are written to the info.json file that is used by the frontend,
so any changes here should be reflected in the frontend as well.
"""
class Status(enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    SUCCESSFUL = "successful"

"""
Method to load a json file from a given path.
"""
def _load_json(path: str):
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)

"""
Method to save the status file. It will update the lastChange field with the current time.
"""
def _save_status_file(path: str, status: any, taskId: int):
    now = datetime.datetime.today()
    status["tasks"][taskId]["lastChange"] = now.strftime('%Y-%m-%dT%H:%M:%S')
    _save_json(path, status)

"""
Method to save a json file to a given path.
"""
def _save_json(path: str, content: any):
    path_swp = path + ".swp"
    if(os.path.exists(path_swp)):
        time.sleep(1)
    with open(path_swp, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)
    os.replace(path_swp, path)

"""
Method to get the path to the prediction file from the docking directory.
"""
def get_prediction_path(docking_directory: str):
    #currently assuming that the docking and predictions paths are different just by the name
    return os.path.join(str.replace(docking_directory, "docking", "predictions"), "public", "prediction.json")

"""
Method to execute a task for a given directory and a given taskId.
"""
def execute_directory_task(directory: str, taskId: int):
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return
    
    #first update the status file
    status_file = os.path.join(directory, "info.json")
    status = _load_json(status_file)

    status["tasks"][taskId]["status"] = Status.RUNNING.value
    _save_status_file(status_file, status, taskId)

    #then load the prediction file
    prediction = _load_json(get_prediction_path(directory))

    #parse the prediction file and do some calculations - in this case just counting the number of residues per pocket
    result = []
    for pocket in prediction["pockets"]:
        result.append({
            "rank": pocket["rank"],
            "count": len(pocket["residues"])
        })
    
    result_json = json.dumps(result)

    #save the result file
    os.makedirs(os.path.join(directory, str(taskId), "public"), exist_ok=True)
    result_file = os.path.join(directory, str(taskId), "public", "result.json")

    with open(result_file, "w", encoding="utf-8") as stream:
        try:
            stream.write(result_json)
        finally:
            stream.flush()
    
    #update the status file, reload it first to make sure we don't overwrite any changes
    status = _load_json(status_file)
    
    status["tasks"][taskId]["status"] = Status.SUCCESSFUL.value
    _save_status_file(status_file, status, taskId)

"""
Default main method.
"""
def main(arguments):
    pass

if __name__ == "__main__":
    main(sys.argv[1:])
