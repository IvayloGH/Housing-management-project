"""Tests for the chore rotation. Run with: python -m pytest"""
from collections import Counter
from datetime import date

import pytest

from services.chore_service import due_dates, next_turns, plan_month, take_turns

ANNA, BEN, CHLOE = 11, 12, 13
TENANTS = [ANNA, BEN, CHLOE]
BATHROOM, KITCHEN, TRASH = 1, 2, 3
WEEKLY_CHORES = [(BATHROOM, "WEEKLY"), (KITCHEN, "WEEKLY"), (TRASH, "WEEKLY")]


def who_does(plan, chore_id):
    """The tenants for one chore, in date order."""
    return [p.tenant_id for p in sorted(plan, key=lambda p: p.due_date) if p.chore_id == chore_id]


def test_turns_go_round_the_house():
    plan = plan_month(2026, 12, WEEKLY_CHORES, TENANTS)
    assert who_does(plan, BATHROOM) == [ANNA, BEN, CHLOE, ANNA]
    assert who_does(plan, KITCHEN) == [BEN, CHLOE, ANNA, BEN]
    assert who_does(plan, TRASH) == [CHLOE, ANNA, BEN, CHLOE]


def test_nobody_has_two_chores_in_the_same_week():
    plan = plan_month(2026, 12, WEEKLY_CHORES, TENANTS)
    for day in {p.due_date for p in plan}:
        people_that_day = [p.tenant_id for p in plan if p.due_date == day]
        assert sorted(people_that_day) == sorted(TENANTS)


def test_fair_over_a_whole_year():
    count = Counter()
    for month in range(1, 13):
        for p in plan_month(2027, month, WEEKLY_CHORES, TENANTS):
            count[p.tenant_id] += 1
    assert max(count.values()) - min(count.values()) <= 1


def test_rotation_continues_from_one_month_to_the_next():
    november = who_does(plan_month(2026, 11, [(BATHROOM, "WEEKLY")], TENANTS), BATHROOM)
    december = who_does(plan_month(2026, 12, [(BATHROOM, "WEEKLY")], TENANTS), BATHROOM)
    last_in_november = TENANTS.index(november[-1])
    first_in_december = TENANTS.index(december[0])
    assert first_in_december == (last_in_november + 1) % len(TENANTS)


def test_same_month_always_gives_the_same_plan():
    assert plan_month(2026, 12, WEEKLY_CHORES, TENANTS) == plan_month(2026, 12, WEEKLY_CHORES, TENANTS)


def test_order_of_input_does_not_matter():
    a = plan_month(2026, 12, WEEKLY_CHORES, [ANNA, BEN, CHLOE])
    b = plan_month(2026, 12, list(reversed(WEEKLY_CHORES)), [CHLOE, ANNA, BEN])
    assert a == b


def test_empty_house_gets_no_plan():
    assert plan_month(2026, 12, WEEKLY_CHORES, []) == []


def test_one_tenant_does_everything():
    plan = plan_month(2026, 12, WEEKLY_CHORES, [ANNA])
    assert {p.tenant_id for p in plan} == {ANNA}


@pytest.mark.parametrize("frequency, expected", [
    ("DAILY", 31),       # every day of December
    ("WEEKLY", 4),       # Mondays 7, 14, 21, 28
    ("BIWEEKLY", 2),     # every other Monday
    ("MONTHLY", 1),      # first Monday
])
def test_number_of_due_dates_in_december(frequency, expected):
    assert len(due_dates(frequency, 2026, 12)) == expected


def test_weekly_chores_are_on_mondays():
    assert all(d.weekday() == 0 for d in due_dates("WEEKLY", 2026, 12))


def test_monthly_chore_is_on_the_first_monday():
    assert due_dates("MONTHLY", 2026, 12) == [date(2026, 12, 7)]


def test_unknown_frequency_is_refused():
    with pytest.raises(ValueError):
        due_dates("YEARLY", 2026, 12)


# ---------- take_turns: used by 'Add a chore' ----------

def test_chosen_person_starts_then_next_housemate():
    assert take_turns(TENANTS, BEN, 4) == [BEN, CHLOE, ANNA, BEN]


def test_take_turns_order_of_input_does_not_matter():
    assert take_turns([CHLOE, ANNA, BEN], ANNA, 3) == take_turns(TENANTS, ANNA, 3) == [ANNA, BEN, CHLOE]


def test_take_turns_is_fair():
    count = Counter(take_turns(TENANTS, CHLOE, 30))
    assert set(count.values()) == {10}


def test_one_turn_is_only_the_chosen_person():
    assert take_turns(TENANTS, CHLOE, 1) == [CHLOE]


def test_alone_in_the_house_does_every_turn():
    assert take_turns([ANNA], ANNA, 3) == [ANNA, ANNA, ANNA]


def test_take_turns_refuses_someone_from_another_house():
    with pytest.raises(ValueError):
        take_turns(TENANTS, 99, 2)


# ---------- next_turns: keeps repeating chores planned ----------

def test_next_turns_continues_with_the_next_person():
    turns = next_turns(date(2026, 12, 1), BEN, 7, TENANTS, until=date(2026, 12, 22))
    assert turns == [(date(2026, 12, 8), CHLOE), (date(2026, 12, 15), ANNA), (date(2026, 12, 22), BEN)]


def test_next_turns_every_two_weeks():
    turns = next_turns(date(2026, 12, 1), ANNA, 14, TENANTS, until=date(2027, 1, 12))
    assert turns == [(date(2026, 12, 15), BEN), (date(2026, 12, 29), CHLOE), (date(2027, 1, 12), ANNA)]


def test_next_turns_nothing_when_already_planned_far_enough():
    assert next_turns(date(2026, 12, 22), ANNA, 7, TENANTS, until=date(2026, 12, 22)) == []


def test_next_turns_when_last_person_moved_out_starts_at_the_first():
    assert next_turns(date(2026, 12, 1), 99, 7, TENANTS, until=date(2026, 12, 8)) == [(date(2026, 12, 8), ANNA)]


def test_next_turns_empty_house():
    assert next_turns(date(2026, 12, 1), ANNA, 7, [], until=date(2027, 1, 1)) == []

# ---------- 'Every month' ----------
from services.chore_service import add_months, is_monthly_repeat, monthly_days  # noqa: E402


def test_add_months_keeps_the_day_or_uses_the_last_day():
    assert add_months(date(2026, 11, 26), 1) == date(2026, 12, 26)
    assert add_months(date(2026, 12, 15), 1) == date(2027, 1, 15)
    assert add_months(date(2027, 1, 31), 1) == date(2027, 2, 28)
    assert add_months(date(2027, 1, 31), 2) == date(2027, 3, 31)


def test_monthly_days_for_twelve_weeks():
    assert monthly_days(date(2026, 11, 26), date(2027, 2, 18)) == [
        date(2026, 11, 26), date(2026, 12, 26), date(2027, 1, 26),
    ]


def test_once_chores_are_not_monthly_repeats():
    assert not is_monthly_repeat([date(2026, 11, 26)])
    assert not is_monthly_repeat([date(2026, 11, 2), date(2026, 11, 26)])
    assert is_monthly_repeat([date(2026, 11, 26), date(2026, 12, 26)])
    assert is_monthly_repeat([date(2027, 1, 31), date(2027, 2, 28)])
