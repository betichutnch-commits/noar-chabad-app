"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AppProfile } from '@/lib/types';

type FetchUserOptions = {
    showLoader?: boolean;
    allowRedirect?: boolean;
};

const isAbortLikeError = (error: unknown) => {
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return message.includes('abort') || message.includes('aborted');
};

export const useUser = (redirectTo: string | null = null) => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<AppProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [roleChangedNotice, setRoleChangedNotice] = useState<string | null>(null);
    const prevRoleRef = useRef<string | null>(null);
    const prevUserIdRef = useRef<string | null>(null);

    const fetchUserData = useCallback(async (options?: FetchUserOptions) => {
        const showLoader = options?.showLoader ?? true;
        const allowRedirect = options?.allowRedirect ?? true;
        try {
            if (showLoader) setLoading(true);
            
            // 1. שליפת המשתמש המחובר
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !authUser) {
                setUser(null);
                setProfile(null);
                if (allowRedirect && redirectTo) {
                    router.push(redirectTo);
                }
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
                const incomingRole = String(profileData.role || '').toLowerCase();
                const prevRole = prevRoleRef.current;
                const sameUser = prevUserIdRef.current === authUser.id;
                if (sameUser && prevRole && incomingRole && prevRole !== incomingRole) {
                    setRoleChangedNotice('התפקיד שלך עודכן. ייתכן שחלק מהמסכים השתנו.');
                }
                prevRoleRef.current = incomingRole || null;
                prevUserIdRef.current = authUser.id;
                setProfile(profileData);
            }

        } catch (error) {
            if (isAbortLikeError(error)) {
                // בקשות מתבטלות במעברי נתיב/רענונים מהירים - לא להפיל UI.
                return;
            }
            console.error('Error in useUser:', error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [redirectTo, router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        let mounted = true;
        let profileChannel: ReturnType<typeof supabase.channel> | null = null;

        const setupRealtime = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!mounted || !authUser) return;

                profileChannel = supabase
                    .channel(`profile_self_${authUser.id}`)
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${authUser.id}` },
                        () => {
                            // רענון שקט כדי שהמשתמש יראה שינוי תפקיד כמעט מיידית בלי ניתוק.
                            void fetchUserData({ showLoader: false, allowRedirect: false });
                        },
                    )
                    .subscribe();
            } catch (error) {
                if (isAbortLikeError(error)) return;
                console.error('useUser realtime setup error:', error);
            }
        };

        void setupRealtime();

        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (!mounted) return;
            // מרענן user/profile רק באירועי auth רלוונטיים.
            if (
                event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'USER_UPDATED' ||
                event === 'SIGNED_OUT'
            ) {
                void fetchUserData({ showLoader: false, allowRedirect: false });
            }
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
            if (profileChannel) supabase.removeChannel(profileChannel);
        };
    }, [fetchUserData]);

    return { 
        user,      // נתוני אימות (Email, Metadata)
        profile,   // נתונים מהטבלה (שם רשמי, ת"ז, טלפון)
        loading,   // האם עדיין טוען?
        refresh: fetchUserData, // פונקציה לרענון הנתונים ידנית
        roleChangedNotice,
        clearRoleChangedNotice: () => setRoleChangedNotice(null),
    };
};