from datetime import datetime, timezone


def validate_extracted_event_date(event: dict, current_date: datetime | None = None) -> dict:
    """Flag explicit past dates; never mutate a date to make it future."""
    now = current_date or datetime.now(timezone.utc)
    value = event.get("startEvent")
    event["isPastEvent"] = False
    if not value:
        return event
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        event["dateParsingError"] = True
        return event
    if parsed < now:
        event["isPastEvent"] = True
        event["originalDate"] = parsed.date().isoformat()
        event["validationWarning"] = "The event date has already passed."
    return event


# Compatibility alias for existing imports.
def fix_past_dates(events: list[dict], current_date: datetime | None = None) -> list[dict]:
    return [validate_extracted_event_date(event, current_date) for event in events]
