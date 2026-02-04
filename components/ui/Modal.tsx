"use client";

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';

type ModalType = 'success' | 'error' | 'info' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, onClose, type = 'info', title, message, onConfirm, 
  confirmText = 'אישור', cancelText = 'ביטול' 
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setShow(true);
        document.body.style.overflow = 'hidden';
    } else {
        const timer = setTimeout(() => setShow(false), 300);
        document.body.style.overflow = 'unset';
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const config = {
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    error:   { icon: AlertCircle, color: 'text-red-500',   bg: 'bg-red-50' },
    confirm: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
    info:    { icon: Info,        color: 'text-[#00BCD4]', bg: 'bg-cyan-50' },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Content */}
      <div className={`relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${config.bg} ${config.color}`}>
                <Icon size={32} strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black text-gray-800 mb-2">
                {title}
            </h3>
            
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6 whitespace-pre-line">
                {message}
            </p>

            <div className="flex gap-3 w-full">
                {onConfirm ? (
                    <>
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            {cancelText}
                        </Button>
                        <Button 
                            variant={type === 'error' || type === 'confirm' ? 'danger' : 'primary'} 
                            onClick={() => { onConfirm(); onClose(); }} 
                            className="flex-1"
                        >
                            {confirmText}
                        </Button>
                    </>
                ) : (
                    <Button variant="primary" onClick={onClose} className="w-full">
                        {confirmText || 'סגור'}
                    </Button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};