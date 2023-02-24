#!/usr/bin/env python3
import os
import celery.signals
import run_task

prankweb = celery.Celery("prankweb")

if "CELERY_BROKER_URL" in os.environ:
    prankweb.conf.update({
        "broker_url":
            os.environ["CELERY_BROKER_URL"]
    })
elif "CELERY_BROKER_PATH" in os.environ:
    prankweb.conf.update({
        "broker_url": "filesystem://",
        "broker_transport_options": {
            "data_folder_in":
                os.environ["CELERY_BROKER_PATH"] + "/queue/",
            "data_folder_out":
                os.environ["CELERY_BROKER_PATH"] + "/queue/",
            "data_folder_processed":
                os.environ["CELERY_BROKER_PATH"] + "/processed/"
        },
    })


@celery.signals.setup_logging.connect
def setup_celery_logging(**kwargs):
    # We do nothing here to disable logging.
    ...


# https://github.com/celery/celery/issues/2509
prankweb.log.setup()


@prankweb.task(name="sample_task")
def celery_run_sample_task(directory: str):
    print(directory)
    if os.path.isdir(directory):
        run_task.execute_directory_task(directory, keep_working=False)
    else:
        print(f"Given directory does not exist {directory}")
