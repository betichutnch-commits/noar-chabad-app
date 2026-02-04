import { z } from 'zod';

// --- עזרים לשימוש חוזר (Re-usable validators) ---
const idValidator = z.string().regex(/^\d{9}$/, "תעודת זהות חייבת להכיל 9 ספרות בדיוק");
const phoneValidator = z.string().min(9, "מספר טלפון לא תקין (מינימום 9 ספרות)");
const requiredString = (msg: string) => z.string().min(1, msg);

// ---------------------------------------------------------
// 1. חוקים לדף כניסה והרשמה (Login / Register)
// ---------------------------------------------------------
export const loginSchema = z.object({
    idNumber: z.string().min(1, "חובה להזין תעודת זהות"),
    password: z.string().min(1, "חובה להזין סיסמה"),
});

export const registerSchema = z.object({
    branch: z.string().optional(), // אופציונלי כי לא רלוונטי למטה
    fullName: requiredString("חובה להזין שם מלא"),
    phone: phoneValidator,
    idNumber: idValidator,
    email: z.string().email("כתובת אימייל לא תקינה"),
    birthDate: requiredString("חובה לבחור תאריך לידה"),
    password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

// ---------------------------------------------------------
// 2. חוקים לטופס יצירת קשר (Contact)
// ---------------------------------------------------------
export const contactSchema = z.object({
    subject: z.string().min(3, "הנושא חייב להכיל לפחות 3 תווים"),
    message: z.string().min(10, "תוכן ההודעה חייב להכיל לפחות 10 תווים"),
});

// ---------------------------------------------------------
// 3. חוקים לפרופיל אישי (Profile)
// ---------------------------------------------------------
export const profileSchema = z.object({
    officialName: z.string().min(2, "שם פרטי חייב להכיל לפחות 2 תווים"),
    lastName: z.string().min(2, "שם משפחה חייב להכיל לפחות 2 תווים"),
    idNumber: idValidator,
    phone: phoneValidator,
    email: z.string().email("כתובת אימייל לא תקינה"),
    birthDate: requiredString("חובה להזין תאריך לידה"),
    // שדות אופציונליים
    nickname: z.string().optional(),
    fullNameAndMother: z.string().optional(),
    branchAddress: z.string().optional(),
    startYear: z.any().optional(), // מקבל מספר או מחרוזת
    studentCount: z.any().optional(),
    staffCount: z.any().optional(),
    additionalStaff: z.string().optional(),
});

// ---------------------------------------------------------
// 4. חוקים לטיול חדש - פרטים כלליים (New Trip - General)
// ---------------------------------------------------------
export const tripGeneralSchema = z.object({
    name: z.string().min(3, "שם הטיול חייב להכיל לפחות 3 תווים"),
    tripType: z.string().min(1, "חובה לבחור סוג פעילות"),
    
    // תאריכים
    startDate: requiredString("חובה לבחור תאריך התחלה"),
    endDate: requiredString("חובה לבחור תאריך סיום"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    
    // כמויות (coerce הופך מחרוזת למספר אוטומטית)
    chanichimCount: z.coerce.number().min(1, "כמות חניכים חייבת להיות לפחות 1"),
    totalTravelers: z.coerce.number().min(1, "כמות משתתפים חייבת להיות לפחות 1"),
    
    // שדות חובה נוספים
    gradeFrom: z.string().min(1, "חובה לבחור שכבת גיל"),
    gradeTo: z.string().min(1, "חובה לבחור שכבת גיל"),
    
    // פרטי אחראי (נבדקים לוודא שלא נמחקו)
    coordName: z.string().min(2, "חסר שם אחראי טיול"),
    coordId: z.string().min(8, "חסרה ת.ז. של אחראי טיול"),
    
    // אופציונלי
    staffOther: z.string().optional(),
    generalComments: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "תאריך סיום לא יכול להיות לפני תאריך התחלה",
    path: ["endDate"], // איפה להציג את השגיאה
}).refine((data) => data.totalTravelers >= data.chanichimCount, {
    message: 'סה"כ משתתפים חייב להיות גדול או שווה לכמות החניכים',
    path: ["totalTravelers"],
});

// ---------------------------------------------------------
// 5. חוקים להוספת שורה בלו"ז (Timeline Line)
// ---------------------------------------------------------
export const tripLineSchema = z.object({
    date: requiredString("חובה לבחור תאריך לפעילות"),
    category: requiredString("חובה לבחור קטגוריה"),
    subCategory: requiredString("חובה לבחור סוג פעילות"),
    locationValue: requiredString("חובה להזין מיקום"),
    // ולידציה מותנית: אם בחר 'אחר' או 'לינת מבנה', חייב לפרט
    otherDetail: z.string().optional(),
}).refine((data) => {
    if (data.subCategory === 'אחר' || data.subCategory === 'לינת מבנה') {
        return data.otherDetail && data.otherDetail.length > 2;
    }
    return true;
}, {
    message: "חובה לפרט בשדה זה (מינימום 2 תווים)",
    path: ["otherDetail"],
});

// ---------------------------------------------------------
// 6. חוקים להוספת איש צוות נוסף (Secondary Staff)
// ---------------------------------------------------------
export const staffSchema = z.object({
    name: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
    role: z.string().min(2, "חובה להגדיר תפקיד"),
    idNumber: idValidator,
    phone: phoneValidator,
    email: z.string().email("כתובת אימייל לא תקינה"),
});

// ---------------------------------------------------------
// 7. חוקים לביטול טיול (Cancellation)
// ---------------------------------------------------------
export const cancellationSchema = z.object({
    reason: z.string().min(5, "חובה לפרט את סיבת הביטול (לפחות 5 תווים)"),
});