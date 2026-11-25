"""Chore rotation: decides who does which chore on which day.

Plain Python, no database, so it is easy to test.
The router will later save the result as ChoreAssignment rows.
"""
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta

# A fixed Monday. Every turn is counted from this day, so the rotation
# continues correctly from one month to the next without remembering anything.
START = date(2026, 1, 5)


@dataclass
class PlannedChore:
    chore_id: int
    tenant_id: int
    due_date: date


def days_in_month(year: int, month: int) -> list[date]:
    first = date(year, month, 1)
    return [first + timedelta(days=i) for i in range(monthrange(year, month)[1])]


def turn_number(frequency: str, day: date) -> int:
    """How many times the chore has come round since START (can be negative before START)."""
    days_since_start = (day - START).days
    if frequency == "DAILY":
        return days_since_start
    if frequency == "WEEKLY":
        return days_since_start // 7
    if frequency == "BIWEEKLY":
        return days_since_start // 14
    if frequency == "MONTHLY":
        return (day.year - START.year) * 12 + (day.month - START.month)
    raise ValueError(f"Unknown frequency: {frequency}")


def due_dates(frequency: str, year: int, month: int) -> list[date]:
    """The days in this month on which the chore has to be done."""
    days = days_in_month(year, month)
    mondays = [d for d in days if d.weekday() == 0]
    if frequency == "DAILY":
        return days
    if frequency == "WEEKLY":
        return mondays
    if frequency == "BIWEEKLY":
        return [d for d in mondays if ((d - START).days // 7) % 2 == 0]
    if frequency == "MONTHLY":
        return mondays[:1]
    raise ValueError(f"Unknown frequency: {frequency}")


def plan_month(year: int, month: int, chores: list[tuple[int, str]], tenant_ids: list[int]) -> list[PlannedChore]:
    """Who does what in this month.

    chores:     [(chore_id, frequency), ...]  for one house
    tenant_ids: the user_ids of the tenants in that house
    """
    if not tenant_ids:
        return []
    tenants = sorted(tenant_ids)
    plan = []
    for position, (chore_id, frequency) in enumerate(sorted(chores)):
        for day in due_dates(frequency, year, month):
            # next person each time the chore comes round; each chore starts at a different person
            who = tenants[(turn_number(frequency, day) + position) % len(tenants)]
            plan.append(PlannedChore(chore_id, who, day))
    return plan


if __name__ == "__main__":
    # quick demo: python -m services.chore_service
    names = {11: "Anna", 12: "Ben", 13: "Chloe"}
    chores = [(1, "WEEKLY"), (2, "WEEKLY"), (3, "WEEKLY")]
    titles = {1: "Bathroom", 2: "Kitchen", 3: "Trash"}
    for p in plan_month(2026, 12, chores, list(names)):
        print(p.due_date, titles[p.chore_id].ljust(9), names[p.tenant_id])