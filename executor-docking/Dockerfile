#
# executor-docking
#

FROM debian:bookworm-20230208

ARG CELERY_BROKER_URL="amqp://user-develop:develop@localhost:5672"

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
    wget curl \
    python3 python3-pip vim \
    python3-venv \
    openbabel libopenbabel-dev nano

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

# prankweb executor-docking
WORKDIR /opt/executor-docking
COPY --chown=user:user ./executor-docking/requirements.txt ./

RUN pip3 install -r requirements.txt

COPY --chown=user:user ./executor-docking/ ./
RUN chmod a+x ./run_task.py

# docking tools
# lepro as a binary
RUN chmod a+x ./bin/lepro_linux_x86

ENV PATH="${PATH}:/opt/executor-docking/bin"

# install meeko and other python packages
RUN pip3 install -r requirements-docking.txt

# install adfr
# inspired by https://github.com/coleygroup/pyscreener

RUN wget -O ADFRsuite.tar.gz https://ccsb.scripps.edu/adfr/download/1038/ -q \
    && mv ADFRsuite.tar.gz ../ && cd .. \
    && tar -xzvf ADFRsuite.tar.gz \
    && cd ADFRsuite_* \
    && echo "Y" | ./install.sh -d . -c 0 \
    && cd .. \
    && rm -rf ADFRsuite.tar.gz

# a trick to work around a bug in MolKit MMCIF parser (MolKit/__init__.py calls MMCIFParser with an argument modelsAs=True, which is not supported by the parser)
RUN sed -i 's/^        parser = MMCIFParser(filename, modelsAs=modelsAs)$/        parser = MMCIFParser(filename)/' /opt/ADFRsuite_x86_64Linux_1.0/CCSBpckgs/MolKit/__init__.py

ENV PATH="${PATH}:/opt/ADFRsuite_x86_64Linux_1.0/bin"

# install vina

RUN mkdir /opt/vina && cd /opt/vina \
    && wget https://vina.scripps.edu/wp-content/uploads/sites/55/2020/12/autodock_vina_1_1_2_linux_x86.tgz -q \
    && tar -xzvf autodock_vina_1_1_2_linux_x86.tgz \
    && mkdir /opt/vina/bin \
    && mv autodock_vina_1_1_2_linux_x86/bin/* /opt/vina/bin/

ENV PATH="${PATH}:/opt/vina/bin"

#
# environment
WORKDIR /opt/executor-docking

USER ${UID}:${GID}
