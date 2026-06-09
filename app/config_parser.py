import re

CONFIG_URI_PATTERN = re.compile(
    r"(?P<uri>[a-zA-Z][a-zA-Z0-9+.-]*://[^\s<>'\"`]+)"
)
TRAILING_PUNCTUATION = ".,;:)]}>"


def extract_config_lines(raw_text):
    unique_lines = []
    seen = set()

    for match in CONFIG_URI_PATTERN.finditer(raw_text):
        candidate = normalize_config_line(match.group("uri"))
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        unique_lines.append(candidate)

    return unique_lines


def normalize_config_line(config_line):
    candidate = config_line.strip()

    while candidate and candidate[-1] in TRAILING_PUNCTUATION:
        candidate = candidate[:-1]

    if is_valid_config_line(candidate):
        return candidate
    return ""


def is_valid_config_line(config_line):
    return bool(CONFIG_URI_PATTERN.fullmatch(config_line))
