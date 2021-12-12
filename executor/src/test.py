import sys
import logging

logger = logging.getLogger(__name__)

handler = logging.StreamHandler()
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] : %(message)s",
    "%Y-%m-%dT%H:%M:%S")
handler.setFormatter(formatter)
logger.addHandler(handler)

sys.stdout.write("STDOUT.p2rank_executor.py\n")
sys.stderr.write("STDERR.p2rank_executor.py\n")
logger.info("INFO")
logger.warning("WARNING")
logger.error("error")
print("PRINT.p2rank_executor.py")
