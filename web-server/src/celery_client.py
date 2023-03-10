import os
import celery

prankweb = celery.Celery("prankweb")

prankweb.conf.update({
    "task_routes": {
        'prediction': 'p2rank',
        'sample_task': 'docking',
    }
})

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


def submit_directory_for_execution(directory):
    prankweb.send_task("prediction", args=[directory])

def submit_directory_for_sample_task(directory, taskId):
    prankweb.send_task("sample_task", args=[directory, taskId])
