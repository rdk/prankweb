FROM node:buster AS frontend-build

ARG GOOGLE_ANALYTICS

WORKDIR /opt/prankweb-frontend

COPY ./frontend/ ./

RUN npm ci && npm run build

FROM nginx:1.21.1

COPY --from=frontend-build /opt/prankweb-frontend/dist /opt/prankweb-frontend

RUN rm /etc/nginx/conf.d/default.conf 

COPY ./api-gateway/nginx/api-gateway.conf /etc/nginx/conf.d/
COPY ./api-gateway/nginx/cors.conf /etc/nginx/
