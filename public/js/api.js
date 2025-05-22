/**
 * API functions for interacting with the backend
 */

// Base URL for API calls - dynamically determine if we're on Vercel or local
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
const API_BASE_URL = isProduction ?
  // For production (Vercel), use relative path
  '/api' :
  // For local development, use the actual API
  'http://localhost:3000/api';

console.log('API Base URL:', API_BASE_URL); // Debug log

/**
 * Check database connection status
 * @returns {Promise<boolean>} True if connected to MongoDB, false if using CSV fallback
 */
async function checkDatabaseStatus() {
  try {
    console.log('Checking database connection status...');
    const response = await fetch(`${API_BASE_URL}/db-status`);
    if (!response.ok) {
      console.warn('Database status check returned non-OK response:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('Database status response:', data);

    return data.status === 'connected' && !data.fallback;
  } catch (error) {
    console.error('Error checking database status:', error);
    return false;
  }
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

    console.log('API URL:', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API returned non-JSON response:', contentType);
      throw new Error('API returned non-JSON response');
    }

    const loans = await response.json();

    if (!Array.isArray(loans)) {
      console.error('API did not return an array of loans:', loans);
      throw new Error('API did not return an array of loans');
    }

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
