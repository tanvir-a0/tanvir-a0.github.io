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

// Navbar background on scroll - now respects light/dark mode
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  const isLightMode = document.body.classList.contains('light-mode');
  
  if (window.scrollY > 50) {
    if (isLightMode) {
      navbar.style.background = 'rgba(251, 251, 253, 0.72)';
      navbar.style.boxShadow = '0 1px 0 0 rgba(0, 0, 0, 0.08)';
    } else {
      navbar.style.background = 'rgba(29, 29, 31, 0.8)';
      navbar.style.boxShadow = '0 1px 0 0 rgba(255, 255, 255, 0.1)';
    }
  } else {
    if (isLightMode) {
      navbar.style.background = 'rgba(255, 255, 255, 0.64)';
      navbar.style.boxShadow = '0 1px 0 0 rgba(0, 0, 0, 0.04)';
    } else {
      navbar.style.background = 'rgba(29, 29, 31, 0.64)';
      navbar.style.boxShadow = 'none';
    }
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
  if (hero && scrolled < window.innerHeight) {
    hero.style.transform = `translateY(${scrolled * 0.3}px)`;
    hero.style.opacity = 1 - scrolled / 800;
  }
});

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

// Add cursor trail effect
const createCursorTrail = () => {
  let mouseX = 0;
  let mouseY = 0;
  let trail = [];
  const trailLength = 20;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    trail.push({ x: mouseX, y: mouseY });
    if (trail.length > trailLength) {
      trail.shift();
    }
  });
  
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);
  
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    trail.forEach((point, index) => {
      const nextPoint = trail[index + 1];
      if (nextPoint) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.strokeStyle = `rgba(0, 245, 255, ${(index / trailLength) * 0.5})`;
        ctx.lineWidth = (index / trailLength) * 3;
        ctx.stroke();
      }
    });
    
    requestAnimationFrame(animate);
  };
  animate();
};

// Uncomment to enable cursor trail
// createCursorTrail();

// Random floating particles
const createParticles = () => {
  const background = document.querySelector('.background');
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 3 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = 'rgba(0, 245, 255, 0.5)';
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animation = `float ${Math.random() * 4 + 3}s ease-in-out infinite`; // Faster: 3-7s instead of 5-15s
    particle.style.animationDelay = Math.random() * 3 + 's'; // Reduced delay
    background.appendChild(particle);
  }
};

createParticles();

// Typing effect for subtitle (optional enhancement) - Disabled for cleaner look
/*
const subtitle = document.querySelector('.subtitle');
if (subtitle) {
  const text = subtitle.textContent;
  subtitle.textContent = '';
  let i = 0;
  
  const typeWriter = () => {
    if (i < text.length) {
      subtitle.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 50);
    }
  };
  
  setTimeout(typeWriter, 1000);
}
*/

console.log('🚀 Website loaded successfully!');

// Interactive Particle Network Background
const canvas = document.getElementById('particle-canvas');
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
const particlesArray = [];
const numberOfParticles = (canvas.width * canvas.height) / 9000;

for (let i = 0; i < numberOfParticles; i++) {
  particlesArray.push(new Particle());
}

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
  const isLightMode = document.body.classList.contains('light-mode');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Add subtle gradient background
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  
  if (isLightMode) {
    gradient.addColorStop(0, 'rgba(245, 245, 247, 0)');
    gradient.addColorStop(1, 'rgba(251, 251, 253, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  particlesArray.length = 0;
  const newNumberOfParticles = (canvas.width * canvas.height) / 9000;
  for (let i = 0; i < newNumberOfParticles; i++) {
    particlesArray.push(new Particle());
  }
});
