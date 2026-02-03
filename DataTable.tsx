import React, { useState, useRef, useMemo } from 'react';
import { PatientRecord } from '../types';
import { PatientForm } from './PatientForm';
import { addPatientToDB, updatePatientInDB, deletePatientFromDB } from '../services/googleSheets';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  data: PatientRecord[];
  columns: Column[];
  onUpdate: (newData: PatientRecord[]) => void;
  onNotification?: (msg: string) => void;
  title: string;
  description: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type ViewMode = 'list' | 'grid';

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  onUpdate,
  onNotification,
  title,
  description,
  onRefresh,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PatientRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detailItem, setDetailItem] = useState<PatientRecord | null>(null);

  // State for Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
        // Text Search
        const matchesSearch = 
            item.namaPasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.noKib.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.dpjp.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Date Range Filter
        let matchesDate = true;
        if (startDate || endDate) {
            const itemDate = item.tanggal; // Assuming YYYY-MM-DD format strings can be compared directly
            if (startDate && itemDate < startDate) matchesDate = false;
            if (endDate && itemDate > endDate) matchesDate = false;
        }

        return matchesSearch && matchesDate;
    });
  }, [data, searchTerm, startDate, endDate]);

  // --- Dynamic Stats Calculation ---
  const stats = useMemo(() => {
    return {
        total: filteredData.length,
        emergency: filteredData.filter(p => p.prioritas === 'P1').length,
        inpatient: filteredData.filter(p => p.ket === 'Rawat Inap').length,
        waiting: filteredData.filter(p => !p.jamDokter || p.jamDokter === '-').length
    };
  }, [filteredData]);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredData.map(d => d.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.has(item.id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  // --- CRUD Handlers (Updated for Sheets) ---

  const handleAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: PatientRecord) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data pasien ini secara permanen dari Google Sheet?')) {
      try {
        await deletePatientFromDB(id);
        const newData = data.filter(item => item.id !== id);
        onUpdate(newData);
        
        if (selectedIds.has(id)) {
          const newSelected = new Set(selectedIds);
          newSelected.delete(id);
          setSelectedIds(newSelected);
        }
        if (onNotification) onNotification("Data pasien berhasil dihapus.");
      } catch (error) {
        console.error(error);
        if (onNotification) onNotification("Gagal menghapus data.");
      }
    }
  };

  const handleDeleteFromForm = async (id: string) => {
    try {
      await deletePatientFromDB(id);
      const newData = data.filter(item => item.id !== id);
      onUpdate(newData);

      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
      setIsFormOpen(false);
      setEditingItem(null);
      if (onNotification) onNotification("Data pasien berhasil dihapus.");
    } catch (error) {
      console.error(error);
      if (onNotification) onNotification("Gagal menghapus data.");
    }
  };

  const handleSaveForm = async (record: PatientRecord) => {
    try {
      if (editingItem) {
        // Edit Mode: Update Sheet
        await updatePatientInDB(record);
        onUpdate(data.map(item => item.id === record.id ? record : item));
        if (onNotification) onNotification("Perubahan data berhasil disimpan ke Sheet.");
      } else {
        // Add Mode: Insert to Sheet
        const newId = await addPatientToDB(record);
        if (newId) {
            const newRecord = { ...record, id: newId };
            onUpdate([newRecord, ...data]); // Add to top
            if (onNotification) onNotification("Data pasien baru berhasil ditambahkan.");
        }
      }
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error) {
       console.error(error);
       if (onNotification) onNotification("Gagal menyimpan data ke database.");
    }
  };

  // --- Backup & Restore Handlers ---

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `Backup_SistemRS_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    if (onNotification) onNotification("Backup data berhasil diunduh.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          if (confirm(`Anda akan mengimpor ${importedData.length} data. Data ini akan ditambahkan ke Google Sheet. Lanjutkan?`)) {
            
            // Filter duplicates locally just in case
            const existingRMs = new Set(data.map(d => d.noKib));
            const newItems = importedData.filter(d => !existingRMs.has(d.noKib));
            
            if (newItems.length === 0) {
                 if (onNotification) onNotification("Semua data sudah ada di database.");
                 return;
            }

            // Simple loop for now. 
            const addedItems: PatientRecord[] = [];
            for (const item of newItems) {
                 const newId = await addPatientToDB(item);
                 if (newId) {
                     addedItems.push({...item, id: newId});
                 }
            }

            onUpdate([...addedItems, ...data]);
            if (onNotification) onNotification(`Berhasil mengimpor ${addedItems.length} data ke database.`);
          }
        }
      } catch (err) {
        alert("Gagal membaca file atau koneksi error.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleExportExcel = () => {
    const dataToExport = selectedIds.size > 0 
        ? data.filter(item => selectedIds.has(item.id))
        : filteredData;

    if (dataToExport.length === 0) {
        if (onNotification) onNotification("Tidak ada data untuk diekspor.");
        return;
    }

    const tableHeader = columns.filter(c => c.key !== 'visual_index').map(c => `<th>${c.label}</th>`).join('');
    const tableRows = dataToExport.map(row => {
      return `<tr>${columns.filter(c => c.key !== 'visual_index').map(c => `<td>${row[c.key as keyof PatientRecord] || ''}</td>`).join('')}</tr>`;
    }).join('');

    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>table { border-collapse: collapse; } th, td { border: 1px solid black; padding: 5px; }</style>
        </head>
        <body>
          <table><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Data_Pasien_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotification) onNotification(`${dataToExport.length} Data berhasil diekspor.`);
  };

  // --- Rendering Helpers ---

  const renderCell = (row: PatientRecord, key: string, index: number) => {
    if (key === 'visual_index') {
        return <span className="font-semibold text-gray-500 dark:text-gray-400">{index + 1}</span>;
    }

    const value = row[key as keyof PatientRecord];

    if (key === 'prioritas') {
      let colorClass = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      if (value === 'P1') colorClass = 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800';
      if (value === 'P2') colorClass = 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800';
      if (value === 'P3') colorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800';
      if (value === 'P4') colorClass = 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
      if (value === 'P5') colorClass = 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      return (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${colorClass}`}>
          {value}
        </span>
      );
    }

    if (key === 'ket') {
      const isRawatInap = value === 'Rawat Inap';
      const isRujuk = value === 'Rujuk';
      let badgeClass = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      if (isRawatInap) badgeClass = 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800';
      if (isRujuk) badgeClass = 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800';
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
          {value}
        </span>
      );
    }
    
    if (key === 'masalah') {
        return <span className="block truncate max-w-[150px]" title={value as string}>{value || '-'}</span>
    }

    return value || '-';
  };

  // --- Detail Modal Component ---
  const PatientDetailModal = ({ item, onClose }: { item: PatientRecord, onClose: () => void }) => {
    if (!item) return null;
    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{item.namaPasien}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No. RM: {item.noKib}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-8 space-y-8">
                    {/* BLOK 1: IDENTITAS & TRIAGE */}
                    <div>
                         <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4 border-b border-rose-100 dark:border-gray-700 pb-2">1. Identitas & Triage</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Tanggal</label>
                                <p className="font-medium text-gray-800 dark:text-white mt-1">{item.tanggal}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Prioritas</label>
                                <div className="mt-1">{renderCell(item, 'prioritas', 0)}</div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">DPJP</label>
                                <p className="font-medium text-gray-800 dark:text-white mt-1">{item.dpjp || '-'}</p>
                            </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Spesialis</label>
                                <p className="font-medium text-gray-800 dark:text-white mt-1">{item.dokterSpesialis || '-'}</p>
                            </div>
                         </div>
                    </div>

                    {/* BLOK 2: TIMELINE PELAYANAN */}
                     <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-xl border border-gray-100 dark:border-gray-600">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            2. Timeline Pelayanan
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div className="relative">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Jam Datang</p>
                                <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">{item.jamDatang || '--:--'}</p>
                            </div>
                            <div className="relative">
                                <div className="hidden md:block absolute top-1.5 left-[-50%] right-[50%] h-0.5 bg-gray-200 dark:bg-gray-600 -z-10"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Respon Perawat</p>
                                <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">{item.jamRespon || '--:--'}</p>
                            </div>
                            <div className="relative">
                                <div className="hidden md:block absolute top-1.5 left-[-50%] right-[50%] h-0.5 bg-gray-200 dark:bg-gray-600 -z-10"></div>
                                <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-2"></div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Jam Dokter</p>
                                <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">{item.jamDokter || '--:--'}</p>
                            </div>
                             <div className="relative">
                                <div className="hidden md:block absolute top-1.5 left-[-50%] right-[50%] h-0.5 bg-gray-200 dark:bg-gray-600 -z-10"></div>
                                <div className="w-3 h-3 bg-indigo-500 rounded-full mx-auto mb-2"></div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Konsul Spesialis</p>
                                <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">{item.jamKonsul || '--:--'}</p>
                            </div>
                             <div className="relative">
                                <div className="hidden md:block absolute top-1.5 left-[-50%] right-[50%] h-0.5 bg-gray-200 dark:bg-gray-600 -z-10"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Respon Spesialis</p>
                                <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">{item.jamResponSpesialis || '--:--'}</p>
                            </div>
                        </div>
                     </div>

                    {/* BLOK 3: STATUS AKHIR & PENEMPATAN */}
                    <div>
                         <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4 border-b border-rose-100 dark:border-gray-700 pb-2">3. Status Akhir & Penempatan</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Status Keluar</label>
                                    <div className="mt-1">{renderCell(item, 'ket', 0)}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Ruangan</label>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{item.ruangan || '-'}</p>
                                </div>
                            </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2 block">Masalah / Catatan</label>
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg h-full">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{item.masalah || 'Tidak ada catatan khusus.'}"</p>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button onClick={() => {onClose(); handleEdit(item);}} className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors">
                        Edit Data
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const MiniStatCard = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => (
    <div className={`flex flex-col p-4 rounded-xl border shadow-sm ${colorClass} transition-transform hover:scale-105`}>
        <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
        <span className="text-2xl font-bold">{value}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full transition-colors relative">
      {/* Hidden File Input for Import */}
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />

      {/* 1. Header Area with Stats Summary */}
      <div className="p-6 pb-2 bg-white dark:bg-gray-800 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    {title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            </div>
             <div className="mt-4 md:mt-0 flex items-center gap-2">
                 {onRefresh && (
                    <button 
                        onClick={onRefresh}
                        disabled={isLoading}
                        className={`p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center gap-2 px-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        title="Sinkronisasi Data"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-xs font-bold hidden sm:inline">SYNC</span>
                    </button>
                 )}
                 <button onClick={handleExportJSON} className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all" title="Backup JSON">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button onClick={handleImportClick} className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all" title="Import JSON">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
                 <button onClick={handleExportExcel} className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-md shadow-green-200 dark:shadow-none" title="Export Excel">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </button>
             </div>
        </div>

        {/* Dynamic Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <MiniStatCard 
                label="Total Pasien" 
                value={stats.total} 
                colorClass="bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
             />
             <MiniStatCard 
                label="Gawat Darurat (P1)" 
                value={stats.emergency} 
                colorClass="bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
             />
              <MiniStatCard 
                label="Rawat Inap" 
                value={stats.inpatient} 
                colorClass="bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
             />
              <MiniStatCard 
                label="Menunggu Dokter" 
                value={stats.waiting} 
                colorClass="bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
             />
        </div>
      </div>

      {/* 2. Advanced Toolbar (Filters & Search) */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between sticky top-0 z-20 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
        
        {/* Left: Filters */}
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            {/* Search */}
            <div className="relative group w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400 group-focus-within:text-rose-500 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                </div>
                <input 
                type="text"
                placeholder="Cari Nama / RM / Dokter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
                />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 p-1">
                <div className="relative">
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-2 pr-1 py-1.5 bg-transparent text-sm text-gray-900 dark:text-gray-200 focus:outline-none w-32 font-medium [color-scheme:light] dark:[color-scheme:dark]"
                        title="Dari Tanggal"
                    />
                </div>
                <span className="text-gray-400">-</span>
                <div className="relative">
                     <input 
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-2 pr-1 py-1.5 bg-transparent text-sm text-gray-900 dark:text-gray-200 focus:outline-none w-32 font-medium [color-scheme:light] dark:[color-scheme:dark]"
                        title="Sampai Tanggal"
                    />
                </div>
            </div>

            {/* Clear Filter Button */}
            {(searchTerm || startDate || endDate) && (
                <button 
                    onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
                    className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors font-medium whitespace-nowrap"
                >
                    Reset Filter
                </button>
            )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
             {selectedIds.size > 0 && (
                <span className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md animate-fade-in">
                    {selectedIds.size} dipilih
                </span>
             )}

             <div className="flex items-center gap-2">
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-rose-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        title="Tampilan Tabel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-rose-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        title="Tampilan Grid"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                </div>

                <button 
                    onClick={handleAdd}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-200 dark:shadow-none whitespace-nowrap"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Pasien Baru
                </button>
            </div>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="overflow-auto flex-1 bg-gray-50/50 dark:bg-gray-900/50">
        
        {/* LIST VIEW (Table) */}
        {viewMode === 'list' && (
            <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-left border-collapse">
                <thead className="bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                    <th className="p-4 w-10 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap text-center">
                        <input 
                            type="checkbox" 
                            checked={isAllSelected}
                            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        />
                    </th>
                    {columns.map((col) => (
                        <th key={col.key} className="p-4 text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                        {col.label}
                        </th>
                    ))}
                    <th className="p-4 w-24 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right sticky right-0 z-20 bg-white dark:bg-gray-800 shadow-[-5px_0px_10px_rgba(0,0,0,0.02)]">
                        Aksi
                    </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {filteredData.map((row, index) => {
                    const isSelected = selectedIds.has(row.id);
                    return (
                    <tr 
                        key={row.id} 
                        className={`transition-colors group ${
                            isSelected 
                            ? 'bg-rose-50 dark:bg-rose-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-rose-900/10'
                        }`}
                    >
                        <td className="p-4 border-b border-gray-50 dark:border-gray-800 text-center">
                            <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => handleSelectOne(row.id)}
                                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            />
                        </td>
                        {columns.map((col) => (
                        <td key={col.key} className="p-4 text-xs text-gray-900 dark:text-gray-200 whitespace-nowrap border-b border-gray-50 dark:border-gray-800 font-medium">
                            {renderCell(row, col.key, index)}
                        </td>
                        ))}
                        <td className={`p-4 text-sm whitespace-nowrap border-b border-gray-50 dark:border-gray-800 text-right sticky right-0 z-10 shadow-[-5px_0px_10px_rgba(0,0,0,0.02)] ${isSelected ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-rose-900/10'}`}>
                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                onClick={() => setDetailItem(row)}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Lihat Detail Lengkap"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                </button>
                                <button 
                                onClick={() => handleEdit(row)} 
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                title="Edit Data"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                </button>
                                <button 
                                onClick={() => handleDelete(row.id)} 
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                title="Hapus Data"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
        )}

        {/* GRID VIEW (Cards) */}
        {viewMode === 'grid' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredData.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    return (
                        <div key={row.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${isSelected ? 'border-rose-500 ring-2 ring-rose-200 dark:ring-rose-900' : 'border-gray-200 dark:border-gray-700'} hover:shadow-md transition-all flex flex-col group`}>
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{row.tanggal}</span>
                                        {renderCell(row, 'prioritas', 0)}
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={row.namaPasien}>{row.namaPasien}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.noKib}</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => handleSelectOne(row.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                                />
                            </div>
                            
                            {/* Card Body */}
                            <div className="p-4 space-y-3 flex-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">DPJP</span>
                                    <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]" title={row.dpjp}>{row.dpjp || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Jam Datang</span>
                                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-white">{row.jamDatang || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Status</span>
                                    {renderCell(row, 'ket', 0)}
                                </div>
                                {row.masalah && (
                                     <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-gray-600 dark:text-gray-300 italic truncate">
                                        "{row.masalah}"
                                     </div>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center rounded-b-xl">
                                <button onClick={() => setDetailItem(row)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline">
                                    Lihat Detail
                                </button>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(row)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {filteredData.length === 0 && (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                <div className="flex flex-col items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Tidak ada data pasien yang ditemukan dengan filter saat ini.</p>
                </div>
            </div>
        )}
      </div>

      {isFormOpen && (
        <PatientForm 
          initialData={editingItem}
          onSave={handleSaveForm}
          onDelete={handleDeleteFromForm}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {/* Detail Modal */}
      {detailItem && (
          <PatientDetailModal 
            item={detailItem}
            onClose={() => setDetailItem(null)}
          />
      )}
    </div>
  );
};