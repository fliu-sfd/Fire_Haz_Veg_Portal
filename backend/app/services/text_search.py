LIKE_ESCAPE = "\\"


def like_pattern(text: str) -> str:
    """A case-insensitive "contains" pattern for ILIKE ... ESCAPE LIKE_ESCAPE."""
    # treat % and _ typed by the admin as plain characters
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
