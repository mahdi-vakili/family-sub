import os
from pathlib import Path


def load_config():
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"

    return {
        "SECRET_KEY": os.environ.get("SECRET_KEY", "dev-secret-change-me"),
        "DATABASE_PATH": os.environ.get(
            "DATABASE_PATH",
            str(data_dir / "app.db"),
        ),
        "ADMIN_USERNAME": os.environ.get("ADMIN_USERNAME", "admin"),
        "ADMIN_PASSWORD": os.environ.get("ADMIN_PASSWORD", "change-me-now"),
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
    }
