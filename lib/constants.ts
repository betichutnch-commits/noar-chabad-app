import { Bus, Navigation, Ticket, Utensils, Home, Tent, HelpCircle } from 'lucide-react';

// --- רשימות בסיסיות ---
export const ISRAEL_CITIES = ["ירושלים", "תל אביב", "חיפה", "רחובות", "כפר חב״ד", "צפת", "אילת", "טבריה", "נתניה", "אשדוד", "באר שבע", "לוד", "קריית מלאכי", "נחלת הר חב״ד", "נוף הגליל"].sort();
export const GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב'];
export const STAFF_AGES = ['גיל 13-18 (מד"צים)', 'מעל גיל 18', 'הורים מלווים', 'אחר'];

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
  transport: { label: 'התניידות', icon: Bus, color: 'blue', options: [{ label: 'הליכה ביום', license: false }, { label: 'הליכה בלילה', license: false }, { label: 'נסיעה מאורגנת', license: false }, { label: 'תחבורה ציבורית', license: false }, { label: 'רכבת', license: false }, { label: 'רכבים פרטיים', license: false }, { label: 'אופניים', license: true }, { label: 'ג׳יפים', license: true }, { label: 'אחר', license: false }] }, 
  hiking: { label: 'מסלול בטבע', icon: Navigation, color: 'emerald', options: [{ label: 'מסלול יום', license: false }, { label: 'מסלול לילה', license: false }, { label: 'טיול ג׳יפים', license: true }, { label: 'אחר', license: false }] }, 
  attraction: { label: 'אטרקציה', icon: Ticket, color: 'pink', options: [{ label: 'פארק מים', license: true }, { label: 'קיאקים/רפטינג', license: true }, { label: 'שייט', license: true }, { label: 'בריכה', license: true }, { label: 'גלישה/סאפ', license: true }, { label: 'פארק חבלים', license: true }, { label: 'קיר טיפוס', license: true }, { label: 'טרקטורונים', license: true }, { label: 'פיינטבול', license: true }, { label: 'לונה פארק', license: true }, { label: 'קארטינג', license: true }, { label: 'מתקנים מתנפחים', license: true }, { label: 'איי ג\'אמפ', license: true }, { label: 'לייזר טאג', license: true }, { label: 'שייט טורנדו', license: true }, { label: 'מוזיאון', license: false }, { label: 'מרכז מבקרים', license: false }, { label: 'אתר מורשת', license: false }, { label: 'קבר צדיק', license: false }, { label: 'אחר', license: false }] }, 
  food: { label: 'אוכל', icon: Utensils, color: 'yellow', options: [{ label: 'הכנה עצמית', license: false }, { label: 'אוכל קנוי', license: false }, { label: 'מארזים סגורים קנויים', license: false }, { label: 'אוכל ביתי מבושל', license: false }, { label: 'קייטרינג', license: false }, { label: 'על האש', license: false }, { label: 'אחר', license: false }] }, 
  settlement: { label: 'פעילות ביישוב/מבנה', icon: Home, color: 'indigo', options: [{ label: 'פעילות בסניף', license: false }, { label: 'אירוע באולם', license: false }, { label: 'פעילות בבית כנסת', license: false }, { label: 'פעילות בבית חב״ד', license: false }, { label: 'פעילות במתנ״ס', license: false }, { label: 'פעילות בבית פרטי', license: false }, { label: 'פעילות בשטח פתוח', license: false }, { label: 'פעילות בשטח מגודר תחת כיפת השמיים', license: false }, { label: 'פארק/גינה', license: false }, { label: 'כנס', license: false }, { label: 'אחר', license: false }] },
  sleeping: { label: 'לינה', icon: Tent, color: 'purple', options: [{ label: 'לינת מבנה', license: false }, { label: 'לינת שטח', license: true }, { label: 'אחר', license: false }] }, 
  other: { label: 'אחר', icon: HelpCircle, color: 'gray', options: [{ label: 'פעילות כללית', license: false }, { label: 'טקס / התכנסות', license: false }, { label: 'זמן חופשי', license: false }, { label: 'אחר', license: false }] } 
};

// --- הגדרות עיצוב לקטגוריות (לשימוש בדף פרטי הטיול) ---
export const DEFAULT_STYLE = { icon: HelpCircle, label: 'כללי', bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50', border: 'border-gray-100' };
export const CATEGORY_STYLES: any = { 
    transport: { icon: Bus, color: 'blue', label: 'התניידות', bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-100' }, 
    hiking: { icon: Navigation, color: 'emerald', label: 'מסלול בטבע', bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-100' }, 
    attraction: { icon: Ticket, color: 'pink', label: 'אטרקציה', bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50', border: 'border-pink-100' }, 
    food: { icon: Utensils, color: 'yellow', label: 'אוכל', bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50', border: 'border-yellow-100' }, 
    settlement: { icon: Home, color: 'indigo', label: 'פעילות במבנה / יישוב', bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-100' }, 
    sleeping: { icon: Tent, color: 'purple', label: 'לינה', bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-100' }, 
    other: DEFAULT_STYLE 
};

// --- צבעים כלליים ---
export const getColorHex = (colorName: string) => {
    const map: any = { blue: '#00BCD4', emerald: '#8BC34A', pink: '#E91E63', yellow: '#FFC107', indigo: '#3F51B5', purple: '#9C27B0', gray: '#9E9E9E', cyan: '#00BCD4', green: '#8BC34A' };
    return map[colorName] || '#00BCD4';
};