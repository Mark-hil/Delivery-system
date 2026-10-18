import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/Button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface UIContextValue {
  toast: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>();
  const toastTimer = useRef<number>();

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const resolveConfirm = (value: boolean) => {
    setConfirmState(null);
    resolver.current?.(value);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {toastMessage && <div className="toast">{toastMessage}</div>}

      {confirmState && (
        <div className="modal-backdrop" onClick={() => resolveConfirm(false)}>
          <div className="modal-sheet" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmState.title}</h3>
            </div>
            {confirmState.message && <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>{confirmState.message}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button
                label={confirmState.confirmLabel ?? "Confirm"}
                variant={confirmState.destructive ? "danger" : "primary"}
                onClick={() => resolveConfirm(true)}
              />
              <Button label="Cancel" variant="secondary" onClick={() => resolveConfirm(false)} />
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}
