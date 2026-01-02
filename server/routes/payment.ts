import express, { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = express.Router();

// Initialize Razorpay
// NOTE: Using test keys by default. specific keys should be in .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_DIYK2222222222", // Replace with valid test key if needed
    key_secret: process.env.RAZORPAY_KEY_SECRET || "need_to_be_set_in_env",
});

interface OrderRequest {
    amount: number; // in paise
    currency?: string;
    receipt?: string;
}

// Create Order Route
router.post("/order", async (req: Request, res: Response) => {
    try {
        const { amount, currency = "INR", receipt } = req.body as OrderRequest;

        if (!amount) {
            return res.status(400).json({ error: "Amount is required" });
        }

        const options = {
            amount: Math.round(amount), // amount in the smallest currency unit
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

// Verify Payment Route (Optional but recommended)
router.post("/verify", (req: Request, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "need_to_be_set_in_env")
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            res.json({ status: "success", message: "Payment verified successfully" });
        } else {
            res.status(400).json({ status: "failure", message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.status(500).json({ error: "Failed to verify payment" });
    }
});

export default router;
