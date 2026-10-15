from typing import Protocol


class PhotoStore(Protocol):
    """Where photo bytes live. The database only keeps the key.

    Today the files sit on local disk. If hosting ends up needing cloud
    storage, a second class with these same three methods is all it takes.
    """

    def save(self, key: str, data: bytes, content_type: str) -> str:
        """Store the bytes under key and return the key."""
        ...

    def read(self, key: str) -> bytes:
        """Return the stored bytes. Raises FileNotFoundError if the key is unknown."""
        ...

    def delete(self, key: str) -> None:
        """Remove the stored bytes. A key that does not exist is not an error."""
        ...
