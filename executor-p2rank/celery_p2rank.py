#!/usr/bin/env python3
from contextlib import contextmanager
from datetime import datetime
import os
import json

import celery.signals
import run_p2rank_task

prankweb = celery.Celery("prankweb")

if "CELERY_BROKER_URL" in os.environ:
    prankweb.conf.update({
        "broker_url": os.environ["CELERY_BROKER_URL"]
    })
elif "CELERY_BROKER_PATH" in os.environ:
    folder = os.environ["CELERY_BROKER_PATH"]
    prankweb.conf.update({
        "broker_url": "filesystem://",
        "broker_transport_options": {
            "data_folder_in": folder + "/queue/",
            "data_folder_out": folder + "/queue/",
            "data_folder_processed": folder + "/processed/"
        },
    })


@celery.signals.setup_logging.connect
def setup_celery_logging(**kwargs):
    # We do nothing here to disable logging.
    ...


# https://github.com/celery/celery/issues/2509
prankweb.log.setup()


@prankweb.task(name="prediction")
def celery_run_prediction(directory: str):
    directory = os.path.normpath(directory)
    if os.path.isdir(directory):
        with execution_lock_file(directory):
            run_p2rank_task.execute_directory_task(
                directory, keep_working=False)
    else:
        print(f"Given directory does not exist {directory}")


@contextmanager
def execution_lock_file(task_directory: str):
    """Create a lock file that is removed after execution is finished."""
    lock_file = None
    if "LOCK_DIRECTORY" in os.environ:
        lock_directory = os.environ["LOCK_DIRECTORY"]
        os.makedirs(lock_directory, exist_ok=True)
        lock_file = os.path.join(
            lock_directory,
            task_directory.replace(os.sep, "_"))
    if lock_file is not None:
        with open(lock_file, "w") as stream:
            json.dump({
                "start": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                "directory": task_directory
            }, stream)
    try:
        yield
    finally:
        if lock_file is not None:
            os.remove(lock_file)
