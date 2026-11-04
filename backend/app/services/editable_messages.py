"""Messages an admin can reword without a developer.

To add one, add an entry to EDITABLE_MESSAGES. backend/README.md lists the steps.
"""

from dataclasses import dataclass

DISABLED_ACCOUNT_MESSAGE_KEY = "disabled_account_message"


@dataclass(frozen=True)
class EditableMessage:
    key: str  # stable id used in the database and URLs, lowercase with underscores
    label: str  # name shown to the admin
    description: str  # one line: where the person sees it
    default: str  # text used when nothing is saved
    min_length: int
    max_length: int
    max_lines: int


EDITABLE_MESSAGES: dict[str, EditableMessage] = {
    DISABLED_ACCOUNT_MESSAGE_KEY: EditableMessage(
        key=DISABLED_ACCOUNT_MESSAGE_KEY,
        label="Disabled account message",
        description="Shown when a disabled person signs in with the correct password.",
        default="Account is disabled. Contact the Scottsdale Fire Department.",
        min_length=10,
        max_length=500,
        max_lines=3,
    ),
}
