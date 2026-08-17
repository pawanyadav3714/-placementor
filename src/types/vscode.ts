import { Timestamp } from "firebase/firestore";

export type ProgrammingLanguage = 
  | "c" 
  | "cpp" 
  | "java" 
  | "python" 
  | "javascript" 
  | "typescript" 
  | "go" 
  | "rust";

export interface SavedQuestion {
  id: string;
  userId: string;
  title: string;
  question: string;
  language: ProgrammingLanguage;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
  createdAt: Timestamp;
  isPinned?: boolean;
  isFavorite?: boolean;
  code?: string;
  solution?: {
    explanation: string;
    algorithm: string;
    code: string;
    complexity: string;
    sampleInput: string;
    sampleOutput: string;
    edgeCases: string;
  };
}

export interface TerminalOutput {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: number;
}
