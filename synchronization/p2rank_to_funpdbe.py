#!/usr/bin/env python3
import os
import logging
import csv
import datetime
import json
import collections
import argparse
import dataclasses
import importlib

from funpdbe_validator.validator.validator import Validator
from funpdbe_validator.validator.residue_index import ResidueIndexes

logger = logging.getLogger("prankweb.pdbe")
logger.setLevel(logging.DEBUG)


@dataclasses.dataclass
class Configuration:
    data_resource: str
    resource_version: str
    release_day: str
    url_template: str
    p2rank_version: str


ResidueRef = collections.namedtuple("ResidueReference", ["chain", "index"])


def convert_p2rank_to_pdbe(
        configuration: Configuration,
        pdb_id: str,
        predictions_path: str,
        residues_path: str,
        output_path: str):
    residues = _read_residues(residues_path)
    pockets = _read_predictions(predictions_path)

    sites = []
    chains_dictionary = {}

    for pocket in pockets:
        site = _create_site(pocket)
        sites.append(site)
        for residue in _iterate_site_residues(
                pocket, residues, site["site_id"]):
            _add_residue_to_chains(residue, chains_dictionary)
    chains = _flat_chains_dictionary(chains_dictionary)

    content = _create_output_file(configuration, pdb_id, sites, chains)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as out_stream:
        json.dump(content, out_stream, indent=2)

    validate_file(configuration.data_resource, output_path)


def _read_residues(residues_path):
    # chain, residue_label, residue_name, score, zscore, probability, pocket
    return [{
        "chains": row["chain"],
        "type": row["residue_name"],
        "label": row["residue_label"],
        "score": float(row["score"]),
        "probability": float(row["probability"]),
        "pocket": row["pocket"]
    } for row in _iterate_csv_file(residues_path)]


def _iterate_csv_file(path):
    with open(path) as stream:
        csv_reader = csv.reader(stream, delimiter=",", skipinitialspace=True)
        header = [key.rstrip() for key in next(csv_reader)]
        for row in csv_reader:
            yield {key: value.rstrip() for key, value in zip(header, row)}


def _read_predictions(predictions_path):
    # name, rank, score, sas_points, surf_atoms,
    # center_x, center_y, center_z,
    # residue_ids, surf_atom_ids
    return [{
        "name": row["name"],
        "score": row["score"],
        "rank": row["rank"],
        "center_x": row["center_x"],
        "center_y": row["center_y"],
        "center_z": row["center_z"],
        "residues": [
            ResidueRef(*item.split("_"))
            for item in row["residue_ids"].split(" ")
        ]
    } for row in _iterate_csv_file(predictions_path)]


def _create_site(pocket):
    site = {
        "site_id": int(pocket["name"].replace("pocket", "")),
        "label": pocket["name"],
        "additional_site_annotations": {
            "score": pocket["score"],
            "center": {
                "x": pocket["center_x"],
                "y": pocket["center_y"],
                "z": pocket["center_z"]
            }
        }
    }
    return site


def _iterate_site_residues(pocket, residues, site_id):
    for residue in residues:
        residue_ref = ResidueRef(residue["chains"], residue["label"])
        if residue_ref in pocket["residues"]:
            yield _residue_to_site_data(residue, site_id)


def _residue_to_site_data(residue, site_id):
    confidence_class = _probability_to_confidence_class(residue["probability"])
    return {
        "chain": residue["chains"],
        "res": residue["label"],
        "aa": residue["type"],
        "site_data": {
            "site_id_ref": site_id,
            "confidence_score": residue["probability"],
            "confidence_classification": confidence_class,
            "raw_score": residue["score"],
        }
    }


def _probability_to_confidence_class(probability):
    if probability < 0.33:
        return "low"
    elif probability < 0.6:
        return "medium"
    elif probability <= 1.0:
        return "high"
    else:
        raise RuntimeError("Unexpected probability: {}".format(probability))


def _add_residue_to_chains(residue, chains_dictionary):
    if residue["chain"] not in chains_dictionary:
        chains_dictionary[residue["chain"]] = {}
    chain_residues = chains_dictionary[residue["chain"]]

    residue_key = (residue["res"], residue["aa"])
    if residue_key not in chain_residues:
        chain_residues[residue_key] = {
            "pdb_res_label": residue["res"],
            "aa_type": residue["aa"],
            "site_data": []
        }
    chain_residues[residue_key]["site_data"].append(residue["site_data"])


def _flat_chains_dictionary(chains_dictionary):
    return [{
        "chain_label": chain_label,
        "residues": list(residues.values())
    } for chain_label, residues in chains_dictionary.items()]


def _create_output_file(
        configuration: Configuration,
        pdb_id: str, sites, chains):
    return {
        "data_resource": configuration.data_resource,
        "resource_version": configuration.resource_version,
        "software_version": configuration.p2rank_version,
        "resource_entry_url": configuration.url_template.format(pdb_id.upper()),
        "release_date": configuration.release_day,
        "pdb_id": pdb_id.lower(),
        "chains": chains,
        "sites": sites,
        "evidence_code_ontology": [
            {
                "eco_term": "computational combinatorial evidence",
                "eco_code": "ECO_0000246"
            }
        ]
    }


def validate_file(data_resource: str, pdbe_file: str):
    validator = Validator(data_resource)
    validator.load_schema()
    validator.load_json(pdbe_file)
    if not validator.basic_checks():
        logger.error(validator.error_log)
        raise RuntimeError("Basic checks failed for {}:".format(pdbe_file))
    if not validator.validate_against_schema():
        logger.error(validator.error_log)
        raise RuntimeError("Invalid schema for {}".format(pdbe_file))
    residue_indexes = ResidueIndexes(validator.json_data)
    if not residue_indexes.check_every_residue():
        logger.error(residue_indexes.mismatches)
        raise RuntimeError("Invalid residues: {}".format(pdbe_file))
