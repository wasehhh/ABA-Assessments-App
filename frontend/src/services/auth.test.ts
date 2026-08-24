import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfile } from '../types';

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function sampleUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'therapist@example.com',
    user_metadata: {},
    ...overrides,
  };
}

function sampleProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'therapist',
    full_name: 'Test Therapist',
    email: 'therapist@example.com',
    created_at: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

function mockProfileChain(result: { data: UserProfile | null; error: unknown }) {
  mockSingle.mockResolvedValue(result);
  mockMaybeSingle.mockResolvedValue(result);
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return { select: mockSelect };
    }
    throw new Error(`Unexpected from('${table}')`);
  });
}

describe('authService.signUp / signIn (UL-A2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileChain({ data: sampleProfile(), error: null });
  });

  it('invited signup calls complete_user_setup and returns a profile', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();
    const profile = sampleProfile({ role: 'therapist', org_id: 'org-invited' });

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [{ ok: true, mode: 'invite', org_id: 'org-invited', role: 'therapist' }],
      error: null,
    });
    mockProfileChain({ data: profile, error: null });

    const result = await authService.signUp(
      'therapist@example.com',
      'password',
      'Test Therapist',
      ''
    );

    expect(mockRpc).toHaveBeenCalledWith('complete_user_setup', {
      p_full_name: 'Test Therapist',
      p_org_name: '',
    });
    expect(result.user).toEqual(user);
    expect(result.profile).toEqual(profile);
    expect(result).not.toHaveProperty('message');
  });

  it('bootstrap signup with an organization name succeeds', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();
    const profile = sampleProfile({ role: 'admin', org_id: 'org-new', full_name: 'Founder' });

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [{ ok: true, mode: 'bootstrap', org_id: 'org-new', role: 'admin' }],
      error: null,
    });
    mockProfileChain({ data: profile, error: null });

    const result = await authService.signUp(
      'founder@example.com',
      'password',
      'Founder',
      'Acme Clinic'
    );

    expect(mockRpc).toHaveBeenCalledWith('complete_user_setup', {
      p_full_name: 'Founder',
      p_org_name: 'Acme Clinic',
    });
    expect(result.profile).toEqual(profile);
  });

  it('complete_user_setup failure triggers cleanup_failed_signup and rethrows mapped error', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'complete_user_setup') {
        return {
          data: null,
          error: { message: 'complete_user_setup: org name required when no invite exists' },
        };
      }
      if (fn === 'cleanup_failed_signup') {
        return { data: [{ ok: true, deleted_organizations: 1 }], error: null };
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    await expect(
      authService.signUp('founder@example.com', 'password', 'Founder', '')
    ).rejects.toThrow("Enter your organization's name to create a new account.");

    expect(mockRpc).toHaveBeenCalledWith('complete_user_setup', {
      p_full_name: 'Founder',
      p_org_name: '',
    });
    expect(mockRpc).toHaveBeenCalledWith('cleanup_failed_signup');
  });

  it('cleanup failing does not replace the original setup error', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'complete_user_setup') {
        return {
          data: null,
          error: {
            message: 'complete_user_setup: multiple case-variant invites match caller email',
          },
        };
      }
      if (fn === 'cleanup_failed_signup') {
        throw new Error('cleanup exploded');
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    let thrown: unknown;
    try {
      await authService.signUp('therapist@example.com', 'password', 'Test Therapist', '');
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      "There's more than one invitation for this email address. Ask your administrator to remove the extra one, then try again."
    );
    expect((thrown as Error).message).not.toContain('cleanup exploded');
    expect(mockRpc).toHaveBeenCalledWith('cleanup_failed_signup');
  });

  it('signup no longer calls organizations.insert, user_profiles.insert, or claim_invite', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();
    const insert = vi.fn();

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [{ ok: true, mode: 'bootstrap', org_id: 'org-1', role: 'admin' }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return { select: mockSelect, insert };
      }
      if (table === 'organizations') {
        return { insert };
      }
      throw new Error(`Unexpected from('${table}')`);
    });
    mockProfileChain({ data: sampleProfile({ role: 'admin' }), error: null });
    // Re-apply from mock after profile chain helper overwrote it — track inserts separately
    const fromCalls: string[] = [];
    const insertCalls: unknown[] = [];
    mockFrom.mockImplementation((table: string) => {
      fromCalls.push(table);
      if (table === 'user_profiles') {
        return {
          select: mockSelect,
          insert: (...args: unknown[]) => {
            insertCalls.push(args);
            return { select: mockSelect };
          },
        };
      }
      if (table === 'organizations') {
        return {
          insert: (...args: unknown[]) => {
            insertCalls.push(args);
            return { select: mockSelect };
          },
        };
      }
      throw new Error(`Unexpected from('${table}')`);
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: sampleProfile({ role: 'admin' }), error: null });

    await authService.signUp('founder@example.com', 'password', 'Founder', 'Clinic');

    const rpcNames = mockRpc.mock.calls.map((c) => c[0]);
    expect(rpcNames).toContain('complete_user_setup');
    expect(rpcNames).not.toContain('claim_invite');
    expect(insertCalls).toEqual([]);
    expect(fromCalls.filter((t) => t === 'organizations')).toEqual([]);
  });

  it('sign-in with no profile completes setup', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser({
      user_metadata: { full_name: 'Late Claim User' },
    });

    mockSignInWithPassword.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });

    // First getUserProfile → null; then setup succeeds
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockRpc.mockResolvedValue({
      data: [{ ok: true, mode: 'invite', org_id: 'org-1', role: 'therapist' }],
      error: null,
    });

    const result = await authService.signIn('therapist@example.com', 'password');

    expect(mockRpc).toHaveBeenCalledWith('complete_user_setup', {
      p_full_name: 'Late Claim User',
      p_org_name: '',
    });
    expect(result.session).toEqual({ access_token: 'tok' });
    expect(result.user).toEqual(user);
  });

  it('sign-in with an existing profile does not attempt to change org or role', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();
    const profile = sampleProfile({ role: 'therapist', org_id: 'org-1' });

    mockSignInWithPassword.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: profile, error: null });

    await authService.signIn('therapist@example.com', 'password');

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalledWith('organizations');
  });

  it('sign-in missing-org-name failure shows unmapped setup copy, not signup org-name copy', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignInWithPassword.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'complete_user_setup: org name required when no invite exists' },
    });

    await expect(authService.signIn('therapist@example.com', 'password')).rejects.toThrow(
      "We couldn't finish setting up your account. Try signing in — if that doesn't work, let your administrator know."
    );
  });

  it('unmapped complete_user_setup failure never surfaces raw database text', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'complete_user_setup') {
        return {
          data: null,
          error: {
            code: '42501',
            details: null,
            hint: null,
            message: 'complete_user_setup: bootstrap org already has members',
          },
        };
      }
      if (fn === 'cleanup_failed_signup') {
        return { data: [{ ok: true, deleted_organizations: 0 }], error: null };
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    let thrown: unknown;
    try {
      await authService.signUp('founder@example.com', 'password', 'Founder', 'Clinic');
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      "We couldn't finish setting up your account. Try signing in — if that doesn't work, let your administrator know."
    );
    expect((thrown as Error).message).not.toContain('complete_user_setup:');
  });

  it('email-confirmation early return skips complete_user_setup', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignUp.mockResolvedValue({
      data: { user, session: null },
      error: null,
    });

    const result = await authService.signUp(
      'founder@example.com',
      'password',
      'Founder',
      'Clinic'
    );

    expect(result).toEqual({
      user,
      profile: null,
      message: 'Please check your email to confirm your account.',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('multiple empty bootstrap organizations maps to approved copy', async () => {
    const { authService } = await import('./auth');
    const user = sampleUser();

    mockSignUp.mockResolvedValue({
      data: { user, session: { access_token: 'tok' } },
      error: null,
    });
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'complete_user_setup') {
        return {
          data: null,
          error: {
            code: '42501',
            details: null,
            hint: null,
            message: 'complete_user_setup: multiple empty bootstrap organizations exist for caller',
          },
        };
      }
      if (fn === 'cleanup_failed_signup') {
        return { data: [{ ok: true, deleted_organizations: 0 }], error: null };
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    await expect(
      authService.signUp('founder@example.com', 'password', 'Founder', 'Clinic')
    ).rejects.toThrow(
      "We couldn't finish setting up your account. Try signing in — that usually completes it."
    );
  });
});
