// Theme Toggle Functionality
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;

// Check for saved theme preference or default to dark mode
const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
  body.classList.add('light-mode');
  themeSwitch.checked = true;
}

themeSwitch.addEventListener('change', function () {
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
document.addEventListener('DOMContentLoaded', function () {
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
// Intersection Observer for scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');

      // Legacy support for sections if they don't have .reveal
      if (entry.target.tagName === 'SECTION') {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    }
  });
}, observerOptions);

// Observe elements with .reveal class
const revealElements = document.querySelectorAll('.reveal');
revealElements.forEach(el => observer.observe(el));

// Keep existing section observation for sections (optional, but good for sections that don't have specific reveal items)
document.querySelectorAll('section').forEach(section => {
  if (!section.classList.contains('reveal')) {
    section.style.opacity = '0';
    section.style.transform = 'translateY(50px)';
    section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(section);
  }
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

// 3D card tilt effect - REMOVED

// Safety Cleanup: Remove any residual inline transform styles from cards if they exist
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.about-card, .project-card');
  cards.forEach(card => {
    // Only remove if it has the specific 3d perspective transform we want to kill
    if (card.style.transform && card.style.transform.includes('perspective')) {
      card.style.transform = '';
    }
    // Also remove any card-3d inner transform
    const card3d = card.querySelector('.card-3d');
    if (card3d && card3d.style.transform) {
      card3d.style.transform = '';
    }
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

// Interactive Particle Network Background - REMOVED

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
