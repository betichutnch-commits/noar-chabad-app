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
          <label className="block text-xs font-bold text-text-secondary mb-1.5 mr-1">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            dir="rtl" // מכריח כיוון עברית
            className={`
              w-full bg-surface-muted text-text-primary text-sm font-bold placeholder:text-text-muted placeholder:font-normal
              border border-border-subtle rounded-xl py-3.5 outline-none transition-all
              focus:bg-white focus:border-brand-pink focus:ring-4 focus:ring-pink-50
              disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary
              ${icon ? 'pr-10 pl-4' : 'px-4'} 
              ${error ? '!border-red-300 !bg-red-50 focus:!ring-red-50' : ''}
              ${className}
            `}
            {...props}
          />
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-pink transition-colors pointer-events-none">
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