from datetime import datetime

from pydantic import BaseModel, ConfigDict

__all__ = ["MessageList", "MessageOut", "MessageUpdate"]


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    label: str
    description: str
    message: str
    default_message: str
    is_default: bool
    min_length: int
    max_length: int
    max_lines: int
    updated_at: datetime | None
    updated_by_name: str | None


class MessageList(BaseModel):
    items: list[MessageOut]


class MessageUpdate(BaseModel):
    """The limits belong to the message, so the service checks the text, not this schema."""

    model_config = ConfigDict(extra="forbid")

    message: str
