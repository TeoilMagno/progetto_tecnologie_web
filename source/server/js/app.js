require('dotenv').config(); // deve essere PRIMA di tutto

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const connectDB = require('./db.js');
require('./middleware/auth'); // carica le strategie Passport DOPO dotenv

const router = require('./routers/router');
const apiRouter = require('./routers/apirouter');
const authRouter = require('./routers/auth'); // rotte POST login/signup/logout + callback OAuth

const PORT = process.env.PORT || 8000;

connectDB();

const app = express();

// ─── Middleware base ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/marketplace", express.static(path.join(__dirname, '..', '..', 'marketplace')));
app.use("/navigator",   express.static(path.join(__dirname, '..', '..', 'navigator', 'react', 'museum-map', 'dist')));

// ─── Sessione e Passport ───────────────────────────────────────────────────
// DEVONO stare prima dei router, altrimenti req.user non è disponibile nelle rotte
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// TODO: da rimuovere in seguito: login di debug per non dover accedere ogni volta
// (e' sufficiente rimuovere le seguenti righe che sovrascrivono il codice precedente con la logica corretta)
// --- INIZIO DEBUG MOCK ---
app.use((req, res, next) => {
  // Iniettiamo forzatamente l'utente del database in ogni richiesta
  req.user = {
    _id: "69bbcc8442929ff5331b368a",
    name: "Alessia Mertolini",
    role: "curator"
  };

  // Mockiamo anche la funzione di Passport per farla risultare sempre true
  req.isAuthenticated = () => true;

  next();
});
// --- FINE DEBUG MOCK ---

// ─── Router ────────────────────────────────────────────────────────────────
app.use('/', authRouter); // gestisce POST /login/password, POST /signup, GET /oauth2/redirect/...
app.use('/', router);
app.use('/api', apiRouter);

// ─── Front-end ────────────────────────────────────────────────────────────────
const sortablePath = path.join(__dirname, '..', '..', '..', 'node_modules', 'sortablejs');
app.use('/vendor/sortablejs', express.static(sortablePath));

app.listen(8000, () => {
  console.log(`listening on port: 8000`);
})
