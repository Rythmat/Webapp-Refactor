import React, { useState, useEffect, useRef } from 'react';
import { Search, Shuffle, Clock, Globe, Music, Users, Info, X, MapPin, Menu, Heart, History, TrendingUp, Settings, LucideIcon, ChevronRight } from 'lucide-react';

// --- Types ---
declare global { interface Window { L: any; } }
type SelectionType = 'Nation' | 'Sub-national' | 'Municipality';
interface SelectionData { name: string; type: SelectionType; path: string[]; population?: string; description: string; }
interface City { name: string; coords: [number, number]; country: string; subNational: string; population: string; }

// Component Props
interface WorldMapExplorerProps {
  className?: string;
  style?: React.CSSProperties;
  initialYear?: number;
}

// --- Static Data ---
const REGIONS: Record<string, { center: [number, number]; zoom: number }> = {
  "North America": { center: [45, -100], zoom: 3 }, "Central America": { center: [15, -90], zoom: 5 }, "South America": { center: [-15, -60], zoom: 3 },
  "North Europe": { center: [60, 10], zoom: 4 }, "West Europe": { center: [48, 5], zoom: 5 }, "East Europe": { center: [50, 25], zoom: 4 },
  "North Asia": { center: [60, 90], zoom: 3 }, "Central Asia": { center: [45, 65], zoom: 4 }, "West Asia": { center: [30, 45], zoom: 4 },
  "East Asia": { center: [35, 105], zoom: 3 }, "South Asia": { center: [20, 80], zoom: 4 }, "North Africa": { center: [25, 10], zoom: 4 },
  "Central Africa": { center: [0, 20], zoom: 4 }, "West Africa": { center: [10, 0], zoom: 4 }, "East Africa": { center: [0, 35], zoom: 4 },
  "South Africa": { center: [-25, 25], zoom: 4 }, "Oceania": { center: [-25, 135], zoom: 3 }
};

const CITIES: City[] = [
  { name: "New York", coords: [40.7128, -74.0060], country: "USA", subNational: "New York", population: "8.4M" },
  { name: "Los Angeles", coords: [34.0522, -118.2437], country: "USA", subNational: "California", population: "3.9M" },
  { name: "London", coords: [51.5074, -0.1278], country: "UK", subNational: "England", population: "8.9M" },
  { name: "Paris", coords: [48.8566, 2.3522], country: "France", subNational: "Île-de-France", population: "2.1M" },
  { name: "Tokyo", coords: [35.6762, 139.6503], country: "Japan", subNational: "Tokyo Prefecture", population: "13.9M" },
  { name: "Shanghai", coords: [31.2304, 121.4737], country: "China", subNational: "Shanghai", population: "24.2M" },
  { name: "São Paulo", coords: [-23.5505, -46.6333], country: "Brazil", subNational: "São Paulo", population: "12.3M" },
  { name: "Mexico City", coords: [19.4326, -99.1332], country: "Mexico", subNational: "Mexico City", population: "8.8M" },
  { name: "Cairo", coords: [30.0444, 31.2357], country: "Egypt", subNational: "Cairo Governorate", population: "9.5M" },
  { name: "Mumbai", coords: [19.0760, 72.8777], country: "India", subNational: "Maharashtra", population: "12.4M" },
  { name: "Sydney", coords: [-33.8688, 151.2093], country: "Australia", subNational: "New South Wales", population: "5.3M" },
  { name: "Moscow", coords: [55.7558, 37.6173], country: "Russia", subNational: "Moscow", population: "11.9M" },
  { name: "Istanbul", coords: [41.0082, 28.9784], country: "Turkey", subNational: "Istanbul Province", population: "15.4M" },
  { name: "Dubai", coords: [25.2048, 55.2708], country: "UAE", subNational: "Dubai", population: "3.1M" },
  { name: "Singapore", coords: [1.3521, 103.8198], country: "Singapore", subNational: "Singapore", population: "5.6M" },
  { name: "Berlin", coords: [52.5200, 13.4050], country: "Germany", subNational: "Berlin", population: "3.6M" },
  { name: "Toronto", coords: [43.6510, -79.3470], country: "Canada", subNational: "Ontario", population: "2.9M" },
  { name: "Buenos Aires", coords: [-34.6037, -58.3816], country: "Argentina", subNational: "Buenos Aires", population: "2.8M" },
];

const MENU_ITEMS = [
  { label: 'Saved', icon: Heart }, { label: 'Recents', icon: History },
  { label: 'Your timeline', icon: TrendingUp }, { label: 'Location sharing', icon: MapPin },
  { label: 'Search settings', icon: Settings }
];

// --- Styles ---
const Styles = () => (
  <style>{`
    .leaflet-container{width:100%;height:100%;background-color:#64C7D9;font-family:'Inter',sans-serif;z-index:1}
    .leaflet-control-zoom{border:none!important;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)!important}
    .leaflet-control-zoom a{background-color:#e5e5e5!important;color:#333!important;border:1px solid #ccc!important;border-radius:4px!important;margin-bottom:4px!important}
    input[type=range]{-webkit-appearance:none;width:100%;background:transparent}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;height:20px;width:20px;border-radius:50%;background:#fff;cursor:pointer;margin-top:-8px;box-shadow:0 0 4px rgba(0,0,0,0.5)}
    input[type=range]::-webkit-slider-runnable-track{width:100%;height:4px;cursor:pointer;background:#555;border-radius:2px}
    .leaflet-control-attribution{display:none} .hide-scrollbar::-webkit-scrollbar{display:none} .hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
    .custom-checkbox{width:18px;height:18px;border:2px solid #555;border-radius:4px;display:flex;align-items:center;justify-content:center;margin-right:12px;transition:all 0.2s}
    .custom-checkbox.checked{background-color:#fff;border-color:#fff}
    .dropdown-animate{animation:fadeIn 0.2s ease-out} @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  `}</style>
);

// --- Helper Components ---
const FilterPill = ({ icon: I, label, active, onClick, dropdownOpen }: any) => (
  <div className="relative">
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(active || dropdownOpen) ? 'bg-zinc-100 text-black shadow-lg scale-105' : 'bg-zinc-800/80 text-gray-300 hover:bg-zinc-700 hover:text-white backdrop-blur-sm'}`}>
      {I && <I size={14} />} <span>{label}</span>
    </button>
  </div>
);

const DropdownMenu = ({ items, type = "list" }: any) => (
  <div className="absolute top-full left-0 mt-2 z-[2000] bg-[#1a1a1a]/95 backdrop-blur-md border border-zinc-700 rounded-lg shadow-2xl p-2 w-64 dropdown-animate">
    <ul className="flex flex-col max-h-96 overflow-y-auto hide-scrollbar">
      {items.map((item: any, idx: number) => (
        <li key={idx} onClick={() => item.onClick && item.onClick()} className="group flex items-center px-3 py-2.5 hover:bg-zinc-700/50 rounded-md cursor-pointer transition-colors text-zinc-300 hover:text-white">
          {type === 'checkbox' && <div className={`custom-checkbox ${item.checked ? 'checked' : ''}`}>{item.checked && <div className="w-2 h-2 bg-black rounded-sm" />}</div>}
          {item.icon && <item.icon size={18} className="mr-3 text-zinc-400 group-hover:text-white" />} <span className="text-sm font-medium">{item.label}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Timeline = ({ year, setYear }: any) => (
  <div className="absolute bottom-0 left-0 right-0 bg-[#111] text-white p-6 z-[1000] border-t border-zinc-800">
    <div className="max-w-7xl mx-auto w-full relative">
      <div className="relative h-12 flex items-center">
        <input type="range" min="1900" max="2025" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full z-20 relative" />
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between w-full pointer-events-none px-1">
          {[1900, 1925, 1950, 1975, 2000, 2025].map(m => <div key={m} className="flex flex-col items-center"><div className="h-4 w-0.5 bg-zinc-600 mb-2"></div></div>)}
        </div>
      </div>
      <div className="flex justify-between w-full text-zinc-400 text-sm font-medium mt-1 select-none">
        {[1900, 1925, 1950, 1975, 2000, 2025].map(m => <span key={m} className={Math.abs(year - m) < 10 ? 'text-white' : ''}>{m}</span>)}
      </div>
      <div className="absolute top-0 -translate-y-full mb-2 bg-white text-black px-3 py-1 rounded-full font-bold text-sm shadow-lg pointer-events-none transition-all duration-75" style={{ left: `${((year - 1900) / 125) * 100}%`, transform: 'translateX(-50%) translateY(-20px)' }}>{year}</div>
    </div>
  </div>
);

// --- Main Component ---
const WorldMapExplorer: React.FC<WorldMapExplorerProps> = ({ className, style, initialYear = 2025 }) => {
  const [data, setData] = useState<{ world: any, states: any }>({ world: null, states: null });
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(initialYear);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [libLoaded, setLibLoaded] = useState(false);
  const [menu, setMenu] = useState<'main' | 'decade' | 'region' | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const layers = useRef<{ world: any; states: any; cities: any }>({ world: null, states: null, cities: null });

  // 1. Load Leaflet & Fetch Data
  useEffect(() => {
    // Prevent duplicate script loading which happens in React Strict Mode
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    
    if (window.L && window.L.map) {
      setLibLoaded(true);
    } else if (existingScript) {
      existingScript.addEventListener('load', () => setLibLoaded(true));
    } else {
       // Load CSS
       if (!document.querySelector('link[href*="leaflet.css"]')) {
         const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
       }
       // Load JS
       const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true;
       script.onload = () => setLibLoaded(true); document.body.appendChild(script);
    }
    
    const fetchData = async () => {
      try {
        const [wRes, sRes] = await Promise.all([
          fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'),
          fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        ]);
        setData({ world: await wRes.json(), states: await sRes.json() });
        setLoading(false);
      } catch (e) { console.error("Failed to load map data", e); setLoading(false); }
    };
    fetchData();
  }, []);

  // 2. Initialize Map & Layers
  useEffect(() => {
    // Strict check for Leaflet readiness
    if (!libLoaded || !data.world || !mapRef.current || mapInst.current) return;
    if (!window.L || !window.L.map) return; 

    const L = window.L;

    // Map Setup
    const map = L.map(mapRef.current, { center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 6, zoomControl: false, worldCopyJump: true, attributionControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInst.current = map;

    // Helper to create GeoJSON Layers
    const createGeoLayer = (geoData: any, isNation: boolean) => L.geoJSON(geoData, {
      style: isNation ? { fillColor: '#A7D8AF', weight: 0.5, opacity: 1, color: '#8FC599', fillOpacity: 1 } : { fillColor: 'transparent', weight: 0.8, opacity: 0.6, color: '#555', dashArray: '3', fillOpacity: 0 },
      onEachFeature: (feature: any, layer: any) => {
        layer.on({
          mouseover: (e: any) => { 
            e.target.setStyle(isNation ? { fillColor: '#8BC795', weight: 1, color: '#666' } : { weight: 2, color: '#333', dashArray: '', fillColor: '#8BC795', fillOpacity: 0.2 });
            if(isNation) e.target.bringToFront(); 
          },
          mouseout: (e: any) => { 
            layers.current[isNation ? 'world' : 'states']?.resetStyle(e.target);
            ['states', 'cities'].forEach(k => { if(map.hasLayer(layers.current[k as keyof typeof layers.current])) layers.current[k as keyof typeof layers.current]?.bringToFront(); });
          },
          click: (e: any) => {
            const name = feature.properties.name || "Unknown";
            setSelection({ 
              name, type: isNation ? 'Nation' : 'Sub-national', 
              path: isNation ? [name] : ['USA', name], 
              description: `${isNation ? 'National' : 'State-level'} historical archives for ${name}` 
            });
            setMenu(null);
            if(!isNation) L.DomEvent.stopPropagation(e);
          }
        });
      }
    });

    // Create Layers
    layers.current.world = createGeoLayer(data.world, true).addTo(map);
    if(data.states) layers.current.states = createGeoLayer(data.states, false); // Not added initially
    
    // Cities Layer
    const citiesGroup = L.featureGroup();
    CITIES.forEach(c => {
      const m = L.circleMarker(c.coords, { radius: 5, fillColor: "#fff", color: "#333", weight: 1.5, opacity: 1, fillOpacity: 1 });
      m.on('click', (e: any) => {
        setSelection({ name: c.name, type: 'Municipality', path: [c.country, c.subNational, c.name], population: c.population, description: `Municipal data for ${c.name}` });
        L.DomEvent.stopPropagation(e);
      });
      m.bindTooltip(`<b>${c.name}</b>`).addTo(citiesGroup);
    });
    layers.current.cities = citiesGroup;

    // Global Click
    map.on('click', () => setMenu(null));
    
    // Zoom Manager
    const onZoom = () => {
      const showDetails = map.getZoom() >= 4;
      ['states', 'cities'].forEach(k => {
        const layer = layers.current[k as 'states' | 'cities'];
        if (!layer) return;
        if (showDetails) { if (!map.hasLayer(layer)) { map.addLayer(layer); layer.bringToFront(); } }
        else if (map.hasLayer(layer)) map.removeLayer(layer);
      });
    };
    map.on('zoomend', onZoom);
    onZoom(); // Init state

    return () => {
        if (mapInst.current) {
            mapInst.current.remove();
            mapInst.current = null;
        }
    };
  }, [libLoaded, data]);

  // Update desc on year change
  useEffect(() => { if (selection) setSelection(prev => prev ? { ...prev, description: `${prev.type} level archives for ${prev.name} in ${year}.` } : null); }, [year]);

  const toggleMenu = (m: any) => setMenu(prev => prev === m ? null : m);

  return (
    <div className={`flex flex-col w-full bg-[#111] overflow-hidden relative ${className || 'h-screen'}`} style={style}>
      <Styles />
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4 pointer-events-auto relative">
          <div className="relative">
            <div className="bg-zinc-900/90 backdrop-blur-md rounded-full flex items-center px-4 py-2.5 shadow-xl border border-zinc-700 w-full md:w-80 group focus-within:ring-2 ring-blue-500/50 transition-all z-20">
              <button onClick={() => toggleMenu('main')} className="mr-3 text-zinc-400 hover:text-white transition-colors p-1 -ml-2"><Menu size={20} /></button>
              <input type="text" placeholder="Search history..." className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full text-sm font-medium" />
              <div className="flex items-center space-x-2 text-zinc-400"><Search size={18} /><div className="w-px h-4 bg-zinc-700 mx-1"></div><Shuffle size={18} /></div>
            </div>
            {menu === 'main' && <DropdownMenu items={MENU_ITEMS.map(i => ({...i, onClick: ()=>setMenu(null)}))} />}
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <div className="relative">
              <FilterPill icon={Clock} label="Decade" active={menu === 'decade'} onClick={() => toggleMenu('decade')} dropdownOpen={menu === 'decade'} />
              {menu === 'decade' && <DropdownMenu items={Array.from({ length: 13 }, (_, i) => ({ label: `${2020 - i * 10}'s`, checked: year >= (2020 - i * 10) && year < (2020 - i * 10 + 10), onClick: () => { setYear(2020 - i * 10); setMenu(null); } }))} type="checkbox" />}
            </div>
            <div className="relative">
              <FilterPill icon={MapPin} label="Region" active={menu === 'region'} onClick={() => toggleMenu('region')} dropdownOpen={menu === 'region'} />
              {menu === 'region' && <DropdownMenu items={Object.keys(REGIONS).map(r => ({ label: r, onClick: () => { mapInst.current?.flyTo(REGIONS[r].center, REGIONS[r].zoom, { duration: 1.5 }); setMenu(null); } }))} type="checkbox" />}
            </div>
            <FilterPill icon={Music} label="Genre" /> <FilterPill icon={Globe} label="Culture" /> <FilterPill icon={Users} label="Musicians" />
          </div>
        </div>
      </div>

      {/* Map & Card */}
      <div className="flex-1 relative z-0 bg-[#64C7D9]">
        {(!libLoaded || loading) && <div className="absolute inset-0 flex items-center justify-center text-white bg-[#64C7D9] z-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div></div>}
        <div ref={mapRef} className="w-full h-full" />
        {selection && (
          <div className="absolute bottom-4 left-4 z-[1000] mb-20 md:mb-0 md:bottom-24 md:left-4">
            <div className="bg-white rounded-xl shadow-2xl p-4 w-80 transform transition-all animate-in fade-in slide-in-from-bottom-4 border border-zinc-200">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{selection.path.map((item, i) => <React.Fragment key={i}><span>{item}</span>{i < selection.path.length - 1 && <ChevronRight size={10} className="mx-0.5" />}</React.Fragment>)}</div>
                  <h3 className="font-bold text-xl text-gray-900 leading-none">{selection.name}</h3>
                </div>
                <button onClick={() => setSelection(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
              </div>
              <div className="mb-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selection.type === 'Nation' ? 'bg-blue-100 text-blue-700' : selection.type === 'Sub-national' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{selection.type}</span>{selection.population && <span className="ml-2 text-xs text-gray-500">Pop: {selection.population}</span>}</div>
              <div className="h-32 bg-zinc-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative border border-zinc-200"><div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div><MapPin className="text-zinc-400 mb-1" size={32} /><div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-medium drop-shadow-md">{year} Archive</div></div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{selection.description} Explore the musical evolution of this {selection.type.toLowerCase()} during the {Math.floor(year / 10) * 10}s.</p>
              <div className="flex gap-2"><button className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 uppercase">More Info</button><button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 uppercase">Directions</button></div>
            </div>
          </div>
        )}
      </div>
      <Timeline year={year} setYear={setYear} />
      <div className="absolute bottom-24 right-4 md:right-auto md:left-4 text-white/50 text-xs font-sans z-[900] pointer-events-none mix-blend-overlay">Google</div>
    </div>
  );
};

export default WorldMapExplorer;

