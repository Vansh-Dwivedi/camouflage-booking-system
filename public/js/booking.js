// Booking system functionality
let bookingData = {
    step: 1,
    service: null,
    selectedDate: null,
    selectedTime: null,
    customerInfo: {}
};

let services = [];
let availableSlots = [];
let currentMonth = new Date();

// Log booking system info
console.log('💄 Booking System: Camouflage Beauty Studio');
console.log('💾 Database: JSON File Storage');
console.log('⚡ Features: Real-time availability, Multi-step booking wizard');

document.addEventListener('DOMContentLoaded', () => {
    initializeBooking();
});

async function initializeBooking() {
    try {
        // Load services
        await loadServices();
        
        // Initialize service filters
        initializeServiceFilters();
        
        // Check for pre-selected service from URL
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('service');
        if (serviceId) {
            selectService(serviceId);
        }
        
        // Initialize step navigation
        initializeStepNavigation();
        
        // Initialize calendar
        initializeCalendar();
        
        // Initialize form
        initializeCustomerForm();
        
    } catch (error) {
        console.error('Error initializing booking:', error);
        App.showError('Failed to load booking system. Please refresh the page.');
    }
}

// Load services from API
async function loadServices() {
    try {
        App.showLoading('servicesList');
        
        const response = await App.apiRequest('/api/services');
        services = response.data.services;
        
        // Load categories for filter
        await loadServiceCategories();
        
        // Display services
        displayServices(services);
        
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load services. Please try again later.</p>
            </div>
        `;
    }
}

async function loadServiceCategories() {
    try {
        const response = await App.apiRequest('/api/services/meta/categories');
        const categories = response.data.categories;
        
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.value;
            option.textContent = category.label;
            categoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayServices(servicesToShow) {
    const servicesList = document.getElementById('servicesList');
    
    if (servicesToShow.length === 0) {
        servicesList.innerHTML = `
            <div class="no-services">
                <i class="fas fa-search"></i>
                <p>No services found matching your criteria.</p>
            </div>
        `;
        return;
    }
    
    servicesList.innerHTML = servicesToShow.map(service => `
        <div class="service-option" data-service-id="${service.id}" onclick="selectService('${service.id}')">
            <h3>${service.name}</h3>
            <div class="service-category">${service.category}</div>
            <p class="service-description">${service.description}</p>
            <div class="service-meta">
                <div class="service-duration">
                    <i class="fas fa-clock"></i>
                    <span>${App.formatDuration(service.duration)}</span>
                </div>
                <div class="service-price">${App.formatCurrency(service.price)}</div>
            </div>
        </div>
    `).join('');
}

function initializeServiceFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchService');
    
    categoryFilter.addEventListener('change', filterServices);
    searchInput.addEventListener('input', App.debounce(filterServices, 300));
}

function filterServices() {
    const category = document.getElementById('categoryFilter').value;
    const search = document.getElementById('searchService').value.toLowerCase();
    
    let filteredServices = services;
    
    // Filter by category
    if (category !== 'all') {
        filteredServices = filteredServices.filter(service => service.category === category);
    }
    
    // Filter by search term
    if (search) {
        filteredServices = filteredServices.filter(service => 
            service.name.toLowerCase().includes(search) ||
            service.description.toLowerCase().includes(search) ||
            service.tags.some(tag => tag.toLowerCase().includes(search))
        );
    }
    
    displayServices(filteredServices);
}

function selectService(serviceId) {
    // Convert to number if it's a string
    const id = typeof serviceId === 'string' ? parseInt(serviceId) : serviceId;
    
    console.log('Selecting service:', id, 'Available services:', services);
    
    // Clear previous selection
    document.querySelectorAll('.service-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Select new service
    const selectedOption = document.querySelector(`[data-service-id="${id}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Store selected service
    bookingData.service = services.find(s => s.id === id);
    
    console.log('Selected service:', bookingData.service);
    
    // Enable next button
    const nextBtn = document.getElementById('step1Next');
    nextBtn.disabled = false;
    
    // Show selected service info in step 2
    updateSelectedServiceInfo();
    
    // Join socket room for real-time updates
    joinBookingRoom(serviceId);
}

function updateSelectedServiceInfo() {
    const serviceInfo = document.getElementById('selectedServiceInfo');
    if (!bookingData.service || !serviceInfo) return;
    
    const service = bookingData.service;
    serviceInfo.innerHTML = `
        <h3>${service.name}</h3>
        <div class="service-details">
            <div class="service-detail">
                <i class="fas fa-clock"></i>
                <span>Duration: ${App.formatDuration(service.duration)}</span>
            </div>
            <div class="service-detail">
                <i class="fas fa-dollar-sign"></i>
                <span>Price: ${App.formatCurrency(service.price)}</span>
            </div>
            <div class="service-detail">
                <i class="fas fa-tag"></i>
                <span>Category: ${service.category}</span>
            </div>
        </div>
        <p>${service.description}</p>
    `;
}

// Step navigation
function initializeStepNavigation() {
    document.getElementById('step1Next').addEventListener('click', () => {
        if (bookingData.service) {
            goToStep(2);
        }
    });
    
    document.getElementById('step2Next').addEventListener('click', () => {
        if (bookingData.selectedDate && bookingData.selectedTime) {
            goToStep(3);
        }
    });
    
    document.getElementById('step3Next').addEventListener('click', handleBookingSubmission);
}

function goToStep(stepNumber) {
    // Hide current step
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step${stepNumber}`).classList.add('active');
    
    // Update progress bar
    updateProgressBar(stepNumber);
    
    // Update booking data
    bookingData.step = stepNumber;
    
    // Step-specific actions
    if (stepNumber === 2) {
        generateCalendar();
    } else if (stepNumber === 3) {
        updateBookingSummary();
        prefillCustomerInfo();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function previousStep() {
    if (bookingData.step > 1) {
        goToStep(bookingData.step - 1);
    }
}

function updateProgressBar(currentStep) {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Calendar functionality
function initializeCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        generateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        generateCalendar();
    });
}

function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    
    // Update month header
    currentMonthElement.textContent = currentMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
    
    // Clear calendar
    calendarGrid.innerHTML = '';
    
    // Add weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day calendar-weekday';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day disabled';
        calendarGrid.appendChild(dayElement);
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        dayDate.setHours(0, 0, 0, 0);
        
        // Disable past dates
        const isPast = dayDate < today;
        console.log(`Day ${day}: ${dayDate.toDateString()} - isPast: ${isPast}, today: ${today.toDateString()}`);
        
        if (isPast) {
            dayElement.classList.add('disabled');
            // Make sure past dates can't be clicked
            dayElement.style.pointerEvents = 'none';
        } else {
            dayElement.addEventListener('click', () => {
                console.log('Date clicked:', dayDate.toDateString());
                selectDate(dayDate);
            });
            
            // Mark today
            if (dayDate.toDateString() === new Date().toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Mark selected date
            if (bookingData.selectedDate && dayDate.toDateString() === bookingData.selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

async function selectDate(date) {
    // Clear previous selection
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Select new date
    event.target.classList.add('selected');
    bookingData.selectedDate = date;
    
    // Load available time slots
    await loadTimeSlots(date);
}

async function loadTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    
    try {
        timeSlotsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading available times...</p>
            </div>
        `;
        
        const dateString = date.toISOString().split('T')[0];
        const response = await App.apiRequest(`/api/services/${bookingData.service.id}/availability/${dateString}`);
        
        availableSlots = response.data.availableSlots;
        
        if (availableSlots.length === 0) {
            timeSlotsContainer.innerHTML = `
                <div class="no-slots-available">
                    <i class="fas fa-calendar-times"></i>
                    <p>No available time slots for this date. Please select another date.</p>
                </div>
            `;
            return;
        }
        
        // Display time slots
        timeSlotsContainer.innerHTML = availableSlots.map(slot => `
            <div class="time-slot" data-time="${slot.start}" onclick="selectTimeSlot('${slot.start}', '${slot.end}')">
                ${formatTimeSlot(slot.start, slot.end)}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        timeSlotsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load available times. Please try again.</p>
            </div>
        `;
    }
}

function formatTimeSlot(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    return `${start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    })}`;
}

function selectTimeSlot(startTime, endTime) {
    // Clear previous selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Select new time slot
    event.target.classList.add('selected');
    
    bookingData.selectedTime = { start: startTime, end: endTime };
    
    // Enable next button
    document.getElementById('step2Next').disabled = false;
}

// Customer form
function initializeCustomerForm() {
    const form = document.getElementById('customerForm');
    form.addEventListener('submit', (e) => e.preventDefault());
    
    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateCustomerField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                input.classList.remove('error');
            }
        });
    });
}

function prefillCustomerInfo() {
    if (currentUser) {
        document.getElementById('customerName').value = currentUser.name || '';
        document.getElementById('customerEmail').value = currentUser.email || '';
        document.getElementById('customerPhone').value = currentUser.phone || '';
    }
}

function updateBookingSummary() {
    if (!bookingData.service || !bookingData.selectedDate || !bookingData.selectedTime) return;
    
    document.getElementById('summaryService').textContent = bookingData.service.name;
    document.getElementById('summaryDate').textContent = App.formatDate(bookingData.selectedDate);
    document.getElementById('summaryTime').textContent = formatTimeSlot(bookingData.selectedTime.start, bookingData.selectedTime.end);
    document.getElementById('summaryDuration').textContent = App.formatDuration(bookingData.service.duration);
    document.getElementById('summaryPrice').textContent = App.formatCurrency(bookingData.service.price);
}

function validateCustomerField(input) {
    const value = input.value.trim();
    let isValid = true;
    let message = '';
    
    switch (input.name) {
        case 'name':
            if (!value) {
                isValid = false;
                message = 'Name is required.';
            } else if (value.length < 2) {
                isValid = false;
                message = 'Name must be at least 2 characters long.';
            }
            break;
            
        case 'email':
            if (!value) {
                isValid = false;
                message = 'Email is required.';
            } else if (!App.validateEmail(value)) {
                isValid = false;
                message = 'Please enter a valid email address.';
            }
            break;
            
        case 'phone':
            if (!value) {
                isValid = false;
                message = 'Phone number is required.';
            } else if (!App.validatePhone(value)) {
                isValid = false;
                message = 'Please enter a valid phone number.';
            }
            break;
    }
    
    // Update field state
    const errorElement = input.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
    
    if (isValid) {
        input.classList.remove('error');
        input.classList.add('success');
    } else {
        input.classList.remove('success');
        input.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }
    
    return isValid;
}

// Booking submission
async function handleBookingSubmission() {
    const form = document.getElementById('customerForm');
    const formData = App.serializeForm(form);
    
    // Validate form
    let isValid = true;
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        if (!validateCustomerField(input)) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        App.showError('Please correct the errors in the form.');
        return;
    }
    
    try {
        // Show loading
        App.showModal('loadingModal');
        
        // Prepare booking data
        const bookingRequest = {
            serviceId: bookingData.service.id,
            startTime: new Date(`${bookingData.selectedDate.toDateString()} ${bookingData.selectedTime.start}`).toISOString(),
            customerInfo: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                notes: formData.notes || ''
            }
        };
        
        // Submit booking
        const response = await App.apiRequest('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingRequest)
        });
        
        // Hide loading
        App.closeModal('loadingModal');
        
        // Show confirmation
        showBookingConfirmation(response.data.booking);
        goToStep(4);
        
    } catch (error) {
        console.error('Booking submission error:', error);
        App.closeModal('loadingModal');
        
        if (error.message.includes('no longer available')) {
            App.showError('Sorry, this time slot is no longer available. Please select another time.');
            goToStep(2);
        } else {
            App.showError(error.message || 'Failed to create booking. Please try again.');
        }
    }
}

function showBookingConfirmation(booking) {
    const confirmationDetails = document.getElementById('confirmationDetails');
    
    confirmationDetails.innerHTML = `
        <h3>Booking Details</h3>
        <div class="confirmation-item">
            <span>Booking ID:</span>
            <span><strong>${booking.id}</strong></span>
        </div>
        <div class="confirmation-item">
            <span>Service:</span>
            <span>${booking.service.name}</span>
        </div>
        <div class="confirmation-item">
            <span>Date:</span>
            <span>${App.formatDate(booking.startTime)}</span>
        </div>
        <div class="confirmation-item">
            <span>Time:</span>
            <span>${App.formatTime(booking.startTime)} - ${App.formatTime(booking.endTime)}</span>
        </div>
        <div class="confirmation-item">
            <span>Duration:</span>
            <span>${App.formatDuration(booking.service.duration)}</span>
        </div>
        <div class="confirmation-item">
            <span>Price:</span>
            <span><strong>${App.formatCurrency(booking.pricing.finalPrice)}</strong></span>
        </div>
        <div class="confirmation-item">
            <span>Status:</span>
            <span class="status-badge ${booking.status}">${booking.status}</span>
        </div>
        
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e9ecef;">
            <p><strong>What's Next?</strong></p>
            <ul style="text-align: left; margin: 1rem 0;">
                <li>You'll receive a confirmation email shortly</li>
                <li>We'll send you a reminder 24 hours before your appointment</li>
                <li>Please arrive 10 minutes early</li>
                <li>If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
            </ul>
        </div>
    `;
}

// Socket.IO real-time updates
if (typeof io !== 'undefined' && !window.location.hostname.includes('vercel.app')) {
    socket = io();
    
    socket.on('booking-created', (data) => {
        if (bookingData.service && data.serviceId === bookingData.service.id) {
            // Refresh time slots if user is viewing the same service
            if (bookingData.selectedDate) {
                loadTimeSlots(bookingData.selectedDate);
            }
        }
    });
    
    socket.on('booking-cancelled', (data) => {
        if (bookingData.service && data.serviceId === bookingData.service.id) {
            // Refresh time slots
            if (bookingData.selectedDate) {
                loadTimeSlots(bookingData.selectedDate);
            }
        }
    });
}

// Join booking room for real-time updates
function joinBookingRoom(serviceId) {
    if (socket) {
        socket.emit('join-booking-room', { serviceId });
    }
}

