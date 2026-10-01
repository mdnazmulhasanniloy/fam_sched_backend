import unittest
from datetime import datetime, timezone

from app.services.ai_service import normalize_event, normalize_input
from app.services.validation import validate_extracted_event_date


class AiServiceValidationTests(unittest.TestCase):
    SOURCE = """Save The Date
HM Pride: Meet up on October 8, 6:00pm-8:00pm, Location TBD
Please RSVP by Monday, October 5th, 2026."""

    def test_ai_events_get_exact_backend_owned_reminders(self):
        result = normalize_event({"title": "Meet up", "recurring": "none"}, self.SOURCE)
        self.assertEqual([result[f"remainder{i}"] for i in range(1, 4)], [
            {"value": 1, "unit": "d"}, {"value": 1, "unit": "h"}, {"value": 0, "unit": "m"},
        ])

    def test_date_and_time_range_are_normalized(self):
        result = normalize_event({"title": "Meet up"}, self.SOURCE)
        self.assertEqual(result["startEvent"], "2026-10-08T18:00:00.000Z")
        self.assertEqual(result["endEvent"], "2026-10-08T20:00:00.000Z")

    def test_unicode_dash_is_normalized_before_time_parsing(self):
        source = normalize_input("Meet up October 8, 6:00 PM – 8:00 PM. RSVP by October 5, 2026.")
        result = normalize_event({"title": "Meet up"}, source)
        self.assertEqual(result["startEvent"], "2026-10-08T18:00:00.000Z")
        self.assertEqual(result["endEvent"], "2026-10-08T20:00:00.000Z")

    def test_explicit_past_date_is_preserved_and_flagged(self):
        result = validate_extracted_event_date(
            {"startEvent": "2026-08-10T12:00:00Z"},
            datetime(2026, 9, 22, tzinfo=timezone.utc),
        )
        self.assertEqual(result["startEvent"], "2026-08-10T12:00:00Z")
        self.assertTrue(result["isPastEvent"])
        self.assertEqual(result["originalDate"], "2026-08-10")


if __name__ == "__main__":
    unittest.main()
