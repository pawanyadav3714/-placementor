
export interface MCQQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  topic: string;
  company?: string;
}

export interface QuizAttempt {
  id?: string;
  userId: string;
  companyId?: string;
  date: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped: number;
  accuracy: number;
  percentage: number;
  performanceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  details: {
    questionId: string;
    studentAnswer: string;
    isCorrect: boolean;
  }[];
}
