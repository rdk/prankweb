import os
import flask
import time
import json
import datetime
import dataclasses
import typing
import re

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

class SampleTask:
    
    def __init__(self):
        self.root = os.path.join(self._get_sample_task_directory(), self.name())

    def name(self) -> str:
        return "v3"

    def get_sample_task_file(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        
        taskinfo = TaskInfo(directory=directory, identifier=identifier)

        return _create_sample_task_file(taskinfo)
    
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
    info = _create_info_file(taskinfo)
    _save_json(_info_file(taskinfo), info)
    return info

def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)

def _create_info_file(taskinfo: TaskInfo):
    now = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "id": taskinfo.identifier,
        "created": now,
        "lastChange": now,
        "status": "queued"
    }

def _create_sample_task_file(taskinfo: TaskInfo, force=False):
    try:
        os.makedirs(taskinfo.directory, exist_ok=True)
    except OSError:
        if not force:
            return _prediction_can_not_be_created(taskinfo)
    info = _prepare_prediction_directory(taskinfo)
    submit_directory_for_sample_task(taskinfo.directory)
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