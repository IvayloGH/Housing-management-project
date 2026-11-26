-- Rooms per house (Kitchen, Bathroom 1, ...), typed by the manager on "Houses & team".
-- Run this ONCE on the Azure SQL database (e.g. in Azure Data Studio or the Azure portal Query editor).
-- Until it is run, the app keeps working; houses just have no rooms yet.

CREATE TABLE house_room (
    room_id  INT IDENTITY(1,1) PRIMARY KEY,
    house_id INT NOT NULL REFERENCES house(house_id) ON DELETE CASCADE,
    name     NVARCHAR(50) NOT NULL
);

CREATE INDEX ix_house_room_house ON house_room(house_id);
