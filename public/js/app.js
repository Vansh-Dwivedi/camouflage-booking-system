// Global App Configuration and Utilities
const API_BASE_URL = '';
let currentUser = null;
let socket = null;

// Log database type for debugging
console.log('🚀 Camouflage Booking System');
console.log('💾 Database: JSON File Storage');
console.log('🔧 Backend: Node.js + Express.js');
console.log('📡 Real-time: Socket.IO (Local only)');

// Initialize Socket.IO connection
function initializeSocket() {
    // Skip Socket.IO for production deployment (Vercel doesn't support WebSockets)
    if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost') === false) {
        console.log('Socket.IO disabled for serverless deployment');
        return;
    }
    
    if (typeof io !== 'undefined') {
        socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }
}

// API Helper Functions
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add auth token if user is logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(API_BASE_URL + url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Authentication Functions
function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

function removeAuthToken() {
    localStorage.removeItem('authToken');
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

async function getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;

    // Return cached user if already loaded
    if (currentUser) return currentUser;

    try {
        const response = await apiRequest('/api/auth/verify');
        currentUser = response.data.user;
        return currentUser;
    } catch (error) {
        console.error('Failed to verify user:', error);
        removeAuthToken();
        return null;
    }
}

async function logout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        removeAuthToken();
        currentUser = null;
        window.location.href = '/';
    }
}

// UI Helper Functions
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading...</p>
            </div>
        `;
    }
}

function hideLoading() {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.style.display = 'none');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

function showError(message, title = 'Error') {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        showModal('errorModal');
    } else {
        alert(message);
    }
}

function showSuccess(message, title = 'Success') {
    const successModal = document.getElementById('successModal');
    const successMessage = document.getElementById('successMessage');
    
    if (successModal && successMessage) {
        successMessage.textContent = message;
        showModal('successModal');
    } else {
        alert(message);
    }
}

// Format Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(new Date(date));
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(new Date(date));
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
}

// Validation Functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function validatePassword(password) {
    return password.length >= 6 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
}

// Local Storage Helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to read from localStorage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
    }
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Theme and UI Preferences
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Navigation Helper
function updateNavigation() {
    const loginLink = document.getElementById('loginLink');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const dashboardLink = document.getElementById('dashboardLink');

    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            if (userName) userName.textContent = currentUser.name;
        }
        if (dashboardLink && currentUser.role !== 'customer') {
            dashboardLink.style.display = 'block';
        }
    } else {
        if (loginLink) loginLink.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
}

// Mobile Navigation
function initializeMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
}

// Form Helpers
function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Remove validation classes
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
        });
    }
}

function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
}

function clearFieldErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }
}

// Notification System
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Position and show
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto remove
    const timeout = setTimeout(() => {
        removeNotification(notification);
    }, duration);

    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize socket connection
    initializeSocket();
    
    // Initialize theme
    initializeTheme();
    
    // Initialize mobile navigation
    initializeMobileNav();
    
    // Get current user
    await getCurrentUser();
    
    // Update navigation
    updateNavigation();
    
    // Add global error handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError('Something went wrong. Please try again.');
    });
    
    // Add global click handler for modal backgrounds
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id;
            closeModal(modalId);
        }
    });
});

// Export for use in other files
window.App = {
    apiRequest,
    getCurrentUser,
    logout,
    showModal,
    closeModal,
    showError,
    showSuccess,
    showLoading,
    hideLoading,
    formatCurrency,
    formatDate,
    formatTime,
    formatDateTime,
    formatDuration,
    validateEmail,
    validatePhone,
    validatePassword,
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage,
    debounce,
    updateNavigation,
    serializeForm,
    resetForm,
    setFieldError,
    clearFieldErrors,
    showNotification
};