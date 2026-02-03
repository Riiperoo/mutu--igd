import React, { useState, useEffect } from 'react';
import { PatientRecord } from '../types';

interface PatientFormProps {
  initialData?: PatientRecord | null;
  onSave: (data: PatientRecord) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const emptyRecord: PatientRecord = {
    id: '', no: 0, tanggal: new Date().toISOString().split('T')[0], noKib: '', namaPasien: '', prioritas: 'P3',
    jamDatang: '', jamDokter: '', dpjp: '', dokterSpesialis: '', jamKonsul: '', jamRespon: '',
    jamResponSpesialis: '', ket: 'Rawat Jalan', ruangan: '-', masalah: ''
  };

  const [formData, setFormData] = useState<PatientRecord>(initialData || emptyRecord);

  const roomList = [
    "Anggrek", "Angsoka", "Aster", "Bougenville", "Cempaka", "Dahlia", "Edelweis", 
    "Flamboyan", "HCU", "ICCU", "ICU", "ICU Sakura", "Kemoterapi", "Lily", "Mawar", 
    "Melati", "NICU", "PICU", "Sakura", "Seroja", "Seruni", "Teratai", "Tulip"
  ].sort();

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
        ...formData,
        id: formData.id || Math.random().toString(36).substr(2, 9),
        no: formData.no || Date.now()
    });
  };

  const handleDeleteClick = () => {
    if (initialData && onDelete) {
        if (confirm(`Yakin ingin menghapus data pasien ${initialData.namaPasien}?`)) {
            onDelete(initialData.id);
        }
    }
  };

  // Helper class for consistent high-contrast inputs
  // Added [color-scheme:light] dark:[color-scheme:dark] to ensure browser-native icons (calendar/clock) adapt correctly
  const inputClass = "w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-sm placeholder-gray-400 [color-scheme:light] dark:[color-scheme:dark]";
  const labelClass = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide";
  
  // Specific style for time inputs to make them pop out against gray backgrounds
  const timeInputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm [color-scheme:light] dark:[color-scheme:dark]";

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all scale-100 ring-1 ring-gray-900/5">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {initialData ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}
          </h2>
          <button onClick={onCancel} className="p-2 bg-white dark:bg-gray-700 rounded-full text-gray-500 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section: Identitas Pasien */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-5 flex items-center gap-2 border-b border-rose-100 dark:border-gray-700 pb-2">
                 Identitas & Triage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
               <div>
                <label className={labelClass}>Tanggal</label>
                <input required type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>No. KIB / RM</label>
                <input required type="text" name="noKib" value={formData.noKib} onChange={handleChange} placeholder="cth: RM-123" className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Nama Pasien</label>
                <input required type="text" name="namaPasien" value={formData.namaPasien} onChange={handleChange} placeholder="Nama Lengkap Pasien" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Prioritas</label>
                <select name="prioritas" value={formData.prioritas} onChange={handleChange} className={inputClass}>
                  <option value="P1">P1 (Gawat Darurat)</option>
                  <option value="P2">P2 (Gawat / Urgent)</option>
                  <option value="P3">P3 (Semi Urgent)</option>
                  <option value="P4">P4 (Tidak Gawat)</option>
                  <option value="P5">P5 (Rutin / Kontrol)</option>
                </select>
              </div>
              <div className="md:col-span-1.5">
                 <label className={labelClass}>Dokter (DPJP)</label>
                <input type="text" name="dpjp" value={formData.dpjp} onChange={handleChange} placeholder="Nama Dokter Jaga" className={inputClass} />
              </div>
              <div className="md:col-span-1.5">
                 <label className={labelClass}>Dokter Spesialis</label>
                <input type="text" name="dokterSpesialis" value={formData.dokterSpesialis} onChange={handleChange} placeholder="cth: Bedah, Anak" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Section: Waktu Pelayanan */}
          <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timeline Pelayanan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Jam Datang</label>
                <input type="time" name="jamDatang" value={formData.jamDatang} onChange={handleChange} className={timeInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Respon Perawat</label>
                <input type="time" name="jamRespon" value={formData.jamRespon} onChange={handleChange} className={timeInputClass} />
              </div>
               <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Jam Dokter</label>
                <input type="time" name="jamDokter" value={formData.jamDokter} onChange={handleChange} className={timeInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Jam Konsul</label>
                <input type="time" name="jamKonsul" value={formData.jamKonsul} onChange={handleChange} className={timeInputClass} />
              </div>
               <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Respon Spesialis</label>
                <input type="time" name="jamResponSpesialis" value={formData.jamResponSpesialis} onChange={handleChange} className={timeInputClass} />
              </div>
            </div>
          </div>

          {/* Section: Keterangan & Ruangan */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-5 flex items-center gap-2 border-b border-rose-100 dark:border-gray-700 pb-2">
                 Status Akhir & Penempatan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Status Keluar</label>
                <select name="ket" value={formData.ket} onChange={handleChange} className={inputClass}>
                  <option value="Rawat Jalan">Rawat Jalan</option>
                  <option value="Rawat Inap">Rawat Inap</option>
                  <option value="Rujuk">Rujuk</option>
                  <option value="Pulang Paksa">Pulang Paksa</option>
                  <option value="Meninggal">Meninggal</option>
                </select>
              </div>
              <div className="relative group">
                <label className={labelClass}>
                  Ruangan <span className="text-[10px] text-gray-400 font-normal italic normal-case ml-1">(Pilih/Ketik)</span>
                </label>
                <input 
                  type="text" 
                  name="ruangan" 
                  list="room-suggestions"
                  value={formData.ruangan} 
                  onChange={handleChange} 
                  autoComplete="off"
                  placeholder="Nama Ruangan..."
                  className={inputClass} 
                />
                <datalist id="room-suggestions">
                  {roomList.map(room => (
                    <option key={room} value={room} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>Masalah / Catatan</label>
                <input type="text" name="masalah" value={formData.masalah} onChange={handleChange} placeholder="Kendala medis/operasional" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-1 md:col-span-2 flex justify-between items-center mt-4 pt-6 border-t border-gray-100 dark:border-gray-700">
             <div>
                {initialData && onDelete && (
                    <button 
                        type="button" 
                        onClick={handleDeleteClick}
                        className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                    </button>
                )}
             </div>
             <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Batal
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 dark:shadow-none hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                Simpan Data
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
