"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { fileToBase64, submitReport } from "@/lib/api";

// Dynamic import for the map component to avoid SSR issues
const LocationMap = dynamic(
  () => import('@/components/ui/LocationMap'),
  { ssr: false }
);

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
  const [showMap, setShowMap] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

const handleLocation = async () => {
  setError(null);
  setSuccess(null);
  setShowMap(false);
  setAccuracy(null);

  if (typeof window !== "undefined" && !window.isSecureContext) {
    setError("Deteksi lokasi memerlukan akses melalui HTTPS atau localhost.");
    return;
  }

  if (!navigator.geolocation) {
    setError("Browser tidak mendukung deteksi lokasi.");
    return;
  }

  setIsLocating(true);
  setError("Mendeteksi lokasi...");

  const geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
  };

  const getBestPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      const readings: GeolocationPosition[] = [];
      let settled = false;

      const cleanup = (watchId?: number | null, timeoutId?: number) => {
        if (typeof watchId === "number") {
          navigator.geolocation.clearWatch(watchId);
        }
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };

      const finalize = (position: GeolocationPosition, watchId?: number | null, timeoutId?: number) => {
        if (settled) return;
        settled = true;
        cleanup(watchId, timeoutId);
        resolve(position);
      };

      let watchId: number | null = null;
      const timeoutId = window.setTimeout(() => {
        if (readings.length) {
          const best = readings.reduce((prev, curr) => (
            curr.coords.accuracy < prev.coords.accuracy ? curr : prev
          ));
          finalize(best, watchId, timeoutId);
        } else {
          cleanup(watchId, timeoutId);
          reject(new Error("Tidak mendapatkan koordinat akurat dari perangkat."));
        }
      }, 20000);

      if (navigator.geolocation.watchPosition) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            readings.push(position);
            const best = readings.reduce((prev, curr) => (
              curr.coords.accuracy < prev.coords.accuracy ? curr : prev
            ));

            if (best.coords.accuracy <= 25 || readings.length >= 5) {
              finalize(best, watchId, timeoutId);
            }
          },
          (err) => {
            cleanup(watchId, timeoutId);
            reject(err);
          },
          geoOptions
        );
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => finalize(position, null, timeoutId),
          (err) => {
            cleanup(null, timeoutId);
            reject(err);
          },
          geoOptions
        );
      }
    });
  };

  try {
    const bestPosition = await getBestPosition();
    const { latitude, longitude, accuracy } = bestPosition.coords;
    updateLocation(latitude, longitude, accuracy);
  } catch (error: any) {
    handleLocationError(error);
  } finally {
    setIsLocating(false);
  }
};

// Fungsi pembantu untuk memperbarui state lokasi
const updateLocation = (lat: number, lng: number, accuracyValue: number, isLowAccuracy = false) => {
  const normalizeLatitude = (value: number) => Math.max(-90, Math.min(90, value));
  const normalizeLongitude = (value: number) => {
    const normalized = ((value + 180) % 360 + 360) % 360 - 180;
    return Number(normalized.toFixed(7));
  };

  const normalizedLat = Number(normalizeLatitude(lat).toFixed(7));
  const normalizedLng = normalizeLongitude(lng);

  setLat(normalizedLat);
  setLng(normalizedLng);
  setAccuracy(accuracyValue);
  setShowMap(true);
  
  if (accuracyValue <= 20) {
    setSuccess(`Lokasi akurat (akurasi: ±${Math.round(accuracyValue)} meter)`);
  } else if (accuracyValue <= 50) {
    setSuccess(`Lokasi cukup akurat (akurasi: ±${Math.round(accuracyValue)} meter)`);
  } else {
    setSuccess(
      `Lokasi terdeteksi (akurasi: ±${Math.round(accuracyValue)} meter). ` +
      `Untuk hasil terbaik, pastikan GPS aktif dan sinyal kuat.` +
      (isLowAccuracy ? ' [Akurasi terbatas]' : '')
    );
  }
};

// Fungsi untuk menangani error
const handleLocationError = (error: GeolocationPositionError | Error) => {
  let errorMessage = "Tidak bisa mengakses lokasi. ";
  
  if ('code' in error) {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Izin lokasi diperlukan. Silakan aktifkan akses lokasi di pengaturan browser Anda.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Tidak dapat mengakses layanan lokasi. Pastikan GPS aktif dan sinyal baik.";
        break;
      case error.TIMEOUT:
        errorMessage = "Waktu permintaan habis. Pastikan sinyal GPS cukup kuat dan coba lagi.";
        break;
      default:
        errorMessage = `Kesalahan: ${error.message || 'Tidak dapat mendeteksi lokasi'}`;
    }
  } else {
    errorMessage = error.message || errorMessage;
  }
  
  setError(errorMessage);
  console.error('Error mendapatkan lokasi:', error);
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
      const base64Images: string[] = [];
      for (const file of images) {
        const b64 = await fileToBase64(file);
        base64Images.push(b64);
      }

      await submitReport({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim(),
        lat,
        lng,
        images: base64Images,
      });

      setSuccess("Laporan berhasil dikirim. Terima kasih!");
      setName("");
      setPhone("");
      setDescription("");
      setLat(null);
      setLng(null);
      setImages([]);
      setShowMap(false);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat mengirim laporan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="w-full bg-gradient-to-r from-[#D60000] via-[#ff3b3b] to-[#D60000] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border-2 border-white/60 bg-white/10 flex items-center justify-center overflow-hidden p-1">
              <Image 
                src="/LogoHondawhite.png" 
                alt="Honda" 
                width={50} 
                height={50} 
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">BUAYA</span>
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

      <main className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-4 py-6 sm:px-6 sm:py-8 mt-3 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-red-600 p-1">
              <Image
                src="/buaya_logobaru.png"
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-red-700">BUAYA</h1>
              <p className="text-sm text-zinc-600">Aduanmu Melindungi Motor Banyak Orang</p>
            </div>
          </div>

          {/* Form Fields */}
         <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">
                Nama <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Masukkan nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">
                Nomor Handphone <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="Contoh: 0812xxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                pattern="[0-9]{10,13}"
                title="Masukkan nomor handphone yang valid (10-13 angka)"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">
                Deskripsi Laporan <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Jelaskan laporan Anda secara detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-800">
                  Lokasi
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mendeteksi...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      {lat && lng ? "Perbarui Lokasi" : "Deteksi Lokasi"}
                    </>
                  )}
                </Button>
              </div>
              
              {showMap && lat && lng && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                  <LocationMap lat={lat} lng={lng} />
                </div>
              )}
              
              <p className="text-xs text-zinc-500">
                {lat && lng
                  ? `Lokasi terdeteksi: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                  : "Izinkan akses lokasi agar admin bisa cek titik laporan di peta."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">
                Foto Bukti (maks 3, Ukuran file perfoto 1MB)
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-3 text-zinc-500" />
                      <p className="mb-2 text-sm text-zinc-500">
                        <span className="font-semibold">Klik untuk unggah</span> atau seret dan lepas
                      </p>
                      <p className="text-xs text-zinc-500">Maksimal 3 foto (masing-masing 1MB)</p>
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square overflow-hidden rounded-md border border-zinc-200">
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = [...images];
                            newImages.splice(index, 1);
                            setImages(newImages);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          title="Hapus gambar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mt 1 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim Laporan...
                </>
              ) : (
                "Kirim Laporan"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-xs text-center text-zinc-500">
          Data laporan akan disimpan secara anonim di sistem kami untuk membantu memerangi peredaran oli palsu.
        </p>
      </main>
    </div>
  );
}