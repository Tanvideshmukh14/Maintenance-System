import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Wrench } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { User } from '../types';

interface NavbarProps {
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 dark:border-white/5 sticky top-0 z-30 font-sans shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Brand */}
        <Link to={dashboardPath} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
            <Wrench size={20} />
          </div>
          <span className="font-bold text-foreground text-xl tracking-tight">
            Maintenance.sys
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col justify-center px-4 border-r border-border h-10 hidden sm:flex">
             <span className="text-sm font-semibold leading-none">{user.name}</span>
             <span className="text-xs font-medium text-muted-foreground mt-1 leading-none capitalize">{user.role}</span>
          </div>
          
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
