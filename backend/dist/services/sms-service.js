import fetch from "node-fetch";
const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY || "CuVHKvaU2cESDgI6It7a";
const BULKSMS_SENDER_ID = process.env.BULKSMS_SENDER_ID || "8809648908088";
const BULKSMS_BASE_URL = "http://bulksmsbd.net/api/smsapi";
export async function sendSms(toPhone, message) {
    if (!toPhone)
        return;
    try {
        // Format phone number (ensure 880 format for BD numbers if starting with 01)
        let formattedPhone = toPhone.trim().replace(/\D/g, "");
        if (formattedPhone.startsWith("01") && formattedPhone.length === 11) {
            formattedPhone = "88" + formattedPhone;
        }
        const url = new URL(BULKSMS_BASE_URL);
        url.searchParams.append("api_key", BULKSMS_API_KEY);
        url.searchParams.append("type", "text");
        url.searchParams.append("number", formattedPhone);
        url.searchParams.append("senderid", BULKSMS_SENDER_ID);
        url.searchParams.append("message", message);
        const response = await fetch(url.toString(), {
            method: "GET",
        });
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        }
        catch {
            result = text;
        }
        console.log(`[SMS] Sent to ${formattedPhone}. Response:`, result);
        return result;
    }
    catch (error) {
        console.error(`[SMS] Failed to send SMS to ${toPhone}:`, error);
    }
}
//# sourceMappingURL=sms-service.js.map