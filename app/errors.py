from flask import render_template


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(_error):
        return render_error(
            title="Bad Request",
            message="The request was invalid. Reload the page and try again.",
            status_code=400,
        )

    @app.errorhandler(404)
    def not_found(_error):
        return render_error(
            title="Page Not Found",
            message="The page you requested does not exist.",
            status_code=404,
        )

    @app.errorhandler(413)
    def request_too_large(_error):
        return render_error(
            title="Request Too Large",
            message="The submitted form was too large to process.",
            status_code=413,
        )


def render_error(title, message, status_code):
    return (
        render_template("error.html", title=title, message=message),
        status_code,
    )
