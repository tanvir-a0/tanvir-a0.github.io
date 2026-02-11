// ============================================
// RGB BUBBLE TO NAVBAR ANIMATION
// ============================================
(function () {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check if animation has been shown before (comment out to test repeatedly)
  // const hasSeenAnimation = localStorage.getItem('navbarAnimationShown') === 'true';
  const hasSeenAnimation = false; // Set to false to always show animation for testing

  // Get elements
  const bubble = document.getElementById('rgb-bubble');
  const navbar = document.getElementById('main-navbar');

  if (!bubble || !navbar) return;

  // If reduced motion or animation already seen, show navbar immediately
  if (prefersReducedMotion || hasSeenAnimation) {
    navbar.style.opacity = '1';
    bubble.style.display = 'none';
    return;
  }

  // Start animation on page load
  window.addEventListener('load', function () {
    // Completely hide navbar during animation
    navbar.style.visibility = 'hidden';
    navbar.classList.add('navbar-animating');

    // Start bubble animation
    setTimeout(() => {
      bubble.classList.add('animate');
    }, 100);

    // Prepare navbar content fade-in
    setTimeout(() => {
      navbar.classList.add('navbar-ready');
      navbar.classList.remove('navbar-animating');
    }, 1700);

    // Create bubble burst effect before removing main bubble
    setTimeout(() => {
      createBubbleBurst(bubble);
    }, 1900);

    // Remove bubble and clean up after burst animation completes
    setTimeout(() => {
      bubble.remove();
      navbar.classList.remove('navbar-ready');
      navbar.style.visibility = 'visible';
      navbar.style.opacity = '1';

      // Mark animation as seen (uncomment to enable once-only behavior)
      // localStorage.setItem('navbarAnimationShown', 'true');
    }, 2800);
  });

  // Function to create bubble burst effect
  function createBubbleBurst(mainBubble) {
    const bubbleRect = mainBubble.getBoundingClientRect();
    const numBubbles = 12; // Number of small bubbles

    for (let i = 0; i < numBubbles; i++) {
      const smallBubble = document.createElement('div');
      smallBubble.className = 'burst-bubble';

      // Position along the navbar
      const leftPercent = (i / (numBubbles - 1)) * 100;
      smallBubble.style.left = `calc(${leftPercent}% * (${bubbleRect.width}px / 100vw) + ${bubbleRect.left}px)`;
      smallBubble.style.top = `${bubbleRect.top + bubbleRect.height / 2}px`;

      document.body.appendChild(smallBubble);

      // Trigger pop animation with delay
      setTimeout(() => {
        smallBubble.classList.add('pop');

        // Remove bubble after animation
        setTimeout(() => {
          smallBubble.remove();
        }, 400);
      }, i * 60); // Stagger the pops
    }
  }

})();

// Theme Toggle Functionality
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
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

// PERFORMANCE OPTIMIZED: Intersection Observer for scroll animations
const observerOptions = {
  threshold: [0.1], // Use array for better performance
  rootMargin: '0px 0px -50px 0px'
};

// Batch DOM updates to prevent layout thrashing
let pendingUpdates = new Set();
let updateScheduled = false;

function processBatchedUpdates() {
  if (pendingUpdates.size > 0) {
    // Process all updates in one frame to avoid layout thrashing
    pendingUpdates.forEach(element => {
      element.classList.add('active');

      // Only apply inline styles if absolutely necessary
      if (element.tagName === 'SECTION' && !element.classList.contains('reveal')) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });

    pendingUpdates.clear();
  }
  updateScheduled = false;
}

const observer = new IntersectionObserver((entries) => {
  let hasChanges = false;

  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('active')) {
      pendingUpdates.add(entry.target);
      hasChanges = true;
    }
  });

  // Batch all DOM updates in next frame
  if (hasChanges && !updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(processBatchedUpdates);
  }
}, observerOptions);

// Observe elements with .reveal class
const revealElements = document.querySelectorAll('.reveal');
revealElements.forEach(el => observer.observe(el));

// Optimized section observation - reduce DOM manipulation
document.querySelectorAll('section').forEach(section => {
  if (!section.classList.contains('reveal')) {
    // Use CSS classes instead of inline styles for better performance
    section.classList.add('section-reveal');
    observer.observe(section);
  }
});

// PERFORMANCE OPTIMIZED SCROLL HANDLERS
// Combined all scroll handlers into one for better performance
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const navbar = document.querySelector('.navbar');

// Cache DOM queries for performance
let isManualNavigation = false;
let scrollTicking = false;

// Update the main scroll handler to include parallax effects
// Combined scroll handler with throttling
function handleScroll() {
  const scrollY = window.scrollY;

  // Navbar background on scroll
  if (scrollY > 50) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }

  // Active navigation indicator
  if (!isManualNavigation) {
    updateActiveNavLink(scrollY);
  }

  // Parallax effects
  updateParallax(scrollY);

  scrollTicking = false;
}

// Optimized navigation update function
function updateActiveNavLink(scrollY = window.scrollY) {
  if (isManualNavigation) return;

  let currentSection = '';
  const scrollPosition = scrollY + 100;

  // Special case for the very top
  if (scrollY < 100) {
    currentSection = 'home';
  } else {
    // Find current section more efficiently
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
        break;
      }
    }
  }

  // Update active states only if section changed
  if (currentSection) {
    const activeLink = document.querySelector(`.nav-links a.active`);
    const newActiveLink = document.querySelector(`.nav-links a[href="#${currentSection}"]`);

    if (activeLink !== newActiveLink) {
      activeLink?.classList.remove('active');
      newActiveLink?.classList.add('active');
    }
  }
}

// Single throttled scroll listener
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(handleScroll);
    scrollTicking = true;
  }
}, { passive: true });

// Handle manual navigation clicks
navLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    // Immediately update active state for clicked link
    navLinks.forEach(navLink => navLink.classList.remove('active'));
    this.classList.add('active');

    // Prevent automatic updates during smooth scroll
    isManualNavigation = true;
    setTimeout(() => {
      isManualNavigation = false;
      updateActiveNavLink(); // Update again after scroll completes
    }, 1500); // Give extra time for smooth scrolling
  });
});

// Initial call to set correct active state on page load
document.addEventListener('DOMContentLoaded', updateActiveNavLink);

// PERFORMANCE OPTIMIZED: Parallax effect with reduced calculations
const heroContent = document.querySelector('.hero-content');
const heroProfileBg = document.querySelector('.hero-profile-bg');
let lastParallaxUpdate = 0;

function updateParallax(scrollY) {
  // Throttle parallax updates to every 16ms (60fps max)
  const now = performance.now();
  if (now - lastParallaxUpdate < 16) return;

  // Only animate if hero is visible (more efficient bounds check)
  if (scrollY < window.innerHeight * 1.2) {
    if (heroContent) {
      // Use transform3d for hardware acceleration
      heroContent.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0)`;
      heroContent.style.opacity = Math.max(0, 1 - scrollY / 800);
    }
    if (heroProfileBg) {
      const scale = 1 + scrollY * 0.0001;
      heroProfileBg.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
    }
  }

  lastParallaxUpdate = now;
}

// This function will be called from the main scroll handler

// PERFORMANCE OPTIMIZED: Mouse move with better throttling
const hero = document.querySelector('.hero');

if (hero && heroProfileBg) {
  let mouseMoveFrame = null;
  let lastMouseMove = 0;

  hero.addEventListener('mousemove', (e) => {
    const now = performance.now();

    // Throttle to 60fps max
    if (now - lastMouseMove < 16) return;

    if (mouseMoveFrame) {
      cancelAnimationFrame(mouseMoveFrame);
    }

    mouseMoveFrame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const moveX = x * 20;
      const moveY = y * 20;

      // Use translate3d for hardware acceleration
      heroProfileBg.style.transform = `translate3d(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px), 0)`;
      mouseMoveFrame = null;
    });

    lastMouseMove = now;
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    if (mouseMoveFrame) {
      cancelAnimationFrame(mouseMoveFrame);
      mouseMoveFrame = null;
    }
    heroProfileBg.style.transform = 'translate3d(-50%, -50%, 0)';
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

// ============================================
// CLIPBOARD COPY FUNCTIONALITY
// ============================================
async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);

    // Visual Feedback
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Copied!';
    buttonElement.classList.add('copied');

    // Reset after 2 seconds
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove('copied');
    }, 2000);

  } catch (err) {
    console.error('Failed to copy: ', err);

    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Copied!';
      buttonElement.classList.add('copied');
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      buttonElement.textContent = 'Error';
    }
    document.body.removeChild(textArea);
  }
}

// ============================================
// LIQUID NAVBAR RIPPLE EFFECT
// ============================================
function createRipple(e, element) {
  let rect = element.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  let ripples = document.createElement('span');
  ripples.className = 'ripple';

  let size = Math.random() * 50 + 50;
  ripples.style.width = size + 'px';
  ripples.style.height = size + 'px';

  ripples.style.left = (x - size / 2) + 'px';
  ripples.style.top = (y - size / 2) + 'px';

  element.appendChild(ripples);

  setTimeout(() => {
    ripples.remove();
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.addEventListener('click', function (e) {
      // Don't trigger ripple if clicking on a link or interactive element
      if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input') || e.target.closest('label')) {
        return;
      }
      createRipple(e, this);
    });
  }
});

// ============================================
// EASTER EGG: CAT APPEARS ON SPACEBAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const easterCat = document.getElementById('easter-cat');

  if (easterCat) {
    let isSpacePressed = false;

    document.addEventListener('keydown', (e) => {
      // Check if spacebar is pressed and not already pressed (to avoid key repeat)
      if (e.code === 'Space' && !isSpacePressed) {
        // Don't trigger if user is typing in an input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault(); // Prevent page scroll on spacebar
        isSpacePressed = true;
        easterCat.classList.add('show');

        // Re-trigger the wiggle animation
        const catEmoji = easterCat.querySelector('.cat-emoji');
        if (catEmoji) {
          catEmoji.style.animation = 'none';
          setTimeout(() => {
            catEmoji.style.animation = 'catWiggle 0.5s ease-in-out';
          }, 10);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      // Hide cat when spacebar is released
      if (e.code === 'Space') {
        isSpacePressed = false;
        easterCat.classList.remove('show');
      }
    });
  }
});
