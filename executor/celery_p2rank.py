#!/usr/bin/env python3
import os

import celery.signals

import run_p2rank_task

prankweb = celery.Celery("prankweb")
prankweb.conf.broker_url = os.environ.get(
    "CELERY_BROKER_URL",
    "amqp://user-develop:develop@localhost:5672"
)
prankweb.conf.task_default_queue = 'prankweb'


@celery.signals.setup_logging.connect
def setup_celery_logging(**kwargs):
    # We do nothing here to disable logging.
    ...


# https://github.com/celery/celery/issues/2509
prankweb.log.setup()


@prankweb.task(name="prediction")
def celery_run_prediction(directory: str):
    if not os.path.isdir(directory):
        print(f"Given directory does not exists {directory}")
        return
    run_p2rank_task.execute_directory_task(directory)
