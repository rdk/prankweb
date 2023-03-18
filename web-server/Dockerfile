FROM debian:bookworm-20211115

ARG UID=5988
ARG GID=5988

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV PRANKWEB_DATA="/data/database"

RUN apt-get update \
 && apt-get -y --no-install-recommends install \
 wget curl \
 python3 python3-pip vim \
 python3-venv

RUN addgroup --gid ${GID} user \
 && useradd --uid ${UID} --gid ${GID} user

WORKDIR /opt/web-server
COPY --chown=user:user ./web-server/src ./src/
COPY --chown=user:user ./web-server/wsgi.py ./
COPY --chown=user:user ./web-server/requirements.txt ./

# https://github.com/python/cpython/issues/102134
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip3 install -r requirements.txt

USER ${UID}:${GID}

EXPOSE 8020

CMD ["gunicorn" ,"-w", "4", "-b", ":8020 ", "wsgi:app"]
