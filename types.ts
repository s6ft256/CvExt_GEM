
export interface JobRequirements {
  minExperience: number;
  requiredSkills: string[];
  certifications: {
    nebosh: boolean;
    level6: boolean;
    adosh: boolean;
  };
  natureOfExperience: string[];
}

export type HSEDesignation = 'HSE/Safety Inspector' | 'HSE/Safety Officer' | 'HSE/Safety Engineer' | 'HSE/Safety Manager' | 'Not Qualified';

export interface ExtractionResult {
  fullName: string;
  email: string;
  phone: string;
  technicalSkills: string[];
  yearsOfExperience: number;
  highestDegree: string;
  hasNebosh: boolean;
  hasLevel6: boolean; // This includes NVQ level 6, OTHM, NEBOSH Diploma
  hasAdosh: boolean;
  natureOfExperienceFound: string[];
  summary: string;
}

export interface CandidateResult extends ExtractionResult {
  id: string;
  fileName: string;
  matchScore: number;
  designation: HSEDesignation;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}
