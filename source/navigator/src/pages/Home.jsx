import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';

const Home = ({ config }) => {
  const navigate = useNavigate();

  const cards = [
    {
      id: 1,
      title: "Esplora visite",
      desc: "Scopri i percorsi offerti dal museo e inizia la tua visita",
      icon: "🧭", // Usa SVG per fedeltà massima, qui uso emoji per brevità codice
      color: "bg-amber-500",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      path: "/visits"
    },
    {
      id: 2,
      title: "Join a session",
      desc: "Partecipa a una visita guidata di gruppo",
      icon: "👥",
      color: "bg-purple-600",
      glow: "shadow-[0_0_15px_rgba(147,51,234,0.3)]",
      path: "/join"
    },
    {
      id: 3,
      title: "Audio Guide Map",
      desc: "Explore the museum layout with interactive audio guidance",
      icon: "🗺️",
      color: "bg-teal-500",
      glow: "shadow-[0_0_15px_rgba(20,184,166,0.3)]",
      path: "/free-map"
    },
    {
      id: 4,
      title: "Create Visit",
      desc: "Build your own custom museum tour",
      icon: "➕",
      color: "bg-red-500",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
      path: "/visits" // Redirect o creazione
    },
    {
      id: 5,
      title: "My Visits",
      desc: "View your saved visits and history",
      icon: "👤",
      color: "bg-cyan-500",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
      path: "/my-visits" // Va comunque alla pagina unificata di Visits
    },
    {
      id: 6,
      title: "Marketplace",
      desc: "Build your own custom museum tour",
      icon: "✨",
      color: "bg-pink-500",
      glow: "shadow-[0_0_15px_rgba(236,72,153,0.3)]",
      isExternal: true, // <-- Flag speciale per i link fuori dal Navigator
      path: `${BASE_URL}/marketplace`
    }
  ];

  return (
    <div className="min-h-screen w-full relative">
      
      {/* BACKGROUND IMAGE FISSA */}
      {/* L'immagine copre tutto lo sfondo ed è fissa */}

      {/* CONTENUTO SCROLLABILE */}
      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto pb-20">
        
        {/* HERO TEXT CENTRALE */}
        <div className="text-center mb-8 mt-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-amber-500">ArtAround</span> <span className="text-white">Navigator</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base" style={{ fontFamily: 'var(--font-body)' }}>
            {config && config.welcomeMessage ? config.welcomeMessage : "Esplora musei con guide audio interattive"}
          </p>
        </div>

        {/* LISTA CARD */}
        <div className="w-full space-y-4">
          {cards.map((card) => (
            <div 
              key={card.id}
              onClick={() => card.isExternal ? window.location.href = card.path : navigate(card.path)}
              className="group relative flex items-center p-4 bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 rounded-2xl hover:bg-[#1e293b]/80 transition-all active:scale-[0.98] cursor-pointer"
            >
              {/* Icona Quadrata Colorata */}
              <div className={`w-12 h-12 ${card.color} ${card.glow} rounded-xl flex items-center justify-center text-2xl text-white mr-4 flex-shrink-0`}>
                {card.icon}
              </div>
              
              {/* Testi Card */}
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold text-lg mb-0.5">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-xs leading-tight">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

export default Home;
