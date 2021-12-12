FROM rabbitmq:3.9.11-management

RUN rabbitmq-plugins enable rabbitmq_management

COPY --chown=rabbitmq:rabbitmq ./rabbitmq/rabbitmq/ /etc/rabbitmq/

EXPOSE 5672 15672
