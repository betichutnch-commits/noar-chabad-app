import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode; // הוספנו את זה כדי למנוע את השגיאה
}

export const Input = ({ label, error, icon, className = '', ...props }: InputProps) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">{label}</label>}
      
      <div className="relative">
        {/* אם הועבר אייקון, נציג אותו */}
        {icon && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 pointer-events-none">
                {icon}
            </div>
        )}
        
        <input 
          className={`w-full h-[60px] rounded-xl border outline-none font-bold text-sm transition-all
          ${icon ? 'pr-12 pl-4' : 'px-4'} /* ריווח אוטומטי לאייקון */
          ${error 
            ? 'border-red-200 bg-red-50 text-red-600 placeholder-red-300' 
            : 'bg-white border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] text-[#263238]'
          } ${className}`}
          {...props}
        />
      </div>
      
      {error && <p className="text-xs text-red-500 font-bold mt-1 mr-1">{error}</p>}
    </div>
  );
};