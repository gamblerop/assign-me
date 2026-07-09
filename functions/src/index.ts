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

export const sendAdminOTP = functions.https.onCall(async (request) => {
  const {email} = request.data as { email: string };

  if (email !== "gamblerop18@gmail.com") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the admin account can request this OTP."
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await admin.firestore().collection("admin_otps").doc(email).set({
    otp,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  await transporter.sendMail({
    from: process.env.GMAIL_EMAIL,
    to: email,
    subject: "AssignMe Admin Login OTP",
    html: `
      <h2>Your Admin OTP</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP expires in 5 minutes.</p>
    `,
  });

  return {
    success: true,
  };
});
