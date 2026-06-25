-- Mottis Coffee Admin Panel — Migration
-- Mevcut veritabanına admin panel desteği ekler.
-- Çalıştır: psql $DATABASE_URL -f schema_admin_migration.sql

-- ─────────────────────────────────────────────
-- STORES: yeni alanlar
-- ─────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
  -- open | closed | temporarily_closed

-- ─────────────────────────────────────────────
-- STAFF: yeni alanlar (barista yönetimi)
-- ─────────────────────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(80) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─────────────────────────────────────────────
-- CAMPAIGNS: yeni alanlar
-- ─────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'other';
  -- discount | free_product | bonus_points | other
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
  -- draft | active | past

-- ─────────────────────────────────────────────
-- CAMPAIGN ↔ STORE (Çoklu şube desteği)
-- Mevcut store_id alanını koruyor, ek olarak junction table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_stores (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, store_id)
);

-- Mevcut store_id verilerini campaign_stores'a taşı
INSERT INTO campaign_stores (campaign_id, store_id)
SELECT id, store_id FROM campaigns WHERE store_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- CAMPAIGN ↔ PRODUCT (Geçerli ürünler)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

-- ─────────────────────────────────────────────
-- MENU ITEMS: yeni alanlar
-- ─────────────────────────────────────────────
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories INT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────
-- SETTINGS (Singleton — işletme ayarları)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name   VARCHAR(200) NOT NULL DEFAULT 'Mottis Coffee',
  logo_url        TEXT,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  website         VARCHAR(255),
  stamps_per_reward INT NOT NULL DEFAULT 8,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (business_name, stamps_per_reward)
VALUES ('Mottis Coffee', 8)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_store     ON staff(store_id);
CREATE INDEX IF NOT EXISTS idx_staff_role      ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_username  ON staff(username);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_stamps_created  ON stamps(created_at);
CREATE INDEX IF NOT EXISTS idx_stores_status   ON stores(status);
