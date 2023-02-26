import flask
from flask import Blueprint
from .database_v1 import register_database_v1
from .database_v2 import register_database_v2
from .database_v3 import register_database_v3

from .sample_task import SampleTask

api_v2 = Blueprint("api_v2", __name__)

databases = {
    database.name(): database
    for database in [
        *register_database_v1(),
        *register_database_v2(),
        *register_database_v3()
    ]
}


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>",
    methods=["GET"]
)
def route_get_info(database_name: str, prediction_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_info(prediction_name.upper())


@api_v2.route(
    "/prediction/<database_name>",
    methods=["POST"]
)
def route_post(database_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.create(flask.request.files)


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>/log",
    methods=["GET"]
)
def route_get_log(database_name: str, prediction_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_log(prediction_name.upper())


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>/public/<file_name>",
    methods=["GET"]
)
def route_get_file(database_name: str, prediction_name: str, file_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_file(prediction_name.upper(), file_name)


@api_v2.route(
    "/sample/<database_name>/<prediction_name>/post",
    methods=["GET"]
)
def route_post_sample_file(database_name: str, prediction_name: str):
    #return flask.response.jsonify({"status": "ok"})
    st = SampleTask(database_name=database_name)
    response = st.get_info_file(prediction_name.upper())
    return response

@api_v2.route(
    "/sample/<database_name>/<prediction_name>/public/<file_name>",
    methods=["GET"]
)
def route_get_sample_file(database_name: str, prediction_name: str, file_name: str):
    st = SampleTask(database_name=database_name)
    return st.get_file(prediction_name.upper(), file_name)