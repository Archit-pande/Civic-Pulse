const dns = require("node:dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

require("dotenv").config({
  path: require("path").join(__dirname, "../../backend/.env")
});

const mongoose = require("mongoose");
const bcrypt = require("../../backend/node_modules/bcryptjs");

const issuesData = require("./issue.json");

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing.");
    }

    console.log("connecting to mongodb...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000
    });

    console.log("mongodb connected");

    const db = mongoose.connection.db;

    console.log("clearing old issues...");

    await db.collection("issues").deleteMany({});
    await db.collection("users").deleteMany({});

    console.log("old data cleared");

    const issues = issuesData.map((issue) => {
      const lat = issue.coordinates?.lat ?? issue.lat;
      const lng = issue.coordinates?.lng ?? issue.lng;

      const document = {
        issueId: issue.id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status || "Reported",
        location: issue.location,
        reportedBy: issue.reportedBy || "Citizen"
      };

      if (lat != null && lng != null) {
        document.coordinates = {
          lat: Number(lat),
          lng: Number(lng)
        };

        document.geoLocation = {
          type: "Point",
          coordinates: [
            Number(lng),
            Number(lat)
          ]
        };
      }

      return document;
    });

    await db.collection("issues").insertMany(issues);

    console.log(`${issues.length} issues inserted`);

    const [citizenHash, authorityHash] = await Promise.all([
      bcrypt.hash("Citizen@123", 12),
      bcrypt.hash("Authority@123", 12)
    ]);

    await db.collection("users").insertMany([
      {
        name: "Demo Citizen",
        email: "citizen@civicpulse.local",
        passwordHash: citizenHash,
        role: "citizen"
      },
      {
        name: "Demo Authority",
        email: "authority@civicpulse.local",
        passwordHash: authorityHash,
        role: "authority"
      }
    ]);

    console.log("users inserted");
    console.log("database seeded successfully");
    console.log("citizen: citizen@civicpulse.local / Citizen@123");
    console.log("authority: authority@civicpulse.local / Authority@123");
  } catch (error) {
    console.error("seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

seed();