from datetime import datetime, timezone

def fix_past_dates(events):
    now = datetime.now(timezone.utc)

    for e in events:
        start = datetime.fromisoformat(e["startEvent"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(e["endEvent"].replace("Z", "+00:00"))

        if start < now:
            start = now

        if end < start:
            end = start

        e["startEvent"] = start.isoformat().replace("+00:00", "Z")
        e["endEvent"] = end.isoformat().replace("+00:00", "Z")

    return events