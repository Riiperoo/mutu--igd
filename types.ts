export interface PatientRecord {
  id: string;
  no: number;
  tanggal: string;
  noKib: string;
  namaPasien: string;
  prioritas: string; // e.g., P1, P2, P3, P4, P5
  jamDatang: string;
  jamDokter: string;
  dpjp: string; // Dokter Penanggung Jawab Pelayanan
  dokterSpesialis: string; // New field
  jamKonsul: string;
  jamRespon: string;
  jamResponSpesialis: string; // Renamed from jamMeninggalkan
  ket: string; // Keterangan (Rawat Inap, Rawat Jalan, dll)
  ruangan: string; // Nama Ruangan
  masalah: string;
}

export interface AppData {
  patients: PatientRecord[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface AnalysisResult {
  answer: string;
  chartType?: 'bar' | 'line' | 'pie';
  chartData?: ChartDataPoint[];
  chartTitle?: string;
  xAxisKey?: string;
  dataKey?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  DATA_PASIEN = 'DATA_PASIEN',
  REPORTS = 'REPORTS',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}

export type ThemeMode = 'light' | 'dark' | 'glass' | 'color';