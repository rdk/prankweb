#!/usr/bin/env python3
import os
import subprocess
import zipfile

HMM_SEQUENCE_FILE = os.environ.get("HMM_SEQUENCE_FILE", None)

URL = "https://prankweb.cz/www/conservation/2021_03/uniref50.fasta.zip"


def main():
    if HMM_SEQUENCE_FILE is None:
        print("Can't create database as environment variable "
              "HMM_SEQUENCE_FILE is not set.")
        exit(1)
    directory = os.path.dirname(HMM_SEQUENCE_FILE)
    prepare_database(directory)
    ...
    # ENV SEQUENCE_FILE="/data/conservation/hmm-based/uniref50.fasta"


def prepare_database(directory: str):
    print(f"Preparing database to '{directory}' ...")
    tmp_file_name = "uniref50.fasta.zip"
    execute_command(directory, f'wget "{URL}" -O {tmp_file_name}')
    unzip_file(os.path.join(directory, tmp_file_name), directory)
    os.remove(tmp_file_name)
    print(f"Preparing database to '{directory}' ... done")


def execute_command(cwd: str, command: str):
    result = subprocess.run(
        command,
        shell=True,
        env=os.environ.copy(),
        cwd=cwd)
    result.check_returncode()


def unzip_file(zip_file: str, destination: str):
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall(destination)


if __name__ == "__main__":
    main()
