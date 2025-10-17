// Admin Services JavaScript
let currentServiceId = null;

// Helper function to get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

// Helper function to make authenticated API calls
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Only load services if we're on the services page
    if (document.getElementById('servicesGrid')) {
        loadServices();
        setupFormHandlers();
        setupDiscountToggle();
    }
    
    // Load bookings if we're on the bookings page
    if (document.getElementById('bookingsTable')) {
        loadBookings();
    }
    
    // Load customers if we're on the customers page
    if (document.getElementById('customersTable')) {
        loadCustomers();
    }
    
    // Load analytics if we're on the analytics page
    if (document.getElementById('bookingsChart')) {
        loadAnalytics();
    }
    
    // Load settings if we're on the settings page
    if (document.getElementById('notificationSettings')) {
        loadSettings();
    }
    
    // Handle nav items - allow normal navigation to all pages
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't prevent default - let links work normally!
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

function setupDiscountToggle() {
    const hasDiscountCheckbox = document.getElementById('hasDiscount');
    const discountSection = document.getElementById('discountSection');
    
    if (hasDiscountCheckbox) {
        hasDiscountCheckbox.addEventListener('change', function() {
            discountSection.style.display = this.checked ? 'block' : 'none';
            if (this.checked) {
                document.getElementById('discountType').required = true;
                document.getElementById('discountValue').required = true;
                document.getElementById('offerName').required = true;
            } else {
                document.getElementById('discountType').required = false;
                document.getElementById('discountValue').required = false;
                document.getElementById('offerName').required = false;
            }
        });
    }
}

function setupFormHandlers() {
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', saveService);
    }
}

async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
    try {
        const response = await authenticatedFetch('/api/services/admin/all');
        const data = await response.json();
        
        // Handle both response formats: array directly or wrapped in data.services
        const services = Array.isArray(data) ? data : (data.data?.services || data.services || []);
        
        if (services && services.length > 0) {
            servicesGrid.innerHTML = services.map(service => {
                const priceInfo = calculateDiscountedPrice(service);
                const showDiscount = service.hasDiscount && priceInfo.isActive;
                
                return `
                    <div class="service-card">
                        <div class="service-card-header">
                            <div>
                                <h3 class="service-card-title">${service.name}</h3>
                                <p style="margin: 4px 0; color: var(--text-secondary); font-size: 12px;">${service.category}</p>
                            </div>
                            ${showDiscount ? `<span class="service-discount-badge">${priceInfo.discountType === 'percentage' ? priceInfo.discount + '%' : '$' + priceInfo.discount} OFF</span>` : ''}
                        </div>
                        
                        <p style="margin: 12px 0; color: var(--text-secondary); font-size: 13px;">${service.description}</p>
                        
                        <div style="margin: 12px 0;">
                            ${showDiscount ? `
                                <div class="service-original-price">$${parseFloat(service.price).toFixed(2)}</div>
                                <div class="service-price">$${priceInfo.discountedPrice.toFixed(2)}</div>
                                <div style="font-size: 12px; color: var(--primary); margin-top: 4px;">${service.offerName}</div>
                            ` : `
                                <div class="service-price">$${parseFloat(service.price).toFixed(2)}</div>
                            `}
                        </div>
                        
                        <div style="margin: 12px 0; font-size: 12px; color: var(--text-secondary);">
                            <i class="fas fa-clock"></i> ${service.duration} min
                        </div>
                        
                        <div class="service-actions">
                            <button class="btn btn-primary" onclick="editService(${service.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline" onclick="deleteService(${service.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            servicesGrid.innerHTML = '<div class="loading">No services found</div>';
        }
    } catch (error) {
        console.error('Error loading services:', error);
        servicesGrid.innerHTML = `<div class="loading" style="color: red;">Error loading services: ${error.message}</div>`;
    }
}

function calculateDiscountedPrice(service) {
    if (!service.hasDiscount) {
        return {
            originalPrice: parseFloat(service.price),
            discountedPrice: parseFloat(service.price),
            discount: 0,
            discountType: null,
            isActive: false
        };
    }
    
    const originalPrice = parseFloat(service.price);
    let discountedPrice = originalPrice;
    
    if (service.discountType === 'percentage') {
        discountedPrice = originalPrice - (originalPrice * service.discountValue / 100);
    } else if (service.discountType === 'fixed') {
        discountedPrice = Math.max(0, originalPrice - parseFloat(service.discountValue));
    }
    
    const startDate = service.offerStartDate ? new Date(service.offerStartDate) : null;
    const endDate = service.offerEndDate ? new Date(service.offerEndDate) : null;
    const now = new Date();
    
    const isActive = (!startDate || now >= startDate) && (!endDate || now <= endDate);
    
    return {
        originalPrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discount: parseFloat(service.discountValue),
        discountType: service.discountType,
        isActive
    };
}

function openServiceModal() {
    currentServiceId = null;
    document.getElementById('serviceModalTitle').textContent = 'Add New Service';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('hasDiscount').checked = false;
    document.getElementById('discountSection').style.display = 'none';
    document.getElementById('serviceImagePreview').style.display = 'none';
    document.getElementById('imageUploadPrompt').style.display = 'flex';
    document.getElementById('serviceImageUrl').value = '';
    document.getElementById('serviceModal').classList.add('active');
    setupImageUploadHandler();
}

function setupImageUploadHandler() {
    const imageInput = document.getElementById('serviceImage');
    const previewArea = document.querySelector('.image-preview-area');
    
    if (!imageInput || !previewArea) return;
    
    // Click to upload
    previewArea.addEventListener('click', () => imageInput.click());
    
    // Drag and drop
    previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewArea.style.borderColor = 'var(--primary)';
    });
    
    previewArea.addEventListener('dragleave', () => {
        previewArea.style.borderColor = 'var(--border)';
    });
    
    previewArea.addEventListener('drop', (e) => {
        e.preventDefault();
        previewArea.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files[0]) {
            imageInput.files = e.dataTransfer.files;
            previewServiceImage({ target: imageInput });
        }
    });
}

function previewServiceImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('serviceImagePreview');
        const prompt = document.getElementById('imageUploadPrompt');
        
        preview.src = e.target.result;
        preview.style.display = 'block';
        prompt.style.display = 'none';
        
        // Store as base64 in hidden input
        document.getElementById('serviceImageUrl').value = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('active');
    currentServiceId = null;
}

async function editService(serviceId) {
    try {
        const response = await authenticatedFetch(`/api/services/admin/${serviceId}`);
        const result = await response.json();
        const service = result.data?.service || result.service || result;
        
        if (service && service.id) {
            document.getElementById('serviceModalTitle').textContent = 'Edit Service';
            document.getElementById('serviceId').value = service.id;
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceDescription').value = service.description;
            document.getElementById('serviceCategory').value = service.category;
            document.getElementById('serviceDuration').value = service.duration;
            document.getElementById('servicePrice').value = service.price;
            document.getElementById('preparationTime').value = service.preparationTime || 10;
            document.getElementById('cleanupTime').value = service.cleanupTime || 10;
            document.getElementById('serviceActive').checked = service.isActive;
            
            // Set discount fields
            document.getElementById('hasDiscount').checked = service.hasDiscount;
            document.getElementById('discountSection').style.display = service.hasDiscount ? 'block' : 'none';
            document.getElementById('offerName').value = service.offerName || '';
            document.getElementById('offerDescription').value = service.offerDescription || '';
            document.getElementById('discountType').value = service.discountType || '';
            document.getElementById('discountValue').value = service.discountValue || '';
            
            if (service.offerStartDate) {
                document.getElementById('offerStartDate').value = new Date(service.offerStartDate).toISOString().slice(0, 16);
            }
            if (service.offerEndDate) {
                document.getElementById('offerEndDate').value = new Date(service.offerEndDate).toISOString().slice(0, 16);
            }
            
            // Set availability
            if (service.availability) {
                Object.keys(service.availability).forEach(day => {
                    const checkbox = document.querySelector(`input[name="${day}"]`);
                    const startInput = document.querySelector(`input[name="${day}Start"]`);
                    const endInput = document.querySelector(`input[name="${day}End"]`);
                    
                    if (checkbox) checkbox.checked = service.availability[day].enabled;
                    if (service.availability[day].slots && service.availability[day].slots.length > 0) {
                        if (startInput) startInput.value = service.availability[day].slots[0].start;
                        if (endInput) endInput.value = service.availability[day].slots[0].end;
                    }
                });
            }
            
            // Set image
            if (service.imageUrl) {
                document.getElementById('serviceImageUrl').value = service.imageUrl;
                document.getElementById('serviceImagePreview').src = service.imageUrl;
                document.getElementById('serviceImagePreview').style.display = 'block';
                document.getElementById('imageUploadPrompt').style.display = 'none';
            } else {
                document.getElementById('serviceImageUrl').value = '';
                document.getElementById('serviceImagePreview').style.display = 'none';
                document.getElementById('imageUploadPrompt').style.display = 'flex';
            }
            
            document.getElementById('serviceModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading service:', error);
        showError('Failed to load service details');
    }
}

async function saveService(e) {
    e.preventDefault();
    
    const availability = buildAvailability();
    const imageUrl = document.getElementById('serviceImageUrl').value;
    
    const serviceData = {
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        category: document.getElementById('serviceCategory').value,
        duration: parseInt(document.getElementById('serviceDuration').value),
        price: parseFloat(document.getElementById('servicePrice').value),
        preparationTime: parseInt(document.getElementById('preparationTime').value || 10),
        cleanupTime: parseInt(document.getElementById('cleanupTime').value || 10),
        isActive: document.getElementById('serviceActive').checked,
        availability,
        hasDiscount: document.getElementById('hasDiscount').checked,
        discountType: document.getElementById('discountType').value || null,
        discountValue: document.getElementById('discountValue').value ? parseFloat(document.getElementById('discountValue').value) : null,
        offerName: document.getElementById('offerName').value || null,
        offerDescription: document.getElementById('offerDescription').value || null,
        offerStartDate: document.getElementById('offerStartDate').value ? new Date(document.getElementById('offerStartDate').value) : null,
        offerEndDate: document.getElementById('offerEndDate').value ? new Date(document.getElementById('offerEndDate').value) : null,
        imageUrl: imageUrl || null
    };
    
    try {
        const url = currentServiceId ? `/api/services/${currentServiceId}` : '/api/services';
        const method = currentServiceId ? 'PUT' : 'POST';
        
        const response = await authenticatedFetch(url, {
            method,
            body: JSON.stringify(serviceData)
        });
        
        if (response.ok) {
            closeServiceModal();
            loadServices();
            showSuccess(currentServiceId ? 'Service updated successfully' : 'Service created successfully');
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save service');
        }
    } catch (error) {
        console.error('Error saving service:', error);
        showError('Error saving service: ' + error.message);
    }
}

function buildAvailability() {
    const availability = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        const checkbox = document.querySelector(`input[name="${day}"]`);
        const startInput = document.querySelector(`input[name="${day}Start"]`);
        const endInput = document.querySelector(`input[name="${day}End"]`);
        
        availability[day] = {
            enabled: checkbox && checkbox.checked,
            slots: (checkbox && checkbox.checked && startInput && endInput) 
                ? [{ start: startInput.value, end: endInput.value }]
                : []
        };
    });
    
    return availability;
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
        const response = await authenticatedFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
        if (response.ok) {
            loadServices();
            showSuccess('Service deleted successfully');
        } else {
            showError('Failed to delete service');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        showError('Error deleting service');
    }
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Bookings Page
async function loadBookings() {
    const bookingsTable = document.getElementById('bookingsTable');
    if (!bookingsTable) return;
    
    try {
        const response = await authenticatedFetch('/api/bookings');
        const data = await response.json();
        
        const bookings = Array.isArray(data) ? data : (data.data?.bookings || data.bookings || []);
        
        if (bookings && bookings.length > 0) {
            const tbody = bookingsTable.querySelector('tbody');
            tbody.innerHTML = bookings.map(booking => `
                <tr>
                    <td>${new Date(booking.startTime).toLocaleString()}</td>
                    <td>${booking.customerName || 'N/A'}</td>
                    <td>${booking.serviceName || 'N/A'}</td>
                    <td><span class="status-badge status-${booking.status?.toLowerCase()}">${booking.status}</span></td>
                    <td>$${booking.price}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="viewBooking(${booking.id})">View</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBooking(${booking.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } else {
            bookingsTable.querySelector('tbody').innerHTML = '<tr><td colspan="6" class="text-center">No bookings found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        if (bookingsTable.querySelector('tbody')) {
            bookingsTable.querySelector('tbody').innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Error loading bookings</td></tr>';
        }
    }
}

function viewBooking(bookingId) {
    alert('View booking: ' + bookingId);
}

function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    alert('Delete booking: ' + bookingId);
}

// Customers Page
async function loadCustomers() {
    const customersTable = document.getElementById('customersTable');
    if (!customersTable) return;
    
    try {
        const response = await authenticatedFetch('/api/admin/users');
        const data = await response.json();
        
        const customers = Array.isArray(data) ? data : (data.data?.users || data.users || data || []);
        
        if (customers && customers.length > 0) {
            const tbody = customersTable.querySelector('tbody');
            tbody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.name || 'N/A'}</td>
                    <td>${customer.email || 'N/A'}</td>
                    <td>${customer.phone || 'N/A'}</td>
                    <td>${customer.bookings?.length || 0}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="viewCustomer(${customer.id})">View</button>
                    </td>
                </tr>
            `).join('');
        } else {
            customersTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">No customers found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        if (customersTable.querySelector('tbody')) {
            customersTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center" style="color: red;">Error loading customers</td></tr>';
        }
    }
}

function viewCustomer(customerId) {
    alert('View customer: ' + customerId);
}

// Analytics Page
async function loadAnalytics() {
    try {
        const response = await authenticatedFetch('/api/admin/analytics');
        const data = await response.json();
        
        const analyticsData = data.data || data;
        const categoryRevenue = analyticsData.categoryRevenue || [];
        const hourlyTrends = analyticsData.hourlyTrends || [];
        const customerRetention = analyticsData.customerRetention || {};
        
        // Simple chart rendering
        if (document.getElementById('bookingsChart')) {
            const chartDiv = document.getElementById('bookingsChart');
            chartDiv.innerHTML = `
                <div style="padding: 20px;">
                    <h3>Category Revenue</h3>
                    <div style="margin-bottom: 20px;">
                        ${categoryRevenue.map(cat => `
                            <div style="margin-bottom: 10px; padding: 10px; background: var(--bg-secondary); border-radius: 8px;">
                                <strong>${cat.category}</strong>: $${parseFloat(cat.revenue).toFixed(2)} (${cat.bookings} bookings)
                            </div>
                        `).join('')}
                    </div>
                    
                    <h3>Customer Retention</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                            <strong>New Customers</strong><br>
                            ${customerRetention.new?.customers || 0} customers
                        </div>
                        <div style="padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                            <strong>Returning Customers</strong><br>
                            ${customerRetention.returning?.customers || 0} customers
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        if (document.getElementById('bookingsChart')) {
            document.getElementById('bookingsChart').innerHTML = '<div style="color: red; padding: 20px;">Error loading analytics</div>';
        }
    }
}

// Settings Page
async function loadSettings() {
    try {
        const response = await authenticatedFetch('/api/admin/settings/notifications');
        const data = await response.json();
        
        const settings = data.data || data;
        const settingsDiv = document.getElementById('notificationSettings');
        
        if (settingsDiv) {
            settingsDiv.innerHTML = `
                <div style="padding: 20px;">
                    <h3>Notification Settings</h3>
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p><strong>Email Notifications:</strong> ${settings.emailNotifications ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>SMS Notifications:</strong> ${settings.smsNotifications ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Reminder Email:</strong> ${settings.reminderEmail ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Reminder SMS:</strong> ${settings.reminderSms ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Booking Confirmation Email:</strong> ${settings.bookingConfirmationEmail ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Booking Confirmation SMS:</strong> ${settings.bookingConfirmationSms ? 'Enabled' : 'Disabled'}</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        const settingsDiv = document.getElementById('notificationSettings');
        if (settingsDiv) {
            settingsDiv.innerHTML = '<div style="color: red; padding: 20px;">Error loading settings</div>';
        }
    }
}
