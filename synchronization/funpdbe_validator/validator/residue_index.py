#!/usr/bin/env python3

"""
Copyright 2018 EMBL - European Bioinformatics Institute
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
either express or implied. See the License for the specific
language governing permissions and limitations under the
License.
"""

import json
import requests
import sys


class ResidueIndexes(object):
    """
    This class has all the methods required for validating the
    residue indices that are in the user submitted data.
    Each residue has an index number in the submitted JSON,
    and each has to match the indices in the official PDB entry
    This class relies on the PDBe API to get the current residue
    indices
    Example usage:
    check_indexes = ResidueIndexes(your_json_object)
    if check_indexes.check_every_residue():
        # all residues in every chain are correctly indexed
    """

    def __init__(self, data, mmcif_mode=False, cif_file=None):
        self.api_url = "https://www.ebi.ac.uk/pdbe/api/pdb/entry/residue_listing/"
        self.data = data
        self.pdb_id = self._set_pdb_id()
        self.mismatches = []
        self.labels = ["residues", "chains", "molecules"]
        self.mmcif_mode=mmcif_mode
        if self.mmcif_mode ==True :
            if cif_file ==None :

                print("Error! Please provide input mmcif file as mmcif_mode is 'True' or set mmcif_mode as 'False' to use PDBe API")
                sys.exit(1)
            else :
                self.cif_file=cif_file     

    def check_every_residue(self):
        """
        Looping through all the chains that are present
        in the JSON data
        :return: True if the residue numbering is valid, False if not
        """
        if not self.pdb_id:
            return False
        if self.mmcif_mode ==True : 
            print("Getting the residue data from mmcif file instead of PDBe API")
            self._get_mmcif_residue_list() 
        for chain_data in self.data["chains"]:
            if self.mmcif_mode ==True : 
                if not self._get_residue_numbering_from_mmcif(chain_data):
                    return False
            else :
                if not self._get_residue_numbering(chain_data):
                    return False
        return True

    def _set_pdb_id(self):
        """
        Sets the PDB id based on the JSON data
        :return: String, PDB id or None
        """
        if "pdb_id" in self.data.keys():
            return self.data["pdb_id"].lower()
        return None

    def _get_mmcif_residue_list(self) :
        
        """Get the list of residues from mmcif- in auth numbering to do residue check for json data 
         :returs a dictionary, where #key=chain, val= {k:auth_residue_number(withinscode),v:resname}
        """
        from gemmi import cif
        doc= cif.read(self.cif_file)
        block = doc.sole_block()
        polyseq=block.get_mmcif_category('_atom_site.')

        self.mmcif_data={} #key=chain, val= {k:auth_residue_number(withinscode),v:resname}
        for auth_resnum,auth_resname,inscode,chain in zip(polyseq["auth_seq_id"], 
                polyseq["auth_comp_id"],
                polyseq["pdbx_PDB_ins_code"],
                polyseq["auth_asym_id"]) :
            if inscode ==False or inscode ==None:
                inscode=""
            auth_residue_number="%s%s" %(auth_resnum,inscode)
            self.mmcif_data.setdefault(chain,{})[auth_residue_number]=auth_resname

    def _get_residue_numbering_from_mmcif(self, chain_data) :

        """Match the residues using mmcif file instead of PDBe API
        """
        match_flag=False
        chain_id = chain_data["chain_label"]
        if not "residues" in chain_data.keys():
            return False
        if chain_id not in self.mmcif_data :
            mismatch= "chain %s not found in mmcif" %chain_id 
            self.mismatches.append(mismatch)
            return False
        for residue in chain_data["residues"]:
            depositor_residue_number = residue["pdb_res_label"]
            depositor_aa_type = residue["aa_type"]
            if depositor_residue_number in self.mmcif_data[chain_id] :
                if self.mmcif_data[chain_id][depositor_residue_number] ==depositor_aa_type : 
                    #print(chain_id,depositor_residue_number, depositor_aa_type)
                    match_flag=True 
                else :
                    mismatch= "residue %s_%s (%s) in data does not match to %s residue in mmcif" %(chain_id,depositor_residue_number, depositor_aa_type,self.mmcif_data[chain_id][depositor_residue_number])
                    self.mismatches.append(mismatch)
            
            else  :
                mismatch= "residue %s_%s (%s) in data does not match to any residue in mmcif" %(chain_id,depositor_residue_number, depositor_aa_type)
                self.mismatches.append(mismatch)

        return match_flag

    def _get_residue_numbering(self, chain_data):
        """
        Gets the residue numbering from the PDBe API and
        checks all residues
        :param chain_data: JSON sub-data
        :return: True if residue numbering is valid, False if not
        """
        chain_id = chain_data["chain_label"]
        url = "%s%s/chain/%s" % (self.api_url, self.pdb_id, chain_id)
        try:
            response = requests.get(url)
        except:
            return False
        try:
            residue_numbering = json.loads(response.text)
        except:
            print("Failed to load residues from PDBe API")
            return False
        if not residue_numbering.keys():
            self.mismatches.append("No residues in PDB for this entry - probably obsoleted entry")
            return False
        return self._check_numbering(residue_numbering, chain_data, chain_id)

    def _check_numbering(self, residue_numbering, chain_data, chain_id):
        """
        This method loops through all the residues in a chain
        and call the residue index comparator method
        :param residue_numbering: JSON data from PDBe API
        :param chain_data: JSON data from user
        :return: True is residue numbering is valid, False if not
        """
        if not "residues" in chain_data.keys():
            return False
        for residue in chain_data["residues"]:
            depositor_residue_number = residue["pdb_res_label"]
            depositor_aa_type = residue["aa_type"]
            if not self._compare_residue_number(depositor_residue_number, depositor_aa_type, residue_numbering,
                                                chain_id):
                return False
        return True

    def _compare_residue_number(self, depositor_residue_number, depositor_aa_type, residue_numbering,
                                depositor_chain_id):
        """
        This method starts looping through the substructure of the PDBe API data
        :param depositor_residue_number: Residue number provided by the user
        :param depositor_aa_type: Residue amino acid code provided by user
        :param residue_numbering: Residue numbering provided by PDBe API
        :return: True is residue numbering is valid, False if not
        """
        molecules = residue_numbering[self.pdb_id]["molecules"]
        return self._recursive_loop(molecules, "chains", depositor_residue_number, depositor_aa_type,
                                    depositor_chain_id)

    def _recursive_loop(self, data, label, depositor_residue_number, depositor_aa_type, depositor_chain_id):
        """
        A recursive loop that goes down to residue level and processes all residues
        :param data: JSON data
        :param label: String, "chains" or "residues" depending on the level
        :param depositor_residue_number: Residue number provided by the user
        :param depositor_aa_type: Residue amino acid code provided by user
        :return: True is residue numbering is valid, False if not
        """
        flag = False
        for item in data:
            sub_data = item[label]
            if label == "chains":
                flag |= self._recursive_loop(sub_data, "residues", depositor_residue_number, depositor_aa_type,
                                            depositor_chain_id)
            elif label == "residues":
                return self._process_residues(sub_data, depositor_residue_number, depositor_aa_type, depositor_chain_id)

        if label == "chains":
            return flag

        if label == "residues":
            # We were checking residues and none was found, so not match found -> False.
            return False

    def _process_residues(self, residues, depositor_residue_number, depositor_aa_type, depositor_chain_id):
        """
        This method grabs the residue information and call the comparator if the
        residue number of PDBe is the same as the user input
        :param residues: Residue data from PDBe API
        :param depositor_residue_number: Residue number provided by the user
        :param depositor_aa_type: Residue amino acid code provided by user
        :return: True is residue numbering is valid, False if not
        """
        for residue in residues:          
            if "%i%s" % (
                    residue["author_residue_number"], residue["author_insertion_code"]) == depositor_residue_number:
                #print(depositor_residue_number,depositor_aa_type,residue["author_residue_number"], residue["author_insertion_code"])
                return self._make_comparison(residue["residue_name"], depositor_aa_type, depositor_residue_number,
                                             depositor_chain_id)
        self.mismatches.append(
            "residue numbering is completely mismatched between data and PDB entry (invalid residue: %s_%s)" % (
                depositor_chain_id, depositor_residue_number))
        return False

    def _make_comparison(self, residue_name, depositor_aa_type, depositor_residue_number, depositor_chain_id):
        """
        This method does the comparison between two residues that have the same index number
        The comparison is between amino acid code
        :param residue_name: Residue amino acid code provided by PDBe API
        :param depositor_aa_type: Residue amino acid code provided by user
        :param depositor_residue_number: Residue number provided by the user
        :return: True is residue numbering is valid, False if not
        """
        if residue_name.lower() == depositor_aa_type.lower():
            return True
        mismatch = "residue %s_%s (%s) in data does not match residue %s (%s) in PDB" % (
            depositor_chain_id, depositor_residue_number, depositor_aa_type, depositor_residue_number, residue_name)
        self.mismatches.append(mismatch)
        return False