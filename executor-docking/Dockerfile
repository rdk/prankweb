#
# executor
#

FROM debian:bookworm-20230208

ARG CELERY_BROKER_URL="amqp://user-develop:develop@localhost:5672"

RUN apt-get update \
 && apt-get -y --no-install-recommends install \
 wget curl \
 python3 python3-pip \
 openjdk-17-jre-headless \
 libgomp1 vim \
 python3-venv

ARG UID=5988
ARG GID=5988

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN groupadd --gid ${GID} user \
 && useradd --uid ${UID} --gid ${GID} user

# Since WORKDIR created with current user (root) we precreate the folders.
RUN mkdir /data \
 && mkdir /data/prankweb && chown user:user /data/prankweb \
 && mkdir /opt/executor-docking && chown user:user /opt/executor-docking 

#
# prankweb executor-docking
WORKDIR /opt/executor-docking
COPY --chown=user:user ./executor-docking/requirements.txt ./

RUN pip3 install -r requirements.txt

COPY --chown=user:user ./executor-docking/ ./
RUN chmod a+x ./run_task.py

#
# environment
WORKDIR /opt/executor-docking

USER ${UID}:${GID}

CMD ["celery", "--app=celery_docking", "worker", "--concurrency=4", "--hostname=executor-docking-p2rank"]
