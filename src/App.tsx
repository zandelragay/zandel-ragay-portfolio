import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Pencil, Save, RotateCcw, ChevronRight, 
  Type, Image as ImageIcon, Video, Trash2, 
  AlignLeft, AlignCenter, AlignRight, Eye, EyeOff, Plus,
  GripVertical, Upload, Book, Star, GraduationCap, Lock, Unlock
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
import { SectionId, TitlePageData, CoverPageData, CoverPageSectionData, SECTIONS, ContentBlock, BasicSectionData } from './types';

const STORAGE_KEY = 'portfolio_title_page_data_v3';
const COVER_STORAGE_KEY = 'portfolio_cover_page_data_v1';
const NEW_COVER_SECTION_KEY = 'coverPageData';

const DEFAULT_ACADEMIC_COVER: CoverPageSectionData = {
  label: 'COVER PAGE',
  heading: 'A Journey in Teaching & Technology',
  paragraph1: 'Teaching in the 21st century requires a delicate balance of traditional pedagogies and modern technological tools. As I embarked on this journey through TLE 10, I discovered that true mastery comes not just from knowing the content, but from understanding how to communicate it effectively to diverse learners. This e-portfolio serves as a digital chronicle of my growth, aspirations, and the creative projects that have shaped my path as a future educator in human-centric technology.',
  paragraph2: 'The course Technology for Teaching and Learning 2 (TTL 2) presented significant challenges that pushed me beyond my comfort zone. From designing interactive modules to integrating complex multimedia artifacts, each hurdle became a stepping stone. These experiences have instilled in me a deeper appreciation for the transformative power of educational technology when applied with purpose and empathy.',
  pillars: [
    { title: 'Reflection', description: 'Thinking deeply about my teaching and learning experiences' },
    { title: 'Practice', description: 'Applying theories and strategies in real classroom settings' },
    { title: 'Growth', description: 'Continuous improvement as a future educator' },
    { title: 'Service', description: 'Contributing to the community and learners' }
  ],
  blocks: [],
  layoutOrder: ['sys-label', 'sys-heading', 'sys-divider', 'sys-p1', 'sys-p2', 'sys-pillars'],
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
  showSubmittedByLabel: true,
  showSubmittedToLabel: true,
  blocks: [],
  layoutOrder: ['sys-title', 'sys-subtitle', 'sys-desc', 'sys-divider', 'sys-student', 'sys-professor', 'sys-ay'],
  alignment: 'center'
};

const AlignmentIcon = ({ alignment }: { alignment: 'left' | 'center' | 'right' }) => {
  if (alignment === 'left') return <AlignLeft size={16} />;
  if (alignment === 'center') return <AlignCenter size={16} />;
  return <AlignRight size={16} />;
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
  onUpdate 
}: { 
  data: CoverPageData; 
  isEditing: boolean;
  onUpdate: (updates: Partial<CoverPageData>) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onUpdate({ heroMedia: { type: 'image' as const, url: reader.result as string } });
      reader.onerror = () => alert("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  const handleProjectUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
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
  onRemoveBlock
}: { 
  data: CoverPageSectionData; 
  isEditing: boolean;
  onUpdate: (updates: Partial<CoverPageSectionData>) => void;
  onUpdateBlock: (id: string, updates: Partial<ContentBlock>) => void;
  onRemoveBlock: (id: string) => void;
}) => {
  return (
    <div className={`relative max-w-4xl mx-auto px-6 py-20 space-y-8 font-sans selection:bg-neutral-100 group/section flex flex-col ${
      data.alignment === 'left' ? 'items-start text-left'
      : data.alignment === 'right' ? 'items-end text-right'
      : 'items-center text-center'
    }`}>
      {data.layoutOrder.map((itemId) => {
        // 1. System Items
        if (itemId === 'sys-label') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
              <div className={`w-full relative group/sys ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      className={`w-full bg-transparent border-b border-neutral-200 outline-none text-xs font-black uppercase tracking-[0.4em] text-black focus:text-black transition-colors ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}
                      value={data.label}
                      onChange={(e) => onUpdate({ label: e.target.value })}
                    />
                    <button 
                      onClick={() => onRemoveBlock(itemId)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black">
                    {data.label}
                  </span>
                )}
              </div>
            </SortableItem>
          );
        }

        if (itemId === 'sys-heading') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
               <div className={`w-full relative group/sys ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                {isEditing ? (
                  <div className="flex items-center gap-4">
                    <input
                      className={`w-full bg-transparent border-b border-neutral-200 outline-none text-3xl sm:text-5xl font-display font-black uppercase focus:not-italic transition-all ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}
                      value={data.heading}
                      onChange={(e) => onUpdate({ heading: e.target.value })}
                    />
                    <button 
                      onClick={() => onRemoveBlock(itemId)}
                      className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <h1 className={`text-[clamp(1.8rem,9vw,7rem)] font-display font-black uppercase text-black tracking-[-0.04em] w-full leading-tight ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-center'}`}>
                    {String(data.heading).includes('[object Object]') ? DEFAULT_ACADEMIC_COVER.heading : data.heading}
                  </h1>
                )}
              </div>
            </SortableItem>
          );
        }

        if (itemId === 'sys-divider') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
              <div className="flex items-center gap-6 w-full max-w-lg mx-auto py-4 relative group/sys">
                <div className="h-[1px] flex-1 bg-neutral-200" />
                <div className="text-neutral-300">
                  <GraduationCap size={24} strokeWidth={1.5} />
                </div>
                <div className="h-[1px] flex-1 bg-neutral-200" />
                {isEditing && (
                  <button 
                    onClick={() => onRemoveBlock(itemId)}
                    className="absolute -right-12 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </SortableItem>
          );
        }

        if (itemId === 'sys-p1') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
              <div className="max-w-2xl mx-auto w-full relative group/sys z-10">
                {isEditing ? (
                  <div className="flex gap-4 relative z-20">
                    <textarea
                      className="w-full bg-neutral-50 p-8 rounded-3xl border border-neutral-100 outline-none text-lg text-black leading-relaxed resize-none focus:bg-white focus:border-neutral-300 transition-all font-sans"
                      value={data.paragraph1}
                      onChange={(e) => onUpdate({ paragraph1: e.target.value })}
                      rows={8}
                    />
                    <button 
                      onClick={() => onRemoveBlock(itemId)}
                      className="self-start p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <p className={`text-base sm:text-lg md:text-xl text-black leading-relaxed sm:leading-[1.8] font-sans px-2 sm:px-0 ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-left sm:text-justify'}`}>
                    <span className="float-left text-6xl sm:text-8xl font-serif mr-4 mt-1 sm:mt-2 h-[60px] sm:h-[80px] leading-[0.8] text-black">
                      {data.paragraph1.charAt(0)}
                    </span>
                    {data.paragraph1.slice(1)}
                  </p>
                )}
              </div>
            </SortableItem>
          );
        }

        if (itemId === 'sys-p2') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
              <div className="max-w-2xl mx-auto w-full relative group/sys z-10">
                {isEditing ? (
                  <div className="flex gap-4 relative z-20">
                    <textarea
                      className="w-full bg-neutral-50 p-8 rounded-3xl border border-neutral-100 outline-none text-lg text-black leading-relaxed resize-none focus:bg-white focus:border-neutral-300 transition-all font-sans"
                      value={data.paragraph2}
                      onChange={(e) => onUpdate({ paragraph2: e.target.value })}
                      rows={6}
                    />
                    <button 
                      onClick={() => onRemoveBlock(itemId)}
                      className="self-start p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <p className={`text-lg text-black leading-[1.8] font-sans opacity-90 decoration-neutral-100 ${data.alignment === 'left' ? 'text-left' : data.alignment === 'right' ? 'text-right' : 'text-left sm:text-justify'}`}>
                    {data.paragraph2}
                  </p>
                )}
              </div>
            </SortableItem>
          );
        }

        if (itemId === 'sys-pillars') {
          return (
            <SortableItem key={itemId} id={itemId} editMode={isEditing}>
              <div className="relative group/sys w-full">
                {isEditing && (
                  <button 
                    onClick={() => onRemoveBlock(itemId)}
                    className="absolute -top-10 right-0 p-3 bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span className="text-[10px] font-black uppercase">Remove Pillars</span>
                  </button>
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
          );
        }

        // 2. Custom Block Items
        const block = data.blocks?.find(b => b.id === itemId);
        if (block) {
          return (
            <SortableBlock 
              key={block.id} 
              block={block} 
              editMode={isEditing} 
              onUpdate={onUpdateBlock}
              onRemove={onRemoveBlock}
            />
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
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white shadow-2xl border border-gray-100 rounded-xl p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button 
            {...attributes} 
            {...listeners}
            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-black"
            title="Drag to reorder"
          >
            <GripVertical size={18} />
          </button>
        </div>
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
  key?: React.Key;
}

function SortableBlock({ block, editMode, onUpdate, onRemove }: SortableBlockProps) {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative w-full ${alignmentClasses} space-y-2 py-4 ${editMode ? 'hover:bg-gray-50/50 rounded-2xl px-4 ring-1 ring-transparent hover:ring-gray-200 transition-all' : ''}`}
    >
      {editMode && (
        <div className="absolute -top-4 right-2 flex items-center gap-1 bg-white shadow-2xl border border-gray-100 rounded-xl p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button 
            {...attributes} 
            {...listeners}
            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-black"
            title="Drag to reorder"
          >
            <GripVertical size={18} />
          </button>
          <div className="w-[1px] h-4 bg-gray-100 mx-1" />
          <button 
            onClick={() => {
              const next: Record<string, 'left' | 'center' | 'right'> = { left: 'center', center: 'right', right: 'left' };
              onUpdate(block.id, { alignment: next[block.alignment] });
            }}
            className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Toggle Alignment"
          >
            <AlignmentIcon alignment={block.alignment} />
          </button>
          <button 
            onClick={() => onRemove(block.id)}
            className="p-1 sm:p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
            title="Remove Block"
          >
            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      )}

      {block.type === 'text' && (
        editMode ? (
          <textarea
            className="w-full p-6 border-2 border-dashed border-gray-200 rounded-2xl focus:border-black focus:bg-white outline-none bg-transparent resize-none text-center transition-all text-xl font-medium placeholder:text-gray-300"
            placeholder="Type your content here..."
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            rows={2}
          />
        ) : (
          <p className="text-black whitespace-pre-wrap text-xl md:text-2xl leading-relaxed font-medium">{block.content}</p>
        )
      )}

      {block.type === 'image' && (
        editMode ? (
          <div className="w-full max-w-2xl">
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
                <div className="text-center space-y-1">
                  <p className="font-black text-black uppercase tracking-widest text-sm">Upload Visual Artifact</p>
                  <p className="text-xs font-medium opacity-60 uppercase tracking-tighter">Drag and drop or click to browse</p>
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
              <div className="relative group/img-preview inline-block max-w-full">
                <img src={block.content} alt="Preview" className="max-w-full h-auto rounded-[2rem] shadow-2xl transition-all" />
                <button 
                  onClick={() => onUpdate(block.id, { content: '' })}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-full shadow-2xl opacity-0 group-hover/img-preview:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        ) : (
          block.content && <img src={block.content} alt="" className="max-w-full h-auto rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]" loading="lazy" />
        )
      )}

      {block.type === 'video' && (
        <div className="w-full max-w-4xl aspect-video bg-gray-50 rounded-[3rem] overflow-hidden shadow-2xl flex items-center justify-center border border-gray-100 group/video relative">
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
            </div>
          ) : (
            getYoutubeId(block.content) ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYoutubeId(block.content)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="text-gray-300 flex flex-col items-center">
                <Video size={80} className="opacity-10" />
                <span className="text-xl font-black mt-4 opacity-20 uppercase tracking-[0.3em]">No Video Loaded</span>
              </div>
            )
          )}
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
  const [editingData, setEditingData] = useState<TitlePageData>(DEFAULT_TITLE_DATA);
  const [editingCoverData, setEditingCoverData] = useState<CoverPageData>(DEFAULT_COVER_DATA);
  const [editingAcademicCoverData, setEditingAcademicCoverData] = useState<CoverPageSectionData>(DEFAULT_ACADEMIC_COVER);
  const [editingAcknowledgement, setEditingAcknowledgement] = useState<BasicSectionData>(DEFAULT_ACKNOWLEDGEMENT);
  const [editingDedication, setEditingDedication] = useState<BasicSectionData>(DEFAULT_DEDICATION);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPagesMenuOpen, setIsPagesMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration for layoutOrder
        if (!parsed.layoutOrder) {
          parsed.layoutOrder = [
            'sys-title', 'sys-subtitle', 'sys-desc', 'sys-divider', 
            'sys-student', 'sys-professor', 'sys-ay',
            ...(parsed.blocks || []).map((b: any) => b.id)
          ];
        }
        const merged = { ...DEFAULT_TITLE_DATA, ...parsed };
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
        
        // Migration for heroMedia
        if (parsed.heroImage !== undefined) {
          parsed.heroMedia = { type: 'image', url: parsed.heroImage };
          delete parsed.heroImage;
        }

        // Migration for project media
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
        const merged = { ...DEFAULT_ACADEMIC_COVER, ...parsed };
        setAcademicCoverData(merged);
        setEditingAcademicCoverData(merged);
      } catch (e) {
        console.error('Failed to parse academic cover data', e);
      }
    }

    const savedAck = localStorage.getItem('portfolio_acknowledgement');
    if (savedAck) {
      try {
        if (savedAck.includes('[object Object]')) throw new Error('Sanitize object string');
        const parsed = JSON.parse(savedAck);
        if (!parsed.layoutOrder) {
          parsed.layoutOrder = ['sys-header', 'sys-divider', 'sys-content', ...(parsed.blocks || []).map((b: any) => b.id)];
        }
        const merged = { ...DEFAULT_ACKNOWLEDGEMENT, ...parsed };
        setAcknowledgement(merged);
        setEditingAcknowledgement(merged);
      } catch (e) {
        setAcknowledgement(DEFAULT_ACKNOWLEDGEMENT);
        setEditingAcknowledgement(DEFAULT_ACKNOWLEDGEMENT);
      }
    }

    const savedDed = localStorage.getItem('portfolio_dedication');
    if (savedDed) {
      try {
        if (savedDed.includes('[object Object]')) throw new Error('Sanitize object string');
        const parsed = JSON.parse(savedDed);
        if (!parsed.layoutOrder) {
          parsed.layoutOrder = ['sys-header', 'sys-divider', 'sys-content', ...(parsed.blocks || []).map((b: any) => b.id)];
        }
        const merged = { ...DEFAULT_DEDICATION, ...parsed };
        setDedication(merged);
        setEditingDedication(merged);
      } catch (e) {
        setDedication(DEFAULT_DEDICATION);
        setEditingDedication(DEFAULT_DEDICATION);
      }
    }
  }, []);

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === '123') {
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
      
      // Save Acknowledgement
      setAcknowledgement(editingAcknowledgement);
      localStorage.setItem('portfolio_acknowledgement', JSON.stringify(editingAcknowledgement));
      
      // Save Dedication
      setDedication(editingDedication);
      localStorage.setItem('portfolio_dedication', JSON.stringify(editingDedication));

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
    setEditingAcknowledgement(acknowledgement);
    setEditingDedication(dedication);
    setEditingCoverData(coverPageData);
    setIsEditing(false);
    setHasUnlocked(false);
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
    } else if (currentSection === 'acknowledgment') {
      setEditingAcknowledgement(prev => ({ 
        ...prev, 
        blocks: [...(prev.blocks || []), newBlock],
        layoutOrder: [...prev.layoutOrder, blockId]
      }));
    } else if (currentSection === 'dedication') {
      setEditingDedication(prev => ({ 
        ...prev, 
        blocks: [...(prev.blocks || []), newBlock],
        layoutOrder: [...prev.layoutOrder, blockId]
      }));
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
    } else if (currentSection === 'acknowledgment') {
      setEditingAcknowledgement(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(b => b.id === id ? { ...b, ...updates } : b)
      }));
    } else if (currentSection === 'dedication') {
      setEditingDedication(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(b => b.id === id ? { ...b, ...updates } : b)
      }));
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
    } else if (currentSection === 'acknowledgment') {
      setEditingAcknowledgement(prev => ({ 
        ...prev, 
        blocks: (prev.blocks || []).filter(b => b.id !== id),
        layoutOrder: prev.layoutOrder.filter(itemId => itemId !== id)
      }));
    } else if (currentSection === 'dedication') {
      setEditingDedication(prev => ({ 
        ...prev, 
        blocks: (prev.blocks || []).filter(b => b.id !== id),
        layoutOrder: prev.layoutOrder.filter(itemId => itemId !== id)
      }));
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
        } else if (currentSection === 'acknowledgment') {
          setEditingAcknowledgement(prev => handleReorder(prev));
        } else if (currentSection === 'dedication') {
          setEditingDedication(prev => handleReorder(prev));
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

  return (
    <div className="relative min-h-screen font-sans selection:bg-black selection:text-white overflow-x-hidden scroll-smooth bg-white">
      <AnimatePresence mode="wait">
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
            className="fixed inset-0 z-50 bg-white flex flex-col p-2 sm:p-4 md:p-8 overflow-y-auto"
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
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      navigateTo(s.id);
                                      setIsPagesMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      (currentSection === s.id && view === 'view2') || (s.id === 'title-page' && view === 'view1')
                                        ? 'bg-black text-white' 
                                        : 'hover:bg-gray-50 text-gray-500'
                                    }`}
                                  >
                                    {s.label}
                                    {(currentSection === s.id && view === 'view2') || (s.id === 'title-page' && view === 'view1') ? <Star size={10} fill="currentColor" /> : null}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="w-[1px] h-8 bg-gray-100 mx-0.5 sm:mx-1" />

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

                        <div className="w-[1px] h-8 bg-gray-100 mx-0.5 sm:mx-1" />

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
                      if (itemId === 'sys-title' && (isEditing || data.showTitle)) {
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
                                    <button onClick={() => removeBlock(itemId)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Remove Title"><Trash2 size={32} /></button>
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

                      if (itemId === 'sys-subtitle' && (isEditing || data.showSubtitle)) {
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
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Subtitle"><Trash2 size={20} /></button>
                                </div>
                              ) : (
                                <p className="text-sm sm:text-lg md:text-2xl text-black font-medium leading-tight text-balance px-4 opacity-80 uppercase tracking-widest">
                                  {data.subtitle}
                                </p>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-desc' && (isEditing || data.showDescription)) {
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
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Meta"><Trash2 size={16} /></button>
                                </div>
                              ) : (
                                <p className="text-[9px] sm:text-base md:text-xl text-black tracking-[0.1em] sm:tracking-[0.2em] uppercase font-black leading-tight text-balance px-4 opacity-70">
                                  {data.description}
                                </p>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-divider') {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, scaleX: 0 },
                                show: { opacity: 1, scaleX: 1, transition: { duration: 1.2, ease: "circOut" } }
                              }}
                              className="relative group/sys py-4 sm:py-8"
                            >
                              <div className="w-20 sm:w-48 h-[3px] sm:h-[6px] bg-black mx-auto rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.1)] mb-4 sm:mb-8" />
                              {isEditing && (
                                <button onClick={() => removeBlock(itemId)} className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-student' && (isEditing || (data.showSubmittedByLabel || data.showStudentName))) {
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
                                <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.6em] text-black uppercase opacity-60">Proffered By</h3>
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
                                    <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Student Info"><Trash2 size={24} /></button>
                                  </div>
                                ) : (
                                  <div className="px-4">
                                    {data.showStudentName && <p className="text-[clamp(1rem,5vw,2rem)] sm:text-lg md:text-3xl font-black tracking-tighter break-words text-black mb-1 leading-tight">{String(data.studentName).includes('[object Object]') ? 'Student Name' : data.studentName}</p>}
                                    {data.showCourseYearSection && <p className="text-[8px] uppercase tracking-[0.1em] sm:tracking-[0.15em] sm:text-xs font-black mt-1 text-black opacity-60">{String(data.courseYearSection).includes('[object Object]') ? 'Course / Year / Section' : data.courseYearSection}</p>}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-professor' && (isEditing || (data.showSubmittedToLabel || data.showProfessorName))) {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <motion.div 
                              variants={{
                                hidden: { opacity: 0, y: 30 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                              }}
                              className="space-y-3 sm:space-y-6 w-full py-4 relative group/sys"
                            >
                              {(isEditing || data.showSubmittedToLabel) && (
                                <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.6em] text-black uppercase opacity-60">Acclaimed By</h3>
                              )}
                              {isEditing ? (
                                <div className="flex items-center gap-4 max-w-2xl mx-auto px-4 relative z-20">
                                  <input
                                    className="block w-full text-base sm:text-xl md:text-2xl text-center font-black border-b-4 border-gray-50 focus:border-black outline-none bg-transparent tracking-tighter flex-1 text-black"
                                    value={editingData.professorName}
                                    onChange={(e) => setEditingData({ ...editingData, professorName: e.target.value })}
                                  />
                                  <button onClick={() => removeBlock(itemId)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Remove Professor"><Trash2 size={24} /></button>
                                </div>
                              ) : (
                                <div className="px-4">
                                  {data.showProfessorName && <p className="text-[clamp(0.9rem,4.5vw,1.8rem)] sm:text-lg md:text-2xl font-black tracking-tighter break-words text-black leading-tight">{String(data.professorName).includes('[object Object]') ? "Professor's Name" : data.professorName}</p>}
                                </div>
                              )}
                            </motion.div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-ay' && (isEditing || data.showAcademicYear)) {
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
                                <div className="flex items-center gap-4 max-w-md mx-auto">
                                  <input
                                    className="block w-full text-center text-black border-b-2 border-gray-50 focus:border-black outline-none bg-transparent font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-base flex-1"
                                    value={editingData.academicYear}
                                    onChange={(e) => setEditingData({ ...editingData, academicYear: e.target.value })}
                                  />
                                  <button onClick={() => removeBlock(itemId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove Year"><Trash2 size={16} /></button>
                                </div>
                              ) : (
                                <p className="text-black font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] md:tracking-[0.5em] text-[9px] sm:text-sm opacity-70">Cycles of {String(data.academicYear).includes('[object Object]') ? '2023-2024' : data.academicYear}</p>
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

                    {!showPasswordModal ? (
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="p-5 bg-white shadow-xl rounded-full hover:bg-black hover:text-white transition-all active:scale-95 group border border-gray-100 flex items-center justify-center aspect-square"
                        title="Unlock to Edit All Content"
                      >
                        <Lock size={26} className="group-hover:scale-110 transition-transform text-black/50 group-hover:text-white/80" />
                      </button>
                    ) : (
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
            className="flex flex-col min-h-screen bg-white"
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
                              <button
                                key={s.id}
                                onClick={() => {
                                  navigateTo(s.id);
                                  setIsPagesMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                  currentSection === s.id ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-500'
                                }`}
                              >
                                {s.label.split(' ')[0]}
                                {currentSection === s.id ? <Star size={10} fill="currentColor" /> : null}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {isEditing && (currentSection === 'title-page' || currentSection === 'cover-page' || currentSection === 'acknowledgment' || currentSection === 'dedication') && (
                  <div className="flex gap-1 p-1 bg-gray-100/50 rounded-2xl mr-2">
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button
                        key={align}
                        onClick={() => {
                          if (currentSection === 'title-page') setEditingData(prev => ({ ...prev, alignment: align }));
                          else if (currentSection === 'cover-page') setEditingAcademicCoverData(prev => ({ ...prev, alignment: align }));
                          else if (currentSection === 'acknowledgment') setEditingAcknowledgement(prev => ({ ...prev, alignment: align }));
                          else if (currentSection === 'dedication') setEditingDedication(prev => ({ ...prev, alignment: align }));
                        }}
                        className={`p-2 rounded-xl transition-all ${
                          (currentSection === 'title-page' ? editingData.alignment
                            : currentSection === 'cover-page' ? editingAcademicCoverData.alignment 
                            : currentSection === 'acknowledgment' ? editingAcknowledgement.alignment 
                            : editingDedication.alignment) === align
                            ? 'bg-white text-black shadow-sm'
                            : 'text-black opacity-40 hover:opacity-100'
                        }`}
                      >
                        <AlignmentIcon alignment={align} />
                      </button>
                    ))}
                  </div>
                )}

                {isEditing && (
                  <div className="flex gap-1 sm:gap-2 p-1 sm:p-1.5 bg-white shadow-xl border border-gray-100 rounded-full sm:rounded-2xl">
                    <button 
                      onClick={handleSave} 
                      className="flex items-center gap-2 p-2 sm:p-3 px-3 sm:px-4 rounded-full sm:rounded-xl bg-neutral-900 text-white hover:bg-black transition-colors"
                      title="Save All"
                    >
                      <Save size={18} className="sm:w-[20px] sm:h-[20px]" />
                      <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline ml-2">Save All</span>
                    </button>
                    <button 
                      onClick={handleCancel} 
                      className="p-2 sm:p-3 rounded-full sm:rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Discard"
                    >
                      <RotateCcw size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setHasUnlocked(false);
                      }}
                      className="p-2 sm:p-3 rounded-full sm:rounded-xl hover:bg-gray-50 text-amber-500"
                      title="Lock Content"
                    >
                      <Lock size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </button>
                  </div>
                )}
                
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
              <SortableContext 
                items={(isEditing ? 
                  (currentSection === 'cover-page' ? editingAcademicCoverData.blocks : currentSection === 'acknowledgment' ? editingAcknowledgement.blocks : editingDedication.blocks) 
                  : (currentSection === 'cover-page' ? academicCoverData.blocks : currentSection === 'acknowledgment' ? acknowledgement.blocks : dedication.blocks)
                )?.map(b => b.id) || []}
                strategy={verticalListSortingStrategy}
              >
                {currentSection === 'cover-page' ? (
                  <AcademicCoverPage 
                    data={isEditing ? editingAcademicCoverData : academicCoverData}
                    isEditing={isEditing}
                    onUpdate={(updates) => setEditingAcademicCoverData(prev => ({ ...prev, ...updates }))}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                  />
                ) : currentSection === 'acknowledgment' || currentSection === 'dedication' ? (
                  <div className={`max-w-4xl mx-auto px-6 py-20 space-y-12 animate-in fade-in duration-700 flex flex-col ${
                    (isEditing ? 
                      (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                      : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                    ) === 'left' ? 'items-start text-left' 
                    : (isEditing ? 
                      (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                      : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                    ) === 'right' ? 'items-end text-right' 
                    : 'items-center text-center'
                  }`}>
                    {(isEditing ? 
                      (currentSection === 'acknowledgment' ? editingAcknowledgement : editingDedication) 
                      : (currentSection === 'acknowledgment' ? acknowledgement : dedication)
                    ).layoutOrder.map((itemId) => {
                      const data = isEditing ? 
                        (currentSection === 'acknowledgment' ? editingAcknowledgement : editingDedication) 
                        : (currentSection === 'acknowledgment' ? acknowledgement : dedication);
                      
                      if (itemId === 'sys-header') {
                         return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <div className="space-y-6 w-full relative group/sys z-10">
                              <h1 className={`text-[clamp(1.5rem,7.5vw,5rem)] font-black font-display uppercase tracking-[-0.04em] leading-tight w-full px-2 sm:px-4 ${
                                (isEditing ? 
                                  (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                                  : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                                ) === 'left' ? 'text-left' 
                                : (isEditing ? 
                                  (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                                  : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                                ) === 'right' ? 'text-right' 
                                : 'text-center'
                              }`}>
                                {currentSection === 'acknowledgment' ? 'Acknowledgment' : 'Dedication'}
                              </h1>
                              {isEditing && (
                                <button 
                                  onClick={() => removeBlock(itemId)}
                                  className="absolute -right-12 top-1/2 -translate-y-1/2 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all z-20"
                                >
                                  <Trash2 size={24} />
                                </button>
                              )}
                            </div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-divider') {
                        return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <div className="relative group/sys w-full">
                              <div className="w-24 h-2 bg-black mx-auto rounded-full my-6" />
                              {isEditing && (
                                <button 
                                  onClick={() => removeBlock(itemId)}
                                  className="absolute -right-12 top-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </SortableItem>
                        );
                      }

                      if (itemId === 'sys-content') {
                         return (
                          <SortableItem key={itemId} id={itemId} editMode={isEditing}>
                            <div className="max-w-3xl mx-auto w-full relative group/sys z-10">
                              {isEditing ? (
                                <div className="flex gap-4 relative z-20">
                                  <textarea
                                    className={`w-full p-6 sm:p-10 text-xl sm:text-2xl md:text-3xl text-black font-medium leading-relaxed border-2 border-dashed border-gray-200 rounded-[2rem] sm:rounded-[3rem] focus:border-black focus:bg-white outline-none bg-transparent resize-none italic transition-all ${
                                      (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) === 'left' ? 'text-left'
                                      : (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) === 'right' ? 'text-right'
                                      : 'text-center'
                                    }`}
                                    value={data.content}
                                    onChange={(e) => {
                                      if (currentSection === 'acknowledgment') setEditingAcknowledgement(prev => ({ ...prev, content: e.target.value }));
                                      else setEditingDedication(prev => ({ ...prev, content: e.target.value }));
                                    }}
                                    rows={8}
                                  />
                                  <button 
                                    onClick={() => removeBlock(itemId)}
                                    className="self-start p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={24} />
                                  </button>
                                </div>
                              ) : (
                                <p className={`text-lg sm:text-2xl md:text-4xl text-black font-medium leading-relaxed italic px-4 sm:px-12 break-words w-full mx-auto max-w-4xl ${
                                  (isEditing ? 
                                    (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                                    : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                                  ) === 'left' ? 'text-left' 
                                  : (isEditing ? 
                                    (currentSection === 'acknowledgment' ? editingAcknowledgement.alignment : editingDedication.alignment) 
                                    : (currentSection === 'acknowledgment' ? acknowledgement.alignment : dedication.alignment)
                                  ) === 'right' ? 'text-right' 
                                  : 'text-center'
                                }`}>
                                  "{String(data.content).includes('[object Object]') ? (currentSection === 'acknowledgment' ? DEFAULT_ACKNOWLEDGEMENT.content : DEFAULT_DEDICATION.content) : data.content}"
                                </p>
                              )}
                            </div>
                          </SortableItem>
                        );
                      }

                      const block = data.blocks?.find(b => b.id === itemId);
                      if (block) {
                        return (
                          <SortableBlock 
                            key={block.id} 
                            block={block} 
                            editMode={isEditing} 
                            onUpdate={updateBlock}
                            onRemove={removeBlock}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
                ) : (
                  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-12 max-w-3xl mx-auto py-20 px-4">
                   <div className="w-40 h-40 rounded-[3.5rem] bg-gray-50 flex items-center justify-center shadow-inner relative overflow-hidden group border border-gray-100">
                      <div className="absolute inset-0 bg-black scale-0 group-hover:scale-100 transition-transform duration-700 rounded-[3.5rem]" />
                      <ChevronRight size={60} className="rotate-90 relative z-10 transition-colors group-hover:text-white" />
                   </div>
                   <div className="space-y-6">
                      <h2 className="text-6xl md:text-8xl font-black font-display leading-[0.9] tracking-[ -0.05em] uppercase">
                        {SECTIONS.find(s => s.id === currentSection)?.label}
                      </h2>
                      <div className="w-24 h-2 bg-black mx-auto rounded-full" />
                   </div>
                   <p className="text-black opacity-40 text-2xl md:text-3xl leading-relaxed font-bold tracking-tight px-4">
                     Artifact curation in progress for <span className="text-black font-black italic">"{SECTIONS.find(s => s.id === currentSection)?.label}"</span>. Please return momentarily.
                   </p>
                   <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl mx-auto pt-8">
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="flex-1 px-12 py-7 rounded-full bg-black text-white font-black hover:bg-gray-800 transition-all active:scale-95 shadow-[0_30px_60px_rgba(0,0,0,0.3)] tracking-[0.2em] text-base uppercase"
                    >
                      Catalogue
                    </button>
                    <button 
                      onClick={() => navigateTo('title-page')}
                      className="flex-1 px-12 py-7 rounded-full border-2 border-black font-black hover:bg-black hover:text-white transition-all active:scale-95 tracking-[0.2em] text-base uppercase"
                    >
                      Home
                    </button>
                   </div>
                </div>
              )}
              </SortableContext>
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
                      {SECTIONS.map((section, idx) => (
                        <button
                          key={section.id}
                          id={`nav-item-${section.id}`}
                          onClick={() => navigateTo(section.id)}
                          className={`w-full text-left px-10 py-6 flex items-center justify-between rounded-[2.5rem] group transition-all duration-500 ${
                            currentSection === section.id
                              ? 'bg-black text-white shadow-[0_30px_60px_rgba(0,0,0,0.3)] scale-[1.03]'
                              : 'hover:bg-gray-50 text-gray-400 hover:text-black'
                          }`}
                        >
                          <div className="flex items-center gap-8">
                            <span className={`text-xs font-black tabular-nums opacity-20 ${currentSection === section.id ? 'text-white' : ''}`}>
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <span className="font-black text-xl md:text-2xl tracking-tighter uppercase">{section.label}</span>
                          </div>
                          <ChevronRight size={20} className={`transition-all duration-500 ${currentSection === section.id ? 'text-white' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-2'}`} />
                        </button>
                      ))}
                    </nav>
                    <div className="p-12 border-t border-gray-50 text-center">
                      <p className="text-[10px] font-black text-black uppercase tracking-[0.6em] opacity-30">Academic Chronicle © 2026</p>
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

      {/* Global Editor Palette when Editing */}
      {isEditing && (
        <div className="fixed bottom-2 sm:bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-neutral-200 rounded-2xl sm:rounded-[2.5rem] p-3 sm:p-8 flex flex-col lg:flex-row items-center gap-3 sm:gap-10 animate-in fade-in slide-in-from-bottom-12 duration-700 w-[98vw] lg:w-auto overflow-y-auto max-h-[50vh]">
          <div className="flex items-center gap-2 sm:gap-4 lg:pr-10 lg:border-r lg:border-gray-100">
              <div className="flex flex-col mr-1 sm:mr-2">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-neutral-300">Blocks</span>
              </div>
              <button 
                onClick={() => addBlock('text')} 
                className="p-2 sm:p-4 bg-neutral-50 hover:bg-black hover:text-white rounded-xl sm:rounded-3xl transition-all shadow-sm border border-neutral-100 active:scale-95" 
                title="Add Typography Block"
              >
                <Type size={18} className="sm:w-6 sm:h-6" />
              </button>
              <button 
                onClick={() => addBlock('image')} 
                className="p-2 sm:p-4 bg-neutral-50 hover:bg-black hover:text-white rounded-xl sm:rounded-3xl transition-all shadow-sm border border-neutral-100 active:scale-95" 
                title="Insert Visual Artifact"
              >
                <ImageIcon size={18} className="sm:w-6 sm:h-6" />
              </button>
              <button 
                onClick={() => addBlock('video')} 
                className="p-2 sm:p-4 bg-neutral-50 hover:bg-black hover:text-white rounded-xl sm:rounded-3xl transition-all shadow-sm border border-neutral-100 active:scale-95" 
                title="Embed Video Link"
              >
                <Video size={18} className="sm:w-6 sm:h-6" />
              </button>
          </div>
          
          {view === 'view1' && (
            <div className="flex flex-col gap-1.5 sm:gap-3 w-full">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-neutral-300 text-center lg:text-left">UI Filters</span>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1 sm:gap-2">
                  <VisibilityToggle field="showTitle" label="Title" />
                  <VisibilityToggle field="showSubtitle" label="Meta" />
                  <VisibilityToggle field="showDescription" label="Course" />
                  <VisibilityToggle field="showSubmittedByLabel" label="By" />
                  <VisibilityToggle field="showStudentName" label="Student" />
                  <VisibilityToggle field="showSubmittedToLabel" label="To" />
                  <VisibilityToggle field="showProfessorName" label="Prof" />
                  <VisibilityToggle field="showAcademicYear" label="A.Y." />
                </div>
            </div>
          )}
        </div>
      )}
    </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
