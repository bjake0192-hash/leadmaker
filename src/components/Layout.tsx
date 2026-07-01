import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search, History, Menu, X } from 'lucide-react';

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const isActive = (path: string) => {
    return location.pathname === path 
      ? 'bg-blue-600/10 text-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
      : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all duration-300">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-slate-900 font-bold text-xl tracking-tight">OpenLead</span>
              </Link>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-2">
                  <Link
                    to="/"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive('/')}`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/history"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive('/history')}`}
                  >
                    History
                  </Link>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={toggleMenu}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 focus:outline-none transition-colors duration-200"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/"
                className={`block px-4 py-2 rounded-xl text-base font-semibold ${isActive('/')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/history"
                className={`block px-4 py-2 rounded-xl text-base font-semibold ${isActive('/history')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                History
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center group">
              <div className="h-6 w-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                <Search className="h-3 w-3 text-white" />
              </div>
              <span className="ml-2 text-slate-900 font-bold text-sm tracking-tight">OpenLead</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} OpenLead. Built for high-performance lead generation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
