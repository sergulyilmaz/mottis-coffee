/**
 * Menü Routes
 *
 * GET  /menu                  — Tüm kategoriler + ürünler
 * GET  /menu/featured         — Öne çıkan ürünler (Öneriler bölümü)
 * GET  /menu/categories       — Sadece kategoriler
 * GET  /menu/categories/:id   — Kategoriye göre ürünler
 *
 * Yönetici (manager):
 * POST   /menu/items          — Yeni ürün ekle
 * PUT    /menu/items/:id      — Ürün güncelle
 * DELETE /menu/items/:id      — Ürün kaldır
 * POST   /menu/categories     — Kategori ekle
 */

const router = require('express').Router();
const db     = require('../config/db');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');

// ─── GET /menu ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { rows: categories } = await db.query(
      'SELECT id, name FROM menu_categories ORDER BY display_order, name'
    );

    const showAll = req.query.all === 'true';
    const { rows: items } = await db.query(
      `SELECT id, category_id, name, description, image_url, price, ingredients, calories, is_featured, is_new, is_active, display_order
       FROM menu_items
       ${showAll ? '' : 'WHERE is_active = TRUE'}
       ORDER BY category_id, display_order, name`
    );

    // Kategorilere göre grupla
    const menuWithItems = categories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.category_id === cat.id),
    }));

    res.json({ menu: menuWithItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /menu/featured ──────────────────────────────────────────────────────

router.get('/featured', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT mi.id, mi.name, mi.description, mi.image_url, mi.price, mc.name AS category
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.is_featured = TRUE AND mi.is_active = TRUE
       ORDER BY mi.display_order, mi.name`
    );
    res.json({ featured: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /menu/categories ────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, name, display_order FROM menu_categories ORDER BY display_order, name'
  );
  res.json({ categories: rows });
});

// ─── GET /menu/categories/:id ────────────────────────────────────────────────

router.get('/categories/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, image_url, price, is_featured, display_order
       FROM menu_items
       WHERE category_id = $1 AND is_active = TRUE
       ORDER BY display_order, name`,
      [req.params.id]
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /menu/items  (Manager) ─────────────────────────────────────────────

router.post('/items', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { categoryId, name, description, imageUrl, price, isFeatured, isNew, displayOrder, ingredients, calories } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name ve price zorunlu' });

  try {
    const { rows: [item] } = await db.query(
      `INSERT INTO menu_items (category_id, name, description, image_url, price, is_featured, is_new, display_order, ingredients, calories)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [categoryId || null, name, description || null, imageUrl || null, price,
       isFeatured || false, isNew || false, displayOrder || 0, ingredients || null, calories || null]
    );
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── PUT /menu/items/:id  (Manager) ──────────────────────────────────────────

router.put('/items/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { name, description, imageUrl, price, isFeatured, isNew, isActive, displayOrder, categoryId, ingredients, calories } = req.body;
  try {
    const { rows: [item] } = await db.query(
      `UPDATE menu_items SET
         name          = COALESCE($1, name),
         description   = COALESCE($2, description),
         image_url     = COALESCE($3, image_url),
         price         = COALESCE($4, price),
         is_featured   = COALESCE($5, is_featured),
         is_active     = COALESCE($6, is_active),
         display_order = COALESCE($7, display_order),
         category_id   = COALESCE($8, category_id),
         ingredients   = COALESCE($9, ingredients),
         calories      = COALESCE($10, calories),
         is_new        = COALESCE($11, is_new)
       WHERE id = $12
       RETURNING *`,
      [name, description, imageUrl, price, isFeatured, isActive, displayOrder, categoryId,
       ingredients, calories, isNew, req.params.id]
    );
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── DELETE /menu/items/:id  (Manager) ───────────────────────────────────────

router.delete('/items/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  await db.query('UPDATE menu_items SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Ürün kaldırıldı' });
});

// ─── GET /menu/search — Ürün arama ───────────────────────────────────────────

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'En az 2 karakter gerekli' });
  }
  try {
    const { rows } = await db.query(
      `SELECT mi.id, mi.name, mi.description, mi.image_url, mi.price,
              mi.ingredients, mi.calories, mi.is_featured, mi.is_new,
              mc.name AS category
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.is_active = TRUE AND (mi.name ILIKE $1 OR mi.description ILIKE $1)
       ORDER BY mi.name
       LIMIT 20`,
      [`%${q.trim()}%`]
    );
    res.json({ results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /menu/items/:id — Ürün detay ───────────────────────────────────────

router.get('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query(
      `SELECT mi.*, mc.name AS category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.id = $1`,
      [req.params.id]
    );
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /menu/categories  (Manager) ────────────────────────────────────────

router.post('/categories', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { name, displayOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'name zorunlu' });
  const { rows: [cat] } = await db.query(
    'INSERT INTO menu_categories (name, display_order) VALUES ($1, $2) RETURNING *',
    [name, displayOrder || 0]
  );
  res.status(201).json({ category: cat });
});

module.exports = router;
