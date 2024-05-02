#!/bin/bash


file=$1
parent_out_dir=$2

file_basename="${file##*/}"
out_dir="${parent_out_dir}/${file_basename}"

echo processing $file
echo outdir: $out_dir

rm -rf $out_dir

/opt/executor-p2rank/run_p2rank.py --file $file \
    --output $out_dir \
    --working $out_dir \
    --conservation --keep-working

