import React, { useEffect, useState } from "react";
import { SectionTitle } from "@/components/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CustomerUser } from "@/types";
import * as api from "@/services/mockApi";
import { WalletTxn } from "@/services/mockApi";
import { formatCedis, formatDateTime } from "@/utils/formatters";

export const WalletPage: React.FC = () => {
  const { session } = useAuth();
  const { toast } = useUI();
  const customer = session?.user as CustomerUser;
  const [txns, setTxns] = useState<WalletTxn[]>([]);

  useEffect(() => {
    api.fetchWalletTxns().then(setTxns);
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 19, margin: "10px 22px 14px" }}>Wallet</h2>

      <div style={{ margin: "0 22px", borderRadius: 20, padding: 20, background: "var(--green-dark)" }}>
        <div style={{ color: "#DFF3E7", fontSize: 11.5 }}>Current balance</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "white", margin: "6px 0 14px" }}>
          {formatCedis(customer?.walletBalance ?? 0)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ flex: 1, background: "rgba(255,255,255,0.16)", border: "none", borderRadius: 12, padding: 10, color: "white", fontWeight: 700, fontSize: 12.5 }}
            onClick={() => toast("This would open Mobile Money / card top-up.")}
          >
            + Top up
          </button>
          <button
            style={{ flex: 1, background: "rgba(255,255,255,0.16)", border: "none", borderRadius: 12, padding: 10, color: "white", fontWeight: 700, fontSize: 12.5 }}
            onClick={() => toast("This would start a withdrawal to Mobile Money.")}
          >
            Withdraw
          </button>
        </div>
      </div>

      <SectionTitle title="Transactions" />
      <div className="list-grid">
        {txns.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 22px 10px", padding: 12, border: "1px solid var(--line)", borderRadius: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{formatDateTime(t.when)}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: t.amount < 0 ? "var(--danger)" : "var(--green-dark)" }}>
              {t.amount < 0 ? "– " : "+ "}
              {formatCedis(Math.abs(t.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
