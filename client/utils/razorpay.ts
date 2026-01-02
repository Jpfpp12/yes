export const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

interface CreateOrderResponse {
    id: string; // order_id
    currency: string;
    amount: number;
}

export const createRazorpayOrder = async (amount: number): Promise<CreateOrderResponse | null> => {
    try {
        const response = await fetch("/api/payment/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (!response.ok) throw new Error("Failed to create order");
        return await response.json();
    } catch (error) {
        console.error("Order Creation Error", error);
        return null;
    }
}
