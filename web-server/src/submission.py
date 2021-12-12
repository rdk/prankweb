import os
import celery

prankweb = celery.Celery("prankweb")
prankweb.conf.broker_url = os.environ.get(
    "CELERY_BROKER_URL",
    "amqp://user-develop:develop@localhost:5672"
)


def submit_directory_for_execution(directory):
    prankweb.send_task(
        "prediction.run",
        args=[directory],
        queue="prankweb"
    )
