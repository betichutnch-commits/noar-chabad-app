// --- פונקציות עזר לתאריכים עבריים ולועזיים ---

export const toHebrewDay = (day: number) => {
    const days = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ', 'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל'];
    return days[day] || day;
};

export const formatHebrewYear = (yearNum: number) => {
    let year = yearNum % 1000; 
    let str = '';
    if (year >= 400) { str += 'ת'; year -= 400; }
    if (year >= 300) { str += 'ש'; year -= 300; }
    if (year >= 200) { str += 'ר'; year -= 200; }
    if (year >= 100) { str += 'ק'; year -= 100; }
    if (year >= 90) { str += 'צ'; year -= 90; }
    if (year >= 80) { str += 'פ'; year -= 80; }
    if (year >= 70) { str += 'ע'; year -= 70; }
    if (year >= 60) { str += 'ס'; year -= 60; }
    if (year >= 50) { str += 'נ'; year -= 50; }
    if (year >= 40) { str += 'מ'; year -= 40; }
    if (year >= 30) { str += 'ל'; year -= 30; }
    if (year >= 20) { str += 'כ'; year -= 20; }
    if (year >= 10) { str += 'י'; year -= 10; }
    const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    if (year > 0) str += units[year];
    if (str.length > 1) { str = str.slice(0, -1) + '"' + str.slice(-1); } else { str += "'"; }
    return str;
};

export const formatHebrewDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const hebrewYearNum = date.getFullYear() + 3760;
        const yearLetters = formatHebrewYear(hebrewYearNum);
        const dayNum = parseInt(date.toLocaleDateString('he-IL', { calendar: 'hebrew', day: 'numeric' }));
        const dayLetters = toHebrewDay(dayNum);
        const monthName = date.toLocaleDateString('he-IL', { calendar: 'hebrew', month: 'long' });
        return `${dayLetters} ב${monthName} ${yearLetters}`;
    } catch (e) { return ''; }
};

export const getHebrewDateString = (dateString: string) => {
    // גרסה מקוצרת ללא שנה (לשימוש בשדות טופס)
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const dayNum = parseInt(date.toLocaleDateString('he-IL', { calendar: 'hebrew', day: 'numeric' }));
        const dayLetters = toHebrewDay(dayNum);
        const monthName = date.toLocaleDateString('he-IL', { calendar: 'hebrew', month: 'long' });
        return `${dayLetters} ב${monthName}`;
    } catch (e) { return ''; }
};

export const formatFullGregorianDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const getMonthNameHebrew = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('he-IL', { month: 'long' });
};

export const formatDate = (dateString: string) => { if (!dateString) return ''; return new Date(dateString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }); };
export const getShortDate = (dateString: string) => { if (!dateString) return ''; return new Date(dateString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }); };
export const getDayName = (dateString: string) => { if (!dateString) return ''; return new Date(dateString).toLocaleDateString('he-IL', { weekday: 'long' }); };

export const calculateAge = (birthDateString: string) => { 
    if (!birthDateString) return null; 
    const today = new Date(); 
    const birthDate = new Date(birthDateString); 
    let age = today.getFullYear() - birthDate.getFullYear(); 
    const m = today.getMonth() - birthDate.getMonth(); 
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } 
    return age; 
};

export const getHebrewDateRange = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr) return '';
    try {
        const start = new Date(startDateStr);
        const end = endDateStr ? new Date(endDateStr) : start;
        const hebrewYearNum = start.getFullYear() + 3760;
        const yearLetters = formatHebrewYear(hebrewYearNum);

        const hebrewDatePart = (date: Date) => {
            const dayNum = parseInt(date.toLocaleDateString('he-IL', { calendar: 'hebrew', day: 'numeric' }));
            const monthName = date.toLocaleDateString('he-IL', { calendar: 'hebrew', month: 'long' });
            return { day: toHebrewDay(dayNum), month: monthName };
        };

        const hStart = hebrewDatePart(start);
        if (!endDateStr || start.getTime() === end.getTime()) return `${hStart.day} ב${hStart.month} ${yearLetters}`;
        const hEnd = hebrewDatePart(end);
        if (hStart.month === hEnd.month) return `${hStart.day} - ${hEnd.day} ב${hStart.month} ${yearLetters}`;
        return `${hStart.day} ב${hStart.month} - ${hEnd.day} ב${hEnd.month} ${yearLetters}`;
    } catch (e) { return ''; }
};