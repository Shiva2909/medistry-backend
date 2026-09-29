const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * @function getManagementToken
 * @description Generates a short-lived JWT token required to authenticate with 100ms REST APIs.
 * @returns {string} Signed JWT token
 */
const getManagementToken = () => {
    const payload = {
        access_key: process.env.HMS_ACCESS_KEY,
        type: 'management',
        version: 2,
        jti: uuidv4(),
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 3600, // Valid for 24 hours
    };
    return jwt.sign(payload, process.env.HMS_SECRET);
};

/**
 * @function generateVideoRoomAndCodes
 * @description Creates a new 100ms video room and fetches role-specific join codes and web links.
 * @param {number|string} appointmentId - The ID of the booked appointment
 * @returns {Promise<Object>} Object containing roomId, patientCode, doctorCode, and join links
 */
const generateVideoRoomAndCodes = async (appointmentId) => {
    const token = getManagementToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
        // Step 1: Create a new room for this specific appointment
        console.log("Mera Template ID:", process.env.HMS_TEMPLATE_ID);
        const roomRes = await axios.post('https://api.100ms.live/v2/rooms', {
            name: `medistry-apt-${appointmentId}-${Date.now()}`,
            description: `Consultation Room for Appointment ${appointmentId}`,
            template_id: Number(process.env.HMS_TEMPLATE_ID),
            region: "in" 
        }, { headers });
        console.log(roomRes.data)
        const roomId = roomRes.data.id;

        // Step 2: Fetch the room codes (patient and doctor) for the newly created room
        const codesRes = await axios.post(`https://api.100ms.live/v2/room-codes/room/${roomId}`, {}, { headers });
        
        let patientCode = null;
        let doctorCode = null;

        // Step 3: Extract role-specific codes from the 100ms response array
        codesRes.data.data.forEach(item => {
            if (item.role === 'patient') patientCode = item.code;
            if (item.role === 'doctor') doctorCode = item.code;
        });

        // Base URL provided by 100ms for web-based testing/fallback
        const baseUrl = "https://ansh-videoconf-1301.app.100ms.live/meeting/";

        return {
            roomId: roomId,
            patientCode: patientCode,
            doctorCode: doctorCode,
            patientLink: baseUrl + patientCode,
            doctorLink: baseUrl + doctorCode
        };

    } catch (error) {
        console.error("[100ms Error] Failed to generate video room:", error.response?.data || error.message);
        throw new Error("Failed to initialize video consultation room from the provider.");
    }
};

module.exports = { generateVideoRoomAndCodes };