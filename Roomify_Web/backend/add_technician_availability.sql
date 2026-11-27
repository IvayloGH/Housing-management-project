-- When and where a technician works (days, hours, cities), set on the technician's "My profile" page.
-- Run this ONCE on the Azure SQL database (e.g. in Azure Data Studio or the Azure portal Query editor).
-- Until it is run, the app keeps working; technicians just can't save their availability yet.

ALTER TABLE technician ADD
    work_days   NVARCHAR(30)  NULL,  -- "Mon,Tue,Wed"
    work_from   CHAR(5)       NULL,  -- "08:00"
    work_until  CHAR(5)       NULL,  -- "17:00"
    work_cities NVARCHAR(255) NULL;  -- "Eindhoven,Veldhoven"
