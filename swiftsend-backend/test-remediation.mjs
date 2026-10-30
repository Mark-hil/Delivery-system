import assert from "node:assert";

const BASE_URL = "http://localhost:4000/api";

async function post(path, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function get(path, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function main() {
  console.log("🛡️  Starting SwiftSend Master Security & Remediation Verification Suite...\n");

  // 1. Authenticate test users
  console.log("1. Authenticating test users...");
  const customerRes = await post("/auth/login", {
    identifier: "ama.owusu@email.com",
    password: "Password1",
  });
  assert.strictEqual(customerRes.status, 200, "Customer login failed");
  const customerToken = customerRes.data.tokens.accessToken;
  const customerId = customerRes.data.user.id;
  console.log(`   ✅ Customer logged in: ${customerRes.data.user.fullName}`);

  const riderRes = await post("/auth/login", {
    identifier: "kwame.mensah@email.com",
    password: "Password1",
  });
  assert.strictEqual(riderRes.status, 200, "Rider login failed");
  const riderToken = riderRes.data.tokens.accessToken;
  const riderUserId = riderRes.data.user.id;
  console.log(`   ✅ Rider logged in: ${riderRes.data.user.fullName}`);

  const adminRes = await post("/auth/login", {
    identifier: "admin@swiftsend.app",
    password: "Admin123",
  });
  assert.strictEqual(adminRes.status, 200, "Admin login failed");
  const adminToken = adminRes.data.tokens.accessToken;
  console.log(`   ✅ Admin logged in: ${adminRes.data.user.fullName}\n`);

  // =========================================================================
  // PHASE 1: AUTH & SENSITIVE DATA EXPOSURE
  // =========================================================================
  console.log("=========================================================================");
  console.log("🔍 PHASE 1: Auth & Sensitive Data Exposure Verification");
  console.log("=========================================================================");

  // 1.1 OTP Request Leak Prevention
  console.log("1.1 Checking that /auth/otp/request does NOT leak OTP code in response...");
  const otpReq = await post("/auth/otp/request", {
    destination: "+233241112233",
    purpose: "login",
  });
  assert.strictEqual(otpReq.status, 200);
  assert.strictEqual(
    otpReq.data.code,
    undefined,
    "FAILED: Plaintext OTP code was leaked in response!"
  );
  console.log("   ✅ Plaintext OTP is NOT leaked in API response.");

  // 1.2 User Profile Password Hash Leak Prevention
  console.log("1.2 Checking that Admin getUserById strips passwordHash...");
  const usersList = await get("/admin/users", adminToken);
  assert.strictEqual(usersList.status, 200);
  const targetUser = usersList.data[0];
  const userDetail = await get(`/admin/users/${targetUser.id}`, adminToken);
  assert.strictEqual(userDetail.status, 200);
  assert.strictEqual(
    userDetail.data.passwordHash,
    undefined,
    "FAILED: passwordHash is exposed in admin user details!"
  );
  console.log("   ✅ passwordHash is stripped from user details.");

  // 1.3 OTP Verification & Rate Limiting
  console.log("1.3 Testing OTP verification failures and Rate Limiter (5 req/min limit)...");
  const testPhone = "+233509998877";
  await post("/auth/otp/request", { destination: testPhone, purpose: "login" });
  let rateLimited = false;
  for (let i = 1; i <= 7; i++) {
    const attempt = await post("/auth/otp/verify", {
      destination: testPhone,
      code: `000${i}`,
      purpose: "login",
    });
    if (attempt.status === 429) {
      rateLimited = true;
      console.log(`   ✅ Request #${i} blocked by Throttler (HTTP 429 Too Many Requests)`);
      break;
    } else {
      assert.strictEqual(attempt.data.verified, false);
    }
  }
  assert.strictEqual(rateLimited, true, "FAILED: Rate limiter did not trigger 429 after 5 requests!");
  console.log("   ✅ Rate limiting strictly enforced on OTP verification.\n");

  // =========================================================================
  // PHASE 4: INPUT VALIDATION
  // =========================================================================
  console.log("=========================================================================");
  console.log("🔍 PHASE 4: Input Validation (Coordinate Boundaries)");
  console.log("=========================================================================");

  // 4.1 Coordinate Boundary Validation
  console.log("4.1 Testing coordinate validation on /deliveries/estimate with out-of-bounds lat/lng...");
  const badCoords = await post(
    "/deliveries/estimate",
    {
      pickupAddress: "Accra Mall",
      dropoffAddress: "Kotoka Airport",
      vehicleType: "bike",
      pickupLat: 125.0, // Invalid: must be <= 90
      pickupLng: -250.0, // Invalid: must be >= -180
    },
    customerToken
  );
  assert.strictEqual(badCoords.status, 400, "FAILED: Out-of-bounds coordinates were accepted!");
  console.log("   ✅ Out-of-bounds coordinates correctly rejected with 400 Bad Request.");

  // =========================================================================
  // PHASE 2 & 3: BOLA / IDOR, PRICING INTEGRITY & WALLET DEDUCTION
  // =========================================================================
  console.log("\n=========================================================================");
  console.log("🔍 PHASE 2 & 3: BOLA / IDOR, Pricing Integrity & Wallet Deduction");
  console.log("=========================================================================");

  // 2.1 Create a new customer with 0 balance and verify rejection
  console.log("3.1 Testing delivery creation with insufficient customer wallet balance...");
  const brokeCustomerEmail = `broke.customer.${Date.now()}@test.com`;
  const brokeReg = await post("/auth/customer/register", {
    fullName: "Broke Bob",
    email: brokeCustomerEmail,
    phone: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
    password: "Password123!",
  });
  assert.strictEqual(brokeReg.status, 201);
  const brokeToken = brokeReg.data.tokens.accessToken;

  const brokeOrder = await post(
    "/deliveries/request",
    {
      pickupAddress: "Ridge, Accra",
      dropoffAddress: "Labone, Accra",
      packageType: "Gift",
      packageDescription: "Birthday parcel",
      weight: "1.2 kg",
      deliveryType: "immediate",
      vehicleType: "bike",
      distanceKm: 5,
      etaMinutes: 15,
      baseFee: 15,
      distanceFee: 15,
      serviceFee: 2,
      totalFee: 32,
    },
    brokeToken
  );
  assert.strictEqual(brokeOrder.status, 400);
  assert.match(
    brokeOrder.data.message,
    /Insufficient wallet balance/i,
    "FAILED: Customer with insufficient balance was allowed to create delivery!"
  );
  console.log("   ✅ Insufficient wallet balance correctly rejected with 400 Bad Request.");

  // 3.2 Fund customer wallet via admin/database or check existing customer (Ama Owusu)
  console.log("3.2 Checking Customer Ama Owusu wallet balance before order...");
  const initialWallet = await get("/customer/wallet", customerToken);
  const initialBalance = Number(initialWallet.data.balance);
  console.log(`   💰 Initial Ama Owusu Balance: GHS ${initialBalance.toFixed(2)}`);

  // 3.3 Create a delivery with tampered fees (e.g. totalFee: 1.0) and verify server overrides it
  console.log("3.3 Creating delivery with client fee tampering (passing totalFee: 1.0)...");
  const tamperedOrder = await post(
    "/deliveries/request",
    {
      pickupAddress: "Airport Residential Area, Accra",
      dropoffAddress: "Osu Oxford Street, Accra",
      packageType: "Documents",
      packageDescription: "Urgent contract",
      weight: "0.5 kg",
      deliveryType: "immediate",
      vehicleType: "bike",
      distanceKm: 1, // Tampered
      etaMinutes: 5, // Tampered
      baseFee: 0.1, // Tampered
      distanceFee: 0.1, // Tampered
      serviceFee: 0.1, // Tampered
      totalFee: 1.0, // Tampered
    },
    customerToken
  );
  assert.strictEqual(tamperedOrder.status, 201);
  const delivery = tamperedOrder.data;
  console.log(`   Created Delivery ID: ${delivery.id}, Tracking: ${delivery.trackingNumber}`);
  console.log(`   Server-Calculated Total Fee: GHS ${delivery.totalFee} (Tampered 1.0 was overridden!)`);
  assert(
    Number(delivery.totalFee) > 20,
    `FAILED: Total fee ${delivery.totalFee} was not calculated server-side!`
  );
  console.log("   ✅ Server-authoritative pricing strictly enforced.");

  // 2.2 BOLA / IDOR Verification: Bob (another customer) attempts to view Ama's delivery
  console.log("2.2 Testing BOLA / IDOR: Bob attempts to view Ama's delivery...");
  const unauthorizedView = await get(`/deliveries/${delivery.id}`, brokeToken);
  assert.strictEqual(
    unauthorizedView.status,
    403,
    "FAILED: Unauthorized customer was able to view delivery!"
  );
  console.log("   ✅ BOLA / IDOR protected: Unauthorized user received 403 Forbidden.");

  // 2.3 Unassigned rider attempts to view delivery
  console.log("2.3 Testing BOLA: Unassigned rider attempts to view Ama's delivery...");
  const unassignedRiderView = await get(`/deliveries/${delivery.id}`, riderToken);
  assert.strictEqual(
    unassignedRiderView.status,
    403,
    "FAILED: Unassigned rider was able to view delivery!"
  );
  console.log("   ✅ BOLA protected: Unassigned rider received 403 Forbidden.");

  // 2.4 Customer views delivery: deliveryOtp MUST be visible to owner customer
  const customerView = await get(`/deliveries/${delivery.id}`, customerToken);
  assert.strictEqual(customerView.status, 200);
  assert(customerView.data.deliveryOtp, "Customer should receive the 4-digit completion OTP");
  const actualOtp = customerView.data.deliveryOtp;
  console.log(`   Customer holds delivery OTP: ${actualOtp}`);

  // 3.4 Rider accepts job
  console.log("3.4 Rider accepts job...");
  const acceptRes = await post(`/rider/jobs/${delivery.id}/accept`, {}, riderToken);
  assert.strictEqual(acceptRes.status, 200);

  // 2.5 Assigned rider views delivery: deliveryOtp MUST be redacted
  console.log("2.5 Testing deliveryOtp redaction for assigned rider...");
  const assignedRiderView = await get(`/deliveries/${delivery.id}`, riderToken);
  assert.strictEqual(assignedRiderView.status, 200);
  assert.strictEqual(
    assignedRiderView.data.deliveryOtp,
    undefined,
    "FAILED: deliveryOtp was exposed to rider!"
  );
  console.log("   ✅ deliveryOtp is securely stripped for assigned rider.");

  console.log("3.5 Rider confirms pickup...");
  const pickupRes = await post(`/rider/jobs/${delivery.id}/pickup`, {}, riderToken);
  assert.strictEqual(pickupRes.status, 200);

  // 3.6 Rider completes delivery with the valid OTP
  console.log("3.6 Rider completes delivery with valid OTP...");
  const completeRes = await post(
    `/rider/jobs/${delivery.id}/complete`,
    { otp: actualOtp },
    riderToken
  );
  assert.strictEqual(completeRes.status, 200);
  console.log("   ✅ Delivery successfully completed.");

  // 3.6 Verify Replay Attack Prevention on Completion
  console.log("3.7 Testing replay attack prevention on completeDelivery...");
  const replayRes = await post(
    `/rider/jobs/${delivery.id}/complete`,
    { otp: actualOtp },
    riderToken
  );
  assert.strictEqual(replayRes.status, 400);
  assert.match(replayRes.data.message, /already completed/i);
  console.log("   ✅ Replay attack rejected: Delivery cannot be completed twice.");

  // 3.7 Verify Customer Wallet Deduction & WalletTxn Debit
  console.log("3.8 Verifying Customer Wallet Deduction & WalletTxn Debit...");
  const finalWallet = await get("/customer/wallet", customerToken);
  const finalBalance = Number(finalWallet.data.balance);
  const expectedBalance = Math.round((initialBalance - Number(delivery.totalFee)) * 100) / 100;
  console.log(`   💰 Final Balance: GHS ${finalBalance.toFixed(2)} (Expected: GHS ${expectedBalance.toFixed(2)})`);
  assert.strictEqual(
    finalBalance,
    expectedBalance,
    "FAILED: Customer wallet was not decremented by totalFee!"
  );

  const debitTxn = finalWallet.data.txns.find((t) =>
    t.label.includes(delivery.trackingNumber)
  );
  assert(debitTxn, "FAILED: WalletTxn debit record not found!");
  assert.strictEqual(
    Number(debitTxn.amount),
    -Number(delivery.totalFee),
    "FAILED: Debit transaction amount does not match negative totalFee!"
  );
  console.log(`   ✅ WalletTxn debit confirmed: ${debitTxn.label} -> GHS ${debitTxn.amount}`);

  // 2.5 Rating Security: Unauthorized user cannot rate delivery; cannot rate twice
  console.log("2.5 Testing Rating Security...");
  const unauthRate = await post(
    `/deliveries/${delivery.id}/rate`,
    { stars: 5, comment: "Fake rating" },
    brokeToken
  );
  assert.strictEqual(unauthRate.status, 403);
  console.log("   ✅ Unauthorized user cannot rate another user's delivery (403 Forbidden).");

  const validRate = await post(
    `/deliveries/${delivery.id}/rate`,
    { stars: 5, comment: "Great delivery!" },
    customerToken
  );
  assert(validRate.status === 200 || validRate.status === 201, "Customer rating failed");
  console.log("   ✅ Customer rated delivery successfully.");

  const duplicateRate = await post(
    `/deliveries/${delivery.id}/rate`,
    { stars: 4, comment: "Second rating" },
    customerToken
  );
  assert.strictEqual(duplicateRate.status, 400);
  console.log("   ✅ Duplicate rating rejected with 400 Bad Request.");

  console.log("\n🎉 ALL 4 PHASES OF MASTER REMEDIATION PLAN SUCCESSFULLY VERIFIED! 🎉\n");
}

main().catch((err) => {
  console.error("❌ Remediation verification failed:", err);
  process.exit(1);
});
