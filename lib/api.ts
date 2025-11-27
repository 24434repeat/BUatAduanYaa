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
};

const REPORT_ENDPOINT = "/api/report";
const REPORTS_ENDPOINT = "/api/reports";

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
  const res = await fetch(REPORTS_ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
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
