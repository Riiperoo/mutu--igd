import React, { useState, useRef } from 'react';
import { PatientRecord, AppData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportsPanelProps {
  data: AppData;
  isDarkMode?: boolean;
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ data, isDarkMode }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'dashboard'>('table');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // --- Filtering Logic ---
  const filteredPatients = data.patients.filter(p => {
    const matchesStartDate = startDate ? p.tanggal >= startDate : true;
    const matchesEndDate = endDate ? p.tanggal <= endDate : true;
    const matchesSearch = searchTerm 
      ? p.namaPasien.toLowerCase().includes(searchTerm.toLowerCase()) || p.noKib.includes(searchTerm)
      : true;
    return matchesStartDate && matchesEndDate && matchesSearch;
  });

  // --- Statistics Calculation for Report Dashboard ---
  const totalPatients = filteredPatients.length;
  const criticalPatients = filteredPatients.filter(p => p.prioritas === 'P1').length;
  const rawatInap = filteredPatients.filter(p => p.ket === 'Rawat Inap').length;
  const rawatJalan = filteredPatients.filter(p => p.ket === 'Rawat Jalan').length;
  
  const priorityData = ['P1', 'P2', 'P3', 'P4', 'P5'].map(p => ({
    name: p,
    value: filteredPatients.filter(pt => pt.prioritas === p).length
  }));

  const statusCounts: Record<string, number> = {};
  filteredPatients.forEach(p => {
    statusCounts[p.ket] = (statusCounts[p.ket] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key]
  }));

  const timeBins = Array(24).fill(0);
  filteredPatients.forEach(p => {
    if (p.jamDatang && p.jamDatang !== '-') {
      const hour = parseInt(p.jamDatang.split(':')[0]);
      if (!isNaN(hour)) timeBins[hour]++;
    }
  });
  const arrivalTrendData = timeBins.map((count, hour) => ({
    name: `${hour}:00`,
    pasien: count
  })).filter((_, i) => i >= 6 && i <= 22);

  // --- Chart Style Helpers ---
  const gridColor = isDarkMode ? "#374151" : "#e5e7eb";
  const axisColor = isDarkMode ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDarkMode ? "#1f2937" : "#ffffff";
  const tooltipText = isDarkMode ? "#f3f4f6" : "#1f2937";

  const allColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'noKib', label: 'No. RM' },
    { key: 'namaPasien', label: 'Nama Pasien' },
    { key: 'prioritas', label: 'Triage' },
    { key: 'dpjp', label: 'DPJP' },
    { key: 'dokterSpesialis', label: 'Spesialis' },
    { key: 'jamDatang', label: 'Jam Dtg' },
    { key: 'jamRespon', label: 'Respon' },
    { key: 'jamDokter', label: 'Jam Dr' },
    { key: 'jamKonsul', label: 'Konsul' },
    { key: 'jamResponSpesialis', label: 'Jam Respon Spesialis' },
    { key: 'ket', label: 'Status' },
    { key: 'ruangan', label: 'Ruangan' },
    { key: 'masalah', label: 'Catatan/Masalah' },
  ];

  // --- Handlers ---
  const handleFullExportExcel = () => {
    if (filteredPatients.length === 0) return;

    const tableHeader = allColumns.map(c => `<th style="background-color: #be123c; color: white; border: 1px solid #000;">${c.label}</th>`).join('');
    const tableRows = filteredPatients.map(row => {
      return `<tr>${allColumns.map(c => `<td style="border: 1px solid #000; padding: 5px;">${row[c.key as keyof PatientRecord] || '-'}</td>`).join('')}</tr>`;
    }).join('');

    const periodLabel = startDate || endDate 
        ? `${startDate || 'Awal'} s.d. ${endDate || 'Akhir'}`
        : 'Semua Periode';
    
    const filenameLabel = startDate || endDate
        ? `${startDate || 'Awal'}_sd_${endDate || 'Akhir'}`
        : 'Semua_Periode';

    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8" /></head>
        <body>
          <h2>LAPORAN PELAYANAN PASIEN IGD & RAWAT JALAN</h2>
          <p>Periode: ${periodLabel}</p>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <table border="1">
            <thead><tr>${tableHeader}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.body.appendChild(document.createElement('a'));
    link.href = window.URL.createObjectURL(blob);
    link.download = `Laporan_Lengkap_RS_${filenameLabel}.xls`;
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-dashboard-area');
    if (!element) return;

    setIsDownloading(true);

    try {
        // Gunakan html2canvas untuk mengambil gambar dari elemen
        const canvas = await html2canvas(element, {
            scale: 2, // Meningkatkan resolusi agar teks tajam
            useCORS: true, // Untuk menghandle gambar external jika ada
            backgroundColor: isDarkMode ? '#111827' : '#ffffff', // Sesuaikan background dengan mode
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Setup PDF (A4 Portrait)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Hitung rasio agar gambar muat di A4
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10; // Margin atas

        // Tambahkan gambar ke PDF (Fit to width A4)
        // Kita menggunakan width penuh A4 (dikurangi margin) dan height menyesuaikan rasio
        const finalWidth = pdfWidth - 20; // 10mm margin kiri kanan
        const finalHeight = (imgHeight * finalWidth) / imgWidth;

        pdf.addImage(imgData, 'PNG', 10, 10, finalWidth, finalHeight);
        
        const filenameLabel = startDate || endDate
            ? `${startDate || 'Awal'}_sd_${endDate || 'Akhir'}`
            : 'Semua_Periode';
            
        pdf.save(`Laporan_Dashboard_IGD_${filenameLabel}.pdf`);

    } catch (err) {
        console.error("Gagal generate PDF:", err);
        alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Laporan Rekapitulasi Pelayanan</h2>
          <p className="text-gray-500 dark:text-gray-400">Tampilan data komprehensif untuk audit dan pelaporan bulanan.</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex text-xs font-bold">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}`}
                >
                    TABEL DATA
                </button>
                <button 
                    onClick={() => setViewMode('dashboard')}
                    className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow text-rose-600 dark:text-rose-300' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}`}
                >
                    VISUALISASI DASHBOARD
                </button>
            </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dari Tanggal</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 w-full md:w-auto"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sampai Tanggal</label>
          <input 
            type="date" 
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 w-full md:w-auto"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cari Pasien / No. RM</label>
          <input 
            type="text" 
            placeholder="Ketik nama atau nomor rekam medis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <button 
          onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors"
        >
          Reset Filter
        </button>
      </div>

      {/* VIEW: TABLE */}
      {viewMode === 'table' && (
        <>
            <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleFullExportExcel}
                    disabled={filteredPatients.length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    EKSPOR EXCEL (TABEL)
                </button>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-bold text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">No</th>
                        {allColumns.map(col => (
                        <th key={col.key} className="p-3 border-b border-gray-200 dark:border-gray-600 font-bold text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">
                            {col.label}
                        </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredPatients.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 font-medium text-gray-400">{idx + 1}</td>
                        {allColumns.map(col => (
                            <td key={col.key} className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {p[col.key as keyof PatientRecord] || '-'}
                            </td>
                        ))}
                        </tr>
                    ))}
                    {filteredPatients.length === 0 && (
                        <tr>
                        <td colSpan={18} className="p-10 text-center text-gray-400 italic">Data tidak ditemukan untuk filter ini.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">Menampilkan {filteredPatients.length} dari {data.patients.length} total data.</span>
                <span className="text-[10px] text-gray-400 italic">Gunakan scroll horizontal untuk melihat semua kolom.</span>
                </div>
            </div>
        </>
      )}

      {/* VIEW: DASHBOARD SUMMARY (Printable) */}
      {viewMode === 'dashboard' && (
         <div className="flex-1 overflow-y-auto">
             <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleDownloadPDF}
                    disabled={filteredPatients.length === 0 || isDownloading}
                    className={`flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 ${isDownloading ? 'cursor-not-allowed opacity-75' : ''}`}
                >
                    {isDownloading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            MEMPROSES PDF...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            DOWNLOAD PDF
                        </>
                    )}
                </button>
             </div>

             <div id="printable-dashboard-area" className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                {/* Printable Header */}
                <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Laporan Eksekutif Pelayanan</h1>
                    <div className="flex items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
                        <p>Periode: <span className="font-semibold text-gray-800 dark:text-white">{startDate || 'Awal'}</span> s.d. <span className="font-semibold text-gray-800 dark:text-white">{endDate || 'Akhir'}</span></p>
                        <span>|</span>
                        <p>Total Data: <span className="font-semibold text-gray-800 dark:text-white">{filteredPatients.length} Pasien</span></p>
                    </div>
                </div>

                {filteredPatients.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">Silakan pilih filter tanggal untuk menampilkan data visual.</div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-center">
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">Total Pasien</p>
                                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-1">{totalPatients}</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-center">
                                <p className="text-xs text-red-600 dark:text-red-400 uppercase font-bold">Gawat Darurat (P1)</p>
                                <p className="text-3xl font-bold text-red-800 dark:text-red-200 mt-1">{criticalPatients}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-center">
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold">Rawat Inap</p>
                                <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">{rawatInap}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg text-center">
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold">Rawat Jalan</p>
                                <p className="text-3xl font-bold text-indigo-800 dark:text-indigo-200 mt-1">{rawatJalan}</p>
                            </div>
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="chart-container">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Distribusi Prioritas (Triage)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={priorityData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={axisColor} />
                                            <YAxis tickLine={false} axisLine={false} stroke={axisColor} />
                                            <Tooltip contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px'}} />
                                            <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40}>
                                                {priorityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#64748b'][index % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="chart-container">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Status Akhir Pasien</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                stroke={isDarkMode ? '#1f2937' : '#fff'}
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="chart-container">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Tren Kunjungan Berdasarkan Jam</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={arrivalTrendData}>
                                        <defs>
                                        <linearGradient id="colorPasienReport" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={axisColor} />
                                        <YAxis tickLine={false} axisLine={false} stroke={axisColor} />
                                        <Tooltip contentStyle={{backgroundColor: tooltipBg, color: tooltipText, borderRadius: '8px'}} />
                                        <Area type="monotone" dataKey="pasien" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPasienReport)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
             </div>
         </div>
      )}
    </div>
  );
};