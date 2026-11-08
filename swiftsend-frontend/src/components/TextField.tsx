import React, { useEffect, useRef, useState } from "react";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/services/googleMaps";
import { PlaceSuggestion, searchGhanaPlaces } from "@/services/geoService";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  isPassword?: boolean;
  dotColor?: string;
  autoCapitalize?: "none" | "characters" | "words";
  enablePlacesAutocomplete?: boolean;
  onPlaceSelect?: (place: { address: string; lat?: number; lng?: number }) => void;
}

export const TextField: React.FC<Props> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  isPassword,
  dotColor,
  autoCapitalize,
  enablePlacesAutocomplete,
  onPlaceSelect,
}) => {
  const [hidden, setHidden] = useState(!!isPassword);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  // Optional Google Places widget when VITE_GOOGLE_MAPS_API_KEY is configured
  useEffect(() => {
    if (!enablePlacesAutocomplete || !isGoogleMapsConfigured() || !inputRef.current) return;
    let cancelled = false;
    let autocomplete: any = null;
    let listener: any = null;

    loadGoogleMaps().then((gmaps) => {
      if (cancelled || !gmaps?.places?.Autocomplete || !inputRef.current) return;
      autocomplete = new gmaps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "gh" },
        fields: ["formatted_address", "name", "geometry"],
      });
      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address = place?.formatted_address || place?.name || inputRef.current?.value || "";
        const lat = place?.geometry?.location?.lat?.();
        const lng = place?.geometry?.location?.lng?.();
        if (address) {
          onChangeRef.current(address);
          onPlaceSelectRef.current?.({
            address,
            lat: typeof lat === "number" ? lat : undefined,
            lng: typeof lng === "number" ? lng : undefined,
          });
          setFocused(false);
        }
      });
    });

    return () => {
      cancelled = true;
      if (listener?.remove) listener.remove();
    };
  }, [enablePlacesAutocomplete]);

  // Bolt / Yango-style Ghana Address Autocomplete (OpenStreetMap Nominatim + Accra Hubs)
  useEffect(() => {
    if (!enablePlacesAutocomplete || !focused || isGoogleMapsConfigured()) {
      return;
    }
    let cancelled = false;
    setLoadingPlaces(true);
    const timer = setTimeout(async () => {
      const results = await searchGhanaPlaces(value);
      if (!cancelled) {
        setSuggestions(results);
        setLoadingPlaces(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enablePlacesAutocomplete, focused, value]);

  const showDropdown =
    enablePlacesAutocomplete &&
    focused &&
    !isGoogleMapsConfigured() &&
    (suggestions.length > 0 || loadingPlaces);

  return (
    <div className={`field ${error ? "has-error" : ""}`} style={{ position: "relative" }}>
      <label>{label}</label>
      <div className="box">
        {dotColor && <span className="dot" style={{ background: dotColor }} />}
        <input
          ref={inputRef}
          type={isPassword ? (hidden ? "password" : "text") : type}
          value={value}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay closing so click on suggestion item registers first
            setTimeout(() => setFocused(false), 180);
          }}
          onChange={(e) => onChange(e.target.value)}
          autoCapitalize={autoCapitalize ?? (isPassword || type === "email" ? "none" : "sentences")}
        />
        {isPassword && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setHidden((v) => !v)}
            aria-label="Toggle password visibility"
          >
            {hidden ? "👁" : "🙈"}
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 22,
            right: 22,
            marginTop: 4,
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid var(--line)",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
            zIndex: 60,
            maxHeight: 225,
            overflowY: "auto",
          }}
        >
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.address);
                onPlaceSelect?.({
                  address: item.address,
                  lat: item.lat,
                  lng: item.lng,
                });
                setFocused(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #F1F5F9",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--green-soft)",
                  color: "var(--green-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                📍
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 12.5,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
};
