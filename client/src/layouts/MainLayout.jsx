import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TwinAssistantProvider from '../components/voice/TwinAssistantProvider';

function MainLayout() {
  const location = useLocation();
  const hasDashboardHeader = location.pathname === '/dashboard';

  return (
    <main className="h-screen overflow-hidden bg-[#edf4f7] text-zinc-950">
      <div className="flex h-screen">
        <Sidebar />
        <TwinAssistantProvider>
          <section className="h-screen min-w-0 flex-1 overflow-y-auto">
            {!hasDashboardHeader && <Navbar />}
            <Outlet />
          </section>
        </TwinAssistantProvider>
      </div>
    </main>
  );
}

export default MainLayout;
