import React from 'react';
import { AppData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface DashboardPanelProps {
  data: AppData;
  isDarkMode?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ data, isDarkMode, onRefresh, isLoading }) => {
  const patients = data.patients;

  // Chart Colors based on mode
  const gridColor = isDarkMode ? "#374151" : "#f3f4f6";
  const axisColor = isDarkMode ? "#9ca3af" : "#9ca3af";
  const tooltipBg = isDarkMode ? "#1f2937" : "#ffffff";
  const tooltipText = isDarkMode ? "#f3f4f6" : "#1f2937";

  // --- Statistics Calculation ---
  const totalPatients = patients.length;
  const criticalPatients = patients.filter(p => p.prioritas === 'P1').length;
  const rawatInap = patients.filter(p => p.ket === 'Rawat Inap').length;
  
  // New stat: Total Unique Specialists
  const specialists = new Set(patients.map(p => p.dokterSpesialis).filter(s => s && s !== '-'));
  const totalSpecialists = specialists.size;

  // --- Chart Data Preparation ---
  const priorityData = ['P1', 'P2', 'P3', 'P4', 'P5'].map(p => ({
    name: p,
    value: patients.filter(pt => pt.prioritas === p).length
  }));

  const statusCounts: Record<string, number> = {};
  patients.forEach(p => {
    statusCounts[p.ket] = (statusCounts[p.ket] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key]
  }));

  const timeBins = Array(24).fill(0);
  patients.forEach(p => {
    if (p.jamDatang && p.jamDatang !== '-') {
      const hour = parseInt(p.jamDatang.split(':')[0]);
      if (!isNaN(hour)) timeBins[hour]++;
    }
  });
  const arrivalTrendData = timeBins.map((count, hour) => ({
    name: `${hour}:00`,
    pasien: count
  })).filter((_, i) => i >= 6 && i <= 22);

  // Reusable Card Component
  const StatCard = ({ title, value, icon, gradient, footer }: any) => (
    <div className={`rounded-2xl p-6 text-white shadow-lg ${gradient} transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden border border-white/10`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-90 mb-1">{title}</p>
          <h3 className="text-4xl font-bold">{value}</h3>
          {footer && <p className="text-xs mt-2 opacity-80 bg-white/20 inline-block px-2 py-1 rounded-lg">{footer}</p>}
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto pr-2 pb-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Eksekutif</h2>
          <p className="text-gray-500 dark:text-gray-400">Ringkasan operasional dan statistik real-time.</p>
        </div>
        
        {onRefresh && (
            <button 
                onClick={onRefresh}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isLoading ? 'Menyinkronkan...' : 'Sinkronisasi Data'}
            </button>
        )}
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Pasien" 
          value={totalPatients} 
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          footer="Hari ini"
        />
        <StatCard 
          title="Gawat Darurat (P1)" 
          value={criticalPatients} 
          gradient="bg-gradient-to-br from-rose-500 to-pink-600 dark:from-rose-600 dark:to-pink-800"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          footer="Perlu penanganan segera"
        />
        <StatCard 
          title="Rawat Inap" 
          value={rawatInap} 
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          footer={`${Math.round((rawatInap/totalPatients)*100 || 0)}% dari total`}
        />
        <StatCard 
          title="Jenis Spesialis" 
          value={totalSpecialists} 
          gradient="bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-800"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          footer="Layanan Spesialis Aktif"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Priority Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-rose-500 rounded-full"></span>
            Distribusi Prioritas Pasien
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={axisColor} />
                <YAxis tickLine={false} axisLine={false} stroke={axisColor} />
                <Tooltip 
                    cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}} 
                    contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px', border: `1px solid ${gridColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'}} 
                />
                <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40}>
                   {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#64748b'][index % 5]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
            Status Akhir Pelayanan
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke={isDarkMode ? '#1f2937' : '#fff'}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                     contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px', border: `1px solid ${gridColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'}} 
                />
              </PieChart>
            </ResponsiveContainer>
             <div className="ml-4 space-y-2">
                {statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span>{entry.name}: {entry.value}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Arrival Trend Area Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 transition-colors">
           <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
            Tren Kedatangan Pasien (Jam)
          </h3>
           <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={arrivalTrendData}>
                <defs>
                  <linearGradient id="colorPasien" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={axisColor} />
                <YAxis tickLine={false} axisLine={false} stroke={axisColor} />
                <Tooltip 
                    contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px', border: `1px solid ${gridColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'}} 
                />
                <Area type="monotone" dataKey="pasien" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPasien)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};