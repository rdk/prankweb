import os
import typing
import re
import flask
import werkzeug.utils
import abc

extensions = {
    ".json": "application/json",
    ".csv": "text/csv",
    ".zip": "application/zip",
}


class Database(metaclass=abc.ABCMeta):
    """Abstract class for database implementation."""

    @abc.abstractmethod
    def name(self) -> str:
        """Return database name in URL."""
        ...

    @abc.abstractmethod
    def get_info(self, identifier: str):
        ...

    @abc.abstractmethod
    def get_log(self, identifier: str):
        ...

    @abc.abstractmethod
    def get_file(self, identifier: str, file_name: str):
        ...

    @abc.abstractmethod
    def create(self, files):
        ...


class NestedReadOnlyDatabase(Database, metaclass=abc.ABCMeta):
    """Base implementation of read-only database."""

    def __init__(self):
        self.root = None

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None or not os.path.isdir(directory):
            return "", 404
        return self._response_file(directory, "info.json")

    def get_log(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None or not os.path.isdir(directory):
            return "", 404
        return self._response_file(directory, "log", "text/plain")

    def get_file(self, identifier: str, file_name: str):
        directory = self._get_directory(identifier)
        if directory is None or not os.path.isdir(directory):
            return "", 404
        public_directory = os.path.join(directory, "public")
        file_name = self._secure_filename(file_name)
        if not os.path.isfile(os.path.join(public_directory, file_name)):
            return "", 404
        return self._response_file(public_directory, file_name)

    @staticmethod
    def _secure_filename(file_name: str) -> str:
        """Sanitize given file name."""
        return werkzeug.utils.secure_filename(file_name)

    def create(self, files):
        return "", 403

    def _get_directory(self, identifier: str) -> typing.Optional[str]:
        """Return directory for task with given identifier."""
        if not re.match("[_,\w]+", identifier):
            return None
        directory = identifier[1:3]
        return os.path.join(self.root, directory, identifier)

    def _response_file(self, directory: str, file_name: str, mimetype=None):
        """Respond with given file."""
        if mimetype is None:
            mimetype = self._mime_type(file_name)
        return flask.send_from_directory(
            directory, file_name, mimetype=mimetype)

    @staticmethod
    def _mime_type(file_name: str) -> str:
        """Detect file mime type."""
        ext = file_name[file_name.rindex("."):]
        return extensions.get(ext, "text/plain")

    @staticmethod
    def _get_database_directory():
        """Provide access to global database directory."""
        return get_database_directory()


def get_database_directory() -> str:
    return os.environ.get(
        "PRANKWEB_DATA",
        # For local development.
        os.path.join(os.path.dirname(os.path.realpath(__file__)),
                     "..", "..", "data", "database")
    )
