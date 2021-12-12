import os
import datetime
import json
import typing
import flask
import dataclasses
import time
import uuid
import re
from .database import Database, NestedReadOnlyDatabase
from .submission import submit_directory_for_execution


@dataclasses.dataclass
class Prediction:
    directory: str
    identifier: str
    database: str
    pdb_code: typing.Optional[str]
    chains: list[str]
    conservation: bool
    structure_file: typing.Optional[str] = None
    structure_sealed: typing.Optional[bool] = None


class DatabaseV3(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03")

    def name(self) -> str:
        return "v3"

    def create(self, files):
        # Post is not supported.
        return super().create(files)

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if not os.path.exists(directory):
            pdb_code, chains = _parser_identifier(identifier)
            prediction = Prediction(
                directory, identifier, self.name(),
                pdb_code, chains, conservation=False
            )
            return _create_new_prediction(prediction)
        return self._response_file(directory, "info.json")


def _parser_identifier(identifier: str):
    """2SRC_A,B into 2SRC, [A,B]"""
    if "_" not in identifier:
        return identifier, []
    code, chains = identifier.split("_")
    return code.upper(), [chain.upper() for chain in chains.split(",")]


def _create_new_prediction(prediction: Prediction, force=False):
    try:
        os.makedirs(prediction.directory, exist_ok=True)
    except OSError:
        if not force:
            return _prediction_can_not_be_created(prediction)
    info = _prepare_prediction_directory(prediction)
    submit_directory_for_execution(prediction.directory)
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


def _info_file(prediction: Prediction) -> str:
    return os.path.join(prediction.directory, "info.json")


def _prepare_prediction_directory(prediction: Prediction):
    """Initialize content of a directory for given task."""
    info = _create_info_file(
        prediction.identifier,
        prediction.database,
        _create_download_name(prediction))
    _save_json(_info_file(prediction), info)
    input_directory = os.path.join(prediction.directory, "input")
    os.makedirs(input_directory, exist_ok=True)
    _save_json(
        os.path.join(input_directory, "configuration.json"),
        {
            "structure": {
                "code": prediction.pdb_code,
                "chains": prediction.chains,
                "sealed":
                    prediction.structure_sealed
                    if prediction.structure_sealed is not None
                    else len(prediction.chains) == 0,
                "file": prediction.structure_file
            },
            "conservation": {
                "compute": prediction.conservation,
            },
        })
    return info


def _create_download_name(prediction: Prediction) -> typing.Optional[str]:
    if prediction.structure_file is not None:
        result = prediction.structure_file
        if "." in result:
            result = result[:result.rindex(".")]
        result += "-p2rank.zip"
        return result
    if prediction.pdb_code is not None:
        result = prediction.pdb_code
        if prediction.chains:
            result += "_" + ",".join(prediction.chains)
        result += "-p2rank.zip"
        return result
    return None


def _create_info_file(identifier: str, database: str, download_name):
    now = datetime.datetime.today().strftime('%Y-%m-%dT%H:%M:%S')
    return {
        "id": identifier,
        "database": database,
        "created": now,
        "lastChange": now,
        "status": "queued",
        "downloadName": download_name,
    }


def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)


class DatabaseV3ConservationHmm(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-conservation-hmm")

    def name(self) -> str:
        return "v3-conservation-hmm"

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if not os.path.exists(directory):
            pdb_code, chains = _parser_identifier(identifier)
            prediction = Prediction(
                directory, identifier, self.name(),
                pdb_code, chains, conservation=True
            )
            return _create_new_prediction(prediction)
        return self._response_file(directory, "info.json")


class DatabaseV3UserUpload(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-user-upload")

    def name(self) -> str:
        return "v3-user-upload"

    def create(self, files):
        if "configuration" not in files or "structure" not in files:
            return "", 400
        identifier = _create_identifier()
        user_configuration = json.load(files["configuration"])
        structure_name = self._secure_filename(files["structure"].filename)
        prediction = _configuration_to_prediction(
            self.root, identifier, self.name(),
            user_configuration, structure_name)
        os.makedirs(prediction.directory)
        info = _prepare_prediction_directory(prediction)
        public_directory = os.path.join(prediction.directory, "public")
        os.makedirs(public_directory)
        structure_path = os.path.join(public_directory, structure_name)
        files["structure"].save(structure_path)
        submit_directory_for_execution(prediction.directory)
        return flask.make_response(flask.jsonify(info), 201)

    def _get_directory(self, identifier: str) -> typing.Optional[str]:
        """Return directory for task with given identifier."""
        if not re.match("[\-_,\w]+", identifier):
            return None
        return os.path.join(self.root, identifier)


def _create_identifier():
    today = datetime.datetime.today().strftime('%Y-%m-%d-%H-%M-%S')
    return today + "-" + str(uuid.uuid4())


def _configuration_to_prediction(
        root_directory: str, identifier: str, database: str,
        user_configuration, structure_file: str):
    chains = list({
        chain.upper()
        for chain in user_configuration.get("chains", [])
    })
    return Prediction(
        os.path.join(root_directory, identifier),
        identifier,
        database,
        pdb_code=None,
        chains=chains,
        conservation=user_configuration.get("compute-conservation", False),
        structure_file=structure_file,
        structure_sealed=user_configuration.get(
            "structure-sealed", len(chains) == 0),
    )


def register_database_v3() -> list[Database]:
    v3 = DatabaseV3()
    os.makedirs(v3.root, exist_ok=True)
    v3_conservation_hmm = DatabaseV3ConservationHmm()
    os.makedirs(v3_conservation_hmm.root, exist_ok=True)
    v3_user_upload = DatabaseV3UserUpload()
    os.makedirs(v3_user_upload.root, exist_ok=True)
    return [v3, v3_conservation_hmm, v3_user_upload]
