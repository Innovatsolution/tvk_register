require("dotenv").config(); // does nothing on Render if no .env file exists — harmless

const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
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

// ... rest of your /register route stays exactly the same

/*
|--------------------------------------------------------------------------
| TVK Registration Endpoint
|--------------------------------------------------------------------------
| URL:
| https://your-domain.com/register
|--------------------------------------------------------------------------
*/
app.get("/register", async (req, res) => {
  try {
    let deviceId = req.cookies.tvk_device_id;

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
    const registrationRef = db
      .collection("tvk_alwarkurichi_register")
      .doc(deviceId);

    const registrationDoc = await registrationRef.get();

    // ---------------------------------------------------------
    // ALREADY REGISTERED
    // ---------------------------------------------------------
    if (registrationDoc.exists) {
      const data = registrationDoc.data();

      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>Already Registered</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f4f7fb;
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            .card {
              width: 90%;
              max-width: 420px;
              background: white;
              border-radius: 18px;
              padding: 35px 25px;
              text-align: center;
              box-shadow: 0 10px 35px rgba(0,0,0,0.12);
            }

            .logo {
              width: 110px;
              height: 110px;
              object-fit: contain;
              margin-bottom: 20px;
            }

            .icon {
              width: 70px;
              height: 70px;
              border-radius: 50%;
              background: #ffc107;
              color: white;
              font-size: 38px;
              line-height: 70px;
              margin: 0 auto 20px;
            }

            h1 {
              margin: 0 0 10px;
              color: #222;
              font-size: 27px;
            }

            p {
              color: #666;
              font-size: 16px;
              line-height: 1.5;
            }

            .registered {
              margin-top: 20px;
              padding: 12px;
              border-radius: 10px;
              background: #fff8e1;
              color: #856404;
              font-weight: bold;
            }
          </style>
        </head>

        <body>

          <div class="card">

            <img
              class="logo"
              src="./1000384800.png"
              alt="TVK Logo"
            >

            <div class="icon">
              !
            </div>

            <h1>Already Registered</h1>

            <p>
              This device has already been registered.
            </p>

            <div class="registered">
              Registration Already Completed
            </div>

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
    });

    // ---------------------------------------------------------
    // SUCCESS PAGE
    // ---------------------------------------------------------

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>Registration Successful</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f4f7fb;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .card {
            width: 90%;
            max-width: 420px;
            background: white;
            border-radius: 18px;
            padding: 35px 25px;
            text-align: center;
            box-shadow: 0 10px 35px rgba(0,0,0,0.12);
          }

          .logo {
            width: 110px;
            height: 110px;
            object-fit: contain;
            margin-bottom: 20px;
          }

          .success-icon {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: #28a745;
            color: white;
            font-size: 42px;
            line-height: 70px;
            margin: 0 auto 20px;
          }

          h1 {
            margin: 0 0 10px;
            color: #222;
            font-size: 27px;
          }

          p {
            color: #666;
            font-size: 16px;
            line-height: 1.5;
          }

          .registered {
            margin-top: 20px;
            padding: 12px;
            border-radius: 10px;
            background: #f0fff4;
            color: #218838;
            font-weight: bold;
          }
        </style>
      </head>

      <body>

        <div class="card">

          <img
            class="logo"
            src="./1000384800.png"
            alt="TVK Logo"
          >

          <div class="success-icon">
            ✓
          </div>

          <h1>Successfully Registered</h1>

          <p>
            Your registration has been completed successfully.
          </p>

          <div class="registered">
            Registration Successful
          </div>

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>Registration Failed</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f7fb;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .card {
            background: white;
            padding: 40px 25px;
            border-radius: 18px;
            width: 90%;
            max-width: 420px;
          }

          h1 {
            color: #dc3545;
          }

          p {
            color: #666;
          }
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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});