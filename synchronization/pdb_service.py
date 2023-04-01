#!/usr/bin/env python3
import requests
import collections
import logging
import typing
import time

PdbRecord = collections.namedtuple("PdbRecord", ["code", "release"])

logger = logging.getLogger("pdb")
logger.setLevel(logging.DEBUG)


def get_deposited_from(date: typing.Optional[str]) -> typing.List[PdbRecord]:
    logger.info("Fetching number of new entries")
    response_with_count = _fetch_json(_create_pdb_solr_count_query(date))
    if response_with_count is None:
        logger.error("Can't get number of entries.")
        return []
    rows = response_with_count["grouped"]["pdb_id"]["ngroups"]
    result = []
    logger.info(f"Total number entries to fetch: {rows}")
    for offset in range(0, rows, 300):
        limit = min(rows, offset + 300)
        logger.info(f"Fetching entries {offset} - {limit}")
        response_with_data = _fetch_json(
            _create_pdb_solr_query(date, offset, limit))
        if response_with_data is None:
            logger.error("Can't fetch entries terminating download.")
            return result
        for item in response_with_data["grouped"]["pdb_id"]["doclist"]["docs"]:
            result.append(PdbRecord(
                item["pdb_id"].upper(),
                item["release_date"]
            ))
    logger.info(f"Total number entries: {len(result)}")
    return result


def _create_pdb_solr_count_query(date: typing.Optional[str]) -> str:
    query = "q=*:*"
    if date is not None:
        query = f"q=release_date:[{date} TO *]"
    #  Use fl=..,revision_date to add revision date
    return "https://www.ebi.ac.uk/pdbe/search/pdb/select?" \
           "group=true&" \
           "group.ngroups=true&" \
           "group.field=pdb_id&" \
           "fl=pdb_id,release_date&" \
           f"{query}&rows=0&wjt=json"


def _create_pdb_solr_query(
        date: typing.Optional[str], offset: int, limit: int) -> str:
    query = "q=*:*"
    if date is not None:
        query = f"q=release_date:[{date} TO *]"
    return "https://www.ebi.ac.uk/pdbe/search/pdb/select?" \
           "group=true&" \
           "group.ngroups=true&" \
           "group.field=pdb_id&" \
           "fl=pdb_id,release_date&" \
           f"{query}&start={offset}&rows={limit}&wjt=json&" \
           f"group.format=simple&sort=release_date%20asc"


def _fetch_json(url: str):
    # Sleep to give PDB some time.
    time.sleep(3)
    response = requests.get(url)
    if 199 < response.status_code < 299:
        return response.json()
    else:
        return None
