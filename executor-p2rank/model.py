import typing
import enum
from dataclasses import dataclass, field


class ConservationType(enum.Enum):
    ALIGNMENT = "alignment"
    HMM = "hmm"
    NONE = "none"


class OutputType(enum.Enum):
    PRANKWEB = "prankweb"
    P2RANK = "p2rank"


class P2rankConfigurations(enum.Enum):
    DEFAULT = "default"
    HMM = "conservation_hmm"
    ALPHAFOLD = "alphafold"
    ALPHAFOLD_HMM = "alphafold_conservation_hmm"


@dataclass
class Execution:
    # Path to p2rank executable script.
    p2rank: str
    # Path to protein-utils
    java_tools: str
    # Path to the working directory.
    working_directory: str
    # Path to the output directory.
    output_directory: str
    # Output type, determine output files.
    output_type: OutputType
    # Used for standard output
    stdout: typing.TextIO
    # Used for error output
    stderr: typing.TextIO
    # Name of a model to use for predictions.
    p2rank_configuration: str
    # PDB structure code.
    structure_code: typing.Optional[str] = None
    # Absolute path to input structure file.
    structure_file: typing.Optional[str] = None
    # Uniprot structure code.
    structure_uniprot: typing.Optional[str] = None
    # If true the input structure is used without change.
    structure_sealed: bool = False
    # Allow filtering of chains. Leave empty to use all.
    chains: typing.List[str] = field(default_factory=list)
    # Selected configuration pipeline.
    conservation: ConservationType = ConservationType.NONE
    # Optional, shell execution function.
    execute_command: typing.Optional[typing.Callable] = None
    # If true and files produced by external command, the command is not
    # executed.
    lazy_execution: bool = False
    # For internal use, represent structure type using extension
    structure_extension = ""


@dataclass
class ExecutionResult:
    # Output structure file.
    output_structure_file: typing.Optional[str] = None


@dataclass
class Structure:
    # File as provided by the user.
    raw_structure_file: str
    # File to used for predictions.
    structure_file: str
    # Optional, collection of FASTA files for given chains.
    sequence_files: typing.Dict[str, str]
    # Optional, score to show on protein surface for each chain.
    score_files: typing.Dict[str, str] = dict
    # Optional, metadata that should be stored into output prediction file.
    metadata: typing.Dict[str, any] = dict
