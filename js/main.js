// Navbar scroll
const navbar = document.getElementById('navbar');
const navLogoImg = document.getElementById('nav-logo-img');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 60;
  navbar.classList.toggle('scrolled', scrolled);
  navLogoImg.src = scrolled ? 'img/logo.png' : 'img/logo-branco.png';
}, { passive: true });

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => observer.observe(el));

// Use cases tabs
function switchCase(idx) {
  document.querySelectorAll('.use-case-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.use-case-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
}

// Demo step switcher
const demoStepData = [
  { title: 'Leia o documento com atenção', sub: 'Etapa 1 de 6', progress: '16%' },
  { title: 'Confirme seus dados', sub: 'Etapa 2 de 6', progress: '33%' },
  { title: 'Foto do documento oficial', sub: 'Etapa 3 de 6', progress: '50%' },
  { title: 'Selfie com o documento', sub: 'Etapa 4 de 6', progress: '67%' },
  { title: 'Assinatura Manuscrita', sub: 'Etapa 5 de 6', progress: '83%' },
  { title: 'Token de autenticação', sub: 'Etapa 6 de 6', progress: '100%' },
];
let demoStep = 0;

function setDemoStep(n) {
  demoStep = Math.max(0, Math.min(5, n));
  document.querySelectorAll('.demo-step-btn').forEach((btn, i) => btn.classList.toggle('active', i === demoStep));
  document.querySelectorAll('.mockup-screen').forEach((scr, i) => scr.classList.toggle('active', i === demoStep));
  const d = demoStepData[demoStep];
  document.getElementById('demo-title').textContent = d.title;
  document.getElementById('demo-sub').textContent = d.sub;
  document.getElementById('demo-progress').style.width = d.progress;
  document.getElementById('demo-back').style.display = demoStep === 0 ? 'none' : '';
  document.getElementById('demo-next').textContent = demoStep === 5 ? 'FINALIZAR' : 'Avançar →';
}

document.querySelectorAll('.demo-step-btn').forEach((btn, i) => btn.addEventListener('click', () => setDemoStep(i)));
document.getElementById('demo-back').addEventListener('click', () => setDemoStep(demoStep - 1));
document.getElementById('demo-next').addEventListener('click', () => setDemoStep(demoStep === 5 ? 0 : demoStep + 1));

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
mobileMenu.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', closeMobileMenu));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' }); }
  });
});
