#!/bin/bash

n_proc=$1
input_dir=$2
output_dir=$3

n=`find $input_dir -name "*.pdb" | wc -l`

echo "processing $n files"

mkdir -p $output_dir


find $input_dir -name "*.pdb" | xargs -P ${n_proc} -I{} ./rdk_run_p2rank.sh {} $output_dir


echo "processed $n files"
echo "output_dir: $output_dir"
echo Done.
