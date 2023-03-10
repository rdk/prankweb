import os
import flask
import time
import json
import datetime
import dataclasses
import typing
import re
import werkzeug.utils

from .celery_client import submit_directory_for_sample_task

extensions = {
    ".json": "application/json",
    ".csv": "text/csv",
    ".zip": "application/zip",
}

@dataclasses.dataclass
class TaskInfo:
    # Directory with given task.
    directory: str
    # User identifier of given task.
    identifier: str
    # Data for given task.
    data: typing.Optional[dict] = None
    # Task numeric identifier.
    taskId: typing.Optional[int] = None

class SampleTask:
    
    def __init__(self, database_name: str):
        self.name = database_name
        self.root = os.path.join(self._get_sample_task_directory(), self.name)

    def get_file(self, identifier: str, file_name: str, param: str):
        directory = self._get_directory(identifier)
        if directory is None or not os.path.isdir(directory):
            return "", 404
    
        try:
            #we have to find the task id in the info file
            with open(os.path.join(directory, "info.json"), "r") as f:
                found = False
                fileData = json.load(f)
                for task in fileData["tasks"]:
                    if task["data"]["hash"] == param:
                        directory = os.path.join(directory, str(task["id"]))
                        found = True
                        break
                if not found: #could not find the task in the info file
                    return "", 404
        
        except OSError:
            return "", 404

        public_directory = os.path.join(directory, "public")
        file_name = self._secure_filename(file_name)
        file_path = os.path.join(public_directory, file_name)
        if os.path.isfile(file_path):
            return self._response_file(public_directory, file_name)
        return "", 404
    
    @staticmethod
    def _secure_filename(file_name: str) -> str:
        """Sanitize given file name."""
        return werkzeug.utils.secure_filename(file_name)

    def get_info_file(self, identifier: str, data: dict):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            #if the info file exists, we have to append the new info to the existing file
            taskinfo = TaskInfo(directory=directory, identifier=identifier, data=data)

            with open(os.path.join(directory, "info.json"), "r+") as f:
                fileData = json.load(f)
                taskinfo.taskId = len(fileData["tasks"])
                fileData["tasks"].append(_create_info(taskinfo))
                f.seek(0)
                f.write(json.dumps(fileData))
            
            submit_directory_for_sample_task(taskinfo.directory, taskinfo.taskId)
            return self._response_file(directory, "info.json")
        
        #else we create a new info file
        taskinfo = TaskInfo(directory=directory, identifier=identifier, data=data)

        return _create_sample_task_file(taskinfo)
    
    def get_all_tasks(self):
        pass
    
    def _get_directory(self, identifier: str) -> typing.Optional[str]:
        """Return directory for task with given identifier."""
        if not re.match("[_,\w]+", identifier):
            return None
        directory = identifier[1:3]
        return os.path.join(self.root, directory, identifier)
    
    def _response_file(self, directory: str, file_name: str, mimetype=None):
        if mimetype is None:
            mimetype = self._mime_type(file_name)
        return flask.send_from_directory(directory, file_name, mimetype=mimetype)

    def _get_sample_task_directory(self) -> str:
        dc = os.environ.get(
            "PRANKWEB_DATA_DOCKING",
            # For local development.
            os.path.join(os.path.dirname(os.path.realpath(__file__)),
                        "..", "..", "..", "data", "docking"))
        return dc
    
    @staticmethod
    def _mime_type(file_name: str) -> str:
        """Detect file mime type."""
        ext = file_name[file_name.rindex("."):]
        return extensions.get(ext, "text/plain")

def _info_file(taskinfo: TaskInfo) -> str:
    return os.path.join(taskinfo.directory, "info.json")

def _prepare_prediction_directory(taskinfo: TaskInfo):
    """Initialize content of a directory for given task."""
    taskinfo.taskId = 0
    info = _create_info(taskinfo)
    json_info_skeleton = {"tasks": [info], "identifier": taskinfo.identifier}
    _save_json(_info_file(taskinfo), json_info_skeleton)
    return info

def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)

def _create_info(taskinfo: TaskInfo):
    now = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "id": taskinfo.taskId,
        "created": now,
        "lastChange": now,
        "status": "queued",
        "data": taskinfo.data
    }

def _create_sample_task_file(taskinfo: TaskInfo, force=False):
    try:
        os.makedirs(taskinfo.directory, exist_ok=True)
    except OSError:
        if not force:
            return _prediction_can_not_be_created(taskinfo)
    info = _prepare_prediction_directory(taskinfo)
    submit_directory_for_sample_task(taskinfo.directory, taskinfo.taskId)
    return flask.make_response(flask.jsonify(info), 201)

def _prediction_can_not_be_created(taskinfo: TaskInfo):
    # Not the best, but it is possible that someone else created
    # the task before us, so we wait some time, so they can finish the
    # initialization.
    time.sleep(1)
    if os.path.isdir(taskinfo.directory) and \
            os.path.isfile(_info_file(taskinfo)):
        # Somebody else created the task.
        return flask.send_from_directory(
            taskinfo.directory, "info.json",
            mimetype="application/json")
    else:
        return "", 500
    
if __name__ == "__main__":
    pass