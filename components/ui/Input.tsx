"use client";

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

// שים לב: כאן כתוב export const ולא export default
export const Input = ({ label, error, icon, type, className = '', readOnly, ...props }: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const isPasswordField = type === 'password';
  
  const inputType = isPasswordField 
    ? (showPassword ? 'text' : 'password') 
    : type;

  return (
    <div className="w-full">
      {label && <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 mr-1">{label}</label>}
      
      <div className="relative">
        {icon && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 pointer-events-none">
                {/* Casting כדי למנוע שגיאות TS */}
                {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
            </div>
        )}
        
        <input 
          type={inputType}
          readOnly={readOnly}
          className={`w-full h-[50px] md:h-[60px] rounded-xl border outline-none font-bold text-sm transition-all
          ${icon ? 'pr-12' : 'pr-4'} pl-4
          ${isPasswordField ? 'pl-12' : ''}
          ${readOnly 
            ? 'bg-gray-50 text-gray-500 border-transparent cursor-not-allowed' 
            : error 
              ? 'border-red-200 bg-red-50 text-red-600 placeholder-red-300' 
              : 'bg-white border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] text-[#263238]'
          } ${className}`}
          {...props}
        />

        {isPasswordField && (
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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