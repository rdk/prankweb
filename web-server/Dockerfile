FROM debian:bookworm-20211115

ARG UID=5988
ARG GID=5988

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV PRANKWEB_DATA="/data/database"

RUN apt-get update \
 && apt-get -y --no-install-recommends install \
 wget curl \
 python3 python3-pip

RUN addgroup --gid ${GID} user \
 && useradd --uid ${UID} --gid ${GID} user

WORKDIR /opt/web-server
COPY --chown=user:user ./web-server/src ./src/
COPY --chown=user:user ./web-server/wsgi.py ./
COPY --chown=user:user ./web-server/requirements.txt ./

RUN pip3 install -r requirements.txt

USER ${UID}:${GID}

EXPOSE 8020

ENTRYPOINT ["gunicorn" ,"-w", "4", "-b", ":8020 ", "wsgi:app"]
