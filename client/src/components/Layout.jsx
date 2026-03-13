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
    <div className="min-h-screen bg-[#202124] text-gray-100 font-sans">
      <header className="bg-[#27292d] border-b border-[#3c4043] shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="bg-indigo-500 text-white p-2 rounded-lg font-bold text-xl leading-none">
                M
              </div>
              <span className="font-semibold text-xl tracking-tight text-white">Meety</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-[#3c4043] p-1.5 rounded-full transition-colors focus:outline-none"
                >
                  <img 
                    src={user?.imageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-[#3c4043] object-cover bg-indigo-500/20"
                  />
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#27292d] border border-[#3c4043] rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[#3c4043] mb-2 flex items-center gap-3">
                      <img 
                        src={user?.imageUrl} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full border border-[#3c4043]"
                      />
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-medium text-white truncate">{user?.fullName || user?.firstName || 'User'}</span>
                        <span className="text-xs text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#3c4043] hover:text-white transition-colors flex items-center gap-3"
                    >
                      <User className="w-4 h-4" />
                      Manage Profile
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#3c4043] hover:text-red-300 transition-colors flex items-center gap-3 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoading ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
