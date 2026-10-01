import json
import logging
import os
import re
from datetime import datetime, timezone

from app.services.validation import validate_extracted_event_date

try:
    from dotenv import load_dotenv
except ImportError:  # Allows deterministic normalization tests without provider extras.
    def load_dotenv():
        return False

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if OpenAI else None
logger = logging.getLogger(__name__)

# Backend-owned defaults in the existing Mongo value/unit reminder schema.
DEFAULT_AI_EVENT_REMINDERS = (
    {"value": 1, "unit": "d"}, {"value": 1, "unit": "h"}, {"value": 0, "unit": "m"},
)

EVENT_SCHEMA = {"type": "function", "function": {
    "name": "create_events", "strict": True,
    "description": "Extract every explicitly supported calendar event.",
    "parameters": {"type": "object", "additionalProperties": False, "required": ["events"], "properties": {
        "events": {"type": "array", "items": {"type": "object", "additionalProperties": False,
            "required": ["title", "startEvent", "endEvent", "note", "location", "rsvpDeadline", "recurring", "isAssignMe"],
            "properties": {
                "title": {"type": ["string", "null"]}, "startEvent": {"type": ["string", "null"]},
                "endEvent": {"type": ["string", "null"]}, "note": {"type": ["string", "null"]},
                "location": {"type": ["string", "null"]}, "rsvpDeadline": {"type": ["string", "null"]},
                "recurring": {"type": "string", "enum": ["none", "daily", "weekly", "monthly"]},
                "isAssignMe": {"type": "boolean"},
            }}}
    }}}}


def normalize_input(text: str) -> str:
    return (text.replace("\u00a0", " ").replace("–", "-").replace("—", "-")
            .replace("â€“", "-").replace("â€”", "-").replace("\r\n", "\n"))


def get_system_prompt() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"""You are an event information extraction engine. Today is {today} UTC.
Extract ALL valid events explicitly supported by the text; do not stop at the first event.
This is not creative writing: never invent titles, dates, locations, times, reminders, or events. Use null when unavailable.
Distinguish event dates from RSVP, registration, publication and unrelated dates. Preserve explicit years exactly and never move a past date into the future. A date-only event has null startEvent/endEvent. Timed events use ISO 8601 UTC. Preserve time ranges. Return only the tool result."""


def _iso(value: object) -> str | None:
    if not isinstance(value, str) or not value.strip(): return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if parsed.tzinfo is None: parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    except ValueError: return None


def _clock(value: str) -> tuple[int, int] | None:
    match = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?", value.strip(), re.I)
    if not match: return None
    hour, minute, suffix = int(match.group(1)), int(match.group(2) or 0), (match.group(3) or "").lower().replace(".", "")
    if minute > 59 or hour > 23 or (suffix and hour > 12): return None
    if suffix: hour = (hour % 12) + (12 if suffix == "pm" else 0)
    return hour, minute


def _source_time_range(text: str):
    # A date paired with a range is stronger evidence than model output. Avoid RSVP lines.
    pattern = re.compile(r"(?im)^(?!\s*(?:rsvp|register)\b).*?\b([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s*,?\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)")
    match = pattern.search(text)
    if not match: return None
    date_text = re.sub(r"(st|nd|rd|th)\b", "", match.group(1), flags=re.I)
    if not re.search(r"\b20\d{2}\b", date_text):
        years = re.findall(r"\b(20\d{2})\b", text)
        if years: date_text += ", " + years[0]
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y"):
        try:
            day = datetime.strptime(date_text, fmt).replace(tzinfo=timezone.utc)
            start, end = _clock(match.group(2)), _clock(match.group(3))
            return (day, start, end) if start and end else None
        except ValueError: continue
    return None


def normalize_event(event: dict, source: str) -> dict:
    result = dict(event)
    result["startEvent"], result["endEvent"] = _iso(result.get("startEvent")), _iso(result.get("endEvent"))
    result["recurring"] = str(result.get("recurring") or "none").lower()
    result["isAssignMe"] = bool(result.get("isAssignMe", True))
    source_range = _source_time_range(source)
    # This is a repair for omitted/malformed model times, not a replacement for
    # structured times on other events in the same chunk.
    if source_range and (not result["startEvent"] or not result["endEvent"]):
        day, start, end = source_range
        result["startEvent"] = day.replace(hour=start[0], minute=start[1]).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        result["endEvent"] = day.replace(hour=end[0], minute=end[1]).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if result["startEvent"] and result["endEvent"] and result["endEvent"] < result["startEvent"]: result["endEvent"] = None
    for key, reminder in zip(("remainder1", "remainder2", "remainder3"), DEFAULT_AI_EVENT_REMINDERS): result[key] = reminder.copy()
    return validate_extracted_event_date(result)


def _chunks(text: str, maximum: int = 12000) -> list[str]:
    result, current = [], ""
    for paragraph in [p.strip() for p in text.split("\n\n") if p.strip()] or [text]:
        if current and len(current) + len(paragraph) + 2 > maximum: result.append(current); current = paragraph
        else: current = f"{current}\n\n{paragraph}".strip()
    return result + ([current] if current else [])


def _deduplicate(events: list[dict]) -> list[dict]:
    seen, result = set(), []
    for event in events:
        key = tuple(str(event.get(k) or "").strip().lower() for k in ("title", "startEvent", "location"))
        if key not in seen: seen.add(key); result.append(event)
    return result


def parse_events_from_description(description: str) -> list[dict]:
    if client is None:
        raise RuntimeError("OpenAI client is unavailable; install ai_server requirements")
    normalized, request_id, extracted = normalize_input(description), os.urandom(6).hex(), []
    for chunk in _chunks(normalized):
        response = client.chat.completions.create(model="gpt-4o-mini", temperature=0, messages=[{"role": "system", "content": get_system_prompt()}, {"role": "user", "content": chunk}], tools=[EVENT_SCHEMA], tool_choice={"type": "function", "function": {"name": "create_events"}})
        try:
            events = json.loads(response.choices[0].message.tool_calls[0].function.arguments).get("events", [])
            if not isinstance(events, list): raise ValueError("events must be an array")
            extracted.extend(normalize_event(item, chunk) for item in events if isinstance(item, dict))
        except (IndexError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            logger.exception("AI validation failure requestId=%s inputSize=%s", request_id, len(chunk))
            raise ValueError("Unable to extract valid events") from error
    result = _deduplicate(extracted)
    logger.info("AI extraction requestId=%s inputSize=%s extracted=%s valid=%s rejected=%s", request_id, len(normalized), len(extracted), len(result), len(extracted)-len(result))
    return result
