import React from 'react';
import QRCode from 'react-qr-code';

export default function RoomQRCode({ roomCode }) {
  if (!roomCode) return null;

  // Genera automaticamente l'URL completo per il join
  const joinUrl = `${window.location.origin}/navigator/join?roomCode=${roomCode}`;

  return (
    <div className="relative w-44 h-44 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center shadow-lg shadow-white/5 mx-auto overflow-hidden">
      <QRCode
        value={joinUrl}
        size={256}
        style={{ width: '100%', height: '100%' }}
        fgColor="#020617"
        bgColor="#ffffff"
        viewBox="0 0 256 256"
        level="H"
      />
      {/* Logo centrale */}
      <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border-2 border-white rounded-lg flex items-center justify-center text-xs font-black text-amber-500">
        AA
      </div>
    </div>
  );
}