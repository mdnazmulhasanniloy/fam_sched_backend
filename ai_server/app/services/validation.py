from datetime import datetime, timezone


def fix_past_dates(events):
    now = datetime.now(timezone.utc)

    for e in events:
        start_value = e.get("startEvent")
        end_value = e.get("endEvent")

        if not start_value or not end_value:
            e["startEvent"] = start_value or ""
            e["endEvent"] = end_value or ""
            continue

        try:
            start = datetime.fromisoformat(str(start_value).replace("Z", "+00:00"))
            end = datetime.fromisoformat(str(end_value).replace("Z", "+00:00"))
        except ValueError:
            e["startEvent"] = start_value or ""
            e["endEvent"] = end_value or ""
            continue

        if start < now:
            start = now

        if end < start:
            end = start

        e["startEvent"] = start.isoformat().replace("+00:00", "Z")
        e["endEvent"] = end.isoformat().replace("+00:00", "Z")

    return events