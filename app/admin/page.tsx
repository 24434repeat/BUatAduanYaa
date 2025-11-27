"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchReports } from "@/lib/api";
import { Shield, Lock, MapPin } from "lucide-react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD as string | undefined;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);

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

    try {
      setLoading(true);
      const data = await fetchReports();
      setReports(data);
      setAuthorized(true);
    } catch (err: any) {
      setError(err?.message || "Gagal mengambil data laporan.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-zinc-50 px-3 py-4">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">Dashboard Laporan</h1>
          <span className="text-xs text-zinc-500">Total: {reports.length}</span>
        </div>

        <div className="flex flex-col gap-3">
          {reports.length === 0 && (
            <p className="text-xs text-zinc-500">Belum ada laporan.</p>
          )}

          {reports.map((report, idx) => {
            const imageUrl = report.ImageUrl1 || report.ImageUrl2 || report.ImageUrl3 || "";
            const mapsLink = report.GoogleMapsLink || report.googleMapsLink || "";

            return (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="p-3 flex flex-col gap-2">
                  {imageUrl && (
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-40 w-full overflow-hidden rounded-md bg-zinc-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Bukti laporan"
                        className="h-full w-full object-cover"
                      />
                    </a>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {report.Description || report.description || "Tanpa deskripsi"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Pelapor: {report.Name || report.name || "Anonim"}
                      {report.Phone || report.phone
                        ? ` • HP: ${report.Phone || report.phone}`
                        : ""}
                    </p>
                    {mapsLink && (
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#D60000] hover:underline"
                      >
                        <MapPin className="w-3 h-3" />
                        Lihat Lokasi
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
