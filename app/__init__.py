from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from app.auth import auth_bp
from app.config import load_config, validate_config
from app.configs import configs_bp
from app.db import close_db, ensure_admin_account, init_db
from app.errors import register_error_handlers
from app.logs import logs_bp
from app.security import generate_csrf_token
from app.users import users_bp


def create_app(test_overrides=None):
    app = Flask(__name__)
    app.config.from_mapping(load_config())

    if test_overrides:
        app.config.update(test_overrides)

    validate_config(app.config)
    register_extensions(app)
    register_routes(app)
    register_context(app)
    register_error_handlers(app)
    initialize_database(app)
    return app


def register_extensions(app):
    app.teardown_appcontext(close_db)
    trust_proxy_count = app.config.get("TRUST_PROXY_COUNT", 0)
    if trust_proxy_count > 0:
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=trust_proxy_count,
            x_proto=trust_proxy_count,
            x_host=trust_proxy_count,
            x_port=trust_proxy_count,
        )


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(configs_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(users_bp)


def register_context(app):
    @app.context_processor
    def inject_template_helpers():
        return {"csrf_token": generate_csrf_token}


def initialize_database(app):
    with app.app_context():
        init_db()
        ensure_admin_account(
            username=app.config["ADMIN_USERNAME"],
            password=app.config["ADMIN_PASSWORD"],
        )
