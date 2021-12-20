#!/usr/bin/env python3
import os

import celery.signals

import run_p2rank_task

prankweb = celery.Celery("prankweb")

if "CELERY_BROKER_URL" in os.environ:
    prankweb.conf.broker_url = os.environ["CELERY_BROKER_URL"]
else:
    prankweb.conf.update({
        'broker_url': 'filesystem://',
        'broker_transport_options': {
            'data_folder_in': '/data/prankweb/broker/queue/',
            'data_folder_out': '/data/prankweb/broker/queue/',
            'data_folder_processed': '/data/prankweb/broker/processed'
        },
        'result_persistent': False,
        'task_serializer': 'json',
        'result_serializer': 'json',
        'accept_content': ['json']}
    )


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
    run_p2rank_task.execute_directory_task(directory, keep_working=False)
