#!/usr/bin/env python3
import os

from .model import *


def prepare_output_p2rank(
        p2rank_output: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        configuration: Execution) -> ExecutionResult:
    for file in os.listdir(p2rank_output):
        source = os.path.join(p2rank_output, file)
        target = os.path.join(configuration.output_directory, file)
        os.rename(source, target)
    return ExecutionResult()
