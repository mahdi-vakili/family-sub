import base64
import logging
import re
import threading
import urllib.request
from datetime import datetime, timezone

from app.db import get_db
from app.subscription_links_store import (
    get_subscription_link,
    list_subscription_links,
    replace_subscription_link_configs,
    update_subscription_link_status,
)

logger = logging.getLogger(__name__)

FETCH_INTERVAL_SECONDS = 2 * 60 * 60
FETCH_TIMEOUT_SECONDS = 30
CONFIG_URI_PATTERN = re.compile(
    r"(?P<uri>[a-zA-Z][a-zA-Z0-9+.-]*://[^\s<>'\"`]+)"
)
TRAILING_PUNCTUATION = ".,;:)]}>"


def fetch_all_subscription_links():
    links = list_subscription_links()
    for link in links:
        fetch_subscription_link(link["id"])


def fetch_subscription_link(link_id):
    link = get_subscription_link(link_id)
    if link is None:
        return
    try:
        raw = _fetch_url(link["url"])
        configs = _parse_configs(raw)
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        replace_subscription_link_configs(link["id"], configs, now)
        update_subscription_link_status(link["id"], now, None)
        logger.info(
            "Fetched %d configs from subscription link %d (%s)",
            len(configs),
            link["id"],
            link["name"],
        )
    except Exception as exc:
        logger.warning(
            "Failed to fetch subscription link %d (%s): %s",
            link["id"],
            link["name"],
            exc,
        )
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        update_subscription_link_status(link["id"], now, str(exc)[:500])


def _fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "family-sub/1.0"})
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_SECONDS) as resp:
        return resp.read()


def _parse_configs(raw_bytes):
    text = _decode_response(raw_bytes)
    return _extract_config_lines(text)


def _decode_response(raw_bytes):
    text = raw_bytes.decode("utf-8", errors="replace").strip()
    try:
        cleaned = re.sub(r"\s+", "", text)
        decoded = base64.b64decode(cleaned, validate=True)
        decoded_text = decoded.decode("utf-8", errors="replace")
        if CONFIG_URI_PATTERN.search(decoded_text):
            return decoded_text
    except Exception:
        pass
    return text


def _extract_config_lines(text):
    seen = set()
    results = []
    for match in CONFIG_URI_PATTERN.finditer(text):
        candidate = match.group("uri").strip()
        while candidate and candidate[-1] in TRAILING_PUNCTUATION:
            candidate = candidate[:-1]
        if candidate and candidate not in seen:
            seen.add(candidate)
            results.append(candidate)
    return results


def _schedule_next(app):
    timer = threading.Timer(FETCH_INTERVAL_SECONDS, _run_and_reschedule, args=(app,))
    timer.daemon = True
    timer.start()


def _run_and_reschedule(app):
    with app.app_context():
        fetch_all_subscription_links()
    _schedule_next(app)


def start_background_fetcher(app):
    with app.app_context():
        fetch_all_subscription_links()
    _schedule_next(app)
