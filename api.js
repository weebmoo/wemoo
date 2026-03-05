/**
 * api.js
 * Handles all API requests to the SMM Panel via the server proxy.
 */

const API_KEY = "180cc445525374a025360284a4c519b3";

/**
 * Generic function to call the SMM API via our proxy
 */
async function callApi(action, params = {}) {
    try {
        const response = await fetch("/api/proxy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                key: API_KEY,
                action: action,
                ...params
            })
        });

        if (response.status === 404 || response.status === 405) {
            // This happens if the backend server isn't running or the route is missing
            throw new Error(`Proxy Error (${response.status}): The backend server is not reachable. If you are using 'Live Server', please switch to the App URL provided in the preview.`);
        }

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.message && !data.status) {
            // Some APIs return errors in a 'message' field
            throw new Error(data.message);
        }

        return data;
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        throw error;
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
