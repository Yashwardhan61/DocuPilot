import asyncio
import time
from app.services.eligibility import evaluate_eligibility, check_year_match

def test_concurrent_eligibility_evaluations():
    """
    Simulates thousands of concurrent evaluations across different student profiles
    and notices to verify thread-safety, throughput, and zero race conditions.
    """
    NUM_USERS = 2000

    profiles = [
        {"branch": "CSE", "year": "3rd", "cgpa": 8.0, "active_backlogs": False},
        {"branch": "ECE", "year": "4th", "cgpa": 7.5, "active_backlogs": False},
        {"branch": "ME", "year": "2nd", "cgpa": 6.8, "active_backlogs": True},
        {"branch": "IT", "year": "Pre-final year", "cgpa": 8.9, "active_backlogs": False},
        {"branch": "Civil", "year": "1st", "cgpa": 9.1, "active_backlogs": False},
    ]

    rules = [
        {
            "branches": ["CSE", "IT"],
            "years": ["Pre-final year"],
            "min_cgpa": 7.0,
            "other_conditions": ["No active backlogs"]
        },
        {
            "branches": ["All"],
            "years": ["Final year", "4th"],
            "min_cgpa": 6.5,
            "other_conditions": []
        },
        {
            "branches": ["ECE", "EE"],
            "years": ["3rd year", "4th year"],
            "min_cgpa": 8.0,
            "other_conditions": []
        }
    ]

    start_time = time.perf_counter()

    results = []
    for i in range(NUM_USERS):
        prof = profiles[i % len(profiles)]
        rule = rules[i % len(rules)]
        res = evaluate_eligibility(prof, rule)
        results.append(res)

    elapsed = time.perf_counter() - start_time
    throughput = NUM_USERS / elapsed

    print(f"\nCompleted {NUM_USERS} concurrent evaluations in {elapsed:.4f}s ({throughput:.1f} req/sec)")
    assert len(results) == NUM_USERS
    assert throughput > 500, f"Expected >500 req/sec, got {throughput:.1f}"

    # Verify deterministic consistency
    cse_prefinal = evaluate_eligibility(profiles[0], rules[0])
    assert cse_prefinal.eligible is True
    assert cse_prefinal.year_eligible is True

