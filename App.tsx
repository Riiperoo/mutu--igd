import React, { useState, useEffect } from 'react';
import { ViewState, PatientRecord, ThemeMode } from './types';
import { DataTable } from './components/DataTable';
import { AnalysisPanel } from './components/AnalysisPanel';
import { DashboardPanel } from './components/DashboardPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { getPatientsFromDB } from './services/googleSheets';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
      return (localStorage.getItem('sistem_rs_theme') as ThemeMode) || 'light';
  });
  
  // App Data State
  const [patientData, setPatientData] = useState<PatientRecord[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Centralized Fetch Function
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const dbData = await getPatientsFromDB();
      setPatientData(dbData);
      // Only show success notification if it's a manual refresh (checked by ensuring data exists)
      if (dbData.length >= 0) {
         // Silent success for initial load, or we can use a separate flag
      }
    } catch (error) {
      console.error("Gagal mengambil data database", error);
      showNotification("Gagal terhubung ke Google Sheets. Cek koneksi internet.");
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Refresh Handler (with notification)
  const handleManualRefresh = async () => {
      await fetchData();
      showNotification("Data berhasil disinkronisasi dengan Google Sheet.");
  };

  // Load Data from Google Sheets on Mount
  useEffect(() => {
    fetchData();
  }, []);

  // Persistence: Theme (Tetap di LocalStorage karena ini preferensi user lokal)
  useEffect(() => {
    localStorage.setItem('sistem_rs_theme', currentTheme);
    
    // Handle Dark Mode Class
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme]);

  const handlePatientUpdate = (newData: PatientRecord[]) => {
    setPatientData(newData);
  };
  
  // Helper to determine Main Background Style
  const getMainBackground = () => {
      switch(currentTheme) {
          case 'dark': return 'bg-gray-900';
          case 'glass': return 'bg-[url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop")] bg-cover bg-center bg-fixed bg-no-repeat';
          case 'color': return 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900';
          default: return 'bg-[#f8fafc]'; // Light default
      }
  };

  // Nav Item
  const NavItem = ({ view, label, icon }: { view: ViewState, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setViewState(view)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-200 group relative overflow-hidden ${
        viewState === view 
          ? 'text-white shadow-lg' 
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {viewState === view && (
         <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600"></div>
      )}
      <div className={`relative z-10 flex items-center gap-3 w-full`}>
        <div className={`${viewState === view ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-rose-500 dark:group-hover:text-rose-400'}`}>
            {icon}
        </div>
        <span className="font-medium tracking-wide text-sm">{label}</span>
        {viewState === view && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
      </div>
    </button>
  );

  return (
    <>
    {/* Global Styles for Glass/Color Modes to override Tailwind utilities locally */}
    {currentTheme === 'glass' && (
        <style>{`
            .bg-white { background-color: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(12px); }
            .dark .bg-gray-800 { background-color: rgba(31, 41, 55, 0.75) !important; backdrop-filter: blur(12px); }
            .dark .bg-gray-900 { background-color: rgba(17, 24, 39, 0.8) !important; }
            aside { background-color: rgba(255, 255, 255, 0.85) !important; backdrop-filter: blur(16px); }
            .dark aside { background-color: rgba(31, 41, 55, 0.85) !important; }
        `}</style>
    )}
    {currentTheme === 'color' && (
        <style>{`
            .bg-white { background-color: rgba(255, 255, 255, 0.9) !important; }
        `}</style>
    )}

    <div className={`min-h-screen flex font-sans overflow-hidden transition-colors duration-300 ${getMainBackground()}`}>
      {/* Sidebar */}
      <aside 
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed h-full z-30 shadow-xl transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'
        }`}
      >
        <div className="p-8 pb-4 flex justify-between items-center">
            <div className="flex items-center gap-3 mb-1">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg text-white shadow-md shadow-green-200 dark:shadow-none">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Mutu<span className="text-green-600 dark:text-green-400"> - IGD</span></span>
            </div>
        </div>
        <div className="px-8 pb-2">
           <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">Hospital Management System</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-6">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-4">Menu Utama</div>
            
            <NavItem 
                view={ViewState.DASHBOARD} 
                label="Dashboard Utama" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} 
            />

            <NavItem 
                view={ViewState.DATA_PASIEN} 
                label="Data Pelayanan" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} 
            />

            <NavItem 
                view={ViewState.REPORTS} 
                label="Laporan Lengkap" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} 
            />
            
            <NavItem 
                view={ViewState.ANALYTICS} 
                label="AI Analytics" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} 
            />

            <div className="my-2 border-t border-gray-100 dark:border-gray-700 mx-4"></div>

            <NavItem 
                view={ViewState.SETTINGS} 
                label="Pengaturan" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
            />
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-2xl border border-green-100 dark:border-gray-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-green-200 dark:bg-green-900 rounded-full opacity-50 blur-lg"></div>
                <div className="flex items-start gap-3 relative z-10">
                     <div className="bg-white dark:bg-gray-900 p-1.5 rounded-lg shadow-sm text-green-500 dark:text-green-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                     </div>
                     <div>
                        <p className="text-xs text-green-900 dark:text-gray-100 font-bold mb-0.5">Google Sheets</p>
                        <p className="text-[10px] text-green-600 dark:text-gray-400 leading-tight">Data tersinkronisasi 2 arah.</p>
                     </div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 h-screen overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-72' : 'ml-0'
        }`}
      >
        <div className="p-8 h-full flex flex-col relative">
            {/* Notification Toast */}
            {notification && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
                    <div className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 dark:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">{notification}</span>
                    </div>
                </div>
            )}

            {/* Top Bar with Toggles */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 transition-colors shadow-sm"
                        title={isSidebarOpen ? "Tutup Menu" : "Buka Menu"}
                    >
                        {isSidebarOpen ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                    {!isSidebarOpen && (
                        <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                             <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-1.5 rounded-lg text-white shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Mutu<span className="text-green-500 dark:text-green-400"> - IGD</span></span>
                        </div>
                    )}
                </div>

                {/* Theme Toggle (Quick Switch) */}
                <button
                    onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    title="Toggle Dark Mode"
                >
                    {currentTheme === 'dark' ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* View Content */}
            <div className="flex-1 overflow-hidden">
                {viewState === ViewState.DASHBOARD && (
                    <div className="h-full animate-fade-in">
                        <DashboardPanel 
                            data={{ patients: patientData }} 
                            isDarkMode={currentTheme === 'dark'} 
                            onRefresh={handleManualRefresh}
                            isLoading={isLoading}
                        />
                    </div>
                )}

                {viewState === ViewState.DATA_PASIEN && (
                    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
                        <DataTable 
                            title="Data Pelayanan Pasien"
                            description="Data tersinkronisasi 2 arah dengan Google Sheets."
                            data={patientData} 
                            onUpdate={handlePatientUpdate}
                            onNotification={showNotification}
                            onRefresh={handleManualRefresh}
                            isLoading={isLoading}
                            columns={[
                                { key: 'visual_index', label: 'NO' },
                                { key: 'tanggal', label: 'TGL' },
                                { key: 'noKib', label: 'NO. RM' },
                                { key: 'namaPasien', label: 'NAMA PASIEN' },
                                { key: 'prioritas', label: 'PRIORITAS' },
                                { key: 'dpjp', label: 'DPJP' },
                                { key: 'dokterSpesialis', label: 'SPESIALIS' },
                                { key: 'jamDatang', label: 'DATANG' },
                                { key: 'jamRespon', label: 'RESPON' },
                                { key: 'jamDokter', label: 'DR' },
                                { key: 'jamKonsul', label: 'KONSUL' },
                                { key: 'jamResponSpesialis', label: 'RESPON SP' },
                                { key: 'ket', label: 'STATUS' },
                                { key: 'ruangan', label: 'RUANGAN' },
                                { key: 'masalah', label: 'MASALAH' },
                            ]}
                        />
                    </div>
                )}

                {viewState === ViewState.REPORTS && (
                    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
                        <ReportsPanel data={{ patients: patientData }} isDarkMode={currentTheme === 'dark'} />
                    </div>
                )}

                {viewState === ViewState.ANALYTICS && (
                    <div className="h-full animate-fade-in">
                        <AnalysisPanel 
                            data={{ patients: patientData }} 
                            isDarkMode={currentTheme === 'dark'}
                        />
                    </div>
                )}

                {viewState === ViewState.SETTINGS && (
                    <SettingsPanel 
                        currentTheme={currentTheme} 
                        onThemeChange={setCurrentTheme} 
                    />
                )}
            </div>
        </div>
      </main>
    </div>
    </>
  );
};

export default App;