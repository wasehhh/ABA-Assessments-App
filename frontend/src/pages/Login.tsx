import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { Clipboard, CheckCircle2 } from 'lucide-react';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Smart Signup State
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(false);

  useEffect(() => {
    // Check for email in URL query params: #/login?email=user@example.com
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const emailParam = params.get('email');

      if (emailParam) {
        setIsSignUp(true);
        setEmail(emailParam);
        setIsEmailLocked(true);
        // Trigger check immediately
        checkInviteForEmail(emailParam);
      }
    }
  }, []);

  const checkInviteForEmail = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;

    setCheckingInvite(true);
    try {
      const invite = await authService.checkInvite(emailToCheck);
      if (invite) {
        setInviteOrgName(invite.org_name);
        setOrgName(''); // Clear manual org name
      } else {
        setInviteOrgName(null);
      }
    } catch (err) {
      console.error('Error checking invite', err);
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleEmailBlur = () => {
    if (isSignUp) checkInviteForEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password, fullName, orgName);
        if (result.message) {
          setSuccessMessage(result.message);
          setLoading(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      window.location.hash = '#/dashboard';
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Clipboard className="w-10 h-10 text-emerald-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Evalis</h1>
          </div>

          <h2 className="text-center text-xl font-semibold text-gray-900 mb-2">
            {isSignUp ? (inviteOrgName ? 'Join Your Team' : 'Create Account') : 'Welcome Back'}
          </h2>
          <p className="text-center text-gray-600 text-sm mb-6">
            Therapy Assessment Manager
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">Success!</h3>
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            </div>
          )}

          {inviteOrgName && isSignUp && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">Invite Found!</h3>
                <p className="text-sm text-emerald-700">
                  You have been invited to join <strong>{inviteOrgName}</strong>.
                  We've suppressed the organization creation field for you.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {!inviteOrgName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new org name"
                      required={!inviteOrgName}
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  disabled={isEmailLocked}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isEmailLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  required
                />
                {checkingInvite && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Processing...' : isSignUp ? (inviteOrgName ? `Join ${inviteOrgName}` : 'Create Account') : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setInviteOrgName(null);
              }}
              className="inline-flex items-center justify-center min-h-11 min-w-11 px-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
              <strong>Confidential System:</strong> This application contains Personal Health Information (PHI).
              Authorized access only. Designed with privacy and PHIPA/PIPEDA considerations in mind.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
