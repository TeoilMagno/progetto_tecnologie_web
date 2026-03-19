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

const PORT = process.env.PORT || 3000;

connectDB();

const app = express();

// ─── Middleware base ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

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

// ─── Router ────────────────────────────────────────────────────────────────
app.use('/', authRouter); // gestisce POST /login/password, POST /signup, GET /oauth2/redirect/...
app.use('/', router);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});