FROM prom/prometheus:v2.47.2

COPY ./prometheus/prometheus.yml /etc/prometheus/

CMD [ "--config.file=/etc/prometheus/prometheus.yml", \
    "--storage.tsdb.path=/data/prometheus", \
    "--web.console.libraries=/usr/share/prometheus/console_libraries", \
    "--web.console.templates=/usr/share/prometheus/consoles" ]

EXPOSE 9090
