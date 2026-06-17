import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TwinAssistantProvider from '../components/voice/TwinAssistantProvider';

function MainLayout() {
  const location = useLocation();
  const hasDashboardHeader = location.pathname === '/dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <main className="h-screen overflow-hidden overflow-x-hidden bg-[#edf4f7] text-zinc-950 flex relative">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <TwinAssistantProvider>
        <section className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {!hasDashboardHeader && <Navbar setMobileMenuOpen={setMobileMenuOpen} />}
          <Outlet />
        </section>
      </TwinAssistantProvider>
    </main>
  );
}

export default MainLayout;
