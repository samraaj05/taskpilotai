const axios = require('axios');

/**
 * Gets Zoom OAuth Access Token using Account Credentials flow
 * @returns {Promise<string>} The access token
 */
const getZoomAccessToken = async () => {
    try {
        const accountId = process.env.ZOOM_ACCOUNT_ID;
        const clientId = process.env.ZOOM_CLIENT_ID;
        const clientSecret = process.env.ZOOM_CLIENT_SECRET;

        if (!accountId || !clientId || !clientSecret) {
            throw new Error("Missing Zoom API credentials (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, or ZOOM_CLIENT_SECRET)");
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(
            'https://zoom.us/oauth/token',
            new URLSearchParams({
                grant_type: 'account_credentials',
                account_id: accountId
            }).toString(),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (!response.data || !response.data.access_token) {
            throw new Error("Failed to retrieve access token from Zoom response");
        }

        return response.data.access_token;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.response?.data?.reason || error.message;
        const status = error.response?.status || 500;
        const err = new Error(`Zoom Auth Failed: ${errorMsg}`);
        err.statusCode = status;
        throw err;
    }
};

/**
 * Creates a Zoom meeting
 * @param {string} topic - Meeting topic
 * @param {string} startTime - Meeting start time (ISO 8601 format)
 * @param {number} duration - Meeting duration in minutes
 * @returns {Promise<Object>} Object containing join_url, start_url, and meeting_id
 */
const createZoomMeeting = async (topic, startTime, duration = 30) => {
    try {
        const accessToken = await getZoomAccessToken();

        const response = await axios.post(
            'https://api.zoom.us/v2/users/me/meetings',
            {
                topic: topic,
                type: 2, // Scheduled meeting
                start_time: startTime,
                duration: duration,
                timezone: "Asia/Kolkata"
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            join_url: response.data.join_url,
            start_url: response.data.start_url,
            meeting_id: response.data.id
        };
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        const status = error.response?.status || 500;
        const err = new Error(`Zoom Meeting Creation Failed: ${errorMsg}`);
        err.statusCode = status;
        throw err;
    }
};

module.exports = {
    getZoomAccessToken,
    createZoomMeeting
};
