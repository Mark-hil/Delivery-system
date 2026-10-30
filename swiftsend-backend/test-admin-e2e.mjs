async function run() {
  console.log("🔐 1. Logging in as Admin...");
  const loginResp = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "admin@swiftsend.app",
      password: "Admin123",
    }),
  });
  const loginData = await loginResp.json();
  const token = loginData.tokens.accessToken;
  console.log("✅ Admin Logged In. User:", loginData.user.fullName);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Overview KPIs
  console.log("\n📊 2. Testing GET /api/admin/overview...");
  const overviewResp = await fetch("http://localhost:4000/api/admin/overview", {
    headers: authHeaders,
  });
  const overview = await overviewResp.json();
  console.log("✅ Overview KPIs:", overview.kpis);
  console.log(`Recent Activity items: ${overview.recentActivity.length}`);

  // 3. Analytics Reports
  console.log("\n📈 3. Testing GET /api/admin/reports...");
  const reportsResp = await fetch("http://localhost:4000/api/admin/reports", {
    headers: authHeaders,
  });
  const reports = await reportsResp.json();
  console.log("✅ Reports status counts:", reports.deliveriesByStatus);
  console.log("Vehicle breakdown:", reports.deliveriesByVehicle);
  console.log(`Top riders count: ${reports.topRiders.length}`);

  // 4. Compliance Check
  console.log("\n🛡️ 4. Testing POST /api/admin/compliance/check...");
  const complianceResp = await fetch(
    "http://localhost:4000/api/admin/compliance/check",
    {
      method: "POST",
      headers: authHeaders,
    }
  );
  const compliance = await complianceResp.json();
  console.log("✅ Compliance Audit Report:", compliance);

  // 5. Users List & User Creation
  console.log("\n👥 5. Testing Users Management...");
  const usersResp = await fetch("http://localhost:4000/api/admin/users", {
    headers: authHeaders,
  });
  const users = await usersResp.json();
  console.log(`✅ Total Users count: ${users.length}`);

  const testUserEmail = `test.user.${Date.now()}@example.com`;
  const createUserResp = await fetch("http://localhost:4000/api/admin/users", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email: testUserEmail,
      phone: `020${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: "Password123",
      fullName: "Admin Created User",
      role: "customer",
    }),
  });
  const newUser = await createUserResp.json();
  console.log("✅ Created User via Admin Portal:", newUser);

  // Toggle user status
  const toggleResp = await fetch(
    `http://localhost:4000/api/admin/users/${newUser.id}/status`,
    {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "Suspended" }),
    }
  );
  const toggled = await toggleResp.json();
  console.log("✅ Updated User Status:", toggled);

  // Delete test user
  await fetch(`http://localhost:4000/api/admin/users/${newUser.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  console.log("✅ Deleted Test User");

  // 6. Riders Management & Document Verification
  console.log("\n🏍️ 6. Testing Riders Management & Document Verification...");
  const ridersResp = await fetch("http://localhost:4000/api/admin/riders", {
    headers: authHeaders,
  });
  const riders = await ridersResp.json();
  console.log(`✅ Total Riders: ${riders.length}`);
  const firstRider = riders[0];
  console.log(`First Rider: ${firstRider.fullName} | Status: ${firstRider.approvalStatus} | Docs: ${firstRider.documentsCount}`);

  // Verify Documents (+365 days)
  const verifyResp = await fetch(
    `http://localhost:4000/api/admin/riders/${firstRider.id}/verify-documents`,
    {
      method: "POST",
      headers: authHeaders,
    }
  );
  const verifyData = await verifyResp.json();
  console.log("✅ Verified Documents Result:", verifyData.message);

  // 7. Deliveries Management
  console.log("\n📦 7. Testing Deliveries Management...");
  const deliveriesResp = await fetch(
    "http://localhost:4000/api/admin/deliveries",
    {
      headers: authHeaders,
    }
  );
  const deliveries = await deliveriesResp.json();
  console.log(`✅ Total Deliveries found: ${deliveries.length}`);

  // 8. Payments Management
  console.log("\n💳 8. Testing Payments Management...");
  const paymentsResp = await fetch(
    "http://localhost:4000/api/admin/payments",
    {
      headers: authHeaders,
    }
  );
  const payments = await paymentsResp.json();
  console.log(`✅ Total Payments recorded: ${payments.length}`);

  // 9. Team Management
  console.log("\n🏢 9. Testing Team Management...");
  const teamResp = await fetch("http://localhost:4000/api/admin/team", {
    headers: authHeaders,
  });
  const team = await teamResp.json();
  console.log(`✅ Current Admin Team members: ${team.length}`);

  const inviteResp = await fetch("http://localhost:4000/api/admin/team", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email: `support.admin.${Date.now()}@swiftsend.app`,
      fullName: "Support Specialist",
      phone: `027${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: "AdminPassword123",
    }),
  });
  const invited = await inviteResp.json();
  console.log("✅ Invited New Admin Team Member:", invited);

  // Revoke the invited admin
  const deleteTeamResp = await fetch(
    `http://localhost:4000/api/admin/team/${invited.id}`,
    {
      method: "DELETE",
      headers: authHeaders,
    }
  );
  const deleteResult = await deleteTeamResp.json();
  console.log("✅ Revoked Admin Team Member:", deleteResult.message);

  console.log("\n🎉 ALL MILESTONE 5 ADMIN PLATFORM TESTS COMPLETED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
