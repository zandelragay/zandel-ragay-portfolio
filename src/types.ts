export type SectionId = 
  | 'title-page'
  | 'cover-page'
  | 'acknowledgment'
  | 'dedication'
  | 'personal-philosophy'
  | 'cv'
  | 'achievements'
  | 'seminars'
  | 'department-background'
  | 'premises'
  | 'logo'
  | 'intro-history'
  | 'mission-vision'
  | 'org-structure'
  | 'subject-teachers'
  | 'subjects-taught'
  | 'message-teachers'
  | 'subject-inclusions'
  | 'quizzes'
  | 'activities'
  | 'lesson-plan'
  | 'instructional-materials'
  | 'appendices'
  | 'extracurricular'
  | 'evidence';

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  alignment: 'left' | 'center' | 'right';
  pillars?: PillarCard[];
}

export interface PillarCard {
  title: string;
  description: string;
}

export interface CoverPageSectionData {
  label: string;
  showLabel?: boolean;
  heading: string;
  showHeading?: boolean;
  paragraph1: string;
  showParagraph1?: boolean;
  paragraph2: string;
  pillars: [PillarCard, PillarCard, PillarCard, PillarCard];
  blocks: ContentBlock[];
  layoutOrder: string[];
  alignment?: 'left' | 'center' | 'right';
}

export interface BasicSectionData {
  content: string;
  blocks: ContentBlock[];
  layoutOrder: string[];
  alignment?: 'left' | 'center' | 'right';
}

export interface CoverPageData {
  heroMedia: {
    type: 'image' | 'spline' | 'url';
    url: string;
  };
  heroName: string;
  aboutMeTitle: string;
  aboutMeContent: string;
  projects: {
    id: string;
    title: string;
    media: {
      type: 'image' | 'spline' | 'url';
      url: string;
    };
  }[];
}

export interface TitlePageData {
  headerImage: string;
  showHeaderImage: boolean;
  headerImageWidth: number;
  title: string;
  showTitle: boolean;
  subtitle: string;
  showSubtitle: boolean;
  description: string;
  showDescription: boolean;
  studentName: string;
  showStudentName: boolean;
  courseYearSection: string;
  showCourseYearSection: boolean;
  professorName: string;
  showProfessorName: boolean;
  academicYear: string;
  showAcademicYear: boolean;
  submittedByLabel: string;
  showSubmittedByLabel: boolean;
  submittedToLabel: string;
  showSubmittedToLabel: boolean;
  academicYearLabel: string;
  blocks: ContentBlock[];
  layoutOrder: string[]; // Track order of all pieces: title, subtitle, desc, student, professor, ay, and all custom block IDs
  alignment?: 'left' | 'center' | 'right';
}

export interface Section {
  id: SectionId;
  label: string;
  subItems?: { id: SectionId; label: string }[];
}

export interface AppSettings {
  bgColor: string;
  bgImage: string;
  bgType: 'color' | 'image';
  fontFamily: string;
  textColor: string;
  bgOpacity: number;
  imgbbKey?: string;
}

export const SECTIONS: Section[] = [
  { id: 'title-page', label: '1. Title Page' },
  { id: 'cover-page', label: '2. Cover Page' },
  { id: 'acknowledgment', label: '4. Acknowledgment' },
  { id: 'dedication', label: '5. Dedication' },
  { id: 'personal-philosophy', label: '6. Personal Educational Philosophy' },
  { id: 'cv', label: '7. Curriculum Vitae' },
  { id: 'achievements', label: '8. Achievements and Accomplishments' },
  { id: 'seminars', label: '9. Seminars Attended' },
  { 
    id: 'department-background', 
    label: '10. Department Background',
    subItems: [
      { id: 'premises', label: 'Premises' },
      { id: 'logo', label: 'Logo' },
      { id: 'intro-history', label: 'Introduction/History of the College' },
      { id: 'mission-vision', label: 'Institutional Mission, Vision, and Core Values' },
      { id: 'org-structure', label: 'Organizational Structure' }
    ]
  },
  { 
    id: 'subject-teachers', 
    label: '11. Subject Teachers',
    subItems: [
      { id: 'subjects-taught', label: 'Subjects Taught' },
      { id: 'message-teachers', label: 'Message to Each Teacher' }
    ]
  },
  { 
    id: 'subject-inclusions', 
    label: '12. Subject Inclusions',
    subItems: [
      { id: 'quizzes', label: 'Quizzes' },
      { id: 'activities', label: 'Activities' },
      { id: 'lesson-plan', label: 'Lesson Plan' },
      { id: 'instructional-materials', label: 'Instructional Materials' }
    ]
  },
  { 
    id: 'appendices', 
    label: '13. Appendices',
    subItems: [
      { id: 'extracurricular', label: 'Extracurricular Activities' },
      { id: 'evidence', label: 'Evidence (labeled pictures)' }
    ]
  },
];
