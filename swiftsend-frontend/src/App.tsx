import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import { UIProvider } from "@/context/UIContext";
import { DeliveryProvider } from "@/context/DeliveryContext";
import { RiderJobProvider } from "@/context/RiderJobContext";
import { registerForLocalNotifications } from "@/services/notifications";

import { RequireGuest, RequireCustomer, RequireRider, RequireAdmin, RoleHome } from "@/routes/guards";

import { SplashPage } from "@/pages/auth/SplashPage";
import { OnboardingPage } from "@/pages/auth/OnboardingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetOtpPage } from "@/pages/auth/ResetOtpPage";

import { CustomerLayout } from "@/layouts/CustomerLayout";
import { HomePage } from "@/pages/customer/HomePage";
import { RequestDeliveryPage } from "@/pages/customer/RequestDeliveryPage";
import { PriceEstimatePage } from "@/pages/customer/PriceEstimatePage";
import { SearchingRiderPage } from "@/pages/customer/SearchingRiderPage";
import { RiderFoundPage } from "@/pages/customer/RiderFoundPage";
import { LiveTrackingPage } from "@/pages/customer/LiveTrackingPage";
import { DeliveryCompletedPage } from "@/pages/customer/DeliveryCompletedPage";
import { RateRiderPage } from "@/pages/customer/RateRiderPage";
import { OrdersPage } from "@/pages/customer/OrdersPage";
import { WalletPage } from "@/pages/customer/WalletPage";
import { ProfilePage } from "@/pages/customer/ProfilePage";

import { RiderLayout } from "@/layouts/RiderLayout";
import { RiderDashboardPage } from "@/pages/rider/RiderDashboardPage";
import { RequestPopupPage } from "@/pages/rider/RequestPopupPage";
import { PickupPage } from "@/pages/rider/PickupPage";
import { DeliveryPage } from "@/pages/rider/DeliveryPage";
import { ProofOfDeliveryPage } from "@/pages/rider/ProofOfDeliveryPage";
import { EarningsPage } from "@/pages/rider/EarningsPage";
import { RiderProfilePage } from "@/pages/rider/RiderProfilePage";

import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminRidersPage } from "@/pages/admin/AdminRidersPage";
import { AdminDeliveriesPage } from "@/pages/admin/AdminDeliveriesPage";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleHome />} />

      {/* Shared auth flow — one login, one registration, for every role */}
      <Route element={<RequireGuest />}>
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-otp" element={<ResetOtpPage />} />
      </Route>

      {/* Customer app */}
      <Route element={<RequireCustomer />}>
        <Route element={<CustomerLayout />}>
          <Route path="/customer/home" element={<HomePage />} />
          <Route path="/customer/orders" element={<OrdersPage />} />
          <Route path="/customer/wallet" element={<WalletPage />} />
          <Route path="/customer/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/customer/request" element={<RequestDeliveryPage />} />
        <Route path="/customer/estimate" element={<PriceEstimatePage />} />
        <Route path="/customer/searching" element={<SearchingRiderPage />} />
        <Route path="/customer/rider-found" element={<RiderFoundPage />} />
        <Route path="/customer/tracking" element={<LiveTrackingPage />} />
        <Route path="/customer/completed" element={<DeliveryCompletedPage />} />
        <Route path="/customer/rate" element={<RateRiderPage />} />
      </Route>

      {/* Rider app */}
      <Route element={<RequireRider />}>
        <Route element={<RiderLayout />}>
          <Route path="/rider/dashboard" element={<RiderDashboardPage />} />
          <Route path="/rider/earnings" element={<EarningsPage />} />
          <Route path="/rider/profile" element={<RiderProfilePage />} />
        </Route>
        <Route path="/rider/request-popup" element={<RequestPopupPage />} />
        <Route path="/rider/pickup" element={<PickupPage />} />
        <Route path="/rider/delivery" element={<DeliveryPage />} />
        <Route path="/rider/proof-of-delivery" element={<ProofOfDeliveryPage />} />
      </Route>

      {/* Admin dashboard */}
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/riders" element={<AdminRidersPage />} />
          <Route path="/admin/deliveries" element={<AdminDeliveriesPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    registerForLocalNotifications().catch(() => {
      // Permission denied or unsupported browser — the app still works, it just
      // won't be able to show document-expiry browser notifications.
    });
  }, []);

  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <DeliveryProvider>
            <RiderJobProvider>
              <AppRoutes />
            </RiderJobProvider>
          </DeliveryProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}
