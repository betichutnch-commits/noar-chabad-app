"use client";

import React, { useEffect } from 'react';
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
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const config = {
    success: { icon: CheckCircle, color: 'text-state-success', bg: 'bg-state-success-bg' },
    error:   { icon: AlertCircle, color: 'text-state-danger',   bg: 'bg-state-danger-bg' },
    confirm: { icon: AlertTriangle, color: 'text-state-warning', bg: 'bg-state-warning-bg' },
    info:    { icon: Info,        color: 'text-brand-cyan', bg: 'bg-state-info-bg' },
  }[type];

  const Icon = config.icon;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="presentation"
    >
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Content */}
      <div
        className={`relative bg-surface-card w-full max-w-sm rounded-3xl shadow-2xl p-6 transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        
        <button
          onClick={onClose}
          aria-label="סגירת חלון"
          className="absolute top-4 left-4 p-2 bg-surface-muted rounded-full text-text-muted hover:bg-gray-100 hover:text-text-secondary transition-colors"
        >
            <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${config.bg} ${config.color}`}>
                <Icon size={32} strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black text-text-primary mb-2">
                {title}
            </h3>
            
            <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6 whitespace-pre-line">
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