require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
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

app.set('trust proxy', 1);

// --- 3. CREAZIONE SERVER HTTP E SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
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
app.use(cors({ credentials: true, origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/", express.static(path.join(__dirname, '..', '..', 'public')));

// ─── Sessione e Passport ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    // Assicurati che questo URI sia uguale a quello che usi in db.js per connetterti
    mongoUrl: process.env.DB_URI, 
    collectionName: 'sessions', // Creerà automaticamente una collezione 'sessions' nel DB
    autoRemove: 'native' // Rimuove automaticamente le sessioni scadute
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // La sessione dura 1 settimana
    secure: process.env.NODE_ENV === 'production',
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
const tomSelectPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'tom-select', 'dist');
const iMaskPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'imask', 'dist');
app.use('/vendor/sortablejs', express.static(sortablePath));
app.use('/vendor/tom-select', express.static(tomSelectPath));
app.use('/vendor/imask', express.static(iMaskPath));

// --- 4. LOGICA DI SOCKET.IO PER LA JOINT SESSION ---
const activeSessions = {};
app.locals.activeSessions = activeSessions;

io.on('connection', (socket) => {
  console.log(`Nuovo client connesso al Navigator: ${socket.id}`);

  // Insegnante crea la stanza
  socket.on('create_room', ({ roomCode, visitId }) => {
    socket.join(roomCode);
    activeSessions[roomCode] = { 
        teacherSocketId: socket.id, 
        students: [],
        visitId: visitId,
        hasStarted: false
    };
    console.log(`L'insegnante ha creato la stanza: ${roomCode} per la visita ${visitId}`);
  });

  // Studente si unisce
  socket.on('join_room', ({ roomCode, studentName }) => {
    roomCode = roomCode.toUpperCase();
    if (activeSessions[roomCode]) {
      socket.join(roomCode);
      const studentData = { id: socket.id, name: studentName };
      activeSessions[roomCode].students.push(studentData);
      
      socket.emit('room_joined', { 
        success: true, 
        roomCode,
        hasStarted: activeSessions[roomCode].hasStarted,
        visitId: activeSessions[roomCode].visitId
      });
      io.to(activeSessions[roomCode].teacherSocketId).emit('student_joined', studentData);
    } else {
      socket.emit('error', 'Stanza non trovata. Controlla il codice.');
    }
  });

  // Master (Insegnante) cambia opera
  socket.on('change_artwork', (data) => {
    if (!data || !data.roomCode) return;
    const room = data.roomCode.toUpperCase();
    
    if (activeSessions[room]) {
      // 1. SALVIAMO LO STATO: Ci ricordiamo l'opera per chi entra in ritardo
      activeSessions[room].currentArtworkId = data.artworkId;
      
      // 2. Inoltriamo L'INTERO pacchetto (incluso il roomCode) usando l'evento corretto!
      socket.to(room).emit('change_artwork', data);
    }
  });

  // Client (Studente o Insegnante) che si ri-unisce caricando la Mappa
  socket.on('rejoin_room', ({ roomCode, role }) => {
    if (!roomCode) return;
    roomCode = roomCode.toUpperCase();
    
    if (activeSessions[roomCode]) {
      socket.join(roomCode);
      
      if (role === 'teacher') {
        activeSessions[roomCode].teacherSocketId = socket.id;
      }
      console.log(`Un client (${role}) è entrato nella mappa della stanza: ${roomCode}`);
      
      if(activeSessions[roomCode].hasStarted) {
        socket.emit('session_started', { visitId: activeSessions[roomCode].visitId });
        
        // 3. Se la lezione è già iniziata, allineiamo il ritardatario/chi rientra
        if (activeSessions[roomCode].currentArtworkId) {
          // Aspettiamo 800ms per dare il tempo al MapView di scaricare le opere dal DB
          setTimeout(() => {
            socket.emit('change_artwork', { 
              roomCode: roomCode,
              artworkId: activeSessions[roomCode].currentArtworkId 
            });
          }, 800);
        }
      }
      
    }
  });

  // --- MONITORAGGIO DOCENTE ---

  // 1. Lo studente fa una domanda all'IA (testo o voce)
  socket.on('student_interaction', ({ roomCode, studentName, interactionType, query }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    
    if (activeSessions[room] && activeSessions[room].teacherSocketId) {
      io.to(activeSessions[room].teacherSocketId).emit('teacher_dashboard_update', {
        type: 'interaction',
        data: {
          id: Date.now().toString(), // ID univoco per la notifica
          studentName,
          interactionType, // es. 'voice', 'text'
          query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      });
    }
  });

  // 2. Ping periodico o cambio opera dello studente (per la griglia)
  socket.on('student_status_update', ({ roomCode, studentName, currentArtworkId, status }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    
    if (activeSessions[room] && activeSessions[room].teacherSocketId) {
      io.to(activeSessions[room].teacherSocketId).emit('teacher_dashboard_update', {
        type: 'status',
        data: {
          socketId: socket.id,
          studentName,
          currentArtworkId,
          status, // es. 'active', 'lagging'
          lastSeen: Date.now()
        }
      });
    }
  });

  // Master (Insegnante) lancia il quiz
  socket.on('start_quiz', ({ roomCode, quizData }) => {
    socket.to(roomCode).emit('quiz_started', quizData);
  });

  // Slave (Studente) risponde al quiz
// Lo studente consegna l'intero quiz al termine
  socket.on('submit_quiz', (data) => {
    console.log(">>> RICEVUTA CONSEGNA QUIZ DAL CLIENT:", data);
    if (!data || !data.roomCode) return;
    
    const roomCode = data.roomCode.toUpperCase();
    const { history, score } = data;

    if (activeSessions[roomCode]) {
        const session = activeSessions[roomCode];
        const student = session.students.find(s => s.id === socket.id);
        const studentName = student ? student.name : `Studente ${socket.id.substring(0,4)}`;

        const payload = { 
            studentId: socket.id, 
            studentName: studentName,
            history,
            score 
        };

        // DOPPIO INVIO BLINDATO: sia alla stanza generale che al socket specifico del prof
        io.to(roomCode).emit('student_quiz_submitted', payload);
        
        if (session.teacherSocketId) {
            io.to(session.teacherSocketId).emit('student_quiz_submitted', payload);
        }
    } else {
        console.log(`Stanza ${roomCode} non trovata in memoria.`);
    }
  });

  socket.on('start_shared_session', ({ roomCode, visitId }) => {
    if(activeSessions[roomCode]) {
      activeSessions[roomCode].hasStarted = true;
    }
    socket.to(roomCode).emit('session_started', { visitId });
  });

  // L'insegnante ha raggiunto la fine della visita -> puo' scegliere di fare il quiz o terminare la stanza
  socket.on('end_shared_visit', ({ roomCode }) => {
    if (!roomCode) return;
    // Avvisiamo tutti gli studenti nella stanza che la visita è terminata
    socket.to(roomCode.toUpperCase()).emit('visit_ended');
  });

  // L'insegnante chiude definitivamente la stanza (dalla mappa o dal quiz)
  socket.on('close_room', ({ roomCode }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    
    // Avvisa tutti gli studenti che la sessione è finita
    socket.to(room).emit('room_closed');
    
    // Pulizia della memoria
    if (activeSessions[room]) {
      delete activeSessions[room];
      console.log(`Stanza ${room} chiusa e rimossa dalla memoria.`);
    }
  });

  // OPZIONALE: Qui potremmo cercare se il socket.id era uno studente o un prof e pulire activeSessions
  socket.on('disconnect', () => {
    // Cerca in tutte le stanze se il socket disconnesso appartiene a uno studente
    for (const roomCode in activeSessions) {
      const session = activeSessions[roomCode];
      const studentIndex = session.students.findIndex(s => s.id === socket.id);

      if (studentIndex !== -1 && session.teacherSocketId) {
        // Avvisa il prof che lo studente ha perso la connessione di netto
        io.to(session.teacherSocketId).emit('teacher_dashboard_update', {
          type: 'status',
          data: {
            socketId: socket.id,
            studentName: session.students[studentIndex].name,
            status: 'offline', // Stato inequivocabile di disconnessione
            lastSeen: Date.now()
          }
        });
        break; // Trovato e segnalato, usciamo dal ciclo
      }
    }
  });
});

// Navigator
app.use("/navigator", (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', '..', 'navigator', 'dist', 'index.html'));
});

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'html', '404.html'));
});

server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
