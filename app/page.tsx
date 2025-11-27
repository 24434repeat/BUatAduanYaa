"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { fileToBase64, submitReport } from "@/lib/api";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLocation = () => {
    setError(null);
    setSuccess(null);
    if (!navigator.geolocation) {
      setError("Browser kamu tidak mendukung geolocation.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setIsLocating(false);
        setSuccess("Lokasi berhasil dideteksi.");
      },
      () => {
        setIsLocating(false);
        setError("Gagal mendeteksi lokasi. Pastikan izin lokasi sudah diaktifkan.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const files = Array.from(event.target.files || []);
    if (files.length > 3) {
      setError("Maksimal 3 foto yang bisa diupload.");
    }
    const limited = files.slice(0, 3);

    for (const file of limited) {
      if (file.size > 1024 * 1024) {
        setError("Ukuran tiap foto maksimal 1MB.");
        return;
      }
    }

    setImages(limited);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!description.trim()) {
      setError("Deskripsi wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("handleSubmit: mulai submit");

      const base64Images: string[] = [];
      for (const file of images) {
        const b64 = await fileToBase64(file);
        base64Images.push(b64);
      }

      console.log("handleSubmit: panggil submitReport");
      await submitReport({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim(),
        lat,
        lng,
        images: base64Images,
      });
      console.log("handleSubmit: submitReport selesai");

      setSuccess("Laporan berhasil dikirim. Terima kasih!");
      setName("");
      setPhone("");
      setDescription("");
      setLat(null);
      setLng(null);
      setImages([]);
    } catch (err: any) {
      console.error("handleSubmit: catch error", err);
      setError(err?.message || "Terjadi kesalahan saat mengirim laporan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="w-full bg-gradient-to-r from-[#D60000] via-[#ff3b3b] to-[#D60000] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border border-white/60 bg-white/10 flex items-center justify-center text-xs font-bold">
              OP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">Oli Palsu Watch</span>
              <span className="text-[10px] text-white/80">Laporkan dugaan oli palsu di sekitar kamu</span>
            </div>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium hover:bg-white/25"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        </div>
      </header>
      <main className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-4 py-6 sm:px-6 sm:py-8 mt-3 flex flex-col gap-6">
        <section className="flex flex-col items-center text-center gap-3">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-red-600">
            <Image
              src="/buaya-logo.png"
              alt="Buaya Logo"
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-red-700">Oli Palsu Watch</h1>
            <p className="text-sm text-zinc-600 font-medium mt-1">Buat Aduan Yaa!</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-800">Nama (opsional)</label>
            <Input
              placeholder="Boleh dikosongkan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-800">Nomor Handphone (opsional)</label>
            <Input
              type="tel"
              placeholder="Contoh: 0812xxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-800">Deskripsi Laporan *</label>
            <Textarea
              required
              rows={4}
              placeholder="Ceritakan detail dugaan oli palsu, merk, lokasi toko, dll."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800">Lokasi</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Mencari...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Deteksi Lokasi
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              {lat && lng
                ? `Lokasi terdeteksi: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : "Izinkan akses lokasi agar admin bisa cek titik laporan di peta."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-800">Foto Bukti (maks. 3, 1MB/foto)</label>
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-red-600" />
                  <span>Pilih foto oli/toko</span>
                </div>
                <span className="text-xs text-zinc-500">JPG/PNG, maks. 1MB</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {images.length > 0 && (
                <p className="text-xs text-zinc-600">
                  {images.length} file dipilih.
                </p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-1 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-1 border-green-500/70 bg-green-50 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="mt-2 w-full bg-[#D60000] hover:bg-[#b20000] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengirim Laporan...
              </>
            ) : (
              <>Kirim Laporan</>
            )}
          </Button>
        </form>

        <p className="mt-2 text-[10px] text-center text-zinc-400">
          Data laporan akan disimpan secara anonim di sistem kami untuk membantu memerangi peredaran oli palsu.
        </p>
      </main>
    </div>
  );
}
