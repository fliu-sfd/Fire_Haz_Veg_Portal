from pathlib import Path


class LocalDiskStore:
    """Keeps photos as plain files under one folder.

    Keys look like "crew/<assessment id>/<photo id>.jpg" and map straight
    onto sub-folders. Keys that try to leave the folder are refused.
    """

    def __init__(self, root: str | Path):
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path_for(self, key: str) -> Path:
        if not key or key.startswith(("/", "\\")):
            raise ValueError(f"bad storage key: {key!r}")
        target = (self.root / key).resolve()
        if not target.is_relative_to(self.root) or target == self.root:
            raise ValueError(f"bad storage key: {key!r}")
        return target

    def save(self, key: str, data: bytes, content_type: str) -> str:
        # content_type is part of the shared interface; plain files do not keep it
        target = self._path_for(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        # write beside the final name, then swap in, so a crash never leaves half a photo
        partial = target.with_name(target.name + ".part")
        partial.write_bytes(data)
        partial.replace(target)
        return key

    def read(self, key: str) -> bytes:
        target = self._path_for(key)
        if not target.is_file():
            raise FileNotFoundError(key)
        return target.read_bytes()

    def delete(self, key: str) -> None:
        self._path_for(key).unlink(missing_ok=True)
