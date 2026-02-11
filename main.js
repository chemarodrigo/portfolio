// ==========================================
// MAIN JAVASCRIPT
// ==========================================

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initSmoothScroll();
    initNavbarScroll();
});

// ==========================================
// ANIMACIONES AL HACER SCROLL
// ==========================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                
                // Animar elementos con delay escalonado
                if (entry.target.classList.contains('skill-card') || 
                    entry.target.classList.contains('project-card')) {
                    animateStaggered(entry.target);
                }
            }
        });
    }, observerOptions);
    
    // Observar secciones
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Observar cards
    const cards = document.querySelectorAll('.skill-card, .project-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

function animateStaggered(element) {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
}

// ==========================================
// SCROLL SUAVE
// ==========================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================
// NAVBAR EN SCROLL
// ==========================================

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Añadir sombra al navbar cuando se hace scroll
        if (currentScroll > 50) {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.boxShadow = 'none';
        }
        
        // Destacar link activo en navegación
        highlightActiveSection();
        
        lastScroll = currentScroll;
    });
}

// ==========================================
// DESTACAR SECCIÓN ACTIVA
// ==========================================

function highlightActiveSection() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= (sectionTop - 200)) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// ==========================================
// UTILIDADES
// ==========================================

// Fade in para elementos
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        animation: fadeIn 0.8s ease-in;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .nav-link.active {
        color: var(--color-primary);
    }
`;
document.head.appendChild(style);

// ==========================================
// EASTER EGG: Konami Code
// ==========================================

let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode.splice(-konamiSequence.length - 1, konamiCode.length - konamiSequence.length);
    
    if (konamiCode.join('') === konamiSequence.join('')) {
        activateEasterEgg();
    }
});

function activateEasterEgg() {
    // Cambiar colores temporalmente
    document.documentElement.style.setProperty('--color-primary', '#ec4899');
    document.documentElement.style.setProperty('--color-secondary', '#6366f1');
    
    setTimeout(() => {
        document.documentElement.style.setProperty('--color-primary', '#6366f1');
        document.documentElement.style.setProperty('--color-secondary', '#ec4899');
    }, 3000);
    
    console.log('🎮 ¡Easter egg activado! Los colores han cambiado temporalmente.');
}
