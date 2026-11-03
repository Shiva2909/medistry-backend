const crypto = require('crypto'); // Built-in Node.js module for security/encryption
const { connectDB, sql } = require('../db');
const labAdapterFactory = require('../utils/labAdapters/labAdapterFactory');

/**
 * @function createLabBooking
 * @description Handles the dynamic booking of lab tests using the Adapter Pattern.
 */
const createLabBooking = async (req, res) => {
    const { 
        testId, addressId, date, slotId, 
        patientName, age, gender, phone, totalAmount 
    } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    let transaction;
    try {
        const pool = await connectDB();

        // 1. Fetch Lab and Test Details from Database
        const testCheck = await pool.request()
            .input('TestId', sql.Int, testId)
            .query(`
                SELECT t.ProviderTestCode, l.LabId, l.ApiProviderKey 
                FROM LabTestsCatalog t
                JOIN DiagnosticLabs l ON t.LabId = l.LabId
                WHERE t.TestId = @TestId AND t.IsActive = 1 AND l.IsActive = 1
            `);

        if (testCheck.recordset.length === 0) {
            return res.status(400).json({ success: false, message: "Test or Lab is not active/available." });
        }

        const { ProviderTestCode, LabId, ApiProviderKey } = testCheck.recordset[0];

        // 2. Fetch Patient Address Coordinates
        const addressCheck = await pool.request()
            .input('AddressId', sql.Int, addressId)
            .query(`SELECT AddressLine, Pincode, Latitude, Longitude FROM PatientAddresses WHERE AddressId = @AddressId`);
        
        const addressData = addressCheck.recordset[0];

        // 3. Prepare Standardized Data for Adapters
        const bookingDetails = {
            date, slotId, providerTestCode: ProviderTestCode,
            patientName, age, gender, phone,
            address: addressData.AddressLine,
            pincode: addressData.Pincode,
            latitude: addressData.Latitude,
            longitude: addressData.Longitude
        };

        // 4. Dynamically get the correct adapter (Redcliffe/Orange) and execute!
        const adapter = labAdapterFactory.getAdapter(ApiProviderKey);
        const labResponse = await adapter.bookTest(bookingDetails);

        // 5. Save the final confirmed booking in Medistry Database
        const internalBookingRef = `MED-${Date.now()}`;
        
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input('BookingRef', sql.VarChar, internalBookingRef)
            .input('UserId', sql.Int, userId)
            .input('AddressId', sql.Int, addressId)
            .input('LabId', sql.Int, LabId)
            .input('TestId', sql.Int, testId)
            .input('PatientName', sql.NVarChar, patientName)
            .input('PatientAge', sql.Int, age)
            .input('PatientGender', sql.VarChar, gender)
            .input('ProviderRef', sql.VarChar, labResponse.providerBookingRef)
            .input('CollectionDate', sql.Date, date)
            .input('SlotWindow', sql.VarChar, slotId) 
            .input('TotalAmount', sql.Decimal(10,2), totalAmount)
            .query(`
                INSERT INTO LabBookings (
                    BookingReference, UserId, AddressId, LabId, TestId, 
                    PatientName, PatientAge, PatientGender, ProviderBookingRef, 
                    CollectionDate, SlotWindow, TotalAmount, Status
                ) VALUES (
                    @BookingRef, @UserId, @AddressId, @LabId, @TestId, 
                    @PatientName, @PatientAge, @PatientGender, @ProviderRef, 
                    @CollectionDate, @SlotWindow, @TotalAmount, 'Confirmed_By_Lab'
                )
            `);

        await transaction.commit();

        return res.json({ 
            success: true, 
            message: "Lab test booked successfully!", 
            bookingId: internalBookingRef 
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lab Booking Error:", error);
        return res.status(500).json({ success: false, message: "Failed to book test.", error: error.message });
    }
};

/**
 * @function handleLabWebhook
 * @description Enterprise-grade secure webhook receiver with HMAC, Idempotency, and Audit Trails.
 */
const handleLabWebhook = async (req, res) => {
    let transaction;
    
    try {
        // We get the provider key from the URL (e.g., /api/labs/webhook/REDCLIFFE)
        const { providerKey } = req.params; 
        
        // =================================================================
        // SECURITY LAYER 1: Extract Webhook Headers sent by the Partner Lab
        // =================================================================
        const signature = req.headers['x-webhook-signature']; 
        const eventId = req.headers['x-event-id']; // Unique ID for this specific update
        
        if (!signature || !eventId) {
            console.warn(`[WEBHOOK WARNING] Missing security headers from ${providerKey}`);
            return res.status(401).json({ success: false, message: "Unauthorized: Missing Headers" });
        }

        const pool = await connectDB();

        // =================================================================
        // SECURITY LAYER 2: Fetch the Lab's Secret Key for Validation
        // =================================================================
        const labCheck = await pool.request()
            .input('ProviderKey', sql.VarChar, providerKey)
            .query('SELECT LabId, WebhookSecret FROM DiagnosticLabs WHERE ApiProviderKey = @ProviderKey');

        if (labCheck.recordset.length === 0 || !labCheck.recordset[0].WebhookSecret) {
            return res.status(400).json({ success: false, message: "Invalid Provider or Missing Secret" });
        }
        const { WebhookSecret, LabId } = labCheck.recordset[0];

        // =================================================================
        // SECURITY LAYER 3: HMAC Signature Validation (Anti-Hacking Check)
        // We hash the incoming payload with our secret and match it with the lab's signature
        // =================================================================
        const rawPayload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', WebhookSecret)
            .update(rawPayload)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error(`[WEBHOOK HACK ATTEMPT] Invalid signature from ${providerKey}`);
            return res.status(403).json({ success: false, message: "Forbidden: Signature Mismatch" });
        }

        // =================================================================
        // SECURITY LAYER 4: Idempotency Check (Double-Tap Protection)
        // Ensure we don't process the exact same event twice if the lab's server glitches
        // =================================================================
        const checkDuplicate = await pool.request()
            .input('EventId', sql.VarChar, eventId)
            .query('SELECT LogId FROM LabBookingStatusLogs WHERE IdempotencyKey = @EventId');
            
        if (checkDuplicate.recordset.length > 0) {
            console.log(`[WEBHOOK IDEMPOTENCY] Event ${eventId} already processed. Ignoring duplicate.`);
            // Always return 200 so the lab stops retrying
            return res.status(200).json({ success: true, message: "Already processed" }); 
        }

        // =================================================================
        // BUSINESS LOGIC: Process the Payload if all security checks pass
        // =================================================================
        const { provider_order_id, event_status, report_url } = req.body;
        
        // Standardize the status string mapping
        let internalStatus = 'Processing';
        if (event_status === 'SAMPLE_COLLECTED') internalStatus = 'Sample_Collected';
        if (event_status === 'REPORT_GENERATED') internalStatus = 'Report_Generated';

        // Fetch Current Booking to know its Old Status (Needed for Audit Trail)
        const bookingCheck = await pool.request()
            .input('ProviderRef', sql.VarChar, provider_order_id)
            .query('SELECT BookingId, Status FROM LabBookings WHERE ProviderBookingRef = @ProviderRef');

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        const currentBooking = bookingCheck.recordset[0];

        // =================================================================
        // DATABASE OPERATION: Safe Transaction (Update Main Table + Audit Trail)
        // =================================================================
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Step A: Update the main LabBookings table with the new status
        await new sql.Request(transaction)
            .input('NewStatus', sql.VarChar, internalStatus)
            .input('BookingId', sql.Int, currentBooking.BookingId)
            .query(`UPDATE LabBookings SET Status = @NewStatus WHERE BookingId = @BookingId`);

        // Step B: Insert a record into the Audit Trail Table for tracking history
        await new sql.Request(transaction)
            .input('BookingId', sql.Int, currentBooking.BookingId)
            .input('OldStatus', sql.VarChar, currentBooking.Status)
            .input('NewStatus', sql.VarChar, internalStatus)
            .input('IdempotencyKey', sql.VarChar, eventId) // Save the event ID so it can't be used again
            .input('UpdatedBy', sql.VarChar, `${providerKey}_WEBHOOK`)
            .input('Remarks', sql.NVarChar, report_url ? `Report Ready: ${report_url}` : `Status update via Webhook`)
            .query(`
                INSERT INTO LabBookingStatusLogs (BookingId, OldStatus, NewStatus, IdempotencyKey, UpdatedBy, Remarks)
                VALUES (@BookingId, @OldStatus, @NewStatus, @IdempotencyKey, @UpdatedBy, @Remarks)
            `);

        await transaction.commit();
        // =================================================================

        console.log(`[WEBHOOK SUCCESS] Booking ${currentBooking.BookingId} securely updated to ${internalStatus}`);
        
        // Trigger notifications if report is ready
        if (internalStatus === 'Report_Generated' && report_url) {
            console.log(`[ALERT] Triggering Notification for User: Report Link -> ${report_url}`);
            // TODO: Call Notification Service here
        }

        return res.status(200).json({ success: true, message: "Webhook processed securely" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Secure Webhook Error:", error);
        // Always return 200 OK even on failure for webhooks to prevent lab systems from crashing or endless retries
        return res.status(200).json({ success: false, error: "Handled internally" }); 
    }
};

module.exports = { createLabBooking, handleLabWebhook };