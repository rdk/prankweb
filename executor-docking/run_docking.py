#!/usr/bin/env python3

import os
import json
import subprocess
import gzip
import shutil

import rdkit
import meeko

"""
This method will prepare the ligand from the SMILES string for docking and writes the PDBQT result to the given file.
"""
def prepare_ligand(inputFile: str, ligandFile: str):
    smiles = ""
    with open(inputFile) as inp:
        input_json = json.load(inp)
        smiles = input_json['hash']
    lig = rdkit.Chem.MolFromSmiles(smiles)
    protonated_lig = rdkit.Chem.AddHs(lig)
    rdkit.Chem.AllChem.EmbedMolecule(protonated_lig,randomSeed=0xf00d,useRandomCoords=True)

    meeko_prep = meeko.MoleculePreparation()
    meeko_prep.prepare(protonated_lig)
    lig_pdbqt = meeko_prep.write_pdbqt_string()

    with open(ligandFile, "w") as f:
        f.write(lig_pdbqt)

"""
This method creates a configuration file for the docking program AutoDock Vina from the bounding box data in the input file.
"""
def prepare_bounding_box(inputFile: str, boxFile: str):
    with open(boxFile, "w") as f, open(inputFile) as inp:
        input_json = json.load(inp)
        f.write(f"center_x = {input_json['bounding_box']['center']['x']}\n")
        f.write(f"center_y = {input_json['bounding_box']['center']['y']}\n")
        f.write(f"center_z = {input_json['bounding_box']['center']['z']}\n")

        f.write(f"size_x = {input_json['bounding_box']['size']['x']}\n")
        f.write(f"size_y = {input_json['bounding_box']['size']['y']}\n")
        f.write(f"size_z = {input_json['bounding_box']['size']['z']}\n")

"""
This method tries to dock the given ligand to the given receptor using AutoDock Vina.
"""
def dock_molecule(inputFile: str, structureFileGzip: str, task_directory: str):
    # unzip the pdb/mmCIF file
    extension = structureFileGzip.split(".")[-2]
    structureFile = os.path.join(task_directory, "structure." + extension)

    with gzip.open(structureFileGzip, 'rb') as f_in:
        with open(structureFile, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    # clean pdb using lePro tool, does not apply to mmCIF files
    if structureFile.endswith(".pdb"):
        subprocess.run(["lepro_linux_x86", structureFile])
        os.remove(structureFile)
        shutil.move(os.path.join(os.getcwd(), "pro.pdb"), structureFile) # Output from lepro is pro.pdb

    receptor_name = structureFile.replace(extension, "_receptor.pdbqt")

    # prepare receptor using prepare_receptor tool from ADFR suite
    subprocess.run(["prepare_receptor", "-r", structureFile, "-o", receptor_name])

    ligandFile = structureFile.replace(extension, "_ligand.pdbqt")

    prepare_ligand(inputFile, ligandFile)

    boxFile = structureFile.replace(extension, "_receptor_vina_box.txt")

    prepare_bounding_box(inputFile, boxFile)

    logFile = structureFile.replace(extension, "_log_vina.txt")
    outFile = os.path.join(task_directory, "public", "out_vina.pdbqt")
    os.makedirs(os.path.dirname(outFile), exist_ok=True)

    # docking
    subprocess.run(["vina", "--receptor", receptor_name, "--ligand", ligandFile, "--config", boxFile, "--exhaustiveness=32", "--log", logFile, "--out", outFile])

if __name__ == "__main__":
    pass