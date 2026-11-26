from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy import insert, inspect, select
from sqlalchemy.orm import Session, undefer

from database import get_db
from models import GroceryItem, Tenant, User
from schemas import GroceryCreate, GroceryOut, GroceryStatusUpdate
from security import require_role  # Eszter's
from deps import get_my_house_id

router = APIRouter(prefix="/groceries", tags=["Groceries"])

# The "status" column (running low / out) is made by add_grocery_status.sql.
# Until Razvan has run it on Azure, the list keeps working and every item shows as "low".
_status_column_ready = False


def status_column_ready(db: Session) -> bool:
    """Does grocery_item.status exist yet? Once it does, we stop checking."""
    global _status_column_ready
    if not _status_column_ready:
        columns = inspect(db.connection()).get_columns("grocery_item")
        _status_column_ready = any(c["name"].lower() == "status" for c in columns)
    return _status_column_ready


def to_out(item: GroceryItem, ready: bool) -> GroceryOut:
    return GroceryOut(
        item_id=item.item_id,
        name=item.name,
        quantity=item.quantity,
        status=item.status if ready else "low",
        is_bought=item.is_bought,
    )


def get_item_in_my_house(db: Session, item_id: int, house_id: int, ready: bool) -> GroceryItem:
    """Get an item, but only if it belongs to the user's own house."""
    item = db.get(GroceryItem, item_id, options=[undefer(GroceryItem.status)] if ready else [])
    if item is None or item.house_id != house_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


@router.get("", response_model=list[GroceryOut])
def list_groceries(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    house_id = get_my_house_id(db, user)
    ready = status_column_ready(db)
    query = (
        select(GroceryItem)
        .where(GroceryItem.house_id == house_id)
        .order_by(GroceryItem.is_bought, GroceryItem.name)
    )
    if ready:
        query = query.options(undefer(GroceryItem.status))
    return [to_out(item, ready) for item in db.scalars(query).all()]


@router.post("", response_model=GroceryOut, status_code=status.HTTP_201_CREATED)
def add_grocery(data: GroceryCreate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    house_id = get_my_house_id(db, user)
    if not status_column_ready(db):
        # Without the status column: a plain INSERT that leaves status out, shown as "low"
        item_id = db.scalar(
            insert(GroceryItem)
            .values(house_id=house_id, name=data.name, quantity=data.quantity)
            .returning(GroceryItem.item_id)
        )
        db.commit()
        return to_out(db.get(GroceryItem, item_id), ready=False)
    item = GroceryItem(house_id=house_id, name=data.name, quantity=data.quantity, status=data.status)
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_out(item, ready=True)


@router.put("/{item_id}/status", response_model=GroceryOut)
def change_status(item_id: int, data: GroceryStatusUpdate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """Running low <-> out."""
    ready = status_column_ready(db)
    if not ready:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "Running low / out needs a small database update first (add_grocery_status.sql).")
    item = get_item_in_my_house(db, item_id, get_my_house_id(db, user), ready)
    item.status = data.status
    db.commit()
    db.refresh(item)
    return to_out(item, ready)


@router.put("/{item_id}/bought", response_model=GroceryOut)
def mark_bought(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    ready = status_column_ready(db)
    item = get_item_in_my_house(db, item_id, get_my_house_id(db, user), ready)
    item.is_bought = True
    db.commit()
    db.refresh(item)
    return to_out(item, ready)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grocery(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    item = get_item_in_my_house(db, item_id, get_my_house_id(db, user), status_column_ready(db))
    db.delete(item)
    db.commit()
