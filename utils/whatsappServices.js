const axios = require('axios');

// WhatsApp Notification Engine (Fire-and-Forget implementation)
const sendWhatsAppApprovalNotification = async (phone, patientName) => {
    try {
        // Industry Standard: Meta Official WhatsApp Cloud API ya WATI/Interakt ka payload
        const whatsappApiUrl = process.env.WHATSAPP_API_URL; 
        const whatsappToken = process.env.WHATSAPP_TOKEN;

        const payload = {
            messaging_product: "whatsapp",
            to: `91${phone}`, // Assuming India country code
            type: "template",
            template: {
                name: "report_verified_ready_to_book", // Tera approved template name
                language: { code: "en" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: patientName }
                        ]
                    }
                ]
            }
        };

        // Send request asynchronously
        await axios.post(whatsappApiUrl, payload, {
            headers: { 
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[WhatsApp] ✅ Approval notification sent to ${phone}`);
    } catch (error) {
        // IMPORTANT: We only log the error. We NEVER throw it. 
        // Admin verification should not fail just because WhatsApp message failed.
        console.error("[WhatsApp] ❌ Failed to send notification:", error?.response?.data || error.message);
    }
};