// Admin dashboard functionality
let services = [];
let bookings = [];
let users = [];
let analytics = {};
let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user has token
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login?redirect=/admin';
        return;
    }
    
    // Load current user if not already loaded
    if (!currentUser) {
        try {
            currentUser = await App.getCurrentUser();
        } catch (error) {
            console.error('Failed to get current user:', error);
            localStorage.removeItem('authToken');
            window.location.href = '/login?redirect=/admin';
            return;
        }
    }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        App.showError('Access denied. Admin rights required.');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }
    
    // Determine current section from path for multi-page admin
    const path = window.location.pathname;
    let section = 'dashboard';
    if (path === '/admin') section = 'dashboard';
    else if (path.startsWith('/admin/')) section = path.split('/')[2] || 'dashboard';

    initializeAdmin(section);
    if (section === 'settings') initializeNotificationSettings();
});

async function initializeAdmin(section) {
    try {
        // Highlight active nav item (server sends separate page per tab)
        document.querySelectorAll('.nav-item').forEach(a => {
            const sec = a.getAttribute('data-section');
            a.classList.toggle('active', sec === section);
        });

        // Set current view for real-time updates logic
        currentView = section;

        // Load only the relevant section's data
        switch (section) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'bookings':
                await loadBookings();
                break;
            case 'services':
                await loadServices();
                // Bind service form submit if present
                const svcForm = document.getElementById('serviceForm');
                if (svcForm && !svcForm.dataset.bound) {
                    svcForm.addEventListener('submit', (ev) => { ev.preventDefault(); saveService(); });
                    svcForm.dataset.bound = 'true';
                }
                break;
            case 'customers':
                await loadCustomers();
                break;
            case 'analytics':
                await loadAnalytics();
                break;
            case 'settings':
                // settings page initializes its own form
                break;
        }

        // Real-time updates
        initializeRealTimeUpdates();
        
    } catch (error) {
        console.error('Error initializing admin:', error);
        App.showError('Failed to load admin dashboard.');
    }
}

async function initializeNotificationSettings() {
        const form = document.getElementById('notificationSettingsForm');
        if (!form) return;
        try {
            const resp = await App.apiRequest('/api/admin/settings/notifications');
            const cfg = resp.data;
            setVal('notifyEnabled', cfg.enabled, true);
            setVal('whatsappEnabled', cfg.whatsappEnabled, true);
            setVal('fromSms', cfg.fromSms, !cfg.fromSmsReadOnly);
            setVal('ownerPhoneSms', cfg.ownerPhoneSms, true);
            setVal('fromWhatsapp', cfg.fromWhatsapp, !cfg.fromWhatsappReadOnly);
            setVal('ownerPhoneWhatsapp', cfg.ownerPhoneWhatsapp, true);
            setVal('defaultCountryCode', cfg.defaultCountryCode, true);
            setVal('reminderHours', cfg.reminderHours, true);
        } catch (e) {
            console.error('Load notification settings failed', e);
        }
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const payload = {
                enabled: document.getElementById('notifyEnabled').checked,
                whatsappEnabled: document.getElementById('whatsappEnabled').checked,
                fromSms: document.getElementById('fromSms').value.trim(),
                ownerPhoneSms: document.getElementById('ownerPhoneSms').value.trim(),
                fromWhatsapp: document.getElementById('fromWhatsapp').value.trim(),
                ownerPhoneWhatsapp: document.getElementById('ownerPhoneWhatsapp').value.trim(),
                defaultCountryCode: document.getElementById('defaultCountryCode').value.trim(),
                reminderHours: parseInt(document.getElementById('reminderHours').value,10) || 24
            };
            try {
                await App.apiRequest('/api/admin/settings/notifications', { method:'PUT', body: JSON.stringify(payload) });
                App.showSuccess('Notification settings saved');
            } catch (e) {
                App.showError('Failed to save notification settings');
            }
        });
    }

function setVal(id, value, editable) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
        el.checked = !!value;
    } else if (value !== undefined) {
        el.value = value;
    }
    if (editable === false) {
        el.disabled = true;
        el.title = 'Managed by environment variable';
    }
}
// Navigation is native links now; no SPA switching required

// Dashboard
async function loadDashboardData() {
    try {
        App.showLoading('dashboardStats');
        
        const response = await App.apiRequest('/api/admin/dashboard');
        const data = response.data;
        
        // Update stats cards
        updateStatsCards(data.stats);
        
        // Update recent bookings
        updateRecentBookings(data.recentBookings);
        
        // Update quick actions
        updateQuickActions(data);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        App.showError('Failed to load dashboard data.');
    }
}

function updateStatsCards(stats) {
    // API supplies: totalBookings,totalServices,totalCustomers,totalRevenue, averageBookingValue, bookingsByStatus
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalServicesEl = document.getElementById('totalServices');
    const totalCustomersEl = document.getElementById('totalCustomers');

    if (totalBookingsEl) totalBookingsEl.textContent = stats.totalBookings ?? 0;
    if (totalRevenueEl) totalRevenueEl.textContent = App.formatCurrency(stats.totalRevenue ?? 0);
    if (totalServicesEl) totalServicesEl.textContent = stats.totalServices ?? 0;
    if (totalCustomersEl) totalCustomersEl.textContent = stats.totalCustomers ?? 0;
}

function updateRecentBookings(recentBookings) {
    const container = document.getElementById('recentBookings');
    
    if (!recentBookings || recentBookings.length === 0) {
        container.innerHTML = '<p class="no-data">No recent bookings</p>';
        return;
    }
    
    container.innerHTML = recentBookings.map(booking => `
        <div class="booking-item" data-booking-id="${booking.id}">
            <div class="booking-info">
                <h4>${booking.customerInfo.name}</h4>
                <p>${booking.service.name}</p>
                <div class="booking-meta">
                    <span class="booking-time">
                        <i class="fas fa-calendar"></i>
                        ${App.formatDateTime(booking.startTime)}
                    </span>
                    <span class="booking-status status-${booking.status}">${booking.status}</span>
                </div>
            </div>
            <div class="booking-actions">
                <button onclick="viewBooking('${booking.id}')" class="btn btn-sm btn-outline">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editBooking('${booking.id}')" class="btn btn-sm btn-outline">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateQuickActions(data) {
    // Update pending bookings count
    const pendingCount = data.stats.pendingBookings || 0;
    const pendingBadge = document.querySelector('[data-action="pending-bookings"] .badge');
    if (pendingBadge) {
        pendingBadge.textContent = pendingCount;
        pendingBadge.style.display = pendingCount > 0 ? 'block' : 'none';
    }
}

// Bookings Management
async function loadBookings() {
    try {
        App.showLoading('bookingsTable');
        
        const response = await App.apiRequest('/api/admin/bookings');
        bookings = response.data.bookings;
        
        displayBookings(bookings);
        setupBookingsFilters();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookingsTable').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load bookings.</p>
            </div>
        `;
    }
}

function displayBookings(bookingsToShow) {
    const table = document.getElementById('bookingsTable');
    
    if (bookingsToShow.length === 0) {
        table.innerHTML = '<div class="no-data">No bookings found</div>';
        return;
    }
    
    table.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookingsToShow.map(booking => `
                    <tr data-booking-id="${booking.id}">
                        <td>
                            <div class="customer-info">
                                <strong>${booking.customerInfo.name}</strong>
                                <div class="customer-contact">
                                    <small>${booking.customerInfo.email}</small>
                                    <br>
                                    <small>${booking.customerInfo.phone}</small>
                                </div>
                            </div>
                        </td>
                        <td>${booking.service.name}</td>
                        <td>
                            <div class="booking-datetime">
                                <div>${App.formatDate(booking.startTime)}</div>
                                <small>${App.formatTime(booking.startTime)} - ${App.formatTime(booking.endTime)}</small>
                            </div>
                        </td>
                        <td>
                            <div class="status-container">
                                <select class="status-select" id="status-${booking.id}" data-original="${booking.status}">
                                    <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="in-progress" ${booking.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="no-show" ${booking.status === 'no-show' ? 'selected' : ''}>No Show</option>
                                </select>
                                <button class="btn btn-sm btn-primary apply-status-btn" 
                                        onclick="applyStatusChange('${booking.id}')" 
                                        id="apply-${booking.id}" 
                                        style="display: none; margin-left: 8px;">
                                    <i class="fas fa-paper-plane"></i> Apply
                                </button>
                            </div>
                        </td>
                        <td>${App.formatCurrency(booking.pricing.finalPrice)}</td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="viewBooking('${booking.id}')" class="btn btn-sm btn-outline" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editBooking('${booking.id}')" class="btn btn-sm btn-outline" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="cancelBooking('${booking.id}')" class="btn btn-sm btn-danger" title="Cancel">
                                    <i class="fas fa-times"></i>
                                </button>
                                <button onclick="deleteBooking('${booking.id}')" class="btn btn-sm btn-danger" title="Delete permanently">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Add event listeners for status dropdowns
    setTimeout(() => {
        console.log('Setting up status dropdown listeners...');
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', function() {
                const bookingId = this.id.replace('status-', '');
                const originalStatus = this.dataset.original;
                const newStatus = this.value;
                const applyBtn = document.getElementById(`apply-${bookingId}`);
                
                if (newStatus !== originalStatus) {
                    applyBtn.style.display = 'block';
                } else {
                    applyBtn.style.display = 'none';
                }
            });
        });
    }, 100);
}

async function applyStatusChange(bookingId) {
    const select = document.getElementById(`status-${bookingId}`);
    const applyBtn = document.getElementById(`apply-${bookingId}`);
    const newStatus = select.value;
    const originalStatus = select.dataset.original;
    
    if (newStatus === originalStatus) {
        applyBtn.style.display = 'none';
        return;
    }
    
    try {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        await updateBookingStatus(bookingId, newStatus);
        
        // Update the original status
        select.dataset.original = newStatus;
        applyBtn.style.display = 'none';
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Apply';
        
    } catch (error) {
        // Revert the select value
        select.value = originalStatus;
        applyBtn.style.display = 'none';
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Apply';
    }
}

function setupBookingsFilters() {
    const statusFilter = document.getElementById('bookingStatusFilter') || document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchBookings');

    if (statusFilter) statusFilter.addEventListener('change', filterBookings);
    if (dateFilter) dateFilter.addEventListener('change', filterBookings);
    if (searchInput) searchInput.addEventListener('input', App.debounce(filterBookings, 300));
}

function filterBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter') || document.getElementById('statusFilter');
    const status = statusFilter ? statusFilter.value : 'all';
    const dateFilter = document.getElementById('dateFilter');
    const dateRange = dateFilter ? dateFilter.value : 'all';
    const searchInput = document.getElementById('searchBookings');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filteredBookings = bookings;
    
    // Filter by status
    if (status !== 'all') {
        filteredBookings = filteredBookings.filter(booking => booking.status === status);
    }
    
    // Filter by date range
    if (dateRange !== 'all') {
        const today = new Date();
        let startDate, endDate;
        
        switch (dateRange) {
            case 'today':
                startDate = new Date(today.setHours(0, 0, 0, 0));
                endDate = new Date(today.setHours(23, 59, 59, 999));
                break;
            case 'week':
                startDate = new Date(today.setDate(today.getDate() - today.getDay()));
                endDate = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
        }
        
        if (startDate && endDate) {
            filteredBookings = filteredBookings.filter(booking => {
                const bookingDate = new Date(booking.startTime);
                return bookingDate >= startDate && bookingDate <= endDate;
            });
        }
    }
    
    // Filter by search term
    if (search) {
        filteredBookings = filteredBookings.filter(booking =>
            booking.customerInfo.name.toLowerCase().includes(search) ||
            booking.customerInfo.email.toLowerCase().includes(search) ||
            booking.service.name.toLowerCase().includes(search)
        );
    }
    
    displayBookings(filteredBookings);
}

// Modal helpers used by HTML onclicks
function openServiceModal() { showServiceModal(); }
function closeServiceModal() { App.closeModal('serviceModal'); }

async function updateBookingStatus(bookingId, newStatus) {
    try {
        await App.apiRequest(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        // Update local data
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = newStatus;
        }
        
        App.showSuccess('Booking status updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating booking status:', error);
        App.showError('Failed to update booking status');
        
        // Revert the select value
        const select = document.querySelector(`[data-booking-id="${bookingId}"] .status-select`);
        const originalBooking = bookings.find(b => b.id === bookingId);
        if (select && originalBooking) {
            select.value = originalBooking.status;
        }
        return false;
    }
}

// Export helpers
function exportBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter') || document.getElementById('statusFilter');
    const params = new URLSearchParams();
    if (statusFilter && statusFilter.value && statusFilter.value !== 'all') params.set('status', statusFilter.value);
    const url = `/api/admin/export/bookings${params.toString() ? ('?' + params.toString()) : ''}`;
    window.open(url, '_blank');
}

// Delete a single booking (hard delete)
async function deleteBooking(bookingId) {
    if (!confirm('Delete this booking permanently? This cannot be undone.')) return;
    try {
        await App.apiRequest(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' });
        // Reload from server so counts/pagination stay accurate
        await loadBookings();
        App.showSuccess('Booking deleted');
    } catch (e) {
        console.error('Delete booking failed', e);
        App.showError('Failed to delete booking');
    }
}

// Bulk delete bookings (optionally filtered by status)
async function deleteAllBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter') || document.getElementById('statusFilter');
    const status = statusFilter ? statusFilter.value : 'all';
    const scopeText = status && status !== 'all' ? `all ${status} bookings` : 'ALL bookings';
    if (!confirm(`Are you sure you want to delete ${scopeText}? This cannot be undone.`)) return;
    try {
        const params = new URLSearchParams();
        params.set('confirm', 'true');
        if (status && status !== 'all') params.set('status', status);
        await App.apiRequest(`/api/admin/bookings?${params.toString()}`, { method: 'DELETE' });
        // Reload list from server to reflect counts accurately
        await loadBookings();
        App.showSuccess(`Deleted ${scopeText}`);
    } catch (e) {
        console.error('Bulk delete bookings failed', e);
        App.showError('Failed to bulk delete bookings');
    }
}

// Services Management
async function loadServices() {
    try {
        App.showLoading('servicesGrid');
        
        const response = await App.apiRequest('/api/admin/services');
        services = response.data.services;
        
        displayServices(services);
        
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesGrid').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load services.</p>
            </div>
        `;
    }
}

function displayServices(servicesToShow) {
    const grid = document.getElementById('servicesGrid');
    
    if (servicesToShow.length === 0) {
        grid.innerHTML = '<div class="no-data">No services found</div>';
        return;
    }
    
    grid.innerHTML = servicesToShow.map(service => `
        <div class="service-card" data-service-id="${service.id}">
            <div class="service-header">
                <h3>${service.name}</h3>
                <div class="service-status ${service.isActive ? 'active' : 'inactive'}">
                    ${service.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="service-details">
                <p class="service-description">${service.description}</p>
                <div class="service-meta">
                    <div class="meta-item">
                        <i class="fas fa-tag"></i>
                        <span>${service.category}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${App.formatDuration(service.duration)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${App.formatCurrency(service.price)}</span>
                    </div>
                </div>
            </div>
            <div class="service-actions">
                <button onclick="editService('${service.id}')" class="btn btn-sm btn-primary">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="toggleServiceStatus('${service.id}')" class="btn btn-sm ${service.isActive ? 'btn-warning' : 'btn-success'}">
                    <i class="fas fa-${service.isActive ? 'pause' : 'play'}"></i>
                    ${service.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onclick="deleteService('${service.id}')" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function showServiceModal(serviceId = null) {
    const modal = document.getElementById('serviceModal');
    const form = document.getElementById('serviceForm');
    const title = document.getElementById('serviceModalTitle');
    
    if (serviceId) {
        // Edit mode
        const service = services.find(s => s.id === serviceId);
        if (service) {
            title.textContent = 'Edit Service';
            form.serviceName.value = service.name;
            form.serviceDescription.value = service.description;
            form.serviceCategory.value = service.category;
            form.serviceDuration.value = service.duration;
            form.servicePrice.value = service.price;
            form.serviceActive.checked = service.isActive;
            form.dataset.serviceId = serviceId;
        }
    } else {
        // Create mode
        title.textContent = 'Add New Service';
        form.reset();
        delete form.dataset.serviceId;
    }
    
    App.showModal('serviceModal');
}

async function saveService() {
    const form = document.getElementById('serviceForm');
    const serviceId = form.dataset.serviceId;
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const serviceData = {
        name: form.serviceName.value,
        description: form.serviceDescription.value,
        category: form.serviceCategory.value,
        duration: parseInt(form.serviceDuration.value),
        price: parseFloat(form.servicePrice.value),
        isActive: form.serviceActive.checked
    };
    
    try {
        let response;
        if (serviceId) {
            // Update existing service
            response = await App.apiRequest(`/api/admin/services/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(serviceData)
            });
        } else {
            // Create new service
            response = await App.apiRequest('/api/admin/services', {
                method: 'POST',
                body: JSON.stringify(serviceData)
            });
        }
        
        App.showSuccess(`Service ${serviceId ? 'updated' : 'created'} successfully`);
        App.closeModal('serviceModal');
        
        // Reload services
        await loadServices();
        
    } catch (error) {
        console.error('Error saving service:', error);
        App.showError(`Failed to ${serviceId ? 'update' : 'create'} service`);
    }
}

async function toggleServiceStatus(serviceId) {
    try {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;
        
        const newStatus = !service.isActive;
        
        await App.apiRequest(`/api/admin/services/${serviceId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: newStatus })
        });
        
        // Update local data
        service.isActive = newStatus;
        
        // Refresh display
        displayServices(services);
        
        App.showSuccess(`Service ${newStatus ? 'activated' : 'deactivated'} successfully`);
        
    } catch (error) {
        console.error('Error toggling service status:', error);
        App.showError('Failed to update service status');
    }
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
        return;
    }
    
    try {
        await App.apiRequest(`/api/admin/services/${serviceId}`, {
            method: 'DELETE'
        });
        
        // Remove from local data
        services = services.filter(s => s.id !== serviceId);
        
        // Refresh display
        displayServices(services);
        
        App.showSuccess('Service deleted successfully');
        
    } catch (error) {
        console.error('Error deleting service:', error);
        App.showError('Failed to delete service');
    }
}

// Customers Management
async function loadCustomers() {
    try {
        App.showLoading('customersTable');
        
    const response = await App.apiRequest('/api/admin/customers');
    users = response.data.users || response.data.customers || [];
        
        displayCustomers(users);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customersTable').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load customers.</p>
            </div>
        `;
    }
}

function displayCustomers(customersToShow) {
    const table = document.getElementById('customersTable');
    
    if (customersToShow.length === 0) {
        table.innerHTML = '<div class="no-data">No customers found</div>';
        return;
    }
    
    table.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Bookings</th>
                    <th>Total Spent</th>
                    <th>Last Visit</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customersToShow.map(customer => `
                    <tr>
                        <td>${customer.name}</td>
                        <td>${customer.email}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>${customer.totalBookings || 0}</td>
                        <td>${App.formatCurrency(customer.totalSpent || 0)}</td>
                        <td>${customer.lastVisit ? App.formatDate(customer.lastVisit) : 'Never'}</td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="viewCustomer('${customer.id}')" class="btn btn-sm btn-outline" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="viewCustomerBookings('${customer.id}')" class="btn btn-sm btn-outline" title="Bookings">
                                    <i class="fas fa-calendar"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Analytics
async function loadAnalytics() {
    try {
        App.showLoading('analyticsCharts');
        
        const response = await App.apiRequest('/api/admin/analytics');
        analytics = response.data;
        
        renderAnalyticsCharts(analytics);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('analyticsCharts').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load analytics data.</p>
            </div>
        `;
    }
}

function renderAnalyticsCharts(data) {
    // Revenue chart
    renderRevenueChart(data.revenue);
    
    // Bookings chart
    renderBookingsChart(data.bookings);
    
    // Popular services
    renderPopularServices(data.popularServices);
    
    // Customer analytics
    renderCustomerAnalytics(data.customers);
}

function renderRevenueChart(revenueData) {
    // Simple revenue display (in a real app, you'd use Chart.js or similar)
    const container = document.getElementById('revenueChart') || document.getElementById('categoryRevenueChart');
    if (!container) return;
    
    container.innerHTML = `
        <div class="chart-header">
            <h3>Revenue Overview</h3>
        </div>
        <div class="revenue-stats">
            <div class="stat-item">
                <h4>This Month</h4>
                <span class="amount">${App.formatCurrency(revenueData.thisMonth || 0)}</span>
            </div>
            <div class="stat-item">
                <h4>Last Month</h4>
                <span class="amount">${App.formatCurrency(revenueData.lastMonth || 0)}</span>
            </div>
            <div class="stat-item">
                <h4>Total</h4>
                <span class="amount">${App.formatCurrency(revenueData.total || 0)}</span>
            </div>
        </div>
    `;
}

function renderBookingsChart(bookingsData) {
    const container = document.getElementById('bookingsChart') || document.getElementById('hourlyTrendsChart');
    if (!container) return;
    
    container.innerHTML = `
        <div class="chart-header">
            <h3>Bookings Overview</h3>
        </div>
        <div class="bookings-stats">
            <div class="stat-item">
                <h4>Today</h4>
                <span class="count">${bookingsData.today || 0}</span>
            </div>
            <div class="stat-item">
                <h4>This Week</h4>
                <span class="count">${bookingsData.thisWeek || 0}</span>
            </div>
            <div class="stat-item">
                <h4>This Month</h4>
                <span class="count">${bookingsData.thisMonth || 0}</span>
            </div>
        </div>
    `;
}

function renderPopularServices(servicesData) {
    const container = document.getElementById('popularServices');
    if (!container) return;
    
    if (!servicesData || servicesData.length === 0) {
        container.innerHTML = '<div class="no-data">No service data available</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="chart-header">
            <h3>Popular Services</h3>
        </div>
        <div class="services-list">
            ${servicesData.map((service, index) => `
                <div class="service-rank">
                    <span class="rank">#${index + 1}</span>
                    <div class="service-info">
                        <strong>${service.name}</strong>
                        <small>${service.bookingCount} bookings</small>
                    </div>
                    <span class="revenue">${App.formatCurrency(service.revenue)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Real-time updates
function initializeRealTimeUpdates() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('booking-created', (data) => {
            if (currentView === 'dashboard') {
                loadDashboardData();
            } else if (currentView === 'bookings') {
                loadBookings();
            }
        });
        
        socket.on('booking-updated', (data) => {
            if (currentView === 'bookings') {
                loadBookings();
            }
        });
        
        socket.on('service-updated', (data) => {
            if (currentView === 'services') {
                loadServices();
            }
        });

        socket.on('booking-deleted', (data) => {
            if (currentView === 'bookings') {
                loadBookings();
            }
        });
    }
}

// Utility functions
function viewBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Show booking details modal
    const modal = document.getElementById('bookingDetailsModal');
    const content = modal.querySelector('.modal-content');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>Booking Details</h2>
            <button onclick="App.closeModal('bookingDetailsModal')">&times;</button>
        </div>
        <div class="modal-body">
            <div class="booking-details">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${booking.customerInfo.name}</p>
                <p><strong>Email:</strong> ${booking.customerInfo.email}</p>
                <p><strong>Phone:</strong> ${booking.customerInfo.phone}</p>
                ${booking.customerInfo.notes ? `<p><strong>Notes:</strong> ${booking.customerInfo.notes}</p>` : ''}
                
                <h3>Service Information</h3>
                <p><strong>Service:</strong> ${booking.service.name}</p>
                <p><strong>Date:</strong> ${App.formatDate(booking.startTime)}</p>
                <p><strong>Time:</strong> ${App.formatTime(booking.startTime)} - ${App.formatTime(booking.endTime)}</p>
                <p><strong>Duration:</strong> ${App.formatDuration(booking.service.duration)}</p>
                <p><strong>Status:</strong> <span class="status-badge ${booking.status}">${booking.status}</span></p>
                
                <h3>Pricing</h3>
                <p><strong>Base Price:</strong> ${App.formatCurrency(booking.pricing.basePrice)}</p>
                <p><strong>Final Price:</strong> ${App.formatCurrency(booking.pricing.finalPrice)}</p>
            </div>
        </div>
    `;
    
    App.showModal('bookingDetailsModal');
}

function editBooking(bookingId) {
    // In a real application, you would show an edit form
    console.log('Edit booking:', bookingId);
    App.showNotification('Booking edit functionality would be implemented here');
}

function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    updateBookingStatus(bookingId, 'cancelled');
}

function editService(serviceId) {
    showServiceModal(serviceId);
}

function viewCustomer(customerId) {
    console.log('View customer:', customerId);
    App.showNotification('Customer details view would be implemented here');
}

function viewCustomerBookings(customerId) {
    console.log('View customer bookings:', customerId);
    App.showNotification('Customer bookings view would be implemented here');
}