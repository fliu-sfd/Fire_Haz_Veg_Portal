"""What a whole property counts as, from the evidence on its issue points.

The admin hazard map works this out in SQL (admin_hazard_service.derive_state). This is the
same rule for code that already holds the rows, and a test keeps the two in step:
pending beats open, and a property is closed only when every issue is approved.
"""

from collections.abc import Iterable

from app.models import Assessment

ISSUES_RESULT = "ISSUES"


def property_review_state(points: Iterable[Assessment]) -> str | None:
    """open, pending_review or closed; None when the property has no issue point."""
    waiting = [p.submission_status for p in points if p.status == ISSUES_RESULT]
    if not waiting:
        return None
    if "pending_review" in waiting:
        return "pending_review"
    if all(status == "approved" for status in waiting):
        return "closed"
    # no submission yet, or the latest one was sent back
    return "open"
