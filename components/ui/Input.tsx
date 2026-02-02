"use client";

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = ({ label, error, icon, type, className = '', ...props }: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  
  // בדיקה האם זה שדה סיסמה
  const isPasswordField = type === 'password';
  
  // קביעת הסוג הסופי (טקסט או סיסמה)
  const inputType = isPasswordField 
    ? (showPassword ? 'text' : 'password') 
    : type;

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">{label}</label>}
      
      <div className="relative">
        {/* אייקון רגיל (אם הועבר) - בצד ימין */}
        {icon && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 pointer-events-none">
                {icon}
            </div>
        )}
        
        <input 
          type={inputType}
          className={`w-full h-[60px] rounded-xl border outline-none font-bold text-sm transition-all
          ${icon ? 'pr-12' : 'pr-4'} /* ריווח לימין אם יש אייקון */
          ${isPasswordField ? 'pl-12' : 'pl-4'} /* ריווח לשמאל אם זו סיסמה */
          ${error 
            ? 'border-red-200 bg-red-50 text-red-600 placeholder-red-300' 
            : 'bg-white border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] text-[#263238]'
          } ${className}`}
          {...props}
        />

        {/* כפתור עין לסיסמה - בצד שמאל */}
        {isPasswordField && (
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                // התיקון כאן: hover:text-[#E91E63] (ורוד)
                className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400 hover:text-[#E91E63] transition-colors focus:outline-none"
                tabIndex={-1}
            >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        )}
      </div>
      
      {error && <p className="text-xs text-red-500 font-bold mt-1 mr-1">{error}</p>}
    </div>
  );
};