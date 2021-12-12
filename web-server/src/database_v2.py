import os
from .database import Database, NestedReadOnlyDatabase


class DatabaseV2(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v02")

    def name(self) -> str:
        return "v2"


class DatabaseV2Conservation(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v02-conservation")

    def name(self) -> str:
        return "v2-conservation"


def register_database_v2() -> list[Database]:
    v2 = DatabaseV2()
    os.makedirs(v2.root, exist_ok=True)
    v2_conservation = DatabaseV2Conservation()
    os.makedirs(v2_conservation.root, exist_ok=True)
    return [v2, v2_conservation]
