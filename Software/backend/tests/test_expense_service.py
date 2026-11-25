"""Tests for splitting expenses. Run with: python -m pytest"""
from decimal import Decimal

import pytest

from services.expense_service import split_evenly


def test_ten_euro_between_three_people():
    shares = split_evenly(Decimal("10.00"), [1, 2, 3])
    assert shares == {1: Decimal("3.34"), 2: Decimal("3.33"), 3: Decimal("3.33")}


def test_even_split():
    assert split_evenly(Decimal("12.00"), [1, 2, 3, 4]) == {p: Decimal("3.00") for p in [1, 2, 3, 4]}


def test_one_cent_between_four_people():
    shares = split_evenly(Decimal("0.01"), [1, 2, 3, 4])
    assert sum(shares.values()) == Decimal("0.01")


@pytest.mark.parametrize("amount", ["0.01", "9.99", "10.00", "33.33", "100.01", "1234.57"])
@pytest.mark.parametrize("people", [1, 2, 3, 4, 7])
def test_shares_always_add_up_and_differ_by_at_most_one_cent(amount, people):
    shares = list(split_evenly(Decimal(amount), list(range(people))).values())
    assert sum(shares) == Decimal(amount)
    assert max(shares) - min(shares) <= Decimal("0.01")


def test_everyone_gets_a_share():
    assert set(split_evenly(Decimal("5.00"), [7, 8, 9])) == {7, 8, 9}