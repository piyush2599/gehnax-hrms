export interface GpsCoords {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export type GpsErrorCode =
  | "permission_denied"    // user blocked — needs to open browser/OS settings
  | "position_unavailable" // GPS hardware issue
  | "timeout"
  | "mock_detected"
  | "not_supported"
  | "unknown";

export type GpsResult =
  | { coords: GpsCoords }
  | { error: string; code: GpsErrorCode };

function getPosition(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, opts)
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

/**
 * Captures GPS coordinates and runs mock-location detection.
 * Takes two readings 600 ms apart so we can check for jitter.
 * Real GPS always drifts slightly; mock providers return bit-identical coordinates.
 */
export async function captureGPS(): Promise<GpsResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { error: "GPS is not supported on this device.", code: "not_supported" };
  }

  // Pre-check permission state where API is available (Android Chrome, desktop)
  // — avoids silently failing when already denied
  try {
    const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (perm.state === "denied") {
      return { error: "Location permission is blocked.", code: "permission_denied" };
    }
  } catch {
    // navigator.permissions not available on older iOS Safari — ignore and let getCurrentPosition handle it
  }

  const t0 = Date.now();
  let pos1: GeolocationPosition;
  try {
    pos1 = await getPosition(GEO_OPTS);
  } catch (err: any) {
    switch (err?.code) {
      case 1:
        return { error: "Location permission is blocked.", code: "permission_denied" };
      case 2:
        return { error: "GPS signal unavailable. Move outdoors and try again.", code: "position_unavailable" };
      case 3:
        return { error: "Location request timed out. Please try again with GPS enabled.", code: "timeout" };
      default:
        return { error: "Could not get your location. Please try again.", code: "unknown" };
    }
  }
  const elapsed = Date.now() - t0;

  // Second reading for jitter detection
  await sleep(600);
  let pos2: GeolocationPosition;
  try {
    pos2 = await getPosition(GEO_OPTS);
  } catch {
    pos2 = pos1; // fallback – only first reading available
  }

  const { latitude: lat, longitude: lng, accuracy } = pos1.coords;

  // Mock-detection signals
  const isInstant   = elapsed < 200;          // real GPS takes longer to get first fix
  const isPerfect   = accuracy < 3;           // mock apps often report 0–2 m accuracy
  const noJitter    =                         // real GPS always drifts between readings
    pos1.coords.latitude  === pos2.coords.latitude  &&
    pos1.coords.longitude === pos2.coords.longitude;

  let mockSignals = 0;
  if (isInstant) mockSignals++;
  if (isPerfect) mockSignals++;
  if (noJitter && isInstant) mockSignals++;

  if (mockSignals >= 2) {
    return {
      error: "Mock/fake GPS detected. Please disable any fake-location apps and try again.",
      code: "mock_detected",
    };
  }

  return { coords: { lat, lng, accuracy: Math.round(accuracy) } };
}
