'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface LocationMapProps {
  lat: number;
  lng: number;
}

export default function LocationMap({ lat, lng }: LocationMapProps) {
  const mapRef = useRef<L.Map>(null);
  const position: [number, number] = [lat, lng]; // Explicitly define as [lat, lng] tuple

  useEffect(() => {
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      const newCenter = L.latLng(lat, lng);
      
      // Only update if the position has changed significantly
      if (currentCenter.distanceTo(newCenter) > 10) { // 10 meters threshold
        mapRef.current.flyTo(newCenter, 15, {
          duration: 1.5,
        });
      }
    }
  }, [lat, lng]);

  // Add error boundary for invalid coordinates
  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return (
      <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center text-red-500">
        Koordinat lokasi tidak valid
      </div>
    );
  }

  return (
    <div className="w-full mt-4">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '300px', width: '100%' }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <strong>Lokasi Anda</strong>
              <div>Lat: {lat.toFixed(6)}</div>
              <div>Lng: {lng.toFixed(6)}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}