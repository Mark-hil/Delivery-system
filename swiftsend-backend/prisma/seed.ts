import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Platform Settings
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      baseFee: 15.0,
      perKmRate: 3.5,
      serviceFee: 2.0,
      activeRegions: "Greater Accra, Kumasi, Takoradi",
      coverageRadiusKm: 25.0,
      pushEnabled: true,
      smsEnabled: true,
      maintenanceMode: false,
      appVersion: "1.0.0",
      promoTitle: "Get 20% off your next 3 deliveries",
      promoSubtitle: "Use code SWIFT20 at checkout",
      promoPercentLabel: "20% OFF",
    },
  });

  const saltRounds = 10;
  const standardPasswordHash = await bcrypt.hash("Password1", saltRounds);
  const adminPasswordHash = await bcrypt.hash("Admin123", saltRounds);

  // 2. Seed Customer Account (Ama Owusu)
  const customerUser = await prisma.user.upsert({
    where: { email: "ama.owusu@email.com" },
    update: {
      customerProfile: {
        update: {
          walletBalance: 350.0,
        },
      },
    },
    create: {
      email: "ama.owusu@email.com",
      phone: "0248125567",
      passwordHash: standardPasswordHash,
      fullName: "Ama Owusu",
      role: "customer",
      status: "Active",
      customerProfile: {
        create: {
          avatarInitials: "AO",
          walletBalance: 214.3,
          walletTxns: {
            create: [
              {
                label: "Wallet Top-Up (Mobile Money)",
                amount: 250.0,
                balance: 250.0,
              },
              {
                label: "Delivery #SW-9021",
                amount: -35.7,
                balance: 214.3,
              },
            ],
          },
        },
      },
    },
  });

  // 3. Seed Active Rider (Kwame Mensah - License expiring in 21 days)
  await prisma.user.upsert({
    where: { email: "kwame.mensah@email.com" },
    update: {},
    create: {
      email: "kwame.mensah@email.com",
      phone: "0204451198",
      passwordHash: standardPasswordHash,
      fullName: "Kwame Mensah",
      role: "rider",
      status: "Active",
      riderProfile: {
        create: {
          vehicleType: "bike",
          plateNumber: "GT 4471-22",
          rating: 4.9,
          trips: 312,
          isOnline: true,
          approvalStatus: "Approved",
          facePhotoUri: "mock://face-kwame.jpg",
          documents: {
            create: [
              {
                kind: "idFront",
                label: "National ID (front)",
                required: true,
                uri: "mock://id-front.jpg",
                uploadedAt: futureDate(-30),
                expiresAt: futureDate(400),
                isVerified: true,
              },
              {
                kind: "idBack",
                label: "National ID (back)",
                required: true,
                uri: "mock://id-back.jpg",
                uploadedAt: futureDate(-30),
                expiresAt: futureDate(400),
                isVerified: true,
              },
              {
                kind: "drivingLicense",
                label: "Driving license",
                required: true,
                uri: "mock://license.jpg",
                uploadedAt: futureDate(-30),
                expiresAt: futureDate(21), // Triggers expiry warning banner
                isVerified: true,
              },
              {
                kind: "insurance",
                label: "Vehicle insurance",
                required: true,
                uri: "mock://insurance.jpg",
                uploadedAt: futureDate(-30),
                expiresAt: futureDate(180),
                isVerified: true,
              },
              {
                kind: "others",
                label: "Other supporting document",
                required: false,
                uri: null,
                uploadedAt: null,
                expiresAt: null,
                isVerified: false,
              },
            ],
          },
        },
      },
    },
  });

  // 4. Seed Expired Rider (Eric - Expired documents for validation gate testing)
  await prisma.user.upsert({
    where: { email: "eric.expired@email.com" },
    update: {},
    create: {
      email: "eric.expired@email.com",
      phone: "0551112222",
      passwordHash: standardPasswordHash,
      fullName: "Expired Eric",
      role: "rider",
      status: "Active",
      riderProfile: {
        create: {
          vehicleType: "car",
          plateNumber: "GT 9090-20",
          rating: 4.6,
          trips: 140,
          isOnline: false,
          approvalStatus: "Approved",
          facePhotoUri: "mock://face-eric.jpg",
          documents: {
            create: [
              {
                kind: "idFront",
                label: "National ID (front)",
                required: true,
                uri: "mock://id-front.jpg",
                uploadedAt: futureDate(-300),
                expiresAt: futureDate(-2), // Expired
                isVerified: true,
              },
              {
                kind: "idBack",
                label: "National ID (back)",
                required: true,
                uri: "mock://id-back.jpg",
                uploadedAt: futureDate(-300),
                expiresAt: futureDate(-2), // Expired
                isVerified: true,
              },
              {
                kind: "drivingLicense",
                label: "Driving license",
                required: true,
                uri: "mock://license.jpg",
                uploadedAt: futureDate(-300),
                expiresAt: futureDate(-2), // Expired
                isVerified: true,
              },
              {
                kind: "insurance",
                label: "Vehicle insurance",
                required: true,
                uri: "mock://insurance.jpg",
                uploadedAt: futureDate(-300),
                expiresAt: futureDate(-2), // Expired
                isVerified: true,
              },
            ],
          },
        },
      },
    },
  });

  // 5. Seed Admin Account (Nana Adjei)
  await prisma.user.upsert({
    where: { email: "admin@swiftsend.app" },
    update: {},
    create: {
      email: "admin@swiftsend.app",
      phone: "0240000000",
      passwordHash: adminPasswordHash,
      fullName: "Nana Adjei",
      role: "admin",
      status: "Active",
      adminProfile: {
        create: {},
      },
    },
  });

  console.log("✅ Database successfully seeded with demo accounts!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
