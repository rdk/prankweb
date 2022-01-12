#!/usr/bin/env python3
import ftplib
import collections
import dataclasses

PdbeRecord = collections.namedtuple("PdbeRecord", ["code", "file"])


@dataclasses.dataclass
class Configuration:
    server: str
    username: str
    password: str


def upload_to_ftp(configuration: Configuration, code: str, file_path: str):
    with _create_ftp_client(configuration) as ftp:
        remote_path = f"{code[1:3]}/{code}.json"
        with open(file_path, "rb") as stream:
            ftp.storbinary(f"STOR {remote_path}", stream)


def _create_ftp_client(configuration: Configuration) -> ftplib.FTP:
    return ftplib.FTP(
        configuration.server,
        configuration.username,
        configuration.password
    )
