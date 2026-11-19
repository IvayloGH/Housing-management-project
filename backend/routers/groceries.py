from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import GroceryItem, Tenant, User
from schemas import GroceryCreate, GroceryOut
from security import require_role  # Eszter's
from deps import get_my_house_id

router = APIRouter(prefix="/groceries", tags=["Groceries"])


def get_item_in_my_house(db: Session, item_id: int, house_id: int) -> GroceryItem:
    """Get an item, but only if it belongs to the user's own house."""
    item = db.get(GroceryItem, item_id)
    if item is None or item.house_id != house_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


@router.get("", response_model=list[GroceryOut])
def list_groceries(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    house_id = get_my_house_id(db, user)
    query = (
        select(GroceryItem)
        .where(GroceryItem.house_id == house_id)
        .order_by(GroceryItem.is_bought, GroceryItem.name)
    )
    return db.scalars(query).all()


@router.post("", response_model=GroceryOut, status_code=status.HTTP_201_CREATED)
def add_grocery(data: GroceryCreate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    item = GroceryItem(house_id=get_my_house_id(db, user), name=data.name, quantity=data.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}/bought", response_model=GroceryOut)
def mark_bought(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    item = get_item_in_my_house(db, item_id, get_my_house_id(db, user))
    item.is_bought = True
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grocery(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    item = get_item_in_my_house(db, item_id, get_my_house_id(db, user))
    db.delete(item)
    db.commit()