import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Menu, X, Pencil, Save, RotateCcw, ChevronRight, 
  Type, Image as ImageIcon, Video, Trash2, 
  AlignLeft, AlignCenter, AlignRight, Eye, EyeOff, Plus, RotateCw,
  GripVertical, Upload, Book, Star, GraduationCap, Lock, Unlock, Share2, Copy, Check, Palette, Link, Globe,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftCircle, ArrowRightCircle,
  LayoutDashboard, MoreVertical, ExternalLink, Calendar
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SectionId, TitlePageData, CoverPageData, CoverPageSectionData, SECTIONS, ContentBlock, BasicSectionData, AppSettings } from './types';

const STORAGE_KEY = 'portfolio_title_page_data_v3';
const COVER_STORAGE_KEY = 'portfolio_cover_page_data_v1';
const SETTINGS_STORAGE_KEY = 'portfolio_app_settings_v1';
const NEW_COVER_SECTION_KEY = 'coverPageData';
const PORTFOLIOS_KEY = 'portfolios_list_v1';
const CURRENT_PORTFOLIO_ID_KEY = 'current_portfolio_id_v1';

interface PortfolioSnapshot {
  id: string;
  name: string;
  lastModified: number;
  activeShareId: string | null;
  data: any; // Compressed data
  isOriginal?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  bgColor: '#ffffff',
  bgImage: '',
  bgType: 'color',
  fontFamily: 'Inter',
  textColor: '#000000',
  bgOpacity: 100,
  imgbbKey: 'a51150c02add7feb271f1e50b63c598b'
};

const uploadToImgBB = async (file: File, key: string) => {
  if (!key) return null;
  const formData = new FormData();
  formData.append('image', file);
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      const errorMsg = data?.error?.message || 'Unknown error from ImgBB';
      console.error("ImgBB Error:", errorMsg);
      alert(`Cloud Upload Error: ${errorMsg}. Please ensure your ImgBB API key is correct and not at its limit.`);
      return null;
    }
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Network error during cloud upload.");
    return null;
  }
};

const DEFAULT_ACADEMIC_COVER: CoverPageSectionData = {
  label: 'COVER PAGE',
  showLabel: true,
  heading: 'A Journey in Teaching & Technology',
  showHeading: true,
  paragraph1: 'Teaching in the 21st century requires a delicate balance of traditional pedagogies and modern technological tools. As I embarked on this journey through TLE 10, I discovered that true mastery comes not just from knowing the content, but from understanding how to communicate it effectively to diverse learners. This e-portfolio serves as a digital chronicle of my growth, aspirations, and the creative projects that have shaped my path as a future educator in human-centric technology.',
  showParagraph1: true,
  paragraph2: 'The course Technology for Teaching and Learning 2 (TTL 2) presented significant challenges that pushed me beyond my comfort zone. From designing interactive modules to integrating complex multimedia artifacts, each hurdle became a stepping stone. These experiences have instilled in me a deeper appreciation for the transformative power of educational technology when applied with purpose and empathy.',
  pillars: [
    { title: 'Reflection', description: 'Thinking deeply about my teaching and learning experiences' },
    { title: 'Practice', description: 'Applying theories and strategies in real classroom settings' },
    { title: 'Growth', description: 'Continuous improvement as a future educator' },
    { title: 'Service', description: 'Contributing to the community and learners' }
  ],
  blocks: [],
  layoutOrder: ['sys-label', 'sys-divider', 'sys-heading', 'sys-p1', 'sys-p2', 'sys-pillars'],
  alignment: 'center'
};

const DEFAULT_ACKNOWLEDGEMENT: BasicSectionData = {
  content: "I would like to express my deepest gratitude to everyone who supported me throughout this journey. Their guidance and encouragement have been invaluable in my growth as an educator and a lifelong learner.",
  blocks: [],
  layoutOrder: ['sys-header', 'sys-divider', 'sys-content'],
  alignment: 'center'
};

const DEFAULT_DEDICATION: BasicSectionData = {
  content: "Dedicated to my family, mentors, and fellow students who have inspired me to pursue excellence in everything I do. This portfolio is a testament to the collective effort and support I have received.",
  blocks: [],
  layoutOrder: ['sys-header', 'sys-divider', 'sys-content'],
  alignment: 'center'
};

const DEFAULT_GENERIC_SECTION: BasicSectionData = {
  content: "Start writing your content here...",
  blocks: [],
  layoutOrder: ['sys-header', 'sys-divider', 'sys-content'],
  alignment: 'center'
};

const DEFAULT_COVER_DATA: CoverPageData = {
  heroMedia: { type: 'image', url: '' },
  heroName: 'Zandel Ragay',
  aboutMeTitle: 'About me',
  aboutMeContent: 'Tell your site viewers more about yourself.\n\nWhat class are you in and what school do you go to?\n\nWhat skills, talents and knowledge do you have? What do you like learning about?',
  projects: [
    { id: '1', title: 'SPLINE', media: { type: 'image', url: '' } },
    { id: '2', title: 'PROJECT 2', media: { type: 'image', url: '' } },
  ],
};

const DEFAULT_TITLE_DATA: TitlePageData = {
  headerImage: '', // User will upload this
  showHeaderImage: true,
  headerImageWidth: 600,
  title: 'E-Portfolio',
  showTitle: true,
  subtitle: 'in TLE 10',
  showSubtitle: true,
  description: 'Technology for Teaching and Learning 2',
  showDescription: true,
  studentName: '[STUDENT NAME]',
  showStudentName: true,
  courseYearSection: '[COURSE / YEAR / SECTION]',
  showCourseYearSection: true,
  professorName: '[PROFESSOR\'S NAME]',
  showProfessorName: true,
  academicYear: '2023-2024',
  showAcademicYear: true,
  submittedByLabel: 'SUBMITTED BY',
  showSubmittedByLabel: true,
  submittedToLabel: 'ACCLAIMED BY',
  showSubmittedToLabel: true,
  academicYearLabel: 'CYCLES OF',
  blocks: [],
  layoutOrder: ['sys-header', 'sys-title', 'sys-divider', 'sys-subtitle', 'sys-desc', 'sys-student', 'sys-professor', 'sys-ay'],
  alignment: 'center'
};

const AlignmentIcon = ({ alignment }: { alignment: 'left' | 'center' | 'right' }) => {
  if (alignment === 'left') return <AlignLeft size={16} />;
  if (alignment === 'right') return <AlignRight size={16} />;
  return <AlignCenter size={16} />;
};

const NavSectionItem = ({ 
  section, 
  isActive, 
  onNavigate,
  isSidebar = false,
  customLabel // New prop
}: { 
  section: any, 
  isActive: boolean, 
  onNavigate: (id: SectionId) => void,
  isSidebar?: boolean,
  customLabel?: string, // New prop
  key?: any
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Auto-expand if active subitem is found
  useEffect(() => {
    if (isActive && section.subItems) {
      setIsHovered(true);
    }
  }, [isActive, section.subItems]);

  const isFolderOnly = ['department-background', 'subject-teachers', 'subject-inclusions', 'appendices'].includes(section.id);

  const displayLabel = customLabel || section.label;

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        // Only close if not active
        if (!isActive) setIsHovered(false);
      }}
      onTouchStart={() => setIsHovered(true)}
    >
      <button
        onClick={() => {
          if (isFolderOnly) {
            setIsHovered(!isHovered);
          } else {
            onNavigate(section.id);
            if (!section.subItems) setIsHovered(false);
            else setIsHovered(!isHovered);
          }
        }}
        className={`w-full flex items-center justify-between transition-all duration-300 ${
          isSidebar 
            ? `px-10 py-6 rounded-[2.5rem] ${isActive ? 'bg-black text-white shadow-xl scale-[1.02]' : 'hover:bg-gray-50 text-gray-400 hover:text-black'}`
            : `px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-500'}`
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-8">
          {isSidebar && (
            <span className={`text-xs font-black tabular-nums opacity-20 ${isActive ? 'text-white' : ''}`}>
               {section.label.match(/^\d+/)?.[0].padStart(2, '0') || '00'}
            </span>
          )}
          <span className={`${isSidebar ? 'font-black text-xl md:text-2xl tracking-tighter uppercase' : ''}`}>
            {isSidebar ? displayLabel.replace(/^\d+\.\s*/, '') : displayLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
           {section.subItems && (
            <motion.div
              animate={{ rotate: isHovered ? 90 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={isActive ? 'text-white/40' : 'text-black/20'}
            >
              <ChevronRight size={isSidebar ? 20 : 12} />
            </motion.div>
          )}
          {isActive && !section.subItems && <Star size={isSidebar ? 14 : 10} fill="currentColor" />}
        </div>
      </button>

      <AnimatePresence>
        {section.subItems && isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`overflow-hidden rounded-2xl mt-1 border-l-2 ${
              isActive ? 'bg-black/5 border-black/10' : 'bg-gray-50 border-black/5'
            } ${isSidebar ? 'ml-12' : 'ml-4'}`}
          >
            <div className="py-2 space-y-1">
              {section.subItems.map((sub: { id: SectionId; label: string }, idx: number) => (
                <button 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(sub.id);
                    // On mobile we might want to close sidebar, parent handles that
                  }}
                  className={`w-full text-left px-6 py-2 font-bold uppercase tracking-widest transition-colors ${
                    isSidebar ? 'text-xs opacity-60 hover:opacity-100' : 'text-[7px] opacity-40 hover:opacity-80'
                  } ${isActive && isSidebar ? 'text-black/80' : 'text-black/60'}`}
                >
                  • {sub.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



const RenderMedia = ({ type, url, className }: { type: 'image' | 'spline' | 'url', url: string, className?: string }) => {
  if (!url) return null;
  
  if (type === 'image') {
    return <img src={url} className={className} alt="Media" referrerPolicy="no-referrer" />;
  }
  
  if (type === 'spline') {
    // Basic check to see if it's a full iframe tag and extract src
    let src = url;
    if (url.includes('<iframe')) {
      const match = url.match(/src="([^"]+)"/);
      if (match) src = match[1];
    }
    return (
      <iframe 
        src={src} 
        frameBorder="0" 
        width="100%" 
        height="100%" 
        className={`${className} pointer-events-none`}
      />
    );
  }

  if (type === 'url') {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline uppercase font-black tracking-widest text-xs p-4 bg-white shadow-xl rounded-2xl flex items-center gap-2">
          Visit Link
          <Eye size={14} />
        </a>
      </div>
    );
  }

  return null;
};

const MediaControls = ({ 
  currentType, 
  currentUrl, 
  onMediaChange, 
  onFileUpload 
}: { 
  currentType: 'image' | 'spline' | 'url', 
  currentUrl: string, 
  onMediaChange: (type: 'image' | 'spline' | 'url', url: string) => void,
  onFileUpload?: () => void
}) => (
  <div className="space-y-4 bg-white/10 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/20 shadow-2xl">
    <div className="flex justify-center gap-2">
      {(['image', 'spline', 'url'] as const).map(type => (
        <button
          key={type}
          onClick={() => onMediaChange(type, currentUrl)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentType === type ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {type}
        </button>
      ))}
    </div>
    
    {currentType === 'image' && onFileUpload && (
      <button 
        onClick={onFileUpload}
        className="w-full py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
      >
        <Upload size={14} /> Select Local File
      </button>
    )}

    {(currentType === 'spline' || currentType === 'url' || currentType === 'image') && (
      <input
        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-white transition-all font-mono"
        placeholder={currentType === 'spline' ? "Paste Spline URL or Iframe tag" : "Paste URL here"}
        value={currentUrl}
        onChange={(e) => onMediaChange(currentType, e.target.value)}
      />
    )}
  </div>
);

const CoverPage = ({ 
  data, 
  isEditing, 
  onUpdate,
  imgbbKey
}: { 
  data: CoverPageData; 
  isEditing: boolean;
  onUpdate: (updates: Partial<CoverPageData>) => void;
  imgbbKey?: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
      }

      if (imgbbKey) {
        const url = await uploadToImgBB(file, imgbbKey);
        if (url) {
          onUpdate({ heroMedia: { type: 'image' as const, url } });
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => onUpdate({ heroMedia: { type: 'image' as const, url: reader.result as string } });
      reader.onerror = () => alert("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  const handleProjectUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
      }

      if (imgbbKey) {
        const url = await uploadToImgBB(file, imgbbKey);
        if (url) {
          const newProjects = data.projects.map(p => p.id === id ? { ...p, media: { type: 'image' as const, url } } : p);
          onUpdate({ projects: newProjects });
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newProjects = data.projects.map(p => p.id === id ? { ...p, media: { type: 'image' as const, url: reader.result as string } } : p);
        onUpdate({ projects: newProjects });
      };
      reader.onerror = () => alert("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  const addProject = () => {
    const newProject = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'NEW PROJECT',
      media: { type: 'image' as const, url: '' }
    };
    onUpdate({ projects: [...data.projects, newProject] });
  };

  const removeProject = (id: string) => {
    onUpdate({ projects: data.projects.filter(p => p.id !== id) });
  };

  const updateProjectTitle = (id: string, title: string) => {
    onUpdate({ projects: data.projects.map(p => p.id === id ? { ...p, title } : p) });
  };

  const updateProjectMedia = (id: string, media: { type: 'image' | 'spline' | 'url', url: string }) => {
    onUpdate({ projects: data.projects.map(p => p.id === id ? { ...p, media } : p) });
  };

  return (
    <div className="flex-1 w-full animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="relative h-[60vh] sm:h-[90vh] w-full mt-[-112px] overflow-hidden bg-neutral-950 group/hero">
        <div className="absolute inset-0">
          {data.heroMedia.url ? (
            <RenderMedia 
              type={data.heroMedia.type} 
              url={data.heroMedia.url} 
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-[3s] ${isEditing ? 'opacity-80 scale-100' : 'opacity-60 group-hover/hero:scale-105'}`} 
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
              <ImageIcon size={100} className="text-white/20 animate-pulse" />
            </div>
          )}
        </div>
        
        <div className={`absolute inset-0 bg-gradient-to-b pointer-events-none transition-colors duration-700 ${isEditing ? 'from-black/40 via-black/20 to-black/60' : 'from-black/60 via-transparent to-black/80'}`} />

        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          {isEditing ? (
            <div className="space-y-8 w-full max-w-4xl z-10">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] animate-pulse">Your Identity</span>
                <input
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-white outline-none text-[clamp(2rem,12vw,6rem)] sm:text-[clamp(2.5rem,15vw,8rem)] font-light text-white text-center tracking-tighter transition-all placeholder:text-white/10"
                  value={data.heroName}
                  onChange={(e) => onUpdate({ heroName: e.target.value })}
                  placeholder="YOUR NAME."
                />
              </div>
              
              <div className="max-w-md mx-auto space-y-4">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Background Environment</span>
                <MediaControls 
                  currentType={data.heroMedia.type}
                  currentUrl={data.heroMedia.url}
                  onMediaChange={(type, url) => onUpdate({ heroMedia: { type, url } })}
                  onFileUpload={() => fileInputRef.current?.click()}
                />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleHeroUpload} 
              />
            </div>
          ) : (
            <h1 className="text-[clamp(2.5rem,15vw,10rem)] font-light text-white tracking-widest leading-none drop-shadow-2xl translate-y-8 animate-in slide-in-from-bottom-20 duration-1000 fill-mode-forwards pointer-events-none">
              {data.heroName}
            </h1>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 space-y-32">
        {/* About Me */}
        <div className="flex flex-col items-center text-center space-y-12">
          <div className="space-y-6">
            {isEditing ? (
              <input
                className="text-4xl sm:text-7xl font-black font-display text-center border-b-2 border-gray-100 focus:border-black outline-none bg-transparent pb-2 w-full uppercase tracking-tighter"
                value={data.aboutMeTitle}
                onChange={(e) => onUpdate({ aboutMeTitle: e.target.value })}
              />
            ) : (
              <h2 className="text-5xl sm:text-8xl font-black font-display uppercase tracking-[-0.05em]">
                {data.aboutMeTitle}
              </h2>
            )}
            <div className="w-24 h-2 bg-black mx-auto rounded-full" />
          </div>

              <div className="max-w-3xl w-full">
            {isEditing ? (
              <textarea
                className="w-full p-8 text-lg sm:text-xl text-center text-black border-2 border-dashed border-gray-200 rounded-3xl focus:border-black focus:bg-white outline-none bg-transparent resize-none leading-relaxed transition-all"
                value={data.aboutMeContent}
                onChange={(e) => onUpdate({ aboutMeContent: e.target.value })}
                rows={6}
              />
            ) : (
              <p className="text-lg sm:text-2xl text-black font-medium leading-relaxed whitespace-pre-wrap px-4">
                {data.aboutMeContent}
              </p>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="space-y-20">
          <div className="flex items-center justify-center">
            {isEditing ? (
               <div className="flex items-center gap-4">
                  <div className="px-6 sm:px-12 py-4 sm:py-6 bg-white border-2 sm:border-4 border-black rounded-xl">
                    <span className="text-xl sm:text-4xl font-black uppercase tracking-[0.1em] underline decoration-4 sm:decoration-8 underline-offset-[8px] sm:underline-offset-[12px]">RECENT PROJECTS</span>
                  </div>
                  <button onClick={addProject} className="p-4 sm:p-6 bg-black text-white rounded-2xl hover:scale-105 transition-transform shadow-xl"><Plus size={24}/></button>
               </div>
            ) : (
              <div className="px-6 sm:px-12 py-4 sm:py-6 bg-white border-2 sm:border-4 border-black rounded-xl inline-block">
                <h3 className="text-xl sm:text-5xl font-black uppercase tracking-[0.1em] underline decoration-4 sm:decoration-8 underline-offset-[8px] sm:underline-offset-[12px]">RECENT PROJECTS</h3>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
            {data.projects.map((project) => (
              <div key={project.id} className="group/project relative aspect-[4/3] bg-gray-50 rounded-[3rem] overflow-hidden border border-gray-200 shadow-sm hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] transition-all duration-700">
                <div className="absolute inset-0">
                  {project.media.url ? (
                    <RenderMedia 
                      type={project.media.type} 
                      url={project.media.url} 
                      className="absolute inset-0 w-full h-full object-cover grayscale group-hover/project:grayscale-0 transition-all duration-1000 scale-110 group-hover/project:scale-100" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                      <ImageIcon size={100} />
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/project:opacity-100 transition-opacity duration-700" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center translate-y-10 group-hover/project:translate-y-0 opacity-0 group-hover/project:opacity-100 transition-all duration-700 overflow-y-auto">
                   {isEditing ? (
                      <div className="space-y-6 w-full max-w-sm">
                        <input
                          className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-4 text-white font-black text-center border-2 border-white/20 outline-none focus:border-white uppercase tracking-widest text-2xl mb-4"
                          value={project.title}
                          onChange={(e) => updateProjectTitle(project.id, e.target.value)}
                        />
                        
                        <MediaControls 
                          currentType={project.media.type}
                          currentUrl={project.media.url}
                          onMediaChange={(type, url) => updateProjectMedia(project.id, { type, url })}
                          onFileUpload={() => projectInputRefs.current[project.id]?.click()}
                        />

                        <button 
                          onClick={() => removeProject(project.id)}
                          className="w-full py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-2xl font-black text-[10px] uppercase tracking-widest"
                        >
                          Delete Artifact
                        </button>
                        
                        <input 
                          type="file" 
                          ref={el => { if (el) projectInputRefs.current[project.id] = el; }} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleProjectUpload(project.id, e)} 
                        />
                      </div>
                   ) : (
                      <h4 className="text-white text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.1em] scale-90 group-hover/project:scale-100 transition-transform duration-700 px-4 leading-tight">{project.title}</h4>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AcademicCoverPage = ({ 
  data, 
  isEditing, 
  onUpdate,
  onUpdateBlock,
  onRemoveBlock,
  onDuplicateBlock,
  onDuplicateSystem,
  imgbbKey
}: { 
  data: CoverPageSectionData; 
  isEditing: boolean;
  onUpdate: (updates: Partial<CoverPageSectionData>) => void;
  onUpdateBlock: (id: string, updates: Partial<ContentBlock>) => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onDuplicateSystem: (id: string) => void;
  imgbbKey?: string;
}) => {
  return (
    <div className={`relative max-w-4xl mx-auto px-6 py-20 space-y-8 font-sans selection:bg-neutral-100 group/section flex flex-col ${
      data.alignment === 'left' ? 'items-start text-left'
      : data.alignment === 'right' ? 'items-end text-right'
      : 'items-center text-center'
    }`}>
      {data.layoutOrder.map((itemId, index) => {
        const isEven = index % 2 === 0;

        // 1. System Items
        if (itemId === 'sys-label' && (isEditing || data.showLabel)) {
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, x: isEven ? -80 : 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                <div className={`w-full relative group/sys ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-4">
                      <input
                        className={`w-full bg-transparent border-b border-neutral-200 outline-none text-[clamp(1.5rem,7.5vw,5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight text-black focus:text-black transition-colors ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}
                        value={data.label}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                      />
                      <button 
                        onClick={() => onDuplicateSystem(itemId)}
                        className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                        title="Duplicate Element"
                      >
                        <Copy size={24} />
                      </button>
                      <button 
                        onClick={() => onRemoveBlock(itemId)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ) : (
                    <h1 className={`text-[clamp(1.5rem,7.5vw,5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight text-black w-full`}>
                      {data.label}
                    </h1>
                  )}
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        if (itemId === 'sys-heading' && (isEditing || data.showHeading)) {
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, x: isEven ? 80 : -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-full"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                 <div className={`w-full relative group/sys ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-4">
                      <input
                        className={`w-full bg-transparent border-b border-neutral-200 outline-none text-xl sm:text-2xl font-bold uppercase tracking-tight text-black/60 focus:text-black transition-all ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}
                        value={data.heading}
                        onChange={(e) => onUpdate({ heading: e.target.value })}
                      />
<div className="flex gap-2 items-center">
                        <button 
                          onClick={() => onDuplicateSystem(itemId)}
                          className="p-2 text-neutral-400 hover:text-black transition-all"
                          title="Duplicate Element"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={() => onRemoveBlock(itemId)}
                          className="p-2 text-red-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h2 className={`text-xl sm:text-3xl font-bold uppercase text-black/60 tracking-tight w-full leading-tight ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                      {String(data.heading).includes('[object Object]') ? DEFAULT_ACADEMIC_COVER.heading : data.heading}
                    </h2>
                  )}
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        if (itemId === 'sys-divider') {
          return (
            <motion.div
              key={itemId}
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full flex-col items-center flex"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                <div className="relative group/sys w-full flex flex-col items-center py-4 sm:py-8 transition-all">
                  <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-black rounded-full shadow-sm" />
                  {isEditing && (
                    <div className="absolute -top-12 right-0 flex items-center gap-2 transition-all">
                      <button 
                        onClick={() => onDuplicateSystem(itemId)}
                        className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all"
                        title="Duplicate Element"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => onRemoveBlock(itemId)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        if (itemId === 'sys-p1' && (isEditing || data.showParagraph1)) {
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, x: isEven ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                <div className="max-w-2xl mx-auto w-full relative group/sys z-10 font-sans tracking-tight">
                  {isEditing ? (
                    <div className="flex gap-4 relative z-20">
                      <textarea
                        className="w-full bg-neutral-50 p-8 rounded-3xl border border-neutral-100 outline-none text-lg text-black leading-relaxed resize-none focus:bg-white focus:border-neutral-300 transition-all font-sans"
                        value={data.paragraph1}
                        onChange={(e) => onUpdate({ paragraph1: e.target.value })}
                        rows={8}
                      />
                      <button 
                        onClick={() => onDuplicateSystem(itemId)}
                        className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                        title="Duplicate Element"
                      >
                        <Copy size={24} />
                      </button>
                      <button 
                        onClick={() => onRemoveBlock(itemId)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ) : (
                    <p className={`text-lg sm:text-2xl text-black leading-relaxed italic whitespace-pre-wrap ${data.alignment === 'center' ? 'text-center' : data.alignment === 'right' ? 'text-right' : 'text-left'}`}>
                      {data.paragraph1}
                    </p>
                  )}
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        if (itemId === 'sys-p2') {
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, x: isEven ? 60 : -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-full"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                <div className="max-w-2xl mx-auto w-full relative group/sys z-10">
                  {isEditing ? (
                    <div className="flex gap-4 relative z-20">
                      <textarea
                        className="w-full bg-neutral-50 p-8 rounded-3xl border border-neutral-100 outline-none text-lg text-black leading-relaxed resize-none focus:bg-white focus:border-neutral-300 transition-all font-sans"
                        value={data.paragraph2}
                        onChange={(e) => onUpdate({ paragraph2: e.target.value })}
                        rows={6}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onDuplicateSystem(itemId)}
                          className="self-start p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                          title="Duplicate Element"
                        >
                          <Copy size={20} />
                        </button>
                        <button 
                          onClick={() => onRemoveBlock(itemId)}
                          className="self-start p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-lg text-black leading-[1.8] font-sans opacity-90 decoration-neutral-100 whitespace-pre-wrap ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-left sm:text-justify'}`}>
                      {data.paragraph2}
                    </p>
                  )}
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        if (itemId === 'sys-pillars') {
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="w-full"
            >
              <SortableItem id={itemId} editMode={isEditing}>
                <div className="relative group/sys w-full">
                  {isEditing && (
                    <div className="absolute -top-10 right-0 flex items-center gap-2">
                      <button 
                        onClick={() => onDuplicateSystem(itemId)}
                        className="p-3 bg-neutral-50 text-neutral-400 hover:text-black rounded-xl transition-all flex items-center gap-2"
                        title="Duplicate Pillars"
                      >
                        <Copy size={16} />
                        <span className="text-[10px] font-black uppercase">Duplicate</span>
                      </button>
                      <button 
                        onClick={() => onRemoveBlock(itemId)}
                        className="p-3 bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        <span className="text-[10px] font-black uppercase">Remove</span>
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 w-full">
                    {data.pillars.map((pillar, index) => (
                      <div 
                        key={index} 
                        className="group/card p-8 rounded-3xl border border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500"
                      >
                            <div className="space-y-4 text-left">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black transition-colors">
                            PILLAR
                          </span>
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                className="w-full bg-transparent border-b border-neutral-100 outline-none text-xl font-bold tracking-tight text-black focus:border-black transition-colors"
                                value={pillar.title}
                                onChange={(e) => {
                                  const newPillars = [...data.pillars] as [any, any, any, any];
                                  newPillars[index].title = e.target.value;
                                  onUpdate({ pillars: newPillars });
                                }}
                              />
                              <input
                                className="w-full bg-transparent border-b border-neutral-100 outline-none text-sm text-black italic focus:text-black focus:not-italic transition-all"
                                value={pillar.description}
                                onChange={(e) => {
                                  const newPillars = [...data.pillars] as [any, any, any, any];
                                  newPillars[index].description = e.target.value;
                                  onUpdate({ pillars: newPillars });
                                }}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h3 className="text-2xl font-bold tracking-tight text-black">
                                {pillar.title}
                              </h3>
                              <p className="text-sm text-black leading-relaxed opacity-80">
                                {pillar.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SortableItem>
            </motion.div>
          );
        }

        // 2. Custom Block Items
        const block = data.blocks?.find(b => b.id === itemId);
        if (block) {
          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: isEven ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <SortableBlock 
                block={block} 
                editMode={isEditing} 
                onUpdate={onUpdateBlock}
                onRemove={onRemoveBlock}
                onDuplicate={onDuplicateBlock}
                imgbbKey={imgbbKey}
              />
            </motion.div>
          );
        }

        return null;
      })}
    </div>
  );
};

interface SortableItemProps {
  id: string;
  editMode: boolean;
  children: React.ReactNode;
  key?: React.Key;
}

function SortableItem({ id, editMode, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative w-full flex flex-col items-center py-2 sm:py-4 ${editMode ? 'hover:bg-gray-50/50 rounded-2xl px-4 ring-1 ring-transparent hover:ring-gray-200 transition-all' : ''}`}
    >
      {editMode && (
        <>
          <div className="absolute top-2 left-2 sm:left-auto sm:right-12 flex items-center bg-white shadow-2xl border border-gray-100 rounded-xl p-1 z-20">
            <button 
              {...attributes} 
              {...listeners}
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-black"
              title="Drag to reorder"
            >
              <GripVertical size={18} />
            </button>
          </div>
        </>
      )}
      {children}
    </div>
  );
}

interface SortableBlockProps {
  block: ContentBlock;
  editMode: boolean;
  onUpdate: (id: string, updates: Partial<ContentBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  imgbbKey?: string;
  key?: React.Key;
}

function SortableBlock({ block, editMode, onUpdate, onRemove, onDuplicate, imgbbKey }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File too large (max 20MB)");
        return;
      }

      if (imgbbKey) {
        const url = await uploadToImgBB(file, imgbbKey);
        if (url) {
          onUpdate(block.id, { content: url });
          return;
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(block.id, { content: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const alignmentClasses = {
    left: 'text-left flex flex-col items-start',
    center: 'text-center flex flex-col items-center',
    right: 'text-right flex flex-col items-end',
  }[block.alignment];

  const captionPosition = block.captionPosition || 'bottom';
  const isHorizontal = captionPosition === 'left' || captionPosition === 'right';

  const CaptionInput = () => (
    <div className={`w-full ${isHorizontal ? 'max-w-xs' : 'w-full'}`}>
      <textarea
        className="w-full p-4 border-2 border-dashed border-gray-100 rounded-2xl focus:border-black focus:bg-white outline-none bg-transparent resize-none text-center transition-all text-sm font-medium placeholder:text-gray-300 whitespace-pre-wrap"
        placeholder="Add caption text here..."
        value={block.caption || ''}
        onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
        rows={2}
      />
    </div>
  );

  const CaptionDisplay = () => (
    block.caption ? (
      <div className={`${isHorizontal ? 'max-w-xs' : 'w-full'} ${block.alignment === 'center' ? 'text-center' : block.alignment === 'right' ? 'text-right' : 'text-left'}`}>
        <p className="text-black/60 text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap italic">
          {block.caption}
        </p>
      </div>
    ) : null
  );

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative w-full ${alignmentClasses} space-y-4 py-4 ${editMode ? 'hover:bg-gray-50/50 rounded-2xl px-4 ring-1 ring-transparent hover:ring-gray-200 transition-all' : ''}`}
    >
      {editMode && (
        <div className="absolute -top-6 left-2 right-2 sm:left-auto sm:right-2 flex items-center justify-between sm:justify-end gap-1 bg-white shadow-2xl border border-gray-100 rounded-xl p-1.5 z-20">
          <button 
            {...attributes} 
            {...listeners}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-black order-first sm:order-none"
            title="Drag to reorder"
          >
            <GripVertical size={20} />
          </button>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                const next: Record<string, 'left' | 'center' | 'right'> = { left: 'center', center: 'right', right: 'left' };
                onUpdate(block.id, { alignment: next[block.alignment] });
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Toggle Alignment"
            >
              <AlignmentIcon alignment={block.alignment} />
            </button>
            <button 
              onClick={() => onDuplicate(block.id)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Duplicate Block"
            >
              <Copy size={20} />
            </button>
            {(block.type === 'image' || block.type === 'video') && (
              <div className="flex items-center gap-0.5 border-l border-gray-100 pl-1">
                {(['top', 'bottom', 'left', 'right'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => onUpdate(block.id, { captionPosition: pos })}
                    className={`p-1.5 rounded-lg transition-all ${block.captionPosition === pos ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                    title={`Caption ${pos}`}
                  >
                    {pos === 'top' && <ArrowUpCircle size={16} />}
                    {pos === 'bottom' && <ArrowDownCircle size={16} />}
                    {pos === 'left' && <ArrowLeftCircle size={16} />}
                    {pos === 'right' && <ArrowRightCircle size={16} />}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={() => onRemove(block.id)}
              className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
              title="Remove Block"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      {block.pillars && (
        <div className="w-full">
          {editMode && (
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 text-center">Pillars Block</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {block.pillars.map((pillar, index) => (
              <div 
                key={index} 
                className="group/card p-8 rounded-3xl border border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500"
              >
                <div className="space-y-4 text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">
                    PILLAR
                  </span>
                  {editMode ? (
                    <div className="space-y-3">
                      <input
                        className="w-full bg-transparent border-b border-neutral-100 outline-none text-xl font-bold tracking-tight text-black focus:border-black transition-colors"
                        value={pillar.title}
                        onChange={(e) => {
                          const newPillars = [...(block.pillars || [])];
                          newPillars[index] = { ...newPillars[index], title: e.target.value };
                          onUpdate(block.id, { pillars: newPillars });
                        }}
                      />
                      <textarea
                        className="w-full bg-transparent outline-none text-sm text-neutral-500 leading-relaxed resize-none focus:text-black transition-colors"
                        value={pillar.description}
                        onChange={(e) => {
                          const newPillars = [...(block.pillars || [])];
                          newPillars[index] = { ...newPillars[index], description: e.target.value };
                          onUpdate(block.id, { pillars: newPillars });
                        }}
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-black">{pillar.title}</h3>
                      <p className="text-sm text-neutral-500 leading-relaxed font-sans">{pillar.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === 'text' && !block.pillars && (
        editMode ? (
          <textarea
            className="w-full p-6 border-2 border-dashed border-gray-200 rounded-2xl focus:border-black focus:bg-white outline-none bg-transparent resize-none text-center transition-all text-xl font-medium placeholder:text-gray-300 whitespace-pre-wrap"
            placeholder="Type your content here..."
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            rows={2}
          />
        ) : (
          <p 
            className="text-black whitespace-pre-wrap text-xl md:text-2xl leading-relaxed font-medium"
          >
            {block.content}
          </p>
        )
      )}

      {block.type === 'image' && (
        <div className={`flex w-full ${isHorizontal ? 'flex-row' : 'flex-col'} ${captionPosition === 'top' || captionPosition === 'left' ? 'flex-col-reverse flex-row-reverse' : ''} gap-6 items-center`}>
          <div className={`${isHorizontal ? 'flex-1' : 'w-full'} flex ${alignmentClasses} relative group/media-container`}>
            {editMode ? (
              <div className="w-full">
                {!block.content ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = () => onUpdate(block.id, { content: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:border-black hover:bg-white transition-all cursor-pointer text-gray-400 group/upload bg-gray-50/50"
                  >
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center group-hover/upload:scale-110 transition-transform text-black">
                      <Upload size={32} />
                    </div>
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6" onClick={e => e.stopPropagation()}>
                       {/* Simplified upload UI */}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                    />
                  </div>
                ) : (
                  <div className="relative group/img-preview inline-block w-full">
                    <img 
                      src={block.content} 
                      alt="Preview" 
                      className="w-full h-auto rounded-[2rem] shadow-2xl transition-all" 
                    />
                    
                    {/* Overlay Text Display in Edit Mode */}
                    {block.overlayText && (
                      <div className={`absolute p-6 z-10 pointer-events-none w-full ${
                        block.overlayPosition === 'top-left' ? 'top-0 left-0 text-left'
                        : block.overlayPosition === 'top-right' ? 'top-0 right-0 text-right'
                        : block.overlayPosition === 'bottom-left' ? 'bottom-0 left-0 text-left'
                        : block.overlayPosition === 'bottom-right' ? 'bottom-0 right-0 text-right'
                        : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center'
                      }`}>
                        <span className="bg-black/80 backdrop-blur text-white px-4 py-2 rounded-lg font-bold text-lg inline-block shadow-2xl">
                          {block.overlayText}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/img-preview:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onUpdate(block.id, { content: '' })}
                        className="bg-white/90 backdrop-blur p-3 rounded-full shadow-2xl transition-all hover:bg-red-500 hover:text-white"
                        title="Remove Image"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Overlay Text Editor */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <div className="flex items-center gap-3">
                         <Type size={16} className="text-gray-400" />
                         <input 
                           type="text"
                           placeholder="Floating Overlay Text..."
                           value={block.overlayText || ''}
                           onChange={(e) => onUpdate(block.id, { overlayText: e.target.value })}
                           className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-black transition-all"
                         />
                      </div>
                      {block.overlayText && (
                        <div className="flex items-center gap-2 justify-center">
                          {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => onUpdate(block.id, { overlayPosition: pos })}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${block.overlayPosition === pos ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
                            >
                              {pos.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              block.content && (
                <div className="relative w-full group/view-media">
                  <img 
                    src={block.content} 
                    alt="" 
                    className="h-auto rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] w-full transition-transform duration-700 group-hover/view-media:scale-[1.02]" 
                    loading="lazy" 
                  />
                  {block.overlayText && (
                    <div className={`absolute p-8 z-10 pointer-events-none w-full flex ${
                      block.overlayPosition === 'top-left' ? 'top-0 left-0 justify-start'
                      : block.overlayPosition === 'top-right' ? 'top-0 right-0 justify-end'
                      : block.overlayPosition === 'bottom-left' ? 'bottom-0 left-0 justify-start items-end'
                      : block.overlayPosition === 'bottom-right' ? 'bottom-0 right-0 justify-end items-end'
                      : 'top-0 left-0 w-full h-full justify-center items-center'
                    }`}>
                      <motion.span 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="bg-black/60 backdrop-blur-md text-white/90 px-8 py-4 rounded-[2rem] font-black text-2xl sm:text-4xl uppercase tracking-tighter shadow-2xl border border-white/10"
                      >
                        {block.overlayText}
                      </motion.span>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
          <div className={`${isHorizontal ? 'w-auto' : 'w-full'} flex ${alignmentClasses}`}>
            {editMode ? <CaptionInput /> : <CaptionDisplay />}
          </div>
        </div>
      )}

      {block.type === 'video' && (
        <div className={`flex w-full ${isHorizontal ? 'flex-row' : 'flex-col'} ${captionPosition === 'top' || captionPosition === 'left' ? 'flex-col-reverse flex-row-reverse' : ''} gap-6 items-center`}>
          <div 
            className={`${isHorizontal ? 'flex-1' : 'w-full'} aspect-video bg-gray-50 rounded-[3rem] overflow-hidden shadow-2xl flex items-center justify-center border border-gray-100 group/video relative`}
          >
            {editMode ? (
              <div className="p-12 w-full max-w-md text-center space-y-6">
                 <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center shadow-inner">
                    <Video size={40} />
                 </div>
                 <div className="space-y-2">
                   <p className="font-black uppercase tracking-widest text-sm">Video Artifact</p>
                   <p className="text-xs text-gray-400 font-medium">Link should be: https://youtube.com/watch?v=...</p>
                 </div>
                 <input
                  className="w-full p-5 text-sm border-2 border-gray-200 rounded-2xl focus:border-red-500 outline-none bg-white transition-all shadow-sm font-medium"
                  placeholder="Paste YouTube Link Here"
                  value={block.content}
                  onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                />
                
                {/* Overlay Text Editor for Video */}
                <div className="mt-4 p-4 bg-white/50 backdrop-blur rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center gap-3">
                     <Type size={16} className="text-gray-400" />
                     <input 
                       type="text"
                       placeholder="Video Overlay Text..."
                       value={block.overlayText || ''}
                       onChange={(e) => onUpdate(block.id, { overlayText: e.target.value })}
                       className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-black transition-all"
                     />
                  </div>
                  {block.overlayText && (
                    <div className="flex items-center gap-2 justify-center">
                      {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => onUpdate(block.id, { overlayPosition: pos })}
                          className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${block.overlayPosition === pos ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              getYoutubeId(block.content) ? (
                <div className="relative w-full h-full group/view-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYoutubeId(block.content)}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  {block.overlayText && (
                    <div className={`absolute p-8 z-10 pointer-events-none w-full h-full top-0 left-0 flex ${
                      block.overlayPosition === 'top-left' ? 'justify-start items-start'
                      : block.overlayPosition === 'top-right' ? 'justify-end items-start'
                      : block.overlayPosition === 'bottom-left' ? 'justify-start items-end'
                      : block.overlayPosition === 'bottom-right' ? 'justify-end items-end'
                      : 'justify-center items-center'
                    }`}>
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="bg-black/60 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-xl sm:text-3xl uppercase tracking-widest shadow-2xl border border-white/10"
                      >
                        {block.overlayText}
                      </motion.span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-300 flex flex-col items-center">
                  <Video size={80} className="opacity-10" />
                  <span className="text-xl font-black mt-4 opacity-20 uppercase tracking-[0.3em]">No Video Loaded</span>
                </div>
              )
            )}
          </div>
          <div className={`${isHorizontal ? 'w-auto' : 'w-full'} flex ${alignmentClasses}`}>
            {editMode ? <CaptionInput /> : <CaptionDisplay />}
          </div>
        </div>
      )}
    </div>
  );
}

const LoadingScreen = ({ onComplete, name }: { onComplete: () => void; name: string; key?: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 1000); 
          return 100;
        }
        const diff = prev < 40 ? Math.random() * 12 : prev < 85 ? Math.random() * 5 : Math.random() * 10;
        return Math.min(prev + diff, 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.4,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ 
        y: '-100%',
        transition: { 
          duration: 1, 
          ease: [0.77, 0, 0.175, 1],
          delay: 0.2
        } 
      }}
      className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col items-center justify-center p-6 text-white overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 0.5px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-4xl space-y-12 flex flex-col items-center"
      >
        <div className="text-center space-y-4">
          <motion.span 
            variants={itemVariants}
            className="text-xs sm:text-sm font-black uppercase tracking-[1em] text-white/40 block ml-[1em]"
          >
            PORTFOLIO
          </motion.span>
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-none px-4"
          >
            {name}
          </motion.h1>
        </div>

        <motion.div variants={itemVariants} className="w-48 sm:w-64 space-y-4">
          <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-[0.4em] text-white/20 px-1">
            <span>INITIALIZING</span>
            <span className="tabular-nums">{Math.floor(progress)}%</span>
          </div>
          
          <div className="relative h-[1px] w-full bg-white/5">
            <motion.div 
              className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const SplitText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <span className={`flex flex-wrap justify-center overflow-hidden ${className}`}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { y: "110%" },
            show: { 
              y: 0,
              transition: {
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
                delay: i * 0.02
              }
            }
          }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'view1' | 'view2'>('view1');
  const [currentSection, setCurrentSection] = useState<SectionId>('title-page');
  const [titlePageData, setTitlePageData] = useState<TitlePageData>(DEFAULT_TITLE_DATA);
  const [coverPageData, setCoverPageData] = useState<CoverPageData>(DEFAULT_COVER_DATA);
  const [academicCoverData, setAcademicCoverData] = useState<CoverPageSectionData>(DEFAULT_ACADEMIC_COVER);
  const [acknowledgement, setAcknowledgement] = useState<BasicSectionData>(DEFAULT_ACKNOWLEDGEMENT);
  const [dedication, setDedication] = useState<BasicSectionData>(DEFAULT_DEDICATION);
  const [philosophy, setPhilosophy] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [cv, setCV] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [achievements, setAchievements] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [seminars, setSeminars] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [deptBackground, setDeptBackground] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [teachers, setTeachers] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [inclusions, setInclusions] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [appendices, setAppendices] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);

  const [extracurricular, setExtracurricular] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [evidence, setEvidence] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [premises, setPremises] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [logo, setLogo] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [introHistory, setIntroHistory] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [missionVision, setMissionVision] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [orgStructure, setOrgStructure] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [subjectsTaught, setSubjectsTaught] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [messageTeachers, setMessageTeachers] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [quizzes, setQuizzes] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [activities, setActivities] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [lessonPlan, setLessonPlan] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [instructionalMaterials, setInstructionalMaterials] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);

  const [editingData, setEditingData] = useState<TitlePageData>(DEFAULT_TITLE_DATA);
  const [editingCoverData, setEditingCoverData] = useState<CoverPageData>(DEFAULT_COVER_DATA);
  const [editingAcademicCoverData, setEditingAcademicCoverData] = useState<CoverPageSectionData>(DEFAULT_ACADEMIC_COVER);
  const [editingAcknowledgement, setEditingAcknowledgement] = useState<BasicSectionData>(DEFAULT_ACKNOWLEDGEMENT);
  const [editingDedication, setEditingDedication] = useState<BasicSectionData>(DEFAULT_DEDICATION);
  const [editingPhilosophy, setEditingPhilosophy] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingCV, setEditingCV] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingAchievements, setEditingAchievements] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingSeminars, setEditingSeminars] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingDeptBackground, setEditingDeptBackground] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingTeachers, setEditingTeachers] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingInclusions, setEditingInclusions] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingAppendices, setEditingAppendices] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingExtracurricular, setEditingExtracurricular] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingEvidence, setEditingEvidence] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingPremises, setEditingPremises] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingLogo, setEditingLogo] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingIntroHistory, setEditingIntroHistory] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingMissionVision, setEditingMissionVision] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingOrgStructure, setEditingOrgStructure] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingSubjectsTaught, setEditingSubjectsTaught] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingMessageTeachers, setEditingMessageTeachers] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingQuizzes, setEditingQuizzes] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingActivities, setEditingActivities] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingLessonPlan, setEditingLessonPlan] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);
  const [editingInstructionalMaterials, setEditingInstructionalMaterials] = useState<BasicSectionData>(DEFAULT_GENERIC_SECTION);

  const getSectionState = (id: SectionId) => {
    if (id === 'personal-philosophy') return [philosophy, setPhilosophy, editingPhilosophy, setEditingPhilosophy, 'portfolio_philosophy'] as const;
    if (id === 'cv') return [cv, setCV, editingCV, setEditingCV, 'portfolio_cv'] as const;
    if (id === 'achievements') return [achievements, setAchievements, editingAchievements, setEditingAchievements, 'portfolio_achievements'] as const;
    if (id === 'seminars') return [seminars, setSeminars, editingSeminars, setEditingSeminars, 'portfolio_seminars'] as const;
    if (id === 'department-background') return [deptBackground, setDeptBackground, editingDeptBackground, setEditingDeptBackground, 'portfolio_dept_background'] as const;
    if (id === 'subject-teachers') return [teachers, setTeachers, editingTeachers, setEditingTeachers, 'portfolio_teachers'] as const;
    if (id === 'subject-inclusions') return [inclusions, setInclusions, editingInclusions, setEditingInclusions, 'portfolio_inclusions'] as const;
    if (id === 'appendices') return [appendices, setAppendices, editingAppendices, setEditingAppendices, 'portfolio_appendices'] as const;
    if (id === 'acknowledgment') return [acknowledgement, setAcknowledgement, editingAcknowledgement, setEditingAcknowledgement, 'portfolio_acknowledgement'] as const;
    if (id === 'dedication') return [dedication, setDedication, editingDedication, setEditingDedication, 'portfolio_dedication'] as const;
    
    if (id === 'premises') return [premises, setPremises, editingPremises, setEditingPremises, 'portfolio_premises'] as const;
    if (id === 'logo') return [logo, setLogo, editingLogo, setEditingLogo, 'portfolio_logo'] as const;
    if (id === 'intro-history') return [introHistory, setIntroHistory, editingIntroHistory, setEditingIntroHistory, 'portfolio_intro_history'] as const;
    if (id === 'mission-vision') return [missionVision, setMissionVision, editingMissionVision, setEditingMissionVision, 'portfolio_mission_vision'] as const;
    if (id === 'org-structure') return [orgStructure, setOrgStructure, editingOrgStructure, setEditingOrgStructure, 'portfolio_org_structure'] as const;
    if (id === 'subjects-taught') return [subjectsTaught, setSubjectsTaught, editingSubjectsTaught, setEditingSubjectsTaught, 'portfolio_subjects_taught'] as const;
    if (id === 'message-teachers') return [messageTeachers, setMessageTeachers, editingMessageTeachers, setEditingMessageTeachers, 'portfolio_message_teachers'] as const;
    if (id === 'quizzes') return [quizzes, setQuizzes, editingQuizzes, setEditingQuizzes, 'portfolio_quizzes'] as const;
    if (id === 'activities') return [activities, setActivities, editingActivities, setEditingActivities, 'portfolio_activities'] as const;
    if (id === 'lesson-plan') return [lessonPlan, setLessonPlan, editingLessonPlan, setEditingLessonPlan, 'portfolio_lesson_plan'] as const;
    if (id === 'instructional-materials') return [instructionalMaterials, setInstructionalMaterials, editingInstructionalMaterials, setEditingInstructionalMaterials, 'portfolio_instr_mat'] as const;
    if (id === 'extracurricular') return [extracurricular, setExtracurricular, editingExtracurricular, setEditingExtracurricular, 'portfolio_extracurricular'] as const;
    if (id === 'evidence') return [evidence, setEvidence, editingEvidence, setEditingEvidence, 'portfolio_evidence'] as const;
    
    return null;
  };

  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [editingAppSettings, setEditingAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPagesMenuOpen, setIsPagesMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [isUrlTooLarge, setIsUrlTooLarge] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [portfolios, setPortfolios] = useState<PortfolioSnapshot[]>([]);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [showStatusIcons, setShowStatusIcons] = useState(() => {
    const saved = localStorage.getItem('portfolio_show_status');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('portfolio_show_status', JSON.stringify(showStatusIcons));
  }, [showStatusIcons]);

  const getAllData = () => {
    const data: any = {
      titlePage: isEditing ? editingData : titlePageData,
      coverPage: isEditing ? editingCoverData : coverPageData,
      academicCover: isEditing ? editingAcademicCoverData : academicCoverData,
      acknowledgement: isEditing ? editingAcknowledgement : acknowledgement,
      dedication: isEditing ? editingDedication : dedication,
      philosophy: isEditing ? editingPhilosophy : philosophy,
      cv: isEditing ? editingCV : cv,
      achievements: isEditing ? editingAchievements : achievements,
      seminars: isEditing ? editingSeminars : seminars,
      deptBackground: isEditing ? editingDeptBackground : deptBackground,
      teachers: isEditing ? editingTeachers : teachers,
      inclusions: isEditing ? editingInclusions : inclusions,
      appendices: isEditing ? editingAppendices : appendices,
      premises: isEditing ? editingPremises : premises,
      logo: isEditing ? editingLogo : logo,
      introHistory: isEditing ? editingIntroHistory : introHistory,
      missionVision: isEditing ? editingMissionVision : missionVision,
      orgStructure: isEditing ? editingOrgStructure : orgStructure,
      subjectsTaught: isEditing ? editingSubjectsTaught : subjectsTaught,
      messageTeachers: isEditing ? editingMessageTeachers : messageTeachers,
      quizzes: isEditing ? editingQuizzes : quizzes,
      activities: isEditing ? editingActivities : activities,
      lessonPlan: isEditing ? editingLessonPlan : lessonPlan,
      instructionalMaterials: isEditing ? editingInstructionalMaterials : instructionalMaterials,
      extracurricular: isEditing ? editingExtracurricular : extracurricular,
      evidence: isEditing ? editingEvidence : evidence,
      appSettings: isEditing ? editingAppSettings : appSettings
    };
    return data;
  };

  const applyPortfolioData = (allData: any) => {
    if (!allData) return;
    
    const sanitizeStrings = (obj: any, defaults: any) => {
      if (!obj) return defaults;
      const res = { ...defaults, ...obj };
      Object.keys(defaults).forEach(key => {
        if (typeof defaults[key] === 'string' && typeof res[key] === 'object') {
          res[key] = defaults[key];
        }
      });
      return res;
    };

    if (allData.titlePage) { 
      const data = sanitizeStrings(allData.titlePage, DEFAULT_TITLE_DATA);
      setTitlePageData(data); setEditingData(data); 
    }
    if (allData.coverPage) { 
      const data = sanitizeStrings(allData.coverPage, DEFAULT_COVER_DATA);
      setCoverPageData(data); setEditingCoverData(data); 
    }
    if (allData.academicCover) { 
      const data = sanitizeStrings(allData.academicCover, DEFAULT_ACADEMIC_COVER);
      setAcademicCoverData(data); setEditingAcademicCoverData(data); 
    }
    if (allData.acknowledgement) { 
      const data = sanitizeStrings(allData.acknowledgement, DEFAULT_ACKNOWLEDGEMENT);
      setAcknowledgement(data); setEditingAcknowledgement(data); 
    }
    if (allData.dedication) { 
      const data = sanitizeStrings(allData.dedication, DEFAULT_DEDICATION);
      setDedication(data); setEditingDedication(data); 
    }
    
    ['philosophy', 'cv', 'achievements', 'seminars', 'deptBackground', 'teachers', 'inclusions', 'appendices',
     'premises', 'logo', 'introHistory', 'missionVision', 'orgStructure', 'subjectsTaught', 'messageTeachers', 
     'quizzes', 'activities', 'lessonPlan', 'instructionalMaterials', 'extracurricular', 'evidence'].forEach(key => {
      if (allData[key]) {
        const state = getSectionState(key as any);
        if (state) {
          state[1](allData[key]);
          state[3](allData[key]);
        }
      }
    });

    if (allData.appSettings) {
      setAppSettings(allData.appSettings);
      setEditingAppSettings(allData.appSettings);
    }
  };

  const createPortfolio = (name: string = "New Portfolio", initialData?: any, isOriginal: boolean = false, shouldHideDashboard: boolean = true) => {
    setIsSharedView(false);
    const id = Math.random().toString(36).substring(2, 11).toUpperCase();
    
    // Ensure we have data to save
    let dataToSave = initialData;
    if (!dataToSave) {
      const allData = getAllData();
      dataToSave = LZString.compressToEncodedURIComponent(JSON.stringify(allData));
    }

    const newPortfolio: PortfolioSnapshot = {
      id,
      name,
      lastModified: Date.now(),
      activeShareId: null,
      data: dataToSave,
      isOriginal
    };
    
    const updated = [...portfolios, newPortfolio];
    setPortfolios(updated);
    localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(updated));
    localStorage.setItem(CURRENT_PORTFOLIO_ID_KEY, id);
    
    // Switch to it
    switchPortfolio(id, updated, shouldHideDashboard);
  };

  const switchPortfolio = (id: string, list: PortfolioSnapshot[] = portfolios, shouldHideDashboard: boolean = true) => {
    setIsSharedView(false);
    const p = list.find(item => item.id === id);
    if (p) {
      console.log("Switching to portfolio:", p.name, id);
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(p.data);
        if (decompressed) {
          applyPortfolioData(JSON.parse(decompressed));
          setCurrentPortfolioId(id);
          setActiveShareId(p.activeShareId || null);
          localStorage.setItem(CURRENT_PORTFOLIO_ID_KEY, id);
          
          if (shouldHideDashboard) {
            setShowDashboard(false);
          }
          
          // Set view to home page on switch
          setView('view1');
          setCurrentSection('cover-page');
        }
      } catch (e) {
        console.error("Failed to switch portfolio", e);
        // Fallback: try parsing as raw JSON if decompression fails
        try {
          applyPortfolioData(JSON.parse(p.data));
          setCurrentPortfolioId(id);
          setActiveShareId(p.activeShareId || null);
          if (shouldHideDashboard) {
            setShowDashboard(false);
          }
        } catch(err) {}
      }
    }
  };

  const duplicatePortfolio = (id: string) => {
    const p = portfolios.find(item => item.id === id);
    if (p) {
      createPortfolio(`${p.name} (Copy)`, p.data, false, false);
    }
  };

  const deletePortfolio = (id: string) => {
    const p = portfolios.find(item => item.id === id);
    if (!p || p.isOriginal) return;

    const updated = portfolios.filter(p => p.id !== id);
    setPortfolios(updated);
    localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(updated));
    setDeletingId(null);
    
    if (updated.length === 0) {
      createPortfolio("Original", undefined, true, false);
    } else if (currentPortfolioId === id) {
      switchPortfolio(updated[0].id, updated, false);
    }
  };

  const handleRename = (id: string) => {
    if (renamingValue && renamingValue.trim()) {
      const updated = portfolios.map(item => item.id === id ? { ...item, name: renamingValue.trim() } : item);
      setPortfolios(updated);
      localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(updated));
    }
    setRenamingId(null);
    setRenamingValue('');
  };

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File too large (max 20MB)");
        return;
      }

      if (editingAppSettings.imgbbKey) {
        const url = await uploadToImgBB(file, editingAppSettings.imgbbKey);
        if (url) {
          setEditingAppSettings(prev => ({ ...prev, bgImage: url, bgType: 'image' }));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        setEditingAppSettings(prev => ({ ...prev, bgImage: reader.result as string, bgType: 'image' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large (max 5MB)");
        return;
      }

      if (editingAppSettings.imgbbKey) {
        const url = await uploadToImgBB(file, editingAppSettings.imgbbKey);
        if (url) {
          setEditingData(prev => ({ ...prev, headerImage: url, showHeaderImage: true }));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        setEditingData(prev => ({ ...prev, headerImage: reader.result as string, showHeaderImage: true }));
      };
      reader.readAsDataURL(file);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const handleUrlData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      const sharedId = urlParams.get('id') || urlParams.get('p'); // Support both 'id' and 'p' (p is shorter)

      if (sharedId) setActiveShareId(sharedId);

      let rawData = null;

      if (sharedId) {
        setIsLoadingShared(true);
        console.log("Attempting to load from Cloud ID:", sharedId);
        try {
          const docRef = doc(db, 'portfolios', sharedId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            rawData = docSnap.data().compressedData;
            console.log("Cloud portfolio data retrieved. Length:", rawData?.length || 0);
          } else {
            console.error("Cloud document not found");
            alert("This shared link has expired or no longer exists.");
          }
        } catch (error: any) {
          console.error("Cloud storage access error:", error);
          
          // Check for common blocking issues (Brave Shields, Adblockers)
          const isBlocked = error?.message?.includes('network') || error?.message?.includes('permission') || error?.code === 'unavailable';
          
          if (isBlocked) {
            alert("Connection to Cloud was blocked. If you are using Brave, please try disabling 'Shields' for this site, or check your adblocker settings.");
          } else if (window.location.hostname !== 'localhost') {
            alert("Unable to reach cloud servers. Please check your internet connection.");
          }
        } finally {
          setIsLoadingShared(false);
        }
      } else if (sharedData) {
        console.log("Attempting to load from URL Data. Length:", sharedData.length);
        rawData = sharedData;
      }

      if (rawData) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(rawData);
          if (decompressed) {
            applyPortfolioData(JSON.parse(decompressed));
            return true;
          }
        } catch (e) {
          console.error("Failed to load/parse shared data", e);
        }
      }
      return false;
    };

    // Load portfolios from localStorage
    const savedPortfolios = localStorage.getItem(PORTFOLIOS_KEY);
    const savedCurrentId = localStorage.getItem(CURRENT_PORTFOLIO_ID_KEY);
    
    let loadedPortfolios: PortfolioSnapshot[] = [];
    if (savedPortfolios) {
      try {
        loadedPortfolios = JSON.parse(savedPortfolios);
        
        // MIGRATION: Ensure at least one portfolio is marked as "Original" if they exist
        if (loadedPortfolios.length > 0 && !loadedPortfolios.some(p => p.isOriginal)) {
          loadedPortfolios[0].isOriginal = true;
          // Only rename if it's the generic name
          if (loadedPortfolios[0].name === "My Portfolio" || loadedPortfolios[0].name === "New Portfolio") {
            loadedPortfolios[0].name = "Original";
          }
          localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(loadedPortfolios));
        }
        
        setPortfolios([...loadedPortfolios]);
      } catch (e) {
        console.error("Failed to parse portfolios", e);
      }
    }
    
    if (savedCurrentId) {
      setCurrentPortfolioId(savedCurrentId);
    }
    
    handleUrlData().then(loadedFromUrl => {
      if (loadedFromUrl) {
        setShowDashboard(false);
        setIsSharedView(true);
        return;
      }

      // If we have portfolios and a current ID, load that one in the background
      if (loadedPortfolios.length > 0 && savedCurrentId) {
        const current = loadedPortfolios.find(p => p.id === savedCurrentId);
        if (current) {
          try {
            const decompressed = LZString.decompressFromEncodedURIComponent(current.data);
            if (decompressed) {
              applyPortfolioData(JSON.parse(decompressed));
              setActiveShareId(current.activeShareId || null);
            }
          } catch(e) {}
        }
      }
      
      // Always show dashboard on initial load if not loading from a shared URL
      setShowDashboard(true);

      // Initial migration and setup logic
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.layoutOrder) {
            parsed.layoutOrder = [
              'sys-title', 'sys-subtitle', 'sys-desc', 'sys-divider', 
              'sys-student', 'sys-professor', 'sys-ay',
              ...(parsed.blocks || []).map((b: any) => b.id)
            ];
          }
          const sanitizeStrings = (obj: any, defaults: any) => {
            const res = { ...obj };
            Object.keys(defaults).forEach(key => {
              if (typeof defaults[key] === 'string' && typeof res[key] === 'object') {
                res[key] = defaults[key];
              }
            });
            return res;
          };
          const merged = sanitizeStrings({ ...DEFAULT_TITLE_DATA, ...parsed }, DEFAULT_TITLE_DATA);
          setTitlePageData(merged);
          setEditingData(merged);
        } catch (e) {
          console.error('Failed to parse saved data', e);
        }
      }

      const savedCover = localStorage.getItem(COVER_STORAGE_KEY);
      if (savedCover) {
        try {
          const parsed = JSON.parse(savedCover);
          if (parsed.heroImage !== undefined) {
            parsed.heroMedia = { type: 'image', url: parsed.heroImage };
            delete parsed.heroImage;
          }
          if (parsed.projects) {
            parsed.projects = parsed.projects.map((p: any) => {
              if (p.image !== undefined) {
                return { ...p, media: { type: 'image', url: p.image }, image: undefined };
              }
              return p;
            });
          }
          const merged = { ...DEFAULT_COVER_DATA, ...parsed };
          setCoverPageData(merged);
          setEditingCoverData(merged);
        } catch (e) {
          console.error('Failed to parse cover data', e);
        }
      }

      const savedAcademic = localStorage.getItem(NEW_COVER_SECTION_KEY);
      if (savedAcademic) {
        try {
          const parsed = JSON.parse(savedAcademic);
          if (!parsed.layoutOrder) {
            parsed.layoutOrder = ['sys-label', 'sys-heading', 'sys-divider', 'sys-p1', 'sys-p2', 'sys-pillars', ...(parsed.blocks || []).map((b: any) => b.id)];
          }
          const sanitizeStrings = (obj: any, defaults: any) => {
            const res = { ...obj };
            Object.keys(defaults).forEach(key => {
              if (typeof defaults[key] === 'string' && typeof res[key] === 'object') {
                res[key] = defaults[key];
              }
            });
            return res;
          };
          const merged = sanitizeStrings({ ...DEFAULT_ACADEMIC_COVER, ...parsed }, DEFAULT_ACADEMIC_COVER);
          setAcademicCoverData(merged);
          setEditingAcademicCoverData(merged);
        } catch (e) {
          console.error('Failed to parse academic cover data', e);
        }
      }

      ['acknowledgment', 'dedication', 'personal-philosophy', 'cv', 'achievements', 'seminars', 'department-background', 'subject-teachers', 'subject-inclusions', 'appendices',
       'premises', 'logo', 'intro-history', 'mission-vision', 'org-structure', 'subjects-taught', 'message-teachers', 'quizzes', 'activities', 'lesson-plan', 'instructional-materials', 'extracurricular', 'evidence'].forEach(id => {
        const saved = localStorage.getItem(getSectionState(id as SectionId)?.[4] || '');
        if (saved) {
          try {
            if (saved.includes('[object Object]')) throw new Error('Sanitize object string');
            const parsed = JSON.parse(saved);
            if (!parsed.layoutOrder) {
              parsed.layoutOrder = ['sys-header', 'sys-divider', 'sys-content', ...(parsed.blocks || []).map((b: any) => b.id)];
            }
            const defaultData = id === 'acknowledgment' ? DEFAULT_ACKNOWLEDGEMENT : id === 'dedication' ? DEFAULT_DEDICATION : DEFAULT_GENERIC_SECTION;
            const sanitizeStrings = (obj: any, defaults: any) => {
              const res = { ...obj };
              Object.keys(defaults).forEach(key => {
                if (typeof defaults[key] === 'string' && typeof res[key] === 'object') {
                  res[key] = defaults[key];
                }
              });
              return res;
            };
            const merged = sanitizeStrings({ ...defaultData, ...parsed }, defaultData);
            const state = getSectionState(id as SectionId);
            if (state) {
              state[1](merged);
              state[3](merged);
            }
          } catch (e) {
            console.error(`Failed to parse ${id} data`, e);
          }
        }
      });

      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (!parsed.imgbbKey) {
            parsed.imgbbKey = DEFAULT_SETTINGS.imgbbKey;
          }
          const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed };
          setAppSettings(mergedSettings);
          setEditingAppSettings(mergedSettings);
        } catch (e) {}
      }

      // If no portfolios exist even after migration attempts, create the initial one
      if (loadedPortfolios.length === 0) {
        const id = Math.random().toString(36).substring(2, 11).toUpperCase();
        
        // Re-construct the full data object from the migrated state snapshots
        const fullData: any = {
           titlePage: titlePageData,
           coverPage: coverPageData,
           academicCover: academicCoverData,
           acknowledgement: acknowledgement,
           dedication: dedication,
           philosophy: philosophy,
           cv: cv,
           achievements: achievements,
           seminars: seminars,
           deptBackground: deptBackground,
           teachers: teachers,
           inclusions: inclusions,
           appendices: appendices,
           premises: premises,
           logo: logo,
           introHistory: introHistory,
           missionVision: missionVision,
           orgStructure: orgStructure,
           subjectsTaught: subjectsTaught,
           messageTeachers: messageTeachers,
           quizzes: quizzes,
           activities: activities,
           lessonPlan: lessonPlan,
           instructionalMaterials: instructionalMaterials,
           extracurricular: extracurricular,
           evidence: evidence,
           appSettings: appSettings
        };

        const initialPortfolio: PortfolioSnapshot = {
          id,
          name: "Original",
          lastModified: Date.now(),
          activeShareId: null,
          data: LZString.compressToEncodedURIComponent(JSON.stringify(fullData)),
          isOriginal: true
        };
        const list = [initialPortfolio];
        setPortfolios(list);
        setCurrentPortfolioId(id);
        localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(list));
        localStorage.setItem(CURRENT_PORTFOLIO_ID_KEY, id);
      }
    });
  }, []);

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === 'growingold9886') {
      setIsEditing(true);
      setHasUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert("Invalid code!");
    }
  };

  const handleSave = () => {
    try {
      // Save Title Page
      setTitlePageData(editingData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(editingData));

      // Save Main Hero Data
      setCoverPageData(editingCoverData);
      localStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(editingCoverData));
      
      // Save Academic Cover
      setAcademicCoverData(editingAcademicCoverData);
      localStorage.setItem(NEW_COVER_SECTION_KEY, JSON.stringify(editingAcademicCoverData));
      
      // Save All Basic Sections
      ['acknowledgment', 'dedication', 'personal-philosophy', 'cv', 'achievements', 'seminars', 'department-background', 'subject-teachers', 'subject-inclusions', 'appendices', 
       'premises', 'logo', 'intro-history', 'mission-vision', 'org-structure', 'subjects-taught', 'message-teachers', 'quizzes', 'activities', 'lesson-plan', 'instructional-materials', 'extracurricular', 'evidence'].forEach(id => {
        const state = getSectionState(id as SectionId);
        if (state) {
          const [val, setVal, editVal, setEditVal, key] = state;
          setVal(editVal);
          localStorage.setItem(key, JSON.stringify(editVal));
        }
      });

      // Save Settings
      setAppSettings(editingAppSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(editingAppSettings));

      // Update current portfolio snapshot in the list
      const allData = getAllData();
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(allData));
      
      let updatedPortfolios = [...portfolios];
      let portfolioId = currentPortfolioId;
      
      if (!portfolioId) {
        // Migration case or first save
        portfolioId = Math.random().toString(36).substring(2, 11).toUpperCase();
        setCurrentPortfolioId(portfolioId);
        localStorage.setItem(CURRENT_PORTFOLIO_ID_KEY, portfolioId);
        updatedPortfolios = [{
          id: portfolioId,
          name: "My Portfolio",
          lastModified: Date.now(),
          activeShareId: activeShareId,
          data: compressed
        }];
      } else {
        updatedPortfolios = portfolios.map(p => 
          p.id === portfolioId 
            ? { ...p, lastModified: Date.now(), data: compressed, activeShareId: activeShareId } 
            : p
        );
      }
      
      setPortfolios(updatedPortfolios);
      localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(updatedPortfolios));

      // Auto-sync to cloud if this portfolio has a cloud link
      if (activeShareId) {
        console.log("Auto-syncing to cloud ID:", activeShareId);
        try {
          const docRef = doc(db, 'portfolios', activeShareId);
          setDoc(docRef, { 
            compressedData: compressed, 
            updatedAt: Date.now() 
          });
        } catch (e) {
          console.error("Cloud auto-sync failed:", e);
        }
      }

      setIsEditing(false);
      setHasUnlocked(false);
    } catch (e) {
      console.error('Failed to save data to local storage', e);
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        alert("Portfolio too large to save! Try using links (URL/Spline) instead of large uploaded images.");
      } else {
        alert("An error occurred while saving. Check the console for details.");
      }
      // Still close editing mode if save was partially successful or we handle the error
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditingData(titlePageData);
    setEditingAcademicCoverData(academicCoverData);
    setEditingCoverData(coverPageData);
    setEditingAppSettings(appSettings);
    
    ['acknowledgment', 'dedication', 'personal-philosophy', 'cv', 'achievements', 'seminars', 'department-background', 'subject-teachers', 'subject-inclusions', 'appendices',
     'premises', 'logo', 'intro-history', 'mission-vision', 'org-structure', 'subjects-taught', 'message-teachers', 'quizzes', 'activities', 'lesson-plan', 'instructional-materials', 'extracurricular', 'evidence'].forEach(id => {
      const state = getSectionState(id as SectionId);
      if (state) {
        const [val, setVal, editVal, setEditVal] = state;
        setEditVal(val);
      }
    });

    setIsEditing(false);
    setHasUnlocked(false);
  };

  const generateShareLink = async (targetIdOverride?: string, dataOverride?: any) => {
    setIsSharing(true);
    setShareUrl('Syncing to cloud...');
    setHasCopied(false);
    setIsUrlTooLarge(false);

    const targetId = targetIdOverride || currentPortfolioId;
    const portfolioToShare = portfolios.find(p => p.id === targetId);
    const existingShareId = portfolioToShare?.activeShareId;
    
    // Reuse existing ID if available, else generate new 8-character ID
    const shareId = existingShareId || Array.from({length: 8}, () => Math.random().toString(36)[2]).join('').toUpperCase();
    
    // Determine data to sync
    let dataToSync;
    if (dataOverride) {
      // Use provided data (compressed)
      dataToSync = dataOverride;
    } else {
      // Use current app state
      const allData = getAllData();
      dataToSync = LZString.compressToEncodedURIComponent(JSON.stringify(allData));
    }

    const syncToFirebase = async (id: string, data: string, retries = 2): Promise<boolean> => {
      try {
        console.log(`Cloud Sync Attempt with ID: ${id}. Retries left: ${retries}`);
        
        const savePromise = setDoc(doc(db, 'portfolios', id), {
          compressedData: data,
          createdAt: serverTimestamp(),
          v: 4
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 20000)
        );

        await Promise.race([savePromise, timeoutPromise]);
        return true;
      } catch (err) {
        if (retries > 0) return syncToFirebase(id, data, retries - 1);
        console.error("Firebase sync error:", err);
        return false;
      }
    };

    // Firestore limit check (900KB safety margin)
    const sizeInBytes = new Blob([dataToSync]).size;
    const isTooLarge = sizeInBytes > 900 * 1024;

    if (!isTooLarge) {
      const success = await syncToFirebase(shareId, dataToSync);
      if (success) {
        // Update local storage and state for this specific portfolio
        const updatedPortfolios = portfolios.map(p => 
          p.id === targetId ? { ...p, activeShareId: shareId, lastModified: Date.now() } : p
        );
        setPortfolios(updatedPortfolios);
        localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(updatedPortfolios));
        
        if (targetId === currentPortfolioId) {
          setActiveShareId(shareId);
        }
        
        const url = `${window.location.origin}${window.location.pathname}?p=${shareId}`;
        setShareUrl(url);
        return;
      }
    }

    // Fallback: Embed data in URL if Firebase fails or is too large
    const url = `${window.location.origin}${window.location.pathname}?data=${dataToSync}`;
    setShareUrl(url);
    setIsUrlTooLarge(false); 
  };

  const copyToClipboard = async () => {
    if (shareUrl === 'Syncing to cloud...') {
      alert("Wait a moment—we are still syncing your data to the cloud.");
      return;
    }

    try {
      // 1. Try modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 3000);
        return;
      }
      
      // 2. Fallback: ExecCommand Copy
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed"; // Fixed is better than absolute
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 3000);
      } else {
        throw new Error("ExecCommand failed");
      }
    } catch (err) {
      console.error('Copy Error:', err);
      // 3. Final Fallback: Manual Selection
      const input = document.getElementById('share-url-text');
      if (input) {
        const range = document.createRange();
        range.selectNodeContents(input);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        alert("Clipboard blocked. Link is highlighted—press Ctrl+C / Cmd+C to copy.");
      }
    }
  };

  const addBlock = (type: 'text' | 'image' | 'video') => {
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newBlock: ContentBlock = {
      id: blockId,
      type,
      content: '',
      alignment: 'center',
    };

    if (view === 'view1') {
      setEditingData(prev => ({ 
        ...prev, 
        blocks: [...prev.blocks, newBlock],
        layoutOrder: [...prev.layoutOrder, blockId]
      }));
    } else if (currentSection === 'cover-page') {
      setEditingAcademicCoverData(prev => ({ 
        ...prev, 
        blocks: [...(prev.blocks || []), newBlock],
        layoutOrder: [...prev.layoutOrder, blockId]
      }));
    } else {
      const state = getSectionState(currentSection);
      if (state) {
        const [val, setVal, editVal, setEditVal] = state;
        setEditVal(prev => ({ 
          ...prev, 
          blocks: [...(prev.blocks || []), newBlock],
          layoutOrder: [...prev.layoutOrder, blockId]
        }));
      }
    }
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    if (view === 'view1') {
      setEditingData(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
      }));
    } else if (currentSection === 'cover-page') {
      setEditingAcademicCoverData(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(b => b.id === id ? { ...b, ...updates } : b)
      }));
    } else {
      const state = getSectionState(currentSection);
      if (state) {
        const [val, setVal, editVal, setEditVal] = state;
        setEditVal(prev => ({
          ...prev,
          blocks: (prev.blocks || []).map(b => b.id === id ? { ...b, ...updates } : b)
        }));
      }
    }
  };

  const duplicateBlock = (id: string) => {
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (view === 'view1') {
        const originalBlock = editingData.blocks.find(b => b.id === id);
        if (!originalBlock) return;
        const newBlock = { ...originalBlock, id: blockId };
        const index = editingData.layoutOrder.indexOf(id);
        const newLayoutOrder = [...editingData.layoutOrder];
        newLayoutOrder.splice(index + 1, 0, blockId);
        setEditingData(prev => ({
            ...prev,
            blocks: [...prev.blocks, newBlock],
            layoutOrder: newLayoutOrder
        }));
    } else if (currentSection === 'cover-page') {
        const originalBlock = editingAcademicCoverData.blocks?.find(b => b.id === id);
        if (!originalBlock) return;
        const newBlock = { ...originalBlock, id: blockId };
        const index = editingAcademicCoverData.layoutOrder.indexOf(id);
        const newLayoutOrder = [...editingAcademicCoverData.layoutOrder];
        newLayoutOrder.splice(index + 1, 0, blockId);
        setEditingAcademicCoverData(prev => ({
            ...prev,
            blocks: [...(prev.blocks || []), newBlock],
            layoutOrder: newLayoutOrder
        }));
    } else {
        const state = getSectionState(currentSection);
        if (state) {
            const [val, setVal, editVal, setEditVal] = state;
            const originalBlock = editVal.blocks?.find(b => b.id === id);
            if (!originalBlock) return;
            const newBlock = { ...originalBlock, id: blockId };
            const index = editVal.layoutOrder.indexOf(id);
            const newLayoutOrder = [...editVal.layoutOrder];
            newLayoutOrder.splice(index + 1, 0, blockId);
            setEditVal(prev => ({
                ...prev,
                blocks: [...(prev.blocks || []), newBlock],
                layoutOrder: newLayoutOrder
            }));
        }
    }
  };

  const duplicateSystemItem = (itemId: string) => {
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let content = '';
    let alignment: 'left' | 'center' | 'right' = 'center';
    let type: 'text' | 'image' | 'video' = 'text';
    let pillars: { title: string; description: string }[] | undefined;

    if (view === 'view1') {
        if (itemId === 'sys-header') {
            content = editingData.headerImage;
            type = 'image';
        }
        else if (itemId === 'sys-title') content = String(editingData.title).includes('[object Object]') ? DEFAULT_TITLE_DATA.title : editingData.title;
        else if (itemId === 'sys-subtitle') content = String(editingData.subtitle).includes('[object Object]') ? DEFAULT_TITLE_DATA.subtitle : editingData.subtitle;
        else if (itemId === 'sys-desc') content = String(editingData.description).includes('[object Object]') ? DEFAULT_TITLE_DATA.description : editingData.description;
        else if (itemId === 'sys-student') {
          const sName = String(editingData.studentName).includes('[object Object]') ? DEFAULT_TITLE_DATA.studentName : editingData.studentName;
          const cYS = String(editingData.courseYearSection).includes('[object Object]') ? DEFAULT_TITLE_DATA.courseYearSection : editingData.courseYearSection;
          content = `${sName}\n${cYS}`;
        }
        else if (itemId === 'sys-professor') content = String(editingData.professorName).includes('[object Object]') ? DEFAULT_TITLE_DATA.professorName : editingData.professorName;
        else if (itemId === 'sys-ay') content = String(editingData.academicYear).includes('[object Object]') ? DEFAULT_TITLE_DATA.academicYear : editingData.academicYear;
        else if (itemId === 'sys-divider') content = '---';
        alignment = editingData.alignment || 'center';
    } else if (currentSection === 'cover-page') {
        if (itemId === 'sys-label') content = String(editingAcademicCoverData.label).includes('[object Object]') ? DEFAULT_ACADEMIC_COVER.label : editingAcademicCoverData.label;
        else if (itemId === 'sys-heading') content = String(editingAcademicCoverData.heading).includes('[object Object]') ? DEFAULT_ACADEMIC_COVER.heading : editingAcademicCoverData.heading;
        else if (itemId === 'sys-p1') content = editingAcademicCoverData.paragraph1;
        else if (itemId === 'sys-p2') content = editingAcademicCoverData.paragraph2;
        else if (itemId === 'sys-divider') content = '---';
        else if (itemId === 'sys-pillars') {
            pillars = editingAcademicCoverData.pillars;
            content = 'Dynamic Pillars';
        }
        alignment = editingAcademicCoverData.alignment || 'center';
    } else {
        const state = getSectionState(currentSection);
        if (state) {
            const data = state[2];
            if (itemId === 'sys-header') {
                content = SECTIONS.find(s => s.id === currentSection)?.label.replace(/^\d+\.\s*/, '') || 
                          SECTIONS.flatMap(s => s.subItems || []).find(sub => sub.id === currentSection)?.label || '';
            }
            else if (itemId === 'sys-content') content = data.content;
            else if (itemId === 'sys-divider') content = '---';
            alignment = data.alignment || 'center';
        }
    }

    const newBlock: ContentBlock = { id: blockId, type, content, alignment, pillars };

    if (view === 'view1') {
        const index = editingData.layoutOrder.indexOf(itemId);
        const newLayoutOrder = [...editingData.layoutOrder];
        newLayoutOrder.splice(index + 1, 0, blockId);
        setEditingData(prev => ({
            ...prev,
            blocks: [...prev.blocks, newBlock],
            layoutOrder: newLayoutOrder
        }));
    } else if (currentSection === 'cover-page') {
        const index = editingAcademicCoverData.layoutOrder.indexOf(itemId);
        const newLayoutOrder = [...editingAcademicCoverData.layoutOrder];
        newLayoutOrder.splice(index + 1, 0, blockId);
        setEditingAcademicCoverData(prev => ({
            ...prev,
            blocks: [...(prev.blocks || []), newBlock],
            layoutOrder: newLayoutOrder
        }));
    } else {
        const state = getSectionState(currentSection);
        if (state) {
            const [val, setVal, editVal, setEditVal] = state;
            const index = editVal.layoutOrder.indexOf(itemId);
            const newLayoutOrder = [...editVal.layoutOrder];
            newLayoutOrder.splice(index + 1, 0, blockId);
            setEditVal(prev => ({
                ...prev,
                blocks: [...(prev.blocks || []), newBlock],
                layoutOrder: newLayoutOrder
            }));
        }
    }
  };

  const removeBlock = (id: string) => {
    if (view === 'view1') {
      setEditingData(prev => ({
        ...prev,
        blocks: prev.blocks.filter(b => b.id !== id),
        layoutOrder: prev.layoutOrder.filter(itemId => itemId !== id)
      }));
    } else if (currentSection === 'cover-page') {
      setEditingAcademicCoverData(prev => ({ 
        ...prev, 
        blocks: (prev.blocks || []).filter(b => b.id !== id),
        layoutOrder: prev.layoutOrder.filter(itemId => itemId !== id)
      }));
    } else {
      const state = getSectionState(currentSection);
      if (state) {
        const [val, setVal, editVal, setEditVal] = state;
        setEditVal(prev => ({ 
          ...prev, 
          blocks: (prev.blocks || []).filter(b => b.id !== id),
          layoutOrder: prev.layoutOrder.filter(itemId => itemId !== id)
        }));
      }
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      if (view === 'view1') {
        setEditingData((prev) => {
          const oldIndex = prev.layoutOrder.indexOf(active.id as string);
          const newIndex = prev.layoutOrder.indexOf(over.id as string);
          return {
            ...prev,
            layoutOrder: arrayMove(prev.layoutOrder, oldIndex, newIndex),
          };
        });
      } else {
        const handleReorder = (prev: any) => {
          const oldIndex = prev.layoutOrder.indexOf(active.id as string);
          const newIndex = prev.layoutOrder.indexOf(over.id as string);
          return {
            ...prev,
            layoutOrder: arrayMove(prev.layoutOrder, oldIndex, newIndex),
          };
        };

        if (currentSection === 'cover-page') {
          setEditingAcademicCoverData(prev => handleReorder(prev));
        } else {
          const state = getSectionState(currentSection);
          if (state) {
            const [val, setVal, editVal, setEditVal] = state;
            setEditVal(prev => handleReorder(prev));
          }
        }
      }
    }
  };

  const navigateTo = (section: SectionId) => {
    if (section === 'title-page') {
      setView('view1');
    } else {
      setCurrentSection(section);
      setView('view2');
    }
    setIsSidebarOpen(false);
  };

  const openPortfolio = () => {
    setView('view2');
    setCurrentSection('cover-page');
  };

  const VisibilityToggle = ({ field, label }: { field: keyof TitlePageData, label: string }) => {
    const isVisible = editingData[field] as boolean;
    return (
      <button
        onClick={() => setEditingData({ ...editingData, [field]: !isVisible })}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter shadow-sm border ${
          isVisible ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
        }`}
      >
        {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
        {label}
      </button>
    );
  };

  const BackgroundSettings = () => {
    const fonts = [
      { name: 'Modern Sans', value: "'Inter', sans-serif" },
      { name: 'Elegant Serif', value: "'Playfair Display', serif" },
      { name: 'Minimal Mono', value: "'JetBrains Mono', monospace" },
      { name: 'Futuristic', value: "'Space Grotesk', sans-serif" },
      { name: 'Soft Edge', value: "'Outfit', sans-serif" },
      { name: 'Classical', value: "'Fraunces', serif" }
    ];

    return (
      <div className="flex flex-col gap-10 w-full">
        {/* Background Config */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Section Background</span>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-1 p-1 bg-neutral-50 rounded-2xl border border-neutral-100 w-fit">
              <button 
                onClick={() => setEditingAppSettings(prev => ({ ...prev, bgType: 'color' }))}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${editingAppSettings.bgType === 'color' ? 'bg-black text-white' : 'text-neutral-400 hover:text-black'}`}
              >
                Color
              </button>
              <button 
                onClick={() => setEditingAppSettings(prev => ({ ...prev, bgType: 'image' }))}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${editingAppSettings.bgType === 'image' ? 'bg-black text-white' : 'text-neutral-400 hover:text-black'}`}
              >
                Image
              </button>
            </div>

            {editingAppSettings.bgType === 'color' ? (
              <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 w-full sm:w-auto">
                <input 
                  type="color" 
                  value={editingAppSettings.bgColor}
                  onChange={(e) => setEditingAppSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                  className="w-12 h-12 p-1 bg-white border border-neutral-200 rounded-xl cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-neutral-300 tracking-widest">Hex Code</span>
                  <span className="text-sm font-bold font-mono tracking-widest">{editingAppSettings.bgColor.toUpperCase()}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-2">
                   <input 
                      type="text" 
                      placeholder="Image URL"
                      value={editingAppSettings.bgImage.startsWith('data:') ? 'Local Image File' : editingAppSettings.bgImage}
                      onChange={(e) => setEditingAppSettings(prev => ({ ...prev, bgImage: e.target.value }))}
                      className="flex-1 bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 text-[10px] outline-none focus:border-black shadow-inner"
                    />
                    <button 
                      onClick={() => bgFileInputRef.current?.click()}
                      className="p-4 bg-neutral-50 hover:bg-neutral-900 hover:text-white border border-neutral-100 rounded-2xl transition-all shadow-sm"
                      title="Upload Local Image"
                    >
                      <Upload size={16} />
                    </button>
                 </div>
                  <input 
                    type="file"
                    ref={bgFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleBgUpload}
                  />
                <div className="flex flex-col gap-4 p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-neutral-400">Opacity</span>
                      <span className="text-black">{editingAppSettings.bgOpacity ?? 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={editingAppSettings.bgOpacity ?? 100}
                      onChange={(e) => setEditingAppSettings(prev => ({ ...prev, bgOpacity: parseInt(e.target.value) || 0 }))}
                      className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                  </div>
              </div>
            )}
          </div>
        </div>

        {/* Font Config */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Typography Settings</span>
          <div className="flex flex-col gap-2">
            {fonts.map(font => (
              <button
                key={font.value}
                onClick={() => setEditingAppSettings(prev => ({ ...prev, font: font.value }))}
                className={`w-full p-5 rounded-2xl text-left border transition-all ${
                  editingAppSettings.font === font.value 
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xl' 
                    : 'bg-white text-neutral-400 border-neutral-50 hover:border-neutral-200'
                }`}
                style={{ fontFamily: font.value }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black uppercase tracking-widest">{font.name}</span>
                  {editingAppSettings.font === font.value && <Check size={14} />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette Config */}
        <div className="flex flex-col gap-4 p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Content Colors</span>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <span className="text-[8px] font-black uppercase text-neutral-300 tracking-widest">Main Text</span>
              <input 
                type="color" 
                value={editingAppSettings.textColor || '#000000'}
                onChange={(e) => setEditingAppSettings(prev => ({ ...prev, textColor: e.target.value }))}
                className="w-full h-10 p-1 bg-white border border-neutral-200 rounded-xl cursor-pointer"
              />
            </div>
            <div className="w-[1px] h-10 bg-neutral-200" />
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-mono font-bold tracking-tighter">{(editingAppSettings.textColor || '#000000').toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Share & Publish Section */}
        <div className="flex flex-col gap-4 mt-4 pt-8 border-t border-neutral-100">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Cloud Distribution</span>
          <div className="flex flex-col gap-3">
            <button 
              onClick={generateShareLink}
              disabled={isSharing}
              className="group relative w-full flex items-center justify-center gap-3 px-8 py-6 bg-black text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-2xl active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-white/10 ${isSharing ? 'translate-y-0' : 'translate-y-full'} group-hover:translate-y-0 transition-transform duration-500`} />
              <Share2 size={18} className={`relative z-10 ${isSharing ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              <span className="relative z-10">
                {isSharing ? 'Synchronizing State...' : (activeShareId ? 'Update Online Link' : 'Generate Secure Link')}
              </span>
            </button>
            
            {shareUrl && shareUrl !== 'Syncing to cloud...' && !isUrlTooLarge && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 p-6 bg-white border border-neutral-100 rounded-3xl shadow-xl shadow-black/5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Public Access Link</span>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-neutral-50 px-4 py-3 rounded-xl text-[10px] font-mono border border-neutral-100 overflow-hidden text-ellipsis outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Share link copied to clipboard!');
                    }}
                    className="p-3 bg-neutral-900 text-white rounded-xl hover:bg-black transition-all active:scale-90"
                    title="Copy to Clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="text-[8px] font-medium text-neutral-400 italic">
                  * This link is unique to this portfolio instance.
                </p>
              </motion.div>
            )}

            {isUrlTooLarge && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Data Package Too Large</p>
                <p className="text-[8px] text-red-500 mt-1">Please reduce image sizes or remove some content before sharing.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div 
      className="relative min-h-screen font-sans selection:bg-black selection:text-white overflow-x-hidden scroll-smooth"
      style={{ 
        color: appSettings.textColor,
        fontFamily: appSettings.fontFamily
      }}
    >
      {/* Dashboard Modal */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-white/95 backdrop-blur-3xl overflow-y-auto"
          >
            <div className="max-w-6xl mx-auto px-6 py-20 min-h-screen">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-16 gap-8">
                <div className="space-y-4 text-center sm:text-left">
                  <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none">Your Artifacts</h2>
                  <p className="text-neutral-400 font-bold uppercase text-[10px] sm:text-xs tracking-[0.4em] px-1">Manage and duplicate your portfolio instances</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => createPortfolio()}
                    className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-xl active:scale-95"
                  >
                    <Plus size={18} />
                    New Portfolio
                  </button>
                  <button 
                    onClick={() => setShowDashboard(false)}
                    className="p-4 bg-gray-50 text-black rounded-2xl hover:bg-gray-100 transition-all shadow-sm active:scale-95"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {portfolios.map((portfolio) => (
                  <motion.div
                    key={portfolio.id}
                    layoutId={portfolio.id}
                    className={`group relative bg-white border-2 rounded-3xl p-8 transition-all hover:shadow-2xl hover:-translate-y-2 ${
                      currentPortfolioId === portfolio.id ? 'border-black shadow-xl ring-4 ring-black/5' : 'border-neutral-100 shadow-sm hover:border-black/20'
                    }`}
                  >
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-neutral-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                          <Book size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const p = portfolios.find(item => item.id === portfolio.id);
                            if (p) {
                              generateShareLink(p.id, p.data);
                            }
                          }}
                          className="p-2.5 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                          title="Share Portfolio"
                        >
                          <Share2 size={16} />
                        </button>
                           {!portfolio.isOriginal && (
                             <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(portfolio.id);
                                setRenamingValue(portfolio.name);
                              }}
                              className="p-2.5 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                              title="Rename"
                            >
                              <Pencil size={16} />
                            </button>
                           )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePortfolio(portfolio.id);
                            }}
                            className="p-2.5 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                            title="Duplicate"
                          >
                             <Copy size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowStatusIcons(!showStatusIcons);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${showStatusIcons ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-black hover:bg-neutral-50'}`}
                            title={showStatusIcons ? "Hide Status" : "Show Status"}
                          >
                             {showStatusIcons ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {renamingId === portfolio.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input 
                              autoFocus
                              className="flex-1 bg-neutral-50 border-2 border-black rounded-xl px-4 py-3 text-sm font-black uppercase tracking-tight focus:outline-none"
                              value={renamingValue}
                              onChange={e => setRenamingValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename(portfolio.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                            />
                            <button 
                              onClick={() => handleRename(portfolio.id)} 
                              className="p-3 bg-black text-white rounded-xl hover:bg-neutral-800 transition-all"
                            >
                              <Check size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black uppercase tracking-tight truncate">{portfolio.name}</h3>
                            {portfolio.isOriginal && showStatusIcons && (
                              <span 
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-black text-[9px] text-white font-black rounded-full uppercase tracking-widest flex-shrink-0 flex items-center gap-1.5 select-none"
                              >
                                <Lock size={8} />
                                Original
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-[9px] tracking-widest">
                          <Calendar size={12} />
                          <span>Last Modified: {new Date(portfolio.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center gap-3">
                        {deletingId === portfolio.id ? (
                          <div className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="flex-1 py-4 bg-gray-100 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => deletePortfolio(portfolio.id)}
                              className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <>
                            {currentPortfolioId === portfolio.id ? (
                              <button 
                                onClick={() => setShowDashboard(false)}
                                className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                              >
                                Continue Editing
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  switchPortfolio(portfolio.id);
                                }}
                                className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                              >
                                Edit This Website
                              </button>
                            )}
                            {!portfolio.isOriginal && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(portfolio.id);
                                }}
                                className="p-4 bg-gray-50 text-red-500 rounded-2xl hover:bg-red-50 transition-all hover:text-red-600 active:scale-95"
                                title="Delete Portfolio"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {portfolio.activeShareId && (
                        <div className="pt-4 border-t border-neutral-50">
                          <a 
                            href={`${window.location.origin}${window.location.pathname}?p=${portfolio.activeShareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300 hover:text-black transition-colors"
                          >
                            <ExternalLink size={12} />
                            View Published Live Site
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Dashboard Return Button - Only visible to owner (not in shared view) */}
      {!showDashboard && !isSharedView && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[1002] flex items-center gap-2"
        >
          <button 
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-3xl border border-neutral-100 rounded-2xl shadow-xl hover:bg-neutral-900 hover:text-white transition-all group active:scale-95 border-b-2 border-b-black/5"
          >
            <LayoutDashboard size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</span>
          </button>
          {!isEditing && (
            <button 
              onClick={() => generateShareLink()}
              className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-3xl border border-neutral-100 rounded-2xl shadow-xl hover:bg-black hover:text-white transition-all group active:scale-95 border-b-2 border-b-black/5"
            >
              <Share2 size={16} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Share Link</span>
            </button>
          )}
        </motion.div>
      )}

      {/* GLOBAL BACKGROUND SYSTEM */}
      <div 
        className="fixed inset-0 z-[-3]" 
        style={{ backgroundColor: appSettings.bgColor }}
      />
      
      {appSettings.bgType === 'image' && appSettings.bgImage && (
        <div 
          className="fixed inset-0 z-[-2]" 
          style={{ 
            backgroundImage: `url(${appSettings.bgImage})`,
            opacity: (Number(appSettings.bgOpacity) || 0) / 100,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }} 
        />
      )}

      {/* Content Shield blurs the background and adds a base tint */}
      <div className="fixed inset-0 z-[-1] bg-white/20 backdrop-blur-[2px]" />

      <AnimatePresence mode="wait">
        {isLoadingShared && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-8"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-neutral-100 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-24 h-24 border-t-4 border-black rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-widest animate-pulse">Syncing Cloud Data</h3>
              <p className="text-neutral-400 font-medium uppercase text-[10px] tracking-[0.3em]">Preparing your custom portfolio experience...</p>
            </div>
          </motion.div>
        )}
        {isLoading ? (
          <LoadingScreen 
            key="loader"
            name={coverPageData.heroName || 'Zandel Ragay'} 
            onComplete={() => setIsLoading(false)} 
          />
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
        <AnimatePresence mode="wait">
          {view === 'view1' ? (
          <motion.div 
            key="view1"
            initial={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
          >
            {/* Main Content */}
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15,
                    delayChildren: 0.5
                  }
                }
              }}
              className="max-w-7xl w-full mx-auto text-center space-y-8 py-16 flex-1 pb-60 px-4 sm:px-8"
            >
                {/* Master Control Bar (Only visible when unlocked/editing) */}
                {isEditing && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center mb-12 sticky top-4 z-[1000]"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-2 bg-white/95 backdrop-blur-3xl shadow-[0_30px_100px_-10px_rgba(0,0,0,0.15)] border border-neutral-100 rounded-[1.5rem] sm:rounded-[2.5rem] max-w-[95vw]">
                      {/* Page Selector Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setIsPagesMenuOpen(!isPagesMenuOpen)}
                          className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${isPagesMenuOpen ? 'bg-black text-white' : 'bg-gray-50 text-black hover:bg-gray-100'}`}
                        >
                          <Book size={14} className="sm:w-4 sm:h-4" />
                          <span>Pages</span>
                        </button>

                        <AnimatePresence>
                          {isPagesMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full left-0 mt-2 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[1001]"
                            >
                              <div className="p-2 space-y-1">
                                {SECTIONS.map(s => (
                                  <NavSectionItem
                                    key={s.id}
                                    section={s}
                                    isActive={(currentSection === s.id && view === 'view2') || (s.id === 'title-page' && view === 'view1') || s.subItems?.some(sub => sub.id === currentSection) === true}
                                    customLabel={getSectionState(s.id)?.[2]?.customHeader}
                                    onNavigate={(id) => {
                                      navigateTo(id);
                                      setIsPagesMenuOpen(false);
                                    }}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="w-[1px] h-8 bg-gray-100 mx-0.5 sm:mx-1" />

                      {!isSharedView && (
                        <button 
                          onClick={() => setShowDashboard(true)}
                          className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] bg-gray-50 text-black hover:bg-gray-100 transition-all font-black uppercase tracking-widest text-[10px]"
                        >
                          <LayoutDashboard size={14} />
                          Dashboard
                        </button>
                      )}

                      {!isSharedView && <div className="w-[1px] h-8 bg-gray-100 mx-0.5 sm:mx-1" />}

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button 
                          onClick={handleSave} 
                          className="flex items-center gap-2 p-2 sm:p-4 px-4 sm:px-8 rounded-xl sm:rounded-[1.5rem] bg-neutral-950 text-white hover:bg-black transition-all active:scale-95 shadow-xl shadow-black/10"
                          title="Save All Changes"
                        >
                          <Save size={20} className="sm:w-6 sm:h-6" />
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest hidden xs:inline">Save All</span>
                        </button>
                        
                        <button 
                          onClick={handleCancel} 
                          className="p-2 sm:p-4 rounded-xl sm:rounded-[1.5rem] bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                          title="Discard Changes"
                        >
                          <RotateCcw size={20} className="sm:w-6 sm:h-6" />
                        </button>

                        <button 
                          onClick={generateShareLink}
                          className="p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] bg-gray-50 text-amber-500 hover:bg-amber-100 transition-all active:scale-95"
                          title="Share & Publish"
                        >
                          <Share2 size={20} className="sm:w-6 sm:h-6" />
                        </button>

                        <div className="w-[1px] h-8 bg-gray-100 mx-0.5 sm:mx-1" />
                        
                        {showStatusIcons && (
                          <button 
                            onClick={() => {
                              setIsEditing(false);
                              setHasUnlocked(false);
                            }}
                            className="p-2 sm:p-4 rounded-xl sm:rounded-[1.5rem] bg-gray-50 text-amber-500 hover:bg-amber-50 transition-all active:scale-95"
                            title="Finish Editing"
                          >
                            <Lock size={20} className="sm:w-6 sm:h-6" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

              <SortableContext 
                items={isEditing ? editingData.layoutOrder : titlePageData.layoutOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className={`flex flex-col ${
                  (isEditing ? editingData : titlePageData).alignment === 'left' ? 'items-start text-left'
                  : (isEditing ? editingData : titlePageData).alignment === 'right' ? 'items-end text-right'
                  : 'items-center text-center'
                }`}>
                  {(isEditing ? editingData : titlePageData).layoutOrder.map((itemId) => {
                      const data = isEditing ? editingData : titlePageData;
                      
                      // 1. System Items
                      if (itemId.startsWith('sys-header') && (isEditing || data.showHeaderImage)) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, scale: 0.8, y: 20 },
                                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 15, stiffness: 100 } }
                              }}
                              className="w-full flex flex-col items-center gap-4 py-8 relative group/sys"
                            >
                               {isEditing ? (
                                 <div className="flex flex-col items-center gap-4 w-full px-4 relative z-20">
                                   {editingData.headerImage ? (
                                     <div className="relative group/img">
                                       <img 
                                         src={editingData.headerImage} 
                                         alt="Header" 
                                         className="max-h-[300px] w-full h-auto object-contain shadow-2xl rounded-2xl"
                                       />
                                       <button 
                                         onClick={() => setEditingData({ ...editingData, headerImage: '' })}
                                         className="absolute -top-3 -right-3 p-3 bg-red-500 text-white rounded-full shadow-xl transition-all hover:scale-110"
                                       >
                                         <Trash2 size={20} />
                                       </button>
                                     </div>
                                   ) : (
                                     <div 
                                        onClick={() => headerFileInputRef.current?.click()}
                                        className="w-full max-w-2xl aspect-[3/1] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-black hover:text-black transition-all bg-gray-50/50 cursor-pointer"
                                     >
                                       <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                         <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-black">
                                           <Upload size={18} />
                                         </div>
                                         <div className="space-y-4 w-full">
                                           <div className="text-center">
                                             <p className="font-black text-black uppercase tracking-widest text-[10px]">Header Artifact</p>
                                           </div>
                                           <div className="flex flex-col gap-2">
                                             <button 
                                               onClick={() => headerFileInputRef.current?.click()}
                                               className="w-full py-2 bg-white border border-neutral-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-black hover:bg-neutral-50 transition-all"
                                             >
                                               Select Local File
                                             </button>
                                             <div className="flex gap-1">
                                               <input 
                                                 type="text"
                                                 placeholder="Paste URL..."
                                                 className="flex-1 px-3 py-2 text-[9px] bg-white border border-neutral-100 rounded-lg outline-none focus:border-black transition-all font-sans text-black"
                                                 onKeyDown={(e) => {
                                                   if (e.key === 'Enter') {
                                                     const val = (e.currentTarget as HTMLInputElement).value;
                                                     if (val) setEditingData({ ...editingData, headerImage: val });
                                                   }
                                                 }}
                                               />
                                               <button 
                                                 onClick={(e) => {
                                                   const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                   if (input.value) setEditingData({ ...editingData, headerImage: input.value });
                                                 }}
                                                 className="px-3 py-2 bg-black text-white rounded-lg"
                                               >
                                                 <Link size={12} />
                                               </button>
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   )}
                                   <input 
                                     type="file" 
                                     ref={headerFileInputRef} 
                                     className="hidden" 
                                     accept="image/*" 
                                     onChange={handleHeaderUpload} 
                                   />
                                   <div className="flex items-center gap-6 w-full max-w-md pt-4">
                                     <div className="flex-1 space-y-2">
                                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                          <span>Width: {editingData.headerImageWidth}px</span>
                                       </div>
                                       <input 
                                         type="range" 
                                         min="200" 
                                         max="1200" 
                                         value={editingData.headerImageWidth}
                                         onChange={(e) => setEditingData({ ...editingData, headerImageWidth: parseInt(e.target.value) })}
                                         className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                                       />
                                     </div>
                                                                            <div className="flex flex-col gap-2">
                                        <button onClick={() => duplicateSystemItem(itemId)} className="p-4 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-2xl transition-all" title="Duplicate Header"><Copy size={24} /></button>
                                        <button onClick={() => removeBlock(itemId)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Remove Header"><Trash2 size={24} /></button>
                                      </div>

                                   </div>
                                 </div>
                               ) : (
                                 data.headerImage && (
                                   <img 
                                     src={data.headerImage} 
                                     alt="Header" 
                                     className="max-h-[400px] w-full h-auto object-contain"
                                   />
                                 )
                               )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-title') && (isEditing || data.showTitle)) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
                                show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
                              }}
                              className="w-full relative group/sys"
                            >
                                {isEditing ? (
                                  <div className="flex items-center gap-4 relative z-20">
                                    <input
                                      className={`block w-full text-[clamp(1.5rem,7vw,4rem)] sm:text-[clamp(2rem,10vw,6rem)] font-black font-display border-b-4 border-gray-50 focus:border-black outline-none pb-4 bg-transparent uppercase tracking-tighter leading-[0.9] text-black ${
                                        editingData.alignment === 'left' ? 'text-left' : editingData.alignment === 'right' ? 'text-right' : 'text-center'
                                      }`}
                                      value={editingData.title}
                                      onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                                      placeholder="PROJECT TITLE"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => duplicateSystemItem(itemId)} className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all" title="Duplicate Title"><Copy size={24} /></button>
                                        <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Title"><Trash2 size={24} /></button>
                                    </div>
                                  </div>
                                ) : (
                  <h1 className={`text-[clamp(1.8rem,9.5vw,7.5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight text-black w-full px-2 sm:px-4 break-words ${
                    data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'
                  }`}>
                    {String(data.title).includes('[object Object]') ? DEFAULT_TITLE_DATA.title : data.title}
                  </h1>
                                )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-subtitle') && (isEditing || data.showSubtitle)) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 20 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.1 } }
                              }}
                              className="w-full relative group/sys"
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-4">
                                  <input
                                    className={`block w-full text-base sm:text-2xl md:text-3xl text-black border-b-2 border-gray-50 focus:border-black outline-none bg-transparent font-medium pb-2 ${
                                      editingData.alignment === 'left' ? 'text-left' : editingData.alignment === 'right' ? 'text-right' : 'text-center'
                                    }`}
                                    value={editingData.subtitle}
                                    onChange={(e) => setEditingData({ ...editingData, subtitle: e.target.value })}
                                    placeholder="In TLE 10"
                                  />
                                  <button onClick={() => duplicateSystemItem(itemId)} className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all" title="Duplicate Subtitle"><Copy size={20} /></button>
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Subtitle"><Trash2 size={20} /></button>
                                </div>
                              ) : (
                                <p className="text-sm sm:text-lg md:text-2xl text-black font-medium leading-tight text-balance px-4 opacity-80 uppercase tracking-widest whitespace-pre-wrap">
                                  {data.subtitle}
                                </p>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-desc') && (isEditing || data.showDescription)) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 20 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2 } }
                              }}
                              className="w-full pt-2 sm:pt-4 relative group/sys"
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-4">
                                  <input
                                    className={`block w-full text-[10px] sm:text-xl md:text-2xl text-black border-b-2 border-gray-50 focus:border-black outline-none bg-transparent uppercase tracking-[0.1em] sm:tracking-[0.2em] font-black ${
                                      editingData.alignment === 'left' ? 'text-left' : editingData.alignment === 'right' ? 'text-right' : 'text-center'
                                    }`}
                                    value={editingData.description}
                                    onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                                  />
                                  <button onClick={() => duplicateSystemItem(itemId)} className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all" title="Duplicate Element"><Copy size={16} /></button>
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Meta"><Trash2 size={16} /></button>
                                </div>
                              ) : (
                                <p className="text-[9px] sm:text-base md:text-xl text-black tracking-[0.1em] sm:tracking-[0.2em] uppercase font-black leading-tight text-balance px-4 opacity-70 whitespace-pre-wrap">
                                  {data.description}
                                </p>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-divider')) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, scaleX: 0 },
                                show: { opacity: 1, scaleX: 1, transition: { duration: 1.2, ease: "circOut" } }
                              }}
                              className="relative group/sys py-4 sm:py-8 w-full"
                            >
                              <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-black mx-auto rounded-full shadow-sm mb-4 sm:mb-8" />
                              {isEditing && (
                                <div className="absolute -top-12 right-0 flex items-center gap-2">
                                  <button onClick={() => duplicateSystemItem(itemId)} className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all" title="Duplicate Divider"><Copy size={16} /></button>
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                </div>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-student') && (isEditing || (data.showSubmittedByLabel || data.showStudentName))) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 30 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                              }}
                               className="space-y-3 sm:space-y-6 w-full py-4 relative group/sys"
                            >
                               {(isEditing || data.showSubmittedByLabel) && (
                                 isEditing ? (
                                   <input 
                                     className="text-center font-black tracking-[0.3em] uppercase opacity-60 bg-transparent border-b border-gray-100 outline-none focus:border-black text-[8px] sm:text-[10px] w-full"
                                     value={editingData.submittedByLabel}
                                     onChange={(e) => setEditingData({ ...editingData, submittedByLabel: e.target.value })}
                                   />
                                 ) : (
                                   <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.6em] text-black uppercase opacity-60">{data.submittedByLabel}</h3>
                                 )
                               )}
                              <div className="space-y-2 sm:space-y-6">
                                {isEditing ? (
                                  <div className="flex items-center gap-4 max-w-2xl mx-auto px-4 relative z-20">
                                    <div className="flex-1 space-y-4 sm:space-y-8">
                                      <input
                                        placeholder="Student Name"
                                        className="block w-full text-base sm:text-xl md:text-2xl text-center font-black border-b-4 border-gray-50 focus:border-black outline-none bg-transparent tracking-tighter text-black"
                                        value={editingData.studentName}
                                        onChange={(e) => setEditingData({ ...editingData, studentName: e.target.value })}
                                      />
                                      <input
                                        placeholder="Course / Year / Section"
                                        className="block w-full text-[9px] text-center border-b-2 border-gray-50 focus:border-black outline-none bg-transparent sm:text-base font-bold uppercase tracking-widest text-black"
                                        value={editingData.courseYearSection}
                                        onChange={(e) => setEditingData({ ...editingData, courseYearSection: e.target.value })}
                                      />
                                    </div>
                                   <div className="flex flex-col gap-2">
                                        <button onClick={() => duplicateSystemItem(itemId)} className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all" title="Duplicate Element"><Copy size={24} /></button>
                                        <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Student Info"><Trash2 size={24} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-4">
                                    {data.showStudentName && <p className="text-[clamp(1rem,5vw,2rem)] sm:text-lg md:text-3xl font-black tracking-tighter break-words text-black mb-1 leading-tight whitespace-pre-wrap">{String(data.studentName).includes('[object Object]') ? 'Student Name' : data.studentName}</p>}
                                    {data.showCourseYearSection && <p className="text-[8px] uppercase tracking-[0.1em] sm:tracking-[0.15em] sm:text-xs font-black mt-1 text-black opacity-60 whitespace-pre-wrap">{String(data.courseYearSection).includes('[object Object]') ? 'Course / Year / Section' : data.courseYearSection}</p>}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-professor') && (isEditing || (data.showSubmittedToLabel || data.showProfessorName))) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 30 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                              }}
                              className="space-y-3 sm:space-y-6 w-full py-4 relative group/sys pt-8 sm:pt-12"
                            >
                               {(isEditing || data.showSubmittedToLabel) && (
                                 <div className="w-12 h-[2px] bg-black/10 mx-auto mb-4" />
                               )}
                               {(isEditing || data.showSubmittedToLabel) && (
                                isEditing ? (
                                  <input 
                                    className="text-center font-black tracking-[0.3em] uppercase opacity-60 bg-transparent border-b border-gray-100 outline-none focus:border-black text-[8px] sm:text-[10px] w-full"
                                    value={editingData.submittedToLabel}
                                    onChange={(e) => setEditingData({ ...editingData, submittedToLabel: e.target.value })}
                                  />
                                ) : (
                                  <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.6em] text-black uppercase opacity-60">{data.submittedToLabel}</h3>
                                )
                              )}
                              {isEditing ? (
                                <div className="flex items-center gap-4 max-w-2xl mx-auto px-4 relative z-20">
                                  <input
                                    className="block w-full text-base sm:text-xl md:text-2xl text-center font-black border-b-4 border-gray-50 focus:border-black outline-none bg-transparent tracking-tighter flex-1 text-black"
                                    value={editingData.professorName}
                                    onChange={(e) => setEditingData({ ...editingData, professorName: e.target.value })}
                                  />
                                  <div className="flex flex-col gap-2">
                                    <button onClick={() => duplicateSystemItem(itemId)} className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all" title="Duplicate Element"><Copy size={24} /></button>
                                    <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Professor"><Trash2 size={24} /></button>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4">
                                  {data.showProfessorName && <p className="text-[clamp(0.9rem,4.5vw,1.8rem)] sm:text-lg md:text-2xl font-black tracking-tighter break-words text-black leading-tight whitespace-pre-wrap">{String(data.professorName).includes('[object Object]') ? "Professor's Name" : data.professorName}</p>}
                                </div>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId.startsWith('sys-ay') && (isEditing || data.showAcademicYear)) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 30 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                              }}
                              className="pt-4 sm:pt-8 w-full relative group/sys"
                            >
                               {isEditing ? (
                                <div className="space-y-4">
                                  <input 
                                    className="text-center font-black tracking-[0.3em] uppercase opacity-60 bg-transparent border-b border-gray-100 outline-none focus:border-black text-[8px] sm:text-[10px] w-full"
                                    value={editingData.academicYearLabel}
                                    onChange={(e) => setEditingData({ ...editingData, academicYearLabel: e.target.value })}
                                  />
                                  <div className="flex items-center gap-4 max-w-md mx-auto">
                                    <input
                                      className="block w-full text-center text-black border-b-2 border-gray-50 focus:border-black outline-none bg-transparent font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-base flex-1"
                                      value={editingData.academicYear}
                                      onChange={(e) => setEditingData({ ...editingData, academicYear: e.target.value })}
                                    />
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => duplicateSystemItem(itemId)} className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all" title="Duplicate Element"><Copy size={16} /></button>
                                        <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Year"><Trash2 size={16} /></button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-black font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] md:tracking-[0.5em] text-[9px] sm:text-sm opacity-70">
                                  {data.academicYearLabel} {String(data.academicYear).includes('[object Object]') ? '2023-2024' : data.academicYear}
                                </p>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      // 2. Custom Block Items
                      const block = data.blocks.find(b => b.id === itemId);
                      if (block) {
                        return (
                          <SortableBlock 
                            key={block.id} 
                            block={block} 
                            editMode={isEditing} 
                            onUpdate={updateBlock}
                            onRemove={removeBlock}
                            onDuplicate={duplicateBlock}
                            imgbbKey={editingAppSettings.imgbbKey}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
              </SortableContext>

              {!isEditing && (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 100 },
                    show: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut", delay: 1.2 } }
                  }}
                  className="pt-20 sm:pt-40 pb-20 sm:pb-40 flex flex-col items-center gap-12"
                >
                    <motion.button
                      id="open-portfolio-btn"
                      whileHover={{ scale: 1.05, y: -8 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={openPortfolio}
                      className="group relative inline-flex items-center gap-3 sm:gap-8 px-6 sm:px-20 py-4 sm:py-10 bg-black text-white text-sm sm:text-2xl font-black rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] hover:shadow-black/30 transition-all uppercase tracking-[0.1em] sm:tracking-[0.4em] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative z-10">Unveil Journey</span>
                      <ChevronRight size={28} strokeWidth={4} className="group-hover:translate-x-3 transition-transform w-[24px] h-[24px] sm:w-[28px] sm:h-[28px]" />
                    </motion.button>

                    {showStatusIcons && !isSharedView && !showPasswordModal && (
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="p-5 bg-white shadow-xl rounded-full hover:bg-black hover:text-white transition-all active:scale-95 group border border-gray-100 flex items-center justify-center aspect-square"
                        title="Unlock to Edit All Content"
                      >
                        <Lock size={26} className="group-hover:scale-110 transition-transform text-black/50 group-hover:text-white/80" />
                      </button>
                    )}
                    {showStatusIcons && !isSharedView && showPasswordModal && (
                      <motion.form 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onSubmit={handlePasswordSubmit}
                        className="flex items-center gap-3 bg-white p-2 pl-6 shadow-2xl rounded-full border border-black/5"
                      >
                        <input
                          autoFocus
                          type="password"
                          placeholder="Admin Password"
                          className="bg-transparent outline-none text-black font-bold tracking-widest w-32 placeholder:text-gray-300 text-sm"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="bg-black text-white p-3 px-6 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all"
                        >
                          Unlock
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordModal(false);
                            setPasswordInput('');
                          }}
                          className="p-3 pr-4 text-gray-400 hover:text-black transition-all"
                        >
                          <X size={18} />
                        </button>
                      </motion.form>
                    )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="view2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen"
          >
            <header className="fixed top-0 left-0 w-full h-16 sm:h-28 bg-white/80 backdrop-blur-3xl flex items-center justify-between px-3 sm:px-10 md:px-16 z-[1001] border-b border-gray-100/50">
              <div className="flex items-center gap-2 sm:gap-6">
                <button
                  id="hamburger-btn"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 sm:p-4 rounded-2xl hover:bg-gray-50 text-black transition-all active:scale-95 group relative"
                  aria-label="Access Nav"
                >
                  <Menu size={20} className="sm:w-[32px] sm:h-[32px]" />
                </button>
                <div className="flex flex-col max-w-[100px] sm:max-w-none">
                  <span className="font-black text-sm sm:text-2xl tracking-tighter uppercase leading-none truncate">{coverPageData.heroName.replace('.', '')}</span>
                  <span className="text-[7px] sm:text-[9px] font-black text-black uppercase tracking-widest mt-0.5 sm:mt-1 opacity-40 hidden xs:block">Reflections</span>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-4">
                {isEditing && (
                  <div className="relative mr-1 sm:mr-2">
                    <button
                      onClick={() => setIsPagesMenuOpen(!isPagesMenuOpen)}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${isPagesMenuOpen ? 'bg-black text-white' : 'bg-gray-50 text-black shadow-sm'}`}
                    >
                      <Book size={12} className="sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Pages</span>
                    </button>

                    <AnimatePresence>
                      {isPagesMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 mt-3 w-44 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[1100]"
                        >
                          <div className="p-2 space-y-1">
                            {SECTIONS.map(s => (
                              <NavSectionItem
                                key={s.id}
                                section={s}
                                isActive={currentSection === s.id || s.subItems?.some(sub => sub.id === currentSection) === true}
                                onNavigate={(id) => {
                                  navigateTo(id);
                                  setIsPagesMenuOpen(false);
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Redundant Alignment Toggle removed in favor of Sidebar */}


                {/* Redundant Save/Cancel Buttons removed in favor of Sidebar */}

                
                <div className="w-[1px] h-8 sm:h-10 bg-gray-100 mx-1 sm:mx-2" />

                <button 
                  onClick={() => navigateTo('title-page')}
                  className="p-3 sm:p-4 rounded-full sm:rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-black transition-all"
                  title="Return to Hall"
                >
                  <X size={20} className="sm:w-[24px] sm:h-[24px]" />
                </button>
              </div>
            </header>

            <main className={`flex-1 pt-16 sm:pt-28 overflow-x-hidden ${currentSection === 'cover-page' ? '' : 'max-w-6xl mx-auto w-full px-4 sm:px-10 md:px-20 pb-20 sm:pb-32'}`}>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentSection}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <SortableContext 
                    items={(isEditing ? 
                      (getSectionState(currentSection)?.[2] as any)?.blocks 
                      : (getSectionState(currentSection)?.[0] as any)?.blocks
                    )?.map((b: any) => b.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                {currentSection === 'cover-page' ? (
                  <AcademicCoverPage 
                    data={isEditing ? editingAcademicCoverData : academicCoverData}
                    isEditing={isEditing}
                    onUpdate={(updates) => setEditingAcademicCoverData(prev => ({ ...prev, ...updates }))}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                    onDuplicateBlock={duplicateBlock}
                    onDuplicateSystem={duplicateSystemItem}
                    imgbbKey={isEditing ? editingAppSettings.imgbbKey : appSettings.imgbbKey}
                  />
                ) : (
                  <div className={`max-w-4xl mx-auto px-6 py-20 space-y-12 animate-in fade-in duration-700 flex flex-col ${
                    (isEditing ? (getSectionState(currentSection)?.[2] as any) : (getSectionState(currentSection)?.[0] as any))?.alignment === 'left' ? 'items-start text-left'
                    : (isEditing ? (getSectionState(currentSection)?.[2] as any) : (getSectionState(currentSection)?.[0] as any))?.alignment === 'right' ? 'items-end text-right'
                    : 'items-center text-center'
                  }`}>
                    {(isEditing ? (getSectionState(currentSection)?.[2] as any)?.layoutOrder : (getSectionState(currentSection)?.[0] as any)?.layoutOrder)?.map((itemId: string, index: number) => {
                      const data = isEditing ? (getSectionState(currentSection)?.[2] as any) : (getSectionState(currentSection)?.[0] as any);
                      if (!data) return null;

                      const isEven = index % 2 === 0;

                      if (itemId.startsWith('sys-header')) {
                         const sectionLabel = SECTIONS.find(s => s.id === currentSection)?.label.replace(/^\d+\.\s*/, '') || 
                         SECTIONS.flatMap(s => s.subItems || []).find(sub => sub.id === currentSection)?.label;
                         
                         return (
                          <motion.div
                            key={itemId}
                            initial={{ opacity: 0, x: isEven ? -80 : 80 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full"
                          >
                            <SortableItem id={itemId} editMode={isEditing}>
                              <div className="space-y-6 w-full relative group/sys z-10">
                                {isEditing ? (
                                    <input
                                      className={`w-full bg-transparent border-b-2 border-dashed border-gray-200 outline-none text-[clamp(1.5rem,7.5vw,5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight focus:border-black transition-all ${
                                        data.alignment === 'left' ? 'text-left' 
                                        : data.alignment === 'right' ? 'text-right' 
                                        : 'text-center'
                                      }`}
                                      value={data.customHeader === undefined ? sectionLabel : data.customHeader}
                                      onChange={(e) => {
                                        const state = getSectionState(currentSection);
                                        if (state) state[3](prev => ({ ...prev, customHeader: e.target.value }));
                                      }}
                                      placeholder={sectionLabel || ''}
                                    />
                                ) : (
                                  <h1 className={`text-[clamp(1.5rem,7.5vw,5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight w-full px-2 sm:px-4 ${
                                    data.alignment === 'left' ? 'text-left' 
                                    : data.alignment === 'right' ? 'text-right' 
                                    : 'text-center'
                                  }`}>
                                    {data.customHeader || sectionLabel}
                                  </h1>
                                )}
                                {isEditing && (
                                  <div className="absolute -top-12 right-0 flex items-center gap-2 z-20">
                                    <button 
                                      onClick={() => duplicateSystemItem(itemId)}
                                      className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all"
                                      title="Duplicate Element"
                                    >
                                      <Copy size={24} />
                                    </button>
                                    <button 
                                      onClick={() => removeBlock(itemId)}
                                      className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={24} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          </motion.div>
                        );
                      }

                      if (itemId.startsWith('sys-divider')) {
                        return (
                          <motion.div
                            key={itemId}
                            initial={{ scaleX: 0, opacity: 0 }}
                            whileInView={{ scaleX: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="w-full flex-col items-center flex"
                          >
                            <SortableItem id={itemId} editMode={isEditing}>
                              <div className="relative group/sys w-full flex flex-col items-center py-4 sm:py-8 transition-all">
                                <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-black rounded-full shadow-sm" />
                                {isEditing && (
                                  <div className="absolute -top-12 right-0 flex items-center gap-2 transition-all">
                                    <button 
                                      onClick={() => duplicateSystemItem(itemId)}
                                      className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-lg transition-all"
                                      title="Duplicate Element"
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button 
                                      onClick={() => removeBlock(itemId)}
                                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          </motion.div>
                        );
                      }

                      if (itemId.startsWith('sys-content')) {
                         return (
                          <motion.div
                            key={itemId}
                            initial={{ opacity: 0, x: isEven ? 80 : -80 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                            className="w-full"
                          >
                            <SortableItem id={itemId} editMode={isEditing}>
                              <div className="max-w-3xl mx-auto w-full relative group/sys z-10">
                                  {isEditing ? (
                                    <div className="flex gap-4 relative z-20">
                                      <textarea
                                        className={`w-full p-6 sm:p-10 text-xl sm:text-2xl md:text-3xl text-black font-medium leading-relaxed border-2 border-dashed border-gray-200 rounded-[2rem] sm:rounded-[3rem] focus:border-black focus:bg-white outline-none bg-transparent resize-none italic transition-all ${
                                          data.alignment === 'left' ? 'text-left'
                                          : data.alignment === 'right' ? 'text-right'
                                          : 'text-center'
                                        }`}
                                        value={data.content}
                                        onChange={(e) => {
                                          const state = getSectionState(currentSection);
                                          if (state) state[3](prev => ({ ...prev, content: e.target.value }));
                                        }}
                                        rows={8}
                                      />
                                    <div className="flex gap-2">
                                        <button onClick={() => duplicateSystemItem(itemId)} className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-xl transition-all" title="Duplicate Element"><Copy size={24} /></button>
                                        <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Element"><Trash2 size={24} /></button>
                                      </div>
                                    </div>
                                  ) : (
                                  <p className={`text-lg sm:text-2xl md:text-4xl text-black font-medium leading-relaxed italic px-4 sm:px-12 break-words w-full mx-auto max-w-4xl tracking-tight whitespace-pre-wrap ${
                                    data.alignment === 'left' ? 'text-left'
                                    : data.alignment === 'right' ? 'text-right'
                                    : 'text-center sm:text-justify'
                                  }`}>
                                    {data.content}
                                  </p>
                                )}
                              </div>
                            </SortableItem>
                          </motion.div>
                        );
                      }

                      const block = data.blocks?.find((b: any) => b.id === itemId);
                      if (block) {
                        return (
                          <motion.div
                            key={block.id}
                            initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full"
                          >
                            <SortableBlock 
                              block={block} 
                              editMode={isEditing} 
                              onUpdate={updateBlock} 
                              onRemove={removeBlock} 
                              onDuplicate={duplicateBlock}
                              imgbbKey={editingAppSettings.imgbbKey}
                            />
                          </motion.div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                )}
              </SortableContext>
                </motion.div>
              </AnimatePresence>
            </main>

            <AnimatePresence>
              {isSidebarOpen && (
                <>
                  <motion.div
                    id="sidebar-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[100]"
                  />
                  <motion.div
                    id="sidebar"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 35, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 w-full max-w-[450px] bg-white shadow-[50px_0_100px_rgba(0,0,0,0.2)] z-[101] flex flex-col"
                  >
                    <div className="h-28 flex items-center justify-between px-12 border-b border-gray-50 bg-gray-50/50">
                      <div className="flex flex-col">
                        <span className="font-display font-black text-4xl uppercase tracking-tighter leading-none">Journal</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mt-2 italic">Curated Experience</span>
                      </div>
                      <button
                        id="close-sidebar-btn"
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-4 rounded-full bg-white shadow-xl text-black transition-all hover:bg-red-50 hover:text-red-500 border border-gray-100"
                      >
                        <X size={28} />
                      </button>
                    </div>
                    <nav className="flex-1 overflow-y-auto py-12 px-8 space-y-3">
                      {SECTIONS.map((section) => (
                        <NavSectionItem
                          key={section.id}
                          section={section}
                          isActive={currentSection === section.id || section.subItems?.some(sub => sub.id === currentSection) === true}
                          customLabel={getSectionState(section.id)?.[2]?.customHeader}
                          onNavigate={(id) => {
                            navigateTo(id);
                            setIsSidebarOpen(false);
                          }}
                          isSidebar={true}
                        />
                      ))}
                    </nav>
                    <div className="p-12 border-t border-gray-50 text-center">
                      <p className="text-[10px] font-black text-black uppercase tracking-[0.6em] opacity-30">zandel ragay portfolio @ 2026</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <DragOverlay dropAnimation={{
        ...defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeId ? (
          <div className="bg-white/80 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100 rounded-[3rem] p-10 cursor-grabbing opacity-80 scale-105 border-4 border-black border-dashed z-[1000]">
              <span className="font-black uppercase tracking-widest text-xs">Relocating Component...</span>
          </div>
        ) : null}
      </DragOverlay>

      {/* Redesigned Edit Sidebar */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-black/5 sm:hidden z-[1000]"
            />
            
            <motion.aside
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[85vw] sm:w-[420px] bg-white/95 backdrop-blur-3xl shadow-[30px_0_100px_rgba(0,0,0,0.15)] z-[1001] flex flex-col border-r border-neutral-100 overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="p-8 sm:p-10 flex flex-col gap-8 border-b border-neutral-50 bg-neutral-50/20">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Editor</h2>
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-3">Studio Interface</p>
                  </div>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="p-4 bg-white shadow-sm border border-neutral-100 rounded-[1.5rem] hover:bg-neutral-900 hover:text-white transition-all group"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
                
                {showStatusIcons && (
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setHasUnlocked(false);
                    }}
                    className="w-full flex items-center justify-center gap-4 py-5 bg-amber-50 text-amber-600 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
                    title="Lock Editor"
                  >
                    <Lock size={18} />
                    Lock All Content
                  </button>
                )}
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto px-8 sm:px-10 py-12 space-y-12">
                {/* Save/Discard Actions */}
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleSave}
                    className="flex items-center justify-center gap-3 px-6 py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Save size={18} />
                    Save All Changes
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-3 px-6 py-6 bg-neutral-50 text-neutral-400 border border-neutral-100 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <RotateCcw size={18} />
                    Reset to Default
                  </button>
                </div>

                {/* Blocks Area */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Components</span>
                    <div className="flex-1 h-[1px] bg-neutral-100 ml-6" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => addBlock('text')}
                      className="w-full h-20 bg-neutral-50 rounded-[1.5rem] flex items-center px-8 gap-6 hover:bg-neutral-900 hover:text-white transition-all group border border-transparent hover:border-neutral-800"
                    >
                      <Type size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Text Block</span>
                    </button>
                    <button 
                      onClick={() => addBlock('image')}
                      className="w-full h-20 bg-neutral-50 rounded-[1.5rem] flex items-center px-8 gap-6 hover:bg-neutral-900 hover:text-white transition-all group border border-transparent hover:border-neutral-800"
                    >
                      <ImageIcon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Image Block</span>
                    </button>
                    <button 
                      onClick={() => addBlock('video')}
                      className="w-full h-20 bg-neutral-50 rounded-[1.5rem] flex items-center px-8 gap-6 hover:bg-neutral-900 hover:text-white transition-all group border border-transparent hover:border-neutral-800"
                    >
                      <Video size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Video Block</span>
                    </button>
                  </div>
                </div>

                {/* Specific Section Controls */}
                {view === 'view1' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Title Page UI</span>
                      <div className="flex-1 h-[1px] bg-neutral-100 ml-6" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <VisibilityToggle field="showHeaderImage" label="Header Logo" />
                       <VisibilityToggle field="showTitle" label="Main Title" />
                       <VisibilityToggle field="showSubtitle" label="Meta Details" />
                       <VisibilityToggle field="showDescription" label="Course Info" />
                       <VisibilityToggle field="showSubmittedByLabel" label="Submitted By Label" />
                       <VisibilityToggle field="showStudentName" label="Student Name" />
                       <VisibilityToggle field="showSubmittedToLabel" label="Submitted To Label" />
                       <VisibilityToggle field="showProfessorName" label="Professor Name" />
                       <VisibilityToggle field="showAcademicYear" label="Academic Year" />
                    </div>
                    {['sys-header', 'sys-title', 'sys-subtitle', 'sys-desc', 'sys-divider', 'sys-student', 'sys-professor', 'sys-ay'].some(id => !editingData.layoutOrder.includes(id)) && (
                      <button 
                        onClick={() => {
                          const systemOrder = ['sys-header', 'sys-title', 'sys-subtitle', 'sys-desc', 'sys-divider', 'sys-student', 'sys-professor', 'sys-ay'];
                          const currentOrder = [...editingData.layoutOrder];
                          systemOrder.forEach((sysId) => {
                            if (!currentOrder.includes(sysId)) currentOrder.push(sysId);
                          });
                          setEditingData({ ...editingData, layoutOrder: currentOrder });
                        }}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-amber-50 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all"
                      >
                        <RotateCw size={14} />
                        Restore System Elements
                      </button>
                    )}
                  </div>
                )}

                {currentSection === 'cover-page' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Cover Page UI</span>
                      <div className="flex-1 h-[1px] bg-neutral-100 ml-6" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setEditingAcademicCoverData(prev => ({ ...prev, showLabel: !prev.showLabel }))}
                        className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          editingAcademicCoverData.showLabel ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-400'
                        }`}
                      >
                        {editingAcademicCoverData.showLabel ? '✓' : '○'} Toggle Label
                      </button>
                      <button 
                        onClick={() => setEditingAcademicCoverData(prev => ({ ...prev, showHeading: !prev.showHeading }))}
                        className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          editingAcademicCoverData.showHeading ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-400'
                        }`}
                      >
                         {editingAcademicCoverData.showHeading ? '✓' : '○'} Toggle Heading
                      </button>
                      <button 
                        onClick={() => setEditingAcademicCoverData(prev => ({ ...prev, showParagraph1: !prev.showParagraph1 }))}
                        className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          editingAcademicCoverData.showParagraph1 ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-400'
                        }`}
                      >
                         {editingAcademicCoverData.showParagraph1 ? '✓' : '○'} Toggle Intro
                      </button>
                    </div>
                  </div>
                )}

                {/* Global Styling */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Global Style</span>
                    <div className="flex-1 h-[1px] bg-neutral-100 ml-6" />
                  </div>
                  
                    <div className="space-y-6">

                      <div className="flex flex-col gap-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Alignment</span>
                      <div className="flex flex-col bg-neutral-50 rounded-2xl p-2 gap-2">
                        {(['left', 'center', 'right'] as const).map(align => {
                          const state = getSectionState(currentSection);
                          const currentAlignment = currentSection === 'title-page' ? editingData.alignment
                                                  : currentSection === 'cover-page' ? editingAcademicCoverData.alignment
                                                  : state ? (state[2] as any).alignment
                                                  : 'center';

                          return (
                            <button
                              key={align}
                              onClick={() => {
                                if (currentSection === 'title-page') setEditingData(prev => ({ ...prev, alignment: align }));
                                else if (currentSection === 'cover-page') setEditingAcademicCoverData(prev => ({ ...prev, alignment: align }));
                                else if (state) state[3](prev => ({ ...prev, alignment: align }));
                              }}
                              className={`w-full flex items-center justify-between px-6 py-4 rounded-xl transition-all ${
                                currentAlignment === align
                                  ? 'bg-black text-white shadow-lg'
                                  : 'bg-white text-neutral-400 hover:text-black border border-neutral-100'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <AlignmentIcon alignment={align} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{align}</span>
                              </div>
                              {currentAlignment === align && <Check size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <BackgroundSettings />
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-8 sm:p-10 border-t border-neutral-50 bg-neutral-50/10 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-neutral-300 italic">Unlocking Creative Potential</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

    </DndContext>
          </motion.div>
        )}
      </AnimatePresence>      {/* Redesigned Share Modal */}
      <AnimatePresence>
        {isSharing && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSharing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl bg-neutral-900 rounded-[3rem] shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] overflow-hidden border border-white/5"
            >
              <div className="grid lg:grid-cols-2">
                {/* Left Side: Celebration / Info */}
                <div className="p-12 sm:p-20 bg-white space-y-12 flex flex-col justify-between border-r border-neutral-100">
                  <div className="space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-neutral-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        Cloud Synchronized
                      </div>
                      <button 
                        onClick={() => setIsSharing(false)}
                        className="p-3 hover:bg-neutral-50 rounded-2xl transition-all text-neutral-300 hover:text-black"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-6xl sm:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-black">
                        Link<br/>Created.
                      </h3>
                      <p className="text-base font-medium text-neutral-400 uppercase tracking-widest max-w-sm leading-relaxed">
                        Your professional digital artifact is now ready for global viewing.
                      </p>
                    </div>
                  </div>

                  <div className="pt-12 border-t border-neutral-50 space-y-4">
                    <div className="flex items-center gap-4 text-neutral-300">
                      <Globe size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Public Access Enabled</span>
                    </div>
                    <div className="flex items-center gap-4 text-neutral-300">
                      <Check size={18} className="text-green-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mobile Optimized Rendering</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Copy Link UI */}
                <div className="p-12 sm:p-20 bg-neutral-900 flex flex-col justify-center space-y-12">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-4">Direct Share URL</label>
                        <div className="group relative">
                          <div className="absolute inset-0 bg-white/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                          <div className="relative p-8 bg-neutral-800 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden min-h-[140px] flex items-center">
                            <p id="share-url-text" className="text-white font-mono text-sm leading-relaxed break-all relative z-10 w-full line-clamp-3">
                              {shareUrl === 'Syncing to cloud...' ? (
                                <span className="animate-pulse opacity-50 italic">Drafting unique identifier...</span>
                              ) : shareUrl}
                            </p>
                          </div>
                        </div>
                      </div>

                        {/* Warning removed as requested */}
                   </div>

                   <div className="space-y-6">
                      <button 
                        onClick={copyToClipboard}
                        disabled={shareUrl === 'Syncing to cloud...'}
                        className={`w-full py-10 rounded-[2.5rem] font-black uppercase tracking-[0.4em] transition-all duration-500 flex flex-col items-center justify-center gap-4 shadow-2xl disabled:opacity-50 disabled:cursor-wait ${
                          hasCopied 
                            ? 'bg-green-500 text-white ring-8 ring-green-500/20' 
                            : 'bg-white text-black hover:bg-neutral-200 hover:scale-[0.98]'
                        }`}
                      >
                        {hasCopied ? (
                          <>
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                              <Check size={48} strokeWidth={4} />
                            </motion.div>
                            <span className="text-base">Successfully Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={48} strokeWidth={2.5} />
                            <span className="text-base">Copy Link</span>
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20">
                          Expires: <span className="text-white/40">Never (Cloud Permanent)</span>
                        </p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="bg-black/40 px-12 py-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Zandel Ragay Portfolio Engine v3.0</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Secure Data Pipeline</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Immutable Snapshot</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
