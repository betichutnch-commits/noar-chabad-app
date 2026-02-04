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
  
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-[#00BCD4] hover:bg-cyan-600 text-white shadow-lg shadow-cyan-100 hover:shadow-cyan-200",
    secondary: "bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-lg shadow-green-100 hover:shadow-green-200",
    dark: "bg-gray-800 hover:bg-gray-900 text-white shadow-lg",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    outline: "bg-transparent border-2 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 p-2",
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