require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
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

const app = express();

app.set('trust proxy', 1);

// --- CREAZIONE SERVER HTTP E SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"]
  }
});

// ─── Security Headers ──────────────────
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
  credentials: true,
  origin: (origin, cb) => cb(null, origin),
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/navigator/assets', express.static(
  path.join(__dirname, '..', '..', 'public', 'navigator', 'assets'),
  { maxAge: '1y', immutable: true }
));

app.use("/", express.static(path.join(__dirname, '..', '..', 'public')));

// ─── Sessione e Passport ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URI, 
    collectionName: 'sessions', 
    autoRemove: 'native' 
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

  // Vero solo se questo socket è, in questo momento, il socket riconosciuto
  // come insegnante per quella stanza. Va usato PRIMA di eseguire qualunque
  // azione riservata al docente: il ruolo dichiarato dal client (via URL o
  // socket) non è mai sufficiente da solo, perché è manipolabile.
  function isTeacherSocket(room, socket) {
    return !!room && room.teacherSocketId === socket.id;
  }

  // Insegnante crea la stanza
  socket.on('create_room', ({ roomCode, visitId, visitTitle }, callback) => {
    // Un roomCode già attivo NON va mai sovrascritto: altrimenti chiunque
    // conosca il codice (es. uno studente che si è appena unito) potrebbe
    // rifare 'create_room' con lo stesso codice e dirottare la sessione,
    // rubando teacherSocketId e teacherToken al vero insegnante.
    if (activeSessions[roomCode]) {
      console.warn(`create_room rifiutato: il codice ${roomCode} è già in uso (socket ${socket.id})`);
      callback({ error: 'room_code_taken' });
      return;
    }

    socket.join(roomCode);
    const teacherToken = crypto.randomUUID();
    activeSessions[roomCode] = { 
        teacherSocketId: socket.id, 
        teacherToken,
        students: [],
        classStatus: {},
        visitId: visitId,
        visitTitle: visitTitle,
        hasStarted: false
    };
    console.log(`L'insegnante ha creato la stanza: ${roomCode} per la visita ${visitId}`);

    // Il token va SOLO a chi ha appena creato la stanza (ack del socket che
    // ha emesso l'evento, mai un broadcast). Serve a riprovare che è lui
    // quando più avanti farà 'rejoin_room' da un nuovo socket (refresh, ecc.)
    if (typeof callback === 'function') callback({ teacherToken });
  });

  // Studente si unisce
  socket.on('join_room', ({ roomCode, studentName }) => {
    let actualCode = roomCode.toUpperCase(); 

    // Se non troviamo il codice diretto, cerchiamo per nome visita
    if (!activeSessions[actualCode]) {
      const foundSession = Object.entries(activeSessions).find(([code, session]) => 
        session.visitTitle && session.visitTitle.toLowerCase() === roomCode.toLowerCase()
      );
      if (foundSession) {
        actualCode = foundSession[0];
      }
    }

    // Ora controlliamo se abbiamo trovato la stanza (tramite codice o nome)
    if (activeSessions[actualCode]) {
      socket.join(actualCode);
      const studentData = { id: socket.id, name: studentName };
      activeSessions[actualCode].students.push(studentData);
      
      socket.emit('room_joined', { 
        success: true, 
        roomCode: actualCode, // Rimandiamo il vero codice a 6 lettere al frontend
        hasStarted: activeSessions[actualCode].hasStarted,
        visitId: activeSessions[actualCode].visitId
      });
      io.to(activeSessions[actualCode].teacherSocketId).emit('student_joined', studentData);
    } else {
      socket.emit('error', 'Percorso non trovato. Controlla il codice o il nome.');
    }
  });

  // Insegnante cambia opera
  socket.on('change_artwork', (data) => {
    if (!data || !data.roomCode) return;
    const room = data.roomCode.toUpperCase();
    const session = activeSessions[room];

    if (!isTeacherSocket(session, socket)) {
      console.warn(`change_artwork rifiutato: socket ${socket.id} non è l'insegnante della stanza ${room}`);
      return;
    }
    
    //  Ci ricordiamo l'opera per chi entra in ritardo
    session.currentArtworkId = data.artworkId;
    
    // Inoltriamo l'intero pacchetto 
    socket.to(room).emit('change_artwork', data);
  });

  // Client (studente o insegnante) che si ri-unisce caricando la mappa
  socket.on('rejoin_room', ({ roomCode, role, teacherToken }, callback) => {
    if (!roomCode) return;
    roomCode = roomCode.toUpperCase();
    const room = activeSessions[roomCode];

    if (!room) {
      if (typeof callback === 'function') callback({ isTeacher: false });
      return;
    }

    socket.join(roomCode);
      
    if (role === 'teacher') {
      if (teacherToken && teacherToken === room.teacherToken) {
        room.teacherSocketId = socket.id;
      } else {
        // Qualcuno dichiara role: 'teacher' ma non ha il token giusto:
        // NON gli assegnamo i privilegi. Resta un socket "qualsiasi" agli
        // occhi del server, qualunque cosa dica l'URL sul suo browser.
        console.warn(`rejoin_room: token insegnante non valido per la stanza ${roomCode} (socket ${socket.id})`);
      }
    }
    console.log(`Un client (${role}) è entrato nella mappa della stanza: ${roomCode}`);
      
    if(room.hasStarted) {
      socket.emit('session_started', { visitId: room.visitId });
        
      // Se la lezione è già iniziata, allineiamo il ritardatario/chi rientra
      if (room.currentArtworkId) {
        setTimeout(() => {
          socket.emit('change_artwork', { 
            roomCode: roomCode,
            artworkId: room.currentArtworkId 
          });
        }, 800);
      }
    }

    // il client non deve fidarsi di ciò che ha
    // dichiarato lui stesso, solo di questo. isTeacher è vero SOLO se
    // room.teacherSocketId è davvero questo socket in questo momento.
    if (typeof callback === 'function') {
      callback({ isTeacher: room.teacherSocketId === socket.id });
    }
  });

  // --- MONITORAGGIO DOCENTE ---

  // 1. Lo studente fa una domanda all'IA (testo o voce)
  socket.on('student_interaction', ({ roomCode, studentName, interactionType, query }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    const session = activeSessions[room];
    if (!session) return;
    if (session.teacherSocketId === socket.id) return;

    if (session.teacherSocketId) {
      io.to(session.teacherSocketId).emit('teacher_dashboard_update', {
        type: 'interaction',
        data: { id: Date.now().toString(), studentName, interactionType, query, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      });
    }
  });

  // 2. Ping periodico o cambio opera dello studente (per la dashboard)
  socket.on('student_status_update', ({ roomCode, studentName, currentArtworkId, status }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    const session = activeSessions[room];
    if (!session) return;

    if (session.teacherSocketId === socket.id) return; // mai l'insegnante come studente

    if (session.teacherSocketId) {
      io.to(session.teacherSocketId).emit('teacher_dashboard_update', {
        type: 'status',
        data: { socketId: socket.id, studentName, currentArtworkId, status, lastSeen: Date.now() }
      });
    }
  });

  const COMPLETION_RATIO_THRESHOLD = 0.6; // sotto questa % del tempo atteso -> sospetto

  socket.on('student_audio_event', ({ roomCode, studentName, workId, eventType, expectedDuration, elapsedSeconds, seekCount, timestamp }) => {

    if (!roomCode) return;
    const room = activeSessions[roomCode.toUpperCase()];
    if (!room) return;

    // Chiude il buco indipendentemente da cosa fa il player audio lato client
    if (room.teacherSocketId === socket.id) return;

    // Fallback difensivo: se per qualche motivo la stanza non ha ancora
    // classStatus (es. sessione creata prima di questo deploy), lo creiamo 
    if (!room.classStatus) room.classStatus = {};

    // L'entry dovrebbe già esistere da 'student_joined'; la creiamo per sicurezza
    const student = room.classStatus[socket.id] || (room.classStatus[socket.id] = {
      socketId: socket.id,
      studentName,
      status: 'active',
    });

    console.log('[SERVER AUDIO EVENT]', eventType, { studentName, workId, elapsedSeconds, expectedDuration, seekCount });
  
    switch (eventType) {
      case 'audio_started':
        student.audioState = 'playing';
        student.currentWorkId = workId;
        student.flagged = false; // una nuova lettura azzera il flag precedente
        break;
  
      case 'audio_resumed':
        student.audioState = 'playing';
        break;
  
      case 'audio_paused':
        student.audioState = 'paused';
        break;
  
      case 'audio_completed':
      case 'audio_stopped':
        student.audioState = 'idle';
        student.flagged = elapsedSeconds < expectedDuration * COMPLETION_RATIO_THRESHOLD;
        break;
  
      case 'audio_seek_burst':
        student.flagged = true;
        break;
  
      default:
        return; // evento sconosciuto, ignoriamo silenziosamente
    }
  
    student.lastEventAt = timestamp;
  
    if (room.teacherSocketId) {
      io.to(room.teacherSocketId).emit('teacher_dashboard_update', {
        type: 'status',
        data: student,
      });
    }
  });

  // Insegnante lancia il quiz
  socket.on('start_quiz', ({ roomCode, quizData }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    if (!isTeacherSocket(activeSessions[room], socket)) {
      console.warn(`start_quiz rifiutato: socket ${socket.id} non è l'insegnante della stanza ${room}`);
      return;
    }
    socket.to(room).emit('quiz_started', quizData);
  });

  // Studente risponde al quiz
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

        io.to(roomCode).emit('student_quiz_submitted', payload);
        
        if (session.teacherSocketId) {
            io.to(session.teacherSocketId).emit('student_quiz_submitted', payload);
        }
    } else {
        console.log(`Stanza ${roomCode} non trovata in memoria.`);
    }
  });

  socket.on('start_shared_session', ({ roomCode, visitId }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    if (!isTeacherSocket(activeSessions[room], socket)) {
      console.warn(`start_shared_session rifiutato: socket ${socket.id} non è l'insegnante della stanza ${room}`);
      return;
    }
    activeSessions[room].hasStarted = true;
    socket.to(room).emit('session_started', { visitId });
  });

  // L'insegnante ha raggiunto la fine della visita -> puo' scegliere di fare il quiz o terminare la stanza
  socket.on('end_shared_visit', ({ roomCode }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();
    if (!isTeacherSocket(activeSessions[room], socket)) {
      console.warn(`end_shared_visit rifiutato: socket ${socket.id} non è l'insegnante della stanza ${room}`);
      return;
    }
    // Avvisiamo tutti gli studenti nella stanza che la visita è terminata
    socket.to(room).emit('visit_ended');
  });

  // L'insegnante chiude definitivamente la stanza (dalla mappa o dal quiz)
  socket.on('close_room', ({ roomCode }) => {
    if (!roomCode) return;
    const room = roomCode.toUpperCase();

    if (!isTeacherSocket(activeSessions[room], socket)) {
      console.warn(`close_room rifiutato: socket ${socket.id} non è l'insegnante della stanza ${room}`);
      return;
    }
    
    // Avvisa tutti gli studenti che la sessione è finita
    socket.to(room).emit('room_closed');
    
    // Pulizia della memoria
    if (activeSessions[room]) {
      delete activeSessions[room];
      console.log(`Stanza ${room} chiusa e rimossa dalla memoria.`);
    }
  });

  socket.on('disconnect', () => {
    for (const roomCode in activeSessions) {
      const session = activeSessions[roomCode];
      const studentIndex = session.students.findIndex(s => s.id === socket.id);

      if (studentIndex !== -1) {
        const studentName = session.students[studentIndex].name;

        session.students.splice(studentIndex, 1);
        if (session.classStatus && session.classStatus[socket.id]) {
          delete session.classStatus[socket.id];
        }

        if (session.teacherSocketId) {
          io.to(session.teacherSocketId).emit('teacher_dashboard_update', {
            type: 'status',
            data: { socketId: socket.id, studentName, status: 'offline', lastSeen: Date.now() }
          });
        }
        break;
      }
    }
  });
});

// Navigator
// Cache-Control esplicito: questo file referenzia i nomi hashati dei bundle
// (cachati sopra in modo aggressivo), quindi DEVE essere sempre rivalidato,
// altrimenti dopo un deploy il browser continuerebbe a servire una index.html
// vecchia che punta ad asset non più presenti.
app.use("/navigator", (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'navigator', 'index.html'));
});

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'html', '404.html'));
});

server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});