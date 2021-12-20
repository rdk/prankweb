import os
import celery

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


def submit_directory_for_execution(directory):

    prankweb.send_task("prediction", args=[directory])
