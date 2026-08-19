require("dotenv").config(); // no-op on Render if no .env file exists

const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// ---------------------------------------------------------
// Firebase credentials from ENV (works locally + on Render)
// ---------------------------------------------------------
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.set("trust proxy", true);

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(firebaseApp);
const COLLECTION = "tvk_alwarkurichi_register";

// ---------------------------------------------------------
// QR type groups
// Add / edit the values below to match your actual QR codes.
// Each group is a list of qr_type values that should be counted
// together under that label.
// ---------------------------------------------------------
const QR_GROUPS = {
  "qrcode 1": ["3", "10", "15"],
  "qrcode 2": ["11", "12", "02"],
  "qrcode 3": ["12", "14", "01"],
};

// Simple admin password check (set ADMIN_PASSWORD in env)
function checkAdminAuth(req, res) {
  const pass = req.query.key || req.headers["x-admin-key"];
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    res.status(401).send("Unauthorized. Add ?key=YOUR_ADMIN_PASSWORD to the URL.");
    return false;
  }
  return true;
}

/*
|--------------------------------------------------------------------------
| TVK Registration Endpoint
|--------------------------------------------------------------------------
| URL:
| https://your-domain.com/register?qr_type=3
|--------------------------------------------------------------------------
*/
app.get("/register", async (req, res) => {
  try {
    let deviceId = req.cookies.tvk_device_id;

    // qr_type comes dynamically from the query string, e.g. /register?qr_type=3
    const qrType = (req.query.qr_type || "unknown").toString().trim();

    // Generate a new ID for a new browser/device
    if (!deviceId) {
      deviceId = crypto.randomUUID();

      res.cookie("tvk_device_id", deviceId, {
        httpOnly: true,
        secure: true, // Keep true when using HTTPS
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }

    // Check whether this device is already registered
    const registrationRef = db.collection(COLLECTION).doc(deviceId);
    const registrationDoc = await registrationRef.get();

    // ---------------------------------------------------------
    // ALREADY REGISTERED
    // ---------------------------------------------------------
    if (registrationDoc.exists) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Registered</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0; font-family: Arial, sans-serif; background: #f4f7fb;
              min-height: 100vh; display: flex; justify-content: center; align-items: center;
            }
            .card {
              width: 90%; max-width: 420px; background: white; border-radius: 18px;
              padding: 35px 25px; text-align: center; box-shadow: 0 10px 35px rgba(0,0,0,0.12);
            }
            .logo { width: 110px; height: 110px; object-fit: contain; margin-bottom: 20px; }
            .icon {
              width: 70px; height: 70px; border-radius: 50%; background: #ffc107;
              color: white; font-size: 38px; line-height: 70px; margin: 0 auto 20px;
            }
            h1 { margin: 0 0 10px; color: #222; font-size: 27px; }
            p { color: #666; font-size: 16px; line-height: 1.5; }
            .registered {
              margin-top: 20px; padding: 12px; border-radius: 10px;
              background: #fff8e1; color: #856404; font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <img class="logo" src="./1000384800.png" alt="TVK Logo">
            <div class="icon">!</div>
            <h1>Already Registered</h1>
            <p>This device has already been registered.</p>
            <div class="registered">Registration Already Completed</div>
          </div>
        </body>
        </html>
      `);
    }

    // ---------------------------------------------------------
    // NEW REGISTRATION
    // ---------------------------------------------------------
    const registrationTime = Timestamp.now();

    await registrationRef.set({
      deviceId: deviceId,
      registeredAt: registrationTime,
      status: "registered",
      userAgent: req.headers["user-agent"] || "",
      qr_type: qrType,
    });

    // ---------------------------------------------------------
    // SUCCESS PAGE
    // ---------------------------------------------------------
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Successful</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0; font-family: Arial, sans-serif; background: #f4f7fb;
            min-height: 100vh; display: flex; justify-content: center; align-items: center;
          }
          .card {
            width: 90%; max-width: 420px; background: white; border-radius: 18px;
            padding: 35px 25px; text-align: center; box-shadow: 0 10px 35px rgba(0,0,0,0.12);
          }
          .logo { width: 110px; height: 110px; object-fit: contain; margin-bottom: 20px; }
          .success-icon {
            width: 70px; height: 70px; border-radius: 50%; background: #28a745;
            color: white; font-size: 42px; line-height: 70px; margin: 0 auto 20px;
          }
          h1 { margin: 0 0 10px; color: #222; font-size: 27px; }
          p { color: #666; font-size: 16px; line-height: 1.5; }
          .registered {
            margin-top: 20px; padding: 12px; border-radius: 10px;
            background: #f0fff4; color: #218838; font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="logo" src="./1000384800.png" alt="TVK Logo">
          <div class="success-icon">✓</div>
          <h1>Successfully Registered</h1>
          <p>Your registration has been completed successfully.</p>
          <div class="registered">Registration Successful</div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif; background: #f4f7fb; min-height: 100vh;
            display: flex; justify-content: center; align-items: center; text-align: center;
          }
          .card { background: white; padding: 40px 25px; border-radius: 18px; width: 90%; max-width: 420px; }
          h1 { color: #dc3545; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Registration Failed</h1>
          <p>Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/*
|--------------------------------------------------------------------------
| Admin Summary Endpoint
|--------------------------------------------------------------------------
| URL:
| https://your-domain.com/admin/registrations?key=YOUR_ADMIN_PASSWORD
|--------------------------------------------------------------------------
*/
app.get("/admin/registrations", async (req, res) => {
  try {
    // if (!checkAdminAuth(req, res)) return;

    const snapshot = await db.collection(COLLECTION).get();

    const overallCount = snapshot.size;

    // init counts for each group at 0
    const groupCounts = {};
    Object.keys(QR_GROUPS).forEach((label) => (groupCounts[label] = 0));

    snapshot.forEach((doc) => {
      const data = doc.data();
      const qrType = (data.qr_type || "").toString().trim();

      Object.entries(QR_GROUPS).forEach(([label, values]) => {
        if (["31015","111202","131401"].includes(qrType)) {
          groupCounts[label]++;
        }
      });
    });

    const groupCardsHtml = Object.entries(groupCounts)
      .map(
        ([label, count], idx) => `
          <div class="stat-card">
            <div class="stat-label">${label} <span class="values">(${QR_GROUPS[Object.keys(QR_GROUPS)[idx]].join(",")})</span></div>
            <div class="stat-count">${count}</div>
          </div>
        `
      )
      .join("");

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="ta">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ஆழ்வார்குறிச்சி பேரூர் வருகை பதிவேடு</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0; font-family: 'Noto Sans Tamil', Arial, sans-serif;
            background: #f4f7fb; min-height: 100vh; padding: 30px 15px;
          }
          .panel {
            max-width: 720px; margin: 0 auto; background: white;
            border-radius: 18px; padding: 30px 20px; box-shadow: 0 10px 35px rgba(0,0,0,0.1);
          }
          h1 {
            text-align: center; color: #222; font-size: 24px; margin-bottom: 5px;
          }
          .subtitle {
            text-align: center; color: #888; font-size: 14px; margin-bottom: 25px;
          }
          .overall {
            text-align: center; background: #eef4ff; border-radius: 14px;
            padding: 20px; margin-bottom: 25px;
          }
          .overall .label { color: #444; font-size: 15px; margin-bottom: 6px; }
          .overall .count { color: #1a56db; font-size: 40px; font-weight: bold; }
          .stats-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
          }
          .stat-card {
            background: #fafbfc; border: 1px solid #eee; border-radius: 12px;
            padding: 18px; text-align: center;
          }
          .stat-label { color: #444; font-size: 14px; margin-bottom: 8px; }
          .stat-label .values { color: #999; font-size: 12px; display: block; margin-top: 2px; }
          .stat-count { color: #218838; font-size: 32px; font-weight: bold; }
          .refresh {
            display: block; text-align: center; margin-top: 25px; color: #1a56db;
            font-size: 14px; text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="panel">
          <h1>ஆழ்வார்குறிச்சி பேரூர் வருகை பதிவேடு</h1>
          <div class="subtitle">Alwarkurichi Perur Varukai Pathivedu — Admin Summary</div>

          <div class="overall">
            <div class="label">மொத்த பதிவுகள் (Total Registrations)</div>
            <div class="count">${overallCount}</div>
          </div>

          <div class="stats-grid">
            ${groupCardsHtml}
          </div>

          <a class="refresh" href="?key=${req.query.key || ""}">🔄 Refresh</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Admin summary error:", error);
    return res.status(500).send("Failed to load admin summary.");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});