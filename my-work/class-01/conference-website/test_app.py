import unittest
from datetime import datetime
from app import app, TALKS_DATA, CATEGORIES

class ConferenceAppTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_home_page_status(self):
        """Test that the homepage route returns HTTP 200."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_api_endpoint(self):
        """Test that the API endpoint returns the expected structured data."""
        response = self.client.get("/api/talks")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("conference", data)
        self.assertIn("talks", data)
        self.assertIn("categories", data)
        
        # Verify category mapping keys are strings in JSON
        self.assertIn("1", data["categories"])
        self.assertIn("2", data["categories"])

    def test_talks_count(self):
        """Test that there are exactly 8 talks."""
        self.assertEqual(len(TALKS_DATA), 8)

    def test_talk_structure(self):
        """Test that each talk contains all required fields with proper constraints."""
        for talk in TALKS_DATA:
            self.assertIn("id", talk)
            self.assertIn("title", talk)
            self.assertIn("category_id", talk)
            self.assertIn("category_name", talk)
            self.assertIn("start_time", talk)
            self.assertIn("end_time", talk)
            self.assertIn("description", talk)
            self.assertIn("speakers", talk)
            
            # Category ID constraint (1 or 2)
            self.assertIn(talk["category_id"], [1, 2])
            self.assertEqual(talk["category_name"], CATEGORIES[talk["category_id"]])
            
            # Speaker count constraint (1 or 2)
            speakers = talk["speakers"]
            self.assertTrue(1 <= len(speakers) <= 2, f"Talk {talk['id']} has invalid speaker count: {len(speakers)}")
            
            # Speaker details constraint
            for speaker in speakers:
                self.assertIn("first_name", speaker)
                self.assertIn("last_name", speaker)
                self.assertIn("linkedin", speaker)
                self.assertTrue(speaker["linkedin"].startswith("https://www.linkedin.com/"))

    def test_lunch_break_timing(self):
        """Verify that the interval between talk 4 and talk 5 is exactly 60 minutes."""
        # Find Talk 4 and Talk 5
        talk4 = next(t for t in TALKS_DATA if t["id"] == 4)
        talk5 = next(t for t in TALKS_DATA if t["id"] == 5)
        
        # Parse times
        fmt = "%I:%M %p"
        t4_end = datetime.strptime(talk4["end_time"], fmt)
        t5_start = datetime.strptime(talk5["start_time"], fmt)
        
        # Calculate diff in minutes
        diff_minutes = int((t5_start - t4_end).total_seconds() / 60)
        self.assertEqual(diff_minutes, 60, f"Expected 60-minute break between Talk 4 and Talk 5, got {diff_minutes} minutes")

if __name__ == "__main__":
    unittest.main()
