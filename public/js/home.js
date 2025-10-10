// Home page functionality
document.addEventListener('DOMContentLoaded', async () => {
    await loadServices();
    initializeNavigation();
});

// Load and display services
async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    
    if (!servicesGrid) return;
    
    try {
        showLoading('servicesGrid');
        
        const response = await App.apiRequest('/api/services');
        const services = response.data.services;
        
        if (services.length === 0) {
            servicesGrid.innerHTML = `
                <div class="service-loading">
                    <i class="fas fa-info-circle"></i>
                    <p>No services available at the moment.</p>
                </div>
            `;
            return;
        }
        
        servicesGrid.innerHTML = services.map(service => `
            <div class="service-card" data-service-id="${service.id}">
                <div class="service-icon">
                    <i class="fas ${getServiceIcon(service.category)}"></i>
                </div>
                <div class="service-category">${service.category}</div>
                <h3>${service.name}</h3>
                <p class="service-description">${service.description}</p>
                <div class="service-meta">
                    <div class="service-duration">
                        <i class="fas fa-clock"></i>
                        <span>${App.formatDuration(service.duration)}</span>
                    </div>
                    <div class="service-price">${App.formatCurrency(service.price)}</div>
                </div>
                <div class="service-actions">
                    <a href="/booking?service=${service.id}" class="btn btn-primary">Book Now</a>
                </div>
            </div>
        `).join('');
        
        // Add click handlers for service cards
        const serviceCards = servicesGrid.querySelectorAll('.service-card');
        serviceCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.service-actions')) {
                    const serviceId = card.dataset.serviceId;
                    window.location.href = `/booking?service=${serviceId}`;
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading services:', error);
        servicesGrid.innerHTML = `
            <div class="service-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load services. Please try again later.</p>
            </div>
        `;
    }
}

// Get icon for service category
function getServiceIcon(category) {
    const icons = {
        makeup: 'fa-palette',
        skincare: 'fa-spa',
        eyebrows: 'fa-eye',
        lashes: 'fa-eye',
        hair: 'fa-cut',
        nails: 'fa-hand-sparkles',
        other: 'fa-star'
    };
    return icons[category] || 'fa-star';
}

// Initialize navigation for home page
function initializeNavigation() {
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navigation highlighting based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    function updateActiveNavLink() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink(); // Initial call
}

// Feature animations on scroll
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .service-card');
    animateElements.forEach(el => observer.observe(el));
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
});

// Handle service search/filter from URL parameters
function handleServiceFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    if (category || search) {
        // Scroll to services section
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
            setTimeout(() => {
                servicesSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 500);
        }
    }
}

// Call filter handler on load
document.addEventListener('DOMContentLoaded', () => {
    handleServiceFilter();
});