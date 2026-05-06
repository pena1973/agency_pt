ALTER TABLE properties ADD COLUMN district TEXT NOT NULL DEFAULT '';
ALTER TABLE properties ADD COLUMN country TEXT NOT NULL DEFAULT 'Португалия';
ALTER TABLE properties ADD COLUMN agent_name TEXT NOT NULL DEFAULT '';

ALTER TABLE property_details ADD COLUMN guest_bathrooms INTEGER;
ALTER TABLE property_details ADD COLUMN monthly_condo_fee_eur REAL;
