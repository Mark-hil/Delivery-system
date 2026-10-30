import { io } from "socket.io-client";

async function login(identifier, password) {
  const resp = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await resp.json();
  return data.tokens.accessToken;
}

async function run() {
  console.log("🔐 Authenticating test users...");
  const adminToken = await login("admin@swiftsend.app", "Admin123");
  const riderToken = await login("kwame.mensah@email.com", "Password1");
  const customerToken = await login("ama.owusu@email.com", "Password1");

  console.log("🔌 Connecting WebSockets to /dispatch namespace...");

  // 1. Admin Socket
  const adminSocket = io("http://localhost:4000/dispatch", {
    auth: { token: adminToken },
    transports: ["websocket"],
  });

  // 2. Rider Socket
  const riderSocket = io("http://localhost:4000/dispatch", {
    auth: { token: riderToken },
    transports: ["websocket"],
  });

  // 3. Customer Socket
  const customerSocket = io("http://localhost:4000/dispatch", {
    auth: { token: customerToken },
    transports: ["websocket"],
  });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 3) resolve();
    };
    adminSocket.on("connect", () => {
      console.log("✅ Admin socket connected!");
      check();
    });
    riderSocket.on("connect", () => {
      console.log("✅ Rider socket connected!");
      check();
    });
    customerSocket.on("connect", () => {
      console.log("✅ Customer socket connected!");
      check();
    });
  });

  // Test 1: Rider sends GPS coordinates via rider:update_coords
  console.log("\n📍 Test 1: Rider streams GPS location...");
  const locationReceivedPromise = new Promise((resolve) => {
    adminSocket.on("rider:location_changed", (data) => {
      console.log("✅ Admin received live rider location stream:", data);
      resolve(data);
    });
  });

  riderSocket.emit("rider:update_coords", {
    lat: 5.6037,
    lng: -0.187,
    heading: 90,
  });

  await locationReceivedPromise;

  // Test 2: Customer creates delivery request -> Rider receives delivery:new_job
  console.log("\n📦 Test 2: Customer creates delivery request, dispatching to nearby rider...");
  const newJobReceivedPromise = new Promise((resolve) => {
    riderSocket.on("delivery:new_job", (job) => {
      console.log("✅ Rider received new job dispatch event:", {
        id: job.id,
        trackingNumber: job.trackingNumber,
        pickup: job.pickupAddress,
        fare: job.totalFee,
      });
      resolve(job);
    });
  });

  const createResp = await fetch("http://localhost:4000/api/deliveries/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      pickupAddress: "East Legon, Accra",
      pickupLat: 5.6037,
      pickupLng: -0.187,
      dropoffAddress: "Osu Oxford St, Accra",
      dropoffLat: 5.556,
      dropoffLng: -0.183,
      packageType: "Documents",
      packageDescription: "Real-time dispatch test parcel",
      weight: "Light (<2kg)",
      vehicleType: "bike",
      deliveryType: "immediate",
      distanceKm: 8.5,
      etaMinutes: 20,
      baseFee: 15.0,
      distanceFee: 29.75,
      serviceFee: 2.0,
      totalFee: 46.75,
    }),
  });
  const createdDelivery = await createResp.json();
  console.log(`Created delivery ID: ${createdDelivery.id}, OTP: ${createdDelivery.deliveryOtp}`);

  await newJobReceivedPromise;

  // Test 3: Customer joins tracking room and receives status updates
  console.log("\n🛎️ Test 3: Customer joins delivery tracking room and Rider accepts job...");
  customerSocket.emit("join:delivery", { deliveryId: createdDelivery.id });

  const statusChangedPromise = new Promise((resolve) => {
    customerSocket.on("delivery:status_changed", (event) => {
      console.log("✅ Customer received delivery status change in real time:", event);
      resolve(event);
    });
  });

  const acceptResp = await fetch(
    `http://localhost:4000/api/rider/jobs/${createdDelivery.id}/accept`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${riderToken}` },
    }
  );
  const acceptedData = await acceptResp.json();
  console.log("Rider accepted job via HTTP, status:", acceptedData.status);

  await statusChangedPromise;

  // Test 4: Live tracking during delivery: Rider streams coords with deliveryId
  console.log("\n🚗 Test 4: Rider streams live in-transit coordinates to Customer...");
  const customerLocationPromise = new Promise((resolve) => {
    customerSocket.on("rider:location_changed", (loc) => {
      console.log("✅ Customer received live rider GPS in delivery room:", loc);
      resolve(loc);
    });
  });

  riderSocket.emit("rider:update_coords", {
    lat: 5.59,
    lng: -0.185,
    heading: 180,
    deliveryId: createdDelivery.id,
  });

  await customerLocationPromise;

  // Test 5: Complete Delivery -> Customer receives delivery:completed event
  console.log("\n🏁 Test 5: Rider completes delivery with OTP -> Customer receives delivery:completed...");
  const completedPromise = new Promise((resolve) => {
    customerSocket.on("delivery:completed", (data) => {
      console.log("✅ Customer received delivery:completed event:", data);
      resolve(data);
    });
  });

  // Confirm pickup
  await fetch(
    `http://localhost:4000/api/rider/jobs/${createdDelivery.id}/pickup`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${riderToken}` },
    }
  );

  const completeResp = await fetch(
    `http://localhost:4000/api/rider/jobs/${createdDelivery.id}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${riderToken}`,
      },
      body: JSON.stringify({ otp: createdDelivery.deliveryOtp }),
    }
  );
  await completeResp.json();

  await completedPromise;

  console.log("\n🎉 ALL MILESTONE 4 REAL-TIME DISPATCH TESTS PASSED PERFECTLY!");

  adminSocket.disconnect();
  riderSocket.disconnect();
  customerSocket.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
