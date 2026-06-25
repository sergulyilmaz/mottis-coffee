-- Mottis Coffee Müşteri App — Migration
-- Müşteri uygulaması için eksik tablo ve kolonları ekler.
-- Çalıştır: psql $DATABASE_URL -f schema_customer_migration.sql

-- ─────────────────────────────────────────────
-- CUSTOMERS: yeni alanlar
-- ─────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'tr';

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

CREATE INDEX IF NOT EXISTS idx_reviews_store    ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);

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

CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(is_read);

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

-- Örnek SSS verileri
INSERT INTO faqs (question, answer, sort_order) VALUES
  ('Şifremi nasıl değiştirebilirim?', 'Profil sayfasından "Şifre Değiştir" alanına giderek mevcut şifrenizi girdikten sonra yeni şifrenizi oluşturabilirsiniz.', 1),
  ('QR Kodum nasıl oluşur?', 'Uygulamaya giriş yaptığınızda size özel bir QR kod otomatik olarak oluşturulur. QR sayfasından görebilir ve baristaya okutabilirsiniz.', 2),
  ('İkramı nasıl kullanırım?', '8 kahve satın aldığınızda 1 ikram kahve kazanırsınız. İkram kahvenizi kullanmak için QR kodunuzu baristaya okutmanız yeterlidir.', 3)
ON CONFLICT DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_bug_reports_customer ON bug_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status   ON bug_reports(status);
