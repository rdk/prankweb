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
class Prediction:
    # Directory with given prediction task.
    directory: str
    # User identifier of given task.
    identifier: str
    # Name of a database.
    database: str
    # Name of a conservation to compute.
    conservation: str
    # If true structure is not modified before predictions.
    structure_sealed: bool
    # Configuration file for p2rank.
    p2rank_configuration: str
    # Additional metadata to save to info file.
    metadata: typing.Dict
    # Identification of experimental structure.
    structure_code: typing.Optional[str] = None
    # File with user provided structure.
    structure_file: typing.Optional[str] = None
    # Identification of predicted structure.
    uniprot_code: typing.Optional[str] = None
    # Restriction to given chains.
    chains: typing.Optional[list[str]] = None

class SampleTask:
    
    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_sample_task_directory(),
            "v3")

    def name(self) -> str:
        return "v3"

    def get_sample_task_file(self, identifier: str):

        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        prediction = Prediction(
            directory=directory,
            identifier=identifier,
            database=self.name(),
            structure_sealed=True,
            p2rank_configuration="alphafold",
            uniprot_code=identifier,
            conservation="none",
            metadata={
                "predictedStructure": True
            },
        )
        return _create_sample_task_file(prediction)
    
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

def _info_file(prediction: Prediction) -> str:
    return os.path.join(prediction.directory, "info.json")

def _prepare_prediction_directory(prediction: Prediction):
    """Initialize content of a directory for given task."""
    info = _create_info_file(prediction)
    _save_json(_info_file(prediction), info)
    input_directory = os.path.join(prediction.directory, "input")
    os.makedirs(input_directory, exist_ok=True)
    _save_json(
        os.path.join(input_directory, "configuration.json"),
        {
            "p2rank_configuration": prediction.p2rank_configuration,
            "structure_file": prediction.structure_file,
            "structure_code": prediction.structure_code,
            "structure_sealed": prediction.structure_sealed,
            "structure_uniprot": prediction.uniprot_code,
            "conservation": prediction.conservation,
            "chains": prediction.chains,
        })
    return info

def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)


def _create_info_file(prediction: Prediction):
    now = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "id": prediction.identifier,
        "database": prediction.database,
        "created": now,
        "lastChange": now,
        "status": "queued",
        "metadata": prediction.metadata,
    }

def _create_sample_task_file(prediction: Prediction, force=False):
    try:
        os.makedirs(prediction.directory, exist_ok=True)
    except OSError:
        if not force:
            return _prediction_can_not_be_created(prediction)
    info = _prepare_prediction_directory(prediction)
    submit_directory_for_sample_task(prediction.directory)
    return flask.make_response(flask.jsonify(info), 201)

def _prediction_can_not_be_created(prediction: Prediction):
    # Not the best, but it is possible that someone else created
    # the task before us, so we wait some time, so they can finish the
    # initialization.
    time.sleep(1)
    if os.path.isdir(prediction.directory) and \
            os.path.isfile(_info_file(prediction)):
        # Somebody else created the task.
        return flask.send_from_directory(
            prediction.directory, "info.json",
            mimetype="application/json")
    else:
        return "", 500
    
if __name__ == "__main__":
    pass