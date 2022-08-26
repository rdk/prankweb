#!/usr/bin/env python3
import os
import subprocess

BLASTDMAKEDB_CMD = os.environ.get("BLASTDMAKEDB_CMD", None)
BLAST_DATABASE = os.environ.get("BLAST_DATABASE", None)

URL_PREFIX = "https://prankweb.cz/www/conservation/2020_06/"

DATABASE_MAP = {
    "swissprot": URL_PREFIX + "uniprot_sprot.fasta.gz",
    "uniref50": URL_PREFIX + "uniref50.fasta.gz",
    "uniref90": URL_PREFIX + "uniref90.fasta.gz",
}


def main():
    if BLASTDMAKEDB_CMD is None:
        print("Can't create database as environment variable "
              "BLASTDMAKEDB_CMD is not set.")
        exit(1)
    if BLASTDMAKEDB_CMD is None:
        print("Can't create database as environment variable "
              "BLAST_DATABASE is not set.")
        exit(1)
    for name, url in DATABASE_MAP.items():
        prepare_database(name, url)


def prepare_database(name: str, url: str):
    print(f"Preparing database: {name} ...")
    path = os.path.join(BLAST_DATABASE, name)
    os.makedirs(path, exist_ok=True)
    command = f"curl {url} | gunzip |  {BLASTDMAKEDB_CMD} " \
              f"-out {path} -title {name} -dbtype prot -parse_seqids"
    execute_command(command)
    print(f"Preparing database: {name} ... done")


def execute_command(command: str):
    result = subprocess.run(command, shell=True, env=os.environ.copy())
    result.check_returncode()


if __name__ == "__main__":
    main()
