import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  // ArrowUpDown,
  // Check,
  // CheckCircle2,
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutGrid,
  List as ListIcon,
  // MoreVertical,
  Play,
  Volume2,
  // X,
} from "lucide-react";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { HexagonPattern, DEFAULT_THEMES as THEMES  } from "../ui/HexagonPattern";
import { LearnRoutes } from "@/constants/routes";

interface ContentItem {
  title: string;
  variant: "diagonal" | "cluster" | "dense" | "split" | "default";
  colors: string[];
  mode?: string;
  route?: string;
}

const COURSES_DATA: ContentItem[] = [
  { title: "Pop", variant: "diagonal", colors: [THEMES.yellow, "#F4A261", THEMES.orange, "#A6A2C2", "#D3C2D6"] },
  { title: "Folk", variant: "cluster", colors: ["#A3B18A", "#588157", "#3A5A40", "#DAD7CD", "#E3D5CA"] },
  { title: "Rock", variant: "dense", colors: ["#E63946", "#1D3557", "#457B9D", "#A8DADC", "#2A3036"] },
  { title: "R&B", variant: "split", colors: [THEMES.teal, THEMES.indigo, THEMES.yellow, "#F4A261", "#9C27B0"] },
  { title: "Jazz", variant: "diagonal", colors: [THEMES.indigo, THEMES.teal, THEMES.yellow, "#F4A261", THEMES.orange] },
  { title: "Classical", variant: "cluster", colors: ["#6D597A", "#B56576", "#E5989B", "#FFB4A2", "#FFCDB2"] },
  { title: "Electronic", variant: "dense", colors: ["#7400B8", "#6930C3", "#5E60CE", "#5390D9", "#4EA8DE"] },
  { title: "Hip Hop", variant: "split", colors: ["#003049", "#D62828", "#F77F00", "#FCBF49", "#EAE2B7"] },
];

const THEORY_DATA: ContentItem[] = [
  { title: "Ionian (Major)", variant: "cluster", colors: [THEMES.red, "#9D5C63"], route: LearnRoutes.overview({mode:'ionian'}) },
  { title: "Dorian", variant: "split", colors: [THEMES.orange, THEMES.teal], route: LearnRoutes.overview({mode:'dorian'}) },
  { title: "Phrygian", variant: "split", colors: [THEMES.red, THEMES.yellow], route: LearnRoutes.overview({mode:'phrygian'}) },
  { title: "Lydian", variant: "diagonal", colors: [THEMES.yellow, "#F4A261"], route: LearnRoutes.overview({mode:'lydian'}) },
  { title: "Mixolydian", variant: "dense", colors: [THEMES.beige, THEMES.darkGrey], route: LearnRoutes.overview({mode:'mixolydian'}) },
  { title: "Aeolian (Minor)", variant: "diagonal", colors: [THEMES.blue, "#A8DADC"], route: LearnRoutes.overview({mode:'aeolian'}) },
  { title: "Locrian", variant: "cluster", colors: [THEMES.purple, "#E0AAFF"], route: LearnRoutes.overview({mode:'locrian'}) },
];

const EXPLORE_DATA: ContentItem[] = [
  { title: "Ionian (Major)", variant: "cluster", colors: [THEMES.red, "#9D5C63"], route: LearnRoutes.overview({mode:'ionian'}) },
  { title: "Dorian", variant: "split", colors: [THEMES.orange, THEMES.teal], route: LearnRoutes.overview({mode:'dorian'}) },
  { title: "Phrygian", variant: "split", colors: [THEMES.red, THEMES.yellow], route: LearnRoutes.overview({mode:'phrygian'}) },
  { title: "Lydian", variant: "diagonal", colors: [THEMES.yellow, "#F4A261"], route: LearnRoutes.overview({mode:'lydian'}) },
  { title: "Mixolydian", variant: "dense", colors: [THEMES.beige, THEMES.darkGrey], route: LearnRoutes.overview({mode:'mixolydian'}) },
  { title: "Aeolian (Minor)", variant: "diagonal", colors: [THEMES.blue, "#A8DADC"], route: LearnRoutes.overview({mode:'aeolian'}) },
  { title: "Locrian", variant: "cluster", colors: [THEMES.purple, "#E0AAFF"], route: LearnRoutes.overview({mode:'locrian'}) },
];

// interface FilterCheckboxProps {
//   label: string;
//   checked?: boolean;
// }

// const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ label, checked }) => {
//   const [isChecked, setIsChecked] = useState(!!checked);

//   return (
//     <div
//       className="flex items-center gap-3 p-1 cursor-pointer hover:bg-white/5 rounded transition-colors group"
//       onClick={() => setIsChecked((prev) => !prev)}
//     >
//       <div
//         className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? "bg-white border-white" : "border-gray-600 group-hover:border-gray-400"}`}
//       >
//         {isChecked && <Check size={10} className="text-black" />}
//       </div>
//       <span className={`text-sm ${isChecked ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{label}</span>
//     </div>
//   );
// };

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <div
        className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-4 cursor-pointer select-none group w-fit"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2>{title}</h2>
        {isOpen ? (
          <ChevronDown size={18} className="text-gray-600 group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
        )}
      </div>
      {isOpen && <div className="flex flex-col animate-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  );
};

interface CardItemProps {
  title: string;
  colors: string[];
  variant?: "diagonal" | "cluster" | "dense" | "split" | "default";
  onSelect?: () => void;
}

const CardItem: React.FC<CardItemProps> = ({ title, colors, variant, onSelect }) => (
  <div className="group flex flex-col gap-3 cursor-pointer">
    <div className="aspect-square rounded-2xl overflow-hidden relative border border-white/5 group-hover:border-white/20 transition-all duration-300" onClick={onSelect}>
      <div className="absolute inset-0 bg-[#1A1A1A]" />
      <HexagonPattern
        className="w-[120%] h-[120%] absolute top-0 left-0 transition-transform duration-500 group-hover:scale-105"
        colorsOverride={colors}
        variant={variant}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </div>
    <div className="flex items-start justify-between px-1">
      <h3 className="text-lg font-serif text-gray-100">{title}</h3>
      <div className="flex items-center gap-3 text-gray-500">
        <Volume2 size={18} className="hover:text-white transition-colors" />
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <Play size={18} className="hover:text-white transition-colors fill-current opacity-0 group-hover:opacity-100" onClick={onSelect}/>
          <Heart size={18} className="hover:text-red-500 transition-colors" />
        </div>
      </div>
    </div>
  </div>
);

interface ListItemProps {
  title: string;
  colors: string[];
  variant?: "diagonal" | "cluster" | "dense" | "split" | "default";
  onSelect?: () => void;
}

const ListItem: React.FC<ListItemProps> = ({ title, colors, variant, onSelect }) => (
  <div className="group flex items-center justify-between p-2 rounded-xl border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={onSelect}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-[#1A1A1A] border border-white/10 flex-shrink-0">
        <HexagonPattern className="w-[150%] h-[150%] absolute -top-1 -left-1" colorsOverride={colors} variant={variant} />
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight size={14} className="text-gray-500" />
        <h3 className="text-base font-medium text-gray-200">{title}</h3>
      </div>
    </div>
    {/* <div className="flex items-center gap-6 text-gray-500">
      <Volume2 size={16} className="hover:text-white transition-colors" />
      <Play size={16} className="hover:text-white transition-colors fill-current" onClick={onSelect} />
      <Heart size={16} className="hover:text-red-500 transition-colors" />
      <CheckCircle2 size={16} className="hover:text-green-500 transition-colors" />
      <MoreVertical size={16} className="hover:text-white transition-colors" />
    </div> */}
  </div>
);

interface ExploreItemProps {
  title: string;
  colors: string[];
  variant?: "diagonal" | "cluster" | "dense" | "split" | "default";
  onSelect?: () => void;
}

const ExploreItem: React.FC<ExploreItemProps> = ({ title, colors, variant, onSelect }) => (
  <div className="group flex items-center justify-between p-3 rounded-xl border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={onSelect}>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-[#1A1A1A] border border-white/10 flex-shrink-0">
        <HexagonPattern className="w-[150%] h-[150%] absolute -top-1 -left-1" colorsOverride={colors} variant={variant} />
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight size={14} className="text-gray-500" />
        <h3 className="text-base font-medium text-gray-200">{title}</h3>
      </div>
    </div>
    {/* <div className="flex items-center gap-6 text-gray-500">
      <Volume2 size={16} className="hover:text-white transition-colors" />
      <Play size={16} className="hover:text-white transition-colors fill-current" onClick={onSelect} />
      <Heart size={16} className="hover:text-red-500 transition-colors" />
      <CheckCircle2 size={16} className="hover:text-green-500 transition-colors" />
      <MoreVertical size={16} className="hover:text-white transition-colors" />
    </div> */}
  </div>
);

interface LearnInletProps {
  initialTab?: string;
  setSubTab?: (tab: string) => void;
}

export const LearnInlet: React.FC<LearnInletProps> = ({
  initialTab = "Courses",
  setSubTab: parentSetSubTab,
}) => {
  const [subTab, setSubTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (parentSetSubTab) parentSetSubTab(subTab);
  }, [subTab, parentSetSubTab]);

  const activeData = subTab === "Courses" ? COURSES_DATA : subTab === "Theory" ? THEORY_DATA : EXPLORE_DATA;

  const renderContent = (data: ContentItem[]) => {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" >
          {data.map((item, i) => (
            <CardItem key={i} {...item} onSelect={()=> {if(item.route){navigate(item.route)}}} />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {data.map((item, i) =>
          subTab === "Explore" || subTab === "Theory" ? (
            <ExploreItem key={i} {...item} onSelect={()=> {if(item.route){navigate(item.route)}}} />
          ) : (
            <ListItem key={i} {...item} onSelect={()=> {if(item.route){navigate(item.route)}}} />
          ),
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <HeaderBar title="Learn "/>
      <div className="flex-1 overflow-hidden flex flex-col pb-12 px-8 relative custom-scrollbar">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center gap-1 bg-[#151515] w-fit p-1 rounded-lg border border-white/5">
            {["Courses", "Theory", "Explore"].map((tab) => (
              <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${subTab === tab ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-b border-white/5 pb-4 relative">
          {/* <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all w-32 justify-between ${showFilter ? "bg-white text-black border-white" : "bg-[#151515] border-white/10 text-gray-300 hover:text-white hover:border-white/20"}`}
            >
              Filter {showFilter ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#151515] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all w-32 justify-between">
              Saved <Heart size={14} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#151515] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all w-32 justify-between">
              Sort <ArrowUpDown size={14} />
            </button>
          </div> */}
          <div className="flex items-center gap-4 text-gray-500">
            <div className="flex items-center gap-2">
              <LayoutGrid
                size={20}
                className={`cursor-pointer transition-colors ${viewMode === "grid" ? "text-white" : "hover:text-white"}`}
                onClick={() => setViewMode("grid")}
              />
              <ListIcon
                size={20}
                className={`cursor-pointer transition-colors ${viewMode === "list" ? "text-white" : "hover:text-white"}`}
                onClick={() => setViewMode("list")}
              />
            </div>
          </div>
        </div>
        </div>

        {/* {showFilter && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 absolute top-[150px] left-8 right-8 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/5">
              <h3 className="text-sm font-medium text-gray-200">Filter</h3>
              <X size={16} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowFilter(false)} />
            </div>
            <div className="grid grid-cols-4 gap-4 h-64 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Diatonic Modes" />
                <FilterCheckbox label="Relative Modes" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Lydian" />
                <FilterCheckbox label="Dorian" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                {["C", "G", "D", "A"].map((key) => (
                  <FilterCheckbox key={key} label={key}  />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <FilterCheckbox label="7th Chords"  />
              </div>
            </div>
          </div>
        )} */}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {subTab === "Explore" || subTab === "Theory" ? (
            <>
              <CollapsibleSection title="Diatonic Modes" defaultOpen className="mt-4">
                {renderContent(activeData)}
              </CollapsibleSection>
              <CollapsibleSection title="Relative Modes" className="mt-8 border-t border-white/5 pt-4">
                {renderContent(activeData)}
              </CollapsibleSection>
              <CollapsibleSection title="Parallel Modes" className="mt-4 border-t border-white/5 pt-4">
                {renderContent(activeData)}
              </CollapsibleSection>
            </>
          ) : (
            <CollapsibleSection title="Genres" defaultOpen className="mt-4">
              {renderContent(activeData)}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
};
