require('dotenv').config();

const https = require('https');
const path = require('path');
const express = require('express');
const fs = require('fs'); // Aggiunto per poter leggere i file del certificato
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const connectDB = require('./db.js');
require('./middleware/auth'); 
const router = require('./routers/router');
const apiRouter = require('./routers/apirouter');
const authRouter = require('./routers/auth'); 

const PORT = 8000;

connectDB();

const app = express(); // Inizializza Express subito!

// ─── Security Headers (Trasformati in Middleware Express) ──────────────────
// Invece di metterli nel createServer, li facciamo applicare ad Express per TUTTE le rotte
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next(); // Passa alla prossima funzione di Express
});

// ─── Middleware base ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/marketplace", express.static(path.join(__dirname, '..', '..', 'marketplace')));
app.use("/navigator",   express.static(path.join(__dirname, '..', '..', 'navigator', 'react', 'museum-map', 'dist')));

// ─── Sessione e Passport ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── Router ────────────────────────────────────────────────────────────────
app.use('/', authRouter);
app.use('/', router);
app.use('/api', apiRouter);

// ─── Front-end ─────────────────────────────────────────────────────────────
const sortablePath = path.join(__dirname, '..', '..', '..', 'node_modules', 'sortablejs');
app.use('/vendor/sortablejs', express.static(sortablePath));

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'html', '404.html'));
});

app.listen(8000, () => {
  console.log(`listening on port: 8000`);
})
