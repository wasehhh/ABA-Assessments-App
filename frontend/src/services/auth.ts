import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const authService = {
  async signUp(email: string, password: string, fullName: string, orgName: string) {
    // 1. Check for existing invite
    // We use a public RPC or a client-side check if we made the table public readable (which we shouldn't for privacy).
    // The safest is RPC 'check_user_invite' which returns info ONLY if exact match.
    // However, authService doesn't import userService to avoid cycles? imports are fine.
    // Let's call RPC directly here.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed');

    // 1.5 Check for session (Email Confirmation Flow)
    if (!authData.session) {
      // User created but not logged in (Email verification required)
      return { user: authData.user, profile: null, message: 'Please check your email to confirm your account.' };
    }

    // 2. Check for invite (Claim it securely)
    // We call this AFTER signup so we have an auth session to verify email matches.
    const { data: invite } = await supabase.rpc('claim_invite');

    let profileData: Partial<UserProfile> = {
      id: authData.user.id,
      full_name: fullName,
      email,
    };

    if (invite) {
      // 3a. Join Existing Org
      profileData.org_id = invite.org_id;
      profileData.role = invite.role;
      // Invite is auto-deleted by the RPC
    } else {
      // 2b. Create New Org (Admin)
      if (!orgName) throw new Error('Organization Name is required for new accounts.');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName }])
        .select()
        .single();

      if (orgError) throw orgError;

      profileData.org_id = org.id;
      profileData.role = 'admin';
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) throw profileError;

    return { user: authData.user, profile };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Check for pending invites (Late Claim Flow)
    if (data.user) {
      let { data: inviteData } = await supabase.rpc('claim_invite');
      let invite = Array.isArray(inviteData) && inviteData.length > 0 ? inviteData[0] : null; // Handle array return



      if (invite) {
        // User had a pending invite! Upsert their profile to join the correct org.
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
            org_id: invite.org_id,
            role: invite.role
          });

        if (upsertError) console.error('Error upserting profile from invite:', upsertError);
      }
    }

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      // Do not throw, return null so app can handle "Profile Loading" or "Setup" state
      return null;
    }
    return data;
  },

  async checkInvite(email: string) {
    const { data, error } = await supabase.rpc('check_user_invite', { lookup_email: email });
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },
};
