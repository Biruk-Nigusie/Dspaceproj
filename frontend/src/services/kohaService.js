/**
 * Koha Service
 * Handles API calls for Koha cataloging and availability checking
 */

const API_BASE = 'http://localhost:8000/api/koha';

/**
 * Check availability of physical items for a bibliographic record
 * @param {number} biblioId - Koha bibliographic record ID
 * @returns {Promise<Object>} Availability data
 */
export async function checkAvailability(biblioId) {
    try {
        const response = await fetch(`${API_BASE}/biblio/${biblioId}/availability/`);

        if (!response.ok) {
            throw new Error(`Failed to check availability: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking availability:', error);
        throw error;
    }
}

/**
 * Catalog a DSpace item into Koha
 * @param {string} dspaceUuid - DSpace item UUID
 * @param {Object} physicalItemData - Physical item details
 * @returns {Promise<Object>} Cataloging result
 */
export async function catalogItem(dspaceUuid, physicalItemData) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/catalog/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
                dspace_uuid: dspaceUuid,
                physical_item: physicalItemData
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to catalog item: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error cataloging item:', error);
        throw error;
    }
}

/**
 * Add a duplicate physical item to an existing bibliographic record
 * @param {number} biblioId - Koha bibliographic record ID
 * @param {Object} itemData - Physical item details
 * @returns {Promise<Object>} Result
 */
export async function addDuplicate(biblioId, itemData) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/biblio/${biblioId}/items/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to add duplicate: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding duplicate:', error);
        throw error;
    }
}
