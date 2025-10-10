// Authentication functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth page loaded');
    initializeAuthForms();
    checkAuthRedirect();
});

function initializeAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Initialize password strength indicator
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        if (input.name === 'password' || input.id.includes('Password')) {
            initializePasswordStrength(input);
        }
    });
}

function checkAuthRedirect() {
    console.log('Checking auth redirect');
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const message = urlParams.get('message');
    
    if (message) {
        console.log('Showing error message:', message);
        App.showError(decodeURIComponent(message));
    }
    
    // Store redirect URL for after login
    if (redirect) {
        console.log('Storing redirect:', redirect);
        sessionStorage.setItem('loginRedirect', redirect);
    }
    
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        console.log('User already has token, checking validity...');
        // Don't auto-redirect, let them logout if needed
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = App.serializeForm(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        // Clear previous errors
        App.clearFieldErrors('loginForm');
        
        // Validate form
        if (!validateLoginForm(formData)) {
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
        
        // Make API request
        const response = await App.apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Save auth token
        localStorage.setItem('authToken', response.data.token);
        
        // Update current user
        currentUser = response.data.user;
        
        // Redirect based on user role and redirect parameter
        const redirectUrl = getRedirectUrl(response.data.user.role);
        console.log('Redirecting to:', redirectUrl);
        
        // Add a small delay to ensure token is saved
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 100);
        
    } catch (error) {
        console.error('Login error:', error);
        App.showError(error.message || 'Login failed. Please try again.');
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = App.serializeForm(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        // Clear previous errors
        App.clearFieldErrors('registerForm');
        
        // Validate form
        if (!validateRegisterForm(formData)) {
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
        
        // Make API request
        const response = await App.apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Save auth token
        localStorage.setItem('authToken', response.data.token);
        
        // Update current user
        currentUser = response.data.user;
        
        // Show success and redirect
        App.showSuccess('Account created successfully! Welcome to Camouflage Studio.');
        
        setTimeout(() => {
            const redirectUrl = getRedirectUrl(response.data.user.role);
            window.location.href = redirectUrl;
        }, 1500);
        
    } catch (error) {
        console.error('Register error:', error);
        
        // Handle validation errors
        if (error.message.includes('validation') || error.message.includes('required')) {
            App.showError('Please check your information and try again.');
        } else if (error.message.includes('exists')) {
            App.setFieldError('registerEmail', 'An account with this email already exists.');
        } else {
            App.showError(error.message || 'Registration failed. Please try again.');
        }
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

function validateLoginForm(data) {
    let isValid = true;
    
    // Email validation
    if (!data.email) {
        App.setFieldError('email', 'Email is required.');
        isValid = false;
    } else if (!App.validateEmail(data.email)) {
        App.setFieldError('email', 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Password validation
    if (!data.password) {
        App.setFieldError('password', 'Password is required.');
        isValid = false;
    }
    
    return isValid;
}

function validateRegisterForm(data) {
    let isValid = true;
    
    // Name validation
    if (!data.name || data.name.trim().length < 2) {
        App.setFieldError('registerName', 'Name must be at least 2 characters long.');
        isValid = false;
    }
    
    // Email validation
    if (!data.email) {
        App.setFieldError('registerEmail', 'Email is required.');
        isValid = false;
    } else if (!App.validateEmail(data.email)) {
        App.setFieldError('registerEmail', 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Phone validation (optional but if provided, must be valid)
    if (data.phone && !App.validatePhone(data.phone)) {
        App.setFieldError('registerPhone', 'Please enter a valid phone number.');
        isValid = false;
    }
    
    // Password validation
    if (!data.password) {
        App.setFieldError('registerPassword', 'Password is required.');
        isValid = false;
    } else if (!App.validatePassword(data.password)) {
        App.setFieldError('registerPassword', 'Password must be at least 6 characters with uppercase, lowercase, and number.');
        isValid = false;
    }
    
    return isValid;
}

function getRedirectUrl(userRole) {
    // Check for stored redirect URL
    const storedRedirect = sessionStorage.getItem('loginRedirect');
    if (storedRedirect) {
        sessionStorage.removeItem('loginRedirect');
        return storedRedirect;
    }
    
    // Default redirects based on role
    switch (userRole) {
        case 'admin':
        case 'staff':
            return '/admin';
        case 'customer':
            return '/';
        default:
            return '/';
    }
}

function switchToRegister() {
    const loginContainer = document.querySelector('.auth-form-container:not(#registerContainer)');
    const registerContainer = document.getElementById('registerContainer');
    
    if (loginContainer && registerContainer) {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
        
        // Clear forms
        App.resetForm('loginForm');
        App.resetForm('registerForm');
    }
}

function switchToLogin() {
    const loginContainer = document.querySelector('.auth-form-container:not(#registerContainer)');
    const registerContainer = document.getElementById('registerContainer');
    
    if (loginContainer && registerContainer) {
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        
        // Clear forms
        App.resetForm('loginForm');
        App.resetForm('registerForm');
    }
}

// Demo login functions
async function loginAsAdmin() {
    await performDemoLogin('admin@camouflage.com', 'admin123');
}

async function loginAsCustomer() {
    await performDemoLogin('customer@example.com', 'customer123');
}

async function performDemoLogin(email, password) {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    // Fill form
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
    
    // Submit form
    const event = new Event('submit', { bubbles: true, cancelable: true });
    loginForm.dispatchEvent(event);
}

// Password strength indicator
function initializePasswordStrength(input) {
    const container = input.parentNode;
    
    // Create strength indicator if it doesn't exist
    let strengthIndicator = container.querySelector('.password-strength');
    if (!strengthIndicator) {
        strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = '<div class="password-strength-bar"></div>';
        container.appendChild(strengthIndicator);
    }
    
    const strengthBar = strengthIndicator.querySelector('.password-strength-bar');
    
    input.addEventListener('input', () => {
        const strength = calculatePasswordStrength(input.value);
        updatePasswordStrengthUI(strengthBar, strength);
    });
}

function calculatePasswordStrength(password) {
    if (!password) return { level: 'none', score: 0 };
    
    let score = 0;
    const checks = {
        length: password.length >= 6,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    // Calculate score
    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;
    
    // Determine level
    let level = 'weak';
    if (score >= 80) level = 'strong';
    else if (score >= 60) level = 'medium';
    
    return { level, score, checks };
}

function updatePasswordStrengthUI(strengthBar, strength) {
    strengthBar.className = `password-strength-bar ${strength.level}`;
    
    // Update width based on score
    if (strength.level === 'none') {
        strengthBar.style.width = '0%';
    }
}

// Real-time form validation
function initializeRealTimeValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            // Clear error state when user starts typing
            if (input.classList.contains('error')) {
                input.classList.remove('error');
                const errorMessage = input.parentNode.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            }
        });
    });
}

function validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    const name = input.name || input.id;
    
    let isValid = true;
    let message = '';
    
    // Required field check
    if (input.required && !value) {
        isValid = false;
        message = 'This field is required.';
    }
    // Email validation
    else if (type === 'email' && value && !App.validateEmail(value)) {
        isValid = false;
        message = 'Please enter a valid email address.';
    }
    // Password validation
    else if (type === 'password' && value && name.includes('password')) {
        if (!App.validatePassword(value)) {
            isValid = false;
            message = 'Password must be at least 6 characters with uppercase, lowercase, and number.';
        }
    }
    // Phone validation
    else if (name.includes('phone') && value && !App.validatePhone(value)) {
        isValid = false;
        message = 'Please enter a valid phone number.';
    }
    
    // Update field state
    if (isValid) {
        input.classList.remove('error');
        input.classList.add('success');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    } else {
        input.classList.remove('success');
        input.classList.add('error');
        
        // Show error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.textContent = message;
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            input.parentNode.appendChild(errorDiv);
        }
    }
    
    return isValid;
}

// Initialize real-time validation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeRealTimeValidation();
});

// Auto-redirect if already logged in
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const user = await App.getCurrentUser();
            if (user) {
                // User is already logged in, redirect
                const redirectUrl = getRedirectUrl(user.role);
                window.location.href = redirectUrl;
                return;
            }
        } catch (error) {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
        }
    }
});