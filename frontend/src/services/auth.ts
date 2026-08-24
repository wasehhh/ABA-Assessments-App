import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const UNMAPPED_SETUP_FAILURE =
  "We couldn't finish setting up your account. Try signing in — if that doesn't work, let your administrator know.";

/**
 * Maps complete_user_setup raise messages to founder-approved user-facing copy.
 * Raw database text must never reach the UI.
 * callSite distinguishes signup vs sign-in so the missing-org-name message is
 * not shown on a login screen that has no organization field.
 */
function mapCompleteUserSetupError(
  error: { message?: string },
  callSite: 'signup' | 'signin'
): Error {
  const message = error.message ?? '';

  if (message.includes('org name required when no invite exists')) {
    if (callSite === 'signin') {
      return new Error(UNMAPPED_SETUP_FAILURE);
    }
    return new Error("Enter your organization's name to create a new account.");
  }

  if (message.includes('multiple case-variant invites match caller email')) {
    return new Error(
      "There's more than one invitation for this email address. Ask your administrator to remove the extra one, then try again."
    );
  }

  if (message.includes('multiple empty bootstrap organizations exist for caller')) {
    return new Error(
      "We couldn't finish setting up your account. Try signing in — that usually completes it."
    );
  }

  return new Error(UNMAPPED_SETUP_FAILURE);
}

async function fetchProfileOrThrow(userId: string): Promise<UserProfile> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Sign up failed');
  return profile;
}

export const authService = {
  async signUp(email: string, password: string, fullName: string, orgName: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed');

    // Email confirmation path (disabled for Alpha; preserve for later re-enable)
    if (!authData.session) {
      return {
        user: authData.user,
        profile: null,
        message: 'Please check your email to confirm your account.',
      };
    }

    const { error: setupError } = await supabase.rpc('complete_user_setup', {
      p_full_name: fullName,
      p_org_name: orgName,
    });

    if (setupError) {
      // Cleanup must not mask the original setup failure (returned error or throw).
      try {
        await supabase.rpc('cleanup_failed_signup');
      } catch {
        // Intentionally swallowed — caller must see the setup error.
      }
      throw mapCompleteUserSetupError(setupError, 'signup');
    }

    const profile = await fetchProfileOrThrow(authData.user.id);
    return { user: authData.user, profile };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Only call setup when no profile exists. complete_user_setup is idempotent,
    // but skipping the RPC on the common path avoids an extra round-trip every login.
    if (data.user) {
      const existing = await this.getUserProfile(data.user.id);
      if (!existing) {
        const fullName =
          (typeof data.user.user_metadata?.full_name === 'string' &&
            data.user.user_metadata.full_name) ||
          data.user.email?.split('@')[0] ||
          '';

        const { error: setupError } = await supabase.rpc('complete_user_setup', {
          p_full_name: fullName,
          p_org_name: '',
        });

        if (setupError) {
          throw mapCompleteUserSetupError(setupError, 'signin');
        }
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
