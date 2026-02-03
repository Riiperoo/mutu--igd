import React, { useState } from 'react';
import { AppData, AnalysisResult } from '../types';
import { analyzeData } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnalysisPanelProps {
  data: AppData;
  isDarkMode?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data, isDarkMode }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const analysis = await analyzeData(data, query);
      setResult(analysis);
    } catch (e) {
      console.error(e);
      setResult({ answer: "Terjadi kesalahan koneksi. Silakan coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  // Hospital specific suggestions
  const suggestions = [
    "Berapa jumlah pasien berdasarkan prioritas (P1, P2, P3)?",
    "Dokter (DPJP) mana yang menangani pasien terbanyak?",
    "Apa masalah yang paling sering muncul hari ini?",
    "Analisis rata-rata waktu tunggu pasien sebelum bertemu dokter."
  ];

  const renderChart = () => {
    if (!result?.chartData || !result.chartType) return null;

    // Determine Chart Colors based on mode
    const gridColor = isDarkMode ? "#374151" : "#e5e7eb";
    const axisColor = isDarkMode ? "#9ca3af" : "#9ca3af";
    const tooltipBg = isDarkMode ? "#1f2937" : "#ffffff";
    const tooltipText = isDarkMode ? "#f3f4f6" : "#1f2937";

    const CommonTooltip = () => (
      <Tooltip 
        contentStyle={{ backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px', border: `1px solid ${gridColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
      />
    );

    return (
      <div className="h-80 w-full mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">{result.chartTitle || "Visualisasi Data"}</h3>
        <ResponsiveContainer width="100%" height="100%">
          {result.chartType === 'line' ? (
            <LineChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} tickFormatter={(value) => `${value}`} />
              <CommonTooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          ) : result.chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={result.chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                stroke={isDarkMode ? '#1f2937' : '#fff'}
              >
                {result.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <CommonTooltip />
            </PieChart>
          ) : (
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} tickFormatter={(value) => `${value}`} />
              <CommonTooltip />
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex-1 flex flex-col transition-colors">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Analisis Kinerja Rumah Sakit</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Tanyakan mengenai data pasien, waktu respon, atau kendala operasional.</p>
        </div>

        {/* Chat Output Area */}
        <div className="flex-1 overflow-y-auto mb-6 px-4">
            {result && (
                <div className="animate-fade-in-up">
                    <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-2">Hasil Analisis</h4>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{result.answer}</p>
                        {renderChart()}
                    </div>
                </div>
            )}
            
            {!result && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {suggestions.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => { setQuery(s); handleAnalyze(); }}
                            className="p-4 text-left text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-800 border border-transparent rounded-xl transition-all"
                        >
                            "{s}"
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 dark:border-red-400 mb-4"></div>
                    <p className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Sedang menganalisis data medis...</p>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="relative">
            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Contoh: Bagaimana distribusi pasien rawat inap vs rawat jalan?"
                className="w-full pl-4 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-gray-600 transition-all resize-none shadow-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows={2}
            />
            <button 
                onClick={handleAnalyze}
                disabled={loading || !query.trim()}
                className="absolute right-3 bottom-3 p-2 bg-red-600 dark:bg-red-500 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};