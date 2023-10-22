FROM debian:bookworm-20231009

ARG UID
ARG GID

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
    curl python3 python3-pip vim wget

RUN addgroup --gid ${GID} user \
    && useradd --uid ${UID} --gid ${GID} user

RUN mkdir /opt/flower && chown user:user /opt/flower

WORKDIR /opt/flower
COPY --chown=user:user ./web-server/requirements.txt ./

RUN pip3 install -r requirements.txt

USER ${UID}:${GID}

EXPOSE 5555

