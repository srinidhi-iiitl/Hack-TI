/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const DashboardSyncContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function DashboardSyncProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const cached = localStorage.getItem('digitalTwinDashboardData');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);
  const fetchSequenceRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    const requestId = fetchSequenceRef.current + 1;
    fetchSequenceRef.current = requestId;
    setIsLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { _t: Date.now() },
      });
      if (requestId === fetchSequenceRef.current && response.data.success) {
        setDashboardData(response.data.data);
        localStorage.setItem('digitalTwinDashboardData', JSON.stringify(response.data.data));
      }
    } catch (e) {
      console.error('DashboardSyncContext fetch error:', e);
    } finally {
      if (requestId === fetchSequenceRef.current) setIsLoading(false);
    }
  }, []);

  // Sync when notifications or updates occur
  useEffect(() => {
    const initialFetchTimer = window.setTimeout(fetchDashboard, 0);

    const handleUpdate = (event) => {
      if (event?.detail?.streak) {
        setDashboardData((current) => {
          const next = {
            ...(current || {}),
            streak: event.detail.streak,
            profile: {
              ...(current?.profile || {}),
              ...event.detail.streak,
            },
          };
          localStorage.setItem('digitalTwinDashboardData', JSON.stringify(next));
          return next;
        });
      }
      fetchDashboard();
    };
    window.addEventListener('daily-update-completed', handleUpdate);
    window.addEventListener('upload-history-updated', handleUpdate);
    window.addEventListener('dashboard-data-updated', handleUpdate);
    window.addEventListener('gamification-updated', handleUpdate);

    return () => {
      window.clearTimeout(initialFetchTimer);
      window.removeEventListener('daily-update-completed', handleUpdate);
      window.removeEventListener('upload-history-updated', handleUpdate);
      window.removeEventListener('dashboard-data-updated', handleUpdate);
      window.removeEventListener('gamification-updated', handleUpdate);
    };
  }, [fetchDashboard]);

  // Connect WebSockets for real-time pushing
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const newSocket = io(API_BASE_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('[DashboardSyncContext] Socket connected');
    });

    newSocket.on('dashboard:sync', (data) => {
      console.log('[DashboardSyncContext] Real-time dashboard sync received:', data);
      setDashboardData(data);
      localStorage.setItem('digitalTwinDashboardData', JSON.stringify(data));
      
      // Notify other legacy window event listeners
      window.dispatchEvent(new CustomEvent('dashboard-synced', { detail: data }));
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = {
    dashboardData,
    setDashboardData,
    isLoading,
    refreshDashboard: fetchDashboard,
  };

  return (
    <DashboardSyncContext.Provider value={value}>
      {children}
    </DashboardSyncContext.Provider>
  );
}

export function useDashboardSync() {
  const ctx = useContext(DashboardSyncContext);
  if (!ctx) throw new Error('useDashboardSync must be used inside <DashboardSyncProvider>');
  return ctx;
}

export default DashboardSyncContext;
