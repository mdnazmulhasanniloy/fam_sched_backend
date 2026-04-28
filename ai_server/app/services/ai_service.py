import os
import json
from openai import OpenAI
from dotenv import load_dotenv

from datetime import datetime

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# The schema we force OpenAI to follow
EVENT_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_events",
        "description": "Extract all events from the user description and return them as a list.",
        "parameters": {
            "type": "object",
            "properties": {
                "events": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title":      {"type": "string"},
                            "startEvent": {"type": "string", "description": "ISO 8601 format e.g. 2025-12-20T09:00:00.000Z"},
                            "endEvent":   {"type": "string", "description": "ISO 8601 format"},
                            "note":       {"type": "string"},
                            "recurring":  {"type": "string", "enum": ["None", "Daily", "Weekly", "Monthly"]},
                            "isAssignMe": {"type": "boolean"},
                            "remainder1": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "integer"},
                                    "unit":  {"type": "string", "enum": ["m", "h", "d", "w"]}
                                },
                                "required": ["value", "unit"]
                            },
                            "remainder2": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "integer"},
                                    "unit":  {"type": "string", "enum": ["m", "h", "d", "w"]}
                                },
                                "required": ["value", "unit"]
                            },
                            "remainder3": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "integer"},
                                    "unit":  {"type": "string", "enum": ["m", "h", "d", "w"]}
                                },
                                "required": ["value", "unit"]
                            },
                        },
                        "required": ["title", "startEvent", "endEvent", "note", "recurring", "isAssignMe", "remainder1", "remainder2", "remainder3"]
                    }
                }
            },
            "required": ["events"]
        }
    }
}

SYSTEM_PROMPT = """
You are a smart calendar assistant. 
The user will describe what they want scheduled.
Today is {today}. You MUST use this exact date for all calculations. Never use any other date. Do not rely on your training data for the current date. (e.g. "tomorrow", "next week", "in 3 days" etc.).
You must extract ALL events from the description and return them in structured format.

Rules:
- If no specific date is mentioned, use today's date as a base.
- Default event duration is 1 hour unless stated.
- Pick sensible reminders (e.g. 10m, 1h, 1d before).
- If the user says recurring, set the recurring field accordingly.
- isAssignMe is always true unless stated otherwise.
- The "note" field should contain a brief, natural description of the event — include any relevant context the user mentioned (location, purpose, who it's with, etc.). If nothing extra was mentioned, write a short one-line summary of the event.
- Return multiple events if the description implies multiple.
"""
# updated time and note

def parse_events_from_description(description: str) -> list[dict]:
    """
    Takes a plain text description and returns a list of event dicts.
    """

    today = datetime.now().strftime("%Y-%m-%d %A")
    print(f"DEBUG today = {today}")
    prompt = SYSTEM_PROMPT.format(today=today)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user",   "content": description}
        ],
        tools=[EVENT_SCHEMA],
        tool_choice={"type": "function", "function": {"name": "create_events"}}
    )

    # Extract the function call arguments
    tool_call = response.choices[0].message.tool_calls[0]
    arguments = json.loads(tool_call.function.arguments)
    return arguments["events"]
