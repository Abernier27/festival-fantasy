'use client';

import { useState, useRef, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import html2canvas from 'html2canvas';

interface Artist {
  name: string;
  popularity: number;
  image: string;
  genres: string[];
  cost: number;
}

const TIME_SLOTS_J1 = [
  { id: 'j1-16-17', label: '16:00 - 17:00' },
  { id: 'j1-17-18', label: '17:00 - 18:00' },
  { id: 'j1-18-19', label: '18:00 - 19:00' },
  { id: 'j1-19-20', label: '19:00 - 20:00' },
  { id: 'j1-20-21', label: '20:00 - 21:00' },
  { id: 'j1-21-22', label: '21:00 - 22:00' },
  { id: 'j1-22-23', label: '22:00 - 23:00' },
  { id: 'j1-23-00', label: '23:00 - 00:00' },
  { id: 'j1-00-01', label: '00:00 - 01:00' },
];

const TIME_SLOTS_J2 = [
  { id: 'j2-16-17', label: '16:00 - 17:00' },
  { id: 'j2-17-18', label: '17:00 - 18:00' },
  { id: 'j2-18-19', label: '18:00 - 19:00' },
  { id: 'j2-19-20', label: '19:00 - 20:00' },
  { id: 'j2-20-21', label: '20:00 - 21:00' },
  { id: 'j2-21-22', label: '21:00 - 22:00' },
  { id: 'j2-22-23', label: '22:00 - 23:00' },
  { id: 'j2-23-00', label: '23:00 - 00:00' },
  { id: 'j2-00-01', label: '00:00 - 01:00' },
];

const ALL_SLOTS = [...TIME_SLOTS_J1, ...TIME_SLOTS_J2];

const getArtistCost = (popularity: number) => {
  if (popularity >= 80) return 5;
  if (popularity >= 60) return 4;
  if (popularity >= 40) return 3;
  if (popularity >= 20) return 2;
  return 1;
};

function DraggableArtistCard({ artist }: { artist: Artist }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `artist-${artist.name}`,
    data: artist,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
    transition: 'none',
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="bg-white border border-stone-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <img src={artist.image} alt={artist.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
        <span className="absolute top-3 right-3 bg-stone-900/90 backdrop-blur-md text-white font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
          {artist.cost} pts
        </span>
      </div>
      <div className="px-1">
        <h2 className="text-base font-bold text-stone-900 tracking-tight">{artist.name}</h2>
        <p className="text-[11px] text-stone-400 mt-1 font-medium uppercase tracking-wider">Glisser vers un créneau</p>
      </div>
    </div>
  );
}

function DroppableSlot({ slotId, label, artist, onRemove }: { slotId: string, label: string, artist: Artist | null, onRemove: () => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    disabled: artist !== null,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border
        ${isOver ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-stone-100 shadow-2xs hover:border-stone-200'}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="bg-stone-100/80 text-stone-600 font-mono text-[11px] font-bold px-3 py-1.5 rounded-xl tracking-wide">
          {label}
        </span>
        
        {artist ? (
          <div className="flex items-center gap-2.5">
            <img src={artist.image} alt={artist.name} className="w-8 h-8 rounded-full object-cover border border-stone-200 shadow-xs" />
            <span className="font-bold text-stone-900 text-sm tracking-tight">{artist.name}</span>
          </div>
        ) : (
          <span className="text-stone-300 text-xs italic font-medium">Libre</span>
        )}
      </div>

      {artist ? (
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md">
            {artist.cost}p
          </span>
          <button onClick={onRemove} className="text-stone-300 hover:text-red-500 p-1.5 rounded-lg transition-colors font-bold">
            ✕
          </button>
        </div>
      ) : (
        <span className="text-stone-300 text-[11px] font-semibold tracking-wide">Déposer ↗</span>
      )}
    </div>
  );
}

export default function Home() {
  const [festivalName, setFestivalName] = useState('Festival Fantasy');
  const [festivalLocation, setFestivalLocation] = useState('Le Neubourg');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchedArtist, setSearchedArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [schedule, setSchedule] = useState<Record<string, Artist | null>>(
    ALL_SLOTS.reduce((acc, slot) => ({ ...acc, [slot.id]: null }), {})
  );

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const MAX_POINTS = 50;
  const spentPoints = Object.values(schedule).reduce((total, artist) => total + (artist ? artist.cost : 0), 0);
  const remainingPoints = MAX_POINTS - spentPoints;

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchArtist = async (searchTerm = query) => {
    if (!searchTerm) return;
    setSuggestions([]); 
    setQuery(searchTerm); 
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.error) {
        setError("Artiste introuvable.");
        setSearchedArtist(null);
      } else {
        setSearchedArtist({ ...data, cost: getArtistCost(data.popularity) });
      }
    } catch (err) {
      setError('Erreur de recherche.');
    }
    setLoading(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const targetSlotId = over.id as string;
    const artistToPlace = active.data.current as Artist;

    if (remainingPoints >= artistToPlace.cost) {
      setSchedule((prev) => ({ ...prev, [targetSlotId]: artistToPlace }));
      setSearchedArtist(null);
      setQuery('');
      setError('');
    } else {
      setError(`Budget insuffisant (${artistToPlace.cost} pts requis).`);
    }
  };

  const removeFromSchedule = (slotIdToRemove: string) => {
    setSchedule((prev) => ({ ...prev, [slotIdToRemove]: null }));
    setError('');
  };

  const bookedArtists = Object.values(schedule)
    .filter((artist): artist is Artist => artist !== null)
    .sort((a, b) => b.cost - a.cost);

  const copyAIPrompt = () => {
    const artistNames = bookedArtists.map(a => a.name).join(', ');
    const prompt = `Crée une affiche de festival de musique moderne, artistique et épurée (style design suisse / minimaliste haut de gamme) pour le festival "${festivalName}" à "${festivalLocation}". L'ambiance visuelle générale doit être inspirée par ces genres musicaux et artistes : ${artistNames}. Utilise une typographie audacieuse, une palette de couleurs élégante et soignée, et intègre lisiblement le nom des artistes principaux au centre.`;
    
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 font-sans pb-24 selection:bg-stone-900 selection:text-white">
      <DndContext onDragEnd={handleDragEnd}>
        <main className="p-6 md:p-12 max-w-7xl mx-auto">
          
          <header className="mb-10 bg-white p-6 md:p-8 rounded-[2.5rem] border border-stone-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2 inline-block">
                  Édition Limitée
                </span>
                <input 
                  type="text" 
                  value={festivalName}
                  onChange={(e) => setFestivalName(e.target.value)}
                  className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 bg-transparent border-b-2 border-stone-100 focus:border-stone-900 focus:outline-none w-full sm:w-80 transition-colors pb-1"
                  placeholder="Nom du festival"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-2">Lieu</span>
                <input 
                  type="text" 
                  value={festivalLocation}
                  onChange={(e) => setFestivalLocation(e.target.value)}
                  className="text-sm font-semibold text-stone-800 bg-stone-50 border border-stone-200/80 px-4 py-2.5 rounded-2xl focus:outline-none focus:border-stone-400 w-full sm:w-44"
                  placeholder="Ex: Le Neubourg"
                />
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 px-6 py-4 rounded-2xl flex items-center gap-5 w-full lg:w-auto justify-between lg:justify-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-0.5">Budget</span>
                <span className="text-xl font-black text-stone-900">{remainingPoints} <span className="text-xs text-stone-400 font-medium">/ {MAX_POINTS} pts</span></span>
              </div>
              <div className="w-28 bg-stone-200/80 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${spentPoints > 40 ? 'bg-red-500' : 'bg-stone-900'}`} 
                  style={{ width: `${(spentPoints / MAX_POINTS) * 100}%` }}
                ></div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-xs relative">
                <h2 className="text-sm font-bold tracking-tight text-stone-900 mb-4 flex items-center gap-2">
                  <span>✨</span> Ajouter un artiste
                </h2>
                
                <div className="flex flex-col gap-3 relative">
                  <div className="relative">
                    <input 
                      className="w-full bg-stone-50/80 border border-stone-200/80 text-stone-900 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-stone-400 text-sm placeholder-stone-400 font-medium transition-all"
                      type="text" 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ex: Working Heroes, Anthracite..."
                      onKeyDown={(e) => e.key === 'Enter' && searchArtist()}
                    />
                    
                    {suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-stone-100">
                        {suggestions.map((s) => (
                          <li 
                            key={s.id}
                            onClick={() => searchArtist(s.name)}
                            className="flex items-center justify-between p-3.5 hover:bg-stone-50 cursor-pointer text-sm transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img src={s.picture} alt="" className="w-8 h-8 rounded-full object-cover border border-stone-100" />
                              <span className="font-bold text-stone-900">{s.name}</span>
                            </div>
                            <span className="text-xs font-black bg-stone-100 text-stone-800 px-2.5 py-1 rounded-lg">
                              {s.cost} pts
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button 
                    onClick={() => searchArtist(query)} 
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-2xl transition-all text-sm shadow-sm"
                  >
                    Rechercher
                  </button>
                </div>

                {loading && <div className="mt-4 text-center text-xs text-stone-400">Recherche...</div>}
                {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-center font-medium">{error}</div>}
              </div>

              {searchedArtist && <DraggableArtistCard artist={searchedArtist} />}
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest">Jour 1 • Vendredi</h3>
                  <span className="text-[11px] text-stone-400 font-mono">9 créneaux</span>
                </div>
                <div className="space-y-2.5">
                  {TIME_SLOTS_J1.map((slot) => (
                    <DroppableSlot 
                      key={slot.id} 
                      slotId={slot.id} 
                      label={slot.label} 
                      artist={schedule[slot.id]} 
                      onRemove={() => removeFromSchedule(slot.id)} 
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest">Jour 2 • Samedi</h3>
                  <span className="text-[11px] text-stone-400 font-mono">9 créneaux</span>
                </div>
                <div className="space-y-2.5">
                  {TIME_SLOTS_J2.map((slot) => (
                    <DroppableSlot 
                      key={slot.id} 
                      slotId={slot.id} 
                      label={slot.label} 
                      artist={schedule[slot.id]} 
                      onRemove={() => removeFromSchedule(slot.id)} 
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>

          {bookedArtists.length > 0 && (
            <div className="w-full mt-20 flex flex-col items-center">
              
              <div className="flex flex-col sm:flex-row w-full max-w-4xl justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight">Aperçu de l'Affiche</h2>
                  <p className="text-xs text-stone-500 font-medium">Design graphique minimaliste et épuré</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={copyAIPrompt} 
                    className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-2xs"
                  >
                    <span>{copiedPrompt ? '✓ Prompt copié !' : '📋 Copier le prompt IA'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-[3rem] border border-stone-200/80 shadow-2xl w-full max-w-4xl flex justify-center">
                <div 
                  ref={posterRef} 
                  style={{
                    background: `linear-gradient(135deg, #1c1917, #0c0a09)`,
                    color: '#ffffff'
                  }}
                  className="p-12 md:p-24 rounded-[2.5rem] flex flex-col justify-between items-center text-center w-full min-h-[700px] transition-all duration-700 relative overflow-hidden shadow-xl border border-white/10"
                >
                  <div className="absolute inset-5 border border-current/15 rounded-2xl pointer-events-none flex flex-col justify-between p-6">
                    <div className="flex justify-between text-[10px] font-mono tracking-[0.3em] uppercase opacity-50">
                      <span>Live Experience</span>
                      <span>Vol. II</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono tracking-[0.3em] uppercase opacity-50">
                      <span>Pass 2 Jours</span>
                      <span>Open Air</span>
                    </div>
                  </div>

                  <div className="mt-10 relative z-10">
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.3em] bg-current/10 border border-current/20 mb-6 inline-block opacity-90">
                      Line-up Officiel
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-white">
                      {festivalName}
                    </h1>
                    {festivalLocation && (
                      <p className="font-mono text-xs md:text-sm uppercase tracking-[0.4em] opacity-75 mt-4 text-stone-300">
                        {festivalLocation} — 2 Jours
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-5 w-full px-6 my-12 relative z-10">
                    {bookedArtists.map((artist, index) => (
                      <span 
                        key={index} 
                        className={`font-black uppercase tracking-tight transition-all leading-none text-white
                          ${artist.cost === 5 ? 'text-5xl md:text-7xl w-full my-4 text-center tracking-tighter' : ''}
                          ${artist.cost === 4 ? 'text-3xl md:text-5xl mx-3 my-2' : ''}
                          ${artist.cost === 3 ? 'text-2xl md:text-3xl mx-2 my-1' : ''}
                          ${artist.cost === 2 ? 'text-lg md:text-xl mx-2 opacity-90 font-bold' : ''}
                          ${artist.cost === 1 ? 'text-sm md:text-base mx-2 opacity-70 font-semibold' : ''}
                        `}
                      >
                        {artist.name}
                      </span>
                    ))}
                  </div>

                  <div className="relative z-10 opacity-60 font-mono text-[10px] tracking-[0.4em] uppercase text-stone-300">
                    <span>Programmation Exclusive</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </DndContext>
    </div>
  );
}