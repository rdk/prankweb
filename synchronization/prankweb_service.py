#!/usr/bin/env python3
import requests
import logging
import typing
import dataclasses
import time


@dataclasses.dataclass
class PrankWebResponse:
    status: int
    body: typing.Dict


logger = logging.getLogger("prankweb")
logger.setLevel(logging.DEBUG)


def retrieve_info(server: str, pdb_code: str) -> PrankWebResponse:
    # Sleep to give prankweb some time.
    time.sleep(2)
    url = f"{server}/api/v2/prediction/{database()}/{pdb_code}"
    try:
        response = requests.get(url)
    except:
        return PrankWebResponse(-1, {})
    return PrankWebResponse(response.status_code, response.json())


def database() -> str:
    return "v3-conservation-hmm"


def retrieve_archive(server: str, pdb_code: str, destination: str):
    url = f"{server}/api/v2/prediction/{database()}/{pdb_code}/" \
          f"public/prankweb.zip"
    response = requests.get(url)
    if not 199 < response.status_code < 299:
        raise RuntimeError(f"Invalid response code: '{response.status_code}'")
    open(destination, "wb").write(response.content)


def prediction_url_template(server: str) -> str:
    return f"{server}/analyze/?database={database()}&code=" + "{}"
