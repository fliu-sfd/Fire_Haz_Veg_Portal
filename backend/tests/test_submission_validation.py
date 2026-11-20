from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.services.submission_service import MAX_PHOTO_BYTES, validate_photo


def image_bytes(kind="PNG", size=(8, 8)):
    output = BytesIO()
    Image.new("RGB", size, "green").save(output, kind)
    return output.getvalue()


@pytest.mark.parametrize("kind,mime", [("JPEG", "image/jpeg"), ("PNG", "image/png")])
def test_real_images_are_accepted_and_names_are_only_basename_metadata(kind, mime):
    data = image_bytes(kind)
    photo = validate_photo(data, mime, "../../private\\evidence.jpg")
    assert photo.data == data
    assert photo.file_name == "evidence.jpg"
    assert photo.content_type == mime


@pytest.mark.parametrize(
    "data,mime,code",
    [
        (b"not an image", "image/jpeg", 422),
        (b"<svg></svg>", "image/svg+xml", 415),
        (image_bytes("GIF"), "image/png", 415),
        (image_bytes(), "image/jpeg", 415),
        (image_bytes(), None, 415),
        (b"", "image/png", 422),
        (b"x" * (MAX_PHOTO_BYTES + 1), "image/png", 413),
        (image_bytes("JPEG")[:100], "image/jpeg", 422),
    ],
)
def test_invalid_photos_are_rejected(data, mime, code):
    with pytest.raises(HTTPException) as error:
        validate_photo(data, mime, "photo.jpg")
    assert error.value.status_code == code


def test_exact_file_size_limit_is_accepted():
    data = image_bytes("JPEG")
    data += b"\0" * (MAX_PHOTO_BYTES - len(data))
    assert len(validate_photo(data, "image/jpeg", "photo.jpg").data) == MAX_PHOTO_BYTES


def test_small_compressed_image_with_excessive_dimensions_is_rejected():
    with pytest.raises(HTTPException) as error:
        validate_photo(image_bytes(size=(5001, 5000)), "image/png", "huge.png")
    assert error.value.status_code == 422


def test_corrupt_png_checksum_is_rejected():
    data = bytearray(image_bytes())
    data[45] ^= 255
    with pytest.raises(HTTPException):
        validate_photo(bytes(data), "image/png", "bad.png")
