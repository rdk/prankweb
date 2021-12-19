#
# java-tools
#

FROM debian:bookworm-20211115 as java-tools

RUN apt-get update \
 && apt-get -y --no-install-recommends install openjdk-17-jdk

WORKDIR /opt/java-tools
COPY ./java-tools ./

RUN chmod +x ./gradlew && ./gradlew installDist \
  && chmod a+x ./dist/bin/java-tools

#
# administration
#

FROM debian:bookworm-20211115

ARG UID=5988
ARG GID=5988

RUN apt-get update \
 && apt-get -y --no-install-recommends install \
 wget curl \
 python3 python3-pip \
 openjdk-17-jre-headless \
 libgomp1 vim

RUN addgroup --gid ${GID} user \
 && useradd --uid ${UID} --gid ${GID} user

# Since WORKDIR created with current user (root) we precreate the folders.
RUN mkdir /data \
 && mkdir /opt/prankweb-administration && chown user:user /opt/prankweb-administration

#
# java-tools
WORKDIR /opt
COPY --chown=user:user --from=java-tools /opt/java-tools/dist ./java-tools

ENV JAVA_TOOLS_CMD="/opt/java-tools/bin/java-tools"

#
# prankweb administration
WORKDIR /opt/administration
COPY --chown=user:user ./executor/requirements.txt ./

RUN pip3 install -r requirements.txt

COPY --chown=user:user ./executor/ ./

USER ${UID}:${GID}

CMD ["bash"]
