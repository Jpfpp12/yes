import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleVolumeCalculation } from "./routes/volume";
import {
  handleSignUp,
  handleSignIn,
  handleSendOTP,
  handleVerifyOTP,
  handleSignOut,
  handleGetProfile
} from "./routes/auth";
import conversionRoutes from "./routes/conversion";
import paymentRoutes from "./routes/payment";
import quoteRouter from "./routes/quote";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/calculate-volume", handleVolumeCalculation);

  // Authentication routes
  app.post("/api/auth/signup", handleSignUp);
  app.post("/api/auth/signin", handleSignIn);
  app.post("/api/auth/send-otp", handleSendOTP);
  app.post("/api/auth/verify-otp", handleVerifyOTP);
  app.post("/api/auth/signout", handleSignOut);
  app.get("/api/auth/profile", handleGetProfile);

  // 3D file conversion routes
  app.use("/api/conversion", conversionRoutes);

  // Payment routes
  app.use("/api/payment", paymentRoutes);

  // Quote routes
  app.use("/api/quote", quoteRouter);

  return app;
}
