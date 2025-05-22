/**
 * API functions for interacting with the backend
 */

// Base URL for API calls - dynamically determine if we're on Vercel or local
const isProduction = window.location.hostname.includes('vercel.app');
const API_BASE_URL = isProduction ? 
  'https://washaenterprises.vercel.app/api' : 
  window.location.origin + '/api';

// Fallback endpoints to try
const DB_STATUS_ENDPOINTS = [
  `${API_BASE_URL}/db-status`,
  `${window.location.origin}/api/db-status`,
  '/api/db-status'
];

console.log('Environment:', isProduction ? 'Production' : 'Development');
console.log('API Base URL:', API_BASE_URL);

/**
 * Check database connection status with retries and fallbacks
 * @returns {Promise<boolean>} True if connected to MongoDB, false if using CSV fallback
 */
async function checkDatabaseStatus() {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second delay between retries

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const endpoint of DB_STATUS_ENDPOINTS) {
      try {
        console.log(`Checking database status (attempt ${attempt + 1}/${maxRetries}) using endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log('Database status response:', data);

        if (data.status === 'connected' || data.connectionState === 1) {
          console.log('Successfully connected to database');
          return true;
        }
      } catch (error) {
        console.warn(`Failed to check status with endpoint ${endpoint}:`, error);
      }
    }
    
    if (attempt < maxRetries - 1) {
      console.log(`All endpoints failed on attempt ${attempt + 1}, waiting ${retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.log('All database connection attempts failed, falling back to CSV');
  return false;
}

/**
 * Fetch all loans from the API
 * @param {string} searchTerm - Optional search term to filter loans
 * @returns {Promise<Array>} Array of loan objects
 */
async function fetchLoans(searchTerm = '') {
  try {
    console.log('Fetching loans from API...');
    const url = searchTerm
      ? `${API_BASE_URL}/loans?q=${encodeURIComponent(searchTerm)}`
      : `${API_BASE_URL}/loans`;

    console.log('Fetching from URL:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API returned non-JSON response');
    }

    const loans = await response.json();
    console.log(`Successfully fetched ${loans.length} loans from API`);
    return loans;
  } catch (error) {
    console.error('Error fetching loans:', error);
    throw error;
  }
}

/**
 * Create a new loan
 * @param {Object} loanData - Loan data to create
 * @returns {Promise<Object>} Created loan object
 */
async function createLoan(loanData) {
  try {
    const response = await fetch(`${API_BASE_URL}/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loanData)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const createdLoan = await response.json();
    return createdLoan;
  } catch (error) {
    console.error('Error creating loan:', error);
    throw error;
  }
}

/**
 * Update an existing loan
 * @param {string} loanId - ID of the loan to update
 * @param {Object} loanData - Updated loan data
 * @returns {Promise<Object>} Updated loan object
 */
async function updateLoan(loanId, loanData) {
  try {
    // Check if loanData contains FormData (for file uploads)
    if (loanData instanceof FormData) {
      // FormData already contains the data, just add the loanId if needed
      if (!loanData.has('_id')) {
        loanData.append('_id', loanId);
      }

      const response = await fetch(`${API_BASE_URL}/loans/${loanId}`, {
        method: 'PUT',
        body: loanData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const updatedLoan = await response.json();
      return updatedLoan;
    } else {
      // Regular JSON data
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loanData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const updatedLoan = await response.json();
      return updatedLoan;
    }
  } catch (error) {
    console.error('Error updating loan:', error);
    throw error;
  }
}

/**
 * Add a payment to a loan
 * @param {string} loanId - ID of the loan
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Updated loan object
 */
async function addPayment(loanId, paymentData) {
  try {
    const response = await fetch(`${API_BASE_URL}/loans/${loanId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const updatedLoan = await response.json();
    return updatedLoan;
  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
}

/**
 * Delete a loan
 * @param {string} loanId - ID of the loan to delete
 * @returns {Promise<void>}
 */
async function deleteLoan(loanId) {
  try {
    const response = await fetch(`${API_BASE_URL}/loans/${loanId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting loan:', error);
    throw error;
  }
}
