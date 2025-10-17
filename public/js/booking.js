// Booking System - Main Logic
let selectedServices = []; // Array to store multiple selected services
let selectedDate = null;   // Selected booking date
let selectedTime = null;   // Selected booking time
let allServices = [];       // KEEP ORIGINAL SERVICES LIST!
let services = [];         // Filtered/displayed services
let currentStep = 1;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadServices();
    setupCalendar();
    setupEventListeners();
});

// ===========================
// STEP 1: SERVICE SELECTION
// ===========================

async function loadServices() {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Failed to fetch services');
        
        const data = await response.json();
        allServices = data.data?.services || data.services || [];
        services = [...allServices];  // Copy for filtering
        
        renderServices();
        populateCategories();
    } catch (error) {
        console.error('Error loading services:', error);
        showError('Failed to load services. Please refresh the page.');
    }
}

function renderServices() {
    const container = document.getElementById('servicesList');
    if (!container) return;
    
    if (services.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No services available. Please check back later.</div>';
        return;
    }
    
    container.innerHTML = services.map(service => {
        const isSelected = selectedServices.some(s => s.id === service.id);
        return `
            <div class="service-card ${isSelected ? 'selected' : ''}" 
                 onclick="toggleService(${service.id})">
                <div class="service-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
                </div>
                <div class="service-name">${service.name}</div>
                <div class="service-description">${service.description || 'Professional service'}</div>
                <div class="service-details">
                    <span class="service-duration">⏱ ${service.duration || 30} min</span>
                    <span class="service-price">$${parseFloat(service.price || 0).toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function toggleService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        console.error('❌ Service not found:', serviceId);
        return;
    }
    
    const index = selectedServices.findIndex(s => s.id === serviceId);
    
    if (index > -1) {
        // Remove service
        selectedServices.splice(index, 1);
        console.log('➖ Removed service:', service.name);
    } else {
        // Add service
        selectedServices.push({
            id: service.id,
            name: service.name,
            price: parseFloat(service.price || 0),
            duration: service.duration || 30
        });
        console.log('➕ Added service:', service.name);
    }
    
    console.log('📊 Total selected services:', selectedServices.length);
    
    renderServices();
    updateSelectedServicesInfo();
    
    // Enable continue button only if at least one service is selected
    const continueBtn = document.getElementById('step1Next');
    if (continueBtn) {
        continueBtn.disabled = selectedServices.length === 0;
        console.log('🔘 Continue button disabled:', continueBtn.disabled);
    }
}

function updateSelectedServicesInfo() {
    const container = document.getElementById('selectedServiceInfo');
    if (!container) return;
    
    if (selectedServices.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center;">Select services above to continue</p>';
        return;
    }
    
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    
    container.innerHTML = `
        <div class="services-summary">
            <div class="summary-header">✨ Your Selection</div>
            ${selectedServices.map(s => `
                <div class="summary-service">
                    <span class="summary-service-name">${s.name}</span>
                    <span class="summary-service-price">$${s.price.toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="summary-totals">
                <div class="summary-total-item">
                    <span>Total Duration:</span>
                    <strong>${totalDuration} minutes</strong>
                </div>
                <div class="summary-total-item">
                    <span>Total Price:</span>
                    <strong>$${totalPrice.toFixed(2)}</strong>
                </div>
            </div>
        </div>
    `;
}

function populateCategories() {
    const select = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchService');
    
    if (!select) return;
    
    // Get unique categories from ALL services (not filtered)
    const categories = [...new Set(allServices.map(s => s.category).filter(Boolean))];
    
    // Clear existing options except "All Categories"
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add categories
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        select.appendChild(option);
    });
    
    // Add event listeners (only once)
    select.removeEventListener('change', filterServices);
    select.addEventListener('change', filterServices);
    
    if (searchInput) {
        searchInput.removeEventListener('input', filterServices);
        searchInput.addEventListener('input', filterServices);
    }
}

function filterServices() {
    const category = document.getElementById('categoryFilter')?.value;
    const search = document.getElementById('searchService')?.value.toLowerCase();
    
    // START FROM ALL SERVICES, NOT FILTERED ONES!
    let filtered = [...allServices];
    
    if (category && category !== 'all') {
        filtered = filtered.filter(s => s.category === category);
    }
    
    if (search) {
        filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(search) || 
            s.description?.toLowerCase().includes(search)
        );
    }
    
    // Update the display services
    services = filtered.length > 0 ? filtered : allServices;
    renderServices();
}

// ===========================
// STEP 2: DATE & TIME
// ===========================

function setupCalendar() {
    renderCalendar();
    
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        renderCalendar();
    });
}

let currentMonth = new Date();

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Update month display
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) {
        monthDisplay.textContent = currentMonth.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    // Get first day and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Build grid
    let html = '';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
    }
    
    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        const isSelected = selectedDate && date.getTime() === new Date(selectedDate).getTime();
        
        let classes = 'calendar-day';
        if (isPast) classes += ' disabled';
        if (isSelected) classes += ' selected';
        
        html += `
            <div class="${classes}" 
                 onclick="${!isPast ? `selectDate('${date.toISOString().split('T')[0]}')` : ''}">
                ${day}
            </div>
        `;
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = html;
}

function selectDate(date) {
    selectedDate = date;
    selectedTime = null;
    
    renderCalendar();
    loadTimeSlots(date);
}

async function loadTimeSlots(date) {
    if (selectedServices.length === 0) return;
    
    try {
        // Get available slots for the longest service (most restrictive)
        const longestService = selectedServices.reduce((max, s) => 
            s.duration > max.duration ? s : max
        );
        
        const response = await fetch(`/api/services/${longestService.id}/availability/${date}`);
        if (!response.ok) throw new Error('Failed to load time slots');
        
        const data = await response.json();
        const slots = data.data?.slots || generateDefaultSlots();
        
        renderTimeSlots(slots);
    } catch (error) {
        console.error('Error loading time slots:', error);
        renderTimeSlots(generateDefaultSlots());
    }
}

function generateDefaultSlots() {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
        for (let min = 0; min < 60; min += 30) {
            const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            slots.push({ time, available: true });
        }
    }
    return slots;
}

function renderTimeSlots(slots) {
    const container = document.getElementById('timeSlots');
    if (!container) return;
    
    if (slots.length === 0) {
        container.innerHTML = '<p class="no-date-selected">No time slots available for this date</p>';
        return;
    }
    
    container.innerHTML = slots.map(slot => `
        <div class="time-slot ${!slot.available ? 'unavailable' : ''} ${selectedTime === slot.time ? 'selected' : ''}"
             onclick="${slot.available ? `selectTime('${slot.time}')` : ''}">
            ${slot.time}
        </div>
    `).join('');
}

function selectTime(time) {
    selectedTime = time;
    renderTimeSlots(generateDefaultSlots());
    
    // Enable continue button
    document.getElementById('step2Next').disabled = false;
}

// ===========================
// STEP 3: CUSTOMER DETAILS
// ===========================

function setupEventListeners() {
    // Step navigation
    document.getElementById('step1Next')?.addEventListener('click', () => goToStep(2));
    document.getElementById('step2Next')?.addEventListener('click', () => goToStep(3));
    document.getElementById('step3Next')?.addEventListener('click', submitBooking);
    
    // Form validation
    const form = document.getElementById('customerForm');
    if (form) {
        form.addEventListener('change', validateForm);
    }
}

function validateForm() {
    const name = document.getElementById('customerName')?.value.trim();
    const email = document.getElementById('customerEmail')?.value.trim();
    const phone = document.getElementById('customerPhone')?.value.trim();
    
    const isValid = name && email && phone;
    document.getElementById('step3Next').disabled = !isValid;
}

// ===========================
// STEP 4: CONFIRMATION
// ===========================

async function submitBooking() {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) {
        showError('Please select services, date, and time');
        return;
    }
    
    const name = document.getElementById('customerName')?.value;
    const email = document.getElementById('customerEmail')?.value;
    const phone = document.getElementById('customerPhone')?.value;
    const countryCode = document.getElementById('customerCountryCode')?.value || '+1';
    const notes = document.getElementById('specialRequests')?.value;
    
    if (!name || !email || !phone) {
        showError('Please fill in all required fields');
        return;
    }
    
    showLoading(true);
    
    try {
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
        
        const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
        const endTime = new Date(startTime.getTime() + totalDuration * 60000);
        
        // For multi-service bookings, we create one booking with multiple services
        // In a real system, you might want to create separate bookings or a composite booking
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceId: selectedServices[0].id, // Primary service
                services: selectedServices.map(s => ({ id: s.id, name: s.name, price: s.price })), // All services
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalDuration: totalDuration,
                totalPrice: totalPrice,
                status: 'confirmed',
                customerInfo: {
                    name: name,
                    email: email,
                    phone: countryCode + phone,
                    notes: notes
                }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Booking failed');
        }
        
        showLoading(false);
        displayConfirmation(data.data.booking);
        goToStep(4);
        
    } catch (error) {
        showLoading(false);
        console.error('Booking error:', error);
        showError(error.message || 'Failed to create booking');
    }
}

function displayConfirmation(booking) {
    const container = document.getElementById('confirmationDetails');
    if (!container) return;
    
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    
    let servicesHtml = selectedServices.map(s => `
        <div class="summary-service-item">
            <span>• ${s.name}</span>
            <span>$${s.price.toFixed(2)}</span>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="summary-item">
            <strong>Services:</strong>
        </div>
        ${servicesHtml}
        <div class="summary-item" style="margin-top: 12px;">
            <strong>Date:</strong>
            <span>${startTime.toLocaleDateString()}</span>
        </div>
        <div class="summary-item">
            <strong>Time:</strong>
            <span>${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="summary-item">
            <strong>Duration:</strong>
            <span>${totalDuration} minutes</span>
        </div>
        <div class="summary-item">
            <strong>Name:</strong>
            <span>${booking.customerName}</span>
        </div>
        <div class="summary-item">
            <strong>Email:</strong>
            <span>${booking.customerEmail}</span>
        </div>
        <div class="summary-item">
            <strong>Phone:</strong>
            <span>${booking.customerPhone}</span>
        </div>
        <div class="summary-total">
            <span>💰 Total Price:</span>
            <span class="price">$${totalPrice.toFixed(2)}</span>
        </div>
    `;
}

// ===========================
// STEP NAVIGATION
// ===========================

function goToStep(step) {
    console.log('🚀 Going to step:', step);  // DEBUG
    console.log('Selected services:', selectedServices);  // DEBUG
    
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) {
        targetStep.classList.add('active');
        console.log('✅ Step ' + step + ' activated');  // DEBUG
    } else {
        console.error('❌ Step element not found: step' + step);  // DEBUG
    }
    
    // Update progress bar
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 < step) {
            el.classList.add('completed');
        } else if (idx + 1 === step) {
            el.classList.add('active');
        }
    });
    
    // Update info for step 2
    if (step === 2 && selectedServices.length > 0) {
        updateSelectedServicesInfo();
    }
    
    currentStep = step;
}

function previousStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// ===========================
// UTILITIES
// ===========================

function showError(message) {
    const modal = document.getElementById('errorModal');
    const msgEl = document.getElementById('errorMessage');
    
    if (msgEl) msgEl.textContent = message;
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function showLoading(show) {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

// Close modals on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('errorModal').style.display = 'none';
        document.getElementById('loadingModal').style.display = 'none';
    }
});
