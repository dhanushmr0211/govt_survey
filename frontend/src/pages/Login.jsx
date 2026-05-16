import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

const loginApi = async (email, password) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await loginApi(email, password);
      setUser(data.user);
      setToken(data.token);
      // Clear React Query cache to force fresh data from server
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-900">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/login_bg.png")',
          filter: 'brightness(0.4)'
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] p-4">
        <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 ring-1 ring-white/10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 mb-5 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              <img src="/logo.png" alt="GovtSurvey Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-black text-white drop-shadow-2xl tracking-tighter">GovtSurvey</h1>
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
                className="w-full px-5 py-4 rounded-2xl border border-white/10 focus:border-white/40 focus:ring-4 focus:ring-white/5 transition-all text-sm outline-none bg-transparent text-white placeholder:text-white/20 shadow-sm" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@govtsurvey.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/50 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="w-full px-5 py-4 rounded-2xl border border-white/10 focus:border-white/40 focus:ring-4 focus:ring-white/5 transition-all text-sm outline-none bg-transparent text-white placeholder:text-white/20 shadow-sm" 
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

            <button 
              type="submit" 
              className="w-full bg-white text-slate-900 font-black py-4.5 rounded-2xl shadow-2xl hover:bg-white/90 transition-all active:scale-[0.96] flex items-center justify-center gap-3 mt-6 text-sm uppercase tracking-widest disabled:opacity-50"
              disabled={loading}
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
              <span className="text-white/10">v2.0.4-Stable</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
