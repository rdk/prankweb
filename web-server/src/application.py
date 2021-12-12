from flask import Flask
from .api_v2 import api_v2


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config["MAX_CONTENT_PATH"] = 2 * 1024 * 1024
    app.register_blueprint(api_v2, url_prefix="/api/v2/")
    return app
