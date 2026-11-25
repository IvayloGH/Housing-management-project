from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import get_my_house_id
from models import Expense, ExpenseShare, Tenant, User
from schemas import BalanceOut, ExpenseCreate, ExpenseOut, ShareOut
from services.expense_service import split_evenly
from security import require_role  # Eszter's

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def housemates(db: Session, house_id: int) -> dict[int, str]:
    """Everyone living in a house, as {user_id: name}."""
    rows = db.execute(
        select(User.user_id, User.name)
        .join(Tenant, Tenant.user_id == User.user_id)
        .where(Tenant.house_id == house_id)
    ).all()
    return dict(rows)

def expense_out(db: Session, expense: Expense) -> ExpenseOut:
    """One expense + its shares, with names, ready to send to the frontend."""
    rows = db.execute(
        select(ExpenseShare, User.name)
        .join(User, User.user_id == ExpenseShare.tenant_id)
        .where(ExpenseShare.expense_id == expense.expense_id)
    ).all()
    return ExpenseOut(
        expense_id=expense.expense_id,
        description=expense.description,
        amount=expense.amount,
        spent_on=expense.spent_on,
        paid_by=expense.paid_by,
        paid_by_name=db.get(User, expense.paid_by).name,
        shares=[
            ShareOut(tenant_id=s.tenant_id, tenant_name=name, amount_owed=s.amount_owed, is_settled=s.is_settled)
            for s, name in rows
        ],
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def register_purchase(data: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    people_in_house = housemates(db, get_my_house_id(db, user))

    # Default: split between everyone in the house. dict.fromkeys removes duplicates.
    people = list(dict.fromkeys(data.split_between or people_in_house))
    if not people or any(p not in people_in_house for p in people):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can only split with people from your house")

    expense = Expense(
        paid_by=user.user_id,
        description=data.description,
        amount=data.amount,
        spent_on=data.spent_on or date.today(),
    )
    db.add(expense)
    db.flush()  # sends the INSERT now, so expense.expense_id exists, but doesn't commit yet

    for tenant_id, owed in split_evenly(data.amount, people).items():
        db.add(ExpenseShare(
            expense_id=expense.expense_id,
            tenant_id=tenant_id,
            amount_owed=owed,
            is_settled=(tenant_id == user.user_id),  # the payer doesn't owe themselves
        ))

    db.commit()  # expense + all shares are saved together, or nothing is
    return expense_out(db, expense)


@router.get("", response_model=list[ExpenseOut])
def house_expenses(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    expenses = db.scalars(
        select(Expense)
        .join(Tenant, Tenant.user_id == Expense.paid_by)
        .where(Tenant.house_id == get_my_house_id(db, user))
        .order_by(Expense.spent_on.desc(), Expense.expense_id.desc())
    ).all()
    return [expense_out(db, e) for e in expenses]


@router.get("/balances", response_model=list[BalanceOut])
def balances(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """How much each resident is owed (+) or owes (-), counting only unsettled shares."""
    people = housemates(db, get_my_house_id(db, user))
    totals = {tenant_id: Decimal("0.00") for tenant_id in people}

    open_shares = db.execute(
        select(ExpenseShare.tenant_id, ExpenseShare.amount_owed, Expense.paid_by)
        .join(Expense, Expense.expense_id == ExpenseShare.expense_id)
        .where(ExpenseShare.is_settled == False)  # noqa: E712
        .where(Expense.paid_by.in_(list(people)))
    ).all()

    for debtor, owed, payer in open_shares:
        totals[payer] += owed
        if debtor in totals:
            totals[debtor] -= owed

    return [
        BalanceOut(tenant_id=t, tenant_name=people[t], is_me=(t == user.user_id), balance=b)
        for t, b in totals.items()
    ]


@router.put("/{expense_id}/shares/{tenant_id}/settle", response_model=ExpenseOut)
def settle_share(expense_id: int, tenant_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """Mark one share as paid back.
    Allowed for the person who paid ('Paid me back') and for the person who owes it ('PAY')."""
    expense = db.get(Expense, expense_id)
    if expense is None or user.user_id not in (expense.paid_by, tenant_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")

    share = db.get(ExpenseShare, (expense_id, tenant_id))
    if share is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    if share.is_settled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already settled")

    share.is_settled = True
    db.commit()
    return expense_out(db, expense)