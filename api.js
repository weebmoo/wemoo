/**
 * api.js
 * Handles all API requests to the SMM Panel.
 * Optimized for static hosting (GitHub Pages) with CORS handling.
 */

const API_KEY = "180cc445525374a025360284a4c519b3";
const API_URL = "https://yoxok.com/api/v2";

/**
 * Generic function to call the SMM API.
 * Uses a CORS proxy fallback if the direct call is blocked by the browser.
 */
async function callApi(action, params = {}) {
    const payload = {
        key: API_KEY,
        action: action,
        ...params
    };

    const searchParams = new URLSearchParams(payload).toString();

    try {
        // Attempt 1: Direct call (Works if API allows CORS or if running through a local proxy)
        console.log(`Attempting direct API call for: ${action}`);
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: searchParams
        });

        if (response.ok) {
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return data;
        }
        
        throw new Error(`Direct call failed with status ${response.status}`);

    } catch (directError) {
        console.warn("Direct API call failed (likely CORS). Attempting via CORS Proxy...", directError);

        try {
            // Attempt 2: Via AllOrigins CORS Proxy (Best for static sites like GitHub Pages)
            // Note: AllOrigins works best with GET for simple proxies
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`${API_URL}?${searchParams}`)}`;
            
            const proxyResponse = await fetch(proxyUrl);
            if (!proxyResponse.ok) throw new Error("CORS Proxy unreachable");

            const proxyData = await proxyResponse.json();
            const data = JSON.parse(proxyData.contents);

            if (data.error) throw new Error(data.error);
            return data;

        } catch (proxyError) {
            console.error("All API attempts failed:", proxyError);
            throw new Error("Unable to connect to SMM API. This is usually due to CORS restrictions on static hosting. Please try again or use a browser extension that allows CORS.");
        }
    }
}

/**
 * Get all available services
 */
export async function getServices() {
    return await callApi("services");
}

/**
 * Create a new order
 * @param {number} serviceID - ID of the service
 * @param {string} link - URL for the service (e.g., profile link)
 * @param {number} quantity - Number of units
 */
export async function createOrder(serviceID, link, quantity) {
    return await callApi("add", {
        service: serviceID,
        link: link,
        quantity: quantity
    });
}

/**
 * Get status of a specific order
 * @param {number} orderID - ID of the order to check
 */
export async function getOrderStatus(orderID) {
    return await callApi("status", {
        order: orderID
    });
}

/**
 * Get multiple order statuses
 * @param {Array<number>} orderIDs - Array of order IDs
 */
export async function getOrdersStatus(orderIDs) {
    return await callApi("status", {
        orders: orderIDs.join(",")
    });
}

/**
 * Get account balance
 */
export async function getBalance() {
    return await callApi("balance");
}
