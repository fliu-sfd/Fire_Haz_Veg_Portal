import pytest

from app.storage import LocalDiskStore, PhotoStore

JPEG_BYTES = b"\xff\xd8\xff\xe0fake-jpeg-body\xff\xd9"


@pytest.fixture
def store(tmp_path):
    return LocalDiskStore(tmp_path / "photos")


def test_store_fits_the_photostore_shape(store):
    # PhotoStore is a Protocol, so this only checks the method names exist
    for name in ("save", "read", "delete"):
        assert callable(getattr(store, name))
    shared: PhotoStore = store
    assert shared is store


def test_save_then_read_gives_same_bytes(store):
    key = "crew/abc/photo1.jpg"
    returned = store.save(key, JPEG_BYTES, "image/jpeg")
    print("saved under:", returned)

    assert returned == key
    assert store.read(key) == JPEG_BYTES


def test_save_creates_missing_subfolders(store):
    store.save("crew/a/b/c/deep.jpg", b"x", "image/jpeg")
    assert (store.root / "crew" / "a" / "b" / "c" / "deep.jpg").is_file()


def test_saving_twice_replaces_the_old_file(store):
    store.save("crew/a/p.jpg", b"first", "image/jpeg")
    store.save("crew/a/p.jpg", b"second", "image/jpeg")
    assert store.read("crew/a/p.jpg") == b"second"


def test_no_part_file_is_left_behind(store):
    store.save("crew/a/p.jpg", JPEG_BYTES, "image/jpeg")
    leftovers = list(store.root.rglob("*.part"))
    print("leftover temp files:", leftovers)
    assert leftovers == []


def test_read_of_unknown_key_raises(store):
    with pytest.raises(FileNotFoundError):
        store.read("crew/nobody/nothing.jpg")


def test_delete_removes_the_file(store):
    store.save("crew/a/p.jpg", b"bytes", "image/jpeg")
    store.delete("crew/a/p.jpg")
    with pytest.raises(FileNotFoundError):
        store.read("crew/a/p.jpg")


def test_delete_of_unknown_key_is_fine(store):
    store.delete("crew/never/existed.jpg")


@pytest.mark.parametrize(
    "bad_key",
    ["", "/etc/passwd", "\\windows\\x", "../outside.jpg", "crew/../../outside.jpg", "."],
)
def test_keys_that_escape_the_folder_are_refused(store, bad_key):
    with pytest.raises(ValueError):
        store.save(bad_key, b"nope", "image/jpeg")
    with pytest.raises(ValueError):
        store.read(bad_key)
    with pytest.raises(ValueError):
        store.delete(bad_key)


def test_nothing_is_written_outside_the_root(tmp_path):
    inner = LocalDiskStore(tmp_path / "root")
    with pytest.raises(ValueError):
        inner.save("../escape.jpg", b"x", "image/jpeg")
    assert not (tmp_path / "escape.jpg").exists()


def test_root_folder_is_created_on_startup(tmp_path):
    target = tmp_path / "does" / "not" / "exist"
    made = LocalDiskStore(target)
    assert made.root.is_dir()
