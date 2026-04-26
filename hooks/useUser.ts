"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AppProfile } from '@/lib/types';

export const useUser = (redirectTo: string | null = null) => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<AppProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            
            // 1. שליפת המשתמש המחובר
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !authUser) {
                if (redirectTo) {
                    router.push(redirectTo);
                }
                setLoading(false);
                return;
            }

            setUser(authUser);

            // 2. שליפת הפרופיל מהדאטהבייס
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, avatar_url, role, department, is_tech_admin')
                .eq('id', authUser.id)
                .single();

            if (!profileError && profileData) {
                setProfile(profileData);
            }

        } catch (error) {
            console.error('Error in useUser:', error);
        } finally {
            setLoading(false);
        }
    }, [redirectTo, router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    return { 
        user,      // נתוני אימות (Email, Metadata)
        profile,   // נתונים מהטבלה (שם רשמי, ת"ז, טלפון)
        loading,   // האם עדיין טוען?
        refresh: fetchUserData // פונקציה לרענון הנתונים ידנית
    };
};