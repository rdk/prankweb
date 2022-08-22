import os
from .database import Database, NestedReadOnlyDatabase


class DatabaseV1(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v1")

    def name(self) -> str:
        return "v1"


class DatabaseV1Conservation(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v1-conservation")

    def name(self) -> str:
        return "v1-conservation"


def register_database_v1() -> list[Database]:
    v1 = DatabaseV1()
    os.makedirs(v1.root, exist_ok=True)
    v1_conservation = DatabaseV1Conservation()
    os.makedirs(v1_conservation.root, exist_ok=True)
    return [v1, v1_conservation]
