import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

const loginApi = async (email, password, acceptedTerms) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, accepted_terms: acceptedTerms })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Login failed: ${res.status}`);
    return data;
  } catch (err) {
    console.error('[Login API] Error:', err);
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error(`Network error - cannot reach ${API_BASE_URL}. Check your connection and API URL.`);
    }
    throw err;
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedConsent, setAcceptedConsent] = useState(true);
  const showConsentCheckbox = true;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    // Unregister any cached service workers that might be causing issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          reg.unregister();
        });
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await loginApi(email, password, acceptedConsent);
      setUser(data.user);
      setToken(data.token);

      if (acceptedConsent) {
        localStorage.setItem('has_accepted_legal', 'true');
      }

      // Clear React Query cache to force fresh data from server
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/dashboard');
    } catch (err) {
      console.error('[Login] Error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/login_bg.png")',
          filter: 'brightness(0.6)'
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] p-4">
        <div className="bg-black/10 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] border border-white/10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 mb-5 rounded-full overflow-hidden shadow-2xl border border-white/20">
              <img src="/logo.png" alt="PR ELECTRICALS Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-black text-white drop-shadow-2xl tracking-tighter">PR ELECTRICALS</h1>
            <p className="text-white/60 text-xs mt-2 font-bold uppercase tracking-[0.2em] drop-shadow-sm">Tracking Portal</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 text-white text-[13px] p-4 rounded-2xl mb-8 flex items-start gap-3 shadow-lg">
              <div className="mt-0.5">⚠️</div>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/50 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                className="w-full px-5 py-4 rounded-2xl border border-white/15 focus:border-white/40 focus:ring-4 focus:ring-white/5 transition-all text-sm outline-none bg-transparent text-white placeholder:text-white/20 shadow-sm" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="EMAIL_ADDRESS"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/50 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="w-full px-5 py-4 rounded-2xl border border-white/15 focus:border-white/40 focus:ring-4 focus:ring-white/5 transition-all text-sm outline-none bg-transparent text-white placeholder:text-white/20 shadow-sm" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {showConsentCheckbox && (
              <div className="flex items-start gap-3 select-none ml-1 mt-6">
                <input 
                  type="checkbox" 
                  id="consent_checkbox" 
                  checked={acceptedConsent} 
                  onChange={(e) => setAcceptedConsent(e.target.checked)} 
                  required
                  className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/20 accent-primary cursor-pointer mt-0.5"
                />
                <label htmlFor="consent_checkbox" className="text-xs text-white/60 leading-normal cursor-pointer">
                  I have read and agree to the{' '}
                  <Link to="/privacy-policy" className="text-white hover:underline font-bold">Privacy Policy</Link>
                  {' '}and{' '}
                  <Link to="/terms-conditions" className="text-white hover:underline font-bold">Terms & Conditions</Link>.
                </label>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-white/[0.04] border border-white/20 text-white font-black py-4.5 rounded-2xl shadow-xl hover:bg-white/10 hover:border-white/40 transition-all active:scale-[0.96] flex items-center justify-center gap-3 mt-6 text-sm uppercase tracking-widest disabled:opacity-50"
              disabled={loading || (showConsentCheckbox && !acceptedConsent)}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                "Access Portal"
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.3em] leading-relaxed">
              Secure Cloud <br/> 
              <span className="text-white/10">{__APP_VERSION__}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-white/40 space-y-2 select-none w-full">
          <div className="flex justify-center gap-3">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span>|</span>
            <Link to="/contact-us" className="hover:text-white transition-colors">Contact Us</Link>
          </div>
          <p>© {new Date().getFullYear()} PR Electricals. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
