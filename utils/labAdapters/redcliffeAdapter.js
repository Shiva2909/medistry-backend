// const axios = require('axios'); // LIVE ke time uncomment karna
const REDCLIFFE_BASE_URL = 'https://api.redcliffelabs.com'; 

const bookTest = async (bookingDetails) => {
    // Current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Redcliffe Official Doc Standardized Payload
    const payload = {
        booking_date: today,
        collection_date: bookingDetails.date,
        collection_slot: 9, // Dummy Integer for now. In real app, fetch this from their Time Slot API
        customer_name: bookingDetails.patientName,
        customer_age: parseInt(bookingDetails.age),
        customer_gender: bookingDetails.gender === 'M' ? 'male' : 'female',
        package_code: [bookingDetails.providerTestCode], // Must be an array
        customer_email: "patient@medistry.in", // Mandatory
        customer_phonenumber: bookingDetails.phone,
        customer_whatsappnumber: bookingDetails.phone, // Mandatory
        customer_address: bookingDetails.address,
        customer_landmark: "Home Delivery", // Mandatory
        pincode: bookingDetails.pincode,
        is_credit: true, // Partner bears the cost, not collected from patient
        customer_latitude: parseFloat(bookingDetails.latitude), // Must be Float
        customer_longitude: parseFloat(bookingDetails.longitude) // Must be Float
    };

    try {
        console.log("🚀 REDCLIFFE PAYLOAD READY:", payload);

        // =========================================================
        // 🧪 MOCK RESPONSE FOR POSTMAN TESTING (No API Key needed)
        // =========================================================
        return {
            success: true,
            providerBookingRef: `RDC-MOCK-${Date.now()}`,
            message: "Booked via Redcliffe (Simulated Success)"
        };

        // =========================================================
        // ⚠️ LIVE PRODUCTION CALL (Uncomment when you have API Key)
        // =========================================================
        /*
        const response = await axios.post(`${REDCLIFFE_BASE_URL}/api/external/v2/center-create-booking/`, payload, {
            headers: {
                'Authorization': `Bearer TERA_LIVE_TOKEN_YAHAN_AAYEGA`,
                'Content-Type': 'application/json'
            }
        });
        return {
            success: true,
            providerBookingRef: response.data.booking_id || `RDC-${Date.now()}`,
            message: "Booked via Redcliffe Live"
        };
        */

    } catch (error) {
        throw new Error(`Redcliffe API Error: ${error.message}`);
    }
};

module.exports = { bookTest };