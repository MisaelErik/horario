// --- Script General ---
    document.getElementById('year').textContent = new Date().getFullYear();

    // --- Lógica del Carrusel del Hero ---
    const slides = document.querySelectorAll('.hero__slide');
    let currentSlide = 0;
    const slideInterval = setInterval(nextSlide, 4000);

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    // --- Lógica de Selección de Sede ---
    const chips = document.querySelectorAll('[data-branch]');
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('chip--active'));
      ch.classList.add('chip--active');
    }));

    // --- Lógica del Tip Banner ---
    const tipBanner = document.getElementById('tip-banner');
    let tipBannerShown = false;
    
    function showTipBanner() {
        if (window.scrollY > 500 && !tipBannerShown) {
            tipBanner.classList.add('show');
            tipBannerShown = true;
            window.removeEventListener('scroll', showTipBanner);
        }
    }
    
    function hideTipBanner(){
        tipBanner.classList.remove('show'); 
    }

    window.addEventListener('scroll', showTipBanner);
    window.hideTipBanner = hideTipBanner;

    // --- Lógica para el Modal de Guía de Palitos ---
    const palitosModal = document.getElementById('palitosModal');

    function showPalitosModal() {
        palitosModal.classList.add('show');
    }

    function closePalitosModal() {
        palitosModal.classList.remove('show');
        hideTipBanner(); // Oculta también el banner inferior
    }

    // Cerrar modal al hacer clic fuera o en la X
    palitosModal.addEventListener('click', (e) => {
        if (e.target === palitosModal) closePalitosModal();
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => { 
        if(e.key === 'Escape' && palitosModal.classList.contains('show')) {
            closePalitosModal();
        }
    });

    window.showPalitosModal = showPalitosModal;
    window.closePalitosModal = closePalitosModal;
