import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { loginUser } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await loginUser({ email, password });
      
      localStorage.setItem('user', JSON.stringify(res.user));
      localStorage.setItem('token', res.token);
      
      navigate(res.user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for quick demo logins
  const autoFill = (role: 'employee' | 'admin') => {
    setEmail(role === 'employee' ? 'john@example.com' : 'admin@example.com');
    setPassword(role === 'employee' ? 'password123' : 'admin123');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="text-xl font-bold tracking-tight">Maintenance.sys</span>
        </div>
        <button 
          onClick={toggle} 
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 flex-col lg:flex-row relative z-10">
        {/* Left — brand panel */}
        <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-border/50 bg-card/40 backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider mb-8 flex items-center gap-2 uppercase">
              <span className="w-8 h-1 rounded-full bg-primary inline-block"></span> INTERNAL PORTAL v2.0
            </p>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Track.<br />Assign.<br />Resolve.
            </h1>
            <p className="text-lg font-medium text-muted-foreground max-w-md">
              A unified platform for logging, tracking, and escalating maintenance requests across your organization. Built to perform.
            </p>
          </div>

          <div className="mt-12">
            <div className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm tracking-wider border border-primary/20 shadow-sm shadow-primary/5 uppercase">
              System Online
            </div>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 bg-background/20 relative overflow-hidden">
          
          <div className="w-full max-w-md relative z-10">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Sign In</h2>
              <p className="text-sm font-medium text-muted-foreground">Enter your credentials to access the portal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive font-medium text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold tracking-wide text-foreground">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full p-4 rounded-xl border border-border/50 bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold tracking-wide text-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full p-4 pr-12 rounded-xl border border-border/50 bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wider">Demo Access</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => autoFill('employee')}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border/50 bg-card/40 hover:bg-card/80 transition-colors shadow-sm"
                >
                  Fill Employee
                </button>
                <button 
                  onClick={() => autoFill('admin')}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border/50 bg-card/40 hover:bg-card/80 transition-colors shadow-sm"
                >
                  Fill Admin
                </button>
              </div>
            </div>
          </div>

          {/* Decorative background text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] font-bold text-primary/5 pointer-events-none whitespace-nowrap z-0 select-none">
            ACCESS
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
