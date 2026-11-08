import React, { createContext, useCallback, useContext, useState } from "react";
import * as api from "@/services/mockApi";
import { IncomingRequest } from "@/services/mockApi";

interface RiderJobContextValue {
  isOnline: boolean;
  toggleOnline: () => void;
  incomingRequest: IncomingRequest | null;
  listening: boolean;
  activeJob: IncomingRequest | null;
  startListening: () => Promise<void>;
  acceptIncoming: () => Promise<void>;
  rejectIncoming: () => void;
  markPickedUp: () => Promise<void>;
  confirmDelivery: (otp: string) => Promise<boolean>;
  clearJob: () => void;
}

const RiderJobContext = createContext<RiderJobContextValue | undefined>(undefined);

export const RiderJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [listening, setListening] = useState(false);
  const [activeJob, setActiveJob] = useState<IncomingRequest | null>(null);

  const [rejectedJobIds, setRejectedJobIds] = useState<Set<string>>(new Set());

  // Check for existing assigned in-progress job on mount
  React.useEffect(() => {
    api.fetchCurrentRiderJob().then((job) => {
      if (job) setActiveJob(job);
    });
  }, []);

  const toggleOnline = useCallback(() => setIsOnline((v) => !v), []);

  const startListening = useCallback(async () => {
    if (!isOnline) return;
    setListening(true);
    try {
      const req = await api.listenForRequest();
      if (req && !rejectedJobIds.has(req.id)) {
        setIncomingRequest(req);
      }
    } finally {
      setListening(false);
    }
  }, [isOnline, rejectedJobIds]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingRequest) return;
    await api.acceptRequest(incomingRequest.id);
    setActiveJob(incomingRequest);
    setIncomingRequest(null);
  }, [incomingRequest]);

  const rejectIncoming = useCallback(() => {
    if (incomingRequest) {
      setRejectedJobIds((prev) => new Set(prev).add(incomingRequest.id));
    }
    setIncomingRequest(null);
  }, [incomingRequest]);

  const markPickedUp = useCallback(async () => {
    if (!activeJob) return;
    await api.confirmPickup(activeJob.id);
  }, [activeJob]);

  const confirmDelivery = useCallback(
    async (otp: string) => {
      if (!activeJob) return false;
      return api.confirmDeliveryWithOtp(activeJob.id, otp);
    },
    [activeJob]
  );

  const clearJob = useCallback(() => setActiveJob(null), []);

  const value: RiderJobContextValue = {
    isOnline,
    toggleOnline,
    incomingRequest,
    listening,
    activeJob,
    startListening,
    acceptIncoming,
    rejectIncoming,
    markPickedUp,
    confirmDelivery,
    clearJob,
  };

  return <RiderJobContext.Provider value={value}>{children}</RiderJobContext.Provider>;
};

export function useRiderJob(): RiderJobContextValue {
  const ctx = useContext(RiderJobContext);
  if (!ctx) throw new Error("useRiderJob must be used within a RiderJobProvider");
  return ctx;
}
