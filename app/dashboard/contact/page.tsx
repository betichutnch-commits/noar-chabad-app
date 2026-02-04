"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Send, HelpCircle, Image as ImageIcon, X, AlertTriangle, Info, Loader2 } from 'lucide-react'

// ייבוא Hook ו-Zod
import { useUser } from '@/hooks/useUser'
import { contactSchema } from '@/lib/schemas'

export default function ContactPage() {
  // 1. שימוש ב-Hook
  const { user, loading: userLoading } = useUser('/');

  const [submitting, setSubmitting] = useState(false);
  
  // ניהול מודל מתוקן
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm: undefined });

  const [type, setType] = useState<'general' | 'bug'>('general');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({ subject: '', message: '' });

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
            setScreenshot(blob);
            setPreviewUrl(URL.createObjectURL(blob));
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setScreenshot(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const removeImage = () => {
      setScreenshot(null);
      setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    // 2. ולידציה עם Zod
    const validation = contactSchema.safeParse(formData);

    if (!validation.success) {
        showModal('error', 'חסרים פרטים', validation.error.issues[0].message);
        return;
    }

    setSubmitting(true);

    let imageUrl = null;

    // העלאת תמונה אם יש
    if (screenshot && user) {
        const fileName = `bugs/${user.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage.from('trip-files').upload(fileName, screenshot);
        if (!uploadError) {
            const { data } = supabase.storage.from('trip-files').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
    }
    
    // הרכבת ההודעה הסופית
    const finalMessage = imageUrl 
        ? `${formData.message}\n\n[צורף צילום מסך]: ${imageUrl}`
        : formData.message;

    const { error } = await supabase.from('contact_messages').insert([{
        user_id: user?.id,
        subject: `[${type === 'bug' ? 'תקלה' : 'פנייה'}] ${formData.subject}`,
        message: finalMessage,
        status: 'new'
    }]);

    setSubmitting(false);

    if (error) {
        showModal('error', 'שגיאה', 'אירעה שגיאה בשליחה: ' + error.message);
    } else {
        showModal('success', 'נשלח בהצלחה', 'הפנייה התקבלה ומספרה נרשם במערכת.\nאנו נטפל בה בהקדם.');
        setFormData({ subject: '', message: '' });
        removeImage();
    }
  };

  if (userLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <Header title="צור קשר / דיווח על תקלה" />
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm}
      />

      <div className="max-w-3xl mx-auto p-4 md:p-8 animate-fadeIn pb-32">
         <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-8 shadow-sm text-center md:text-right">
             
             <div className="flex flex-col sm:flex-row gap-4 mb-6">
                 <button 
                    onClick={() => setType('general')}
                    className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all font-bold
                    ${type === 'general' ? 'border-[#00BCD4] bg-cyan-50 text-[#00BCD4]' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                 >
                     <HelpCircle size={28}/>
                     שאלה כללית
                 </button>
                 <button 
                    onClick={() => setType('bug')}
                    className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all font-bold
                    ${type === 'bug' ? 'border-[#E91E63] bg-pink-50 text-[#E91E63]' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                 >
                     <AlertTriangle size={28}/>
                     דיווח על תקלה
                 </button>
             </div>

             <div className="space-y-6">
                 {type === 'bug' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 animate-fadeIn text-right">
                        <Info size={22} className="text-yellow-600 shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-sm font-bold text-yellow-800 mb-1">איך מדווחים על תקלה ביעילות?</p>
                            <ul className="text-xs text-yellow-700 list-disc list-inside leading-relaxed space-y-1">
                                <li>חובה לצרף <b>צילום מסך</b> של הבעיה (ניתן להעלות קובץ או להדביק).</li>
                                <li>חובה להוסיף <b>הסבר מילולי</b>: מה ניסיתם לעשות? ומה קרה בפועל?</li>
                            </ul>
                        </div>
                    </div>
                 )}

                 <Input 
                    label="נושא" 
                    placeholder={type === 'bug' ? "בקצרה: מה הבעיה?" : "בנושא..."}
                    value={formData.subject}
                    onChange={(e: any) => setFormData({...formData, subject: e.target.value})}
                 />

                 <div>
                     <label className="text-xs font-bold text-gray-500 mb-1.5 mr-1 block text-right">
                        {type === 'bug' ? 'תיאור התקלה והדבקת צילום מסך' : 'תוכן ההודעה'}
                     </label>
                     <div className="relative">
                        <textarea 
                            className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] min-h-[150px] resize-none text-base md:text-sm font-medium bg-white transition-all text-right"
                            placeholder={type === 'bug' ? "אנא פרטו כאן את השלבים שגרמו לתקלה...\n\n(ניתן להדביק כאן צילום מסך או לבחור קובץ)" : "תוכן הפנייה..."}
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                            onPaste={handlePaste}
                        ></textarea>
                        
                        <label className="absolute bottom-3 left-3 text-gray-400 hover:text-[#E91E63] cursor-pointer p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200 transition-all active:scale-95" title="צרף קובץ תמונה">
                            <ImageIcon size={22}/>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
                        </label>
                     </div>
                 </div>

                 {previewUrl && (
                     <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 relative w-fit animate-fadeIn mx-auto md:mx-0">
                         <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1 justify-center md:justify-start"><ImageIcon size={12}/> צילום מסך מצורף:</p>
                         <img src={previewUrl} alt="Screenshot" className="max-h-48 rounded-lg border border-gray-200 shadow-sm"/>
                         <button onClick={removeImage} className="absolute -top-2 -left-2 bg-white text-red-500 rounded-full p-2 shadow-md hover:bg-red-50 border border-gray-200 transition-all active:scale-95">
                             <X size={16}/>
                         </button>
                     </div>
                 )}

                 <div className="pt-4 flex flex-col-reverse md:flex-row items-center justify-end gap-4 border-t border-gray-100">
                     <Button 
                        onClick={handleSubmit} 
                        isLoading={submitting}
                        className={`w-full md:w-auto px-12 shadow-lg h-12 md:h-10 text-base md:text-sm ${type === 'bug' ? 'bg-[#E91E63] hover:bg-pink-600 shadow-pink-100' : 'bg-[#00BCD4] hover:bg-cyan-600 shadow-cyan-100'}`}
                        icon={<Send size={18}/>}
                     >
                         שליחה
                     </Button>
                 </div>
             </div>
         </div>
      </div>
    </>
  )
}