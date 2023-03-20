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
    database_file = os.path.dirname(HMM_SEQUENCE_FILE)
    prepare_database(database_file)


def prepare_database(database_file: str):
    print(f"Preparing database to '{database_file}' ...")
    os.makedirs(database_file, exist_ok=True)
    print("This process may take a while.")
    tmp_file_name = "uniref50.fasta.zip"
    print("Downloading file ...")
    execute_command(database_file, f'wget "{URL}" -O {tmp_file_name}')
    print("Unpacking file ...")
    unzip_file(os.path.join(database_file, tmp_file_name), database_file)
    os.remove(os.path.join(database_file, tmp_file_name))
    print(f"Preparing database to '{database_file}' ... done")


def execute_command(cwd: str, command: str):
    result = subprocess.run(
        command,
        shell=True,
        env=os.environ.copy(),
        cwd=cwd)
    result.check_returncode()


def unzip_file(zip_file: str, target_file: str):
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall(target_file)


if __name__ == "__main__":
    main()
