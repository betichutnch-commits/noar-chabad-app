import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            dir="rtl" // מכריח כיוון עברית
            className={`
              w-full bg-gray-50 text-gray-800 text-sm font-bold placeholder:text-gray-300 placeholder:font-normal
              border border-gray-200 rounded-xl py-3.5 outline-none transition-all
              focus:bg-white focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50
              disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500
              ${icon ? 'pr-10 pl-4' : 'px-4'} 
              ${error ? '!border-red-300 !bg-red-50 focus:!ring-red-50' : ''}
              ${className}
            `}
            {...props}
          />
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E91E63] transition-colors pointer-events-none">
              {icon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1 mr-1 font-bold">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";