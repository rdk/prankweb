# hmm based conservation

## About
`conservation_hmm_based.py` is a Python script which can be used to calculate per-position information content (IC) values for amino acid residues in a FASTA file. 
It is inspired by the [INTAA-conservation](https://github.com/davidjakubec/INTAA-conservation) pipeline utilized by the [Amino Acid Interactions (INTAA) web server](https://bioinfo.uochb.cas.cz/INTAA/). 
Unlike INTAA-conservation, `conservation_hmm_based.py` skips parsing the PDB structure and works with the single-sequence FASTA files directly. 
For further information on the pipeline's logic, please refer to the [INTAA manual](https://ip-78-128-251-188.flt.cloud.muni.cz/energy/doc/manual2.html#Calculation_of_information_content).

### Requirements
The [HMMER](http://hmmer.org/) software package, including the Easel tools, must be installed and the programs must be available in `$PATH`; alternatively, the location of the HMMER programs can be specified using the `HMMER_DIR` environment variable.
All development and testing is done using HMMER 3.3.2.

The example sequence database can be downloaded using following command:
```
wget https://ftp.expasy.org/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.fasta.gz
gunzip uniprot_sprot.fasta.gz
```
Please keep in mind that this command will download the sequence database into current directory, so you need to navigate to proper directory first. 

## Usage
For information how to use please see run 
```
python .\conservation_hmm_based.py -h
```

### Output
The `target_file` will contain a list of tab-separated triples \(index, IC, amino\_acid\_residue\) for the amino acid residues in the `FASTA_file`, where index is simply a number starting from zero \(0\) for the first residue. 
One triple is provided per line.

In addition, a `target_file.freqgap` file will be produced, utilizing the same formatting as `target_file`, but containing the frequencies of the gap \(-\) character in the respective MSA columns instead of the per-position IC values.

If no MSA can be generated for the input `FASTA_file` \(*e.g.*, when it contains a synthetic sequence\), `target_file` and `target_file.freqgap` will contain the value of -1000.0 for their respective per-residue properties.
