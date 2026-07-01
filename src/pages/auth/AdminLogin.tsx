import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, CheckCircle2, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingInput from '../../components/FloatingInput';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if an admin has already been set up
    const existingAdmin = localStorage.getItem('admin_email');
    if (!existingAdmin) {
      setIsSetup(true);
    }
  }, []);

  const handleAdminAuth = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    setTimeout(() => {
      if (isSetup) {
        // Registering for the first time
        localStorage.setItem('admin_email', email);
        localStorage.setItem('admin_password', password);
        localStorage.setItem('demo_admin_bypass', 'true');
        setLoading(false);
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard/admin');
        }, 1200);
      } else {
        // Logging in
        const storedEmail = localStorage.getItem('admin_email');
        const storedPassword = localStorage.getItem('admin_password');
        
        if (email === storedEmail && password === storedPassword) {
          localStorage.setItem('demo_admin_bypass', 'true');
          setLoading(false);
          setSuccess(true);
          setTimeout(() => {
            navigate('/dashboard/admin');
          }, 1200);
        } else {
          setError('Invalid administrator credentials.');
          setLoading(false);
        }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4 relative">
      <Link to="/" className="flex absolute top-4 left-4 md:top-6 md:left-6 items-center gap-1.5 md:gap-2 text-gray-400 hover:text-white transition-colors z-10">
        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-xs md:text-sm font-medium">Back</span>
      </Link>
      
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="max-w-sm md:max-w-md w-full bg-[#111827] rounded-2xl md:rounded-3xl border border-emerald-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mt-6 md:mt-0"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-400"></div>
            <div className="text-center mb-5 md:mb-10">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black mb-2 tracking-tight">Admin Portal</h1>
              <p className="text-gray-400">{isSetup ? 'Initial Administrator Setup' : 'Secure access for system administrators'}</p>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 mb-4"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <FloatingInput 
                 label="Admin Email" 
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
                className="w-full relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 md:py-3.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 mt-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] hover:-translate-y-0.5 text-sm md:text-base"
              >
                {loading ? 'Authenticating...' : (isSetup ? 'Setup Administrator' : 'Access System')}
              </button>
              
              {isSetup && (
                <p className="text-center text-xs text-gray-500 mt-6">
                  The first account to register will become the sole administrator.
                </p>
              )}
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="success-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
            >
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
               <CheckCircle2 className="w-10 h-10" />
              </div>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white"
            >
              Access Granted
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-400 font-mono text-sm"
            >
              Redirecting to secure dashboard...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
