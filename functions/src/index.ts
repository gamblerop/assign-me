import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const ADMIN_UID = "assignme-admin-uid";
const ADMIN_EMAIL = "gamblerop18@gmail.com";

export const sendAdminOTP = functions.https.onCall(async (request) => {
  const email = String(request.data?.email || "")
    .trim()
    .toLowerCase();

  if (email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the admin account can request this OTP."
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await admin
    .firestore()
    .collection("admin_otps")
    .doc(ADMIN_EMAIL)
    .set({
      otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      used: false,
    });

  await transporter.sendMail({
    from: process.env.GMAIL_EMAIL,
    to: ADMIN_EMAIL,
    subject: "AssignMe Admin Login OTP",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>AssignMe Admin Login</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
      </div>
    `,
  });

  return {
    success: true,
  };
});

export const verifyAdminOTP = functions.https.onCall(async (request) => {
  const email = String(request.data?.email || "")
    .trim()
    .toLowerCase();

  const otp = String(request.data?.otp || "").trim();

  if (email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the admin account can verify this OTP."
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Enter a valid 6-digit OTP."
    );
  }

  const otpRef = admin
    .firestore()
    .collection("admin_otps")
    .doc(ADMIN_EMAIL);

  const otpSnapshot = await otpRef.get();

  if (!otpSnapshot.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "No OTP request found. Please request a new OTP."
    );
  }

  const otpData = otpSnapshot.data();

  if (!otpData) {
    throw new functions.https.HttpsError(
      "not-found",
      "OTP data is missing."
    );
  }

  if (otpData.used === true) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This OTP has already been used."
    );
  }

  if (Date.now() > Number(otpData.expiresAt)) {
    throw new functions.https.HttpsError(
      "deadline-exceeded",
      "This OTP has expired. Please request a new one."
    );
  }

  if (String(otpData.otp) !== otp) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Incorrect OTP."
    );
  }

  await otpRef.update({
    used: true,
  });

  try {
    await admin.auth().getUser(ADMIN_UID);
  } catch {
    await admin.auth().createUser({
      uid: ADMIN_UID,
      email: ADMIN_EMAIL,
      emailVerified: true,
    });
  }

  await admin.auth().setCustomUserClaims(ADMIN_UID, {
    admin: true,
  });

  const userRef = admin.firestore().collection("users").doc(ADMIN_UID);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    await userRef.set({
      id: ADMIN_UID,
      name: "Super Administrator",
      email: ADMIN_EMAIL,
      phone: "+919999999999",
      role: "admin",
      points: 9999,
      ordersCount: 99,
      joined: new Date().toISOString().split("T")[0],
    });
  }

  const customToken = await admin.auth().createCustomToken(ADMIN_UID, {
    admin: true,
  });

  return {
    success: true,
    token: customToken,
  };
});