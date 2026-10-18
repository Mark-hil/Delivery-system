import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DocumentValidationPage } from "@/pages/rider/DocumentValidationPage";

/** Blocks access to auth pages (login/register/etc.) once a session exists — sends
 * the person straight into whichever app matches their role. */
export const RequireGuest: React.FC = () => {
  const { session, booting } = useAuth();
  if (booting) return <BootingScreen />;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
};

export const RequireCustomer: React.FC = () => {
  const { session, booting } = useAuth();
  if (booting) return <BootingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== "customer") return <Navigate to="/" replace />;
  return <Outlet />;
};

export const RequireRider: React.FC = () => {
  const { session, booting, riderNeedsDocumentRevalidation } = useAuth();
  if (booting) return <BootingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== "rider") return <Navigate to="/" replace />;
  // A rider with an expired required document is hard-gated here — they cannot
  // reach the dashboard or accept jobs until they resubmit valid documents.
  if (riderNeedsDocumentRevalidation) return <DocumentValidationPage />;
  return <Outlet />;
};

export const RequireAdmin: React.FC = () => {
  const { session, booting } = useAuth();
  if (booting) return <BootingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
};

/** The "/" root route — sends an already-logged-in person to the right app, and a
 * signed-out person into the shared auth flow. */
export const RoleHome: React.FC = () => {
  const { session, booting } = useAuth();
  if (booting) return <BootingScreen />;
  if (!session) return <Navigate to="/splash" replace />;
  if (session.role === "customer") return <Navigate to="/customer/home" replace />;
  if (session.role === "rider") return <Navigate to="/rider/dashboard" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

const BootingScreen: React.FC = () => (
  <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div className="spinner" />
  </div>
);
