import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  isLoading = false, 
  icon,
  disabled,
  ...props 
}) => {
  
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-4 focus:ring-pink-100";
  
  const variants = {
    primary: "bg-brand-cyan hover:bg-cyan-600 text-white shadow-lg shadow-cyan-100 hover:shadow-cyan-200",
    secondary: "bg-brand-green hover:bg-[#7CB342] text-white shadow-lg shadow-green-100 hover:shadow-green-200",
    dark: "bg-gray-800 hover:bg-gray-900 text-white shadow-lg",
    danger: "bg-state-danger-bg text-state-danger border border-red-100 hover:bg-red-100",
    outline: "bg-transparent border-2 border-border-subtle text-text-secondary hover:border-border-strong hover:bg-surface-muted",
    ghost: "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary p-2",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 size={18} className="animate-spin absolute" />}
      <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {icon}
        {children}
      </span>
    </button>
  );
};