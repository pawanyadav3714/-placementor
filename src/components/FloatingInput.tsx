import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FloatingInputProps {
  label: string;
  icon: LucideIcon;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export default function FloatingInput({ label, icon: Icon, type, value, onChange, placeholder }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = type === 'password';
  const currentType = isPassword && showPassword ? 'text' : type;
  
  const active = focused || value.length > 0;

  return (
    <div className="relative">
      <div 
        className={`absolute left-3 px-1.5 gap-1.5 flex items-center transition-all duration-200 pointer-events-none z-10
          ${active 
            ? '-top-2.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-[#111827]' 
            : 'top-2.5 md:top-3.5 text-xs font-bold uppercase tracking-widest text-gray-500 bg-transparent'}`}
      >
        <Icon className={active ? "w-3 h-3" : "w-4 h-4"} />
        {label}
      </div>
      <input
        type={currentType}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        placeholder={focused ? placeholder : ''}
        className={`w-full bg-[#0A0F1E] rounded-xl px-4 py-2.5 md:py-3.5 text-sm text-white focus:outline-none transition-all duration-200 border 
          ${focused ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/10 hover:border-white/20'}`}
      />
      {isPassword && (
         <button 
           type="button"
           onClick={() => setShowPassword(!showPassword)}
           className="absolute right-4 top-2.5 md:top-3.5 text-gray-500 hover:text-white transition-colors z-10 cursor-pointer"
         >
           {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
         </button>
      )}
    </div>
  );
}
