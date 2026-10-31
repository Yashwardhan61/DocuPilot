import pytest
from app.services.eligibility import check_year_match, evaluate_eligibility

def test_pre_final_year_matches_3rd_year():
    # 3rd year student should match "Pre-final year"
    assert check_year_match("3rd", ["Pre-final year"]) is True
    assert check_year_match("3rd Year", ["Pre-final year"]) is True
    assert check_year_match("3", ["Pre-final year"]) is True
    assert check_year_match("3rd", ["pre-final"]) is True
    assert check_year_match("3rd", ["pre final"]) is True
    assert check_year_match("3rd", ["prefinal year"]) is True
    assert check_year_match("3rd", ["penultimate year"]) is True

def test_final_year_matches_4th_year():
    # 4th year student should match "Final year"
    assert check_year_match("4th", ["Final year"]) is True
    assert check_year_match("4th Year", ["Final year"]) is True
    assert check_year_match("4", ["Final year"]) is True
    assert check_year_match("4th", ["graduating batch"]) is True

def test_mismatched_years():
    # 4th year is NOT pre-final year; 3rd year is NOT final year
    assert check_year_match("4th", ["Pre-final year"]) is False
    assert check_year_match("3rd", ["Final year"]) is False
    assert check_year_match("1st", ["Pre-final year"]) is False

def test_multiple_allowed_years():
    # Multi-year lists
    assert check_year_match("3rd", ["Pre-final year", "Final year"]) is True
    assert check_year_match("4th", ["Pre-final year", "Final year"]) is True
    assert check_year_match("2nd", ["Pre-final year", "Final year"]) is False

def test_wildcard_all_years():
    assert check_year_match("1st", ["All years"]) is True
    assert check_year_match("3rd", ["Open to all"]) is True
    assert check_year_match("4th", []) is True

def test_trilogy_innovations_eligibility():
    profile = {
        "branch": "CSE",
        "year": "3rd",
        "cgpa": 8.0,
        "active_backlogs": False
    }
    rules = {
        "branches": ["B.Tech - All", "M.Tech - All", "MCA", "MSC"],
        "years": ["Pre-final year"],
        "min_cgpa": 0.0,
        "other_conditions": ["No CPI criteria", "No active Backlogs"]
    }
    result = evaluate_eligibility(profile, rules)
    assert result.eligible is True
    assert result.branch_eligible is True
    assert result.year_eligible is True
    assert result.cgpa_eligible is True
    assert not any("not eligible" in r.lower() for r in result.reasons)

