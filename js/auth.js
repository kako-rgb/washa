// Authentication Module

// Global variables
let currentUser = null;
// Configure API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://washaenterprises.vercel.app/api';

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupLogoutHandler();
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '/';
    
    if (!token) {
        // If not on login page, redirect to login
        if (!isLoginPage) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // If we're already on the dashboard and have a token, just update user info
    if (window.location.pathname.includes('dashboard.html')) {
        fetchUserInfo();
        return;
    }
    
    // Otherwise verify token and redirect if needed
    fetchUserInfo().then(() => {
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
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
            'Authorization': `Bearer ${token}`
        }
    })
    .then(async response => {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, treat as error
            data = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        
        if (!response.ok) {
            throw new Error(data.message || 'Token invalid');
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

// Update user info in the UI
function updateUserInfo() {
    if (!currentUser) return;
    
    const userNameElement = document.getElementById('user-name');
    const userRoleElement = document.getElementById('user-role');
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.name;
    }
    
    if (userRoleElement) {
        let roleDisplay = 'User';
        switch(currentUser.role) {
            case 'admin':
                roleDisplay = 'Administrator';
                break;
            case 'loan_officer':
                roleDisplay = 'Loan Officer';
                break;
            case 'customer':
                roleDisplay = 'Customer';
                break;
        }
        userRoleElement.textContent = roleDisplay;
    }
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Login function
function login(username, password) {
    return fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(async response => {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, get text content for error message
            const text = await response.text();
            data = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return data;
    })
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            // Redirect to dashboard after successful login
            window.location.href = 'dashboard.html';
        }
        return data;
    });
}

// Check if user has specific role
function hasRole(role) {
    if (!currentUser) return false;
    return currentUser.role === role;
}

// Check if user has admin privileges
function isAdmin() {
    return hasRole('admin');
}

// Check if user has loan officer privileges
function isLoanOfficer() {
    return hasRole('loan_officer') || isAdmin();
}

// Get authentication headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Handle login form submission
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');
        
        // Simple validation
        if (!username || !password) {
            errorElement.textContent = 'Please enter both username and password';
            return;
        }
        
        // Clear previous errors
        errorElement.textContent = '';
        
        // Attempt login
        login(username, password)
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch(error => {
                console.error('Login error:', error);
                errorElement.textContent = 'Invalid username or password';
            });
    });
}

// Password visibility toggle
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Password recovery modal functions
function showPasswordRecovery() {
    const recoveryModal = new bootstrap.Modal(document.getElementById('passwordRecoveryModal'));
    recoveryModal.show();
    
    // Reset form when modal is hidden
    document.getElementById('passwordRecoveryModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('recovery-email').value = '';
        document.getElementById('recoveryError').textContent = '';
        document.getElementById('recoverySuccess').textContent = '';
    });
}

// Handle password recovery form submission
if (document.getElementById('passwordRecoveryForm')) {
    document.getElementById('passwordRecoveryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('recovery-email').value;
        const recoveryError = document.getElementById('recoveryError');
        const recoverySuccess = document.getElementById('recoverySuccess');
        
        // Simple validation
        if (!email) {
            recoveryError.textContent = 'Please enter your email address';
            return;
        }
        
        // Clear previous messages
        recoveryError.textContent = '';
        recoverySuccess.textContent = '';
        
        try {
            // In a real app, you would send a password reset email
            // For now, we'll just show a success message
            recoverySuccess.textContent = 'If an account exists with this email, you will receive a password reset link.';
            
            // Close the modal after 3 seconds
            setTimeout(() => {
                const recoveryModal = bootstrap.Modal.getInstance(document.getElementById('passwordRecoveryModal'));
                if (recoveryModal) {
                    recoveryModal.hide();
                }
            }, 3000);
        } catch (error) {
            console.error('Password recovery error:', error);
            recoveryError.textContent = 'An error occurred. Please try again later.';
        }
    });
}

// Export auth functions
window.auth = {
    login,
    logout,
    hasRole,
    isAdmin,
    isLoanOfficer,
    getAuthHeaders,
    checkAuthStatus,
    currentUser: () => currentUser
};
