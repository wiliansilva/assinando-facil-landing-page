// Legal pages — shared JS (navbar + mobile menu)
// Navbar always stays in scrolled (white) state on legal pages
const navbar = document.getElementById('navbar');
const navLogoImg = document.getElementById('nav-logo-img');

navbar.classList.add('scrolled');

window.addEventListener('scroll', () => {
  navbar.classList.add('scrolled');
}, { passive: true });

// Mobile menu
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileOverlay = document.getElementById('mobile-menu-overlay');

function openMobileMenu() {
  hamburger.classList.add('open');
  mobileMenu.classList.add('open');
  mobileOverlay.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  mobileMenu.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  mobileOverlay.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileMenu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  hamburger.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
});
mobileOverlay.addEventListener('click', closeMobileMenu);
