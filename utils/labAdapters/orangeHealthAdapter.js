// const axios = require('axios');
const ORANGE_BASE_URL = 'https://orangehealth-partner-api.lovable.app';

const bookTest = async (bookingDetails) => {
    // Orange Health Standard Payload
    const payload = {
        bookingDate: bookingDetails.date,
        timeSlot: bookingDetails.slotId, 
        testCode: bookingDetails.providerTestCode, 
        patientName: bookingDetails.patientName,   
        patientAge: parseInt(bookingDetails.age),
        gender: bookingDetails.gender === 'M' ? 'Male' : 'Female',
        mobileNumber: bookingDetails.phone,
        fullAddress: bookingDetails.address,
        pin: bookingDetails.pincode,
        coords: {
            lat: parseFloat(bookingDetails.latitude),
            lng: parseFloat(bookingDetails.longitude)
        }
    };

    try {
        console.log("🚀 ORANGE HEALTH PAYLOAD READY:", payload);

        // =========================================================
        // 🧪 MOCK RESPONSE FOR POSTMAN TESTING
        // =========================================================
        return {
            success: true,
            providerBookingRef: `ORG-MOCK-${Date.now()}`,
            message: "Booked via Orange Health (Simulated Success)"
        };

        // =========================================================
        // ⚠️ LIVE PRODUCTION CALL (Uncomment when you have API Key)
        // =========================================================
        /*
        const response = await axios.post(`${ORANGE_BASE_URL}/api/v1/bookings`, payload, {
            headers: {
                'Authorization': `Bearer TERA_LIVE_TOKEN_YAHAN_AAYEGA`,
                'Content-Type': 'application/json'
            }
        });
        return {
            success: true,
            providerBookingRef: response.data.orderId || `ORG-${Date.now()}`,
            message: "Booked via Orange Health Live"
        };
        */

    } catch (error) {
        throw new Error(`Orange Health API Error: ${error.message}`);
    }
};

module.exports = { bookTest };