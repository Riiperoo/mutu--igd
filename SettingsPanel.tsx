import React, { useState, useEffect } from 'react';
import { ThemeMode } from '../types';
import { DEFAULT_SHEET_URL } from '../services/googleSheets';

interface SettingsPanelProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ currentTheme, onThemeChange }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('GOOGLE_SHEET_URL');
    if (savedUrl) {
        setSheetUrl(savedUrl);
    } else if (DEFAULT_SHEET_URL) {
        setSheetUrl(DEFAULT_SHEET_URL);
    }
  }, []);

  const handleSaveUrl = () => {
    localStorage.setItem('GOOGLE_SHEET_URL', sheetUrl.trim());
    if (confirm("URL berhasil disimpan. Aplikasi perlu dimuat ulang untuk menerapkan koneksi database baru. Muat ulang sekarang?")) {
        window.location.reload();
    }
  };

  const handleClearUrl = () => {
     if(confirm("Ini akan menghapus pengaturan manual. Jika ada URL default yang tertanam di kode, aplikasi akan menggunakannya. Lanjutkan?")) {
         localStorage.removeItem('GOOGLE_SHEET_URL');
         // If there is a default URL, revert to it in the UI, otherwise clear
         setSheetUrl(DEFAULT_SHEET_URL || '');
         window.location.reload();
     }
  };

  const themes: { id: ThemeMode; label: string; description: string; previewClass: string }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Tampilan standar yang bersih dan terang.',
      previewClass: 'bg-gray-100 border-gray-200'
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Nyaman di mata untuk penggunaan malam hari.',
      previewClass: 'bg-gray-800 border-gray-700'
    },
    {
      id: 'glass',
      label: 'Glassmorphism',
      description: 'Efek transparan modern dengan latar belakang blur.',
      previewClass: 'bg-gradient-to-br from-blue-400 to-purple-500'
    },
    {
      id: 'color',
      label: 'Color Mode',
      description: 'Nuansa gradasi warna cerah dan energik.',
      previewClass: 'bg-gradient-to-r from-rose-400 to-orange-400'
    }
  ];

  const appScriptCode = `
// --- UPDATE SCRIPT INI DI GOOGLE APPS SCRIPT ---
// Revisi: Menggunakan getDisplayValues() agar format waktu (14:30) tidak berubah jadi tanggal aneh.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Data');
    
    // Buat Sheet 'Data' jika belum ada
    if (!sheet) {
      sheet = doc.insertSheet('Data');
      // Header row
      sheet.appendRow(["id", "no", "tanggal", "noKib", "namaPasien", "prioritas", "jamDatang", "jamDokter", "dpjp", "dokterSpesialis", "jamKonsul", "jamRespon", "jamResponSpesialis", "ket", "ruangan", "masalah", "createdAt"]);
    }

    var params = e.parameter;
    var action = params.action;
    var result = {};

    if (action == 'create') {
      var data = JSON.parse(params.data);
      // Pastikan format data sesuai urutan header
      var row = [
        data.id, 
        data.no || 0, 
        data.tanggal, 
        data.noKib, 
        data.namaPasien, 
        data.prioritas,
        data.jamDatang, 
        data.jamDokter, 
        data.dpjp, 
        data.dokterSpesialis, 
        data.jamKonsul, 
        data.jamRespon, 
        data.jamResponSpesialis, 
        data.ket, 
        data.ruangan, 
        data.masalah, 
        new Date() // createdAt
      ];
      sheet.appendRow(row);
      result = { status: 'success', id: data.id };
    } 
    
    else if (action == 'read') {
      // PENTING: Gunakan getDisplayValues() bukan getValues()
      // Ini memastikan waktu '14:30' terbaca sebagai string "14:30", bukan objek Date 1899.
      var rows = sheet.getDataRange().getDisplayValues();
      var data = [];
      
      // Jika hanya ada header atau kosong, return empty array
      if (rows.length > 1) {
        var headers = rows[0];
        // Mulai dari baris 1 (skip header)
        for (var i = 1; i < rows.length; i++) {
          var rowData = {};
          for (var j = 0; j < headers.length; j++) {
            // Mapping value ke key berdasarkan header
            rowData[headers[j]] = rows[i][j];
          }
          data.push(rowData);
        }
      }
      result = data;
    }
    
    else if (action == 'update') {
      var data = JSON.parse(params.data);
      var rows = sheet.getDataRange().getValues(); // Untuk pencarian ID, getValues lebih aman
      var idFound = false;
      
      // Cari ID (Kolom A / Index 0)
      for (var i = 1; i < rows.length; i++) {
        // Konversi ke String untuk perbandingan aman
        if (String(rows[i][0]) === String(data.id)) {
           var rowIndex = i + 1; // 1-based index untuk Sheet API
           
           // Update kolom 1 s/d 16 (kecuali createdAt di kolom 17)
           var updateValues = [[
             data.id, 
             data.no || rows[i][1], 
             data.tanggal, 
             data.noKib, 
             data.namaPasien, 
             data.prioritas,
             data.jamDatang, 
             data.jamDokter, 
             data.dpjp, 
             data.dokterSpesialis, 
             data.jamKonsul, 
             data.jamRespon, 
             data.jamResponSpesialis, 
             data.ket, 
             data.ruangan, 
             data.masalah
           ]];
           
           sheet.getRange(rowIndex, 1, 1, 16).setValues(updateValues);
           idFound = true;
           break;
        }
      }
      result = { status: idFound ? 'success' : 'warning' };
    }
    
    else if (action == 'delete') {
      var id = params.id;
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      result = { status: 'success' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  return (
    <div className="h-full flex flex-col animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pengaturan Aplikasi</h2>
        <p className="text-gray-500 dark:text-gray-400">Kelola tampilan dan koneksi database.</p>
      </div>

      <div className="space-y-8">
        {/* DATABASE CONFIGURATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start gap-4 mb-6">
                 <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Integrasi Database</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Hubungkan aplikasi dengan Google Sheets untuk kolaborasi real-time. Jika dikosongkan, aplikasi akan menggunakan <span className="font-semibold text-rose-500">Penyimpanan Lokal (Browser)</span>.
                    </p>
                    {DEFAULT_SHEET_URL && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold">
                            ✓ URL Default Terdeteksi (Hardcoded di kode program)
                        </p>
                    )}
                 </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Google Apps Script URL (Web App)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                            placeholder={DEFAULT_SHEET_URL || "https://script.google.com/macros/s/..."}
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                        <button 
                            onClick={handleSaveUrl}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all"
                        >
                            Simpan
                        </button>
                        {sheetUrl && (
                             <button 
                                onClick={handleClearUrl}
                                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-bold transition-all"
                                title="Reset ke Default / Mode Lokal"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="pt-2">
                     <button 
                        onClick={() => setShowScript(!showScript)}
                        className="text-sm text-rose-600 dark:text-rose-400 font-medium hover:underline flex items-center gap-1"
                     >
                        {showScript ? 'Sembunyikan Panduan & Kode Script (Update)' : 'Lihat Panduan & Kode Script Google Sheet'}
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${showScript ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                     </button>

                     {showScript && (
                         <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden animate-fade-in">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Code Snippet (Apps Script)</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(appScriptCode)}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                                >
                                    Copy Code
                                </button>
                             </div>
                             <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-thin scrollbar-thumb-gray-600">
                                {appScriptCode}
                             </pre>
                             <div className="mt-4 text-xs text-gray-400 space-y-1">
                                <p className="font-bold text-white">Panduan Update Script (PENTING):</p>
                                <ol className="list-decimal pl-4 space-y-1">
                                    <li>Buka Google Sheet > Extensions > Apps Script.</li>
                                    <li>Hapus semua kode lama, <strong>PASTE</strong> kode baru di atas.</li>
                                    <li>Klik tombol <strong>Deploy</strong> > <strong>Manage deployments</strong>.</li>
                                    <li>Klik icon pensil (Edit) pada deployment yang aktif.</li>
                                    <li>Pada dropdown "Version", pilih <strong>New version</strong>.</li>
                                    <li>Klik <strong>Deploy</strong>. (URL tidak akan berubah).</li>
                                    <li>Selesai. Masalah waktu yang aneh (tanggal 1899) akan hilang.</li>
                                </ol>
                             </div>
                         </div>
                     )}
                </div>
            </div>
        </div>

        {/* THEME SELECTION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Personalisasi Tampilan</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {themes.map((theme) => (
                <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`relative group p-4 rounded-xl border-2 text-left transition-all duration-300 flex items-start gap-4 hover:shadow-md ${
                    currentTheme === theme.id
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700'
                }`}
                >
                <div className={`w-16 h-16 rounded-lg shadow-sm shrink-0 ${theme.previewClass} ${theme.id === 'glass' ? 'backdrop-blur-md opacity-80' : ''}`}>
                    {theme.id === 'glass' && (
                        <div className="w-full h-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-8 h-8 bg-white/40 rounded-full"></div>
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between w-full">
                        <h4 className={`font-bold ${currentTheme === theme.id ? 'text-rose-700 dark:text-rose-400' : 'text-gray-800 dark:text-white'}`}>
                        {theme.label}
                        </h4>
                        {currentTheme === theme.id && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500">
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {theme.description}
                    </p>
                </div>
                </button>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};