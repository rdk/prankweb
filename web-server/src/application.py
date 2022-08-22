from flask import Flask
from .api_v2 import api_v2


def create_app():
    app = Flask(__name__, static_folder=None)

    @app.after_request
    def remove_header(response):
        # It seems regardless of as_attachment the send_file sends the
        # content-disposition, just with different values. We need to prevent
        # that as we need to be able to set file download name from HTML.
        # Browsers ignore that option if the content-disposition header is set.
        del response.headers['content-disposition']
        return response

    app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
    app.register_blueprint(api_v2, url_prefix="/api/v2/")
    return app
