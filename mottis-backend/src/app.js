require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth',      require('./routes/auth'));
app.use('/staff',     require('./routes/staffAuth'));
app.use('/me',        require('./routes/customer'));
app.use('/stamps',    require('./routes/stamps'));
app.use('/menu',      require('./routes/menu'));
app.use('/campaigns', require('./routes/campaigns'));
app.use('/stores',    require('./routes/stores'));
app.use('/reviews',   require('./routes/reviews'));
app.use('/support',   require('./routes/support'));
app.use('/barista',   require('./routes/barista'));
app.use('/admin',     require('./routes/admin'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: "Mottis Coffee Backend", time: new Date().toISOString() });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Yakalanmamış hata:', err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// ─── Başlat ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`☕ Mottis Coffee Backend — 0.0.0.0:${PORT} | ${process.env.NODE_ENV || 'development'}`);
});
