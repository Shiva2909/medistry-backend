const crypto = require('crypto');
const razorpay = require('../utils/razorpayInstance'); // Tera utils wala instance
const { connectDB, sql } = require('../db');
const Razorpay = require('razorpay');

/**
 * 1. CREATE ORDER (Zero-Trust Model)
 * @route POST /api/payments/create-order
 */
const createOrder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { serviceType, referenceId } = req.body; 
        const pool = await connectDB();

        let amountInRupees = 0;

        // ENTERPRISE RULE: Always fetch the exact price from Database, NEVER trust frontend amount
        if (serviceType === 'CareProgramme') {
            const plan = await pool.request().input('Id', sql.Int, referenceId)
                .query(`SELECT Price FROM SubscriptionPlans WHERE PlanId = @Id AND IsActive = 1`);
            if (!plan.recordset.length) return res.status(404).json({ success: false, message: "Plan not found" });
            amountInRupees = plan.recordset[0].Price;
        } 
        else if (serviceType === 'DoctorConsultation') {
            const doc = await pool.request().input('Id', sql.Int, referenceId)
                .query(`SELECT ConsultationFee FROM Doctors WHERE DoctorId = @Id`);
            if (!doc.recordset.length) return res.status(404).json({ success: false, message: "Doctor not found" });
            amountInRupees = doc.recordset[0].ConsultationFee;
        }
        // Add similar conditions for 'BloodTest' and 'Medicine' based on your tables
        else {
            return res.status(400).json({ success: false, message: "Invalid service type" });
        }

        const amountInPaise = Math.round(amountInRupees * 100);

        // Create Order on Razorpay
        const rzpOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${serviceType}_${referenceId}_${Date.now()}`
        });

        // Save Pending Payment in DB
        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('ServiceType', sql.NVarChar, serviceType)
            .input('ReferenceId', sql.Int, referenceId)
            .input('OrderId', sql.NVarChar, rzpOrder.id)
            .input('Amount', sql.BigInt, amountInPaise)
            .query(`
                INSERT INTO Payments (UserId, ServiceType, ReferenceId, RazorpayOrderId, AmountInPaise, PaymentStatus)
                VALUES (@UserId, @ServiceType, @ReferenceId, @OrderId, @Amount, 'Pending')
            `);

        return res.status(200).json({
            success: true,
            data: {
                orderId: rzpOrder.id,
                keyId: process.env.RAZORPAY_KEY_ID, 
                amount: amountInPaise,
                currency: "INR"
            }
        });
    } catch (error) {
        console.error("[Payment] Create Order Error:", error);
        return res.status(500).json({ success: false, message: "Failed to create payment order" });
    }
};

/**
 * 2. VERIFY PAYMENT (Signature Validation & Activation)
 * @route POST /api/payments/verify
 */
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // 1. Verify Signature using HMAC-SHA256
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        // 👇👇 for debugging this payment keys mismatch issur👇👇
        console.log("1. Backend Secret Key:", process.env.RAZORPAY_KEY_SECRET);
        console.log("2. Expected Sign (Backend generated):", expectedSign);
        console.log("3. Received Sign (Frontend sent):", razorpay_signature);    

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Invalid payment signature. Payment rejected!" });
        }

        const pool = await connectDB();

        // 2. Fetch Payment Record
        const paymentCheck = await pool.request()
            .input('OrderId', sql.NVarChar, razorpay_order_id)
            .query(`SELECT PaymentId, ServiceType, ReferenceId, PaymentStatus, UserId FROM Payments WHERE RazorpayOrderId = @OrderId`);

        if (!paymentCheck.recordset.length) return res.status(404).json({ success: false, message: "Order not found in database" });

        const payment = paymentCheck.recordset[0];

        // 3. Idempotency Check (Prevent duplicate activation)
        if (payment.PaymentStatus === 'Captured') {
            return res.status(200).json({ success: true, message: "Payment already verified and captured." });
        }

        // 4. Update DB Status to Captured
        await pool.request()
            .input('OrderId', sql.NVarChar, razorpay_order_id)
            .input('PaymentId', sql.NVarChar, razorpay_payment_id)
            .query(`
                UPDATE Payments 
                SET PaymentStatus = 'Captured', RazorpayPaymentId = @PaymentId, UpdatedAt = GETDATE() 
                WHERE RazorpayOrderId = @OrderId
            `);

        // ==========================================
        // 5. TRIGGER BUSINESS LOGIC (Service Activation)
        // ==========================================
        if (payment.ServiceType === 'CareProgramme') {
            // activateUserSubscription(payment.UserId, payment.ReferenceId); // Tera purana function call kar de yahan
        } else if (payment.ServiceType === 'DoctorConsultation') {
            // Confirm the appointment slot
        }

        return res.status(200).json({ success: true, message: "Payment successfully verified and service activated." });
    } catch (error) {
        console.error("[Payment] Verify Payment Error:", error);
        return res.status(500).json({ success: false, message: "Server error during verification" });
    }
};

/**
 * 3. GET PAYMENT STATUS
 * @route GET /api/payments/:paymentId/status
 */
const getPaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const pool = await connectDB();

        const result = await pool.request()
            .input('PaymentId', sql.Int, paymentId)
            .query(`SELECT PaymentStatus, RazorpayOrderId, RazorpayPaymentId, AmountInPaise, ServiceType FROM Payments WHERE PaymentId = @PaymentId`);

        if (!result.recordset.length) return res.status(404).json({ success: false, message: "Payment record not found." });

        return res.status(200).json({ success: true, data: result.recordset[0] });
    } catch (error) {
        console.error("[Payment] Status Fetch Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * 4. WEBHOOK HANDLER (For Network Drops & Background sync)
 * @route POST /api/payments/razorpay/webhook
 * NOTE: Ensure your Express route uses express.raw() or express.json() properly so req.body matches the signature.
 */
const webhookHandler = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];
        
        // Validate Webhook Signature
        const isValid = Razorpay.validateWebhookSignature(JSON.stringify(req.body), signature, webhookSecret);
        if (!isValid) {
            console.log("🚨 Webhook Signature Mismatch");
            return res.status(400).send("Invalid Signature");
        }

        const event = req.body.event;
        const paymentEntity = req.body.payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        
        const pool = await connectDB();

        if (event === 'payment.captured' || event === 'order.paid') {
            await pool.request()
                .input('OrderId', sql.NVarChar, orderId)
                .input('PaymentId', sql.NVarChar, paymentId)
                .query(`
                    UPDATE Payments 
                    SET PaymentStatus = 'Captured', RazorpayPaymentId = @PaymentId, UpdatedAt = GETDATE() 
                    WHERE RazorpayOrderId = @OrderId AND PaymentStatus != 'Captured'
                `);
            // Note: If you need to trigger service activation from Webhook, do it here.
        } 
        else if (event === 'payment.failed') {
            await pool.request()
                .input('OrderId', sql.NVarChar, orderId)
                .query(`UPDATE Payments SET PaymentStatus = 'Failed', UpdatedAt = GETDATE() WHERE RazorpayOrderId = @OrderId`);
        }
        else if (event === 'refund.processed') {
            await pool.request()
                .input('PaymentId', sql.NVarChar, paymentId)
                .query(`UPDATE Payments SET PaymentStatus = 'Refunded', UpdatedAt = GETDATE() WHERE RazorpayPaymentId = @PaymentId`);
        }

        // Always return 200 OK to Razorpay so they stop sending the same webhook
        return res.status(200).send('Webhook processed successfully');
    } catch (error) {
        console.error("[Payment] Webhook Error:", error);
        return res.status(500).send("Webhook processing failed");
    }
};

/**
 * 5. INITIATE REFUND (Admin Only)
 * @route POST /api/admin/payments/:paymentId/refund
 */
const initiateRefund = async (req, res) => {
    try {
        // Assume req.user.role === 'ADMIN' is checked via middleware before reaching here
        const { paymentId } = req.params;
        const pool = await connectDB();

        // Check if payment exists and is captured
        const paymentCheck = await pool.request()
            .input('PaymentId', sql.Int, paymentId)
            .query(`SELECT RazorpayPaymentId, AmountInPaise, PaymentStatus FROM Payments WHERE PaymentId = @PaymentId`);

        if (!paymentCheck.recordset.length) return res.status(404).json({ success: false, message: "Payment not found." });
        
        const payment = paymentCheck.recordset[0];
        if (payment.PaymentStatus !== 'Captured') {
            return res.status(400).json({ success: false, message: "Only captured payments can be refunded." });
        }

        // Call Razorpay API to process refund
        const refundResponse = await razorpay.payments.refund(payment.RazorpayPaymentId, {
            amount: payment.AmountInPaise // Full refund. Pass lesser amount for partial refund.
        });

        // Update DB with refund details
        await pool.request()
            .input('PaymentId', sql.Int, paymentId)
            .input('RefundId', sql.NVarChar, refundResponse.id)
            .query(`
                UPDATE Payments 
                SET PaymentStatus = 'Refund Initiated', RefundId = @RefundId, UpdatedAt = GETDATE() 
                WHERE PaymentId = @PaymentId
            `);

        return res.status(200).json({ success: true, message: "Refund initiated successfully.", data: refundResponse });

    } catch (error) {
        console.error("[Payment] Refund Error:", error);
        return res.status(500).json({ success: false, message: "Failed to initiate refund." });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getPaymentStatus,
    webhookHandler,
    initiateRefund
};