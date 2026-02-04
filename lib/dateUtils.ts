import { HDate, gematriya } from '@hebcal/core';

// פונקציית עזר להסרת ניקוד (למקרה ש-Hebcal מחזיר טקסט מנוקד)
const stripNikud = (str: string) => {
    return str.replace(/[\u0591-\u05C7]/g, '');
};

export const formatHebrewDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const hDate = new HDate(date);
        // מנקה ניקוד מהתוצאה
        return stripNikud(hDate.renderGematriya());
    } catch (e) {
        console.error("Error formatting Hebrew date:", e);
        return '';
    }
};

export const formatHebrewDateRange = (startStr: string, endStr: string) => {
    if (!startStr) return '';
    const endDate = endStr ? endStr : startStr;

    try {
        const startH = new HDate(new Date(startStr));
        const endH = new HDate(new Date(endDate));

        // אם זה אותו יום בדיוק
        if (startH.isSameDate(endH)) {
            return stripNikud(startH.renderGematriya());
        }

        const startDay = gematriya(startH.getDate());
        const endDay = gematriya(endH.getDate());
        
        const startFull = stripNikud(startH.renderGematriya());
        const endFull = stripNikud(endH.renderGematriya());

        // אם זה אותו חודש ואותה שנה: "ח' – ט' אדר תשפד"
        if (startH.getMonth() === endH.getMonth() && startH.getFullYear() === endH.getFullYear()) {
            // חיתוך שם החודש והשנה מתוך המחרוזת המלאה
            const monthAndYear = startFull.substring(startFull.indexOf(' ') + 1);
            return `${startDay} – ${endDay} ${monthAndYear}`;
        }

        // אחרת: "ח' שבט – ג' אדר תשפד" (פורמט מלא)
        return `${startFull} – ${endFull}`;

    } catch (e) {
        return '';
    }
};

export const getMonthNameHebrew = (dateString: string) => {
     if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const hDate = new HDate(date);
        const full = stripNikud(hDate.renderGematriya());
        const parts = full.split(' ');
        if (parts.length >= 2) {
            return parts[1]; // החלק השני הוא בדרך כלל החודש (למשל "ג' אדר תשפד")
        }
        return '';
    } catch (e) {
        return '';
    }
};

// --- שאר הפונקציות ---

export const getHebrewDateString = (dateString: string) => formatHebrewDate(dateString);

export const toHebrewDay = (dateString: string) => {
    const full = formatHebrewDate(dateString);
    return full.split(' ').slice(0, 2).join(' '); // מחזיר רק יום וחודש (ללא שנה)
};

export const getHebrewDateRange = (start: string, end: string) => formatHebrewDateRange(start, end);

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
};

export const getShortDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth() + 1}`;
};

export const getDayName = (dateString: string) => {
    if (!dateString) return '';
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[new Date(dateString).getDay()];
};

export const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

export const formatFullGregorianDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
};

export const formatHebrewYear = (dateString: string) => {
     if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const hDate = new HDate(date);
        return gematriya(hDate.getFullYear());
    } catch (e) {
        return '';
    }
};