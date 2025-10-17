// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth JS loaded');
    
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Check if already logged in
    checkAuthStatus();
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.token) {
            // Store token
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            // Redirect based on role
            if (data.data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/booking';
            }
        } else {
            showAuthError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthError('Login failed: ' + error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.token) {
            // Store token
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            // Redirect to booking
            window.location.href = '/booking';
        } else {
            showAuthError(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthError('Registration failed: ' + error.message);
    }
}

async function loginAsAdmin() {
    // Demo admin login
    const email = 'admin@camouflage.com';
    const password = 'admin123';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.token) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            window.location.href = '/admin';
        } else {
            showAuthError(data.message || 'Admin login failed');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showAuthError('Admin login failed: ' + error.message);
    }
}

async function loginAsCustomer() {
    // Demo customer login
    const email = 'customer@example.com';
    const password = 'customer123';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.token) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            window.location.href = '/booking';
        } else {
            showAuthError(data.message || 'Customer login failed');
        }
    } catch (error) {
        console.error('Customer login error:', error);
        showAuthError('Customer login failed: ' + error.message);
    }
}

function switchToRegister() {
    document.querySelector('.auth-form-container').style.display = 'none';
    document.getElementById('registerContainer').style.display = 'block';
}

function switchToLogin() {
    document.querySelector('.auth-form-container').style.display = 'block';
    document.getElementById('registerContainer').style.display = 'none';
}

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    // If on login page and already authenticated, redirect
    if (token && user && window.location.pathname === '/login') {
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/booking';
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    window.location.href = '/login';
}

function showAuthError(message) {
    alert(message);
    // You can replace this with a better error UI
}

// Check if user is authenticated (for protected pages)
function requireAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Check if user is admin
function requireAdmin() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    
    try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        if (user.role !== 'admin') {
            window.location.href = '/';
            return false;
        }
    } catch (e) {
        window.location.href = '/login';
        return false;
    }
    
    return true;
}
