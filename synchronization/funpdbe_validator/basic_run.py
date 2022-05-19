import sys
import glob
from validator.validator import Validator
from validator.residue_index import ResidueIndexes


def run(resource_name, json_path, mmcif_mode=False, cif_file =None):
    """
    Basic example of running the PDBe-KB/FunPDBe validator
    :return: None
    """
    validator = Validator(resource_name) # Same as in the JSON
    validator.load_schema()
    for json_file_path in glob.glob('%s*.json' % json_path):
        validator.load_json(json_file_path)
        if validator.basic_checks() and validator.validate_against_schema():
            print("Passed data validations for %s" % json_file_path)
            residue_indexes = ResidueIndexes(validator.json_data,mmcif_mode,cif_file)
            if residue_indexes.check_every_residue():
                print("Passed the index validation for %s" % json_file_path)
            else:
                print("Failed index validation for %s: %s" % (json_file_path, residue_indexes.mismatches))
        else:
            print("Failed data validations for %s: %s" % (json_file_path, validator.error_log))


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])