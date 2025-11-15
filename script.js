// Theme Toggle Functionality
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;

// Check for saved theme preference or default to dark mode
const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
  body.classList.add('light-mode');
  themeSwitch.checked = true;
}

themeSwitch.addEventListener('change', function() {
  if (this.checked) {
    body.classList.add('light-mode');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.remove('light-mode');
    localStorage.setItem('theme', 'dark');
  }
});

// ============================================
// DYNAMIC TIME UPDATE
// ============================================
function updateLastUpdatedTime() {
  const now = new Date();
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  const dateString = now.toLocaleString('en-US', options);
  
  const dateElement = document.getElementById('last-updated-date');
  if (dateElement) {
    dateElement.textContent = dateString;
  }
}

// Wait for DOM to load before updating time
document.addEventListener('DOMContentLoaded', function() {
  updateLastUpdatedTime();
  setInterval(updateLastUpdatedTime, 60000);
});

// ============================================
// SMOOTH SCROLLING & NAVIGATION
// ============================================
// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Intersection Observer for scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(50px)';
  section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
  observer.observe(section);
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.background = 'var(--glass-bg)';
  } else {
    navbar.style.background = 'transparent';
  }
});

// Active navigation indicator based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveNav() {
  const scrollY = window.pageYOffset;
  
  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 150;
    const sectionId = section.getAttribute('id');
    
    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
  
  // If at the very top, activate Home
  if (scrollY < 300) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#home') {
        link.classList.add('active');
      }
    });
  }
}

window.addEventListener('scroll', updateActiveNav);
window.addEventListener('load', updateActiveNav);

// Parallax effect for hero section (subtle)
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero-content');
  const heroBg = document.querySelector('.hero-profile-bg');
  
  if (hero && scrolled < window.innerHeight) {
    hero.style.transform = `translateY(${scrolled * 0.3}px)`;
    hero.style.opacity = 1 - scrolled / 800;
  }
  
  if (heroBg && scrolled < window.innerHeight) {
    heroBg.style.transform = `translate(-50%, -50%) scale(${1 + scrolled * 0.0001})`;
  }
});

// Interactive background image movement on mouse move
const hero = document.querySelector('.hero');
const heroBg = document.querySelector('.hero-profile-bg');

if (hero && heroBg) {
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    const moveX = x * 20;
    const moveY = y * 20;
    
    heroBg.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  });
  
  hero.addEventListener('mouseleave', () => {
    heroBg.style.transform = 'translate(-50%, -50%)';
  });
}

// 3D card tilt effect (subtle Apple-style)
const cards = document.querySelectorAll('.about-card, .project-card');

cards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;
    
    const cardInner = card.querySelector('.card-3d') || card;
    cardInner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  
  card.addEventListener('mouseleave', () => {
    const cardInner = card.querySelector('.card-3d') || card;
    cardInner.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
  });
});

// CTA button click animation
const ctaButton = document.querySelector('.cta-button');
if (ctaButton) {
  ctaButton.addEventListener('click', () => {
    const projectsSection = document.querySelector('#projects');
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Project cards click handler
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach((card, index) => {
  card.addEventListener('click', () => {
    // You can add your project details modal or navigation here
    console.log(`Project card ${index + 1} clicked`);
  });
});

// Interactive Particle Network Background
const canvas = document.getElementById('particle-canvas');

if (canvas) {
  const ctx = canvas.getContext('2d');

  // Set canvas size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse tracking
  const mouse = {
    x: null,
    y: null,
    radius: 150
  };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
  });

  window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Particle class
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.baseX = this.x;
      this.baseY = this.y;
      this.density = (Math.random() * 30) + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
    }

    draw() {
      const isLightMode = document.body.classList.contains('light-mode');
      ctx.fillStyle = isLightMode ? 'rgba(0, 113, 227, 0.3)' : 'rgba(94, 92, 230, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    update() {
      // Mouse interaction
      if (mouse.x != null && mouse.y != null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * this.density;
        const directionY = forceDirectionY * force * this.density;

        if (distance < mouse.radius) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            const dx = this.x - this.baseX;
            this.x -= dx / 10;
          }
          if (this.y !== this.baseY) {
            const dy = this.y - this.baseY;
            this.y -= dy / 10;
          }
        }
      } else {
        if (this.x !== this.baseX) {
          const dx = this.x - this.baseX;
          this.x -= dx / 10;
        }
        if (this.y !== this.baseY) {
          const dy = this.y - this.baseY;
          this.y -= dy / 10;
        }
      }

      // Gentle floating animation
      this.baseX += this.speedX;
      this.baseY += this.speedY;

      // Boundary check
      if (this.baseX < 0 || this.baseX > canvas.width) this.speedX *= -1;
      if (this.baseY < 0 || this.baseY > canvas.height) this.speedY *= -1;
    }
  }

  // Create particle array
  let particlesArray = [];
  function initParticles() {
    particlesArray = [];
    const numberOfParticles = (canvas.width * canvas.height) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle());
    }
  }
  initParticles();

  // Connect particles
  function connectParticles() {
    const isLightMode = document.body.classList.contains('light-mode');
    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a; b < particlesArray.length; b++) {
        const dx = particlesArray[a].x - particlesArray[b].x;
        const dy = particlesArray[a].y - particlesArray[b].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          const opacity = 1 - (distance / 120);
          ctx.strokeStyle = isLightMode 
            ? `rgba(0, 113, 227, ${opacity * 0.15})` 
            : `rgba(94, 92, 230, ${opacity * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
          ctx.stroke();
        }
      }
    }
  }

  // Animation loop
  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
    }
    
    connectParticles();
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // Recreate particles on window resize
  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });
}

// ============================================
// CERTIFICATIONS MARQUEE & MODAL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const marquee = document.querySelector('.cert-marquee');
  const modal = document.querySelector('.cert-modal');

  if (!marquee || !modal) {
    return;
  }

  const track = marquee.querySelector('.cert-track');
  if (!track) {
    return;
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const originalMarkup = track.innerHTML;
  const modalTitle = modal.querySelector('.cert-modal-title');
  const modalBody = modal.querySelector('.cert-modal-body');
  const modalImage = modal.querySelector('.cert-modal-image');
  const modalClose = modal.querySelector('.cert-modal-close');
  let lastFocusedCard = null;

  function setMarqueeDuration() {
    const speed = parseFloat(track.dataset.speed || '80');
    const totalWidth = track.scrollWidth;
    const originalWidth = track.dataset.duplicated === 'true' ? totalWidth / 2 : totalWidth;
    const duration = Math.max(originalWidth / speed, 24);
    track.style.setProperty('--marquee-duration', `${duration}s`);
  }

  function enableMarquee() {
    if (track.dataset.duplicated !== 'true') {
      track.innerHTML += originalMarkup;
      track.dataset.duplicated = 'true';
    }

    requestAnimationFrame(() => {
      setMarqueeDuration();
      track.classList.add('is-animated');
    });
  }

  function disableMarquee() {
    track.classList.remove('is-animated');
  }

  if (!reduceMotionQuery.matches) {
    enableMarquee();
  } else {
    disableMarquee();
  }

  function handleMotionPreference(event) {
    if (event.matches) {
      disableMarquee();
    } else {
      enableMarquee();
    }
  }

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', handleMotionPreference);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(handleMotionPreference);
  }

  let resizeRafId;
  window.addEventListener('resize', () => {
    if (!track.classList.contains('is-animated')) {
      return;
    }

    cancelAnimationFrame(resizeRafId);
    resizeRafId = requestAnimationFrame(() => {
      setMarqueeDuration();
    });
  });

  function openModal(card) {
    if (!modalTitle || !modalBody || !modalImage) {
      return;
    }

    const detail = card.getAttribute('data-detail') || '';
    const title = card.getAttribute('data-title') || '';
    const image = card.querySelector('img');

    modalTitle.textContent = title;
    modalBody.textContent = detail;
    if (image) {
      modalImage.src = image.getAttribute('src');
      modalImage.alt = image.getAttribute('alt') || title;
    } else {
      modalImage.removeAttribute('src');
      modalImage.alt = '';
    }

    modal.removeAttribute('hidden');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lastFocusedCard = card;

    requestAnimationFrame(() => {
      modalClose?.focus();
    });
  }

  function closeModal() {
    if (!modal.classList.contains('is-open')) {
      return;
    }

    modal.classList.remove('is-open');

    setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.setAttribute('hidden', '');
        document.body.style.overflow = '';
        if (lastFocusedCard && typeof lastFocusedCard.focus === 'function') {
          lastFocusedCard.focus();
        }
      }
    }, 320);
  }

  track.addEventListener('click', (event) => {
    const card = event.target.closest('.cert-card');
    if (!card) {
      return;
    }
    openModal(card);
  });

  modalClose?.addEventListener('click', () => {
    closeModal();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.classList.contains('cert-modal-backdrop')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
});
