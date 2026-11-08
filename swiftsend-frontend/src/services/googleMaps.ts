// Google Maps JavaScript SDK Singleton Loader with Graceful Fallback
declare global {
  interface Window {
    google?: {
      maps?: any;
    };
    gm_authFailure?: () => void;
    __swiftsendGmapsInit?: () => void;
  }
}

let loadPromise: Promise<any | null> | null = null;
let authFailed = false;
const authFailureListeners = new Set<() => void>();

export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

export function isGoogleMapsConfigured(): boolean {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  return Boolean(apiKey && !authFailed);
}

export function loadGoogleMaps(): Promise<any | null> {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  if (!apiKey || authFailed) {
    return Promise.resolve(null);
  }

  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    window.gm_authFailure = () => {
      authFailed = true;
      loadPromise = null;
      authFailureListeners.forEach((cb) => cb());
      resolve(null);
    };

    window.__swiftsendGmapsInit = () => {
      if (authFailed) {
        resolve(null);
      } else {
        resolve(window.google?.maps ?? null);
      }
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,geometry&region=GH&callback=__swiftsendGmapsInit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

