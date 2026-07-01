import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Shield, Mail, Lock, Github } from 'lucide-react';
import FloatingInput from '../../components/FloatingInput';

import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // user snapshot will trigger redirect from context or App
      navigate('/dashboard/student');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Email and password mismatched');
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError('');
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'github') await signInWithGithub();
      navigate('/dashboard/student');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4 relative"
    >
      <Link to="/" className="flex absolute top-4 left-4 md:top-6 md:left-6 items-center gap-1.5 md:gap-2 text-gray-400 hover:text-white transition-colors z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left w-4 h-4 md:w-5 md:h-5"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        <span className="text-xs md:text-sm font-medium">Back</span>
      </Link>
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <Link to="/auth/admin-login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-full font-bold text-[10px] md:text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 md:gap-2">
          <Shield className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Admin Portal</span>
        </Link>
      </div>
      <div className="max-w-sm w-full bg-[#111827] rounded-2xl md:rounded-3xl border border-white/10 p-5 md:p-8 shadow-2xl backdrop-blur-xl mt-6 md:mt-0">
        <div className="text-center mb-5 md:mb-10">
          <h1 className="text-xl md:text-3xl font-black mb-1 md:mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-[10px] md:text-sm text-gray-400">Sign in to continue your preparation</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
          <FloatingInput 
            label="Email Address" 
            icon={Mail} 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder=""
          />
          <FloatingInput 
            label="Password" 
            icon={Lock} 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder=""
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 md:py-3.5 rounded-xl transition-all active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 mt-1 md:mt-2 shadow-lg hover:shadow-indigo-500/25 text-sm md:text-base"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 md:my-8 flex items-center">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500">Or continue with</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        <div className="flex flex-col gap-2.5 md:gap-3">
          <button disabled={loading} onClick={() => handleSocialLogin('github')} className="flex items-center justify-center gap-2.5 py-2.5 md:py-3 bg-[#0969da] hover:bg-[#0052a3] disabled:opacity-50 text-white rounded-lg transition-all active:scale-[0.98] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 font-medium text-xs md:text-sm">
            <Github className="w-4 h-4 md:w-5 md:h-5" /> {loading ? 'Please wait...' : 'Continue with GitHub'}
          </button>
          <button disabled={loading} onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2.5 py-2.5 md:py-3 bg-[#2D2D2D] border border-white/5 disabled:opacity-50 hover:bg-[#3D3D3D] text-[#D1D5DB] rounded-lg transition-all active:scale-[0.98] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 font-medium text-xs md:text-sm">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Please wait...' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account? <Link to="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1">Sign up</Link>
        </p>
      </div>
    </motion.div>
  );
}
