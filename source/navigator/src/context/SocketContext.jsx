import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

const SocketContext = createContext(null);

/**
 * Va montato UNA volta sola, in cima all'albero (es. in App.jsx, dentro il Router).
 * Crea una singola connessione socket.io che sopravvive alla navigazione tra pagine,
 * cosi' non serve piu' aprire una nuova connessione in ogni componente.
 */
export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Creiamo la socket una sola volta (lazy init), non ad ogni render
  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Nota: NON chiamiamo socket.disconnect() qui. Il provider vive per tutta
    // la durata dell'app (e' montato una volta sola nel root), quindi la
    // connessione deve restare aperta anche quando i singoli componenti
    // figli vengono smontati durante la navigazione tra pagine.
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook da usare in qualunque componente al posto di `io(SOCKET_URL)`.
 * Esempio:
 *   const { socket } = useSocket();
 *   socket.emit('change_artwork', { roomCode, artworkId });
 */
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket deve essere usato dentro a <SocketProvider>');
  }
  return ctx;
}