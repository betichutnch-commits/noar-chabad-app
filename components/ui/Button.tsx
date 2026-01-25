import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'dark';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) => {
  
  // Base: גובה 60px (או padding תואם), פינות עגולות מאוד, פונט מודגש
  const baseStyles = "relative flex items-center justify-center gap-2 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed h-[60px]";
  
  const variants = {
    primary: "bg-brand-cyan hover:bg-[#00ACC1] text-white shadow-lg shadow-cyan-100 text-lg",
    secondary: "bg-brand-green hover:bg-[#7CB342] text-white shadow-lg shadow-green-100 text-lg",
    danger: "bg-brand-pink hover:bg-[#D81B60] text-white shadow-lg shadow-pink-100",
    dark: "bg-brand-dark hover:bg-black text-white shadow-lg",
    outline: "bg-white border-2 border-brand-pink text-brand-pink hover:bg-pink-50",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-500 h-auto py-2" // Ghost לא חייב להיות ענק
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};