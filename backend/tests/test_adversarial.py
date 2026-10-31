import pytest
from app.services.eligibility import check_year_match, extract_canonical_years, evaluate_eligibility

class TestAdversarialYearMatching:
    def test_decimal_numbers_do_not_trigger_year(self):
        # 3.5 or 4.0 (like GPA) should NOT be parsed as year 3 or 4
        # e.g., if extracted text has "Min 3.5 CPI" in years field
        years_35 = extract_canonical_years("Minimum 3.5 CGPA required")
        assert "3" not in years_35, "3.5 CGPA should not trigger Year 3"

        years_40 = extract_canonical_years("4.0 scale")
        assert "4" not in years_40, "4.0 scale should not trigger Year 4"

    def test_calendar_years_do_not_trigger_academic_years(self):
        # Calendar years like 2024, 2025, 2026, 2028 should not trigger year 2, 4, 1, etc.
        years_batch = extract_canonical_years("Batch of 2026 Placements")
        assert "2" not in years_batch
        assert "6" not in years_batch

    def test_pre_final_does_not_leak_to_final(self):
        # String containing "pre-final" should NOT match final year
        assert check_year_match("4th", ["Pre-final year students only"]) is False
        assert check_year_match("4", ["prefinal year"]) is False
        assert check_year_match("4th Year", ["pre-final"]) is False

    def test_final_does_not_leak_to_pre_final(self):
        # String containing "final" (without pre) should NOT match 3rd year
        assert check_year_match("3rd", ["Final year students only"]) is False
        assert check_year_match("3", ["final year batch"]) is False

    def test_both_pre_final_and_final_match_both(self):
        # Notices allowing both 3rd and 4th
        allowed = ["Pre-final and Final year students"]
        assert check_year_match("3rd", allowed) is True
        assert check_year_match("4th", allowed) is True
        assert check_year_match("1st", allowed) is False
        assert check_year_match("2nd", allowed) is False

    def test_none_empty_and_corrupt_inputs(self):
        # Edge cases with None, corrupt, or unexpected types
        assert check_year_match("", ["Pre-final year"]) is False
        assert check_year_match("   ", ["Pre-final year"]) is False
        assert check_year_match(None, ["Pre-final year"]) is False
        assert check_year_match("3rd", [None, "", "   "]) is False
        assert check_year_match("3rd", []) is True  # empty allowed years means open

    def test_injection_strings_safe(self):
        # SQL injection or XSS payload should not crash matcher
        assert check_year_match("3' OR '1'='1", ["Pre-final year"]) is True  # has 3
        assert check_year_match("<script>alert(1)</script>", ["Pre-final year"]) is False

