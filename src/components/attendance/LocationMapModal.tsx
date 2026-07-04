"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, LogIn, LogOut } from "lucide-react";

// Custom colored circle markers — avoids Next.js asset path issues with default leaflet PNGs
function makeIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

const checkInIcon  = makeIcon("#10b981"); // emerald
const checkOutIcon = makeIcon("#ef4444"); // red

interface GpsCoords { lat: number; lng: number; accuracy: number }

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  employeeName?: string;
  checkIn?: string;
  checkOut?: string;
  checkInLocation?: GpsCoords;
  checkOutLocation?: GpsCoords;
}

// Forces the map to fit both markers into view
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
    } else {
      map.fitBounds(points as [number, number][], { padding: [50, 50] });
    }
  }, [map, points]);
  return null;
}

export default function LocationMapModal({
  open, onClose, date, employeeName,
  checkIn, checkOut, checkInLocation, checkOutLocation,
}: Props) {
  const points: [number, number][] = [];
  if (checkInLocation)  points.push([checkInLocation.lat,  checkInLocation.lng]);
  if (checkOutLocation) points.push([checkOutLocation.lat, checkOutLocation.lng]);

  const center: [number, number] = points[0] ?? [20.5937, 78.9629]; // India fallback

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-blue-600" />
            {employeeName ? `${employeeName} — ` : ""}Location on {date}
          </DialogTitle>
        </DialogHeader>

        {/* Legend */}
        <div className="flex items-center gap-5 px-5 pb-3 text-xs text-slate-600">
          {checkInLocation && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <LogIn className="w-3 h-3 text-emerald-600" />
              Check-in {checkIn} — ±{checkInLocation.accuracy}m
            </span>
          )}
          {checkOutLocation && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <LogOut className="w-3 h-3 text-red-500" />
              Check-out {checkOut} — ±{checkOutLocation.accuracy}m
            </span>
          )}
          {!checkInLocation && !checkOutLocation && (
            <span className="text-slate-400">No location data recorded</span>
          )}
        </div>

        {/* Map */}
        <div className="h-[420px] w-full">
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap'
            />
            <FitBounds points={points} />

            {checkInLocation && (
              <>
                <Marker position={[checkInLocation.lat, checkInLocation.lng]} icon={checkInIcon}>
                  <Popup>
                    <div className="text-xs font-medium">
                      <div className="text-emerald-700 font-semibold mb-0.5">Check-in</div>
                      <div>{checkIn}</div>
                      <div className="text-slate-500">±{checkInLocation.accuracy}m accuracy</div>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[checkInLocation.lat, checkInLocation.lng]}
                  radius={checkInLocation.accuracy}
                  pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.1, weight: 1 }}
                />
              </>
            )}

            {checkOutLocation && (
              <>
                <Marker position={[checkOutLocation.lat, checkOutLocation.lng]} icon={checkOutIcon}>
                  <Popup>
                    <div className="text-xs font-medium">
                      <div className="text-red-600 font-semibold mb-0.5">Check-out</div>
                      <div>{checkOut}</div>
                      <div className="text-slate-500">±{checkOutLocation.accuracy}m accuracy</div>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[checkOutLocation.lat, checkOutLocation.lng]}
                  radius={checkOutLocation.accuracy}
                  pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1 }}
                />
              </>
            )}
          </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
