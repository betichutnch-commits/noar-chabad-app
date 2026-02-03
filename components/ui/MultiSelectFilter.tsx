"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  color?: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const MultiSelectFilter = ({ options, selected, onChange }: MultiSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const clearSelection = () => {
    onChange([]); 
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return 'הכל';
    if (selected.length === 1) {
        const item = options.find(o => o.id === selected[0]);
        // בטלפון נקצר טקסט אם הוא ארוך מידי
        return item ? (item.label.length > 15 ? item.label.substring(0,12)+'...' : item.label) : '1 נבחר';
    }
    return `${selected.length} נבחרו`;
  };

  return (
    <div className="relative w-full md:w-auto md:min-w-[160px]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3 pr-4 py-3 bg-white border rounded-2xl text-sm font-bold outline-none transition-all shadow-sm
        ${isOpen ? 'border-[#00BCD4] ring-4 ring-cyan-50' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <span className="text-gray-600 truncate">{getDisplayText()}</span>
        <Filter size={16} className={`text-gray-400 shrink-0 ${selected.length > 0 ? 'text-[#00BCD4]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full md:w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn p-2 md:left-auto md:right-0">
          
          <div 
            onClick={clearSelection}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected.length === 0 ? 'bg-[#00BCD4] border-[#00BCD4]' : 'border-gray-300'}`}>
                {selected.length === 0 && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm font-bold text-gray-700">הכל</span>
          </div>

          <div className="h-px bg-gray-100 my-1 mx-2"></div>

          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {options.map((option) => {
               const isSelected = selected.includes(option.id);
               return (
                <div 
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#00BCD4] border-[#00BCD4]' : 'border-gray-300'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-hidden">
                        {option.color && <div className={`w-2 h-2 rounded-full shrink-0 ${option.color}`}></div>}
                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>
                            {option.label}
                        </span>
                    </div>
                </div>
               );
            })}
          </div>
        </div>
      )}
    </div>
  );
};