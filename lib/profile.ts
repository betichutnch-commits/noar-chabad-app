import { supabase } from "@/lib/supabaseClient";

export interface ProfileSavePayload {
  userId: string;
  officialName: string;
  lastName: string;
  idNumber: string;
  birthDate: string;
  nickname?: string;
  fullNameAndMother?: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  startYear?: string;
  zipCode?: string;
  branchAddress?: string;
  studentCount?: string;
  staffCount?: string;
  additionalStaff?: string;
}

export const saveUserProfile = async (payload: ProfileSavePayload) => {
  const fullName = `${payload.officialName} ${payload.lastName}`.trim();

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      official_name: payload.officialName,
      first_name: payload.officialName,
      last_name: payload.lastName,
      identity_number: payload.idNumber,
      birth_date: payload.birthDate,
      nickname: payload.nickname,
      full_name_mother: payload.fullNameAndMother,
      phone: payload.phone,
      contact_email: payload.email,
      avatar_url: payload.avatarUrl,
      full_name: fullName,
      start_year: payload.startYear,
      zip_code: payload.zipCode,
      branch_address: payload.branchAddress,
      student_count: payload.studentCount,
      staff_count: payload.staffCount,
      additional_staff: payload.additionalStaff,
    },
  });
  if (authError) throw authError;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: payload.userId,
    official_name: payload.officialName,
    last_name: payload.lastName,
    identity_number: payload.idNumber,
    birth_date: payload.birthDate,
    phone: payload.phone,
    email: payload.email,
    full_name: fullName,
    avatar_url: payload.avatarUrl,
    start_year: payload.startYear,
    zip_code: payload.zipCode,
    updated_at: new Date(),
  });
  if (profileError) throw profileError;
};
