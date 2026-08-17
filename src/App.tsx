import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import MockInterviewSession from './pages/interview/MockInterviewSession';
import InterviewHistory from './pages/interview/InterviewHistory';
import DsaWorkspace from './pages/dsa/DsaWorkspace';
import CompanyPrep from './pages/dsa/CompanyPrep';
import ResumeUpload from './pages/resume/ResumeUpload';
import TestWorkspace from './pages/tests/TestWorkspace';
import Roadmaps from './pages/roadmaps/Roadmaps';
import VsCodeWorkspace from './pages/dashboard/VsCodeWorkspace';

import CompanyWorkspace from './pages/dsa/CompanyWorkspace';

// Admin imports
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminTestPapers from './pages/admin/AdminTestPapers';
import AdminPlacement from './pages/admin/AdminPlacement';
import AdminCompanyManagement from './pages/admin/AdminCompanyManagement';

import AdminLogin from './pages/auth/AdminLogin';

// A simple PrivateRoute wrapper
const PrivateRoute = ({ children, roles }: { children: ReactNode, roles?: string[] }) => {
  const { user, profile, loading, error } = useAuth();
  
  // DEMO Admin Bypass
  const isDemoAdmin = localStorage.getItem('demo_admin_bypass') === 'true';
  const isGoingToAdmin = roles?.includes('admin');
  
  if (error && !isDemoAdmin) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B0F1A] text-white p-6">
        <div className="max-w-md w-full bg-[#151921] border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4">Connection Blocked</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-3">
            <a 
              href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=juniors-resources"
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
            >
              Enable Firestore API
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="block w-full py-3 px-4 bg-[#1A1F26] hover:bg-[#252A33] rounded-xl font-medium transition-colors border border-white/5"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !isDemoAdmin) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user && !isDemoAdmin) return <Navigate to="/" replace />;
  if (roles && profile && !roles.includes(profile.role) && !isDemoAdmin) return <Navigate to="/dashboard/student" replace />; // or to their default
  if (!isGoingToAdmin && isDemoAdmin) return <Navigate to="/dashboard/admin" replace />;
  
  return <>{children}</>;
};

function AppRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/admin-login" element={<AdminLogin />} />
        
        <Route path="/dashboard/student" element={<PrivateRoute roles={['student']}><StudentDashboard /></PrivateRoute>} />
        <Route path="/companies" element={<PrivateRoute roles={['student']}><CompanyPrep /></PrivateRoute>} />
        <Route path="/companies/:company" element={<PrivateRoute roles={['student']}><CompanyWorkspace /></PrivateRoute>} />
        <Route path="/tests" element={<PrivateRoute roles={['student', 'admin']}><TestWorkspace /></PrivateRoute>} />
        
        <Route path="/code/:problemId" element={<PrivateRoute roles={['student']}><DsaWorkspace /></PrivateRoute>} />
        <Route path="/interview/session" element={<PrivateRoute roles={['student']}><MockInterviewSession /></PrivateRoute>} />
        <Route path="/interview/history" element={<PrivateRoute roles={['student']}><InterviewHistory /></PrivateRoute>} />
        <Route path="/resume" element={<PrivateRoute roles={['student']}><ResumeUpload /></PrivateRoute>} />
        <Route path="/roadmaps" element={<PrivateRoute roles={['student']}><Roadmaps /></PrivateRoute>} />
        <Route path="/vscode" element={<PrivateRoute roles={['student']}><VsCodeWorkspace /></PrivateRoute>} />
        
        {/* Admin Routes */}
        <Route path="/dashboard/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/questions" element={<PrivateRoute roles={['admin']}><AdminQuestions /></PrivateRoute>} />
        <Route path="/admin/tests" element={<PrivateRoute roles={['admin']}><AdminTestPapers /></PrivateRoute>} />
        <Route path="/admin/placement" element={<PrivateRoute roles={['admin']}><AdminPlacement /></PrivateRoute>} />
        <Route path="/admin/placement/:company" element={<PrivateRoute roles={['admin']}><AdminCompanyManagement /></PrivateRoute>} />
        
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
