-- ═══════════════════════════════════════════════════════════════
-- Mottis Coffee — Eksik Tablo ve Kolon Migrasyonu
-- DBeaver'da calistir veya: node run-migration.js
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- CAMPAIGNS: eksik kolonlar
-- ─────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'other';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- ─────────────────────────────────────────────
-- STORES: eksik kolonlar
-- ─────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';

-- ─────────────────────────────────────────────
-- MENU_ITEMS: eksik kolonlar
-- ─────────────────────────────────────────────
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories INT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────
-- CUSTOMERS: eksik kolonlar (musteri uygulamasi icin)
-- ─────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'tr';

-- ─────────────────────────────────────────────
-- CAMPAIGN_STORES (Kampanya <-> Sube junction)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_stores (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, store_id)
);

-- ─────────────────────────────────────────────
-- CAMPAIGN_PRODUCTS (Kampanya <-> Urun junction)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

-- ─────────────────────────────────────────────
-- SETTINGS (Singleton — isletme ayarlari)
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
-- REVIEWS (Sube Yorumlari)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id               SERIAL PRIMARY KEY,
  customer_id      INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_id         INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating           INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title            VARCHAR(100),
  content          TEXT NOT NULL,
  photos           TEXT[],
  is_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  admin_reply      TEXT,
  admin_replied_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- REVIEW_VOTES (Faydali / Faydasiz)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_votes (
  id          SERIAL PRIMARY KEY,
  review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  is_helpful  BOOLEAN NOT NULL,
  UNIQUE(review_id, customer_id)
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS (Bildirim Gecmisi)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATION_PREFERENCES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  coffee_updates  BOOLEAN NOT NULL DEFAULT TRUE,
  campaign_news   BOOLEAN NOT NULL DEFAULT TRUE,
  branch_updates  BOOLEAN NOT NULL DEFAULT TRUE,
  general_updates BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- FAQS (Sikca Sorulan Sorular)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          SERIAL PRIMARY KEY,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BUG_REPORTS (Sorun Bildir)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bug_reports (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  screenshot  TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_status       ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_stores_status           ON stores(status);
CREATE INDEX IF NOT EXISTS idx_reviews_store            ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer         ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved         ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_notifications_customer   ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_customer     ON bug_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamps_created           ON stamps(created_at);
