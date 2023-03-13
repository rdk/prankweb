#
# Build web-application.
#
FROM node:19.7-bullseye AS frontend

ARG GOOGLE_ANALYTICS

WORKDIR /opt/frontend

COPY ./frontend/ ./

RUN npm ci && npm run build

#
# Prepare passwords.
#
FROM debian:bookworm-20211115 as htpasswd

RUN apt-get update && apt-get -y install apache2-utils

ARG WEB_SERVICE_USER
ARG WEB_SERVICE_PASSWORD

WORKDIR /opt/htpasswd
# https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
RUN htpasswd -b -c /opt/htpasswd/.htpasswd ${WEB_SERVICE_USER} ${WEB_SERVICE_PASSWORD}

#
#
#
FROM nginx:1.21.1

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=frontend /opt/frontend/dist /opt/prankweb-frontend
COPY --from=htpasswd /opt/htpasswd/.htpasswd /etc/apache2/.htpasswd

COPY ./gateway/nginx/gateway.conf /etc/nginx/conf.d/
COPY ./gateway/nginx/cors.conf /etc/nginx/
COPY ./gateway/nginx/restricted.conf /etc/nginx/
