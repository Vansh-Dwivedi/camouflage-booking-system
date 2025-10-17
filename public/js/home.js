/**
 * CAMOUFLAGE STUDIO - Premium Home Page
 * Enhanced interactive homepage with service loading, animations, and features
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎨 Camouflage Studio - Premium Homepage Loaded');
    
    // Initialize all features
    initializeNavbar();
    initializeScrollAnimations();
    await loadServices();
    setupSmoothScrolling();
    trackActiveNavigation();
});

/**
 * Navbar scroll effect and mobile menu
 */
function initializeNavbar() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // Close menu when link clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.style.display = 'none';
        });
    });
}

/**
 * Scroll animations for elements
 */
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards
    document.querySelectorAll('.why-us-card, .service-card, .testimonial-card, .gallery-item').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

/**
 * Load services from API and display them
 */
async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    
    try {
        const response = await fetch('/api/services');
        const data = await response.json();
        
        if (data.success && data.data && data.data.services) {
            const services = data.data.services;
            
            if (services.length === 0) {
                servicesGrid.innerHTML = `
                    <div class="service-loading" style="grid-column: 1/-1;">
                        <i class="fas fa-inbox"></i>
                        <p>No services available yet</p>
                    </div>
                `;
                return;
            }

            servicesGrid.innerHTML = '';
            
            services.forEach((service, index) => {
                const serviceCard = createServiceCard(service, index);
                servicesGrid.appendChild(serviceCard);
            });

            console.log(`✅ Loaded ${services.length} services`);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        servicesGrid.innerHTML = `
            <div class="service-loading" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unable to load services. Please try again later.</p>
            </div>
        `;
    }
}

/**
 * Create a service card element with premium styling
 */
function createServiceCard(service, index) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const icon = getServiceIcon(service.category);
    const price = service.price || 'Contact';
    const duration = service.duration || 0;
    
    const priceInfo = calculateDiscountedPrice(service);
    const showDiscount = service.hasDiscount && priceInfo.isActive;
    
    card.innerHTML = `
        <div class="service-image">
            <i class="fas ${icon}"></i>
        </div>
        <div class="service-content">
            <h3 class="service-name">${service.name}</h3>
            <p class="service-description">${service.description || 'Professional makeup service'}</p>
            <div class="service-footer">
                <div>
                    ${showDiscount ? `
                        <div style="font-size: 0.85rem; color: var(--text-muted); text-decoration: line-through;">$${parseFloat(service.price).toFixed(2)}</div>
                        <span class="service-price">$${priceInfo.discountedPrice.toFixed(2)}</span>
                        <span style="font-size: 0.75rem; color: var(--primary); background: rgba(212, 148, 159, 0.1); padding: 2px 8px; border-radius: 4px; margin-left: 8px;">Save ${priceInfo.discountType === 'percentage' ? priceInfo.discount + '%' : '$' + priceInfo.discount}</span>
                    ` : `
                        <span class="service-price">$${price}</span>
                    `}
                </div>
                <span class="service-duration">
                    <i class="fas fa-clock"></i>
                    ${duration} mins
                </span>
            </div>
        </div>
    `;
    
    // Add click to book
    card.addEventListener('click', () => {
        window.location.href = '/booking?service=' + service.id;
    });
    
    return card;
}

/**
 * Get icon for service category
 */
function getServiceIcon(category) {
    const icons = {
        'bridal': 'fa-crown',
        'makeup': 'fa-palette',
        'eyebrow': 'fa-eye',
        'hair': 'fa-scissors',
        'nails': 'fa-hand-sparkles',
        'facial': 'fa-face-smile',
        'special': 'fa-sparkles',
        'package': 'fa-gift',
        'default': 'fa-star'
    };
    
    return icons[category?.toLowerCase()] || icons['default'];
}

/**
 * Calculate discounted price
 */
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

/**
 * Setup smooth scroll behavior
 */
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Track active navigation based on scroll position
 */
function trackActiveNavigation() {
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

/**
 * Page initialization complete
 */
window.addEventListener('load', () => {
    console.log('🎨 Homepage fully loaded and ready!');
});