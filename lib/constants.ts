import { Bus, Navigation, Ticket, Utensils, Home, Tent, HelpCircle } from 'lucide-react';

// --- רשימות בסיסיות ---
export const ISRAEL_CITIES = [
    "ירושלים", "תל אביב", "חיפה", "רחובות", "כפר חב״ד", "צפת", "אילת", "טבריה", "נתניה", 
    "אשדוד", "באר שבע", "לוד", "קריית מלאכי", "נחלת הר חב״ד", "נוף הגליל", "בית שמש", 
    "ביתר עילית", "אלעד", "מודיעין עילית", "בני ברק", "פתח תקווה", "ראשון לציון", 
    "חולון", "רמת גן", "בת ים", "אשקלון"
].sort();

export const GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב'];

export const STAFF_AGES = ['גיל 13-18 (מד"צים)', 'מעל גיל 18', 'הורים מלווים', 'אחר'];

// --- הגדרות מחלקות ---
export const DEPARTMENTS_CONFIG: Record<string, { color: string; gender: 'male' | 'female' | 'mixed'; logo: string }> = {
  "בת מלך": { 
      color: "border-[#E91E63] text-[#E91E63] bg-pink-50 hover:bg-pink-100", 
      gender: "female", 
      logo: "/logos/bat-melech.png" 
  },
  "בנות חב\"ד": { 
      color: "border-[#E91E63] text-[#E91E63] bg-pink-50 hover:bg-pink-100", 
      gender: "female", 
      logo: "/logos/bnos-chabad.png" 
  },
  "הפנסאים": { 
      color: "border-[#00BCD4] text-[#00BCD4] bg-cyan-50 hover:bg-cyan-100", 
      gender: "male", 
      logo: "/logos/hapanasim.png" 
  },
  "תמים": { 
      color: "border-[#00BCD4] text-[#00BCD4] bg-cyan-50 hover:bg-cyan-100", 
      gender: "male", 
      logo: "/logos/temimim.png" 
  },
  "מועדוני המעשים הטובים": { 
      color: "border-[#8BC34A] text-[#558B2F] bg-[#F1F8E9] hover:bg-[#DCEDC8]", 
      gender: "mixed", 
      logo: "/logos/clubs.png" 
  }
};

// --- לוגיקה והגדרות סוגי טיולים ---
export const TRIP_LOGIC: any = {
    "טיול מחוץ לסניף": { nameLabel: "שם הטיול", namePlaceholder: "לדוגמה: טיול לצפון", timelineTitle: "פירוט הטיול", staffLabel: "צוות משתתף בטיול", minRows: 2 },
    "כנס/אירוע מחוץ לסניף": { nameLabel: "שם הפעילות", namePlaceholder: "לדוגמה: כנס סיום שנה", timelineTitle: "פירוט האירוע", staffLabel: "צוות משתתף בפעילות", minRows: 2 },
    "פעילות לא שגרתית בסניף": { nameLabel: "שם הפעילות", namePlaceholder: 'לדוגמה: התוועדות יו"ד שבט', timelineTitle: "פירוט הפעילות", staffLabel: "צוות משתתף בפעילות", minRows: 1 },
    "יציאה רגלית באזור הסניף": { nameLabel: "שם הפעילות", namePlaceholder: "לדוגמה: יציאה למבצעים", timelineTitle: "פירוט הפעילות", staffLabel: "צוות משתתף בפעילות", minRows: 2 },
    "אחר": { nameLabel: "שם הפעילות", namePlaceholder: 'לדוגמה: טיסה לרבי', timelineTitle: "פירוט הפעילות", staffLabel: "צוות משתתף בפעילות", minRows: 1 }
};

export const TRIP_TYPES_CONFIG = [
    { id: "טיול מחוץ לסניף", label: "טיול מחוץ לסניף", icon: Bus, bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    { id: "כנס/אירוע מחוץ לסניף", label: "כנס/אירוע חוץ", icon: Ticket, bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
    { id: "פעילות לא שגרתית בסניף", label: "פעילות לא שגרתית בסניף", icon: Home, bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    { id: "יציאה רגלית באזור הסניף", label: "יציאה רגלית באזור הסניף", icon: Navigation, bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    { id: "אחר", label: "אחר...", icon: HelpCircle, bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" }
];

// --- קטגוריות לפעילויות ---
export const CATEGORIES: any = { 
  transport: { label: 'התניידות', icon: Bus, options: [{ label: 'הליכה ביום', license: false }, { label: 'הליכה בלילה', license: false }, { label: 'נסיעה מאורגנת', license: false }, { label: 'תחבורה ציבורית', license: false }, { label: 'רכבת', license: false }, { label: 'רכבים פרטיים', license: false }, { label: 'אופניים', license: true }, { label: 'ג׳יפים', license: true }, { label: 'אחר', license: false }] }, 
  hiking: { label: 'מסלול בטבע', icon: Navigation, options: [{ label: 'מסלול יום', license: false }, { label: 'מסלול לילה', license: false }, { label: 'טיול ג׳יפים', license: true }, { label: 'אחר', license: false }] }, 
  attraction: { label: 'אטרקציה', icon: Ticket, options: [{ label: 'פארק מים', license: true }, { label: 'קיאקים/רפטינג', license: true }, { label: 'שייט', license: true }, { label: 'בריכה', license: true }, { label: 'גלישה/סאפ', license: true }, { label: 'פארק חבלים', license: true }, { label: 'קיר טיפוס', license: true }, { label: 'טרקטורונים', license: true }, { label: 'פיינטבול', license: true }, { label: 'לונה פארק', license: true }, { label: 'קארטינג', license: true }, { label: 'מתקנים מתנפחים', license: true }, { label: 'איי ג\'אמפ', license: true }, { label: 'לייזר טאג', license: true }, { label: 'שייט טורנדו', license: true }, { label: 'מוזיאון', license: false }, { label: 'מרכז מבקרים', license: false }, { label: 'אתר מורשת', license: false }, { label: 'קבר צדיק', license: false }, { label: 'אחר', license: false }] }, 
  food: { label: 'אוכל', icon: Utensils, options: [{ label: 'הכנה עצמית', license: false }, { label: 'אוכל קנוי', license: false }, { label: 'מארזים סגורים קנויים', license: false }, { label: 'אוכל ביתי מבושל', license: false }, { label: 'קייטרינג', license: false }, { label: 'על האש', license: false }, { label: 'אחר', license: false }] }, 
  settlement: { label: 'פעילות ביישוב/מבנה', icon: Home, options: [{ label: 'פעילות בסניף', license: false }, { label: 'אירוע באולם', license: false }, { label: 'פעילות בבית כנסת', license: false }, { label: 'פעילות בבית חב״ד', license: false }, { label: 'פעילות במתנ״ס', license: false }, { label: 'פעילות בבית פרטי', license: false }, { label: 'פעילות בשטח פתוח', license: false }, { label: 'פעילות בשטח מגודר תחת כיפת השמיים', license: false }, { label: 'פארק/גינה', license: false }, { label: 'כנס', license: false }, { label: 'אחר', license: false }] },
  sleeping: { label: 'לינה', icon: Tent, options: [{ label: 'לינת מבנה', license: false }, { label: 'לינת שטח', license: true }, { label: 'אחר', license: false }] }, 
  other: { label: 'אחר', icon: HelpCircle, options: [{ label: 'פעילות כללית', license: false }, { label: 'טקס / התכנסות', license: false }, { label: 'זמן חופשי', license: false }, { label: 'אחר', license: false }] } 
};

export const DEFAULT_STYLE = { icon: HelpCircle, label: 'כללי', pastelBg: 'bg-gray-100', darkText: 'text-gray-600', border: 'border-gray-200' };

export const CATEGORY_STYLES: any = { 
    transport: { icon: Bus, label: 'התניידות', pastelBg: 'bg-[#E3F2FD]', darkText: 'text-[#1565C0]', border: 'border-[#BBDEFB]' }, 
    hiking: { icon: Navigation, label: 'מסלול בטבע', pastelBg: 'bg-[#E8F5E9]', darkText: 'text-[#2E7D32]', border: 'border-[#C8E6C9]' }, 
    attraction: { icon: Ticket, label: 'אטרקציה', pastelBg: 'bg-[#FCE4EC]', darkText: 'text-[#C2185B]', border: 'border-[#F8BBD0]' }, 
    food: { icon: Utensils, label: 'אוכל', pastelBg: 'bg-[#FFF3E0]', darkText: 'text-[#EF6C00]', border: 'border-[#FFE0B2]' }, 
    settlement: { icon: Home, label: 'פעילות במבנה', pastelBg: 'bg-[#E8EAF6]', darkText: 'text-[#283593]', border: 'border-[#C5CAE9]' }, 
    sleeping: { icon: Tent, label: 'לינה', pastelBg: 'bg-[#F3E5F5]', darkText: 'text-[#6A1B9A]', border: 'border-[#E1BEE7]' }, 
    other: DEFAULT_STYLE 
};

// פונקציית עזר להמרת שמות צבעים לקוד Hex (עבור גרפים או עיצוב דינמי)
export const getColorHex = (colorName: string) => {
    if (!colorName) return '#00BCD4';
    
    // אם כבר קיבלנו קוד צבע
    if (colorName.startsWith('#')) return colorName;

    const map: any = { 
        blue: '#00BCD4', 
        emerald: '#8BC34A', 
        pink: '#E91E63', 
        yellow: '#FFC107', 
        indigo: '#3F51B5', 
        purple: '#9C27B0', 
        gray: '#9E9E9E', 
        cyan: '#00BCD4', 
        green: '#8BC34A' 
    };
    return map[colorName] || '#00BCD4';
};