-- Shopping list: is an item "running low" or "out" (none left)?
-- Run this ONCE on the Azure SQL database (e.g. in Azure Data Studio or the Azure portal Query editor).
-- Run it BEFORE starting the new backend: the backend reads grocery_item.status, so the
-- Shared groceries page gives an error until this column exists.
-- Items already on the list become "low".

ALTER TABLE grocery_item ADD
    status VARCHAR(10) NOT NULL
        CONSTRAINT DF_grocery_item_status DEFAULT 'low'
        CONSTRAINT CK_grocery_item_status CHECK (status IN ('low', 'out'));
