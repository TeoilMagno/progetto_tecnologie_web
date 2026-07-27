import React from 'react';

const Home = () => {
  const cards = [
    {
      id: 1,
      title: "Explore Visits",
      desc: "Discover available visits and start your autonomous exploration",
      icon: "🧭", // Usa SVG per fedeltà massima, qui uso emoji per brevità codice
      color: "bg-amber-500",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]"
    },
    {
      id: 2,
      title: "Join a Session",
      desc: "Participate in a synchronized guided tour with the teacher",
      icon: "👥",
      color: "bg-purple-600",
      glow: "shadow-[0_0_15px_rgba(147,51,234,0.3)]"
    },
    {
      id: 3,
      title: "Interactive Map",
      desc: "Explore the museum layout and find artworks",
      icon: "🗺️",
      color: "bg-blue-500",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]"
    },
    {
      id: 4,
      title: "Audio Guide",
      desc: "Free exploration with voice-guided narration",
      icon: "🎧",
      color: "bg-teal-500",
      glow: "shadow-[0_0_15px_rgba(20,184,166,0.3)]"
    },
    {
      id: 5,
      title: "Create Visit",
      desc: "Build your own custom museum tour",
      icon: "➕",
      color: "bg-red-500",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]"
    },
    {
      id: 6,
      title: "My Visits",
      desc: "View your saved visits and history",
      icon: "👤",
      color: "bg-cyan-500",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]"
    }
  ];

  return (
    <div className="min-h-screen w-full relative">
      
      {/* BACKGROUND IMAGE FISSA */}
      {/* L'immagine copre tutto lo sfondo ed è fissa */}
      <div className="absolute inset-0 z-0">
         <img 
            src="/img1.jpg" 
            alt="Background" 
            className="w-full h-full object-cover"
         />
         {/* Overlay sfumato scuro: trasparente in alto, graduale verso blu scuro in basso */}
         <div 
           className="absolute inset-0"
           style={{ 
             backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(51, 65, 85, 0.6) 30%, rgba(14, 22, 42, 1) 75%, rgba(14, 22, 42, 1) 100%)'
           }}
         ></div>
      </div>

      {/* CONTENUTO SCROLLABILE */}
      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto pb-20">
        
        {/* HERO TEXT CENTRALE */}
        <div className="text-center mb-8 mt-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-amber-500">ArtAround</span> <span className="text-white">Navigator</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Esplora musei con guide audio interattive
          </p>
        </div>

        {/* LISTA CARD */}
        <div className="w-full space-y-4">
          {cards.map((card) => (
            <div 
              key={card.id}
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