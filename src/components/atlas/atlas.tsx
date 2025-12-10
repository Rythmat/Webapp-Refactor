import React, { useState, useEffect, useRef } from 'react';
import {
 Search, Shuffle, Clock, Globe, Music, Users, X, MapPin,
 Menu, Heart, History, TrendingUp, Settings, LucideIcon, ChevronRight
} from 'lucide-react';


// ==========================================
// 1. Type Definitions & Interfaces
// ==========================================


/**
* Extends the Window interface to include the Leaflet library
* which is loaded via CDN.
*/
declare global {
 interface Window {
   L: any;
 }
}


interface RegionCoord {
 center: [number, number];
 zoom: number;
}


// Updated interface to support Hierarchy
interface SelectionData {
 name: string;
 type: 'Nation' | 'Sub-national' | 'Municipality';
 path: string[]; // e.g. ["USA", "New York", "New York City"]
 population?: string;
 description: string;
}


interface MenuItem {
 label: string;
 icon?: LucideIcon;
 checked?: boolean;
 onClick?: () => void;
}


interface FilterPillProps {
 icon?: LucideIcon;
 label: string;
 active?: boolean;
 onClick?: () => void;
 dropdownOpen?: boolean;
}


interface DropdownMenuProps {
 items: MenuItem[];
 type?: 'list' | 'checkbox';
 positionClass?: string;
}


interface TimelineProps {
 year: number;
 setYear: (year: number) => void;
}


interface City {
 name: string;
 coords: [number, number];
 country: string;
 subNational: string; // State, Province, Prefecture, etc.
 population: string;
}


// ==========================================
// 2. Global Styles (Leaflet & UI)
// ==========================================


const GlobalStyles: React.FC = () => (
 <style>{`
   .leaflet-container {
     width: 100%;
     height: 100%;
     background-color: #64C7D9; /* Ocean Color */
     font-family: 'Inter', sans-serif;
     z-index: 1;
   }
   .leaflet-control-zoom {
     border: none !important;
     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
   }
   .leaflet-control-zoom a {
     background-color: #e5e5e5 !important;
     color: #333 !important;
     border: 1px solid #ccc !important;
     border-radius: 4px !important;
     margin-bottom: 4px !important;
   }
   /* Custom Scrollbar for range input */
   input[type=range] {
     -webkit-appearance: none;
     width: 100%;
     background: transparent;
   }
   input[type=range]::-webkit-slider-thumb {
     -webkit-appearance: none;
     height: 20px;
     width: 20px;
     border-radius: 50%;
     background: #ffffff;
     cursor: pointer;
     margin-top: -8px;
     box-shadow: 0 0 4px rgba(0,0,0,0.5);
   }
   input[type=range]::-webkit-slider-runnable-track {
     width: 100%;
     height: 4px;
     cursor: pointer;
     background: #555;
     border-radius: 2px;
   }
   .leaflet-control-attribution {
     display: none;
   }
   /* Hide scrollbar for filter pills */
   .hide-scrollbar::-webkit-scrollbar {
     display: none;
   }
   .hide-scrollbar {
     -ms-overflow-style: none;
     scrollbar-width: none;
   }
  
   /* Custom Checkbox Style */
   .custom-checkbox {
     width: 18px;
     height: 18px;
     border: 2px solid #555;
     border-radius: 4px;
     display: flex;
     align-items: center;
     justify-content: center;
     margin-right: 12px;
     transition: all 0.2s;
   }
   .custom-checkbox.checked {
     background-color: #fff;
     border-color: #fff;
   }
   .dropdown-animate {
     animation: fadeIn 0.2s ease-out;
   }
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(-10px); }
     to { opacity: 1; transform: translateY(0); }
   }
  
   /* Breadcrumb Animation */
   .breadcrumb-item {
     display: inline-flex;
     align-items: center;
   }
 `}</style>
);


// ==========================================
// 3. UI Components
// ==========================================


const FilterPill: React.FC<FilterPillProps> = ({
 icon: Icon,
 label,
 active,
 onClick,
 dropdownOpen
}) => (
 <div className="relative">
   <button
     onClick={onClick}
     className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
     (active || dropdownOpen)
       ? 'bg-zinc-100 text-black shadow-lg scale-105'
       : 'bg-zinc-800/80 text-gray-300 hover:bg-zinc-700 hover:text-white backdrop-blur-sm'
   }`}>
     {Icon && <Icon size={14} />}
     <span>{label}</span>
   </button>
 </div>
);


const DropdownMenu: React.FC<DropdownMenuProps> = ({
 items,
 type = "list",
 positionClass = "top-full left-0 mt-2"
}) => (
 <div className={`absolute ${positionClass} z-[2000] bg-[#1a1a1a]/95 backdrop-blur-md border border-zinc-700 rounded-lg shadow-2xl p-2 w-64 dropdown-animate`}>
   <ul className="flex flex-col max-h-96 overflow-y-auto hide-scrollbar">
     {items.map((item, idx) => (
       <li
         key={idx}
         onClick={() => item.onClick && item.onClick()}
         className="group flex items-center px-3 py-2.5 hover:bg-zinc-700/50 rounded-md cursor-pointer transition-colors text-zinc-300 hover:text-white"
       >
         {type === 'checkbox' && (
           <div className={`custom-checkbox ${item.checked ? 'checked' : ''}`}>
              {item.checked && <div className="w-2 h-2 bg-black rounded-sm" />}
           </div>
         )}
         {item.icon && <item.icon size={18} className="mr-3 text-zinc-400 group-hover:text-white" />}
         <span className="text-sm font-medium">{item.label}</span>
       </li>
     ))}
   </ul>
 </div>
);


const Timeline: React.FC<TimelineProps> = ({ year, setYear }) => {
 const marks = [1900, 1925, 1950, 1975, 2000, 2025];
  return (
   <div className="absolute bottom-0 left-0 right-0 bg-[#111] text-white p-6 z-[1000] border-t border-zinc-800">
     <div className="max-w-7xl mx-auto w-full relative">
       <div className="relative h-12 flex items-center">
         <input
           type="range"
           min="1900"
           max="2025"
           value={year}
           onChange={(e) => setYear(parseInt(e.target.value))}
           className="w-full z-20 relative"
         />
         <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between w-full pointer-events-none px-1">
            {marks.map((mark) => (
              <div key={mark} className="flex flex-col items-center">
                <div className="h-4 w-0.5 bg-zinc-600 mb-2"></div>
              </div>
            ))}
         </div>
       </div>
       <div className="flex justify-between w-full text-zinc-400 text-sm font-medium mt-1 select-none">
         {marks.map((mark) => (
           <span key={mark} className={Math.abs(year - mark) < 10 ? 'text-white transition-colors' : ''}>{mark}</span>
         ))}
       </div>
       <div
         className="absolute top-0 -translate-y-full mb-2 bg-white text-black px-3 py-1 rounded-full font-bold text-sm shadow-lg pointer-events-none transition-all duration-75"
         style={{ left: `${((year - 1900) / 125) * 100}%`, transform: 'translateX(-50%) translateY(-20px)' }}
       >
         {year}
       </div>
     </div>
   </div>
 );
};


// ==========================================
// 4. Main Application
// ==========================================


const Atlas: React.FC = () => {
 // --- State ---
 const [geoJsonData, setGeoJsonData] = useState<any>(null);
 const [usStatesData, setUsStatesData] = useState<any>(null);
 const [loading, setLoading] = useState<boolean>(true);
 const [currentYear, setCurrentYear] = useState<number>(2025);
  // Revised selection state to support hierarchy
 const [selection, setSelection] = useState<SelectionData | null>(null);
  const [libLoaded, setLibLoaded] = useState<boolean>(false);
 const [activeMenu, setActiveMenu] = useState<'main' | 'decade' | 'region' | null>(null);


 // --- Refs ---
 const mapContainerRef = useRef<HTMLDivElement>(null);
 const mapInstanceRef = useRef<any>(null);
 const worldLayerRef = useRef<any>(null);
 const statesLayerRef = useRef<any>(null);
 const citiesLayerRef = useRef<any>(null);


 // --- Data ---
 const regionCoordinates: Record<string, RegionCoord> = {
   "North America": { center: [45, -100], zoom: 3 },
   "Central America": { center: [15, -90], zoom: 5 },
   "South America": { center: [-15, -60], zoom: 3 },
   "North Europe": { center: [60, 10], zoom: 4 },
   "West Europe": { center: [48, 5], zoom: 5 },
   "East Europe": { center: [50, 25], zoom: 4 },
   "North Asia": { center: [60, 90], zoom: 3 },
   "Central Asia": { center: [45, 65], zoom: 4 },
   "West Asia": { center: [30, 45], zoom: 4 },
   "East Asia": { center: [35, 105], zoom: 3 },
   "South Asia": { center: [20, 80], zoom: 4 },
   "North Africa": { center: [25, 10], zoom: 4 },
   "Central Africa": { center: [0, 20], zoom: 4 },
   "West Africa": { center: [10, 0], zoom: 4 },
   "East Africa": { center: [0, 35], zoom: 4 },
   "South Africa": { center: [-25, 25], zoom: 4 },
   "Oceania": { center: [-25, 135], zoom: 3 }
 };


 // Enriched City Data with Sub-national divisions
 const majorCities: City[] = [
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


 const menuItems: MenuItem[] = [
   { label: 'Saved', icon: Heart, onClick: () => setActiveMenu(null) },
   { label: 'Recents', icon: History, onClick: () => setActiveMenu(null) },
   { label: 'Your timeline', icon: TrendingUp, onClick: () => setActiveMenu(null) },
   { label: 'Location sharing', icon: MapPin, onClick: () => setActiveMenu(null) },
   { label: 'Search settings', icon: Settings, onClick: () => setActiveMenu(null) },
 ];


 const decadeItems: MenuItem[] = Array.from({ length: 13 }, (_, i) => {
   const year = 2020 - (i * 10);
   return {
     label: `${year}'s`,
     checked: currentYear >= year && currentYear < year + 10,
     onClick: () => {
       setCurrentYear(year);
       setActiveMenu(null);
     }
   };
 });


 const regionItems: MenuItem[] = Object.keys(regionCoordinates).map(r => ({
   label: r,
   checked: false,
   onClick: () => {
     const { center, zoom } = regionCoordinates[r];
     if (mapInstanceRef.current) {
       mapInstanceRef.current.flyTo(center, zoom, { duration: 1.5 });
     }
     setActiveMenu(null);
   }
 }));


 // --- Effects ---


 // 1. Load Leaflet
 useEffect(() => {
   const link = document.createElement('link');
   link.rel = 'stylesheet';
   link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
   document.head.appendChild(link);


   const script = document.createElement('script');
   script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
   script.async = true;
   script.onload = () => setLibLoaded(true);
   document.body.appendChild(script);


   return () => {
     document.head.removeChild(link);
     document.body.removeChild(script);
   };
 }, []);


 // 2. Fetch Data (World + States)
 useEffect(() => {
   const fetchMapData = async () => {
     try {
       // Fetch World
       const worldRes = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
       const worldData = await worldRes.json();
       setGeoJsonData(worldData);
       setLoading(false);


       // Fetch US States
       const usStatesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
       const usData = await usStatesRes.json();
       setUsStatesData(usData);


     } catch (err) {
       console.error("Error loading map data:", err);
       setLoading(false);
     }
   };


   fetchMapData();
 }, []);


 // 3. Initialize Map & World Layer
 useEffect(() => {
   if (!libLoaded || !geoJsonData || !mapContainerRef.current) return;
   if (mapInstanceRef.current) return;


   const L = window.L;


   // --- Map Instance ---
   const map = L.map(mapContainerRef.current, {
     center: [20, 0],
     zoom: 2,
     minZoom: 2,
     maxZoom: 6,
     zoomControl: false,
     worldCopyJump: true,
     attributionControl: false
   });


   L.control.zoom({ position: 'bottomright' }).addTo(map);
   mapInstanceRef.current = map;


   // --- Styling ---
   const countryStyle = {
     fillColor: '#A7D8AF',
     weight: 0.5,
     opacity: 1,
     color: '#8FC599',
     fillOpacity: 1,
   };


   const highlightStyle = {
     fillColor: '#8BC795',
     weight: 1,
     color: '#666',
   };


   // --- World Layer (Nations) ---
   const geoLayer = L.geoJSON(geoJsonData, {
     style: countryStyle,
     onEachFeature: (feature: any, layer: any) => {
       layer.on({
         mouseover: (e: any) => {
           const l = e.target;
           l.setStyle(highlightStyle);
           l.bringToFront();
         },
         mouseout: (e: any) => {
           geoLayer.resetStyle(e.target);
           // Re-order layers to ensure States and Cities stay on top
           if (statesLayerRef.current?.bringToFront) statesLayerRef.current.bringToFront();
           if (citiesLayerRef.current?.bringToFront) citiesLayerRef.current.bringToFront();
         },
         click: () => {
           const countryName = feature.properties.name || "Unknown Region";
           // HIERARCHY: Nation level
           setSelection({
             name: countryName,
             type: 'Nation',
             path: [countryName],
             description: `National historical archives for ${countryName}`
           });
           setActiveMenu(null);
         }
       });
     }
   }).addTo(map);
   worldLayerRef.current = geoLayer;


   // --- Cities Layer (Municipalities) ---
   const citiesGroup = L.featureGroup().addTo(map);
   majorCities.forEach(city => {
       const marker = L.circleMarker(city.coords, {
           radius: 5,
           fillColor: "#ffffff",
           color: "#333",
           weight: 1.5,
           opacity: 1,
           fillOpacity: 1
       });
      
       marker.on('click', (e: any) => {
           // HIERARCHY: Municipality level
           setSelection({
               name: city.name,
               type: 'Municipality',
               path: [city.country, city.subNational, city.name],
               population: city.population,
               description: `Municipal historical data for ${city.name}`
           });
           L.DomEvent.stopPropagation(e); // Stop clicking through to Country
       });


       marker.addTo(citiesGroup);
       // Simple tooltip on hover
       marker.bindTooltip(`<b>${city.name}</b>`);
   });
   citiesLayerRef.current = citiesGroup;


   // Global click to clear selection
   map.on('click', () => {
       setActiveMenu(null);
   });


   return () => {
     map.remove();
     mapInstanceRef.current = null;
   };
 }, [libLoaded, geoJsonData]);


 // 4. Add US States Layer (Sub-national) when available
 useEffect(() => {
   if (!mapInstanceRef.current || !window.L || !usStatesData) return;
   if (statesLayerRef.current) return; // Prevent double add


   const L = window.L;
  
   const stateStyle = {
     fillColor: 'transparent',
     weight: 0.8,
     opacity: 0.6,
     color: '#555',
     dashArray: '3',
     fillOpacity: 0,
   };


   const stateHighlightStyle = {
       weight: 2,
       color: '#333',
       dashArray: '',
       fillColor: '#8BC795',
       fillOpacity: 0.2
   };


   const statesLayer = L.geoJSON(usStatesData, {
       style: stateStyle,
       onEachFeature: (feature: any, layer: any) => {
           layer.on({
               mouseover: (e: any) => {
                   e.target.setStyle(stateHighlightStyle);
               },
               mouseout: (e: any) => {
                   statesLayer.resetStyle(e.target);
               },
               click: (e: any) => {
                   const stateName = feature.properties.name;
                   // HIERARCHY: Sub-national level
                   setSelection({
                       name: stateName,
                       type: 'Sub-national',
                       path: ['USA', stateName],
                       description: `State-level historical archives for ${stateName}`
                   });
                   L.DomEvent.stopPropagation(e); // Stop clicking through to USA
               }
           });
       }
   }).addTo(mapInstanceRef.current);
  
   statesLayerRef.current = statesLayer;
  
   // Ensure Cities are always on top of everything
   if (citiesLayerRef.current?.bringToFront) citiesLayerRef.current.bringToFront();


 }, [usStatesData, libLoaded]);


 // 5. Update Popup Data Description on Year Change
 useEffect(() => {
   if (selection) {
       setSelection(prev =>
         prev ? {...prev, description: `${prev.type} level archives for ${prev.name} in ${currentYear}.`} : null
       );
   }
 }, [currentYear]);


 // --- Handlers ---
 const toggleMenu = (menu: 'main' | 'decade' | 'region') => {
   setActiveMenu(prev => prev === menu ? null : menu);
 };


 return (
   <div className="flex flex-col h-screen w-full bg-[#111] overflow-hidden relative" onClick={() => {}}>
     <GlobalStyles />


     {/* --- Top Bar Overlay --- */}
     <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
       <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4 pointer-events-auto relative">
        
         {/* Search Bar Container */}
         <div className="relative">
           <div className="bg-zinc-900/90 backdrop-blur-md rounded-full flex items-center px-4 py-2.5 shadow-xl border border-zinc-700 w-full md:w-80 group focus-within:ring-2 ring-blue-500/50 transition-all z-20 relative">
             <button
               onClick={() => toggleMenu('main')}
               className="mr-3 text-zinc-400 hover:text-white transition-colors p-1 -ml-2 rounded-full hover:bg-zinc-800"
             >
               <Menu size={20} />
             </button>
             <input
               type="text"
               placeholder="Search history..."
               className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full text-sm font-medium"
             />
             <div className="flex items-center space-x-2 text-zinc-400">
               <Search size={18} className="cursor-pointer hover:text-white" />
               <div className="w-px h-4 bg-zinc-700 mx-1"></div>
               <Shuffle size={18} className="cursor-pointer hover:text-white" />
             </div>
           </div>


           {/* Main Menu Dropdown */}
           {activeMenu === 'main' && (
             <DropdownMenu items={menuItems} positionClass="top-full left-0 mt-2" />
           )}
         </div>


         {/* Filter Chips Container */}
         <div className="flex flex-wrap gap-2 items-start">
          
           {/* Decade Pill & Dropdown */}
           <div className="relative">
             <FilterPill
               icon={Clock}
               label="Decade"
               active={activeMenu === 'decade'}
               onClick={() => toggleMenu('decade')}
               dropdownOpen={activeMenu === 'decade'}
             />
             {activeMenu === 'decade' && (
               <DropdownMenu items={decadeItems} type="checkbox" positionClass="top-full left-0 mt-2" />
             )}
           </div>


           {/* Region Pill & Dropdown */}
           <div className="relative">
             <FilterPill
               icon={MapPin}
               label="Region"
               active={activeMenu === 'region'}
               onClick={() => toggleMenu('region')}
               dropdownOpen={activeMenu === 'region'}
             />
             {activeMenu === 'region' && (
               <DropdownMenu items={regionItems} type="checkbox" positionClass="top-full left-0 mt-2" />
             )}
           </div>


           {/* Other Pills */}
           <FilterPill icon={Music} label="Genre" onClick={() => setActiveMenu(null)} />
           <FilterPill icon={Globe} label="Culture" onClick={() => setActiveMenu(null)} />
           <FilterPill icon={Users} label="Musicians" onClick={() => setActiveMenu(null)} />
         </div>


       </div>
     </div>


     {/* --- Map Area --- */}
     <div className="flex-1 relative z-0 bg-[#64C7D9]">
       {(!libLoaded || loading) && (
         <div className="absolute inset-0 flex items-center justify-center text-white bg-[#64C7D9] z-50">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
         </div>
       )}
      
       <div ref={mapContainerRef} className="w-full h-full" />


       {/* Selected Hierarchy Details Card */}
       {selection && (
         <div className="absolute bottom-4 left-4 z-[1000] mb-20 md:mb-0 md:bottom-24 md:left-4">
            <div className="bg-white rounded-xl shadow-2xl p-4 w-80 transform transition-all animate-in fade-in slide-in-from-bottom-4 border border-zinc-200">
              
               {/* Header with Type Badge */}
               <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                       {/* HIERARCHY BREADCRUMBS */}
                       <div className="flex items-center text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                           {selection.path.map((item, index) => (
                               <React.Fragment key={index}>
                                   <span>{item}</span>
                                   {index < selection.path.length - 1 && <ChevronRight size={10} className="mx-0.5" />}
                               </React.Fragment>
                           ))}
                       </div>
                       <h3 className="font-bold text-xl text-gray-900 leading-none">{selection.name}</h3>
                  </div>
                  <button onClick={() => setSelection(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                    <X size={16} />
                  </button>
               </div>


               {/* Sub-header Badge */}
               <div className="mb-3">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                       selection.type === 'Nation' ? 'bg-blue-100 text-blue-700' :
                       selection.type === 'Sub-national' ? 'bg-purple-100 text-purple-700' :
                       'bg-emerald-100 text-emerald-700'
                   }`}>
                       {selection.type}
                   </span>
                   {selection.population && (
                        <span className="ml-2 text-xs text-gray-500">Pop: {selection.population}</span>
                   )}
               </div>


               <div className="h-32 bg-zinc-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative group cursor-pointer border border-zinc-200">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <MapPin className="text-zinc-400 mb-1" size={32} />
                  <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-medium drop-shadow-md">
                    {currentYear} Archive
                  </div>
               </div>


               <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                 {selection.description} Explore the musical evolution and cultural milestones of this {selection.type.toLowerCase()} during the {Math.floor(currentYear/10)*10}s.
               </p>
              
               <div className="flex gap-2">
                 <button className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors uppercase tracking-wide">
                   More Info
                 </button>
                 <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors uppercase tracking-wide">
                   Directions
                 </button>
               </div>
            </div>
         </div>
       )}
     </div>


     {/* --- Bottom Timeline --- */}
     <Timeline year={currentYear} setYear={setCurrentYear} />


     {/* --- Floating Attribution --- */}
     <div className="absolute bottom-24 right-4 md:right-auto md:left-4 text-white/50 text-xs font-sans z-[900] pointer-events-none mix-blend-overlay">
       Google
     </div>
   </div>
 );
};


export default Atlas;
