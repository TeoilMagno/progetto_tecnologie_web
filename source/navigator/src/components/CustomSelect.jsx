import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, placeholder = "Seleziona..." }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Trova l'etichetta dell'opzione attualmente selezionata
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white flex items-center justify-between focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
      >
        <span className="truncate text-slate-200">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Tendina a Scomparsa */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                  value === opt.value 
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold' 
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-sm truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}