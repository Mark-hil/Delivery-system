import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DeliveryRequest } from "@/types";
import * as api from "@/services/mockApi";
import { detectUserLocationInGhana } from "@/services/geoService";

export interface DeliveryDraft {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  packageType: string;
  packageDescription: string;
  weight: string;
  instructions: string;
  deliveryType: "immediate" | "scheduled";
  vehicleType: "bike" | "car" | "van" | "truck";
}

interface DeliveryContextValue {
  draft: DeliveryDraft;
  setDraft: (d: Partial<DeliveryDraft>) => void;
  estimate: Awaited<ReturnType<typeof api.estimateDelivery>> | null;
  current: DeliveryRequest | null;
  loadingEstimate: boolean;
  loadingMatch: boolean;
  fetchEstimate: () => Promise<void>;
  confirmRequest: (paymentMethod?: "wallet" | "mobile_money" | "card") => Promise<DeliveryRequest | undefined>;
  waitForMatch: () => Promise<void>;
  finishDelivery: () => Promise<void>;
  resetFlow: () => void;
}

const defaultDraft: DeliveryDraft = {
  pickupAddress: "12 Oxford Street, Osu",
  dropoffAddress: "Plot 9 Boundary Road, East Legon",
  packageType: "Documents",
  packageDescription: "Sealed envelope, contract papers",
  weight: "Under 1kg",
  instructions: "Call on arrival, gate code 4471",
  deliveryType: "immediate",
  vehicleType: "bike",
};

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraftState] = useState<DeliveryDraft>(defaultDraft);
  const [estimate, setEstimate] = useState<DeliveryContextValue["estimate"]>(null);
  const [current, setCurrent] = useState<DeliveryRequest | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Live Device GPS Auto-Detection on startup
  useEffect(() => {
    let cancelled = false;
    detectUserLocationInGhana().then((loc) => {
      if (cancelled || !loc) return;
      setDraftState((prev) => {
        if (prev.pickupAddress !== defaultDraft.pickupAddress || prev.pickupLat != null) {
          return prev;
        }
        return {
          ...prev,
          pickupAddress: loc.address,
          pickupLat: loc.lat,
          pickupLng: loc.lng,
        };
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setDraft = useCallback((d: Partial<DeliveryDraft>) => {
    setDraftState((prev) => ({ ...prev, ...d }));
  }, []);

  const fetchEstimate = useCallback(async () => {
    setLoadingEstimate(true);
    try {
      const result = await api.estimateDelivery({
        pickupAddress: draft.pickupAddress,
        dropoffAddress: draft.dropoffAddress,
        pickupLat: draft.pickupLat,
        pickupLng: draft.pickupLng,
        dropoffLat: draft.dropoffLat,
        dropoffLng: draft.dropoffLng,
        vehicleType: draft.vehicleType,
      });
      setEstimate(result);
    } finally {
      setLoadingEstimate(false);
    }
  }, [draft]);

  const confirmRequest = useCallback(
    async (paymentMethod: "wallet" | "mobile_money" | "card" = "mobile_money") => {
      if (!estimate) return undefined;
      const delivery = await api.requestRider({ ...draft, ...estimate, paymentMethod });
      setCurrent(delivery);
      return delivery;
    },
    [draft, estimate]
  );

  const waitForMatch = useCallback(async () => {
    if (!current) return;
    setLoadingMatch(true);
    try {
      const matched = await api.matchRider(current);
      setCurrent(matched);
    } finally {
      setLoadingMatch(false);
    }
  }, [current]);

  const finishDelivery = useCallback(async () => {
    if (!current) return;
    const done = await api.completeDelivery(current);
    setCurrent(done);
  }, [current]);

  const resetFlow = useCallback(() => {
    setDraftState(defaultDraft);
    setEstimate(null);
    setCurrent(null);
  }, []);

  const value: DeliveryContextValue = {
    draft,
    setDraft,
    estimate,
    current,
    loadingEstimate,
    loadingMatch,
    fetchEstimate,
    confirmRequest,
    waitForMatch,
    finishDelivery,
    resetFlow,
  };

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
};

export function useDelivery(): DeliveryContextValue {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDelivery must be used within a DeliveryProvider");
  return ctx;
}
