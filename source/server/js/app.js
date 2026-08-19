require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http')
const { Server } = require('socket.io')

const connectDB = require('./db.js');
require('./middleware/auth'); 
const router = require('./routers/router');
const apiRouter = require('./routers/apirouter');
const authRouter = require('./routers/auth'); 

const PORT = 8000;

connectDB();

const app = express(); // Inizializza Express subito!

// --- 3. CREAZIONE SERVER HTTP E SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permette a React di connettersi da un'altra porta (es. 5173) in dev
    methods: ["GET", "POST"]
  }
});

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
app.use(cors({
  origin: "http://localhost:5173", // TODO: da sostituire con qualunque sia l'url in produzione
  credentials: true                
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/marketplace", express.static(path.join(__dirname, '..', '..', 'marketplace')));
app.use("/navigator",   express.static(path.join(__dirname, '..', '..', 'navigator', 'react', 'museum-map', 'dist')));
app.use("/navigator",   express.static(path.join(__dirname, '..', '..', 'navigator', 'dist')));

// ─── Sessione e Passport ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: false,
    sameSite: 'lax'
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

// --- 4. LOGICA DI SOCKET.IO PER LA JOINT SESSION ---
const activeSessions = {};

io.on('connection', (socket) => {
  console.log(`Nuovo client connesso al Navigator: ${socket.id}`);

  // Insegnante crea la stanza
  socket.on('create_room', ({ roomCode }) => {
    socket.join(roomCode);
    activeSessions[roomCode] = { 
        teacherSocketId: socket.id, 
        students: [] 
    };
    console.log(`L'insegnante ha creato la stanza: ${roomCode}`);
  });

  // Studente si unisce
  socket.on('join_room', ({ roomCode, studentName }) => {
    roomCode = roomCode.toUpperCase();
    if (activeSessions[roomCode]) {
      socket.join(roomCode);
      const studentData = { id: socket.id, name: studentName };
      activeSessions[roomCode].students.push(studentData);
      
      socket.emit('room_joined', { success: true, roomCode });
      io.to(activeSessions[roomCode].teacherSocketId).emit('student_joined', studentData);
    } else {
      socket.emit('error', 'Stanza non trovata. Controlla il codice.');
    }
  });

  // Master (Insegnante) cambia opera
  socket.on('change_artwork', ({ roomCode, artworkId }) => {
    socket.to(roomCode).emit('artwork_changed', { artworkId });
  });

  // Slave (Studente) interagisce (es. chiede un livello più basso)
  socket.on('student_interaction', ({ roomCode, type, details }) => {
    if (activeSessions[roomCode]) {
        const teacherId = activeSessions[roomCode].teacherSocketId;
        io.to(teacherId).emit('student_activity', { studentId: socket.id, type, details });
    }
  });

  // Master (Insegnante) lancia il quiz
  socket.on('start_quiz', ({ roomCode, quizData }) => {
    socket.to(roomCode).emit('quiz_started', quizData);
  });

  // Slave (Studente) risponde al quiz
  socket.on('submit_answer', ({ roomCode, answer }) => {
    if (activeSessions[roomCode]) {
        io.to(activeSessions[roomCode].teacherSocketId).emit('student_answered', { 
            studentId: socket.id, 
            answer 
        });
    }
  });

  socket.on('start_shared_session', ({ roomCode, visitId }) => {
    socket.to(roomCode).emit('session_started', { visitId });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnesso: ${socket.id}`);
    // OPZIONALE: Qui potremmo cercare se il socket.id era uno studente o un prof e pulire activeSessions
  });
});

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'html', '404.html'));
});

server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
