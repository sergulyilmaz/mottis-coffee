-- Mottis Coffee Loyalty App — PostgreSQL Schema
-- Run: psql $DATABASE_URL -f schema.sql

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- STORES (Şubeler)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  address      TEXT NOT NULL,
  district     VARCHAR(100),
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  phone        VARCHAR(20),
  email        VARCHAR(255),
  working_hours VARCHAR(100),
  image_url    TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'open',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CUSTOMERS (Müşteriler)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  birth_date    DATE,
  gender        VARCHAR(10),
  profile_photo TEXT,
  dark_mode     BOOLEAN NOT NULL DEFAULT FALSE,
  language      VARCHAR(5) NOT NULL DEFAULT 'tr',
  fcm_token     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- STAFF (Barista / Yönetici)
-- ─────────────────────────────────────────────
CREATE TYPE staff_role AS ENUM ('barista', 'manager');

CREATE TABLE IF NOT EXISTS staff (
  id            SERIAL PRIMARY KEY,
  store_id      INT REFERENCES stores(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  username      VARCHAR(80) UNIQUE,
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          staff_role NOT NULL DEFAULT 'barista',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  start_date    DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- STAMPS (Pullar)
-- Her kayıt = 1 kahve alımı
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stamps (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_id    INT REFERENCES stores(id) ON DELETE SET NULL,
  staff_id    INT REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- REWARDS (İkram Kahve Hakları)
-- 8 pul tamamlanınca otomatik oluşur
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id            SERIAL PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  redeemed_at   TIMESTAMPTZ,                    -- NULL = henüz kullanılmadı
  redeemed_store_id INT REFERENCES stores(id),
  redeemed_by   INT REFERENCES staff(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- MENU CATEGORIES (Menü Kategorileri)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────
-- MENU ITEMS (Ürünler)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  category_id   INT REFERENCES menu_categories(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  price         NUMERIC(10,2) NOT NULL,
  ingredients   TEXT,
  calories      INT,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_new        BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CAMPAIGNS (Kampanyalar)
-- store_id NULL ise tüm şubelerde geçerli
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id          SERIAL PRIMARY KEY,
  store_id    INT REFERENCES stores(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  image_url   TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  type        VARCHAR(50) DEFAULT 'other',
  conditions  TEXT,
  notes       TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kampanya ↔ Şube (çoklu şube)
CREATE TABLE IF NOT EXISTS campaign_stores (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, store_id)
);

-- Kampanya ↔ Ürün (geçerli ürünler)
CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

-- ─────────────────────────────────────────────
-- REVIEWS (Şube Yorumları)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_id        INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(100),
  content         TEXT NOT NULL,
  photos          TEXT[],
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  admin_reply     TEXT,
  admin_replied_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- REVIEW VOTES (Faydalı / Faydasız)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_votes (
  id          SERIAL PRIMARY KEY,
  review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  is_helpful  BOOLEAN NOT NULL,
  UNIQUE(review_id, customer_id)
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS (Bildirim Geçmişi)
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
-- NOTIFICATION PREFERENCES
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
-- FAQ (Sıkça Sorulan Sorular)
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
-- BUG REPORTS (Sorun Bildir)
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
CREATE INDEX IF NOT EXISTS idx_stamps_customer   ON stamps(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamps_created    ON stamps(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_customer  ON rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_menu_category     ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates   ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_staff_store       ON staff(store_id);
CREATE INDEX IF NOT EXISTS idx_staff_role        ON staff(role);
CREATE INDEX IF NOT EXISTS idx_stores_status     ON stores(status);
CREATE INDEX IF NOT EXISTS idx_reviews_store     ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer  ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved  ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_customer   ON bug_reports(customer_id);

-- ─────────────────────────────────────────────
-- SEED: Örnek şube verisi
-- ─────────────────────────────────────────────
INSERT INTO stores (name, address, lat, lng, phone, working_hours)
VALUES
  ('Mottis Coffee Beşiktaş',  'Sinanpaşa Mah. Çelebioğlu Sk. No:12, Beşiktaş, İstanbul',  41.0422, 29.0050, '+90 212 347 58 91', '07:30 - 23:00'),
  ('Mottis Coffee Nişantaşı', 'Teşvikiye Cad. No:45/A, Şişli, İstanbul',                   41.0480, 28.9945, '+90 212 215 63 74', '08:00 - 22:30'),
  ('Mottis Coffee Bağdat Caddesi', 'Bağdat Cad. No:218, Kadıköy, İstanbul',                 40.9635, 29.0712, '+90 216 482 19 05', '08:00 - 23:00')
ON CONFLICT DO NOTHING;

INSERT INTO menu_categories (name, display_order) VALUES
  ('Kahveler', 1),
  ('Soğuk İçecekler', 2),
  ('Tatlılar', 3),
  ('Atıştırmalıklar', 4)
ON CONFLICT DO NOTHING;

-- SEED: Admin (Yönetici) kullanıcısı
INSERT INTO staff (name, username, email, password_hash, role, store_id)
VALUES (
  'Sergül',
  'srgl',
  'sergül@gmail.com',
  '$2a$12$shkgsDSYBJ4I.A/vcjBFbe3gDk9Uw28KH53OhK7RJPu1rUSsYGfvi',
  'manager',
  1
) ON CONFLICT DO NOTHING;
