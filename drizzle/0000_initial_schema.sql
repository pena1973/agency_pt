CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('realtor', 'client')),
  created_at INTEGER NOT NULL,
  last_active_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('sale', 'rent')),
  property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'studio', 'room', 'villa', 'townhouse', 'penthouse', 'land', 'duplex', 'loft')),
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Португалия',
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  price_amount INTEGER NOT NULL DEFAULT 0,
  price_label TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  area_m2 REAL NOT NULL DEFAULT 0,
  agent_name TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  has_sea_view INTEGER NOT NULL DEFAULT 0,
  has_city_center INTEGER NOT NULL DEFAULT 0,
  has_parking INTEGER NOT NULL DEFAULT 0,
  has_pool INTEGER NOT NULL DEFAULT 0,
  has_security INTEGER NOT NULL DEFAULT 0,
  has_furnished INTEGER NOT NULL DEFAULT 0,
  has_balcony INTEGER NOT NULL DEFAULT 0,
  has_terrace INTEGER NOT NULL DEFAULT 0,
  has_storage_room INTEGER NOT NULL DEFAULT 0,
  has_elevator INTEGER NOT NULL DEFAULT 0,
  has_equipped_kitchen INTEGER NOT NULL DEFAULT 0,
  has_built_in_wardrobes INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_unique ON properties (slug);
CREATE INDEX IF NOT EXISTS properties_mode_idx ON properties (mode);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON properties (property_type);
CREATE INDEX IF NOT EXISTS properties_city_idx ON properties (city);
CREATE INDEX IF NOT EXISTS properties_is_active_idx ON properties (is_active);

CREATE TABLE IF NOT EXISTS property_details (
  property_id TEXT PRIMARY KEY NOT NULL,
  usable_area_m2 REAL,
  built_area_m2 REAL,
  bathrooms_full INTEGER,
  plot_area_m2 REAL,
  floor TEXT,
  building_floors INTEGER,
  parking_spaces INTEGER,
  balcony_count INTEGER,
  terrace_count INTEGER,
  year_built INTEGER,
  condition TEXT CHECK(condition IN ('new_build', 'excellent', 'good', 'needs_renovation')),
  heating TEXT CHECK(heating IN ('central', 'underfloor', 'electric', 'heat_pump', 'gas_boiler', 'none')),
  energy_rating TEXT CHECK(energy_rating IN ('A+', 'A', 'B', 'B-', 'C', 'D')),
  orientation TEXT,
  exterior INTEGER,
  elevator INTEGER,
  storage_room INTEGER,
  built_in_wardrobes INTEGER,
  equipped_kitchen INTEGER,
  furnished INTEGER,
  accessibility_adapted INTEGER,
  guest_bathrooms INTEGER,
  monthly_condo_fee_eur REAL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_images (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'original' CHECK(source_type IN ('original', 'ai_generated')),
  room_type TEXT CHECK(room_type IN ('bedroom', 'living_room', 'kids_room', 'office', 'kitchen', 'bathroom', 'hall', 'other')),
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS property_images_property_id_idx ON property_images (property_id);
CREATE INDEX IF NOT EXISTS property_images_sort_order_idx ON property_images (property_id, sort_order);

CREATE TABLE IF NOT EXISTS property_transport (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL,
  transport_mode TEXT NOT NULL CHECK(transport_mode IN ('metro', 'bus', 'tram', 'train', 'ferry')),
  route_name TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  minutes_walk INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS property_transport_property_id_idx ON property_transport (property_id);

CREATE TABLE IF NOT EXISTS property_tax_profiles (
  property_id TEXT PRIMARY KEY NOT NULL,
  property_transfer_tax_rate REAL,
  stamp_duty_rate REAL,
  notary_estimate_rate REAL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS favorites_property_id_idx ON favorites (property_id);

CREATE TABLE IF NOT EXISTS compare_items (
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS compare_items_property_id_idx ON compare_items (property_id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mode TEXT CHECK(mode IN ('sale', 'rent')),
  city TEXT,
  property_type TEXT CHECK(property_type IN ('apartment', 'studio', 'room', 'villa', 'townhouse', 'penthouse', 'land', 'duplex', 'loft')),
  price_from INTEGER,
  price_to INTEGER,
  bedrooms TEXT,
  has_sea_view INTEGER NOT NULL DEFAULT 0,
  has_city_center INTEGER NOT NULL DEFAULT 0,
  has_parking INTEGER NOT NULL DEFAULT 0,
  has_pool INTEGER NOT NULL DEFAULT 0,
  has_security INTEGER NOT NULL DEFAULT 0,
  has_furnished INTEGER NOT NULL DEFAULT 0,
  has_balcony INTEGER NOT NULL DEFAULT 0,
  has_terrace INTEGER NOT NULL DEFAULT 0,
  has_storage_room INTEGER NOT NULL DEFAULT 0,
  has_elevator INTEGER NOT NULL DEFAULT 0,
  has_equipped_kitchen INTEGER NOT NULL DEFAULT 0,
  has_built_in_wardrobes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON saved_searches (user_id);
CREATE INDEX IF NOT EXISTS saved_searches_created_at_idx ON saved_searches (created_at);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  property_id TEXT,
  property_reference_id TEXT,
  property_slug TEXT,
  property_title TEXT,
  source TEXT NOT NULL CHECK(source IN ('catalog_request', 'property_request')),
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed')),
  name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  message TEXT,
  search_type TEXT,
  location TEXT,
  area_and_typology TEXT,
  must_have TEXT,
  messenger_whatsapp INTEGER NOT NULL DEFAULT 0,
  messenger_telegram INTEGER NOT NULL DEFAULT 0,
  messenger_viber INTEGER NOT NULL DEFAULT 0,
  messenger_signal INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at);
CREATE INDEX IF NOT EXISTS inquiries_user_id_idx ON inquiries (user_id);
CREATE INDEX IF NOT EXISTS inquiries_property_id_idx ON inquiries (property_id);

CREATE TABLE IF NOT EXISTS admin_uploaded_photos (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  room_type TEXT CHECK(room_type IN ('bedroom', 'living_room', 'kids_room', 'office', 'kitchen', 'bathroom', 'hall', 'other')),
  selected_for_ai INTEGER NOT NULL DEFAULT 0,
  selected_for_gallery INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS admin_uploaded_photos_property_id_idx ON admin_uploaded_photos (property_id);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL,
  source_photo_id TEXT,
  palette TEXT NOT NULL CHECK(palette IN ('light', 'warm', 'dark', 'pastel', 'scandinavian')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (source_photo_id) REFERENCES admin_uploaded_photos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_property_id_idx ON ai_generation_jobs (property_id);
CREATE INDEX IF NOT EXISTS ai_generation_jobs_source_photo_id_idx ON ai_generation_jobs (source_photo_id);

CREATE TABLE IF NOT EXISTS ai_generation_results (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  selected_for_gallery INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES ai_generation_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ai_generation_results_job_id_idx ON ai_generation_results (job_id);
