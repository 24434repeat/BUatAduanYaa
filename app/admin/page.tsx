"use client";

import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  fetchReports,
  ReportRecord,
  ReportStatus,
  updateReportStatus,
  deleteReportById,
} from "@/lib/api";
import { Shield, Lock, MapPin } from "lucide-react";

type ProcessedReport = ReportRecord & {
  id: string;
  mapsLink: string;
  status: ReportStatus;
  rowNumber: number;
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Investigating]: "Investigasi",
  [ReportStatus.Resolved]: "Selesai",
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "bg-amber-100 text-amber-800",
  [ReportStatus.Investigating]: "bg-blue-100 text-blue-700",
  [ReportStatus.Resolved]: "bg-emerald-100 text-emerald-700",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as ReportStatus,
  label,
}));

const resolveReportId = (report: ReportRecord, fallbackIndex: number) => {
  const candidate =
    report.id ?? report.Id ?? report.ID ?? report.rowNumber ?? report.RowNumber ?? report.timestamp ?? report.createdAt;
  return String(candidate ?? `row-${fallbackIndex}`);
};


type ReportCardProps = {
  report: ProcessedReport;
  index: number;
  onStatusChange: (id: string, rowNumber: number, status: ReportStatus) => void;
  onDelete: (id: string, rowNumber: number) => void;
  statusUpdatingId: string | null;
  deletingId: string | null;
};

const ReportCard = memo(function ReportCard({
  report,
  index,
  onStatusChange,
  onDelete,
  statusUpdatingId,
  deletingId,
}: ReportCardProps) {
  const isStatusUpdating = statusUpdatingId === report.id;
  const isDeleting = deletingId === report.id;

  return (
    <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-zinc-200">
      <CardHeader className="flex flex-col gap-3 border-b border-zinc-200 bg-gradient-to-r from-white to-zinc-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-semibold text-zinc-900 leading-relaxed">
              {report.Description || report.description || "Tanpa deskripsi"}
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-zinc-600">
                <span className="font-medium">Pelapor:</span> {report.Name || report.name || "Anonim"}
              </p>
              {report.Phone || report.phone ? (
                <p className="text-xs text-zinc-600">
                  <span className="font-medium">HP:</span> {report.Phone || report.phone}
                </p>
              ) : null}
            </div>
            {report.mapsLink && (
              <a
                href={report.mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D60000] hover:text-[#b20000] hover:underline transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Lihat Lokasi di Google Maps
              </a>
            )}
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${STATUS_STYLES[report.status]}`}>
              {STATUS_LABELS[report.status]}
            </span>
            <select
              className="w-36 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D60000] focus:border-[#D60000] transition-all"
              value={report.status}
              onChange={(e) => onStatusChange(report.id, report.rowNumber, e.target.value as ReportStatus)}
              disabled={isStatusUpdating}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
              disabled={isDeleting}
              onClick={() => {
                console.log('Delete clicked for report:', { id: report.id, rowNumber: report.rowNumber, report });
                onDelete(report.id, report.rowNumber);
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD as string | undefined;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processedReports = useMemo<ProcessedReport[]>(
    () =>
      reports.map((report, idx) => {
        const statusCandidate = (report.status || report.Status || report.currentStatus) as ReportStatus | undefined;
        const validStatus = Object.values(ReportStatus).includes(statusCandidate as ReportStatus)
          ? (statusCandidate as ReportStatus)
          : ReportStatus.Pending;

        const resolvedRowNumberCandidate =
          report.rowNumber ?? report.RowNumber ?? report.row ?? report.row_index ?? null;
        let resolvedRowNumber: number;
        
        if (typeof resolvedRowNumberCandidate === "number") {
          resolvedRowNumber = resolvedRowNumberCandidate;
        } else if (resolvedRowNumberCandidate !== null && resolvedRowNumberCandidate !== undefined) {
          resolvedRowNumber = Number(resolvedRowNumberCandidate);
        } else {
          resolvedRowNumber = NaN;
        }

        // Pastikan rowNumber selalu >= 2 (row 1 adalah header)
        // Jika rowNumber tidak valid atau < 2, gunakan idx + 2 sebagai fallback
        const finalRowNumber = (Number.isFinite(resolvedRowNumber) && resolvedRowNumber >= 2) 
          ? resolvedRowNumber 
          : idx + 2;

        return {
          ...report,
          id: resolveReportId(report, idx),
          mapsLink: (report.GoogleMapsLink || report.googleMapsLink || "") as string,
          status: validStatus,
          rowNumber: finalRowNumber,
        };
      }),
    [reports]
  );

  const fetchAndSetReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReports();
      console.log('Fetched reports:', data);
      // Log rowNumber untuk setiap report
      data.forEach((report, idx) => {
        console.log(`Report ${idx}:`, {
          rowNumber: report.rowNumber,
          RowNumber: report.RowNumber,
          row: report.row,
          row_index: report.row_index,
          name: report.Name || report.name,
        });
      });
      setReports(data);
      setSuccess(null);
    } catch (err: any) {
      setError(err?.message || "Gagal mengambil data laporan.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ADMIN_PASSWORD) {
      setError("ADMIN password belum dikonfigurasi di environment.");
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      setError("Password admin salah.");
      return;
    }

    await fetchAndSetReports();
    setAuthorized(true);
  };

  const handleStatusChange = async (reportId: string, rowNumber: number, status: ReportStatus) => {
    setStatusUpdatingId(reportId);
    setError(null);
    setSuccess(null);
    try {
      await updateReportStatus(rowNumber, status);
      // Refresh data dari server untuk memastikan data terbaru
      await fetchAndSetReports();
      setSuccess("Status laporan berhasil diperbarui.");
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui status laporan.");
      // Tetap refresh data meskipun ada error untuk sinkronisasi
      await fetchAndSetReports();
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async (reportId: string, rowNumber: number) => {
    if (!confirm("Hapus laporan ini? Tindakan tidak dapat dibatalkan.")) {
      return;
    }

    setDeletingId(reportId);
    setError(null);
    setSuccess(null);
    
    // Validasi rowNumber - pastikan valid dan >= 2
    if (!rowNumber || isNaN(rowNumber) || rowNumber < 2) {
      const errorMsg = `Row number tidak valid: ${rowNumber}. Row number harus >= 2.`;
      console.error('Invalid rowNumber:', { reportId, rowNumber });
      setError(errorMsg);
      setDeletingId(null);
      return;
    }
    
    // Cari report yang akan dihapus untuk logging
    const reportToDelete = processedReports.find(r => r.id === reportId);
    console.log('Deleting report:', { 
      reportId, 
      rowNumber, 
      report: reportToDelete,
      allProcessedReports: processedReports.map(r => ({ id: r.id, rowNumber: r.rowNumber }))
    });
    
    // Optimistically remove dari UI dulu
    const previousReports = [...reports];
    setReports((prev) => prev.filter((report, idx) => resolveReportId(report, idx) !== reportId));
    
    try {
      console.log('Calling deleteReportById with rowNumber:', rowNumber);
      const result = await deleteReportById(rowNumber);
      console.log('Delete result:', result);
      
      if (!result.success) {
        // Jika gagal, kembalikan data sebelumnya
        setReports(previousReports);
        setError(result.message || "Gagal menghapus laporan.");
        return;
      }
      
      // Tunggu sebentar sebelum refresh untuk memastikan Apps Script selesai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data dari server untuk memastikan sinkronisasi
      await fetchAndSetReports();
      setSuccess("Laporan berhasil dihapus.");
    } catch (err: any) {
      // Jika error, kembalikan data sebelumnya
      setReports(previousReports);
      console.error('Delete error:', err);
      setError(err?.message || "Gagal menghapus laporan.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) {
      return processedReports;
    }

    const query = searchTerm.toLowerCase();
    return processedReports.filter((report) => {
      const fields = [
        report.Description,
        report.description,
        report.Name,
        report.name,
        report.Phone,
        report.phone,
        report.mapsLink,
      ];
      return fields.some((field) => typeof field === "string" && field.toLowerCase().includes(query));
    });
  }, [processedReports, searchTerm]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
              <Shield className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-semibold">Login Admin</CardTitle>
            <p className="text-xs text-zinc-500">
              Masukkan password admin untuk melihat laporan masuk.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="password"
                    className="pl-7 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#D60000] hover:bg-[#b20000] text-white text-sm"
                disabled={loading}
              >
                {loading ? "Memeriksa..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-[#D60000] via-[#ff3b3b] to-[#D60000] text-white shadow-md">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-1 flex-col">
            <p className="text-base font-bold text-white">Dashboard Laporan</p>
            <span className="text-xs text-white/90">Total laporan: {reports.length}</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Cari nama, deskripsi, atau nomor HP"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm bg-white/95 border-white/20 focus:bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={fetchAndSetReports}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {loading ? "Muat..." : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
        {(error || success) && (
          <Alert 
            variant={error ? "destructive" : "default"}
            className={success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : ""}
          >
            <AlertDescription className={success ? "text-emerald-800 font-medium" : ""}>
              {error || success}
            </AlertDescription>
          </Alert>
        )}
        {filteredReports.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            {processedReports.length === 0
              ? "Belum ada laporan."
              : "Tidak ada laporan yang cocok dengan pencarian."}
          </p>
        ) : (
          filteredReports.map((report, idx) => (
            <ReportCard
              key={report.id}
              report={report}
              index={idx}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              statusUpdatingId={statusUpdatingId}
              deletingId={deletingId}
            />
          ))
        )}
      </main>
    </div>
  );
}
