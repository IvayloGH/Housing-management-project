"""Rules for shared expenses. Plain Python, no database."""
from decimal import Decimal


def split_evenly(amount: Decimal, people: list[int]) -> dict[int, Decimal]:
    """Split an amount in cents so the shares always add up exactly.
    €10.00 between 3 people -> 3.34 + 3.33 + 3.33
    """
    cents = int(amount * 100)
    base, extra = divmod(cents, len(people))
    return {
        person: Decimal(base + (1 if i < extra else 0)) / 100
        for i, person in enumerate(people)
    }