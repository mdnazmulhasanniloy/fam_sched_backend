import unittest

from app.services.ai_service import normalize_event_time_fields
from app.services.validation import fix_past_dates


class AiServiceValidationTests(unittest.TestCase):
    def test_time_is_left_empty_when_no_explicit_time_is_present(self):
        event = {
            "title": "Dorr Family Picnic",
            "startEvent": "",
            "endEvent": "",
            "note": "Family picnic",
            "recurring": "None",
            "isAssignMe": True,
            "remainder1": {"value": 1, "unit": "d"},
            "remainder2": {"value": 1, "unit": "h"},
            "remainder3": {"value": 10, "unit": "m"},
        }

        result = normalize_event_time_fields(event)
        self.assertIn(result["startEvent"], (None, ""))
        self.assertIn(result["endEvent"], (None, ""))

    def test_explicit_pm_time_is_preserved_without_hour_shift(self):
        event = {
            "title": "We Hold These Truths",
            "startEvent": "2025-09-28T18:30:00.000Z",
            "endEvent": "2025-09-28T19:30:00.000Z",
            "note": "Talk at recital hall",
            "recurring": "None",
            "isAssignMe": True,
            "remainder1": {"value": 1, "unit": "d"},
            "remainder2": {"value": 1, "unit": "h"},
            "remainder3": {"value": 10, "unit": "m"},
        }

        result = normalize_event_time_fields(event)
        self.assertEqual(result["startEvent"], "2025-09-28T18:30:00.000Z")
        self.assertEqual(result["endEvent"], "2025-09-28T19:30:00.000Z")

    def test_blank_event_times_are_safe_for_past_date_fixing(self):
        events = [{
            "title": "No time event",
            "startEvent": "",
            "endEvent": "",
            "note": "No time specified",
            "recurring": "None",
            "isAssignMe": True,
            "remainder1": {"value": 1, "unit": "d"},
            "remainder2": {"value": 1, "unit": "h"},
            "remainder3": {"value": 10, "unit": "m"},
        }]

        safe_events = fix_past_dates(events)
        self.assertEqual(safe_events[0]["startEvent"], "")
        self.assertEqual(safe_events[0]["endEvent"], "")


if __name__ == "__main__":
    unittest.main()
