import os
import celery

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


def submit_directory_for_execution(directory):
    prankweb.send_task("prediction", args=[directory])
