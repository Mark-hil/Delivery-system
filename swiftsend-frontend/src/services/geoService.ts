export interface Coords {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
   keywords?: string[];
}

export interface OsrmRouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMin: number;
}

export interface DetectedLocation {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

// Nationwide 16-Region Gazetteer of Major Cities, Universities, Markets & Hubs across Ghana
export const GHANA_PLACES: PlaceSuggestion[] = [
  // Greater Accra Region
  {
    id: "gh-accra-osu",
    title: "Oxford Street, Osu",
    subtitle: "Osu, Greater Accra",
    address: "Oxford Street, Osu, Accra",
    lat: 5.556,
    lng: -0.1826,
    keywords: ["osu", "oxford street"],
  },
  {
    id: "gh-accra-east-legon",
    title: "East Legon (Boundary Road)",
    subtitle: "Ayawaso West, Greater Accra",
    address: "Boundary Road, East Legon, Accra",
    lat: 5.6358,
    lng: -0.1614,
    keywords: ["east legon", "boundary road", "a&c mall"],
  },
  {
    id: "gh-accra-mall",
    title: "Accra Mall",
    subtitle: "Tetteh Quarshie Interchange, Accra",
    address: "Accra Mall, Tetteh Quarshie, Accra",
    lat: 5.6225,
    lng: -0.1733,
    keywords: ["accra mall", "tetteh quarshie"],
  },
  {
    id: "gh-accra-kotoka",
    title: "Kotoka International Airport (T3)",
    subtitle: "Airport, Greater Accra",
    address: "Terminal 3, Kotoka International Airport, Accra",
    lat: 5.6052,
    lng: -0.1718,
    keywords: ["kotoka", "airport residential", "airport"],
  },
  {
    id: "gh-accra-spintex",
    title: "Spintex Road",
    subtitle: "Baatsona / Ledzokuku, Greater Accra",
    address: "Spintex Road, Accra",
    lat: 5.6295,
    lng: -0.1045,
    keywords: ["spintex", "baatsona"],
  },
  {
    id: "gh-accra-madina",
    title: "Madina Zongo Junction",
    subtitle: "La Nkwantanang Madina, Greater Accra",
    address: "Madina Zongo Junction, Madina, Accra",
    lat: 5.6784,
    lng: -0.167,
    keywords: ["madina", "zongo junction", "adenta"],
  },
  {
    id: "gh-accra-legon",
    title: "University of Ghana (Legon)",
    subtitle: "Legon, Greater Accra",
    address: "University of Ghana Main Gate, Legon, Accra",
    lat: 5.6506,
    lng: -0.187,
    keywords: ["legon", "university of ghana"],
  },
  {
    id: "gh-accra-circle",
    title: "Kwame Nkrumah Circle (VIP)",
    subtitle: "Ring Road Central, Greater Accra",
    address: "Kwame Nkrumah Circle, Accra",
    lat: 5.5698,
    lng: -0.2145,
    keywords: ["circle", "kwame nkrumah", "kaneshie", "lapaz", "achimota", "dansoman", "cantonments", "labone", "ridge", "dzorwulu"],
  },
  {
    id: "gh-tema-c1",
    title: "Tema Community 1 Market",
    subtitle: "Tema Metropolis, Greater Accra",
    address: "Community 1, Tema",
    lat: 5.6698,
    lng: -0.0166,
    keywords: ["tema", "community 1", "tema harbour"],
  },

  // Ashanti Region (Kumasi, Obuasi, Ejisu, Mampong)
  {
    id: "gh-kumasi-kejetia",
    title: "Kejetia Market / Central Market",
    subtitle: "Adum, Kumasi, Ashanti Region",
    address: "Kejetia Market, Adum, Kumasi",
    lat: 6.698,
    lng: -1.6231,
    keywords: ["kejetia", "kumasi", "adum"],
  },
  {
    id: "gh-kumasi-knust",
    title: "KNUST Campus (Tech Junction)",
    subtitle: "Ayigya / Oforikrom, Kumasi, Ashanti Region",
    address: "KNUST Main Entrance, Tech Junction, Kumasi",
    lat: 6.6745,
    lng: -1.5716,
    keywords: ["knust", "tech junction", "ayigya", "bomso"],
  },
  {
    id: "gh-kumasi-city-mall",
    title: "Kumasi City Mall (Asokwa)",
    subtitle: "Lake Road, Asokwa, Kumasi, Ashanti Region",
    address: "Kumasi City Mall, Asokwa, Kumasi",
    lat: 6.6728,
    lng: -1.6062,
    keywords: ["kumasi city mall", "asokwa", "ahodwo", "bantama", "suame", "manhyia", "komfo anokye"],
  },
  {
    id: "gh-ejisu",
    title: "Ejisu Roundabout",
    subtitle: "Ejisu Municipal, Ashanti Region",
    address: "Ejisu Junction, Kumasi-Accra Highway, Ashanti",
    lat: 6.7192,
    lng: -1.4706,
    keywords: ["ejisu"],
  },
  {
    id: "gh-obuasi",
    title: "Obuasi Central Market",
    subtitle: "Obuasi Municipal, Ashanti Region",
    address: "Obuasi Central, Obuasi, Ashanti",
    lat: 6.2023,
    lng: -1.6674,
    keywords: ["obuasi"],
  },

  // Western Region (Takoradi, Sekondi, Tarkwa)
  {
    id: "gh-takoradi-market-circle",
    title: "Takoradi Market Circle",
    subtitle: "Takoradi, Sekondi-Takoradi, Western Region",
    address: "Market Circle, Takoradi",
    lat: 4.8975,
    lng: -1.7592,
    keywords: ["takoradi", "market circle", "anaji", "airport ridge takoradi"],
  },
  {
    id: "gh-sekondi",
    title: "Sekondi European Town / Harbour",
    subtitle: "Sekondi-Takoradi, Western Region",
    address: "Sekondi Central, Sekondi-Takoradi",
    lat: 4.9433,
    lng: -1.714,
    keywords: ["sekondi", "essikado"],
  },
  {
    id: "gh-tarkwa",
    title: "Tarkwa (UMaT Campus / Station)",
    subtitle: "Tarkwa-Nsuaem, Western Region",
    address: "University of Mines and Technology, Tarkwa",
    lat: 5.3018,
    lng: -1.9896,
    keywords: ["tarkwa", "umat"],
  },

  // Northern Region (Tamale, Yendi)
  {
    id: "gh-tamale-central",
    title: "Tamale Central Market / Aboabo",
    subtitle: "Tamale Metropolis, Northern Region",
    address: "Tamale Central Market, Tamale",
    lat: 9.4034,
    lng: -0.8424,
    keywords: ["tamale", "aboabo", "sagnarigu", "uds tamale"],
  },
  {
    id: "gh-tamale-tth",
    title: "Tamale Teaching Hospital",
    subtitle: "Eastern Corridor Rd, Tamale, Northern Region",
    address: "Tamale Teaching Hospital, Tamale",
    lat: 9.3921,
    lng: -0.8235,
    keywords: ["tamale teaching hospital", "tth"],
  },

  // Central Region (Cape Coast, UCC, Elmina, Winneba, Kasoa)
  {
    id: "gh-cape-coast-ucc",
    title: "University of Cape Coast (UCC)",
    subtitle: "Cape Coast Metropolis, Central Region",
    address: "University of Cape Coast Main Gate, Cape Coast",
    lat: 5.1155,
    lng: -1.2909,
    keywords: ["ucc", "cape coast", "kotokuraba", "elmina"],
  },
  {
    id: "gh-winneba-uew",
    title: "Winneba Junction / UEW Campus",
    subtitle: "Effutu Municipal, Central Region",
    address: "University of Education, Winneba",
    lat: 5.3511,
    lng: -0.6295,
    keywords: ["winneba", "uew"],
  },
  {
    id: "gh-kasoa",
    title: "Kasoa Interchange / New Market",
    subtitle: "Awutu Senya East, Central Region",
    address: "Kasoa Interchange, Kasoa",
    lat: 5.5345,
    lng: -0.4244,
    keywords: ["kasoa"],
  },

  // Eastern Region (Koforidua, Nkawkaw, Akosombo, Aburi)
  {
    id: "gh-koforidua",
    title: "Koforidua Jackson Park / Central Market",
    subtitle: "New Juaben South, Eastern Region",
    address: "Jackson Park, Koforidua",
    lat: 6.0941,
    lng: -0.2591,
    keywords: ["koforidua", "ktu", "new juaben"],
  },
  {
    id: "gh-nkawkaw",
    title: "Nkawkaw Lorry Station",
    subtitle: "Kwahu West, Eastern Region",
    address: "Nkawkaw Central, Kwahu, Eastern Region",
    lat: 6.5512,
    lng: -0.7668,
    keywords: ["nkawkaw", "kwahu"],
  },

  // Volta Region (Ho, Hohoe, Aflao, Sogakope)
  {
    id: "gh-ho-central",
    title: "Ho Central Market / UHAS",
    subtitle: "Ho Municipal, Volta Region",
    address: "Ho Central Market, Ho, Volta Region",
    lat: 6.6108,
    lng: 0.4713,
    keywords: ["ho", "uhas", "ho technical"],
  },
  {
    id: "gh-hohoe",
    title: "Hohoe Central",
    subtitle: "Hohoe Municipal, Volta Region",
    address: "Hohoe Lorry Station, Hohoe, Volta Region",
    lat: 7.1519,
    lng: 0.4736,
    keywords: ["hohoe", "aflao", "keta", "sogakope"],
  },

  // Bono, Bono East & Ahafo Regions (Sunyani, Techiman, Goaso)
  {
    id: "gh-sunyani",
    title: "Sunyani Central / UENR Campus",
    subtitle: "Sunyani Municipal, Bono Region",
    address: "University of Energy and Natural Resources, Sunyani",
    lat: 7.3399,
    lng: -2.3268,
    keywords: ["sunyani", "uenr", "berekum", "dormaa"],
  },
  {
    id: "gh-techiman",
    title: "Techiman Central Market",
    subtitle: "Techiman Municipal, Bono East Region",
    address: "Techiman Market, Techiman, Bono East",
    lat: 7.5897,
    lng: -1.9344,
    keywords: ["techiman", "kintampo"],
  },
  {
    id: "gh-goaso",
    title: "Goaso Central",
    subtitle: "Asunafo North, Ahafo Region",
    address: "Goaso Main Station, Goaso, Ahafo",
    lat: 6.8036,
    lng: -2.517,
    keywords: ["goaso"],
  },

  // Upper East & Upper West Regions (Bolgatanga, Bawku, Wa)
  {
    id: "gh-bolgatanga",
    title: "Bolgatanga Central Market",
    subtitle: "Bolgatanga Municipal, Upper East Region",
    address: "Bolgatanga Market, Bolgatanga, Upper East",
    lat: 10.7856,
    lng: -0.8514,
    keywords: ["bolgatanga", "bolga", "navrongo", "bawku"],
  },
  {
    id: "gh-wa",
    title: "Wa Central / SDD-UBIDS Campus",
    subtitle: "Wa Municipal, Upper West Region",
    address: "Wa Central Market, Wa, Upper West",
    lat: 10.0601,
    lng: -2.5019,
    keywords: ["wa", "ubids"],
  },

  // Western North, Oti, Savannah & North East Regions
  {
    id: "gh-sefwi-wiawso",
    title: "Sefwi Wiawso",
    subtitle: "Wiawso Municipal, Western North Region",
    address: "Sefwi Wiawso Central, Western North",
    lat: 6.2059,
    lng: -2.4894,
    keywords: ["sefwi", "wiawso", "bibiani"],
  },
  {
    id: "gh-damongo",
    title: "Damongo Central",
    subtitle: "West Gonja, Savannah Region",
    address: "Damongo Town Center, Savannah Region",
    lat: 9.0844,
    lng: -1.8185,
    keywords: ["damongo", "salaga"],
  },
  {
    id: "gh-dambai",
    title: "Dambai Lakeside / Market",
    subtitle: "Krachi East, Oti Region",
    address: "Dambai Central, Oti Region",
    lat: 8.0686,
    lng: 0.1792,
    keywords: ["dambai", "jasikan"],
  },
  {
    id: "gh-nalerigu",
    title: "Nalerigu / Baptist Medical Centre",
    subtitle: "East Mamprusi, North East Region",
    address: "Nalerigu Central, North East Region",
    lat: 10.5253,
    lng: -0.3698,
    keywords: ["nalerigu", "walewale"],
  },
];

// Backward-compatible alias
export const ACCRA_PLACES = GHANA_PLACES;

export function isWithinGhana(lat: number, lng: number): boolean {
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= 4.7 &&
    lat <= 11.2 &&
    lng >= -3.3 &&
    lng <= 1.25
  );
}

const geocodeCache = new Map<string, { lat: number; lng: number; label: string }>();
let cachedDeviceLocation: DetectedLocation | null = null;

export function getCachedDeviceLocation(): DetectedLocation | null {
  return cachedDeviceLocation;
}

export async function searchGhanaPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Show a diverse mix across Ghana's major cities when input is empty
    return [
      GHANA_PLACES[0], // Osu, Accra
      GHANA_PLACES[8], // Kejetia, Kumasi
      GHANA_PLACES[13], // Takoradi Market Circle
      GHANA_PLACES[16], // Tamale Central
      GHANA_PLACES[18], // UCC, Cape Coast
      GHANA_PLACES[21], // Koforidua
      GHANA_PLACES[23], // Ho, Volta
      GHANA_PLACES[25], // Sunyani
    ].filter(Boolean);
  }

  // 1. Instant local matches across all 16 regions of Ghana
  const localMatches = GHANA_PLACES.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.keywords?.some((k) => k.includes(q) || q.includes(k))
  ).slice(0, 5);

  if (q.length < 2) {
    return localMatches.length > 0 ? localMatches : GHANA_PLACES.slice(0, 6);
  }

  const seen = new Set(localMatches.map((m) => m.title.toLowerCase()));
  const combined = [...localMatches];

  // 2. Nationwide OpenStreetMap Nominatim lookup (countrycodes=gh — covers all 16 regions!)
  try {
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", query.trim());
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("countrycodes", "gh");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("limit", "6");

    const photonUrl = new URL("https://photon.komoot.io/api/");
    photonUrl.searchParams.set("q", `${query.trim()} Ghana`);
    photonUrl.searchParams.set("bbox", "-3.26,4.73,1.20,11.18");
    photonUrl.searchParams.set("limit", "5");

    const [nomRes, phoRes] = await Promise.allSettled([
      fetch(nominatimUrl.toString(), { headers: { Accept: "application/json" } }),
      fetch(photonUrl.toString(), { headers: { Accept: "application/json" } }),
    ]);

    if (nomRes.status === "fulfilled" && nomRes.value.ok) {
      const items = (await nomRes.value.json()) as Array<{
        place_id: number;
        display_name: string;
        name?: string;
        lat: string;
        lon: string;
      }>;

      for (const item of items) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isWithinGhana(lat, lng)) continue;
        const parts = item.display_name.split(",").map((s) => s.trim());
        const title = item.name || parts[0] || "Ghana";
        const subtitle = parts.slice(1, 4).join(", ") || "Ghana";
        const address = parts.slice(0, 3).join(", ");
        const key = `${title.toLowerCase()}-${subtitle.toLowerCase()}`;
        if (!seen.has(key) && combined.length < 8) {
          seen.add(key);
          geocodeCache.set(address.toLowerCase(), { lat, lng, label: title });
          combined.push({
            id: `osm-${item.place_id}`,
            title,
            subtitle,
            address,
            lat,
            lng,
          });
        }
      }
    }

    if (phoRes.status === "fulfilled" && phoRes.value.ok && combined.length < 8) {
      const phoData = (await phoRes.value.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: {
            osm_id?: number;
            name?: string;
            street?: string;
            city?: string;
            district?: string;
            state?: string;
            countrycode?: string;
          };
        }>;
      };

      for (const feat of phoData.features ?? []) {
        const coords = feat.geometry?.coordinates;
        const props = feat.properties;
        if (!coords || !props) continue;
        if (props.countrycode && props.countrycode.toUpperCase() !== "GH") continue;
        const [lng, lat] = coords;
        if (!isWithinGhana(lat, lng)) continue;
        const title = props.name || props.street || props.city || "Ghana";
        const subParts = [props.district, props.city, props.state].filter(Boolean);
        const subtitle = subParts.join(", ") || "Ghana";
        const address = [title, props.city || props.state].filter(Boolean).join(", ");
        const key = `${title.toLowerCase()}-${subtitle.toLowerCase()}`;
        if (!seen.has(key) && combined.length < 8) {
          seen.add(key);
          geocodeCache.set(address.toLowerCase(), { lat, lng, label: title });
          combined.push({
            id: `pho-${props.osm_id ?? Math.random()}`,
            title,
            subtitle,
            address,
            lat,
            lng,
          });
        }
      }
    }
  } catch {
    // Gracefully return local matches if offline
  }

  return combined;
}

export function resolveSyncGhanaCoords(
  address: string | undefined,
  fallback: { lat: number; lng: number; label: string },
  explicitCoords?: Coords
): { lat: number; lng: number; label: string } {
  const shortLabel = address?.trim() ? address.split(",")[0] || fallback.label : fallback.label;
  if (
    explicitCoords &&
    typeof explicitCoords.lat === "number" &&
    typeof explicitCoords.lng === "number" &&
    isWithinGhana(explicitCoords.lat, explicitCoords.lng)
  ) {
    return {
      lat: explicitCoords.lat,
      lng: explicitCoords.lng,
      label: shortLabel,
    };
  }
  if (!address || !address.trim()) return fallback;
  const lower = address.trim().toLowerCase();

  const cached = geocodeCache.get(lower);
  if (cached) {
    return { ...cached, label: shortLabel || cached.label };
  }

  for (const place of GHANA_PLACES) {
    if (
      place.title.toLowerCase().includes(lower) ||
      lower.includes(place.title.toLowerCase()) ||
      place.keywords?.some((k) => lower.includes(k))
    ) {
      return { lat: place.lat, lng: place.lng, label: shortLabel || place.title };
    }
  }

  return {
    lat: fallback.lat,
    lng: fallback.lng,
    label: shortLabel,
  };
}

export async function geocodeGhanaAddress(
  address: string | undefined,
  fallback: { lat: number; lng: number; label: string },
  explicitCoords?: Coords
): Promise<{ lat: number; lng: number; label: string }> {
  const shortLabel = address?.trim() ? address.split(",")[0] || fallback.label : fallback.label;
  if (
    explicitCoords &&
    typeof explicitCoords.lat === "number" &&
    typeof explicitCoords.lng === "number" &&
    isWithinGhana(explicitCoords.lat, explicitCoords.lng)
  ) {
    return {
      lat: explicitCoords.lat,
      lng: explicitCoords.lng,
      label: shortLabel,
    };
  }
  if (!address || !address.trim()) return fallback;

  const lower = address.trim().toLowerCase();
  const cached = geocodeCache.get(lower);
  if (cached) {
    return { ...cached, label: shortLabel || cached.label };
  }

  for (const place of GHANA_PLACES) {
    if (
      place.title.toLowerCase().includes(lower) ||
      lower.includes(place.title.toLowerCase()) ||
      place.keywords?.some((k) => lower.includes(k))
    ) {
      const resolved = { lat: place.lat, lng: place.lng, label: shortLabel || place.title };
      geocodeCache.set(lower, resolved);
      return resolved;
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "gh");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (res.ok) {
      const items = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
      if (items[0]) {
        const lat = parseFloat(items[0].lat);
        const lng = parseFloat(items[0].lon);
        if (isWithinGhana(lat, lng)) {
          const resolved = { lat, lng, label: shortLabel };
          geocodeCache.set(lower, resolved);
          return resolved;
        }
      }
    }
  } catch {
    // Ignore network error and use fallback
  }

  return { lat: fallback.lat, lng: fallback.lng, label: shortLabel };
}

export async function reverseGeocodeGhana(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "18");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        name?: string;
        display_name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          quarter?: string;
          city?: string;
          town?: string;
          village?: string;
          state?: string;
        };
      };
      const road = data.address?.road || data.name;
      const area =
        data.address?.suburb ||
        data.address?.neighbourhood ||
        data.address?.quarter ||
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.state ||
        "Ghana";
      const city = data.address?.city || data.address?.town || data.address?.state;
      if (road && road !== area) {
        const full = city && city !== area ? `${road}, ${area}, ${city}` : `${road}, ${area}`;
        geocodeCache.set(full.toLowerCase(), { lat, lng, label: road });
        return full;
      }
      if (data.display_name) {
        const formatted = data.display_name
          .split(",")
          .slice(0, 3)
          .map((s) => s.trim())
          .join(", ");
        geocodeCache.set(formatted.toLowerCase(), { lat, lng, label: formatted.split(",")[0] });
        return formatted;
      }
    }
  } catch {
    // Fallback to nearest known place in Ghana
  }

  let nearest = GHANA_PLACES[0];
  let bestDist = Infinity;
  for (const place of GHANA_PLACES) {
    const d = Math.hypot(place.lat - lat, place.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      nearest = place;
    }
  }
  return `Near ${nearest.title}`;
}

export async function detectUserLocationInGhana(): Promise<DetectedLocation | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return cachedDeviceLocation;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Strict Ghana boundary check: reject desktop ISP/VPN IP coordinates outside Ghana
        // so the map never zooms out across continents/countries.
        if (!isWithinGhana(lat, lng)) {
          resolve(cachedDeviceLocation);
          return;
        }
        const address = await reverseGeocodeGhana(lat, lng);
        const parts = address.split(",").map((s) => s.trim());
        const city = parts[parts.length - 1] || parts[0] || "Ghana";
        const detected: DetectedLocation = {
          address,
          city,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        };
        cachedDeviceLocation = detected;
        geocodeCache.set(address.toLowerCase(), { lat: detected.lat, lng: detected.lng, label: parts[0] || address });
        resolve(detected);
      },
      () => {
        resolve(cachedDeviceLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 6500,
        maximumAge: 60000,
      }
    );
  });
}

const routeCache = new Map<string, OsrmRouteResult>();

export async function fetchOsrmRoute(pickup: Coords, dropoff: Coords): Promise<OsrmRouteResult> {
  const key = `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}->${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        code?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry?: {
            coordinates?: [number, number][]; // [lng, lat][]
          };
        }>;
      };
      const route = data.routes?.[0];
      const rawCoords = route?.geometry?.coordinates;
      if (route && rawCoords && rawCoords.length >= 2) {
        const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
        const distanceKm = Math.max(1.0, Math.round((route.distance / 1000) * 10) / 10);
        const durationMin = Math.max(6, Math.round(route.duration / 60));
        const result = { coordinates, distanceKm, durationMin };
        routeCache.set(key, result);
        return result;
      }
    }
  } catch {
    // Fallback to interpolated road path if OSRM is unreachable
  }

  const steps = 16;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * 0.0045;
    coordinates.push([
      pickup.lat + (dropoff.lat - pickup.lat) * t + curve,
      pickup.lng + (dropoff.lng - pickup.lng) * t - curve,
    ]);
  }
  const straightKm = Math.hypot(dropoff.lat - pickup.lat, dropoff.lng - pickup.lng) * 111;
  const distanceKm = Math.max(1.2, Math.round(straightKm * 1.25 * 10) / 10);
  const durationMin = Math.max(8, Math.round(distanceKm * 2.8));
  return { coordinates, distanceKm, durationMin };
}
