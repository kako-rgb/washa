// Authentication Module

// Global variables
let currentUser = null;
const API_URL = 'https://washaenterprises.vercel.app/api';

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupLogoutHandler();
});

// Login function
function login(username, password) {
    return fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    })
    .then(async response => {
        let data;
        const contentType = response.headers.get('content-type');
        
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Unexpected response: ${text}`);
            }
        } catch (e) {
            throw new Error('Invalid response from server: ' + e.message);
        }
        
        if (!response.ok) {
            throw new Error(data.message || `Login failed: ${response.status}`);
        }
        
        return data;
    })
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            return data;
        } else {
            throw new Error('No token received from server');
        }
    });
}

// Fetch user info using the token
function fetchUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve();
    
    return fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        },
        credentials: 'include'
    })
    .then(async response => {
        let data;
        const contentType = response.headers.get('content-type');
        
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                throw new Error('Invalid response type from server');
            }
        } catch (e) {
            throw new Error('Failed to parse server response');
        }
        
        if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
        }
        
        return data;
    })
    .then(data => {
        currentUser = data.user;
        updateUserInfo();
        return data;
    })
    .catch(error => {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('index.html') && !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
        throw error;
    });
}

// Check authentication status
function checkAuthStatus() {
    // Temporarily bypass login and redirect to dashboard
    const isAdminDashboardPage = window.location.pathname.includes('dashboard.html');

    if (!isAdminDashboardPage) {
        window.location.href = 'dashboard.html';
        return; // Ensure no other code in this function runs after redirect
    }
    
    // If already on the dashboard page, you might still want to fetch some default/mock user info
    // or ensure UI elements that expect user data are handled gracefully.
    // For now, we'll comment out fetchUserInfo as it might rely on a real token.
    // if (window.location.pathname.includes('dashboard.html')) {
    //     // fetchUserInfo(); // This might fail or need adjustment if no real user is logged in
    // }
}

// Update user info in the UI
function updateUserInfo() {
    const userElement = document.getElementById('current-user');
    if (userElement && currentUser) {
        userElement.textContent = `Welcome, ${currentUser.fullName || currentUser.username}`;
    }
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Logout function
function logout() {
    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).finally(() => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

// Get authentication headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Export auth functions
window.auth = {
    login,
    logout,
    getAuthHeaders,
    checkAuthStatus,
    currentUser: () => currentUser
};
