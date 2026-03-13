import { Link, Outlet } from 'react-router-dom';
import LogoutButton from './LogoutButton';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl leading-none">
                M
              </div>
              <span className="font-semibold text-xl tracking-tight text-slate-800">Meety</span>
            </div>
            
            <nav className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/profile" 
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Profile
              </Link>
              <div className="h-4 w-px bg-slate-300 mx-1"></div>
              <LogoutButton />
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
