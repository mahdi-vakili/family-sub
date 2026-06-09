import secrets

from flask import abort, session
from werkzeug.security import check_password_hash


def generate_csrf_token():
    token = session.get("_csrf_token")
    if token is None:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def validate_csrf_token(token):
    expected = session.get("_csrf_token")
    if not expected or token != expected:
        abort(400)


def verify_password(password_hash, password):
    return check_password_hash(password_hash, password)
