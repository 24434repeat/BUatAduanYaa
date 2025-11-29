// lib/api.ts

export type ReportPayload = {
  name?: string;
  phone?: string;
  description: string;
  lat?: number | null;
  lng?: number | null;
  images: string[]; // base64 strings
};

export type SubmitReportResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

export type ReportRecord = {
  [key: string]: any;
  rowNumber?: number;
};

export enum ReportStatus {
  Pending = "pending",
  Investigating = "investigating",
  Resolved = "resolved",
}

const REPORT_ENDPOINT = "/api/report";
const REPORTS_ENDPOINT = "/api/reports";
const buildReportDetailEndpoint = (id: string) => `${REPORTS_ENDPOINT}/${encodeURIComponent(id)}`;

// Convert a File to Base64 string (with data URL prefix)
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

// Submit a fake oil report to Google Apps Script backend
export async function submitReport(payload: ReportPayload): Promise<SubmitReportResponse> {
  const body = {
    name: payload.name || '',
    phone: payload.phone || '',
    description: payload.description,
    lat: payload.lat ?? '',
    lng: payload.lng ?? '',
    images: payload.images.slice(0, 3),
  };

  const res = await fetch(REPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      msg = json.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = (await res.json()) as SubmitReportResponse;
  return data;
}

// Fetch all reports (for admin dashboard)
export async function fetchReports(): Promise<ReportRecord[]> {
  // Tambahkan timestamp untuk cache-busting
  const timestamp = Date.now();
  const res = await fetch(`${REPORTS_ENDPOINT}?t=${timestamp}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json && json.success && Array.isArray(json.data)) {
    return json.data as ReportRecord[];
  }

  // fallback: if Apps Script ever returns bare array
  if (Array.isArray(json)) {
    return json as ReportRecord[];
  }

  return [];
}

export async function updateReportStatus(rowNumber: number, status: ReportStatus): Promise<SubmitReportResponse> {
  const res = await fetch(REPORTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    body: JSON.stringify({
      action: 'updateStatus',
      rowNumber,
      status,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Gagal memperbarui status (HTTP ${res.status})`);
  }

  return (await res.json()) as SubmitReportResponse;
}

export async function deleteReportById(rowNumber: number): Promise<SubmitReportResponse> {
  const requestBody = {
    action: 'delete',
    rowNumber,
  };
  
  console.log('deleteReportById - Request body:', JSON.stringify(requestBody));
  
  const res = await fetch(REPORTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorMessage = `Gagal menghapus laporan (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
      console.error('deleteReportById - Error response:', errorData);
    } catch {
      const text = await res.text();
      if (text) errorMessage = text;
      console.error('deleteReportById - Error text:', text);
    }
    throw new Error(errorMessage);
  }

  const result = (await res.json()) as SubmitReportResponse;
  console.log('deleteReportById - Response:', result);
  console.log('deleteReportById - Response success:', result.success);
  console.log('deleteReportById - Response message:', result.message);
  
  // Jika response success: false, throw error dengan detail lebih lengkap
  if (!result.success) {
    const errorMsg = result.message || 'Gagal menghapus laporan';
    console.error('deleteReportById - Error response:', {
      success: result.success,
      message: result.message,
      data: result.data,
      fullResponse: result
    });
    throw new Error(errorMsg);
  }

  return result;
}
