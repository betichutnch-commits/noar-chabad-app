"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    type?: 'success' | 'error' | 'info' | 'confirm';
    title?: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const Modal = ({ 
    isOpen, onClose, type = 'info', title, message, onConfirm, 
    confirmText = 'אישור', cancelText = 'ביטול' 
}: ModalProps) => {
    
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) setShow(true);
        else setTimeout(() => setShow(false), 300); // אנימציית יציאה
    }, [isOpen]);

    if (!show && !isOpen) return null;

    // הגדרות עיצוב מדויקות לפי צבעי המותג
    const config = {
        success: { 
            color: 'text-[#8BC34A]', // brand-green
            bgColor: 'bg-[#8BC34A]/10', 
            btnBg: 'bg-[#8BC34A] hover:bg-[#7CB342]', 
            icon: CheckCircle, 
            defaultTitle: 'הצלחה' 
        },
        error: { 
            color: 'text-[#E91E63]', // brand-pink
            bgColor: 'bg-[#E91E63]/10', 
            btnBg: 'bg-[#E91E63] hover:bg-[#D81B60]', 
            icon: AlertTriangle, 
            defaultTitle: 'שגיאה' 
        },
        info: { 
            color: 'text-[#00BCD4]', // brand-cyan
            bgColor: 'bg-[#00BCD4]/10', 
            btnBg: 'bg-[#00BCD4] hover:bg-[#00ACC1]', 
            icon: Info, 
            defaultTitle: 'שים לב' 
        },
        confirm: { 
            color: 'text-[#FFC107]', // yellow (נשאר כברירת מחדל לאישור)
            bgColor: 'bg-[#FFC107]/10', 
            btnBg: 'bg-[#FFC107] hover:bg-[#FFB300]', 
            icon: HelpCircle, 
            defaultTitle: 'אישור פעולה' 
        },
    }[type];

    const Icon = config.icon;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/50 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0 pointer-events-none'}`}>
            <div className={`bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                
                {/* פס צבע עליון - לוקח את צבע הכפתור */}
                <div className={`h-2 w-full ${config.btnBg.split(' ')[0]}`}></div>

                <div className="p-8 text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${config.bgColor} ${config.color}`}>
                        <Icon size={40} strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-800 mb-3">
                        {title || config.defaultTitle}
                    </h3>
                    
                    <p className="text-gray-600 text-sm font-medium leading-relaxed whitespace-pre-line mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        {type === 'confirm' ? (
                            <>
                                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    {cancelText}
                                </button>
                                <button 
                                    onClick={() => { onConfirm?.(); onClose(); }} 
                                    className={`flex-1 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-transform active:scale-95 ${config.btnBg} hover:brightness-110`}
                                >
                                    {confirmText}
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={onClose} 
                                className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-transform active:scale-95 ${config.btnBg} hover:brightness-110`}
                            >
                                {confirmText || 'הבנתי, תודה'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};