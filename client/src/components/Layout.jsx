import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { useLogout } from '../hooks/useLogout';
import { ChevronDown, User, LogOut } from 'lucide-react';

export default function Layout() {
  const { user } = useUser();
  const { logout, isLoading } = useLogout();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-gray-100 font-sans relative">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="pt-6 px-4 sm:px-6 lg:px-8 z-50 sticky top-0 mx-auto w-full max-w-6xl">
        <header className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl">
          <div className="px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-xl shadow-lg border border-white/10 font-bold text-xl leading-none">
                  M
                </div>
                <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Meety</span>
              </Link>

              <nav className="flex items-center gap-6">
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group"
                >
                  Dashboard
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all group-hover:w-full"></span>
                </Link>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 hover:bg-white/5 p-1 pl-3 rounded-full transition-colors border border-transparent hover:border-white/10 focus:outline-none"
                  >
                    <span className="text-sm font-medium text-gray-300 hidden sm:block">
                      {user?.firstName || 'Account'}
                    </span>
                    <img
                      src={user?.imageUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border border-white/20 shadow-sm object-cover bg-indigo-500/20"
                    />
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="px-5 py-4 border-b border-white/5 mb-2 flex items-center gap-4">
                        <img
                          src={user?.imageUrl}
                          alt="Profile"
                          className="w-12 h-12 rounded-full border border-white/10 shadow-inner"
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-semibold text-white truncate">{user?.fullName || user?.firstName || 'User'}</span>
                          <span className="text-xs text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                        </div>
                      </div>
                      
                      <div className="px-2">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/profile');
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-3"
                        >
                          <User className="w-4 h-4 text-indigo-400" />
                          Manage Profile
                        </button>

                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            logout();
                          }}
                          disabled={isLoading}
                          className="w-full text-left px-3 py-2.5 mt-1 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          {isLoading ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </header>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <Outlet />
      </main>

      <footer className="w-full bg-slate-900/40 backdrop-blur-xl border-t border-white/10 mt-auto relative z-10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500 text-white p-1.5 rounded-lg font-bold text-sm leading-none opacity-50">M</div>
              <p className="text-gray-500 text-sm font-medium">
                © {new Date().getFullYear()} Meety. All rights reserved.
              </p>
            </div>
            
            <div className="flex items-center gap-8">
              <Link to="/privacy" className="text-sm font-medium text-gray-400 hover:text-indigo-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm font-medium text-gray-400 hover:text-indigo-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="/feedback" className="text-sm font-medium text-gray-400 hover:text-indigo-400 transition-colors">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
