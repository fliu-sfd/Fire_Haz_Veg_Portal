from pydantic import BaseModel


class FirefighterOut(BaseModel):
    """Department details shown to admins and to the firefighter on their own profile."""

    employee_id: str
    station_code: str | None
