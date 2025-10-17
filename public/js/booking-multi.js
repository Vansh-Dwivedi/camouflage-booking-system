// Multi-Service Booking System
let selectedServices = []; // Array to store selected services
let services = []; // All available services

document.addEventListener('DOMContentLoaded', function() {
    loadServices();
    setupServiceSelection();
    setupEventListeners();
});

async function loadServices() {
    try {
        const response = await fetch('/api/services');
        const data = await response.json();
        services = Array.isArray(data) ? data : (data.data?.services || data.services || []);
        
        renderServices();
        populateCategories();
    } catch (error) {
        console.error('Error loading services:', error);
        showError('Failed to load services');
    }
}

function renderServices() {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    
    if (services.length === 0) {
        container.innerHTML = '<div class="no-services">No services available</div>';
        return;
    }
    
    container.innerHTML = services.map(service => {
        const priceInfo = calculateDiscountedPrice(service);
        const showDiscount = service.hasDiscount && priceInfo.isActive;
        const isSelected = selectedServices.some(s => s.id === service.id);
        
        return `
            <div class="service-card ${isSelected ? 'selected' : ''}" onclick="toggleService(${service.id})">
                <!-- Service Image -->
                <div class="service-image-wrapper">
                    ${service.imageUrl ? `
                        <img src="${service.imageUrl}" alt="${service.name}" class="service-image">
                    ` : `
                        <div class="service-image-placeholder">
                            <i class="fas fa-image"></i>
                        </div>
                    `}
                    ${showDiscount ? `
                        <div class="discount-badge">${priceInfo.discountType === 'percentage' ? priceInfo.discount + '%' : '$' + priceInfo.discount} OFF</div>
                    ` : ''}
                    ${isSelected ? `<div class="selected-badge"><i class="fas fa-check"></i></div>` : ''}
                </div>
                
                <!-- Service Details -->
                <div class="service-details">
                    <h3>${service.name}</h3>
                    <p class="category">${service.category}</p>
                    <p class="description">${service.description}</p>
                    
                    <div class="service-meta">
                        <span class="duration"><i class="fas fa-clock"></i> ${service.duration} min</span>
                        <span class="price">
                            ${showDiscount ? `
                                <span class="original">$${parseFloat(service.price).toFixed(2)}</span>
                                <span class="discounted">$${priceInfo.discountedPrice.toFixed(2)}</span>
                            ` : `
                                $${parseFloat(service.price).toFixed(2)}
                            `}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const index = selectedServices.findIndex(s => s.id === serviceId);
    
    if (index > -1) {
        // Remove service
        selectedServices.splice(index, 1);
    } else {
        // Add service
        selectedServices.push({
            id: service.id,
            name: service.name,
            price: parseFloat(service.price),
            duration: service.duration,
            hasDiscount: service.hasDiscount,
            discountType: service.discountType,
            discountValue: service.discountValue
        });
    }
    
    updateCartSummary();
    renderServices();
}

function updateCartSummary() {
    const summaryDiv = document.getElementById('cartSummary');
    if (!summaryDiv) return;
    
    if (selectedServices.length === 0) {
        summaryDiv.innerHTML = '<p>No services selected</p>';
        return;
    }
    
    // Calculate totals
    let totalPrice = 0;
    let totalDuration = 0;
    
    selectedServices.forEach(service => {
        const priceInfo = calculateDiscountedPriceForService(service);
        totalPrice += priceInfo.discountedPrice;
        totalDuration += service.duration;
    });
    
    summaryDiv.innerHTML = `
        <div class="cart-items">
            ${selectedServices.map((service, index) => `
                <div class="cart-item">
                    <span>${service.name}</span>
                    <span>$${service.price.toFixed(2)}</span>
                    <button onclick="removeService(${index})" class="remove-btn"><i class="fas fa-times"></i></button>
                </div>
            `).join('')}
        </div>
        <div class="cart-totals">
            <div class="total-duration">
                <strong>Total Duration:</strong>
                <span>${totalDuration} minutes</span>
            </div>
            <div class="total-price">
                <strong>Total Price:</strong>
                <span>$${totalPrice.toFixed(2)}</span>
            </div>
        </div>
    `;
}

function removeService(index) {
    selectedServices.splice(index, 1);
    updateCartSummary();
    renderServices();
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

function calculateDiscountedPriceForService(service) {
    if (!service.hasDiscount) {
        return {
            originalPrice: service.price,
            discountedPrice: service.price,
            discount: 0
        };
    }
    
    let discountedPrice = service.price;
    if (service.discountType === 'percentage') {
        discountedPrice = service.price - (service.price * service.discountValue / 100);
    } else if (service.discountType === 'fixed') {
        discountedPrice = Math.max(0, service.price - service.discountValue);
    }
    
    return {
        originalPrice: service.price,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discount: service.discountValue
    };
}

function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    const categories = [...new Set(services.map(s => s.category))].sort();
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });
}

function setupServiceSelection() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchService');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterServices);
    }
    if (searchInput) {
        searchInput.addEventListener('input', filterServices);
    }
}

function filterServices() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchService');
    
    const category = categoryFilter ? categoryFilter.value : 'all';
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filtered = services.filter(service => {
        const categoryMatch = category === 'all' || service.category === category;
        const searchMatch = service.name.toLowerCase().includes(search) || 
                          service.description.toLowerCase().includes(search);
        return categoryMatch && searchMatch;
    });
    
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-services">No services found</div>';
        return;
    }
    
    // Temporarily replace services for rendering
    const temp = services;
    services = filtered;
    renderServices();
    services = temp; // Restore
}

function setupEventListeners() {
    // Step 1 Next button
    const step1Next = document.getElementById('step1Next');
    if (step1Next) {
        step1Next.addEventListener('click', function() {
            if (selectedServices.length === 0) {
                showError('Please select at least one service');
                return;
            }
            goToStep(2);
            loadDateTimePicker();
        });
    }
    
    // Step 2 handlers
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.addEventListener('change', loadTimeSlots);
    }
    
    const step2Next = document.getElementById('step2Next');
    if (step2Next) {
        step2Next.addEventListener('click', function() {
            const selectedDate = document.getElementById('bookingDate').value;
            const selectedTime = document.querySelector('input[name="timeSlot"]:checked');
            
            if (!selectedDate) {
                showError('Please select a date');
                return;
            }
            if (!selectedTime) {
                showError('Please select a time slot');
                return;
            }
            
            goToStep(3);
        });
    }
    
    // Step 3 handlers
    const step3Next = document.getElementById('step3Next');
    if (step3Next) {
        step3Next.addEventListener('click', function() {
            const name = document.getElementById('customerName').value.trim();
            const email = document.getElementById('customerEmail').value.trim();
            const phone = document.getElementById('customerPhone').value.trim();
            
            if (!name) {
                showError('Please enter your name');
                return;
            }
            if (!email || !isValidEmail(email)) {
                showError('Please enter a valid email');
                return;
            }
            if (!phone) {
                showError('Please enter your phone number');
                return;
            }
            
            goToStep(4);
            displayConfirmation();
        });
    }
}

function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show selected step
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
        step.classList.add('active');
    }
    
    // Update progress bar
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active');
    });
    document.querySelector(`[data-step="${stepNumber}"]`)?.classList.add('active');
}

function showError(message) {
    // Create a simple alert or toast
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 15px 20px; border-radius: 8px; z-index: 9999;';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ===== DATE & TIME PICKER FUNCTIONS =====

function loadDateTimePicker() {
    const dateInput = document.getElementById('bookingDate');
    if (!dateInput) return;
    
    // Set minimum date to today
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 1); // Next day
    
    // Set maximum date (30 days ahead)
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    
    // Format dates
    const minStr = minDate.toISOString().split('T')[0];
    const maxStr = maxDate.toISOString().split('T')[0];
    
    dateInput.min = minStr;
    dateInput.max = maxStr;
    dateInput.value = minStr; // Pre-select tomorrow
    
    // Load time slots for default date
    loadTimeSlots();
}

async function loadTimeSlots() {
    const dateInput = document.getElementById('bookingDate');
    const slotsContainer = document.getElementById('timeSlotsContainer');
    
    if (!dateInput || !slotsContainer) return;
    
    const selectedDate = new Date(dateInput.value);
    
    try {
        slotsContainer.innerHTML = '<div class="loading">Loading available times...</div>';
        
        // Calculate total duration of selected services
        const totalDuration = selectedServices.reduce((sum, service) => {
            const svc = services.find(s => s.id === service.id);
            return sum + (svc ? svc.duration : 0);
        }, 0);
        
        // Determine day of week
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // Get first selected service to fetch availability
        const firstServiceId = selectedServices[0].id;
        const response = await fetch(`/api/services/${firstServiceId}`);
        const service = await response.json();
        
        const availability = service.availability[dayOfWeek];
        
        if (!availability || !availability.enabled || !availability.slots || availability.slots.length === 0) {
            slotsContainer.innerHTML = '<div class="no-slots">No available slots for this date</div>';
            return;
        }
        
        // Generate time slots
        const slots = [];
        availability.slots.forEach(slot => {
            const [startHour, startMin] = slot.start.split(':');
            const [endHour, endMin] = slot.end.split(':');
            
            let current = new Date(selectedDate);
            current.setHours(parseInt(startHour), parseInt(startMin), 0);
            
            const end = new Date(selectedDate);
            end.setHours(parseInt(endHour), parseInt(endMin), 0);
            
            while (current.getTime() + (totalDuration * 60000) <= end.getTime()) {
                const timeStr = current.toTimeString().slice(0, 5);
                slots.push({
                    time: timeStr,
                    datetime: new Date(current)
                });
                
                current.setMinutes(current.getMinutes() + 15); // 15-min intervals
            }
        });
        
        if (slots.length === 0) {
            slotsContainer.innerHTML = '<div class="no-slots">No available slots for this date with service duration</div>';
            return;
        }
        
        // Render time slots
        slotsContainer.innerHTML = slots.map(slot => `
            <label class="time-slot">
                <input type="radio" name="timeSlot" value="${slot.time}">
                <span>${slot.time}</span>
            </label>
        `).join('');
        
        // Pre-select first slot
        const firstSlot = slotsContainer.querySelector('input[type="radio"]');
        if (firstSlot) firstSlot.checked = true;
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        slotsContainer.innerHTML = '<div class="error">Error loading available times</div>';
    }
}

// ===== CUSTOMER FORM FUNCTIONS =====

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function displayConfirmation() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    const bookingDate = document.getElementById('bookingDate').value;
    const bookingTime = document.querySelector('input[name="timeSlot"]:checked').value;
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerNotes = document.getElementById('customerNotes').value;
    
    // Calculate totals
    let totalPrice = 0;
    let totalDuration = 0;
    
    selectedServices.forEach(service => {
        const priceInfo = calculateDiscountedPriceForService(service);
        totalPrice += priceInfo.discountedPrice;
        totalDuration += service.duration;
    });
    
    const date = new Date(bookingDate);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    confirmationDiv.innerHTML = `
        <div class="confirmation-card">
            <h3>✨ Booking Summary</h3>
            
            <div class="confirmation-section">
                <h4>Services Selected</h4>
                <ul class="services-list">
                    ${selectedServices.map(service => `
                        <li>
                            <span>${service.name}</span>
                            <span>$${service.price.toFixed(2)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="confirmation-section">
                <h4>Appointment Details</h4>
                <div class="details-grid">
                    <div class="detail">
                        <span class="label">📅 Date:</span>
                        <span class="value">${dateStr}</span>
                    </div>
                    <div class="detail">
                        <span class="label">🕐 Time:</span>
                        <span class="value">${bookingTime}</span>
                    </div>
                    <div class="detail">
                        <span class="label">⏱️ Duration:</span>
                        <span class="value">${totalDuration} minutes</span>
                    </div>
                </div>
            </div>
            
            <div class="confirmation-section">
                <h4>Your Information</h4>
                <div class="details-grid">
                    <div class="detail">
                        <span class="label">👤 Name:</span>
                        <span class="value">${customerName}</span>
                    </div>
                    <div class="detail">
                        <span class="label">📧 Email:</span>
                        <span class="value">${customerEmail}</span>
                    </div>
                    <div class="detail">
                        <span class="label">📞 Phone:</span>
                        <span class="value">${customerPhone}</span>
                    </div>
                </div>
                ${customerNotes ? `<p class="notes"><strong>Notes:</strong> ${customerNotes}</p>` : ''}
            </div>
            
            <div class="confirmation-total">
                <span class="label">Total Amount:</span>
                <span class="amount">$${totalPrice.toFixed(2)}</span>
            </div>
        </div>
    `;
}

// ===== BOOKING SUBMISSION =====

async function submitBooking() {
    const submitBtn = document.getElementById('step4Submit');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const bookingDate = document.getElementById('bookingDate').value;
        const bookingTime = document.querySelector('input[name="timeSlot"]:checked').value;
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const customerNotes = document.getElementById('customerNotes').value;
        
        // Combine date and time
        const dateObj = new Date(bookingDate);
        const [hours, minutes] = bookingTime.split(':');
        dateObj.setHours(parseInt(hours), parseInt(minutes), 0);
        
        // Calculate end time based on service durations
        const totalDuration = selectedServices.reduce((sum, service) => {
            const svc = services.find(s => s.id === service.id);
            return sum + (svc ? svc.duration : 0);
        }, 0);
        
        const endTime = new Date(dateObj.getTime() + totalDuration * 60000);
        
        // Prepare booking data
        const bookingData = {
            customerName,
            customerEmail,
            customerPhone,
            customerNotes,
            serviceIds: selectedServices.map(s => s.id),
            services: selectedServices.map(s => ({
                id: s.id,
                name: s.name,
                price: s.price
            })),
            startTime: dateObj.toISOString(),
            endTime: endTime.toISOString(),
            status: 'pending',
            paymentStatus: 'pending',
            customerInfo: {
                name: customerName,
                email: customerEmail,
                phone: customerPhone
            }
        };
        
        // Submit booking
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to create booking');
        }
        
        // Success!
        showSuccess('Booking created successfully!');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting booking:', error);
        showError(error.message || 'Failed to complete booking. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '✨ Complete Booking';
    }
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4ade80; color: white; padding: 15px 20px; border-radius: 8px; z-index: 9999; font-weight: 500;';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}


