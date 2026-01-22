document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const N8N_WEBHOOK_URL = 'https://unstormable-trothless-gilberto.ngrok-free.dev/webhook-test/eee10825-ff7e-4622-8ba9-37596ffd9745';

    // --- Selectors ---
    const html = document.documentElement;
    const header = document.getElementById('header');
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenu = document.querySelector('.close-menu');
    const menuLinks = document.querySelectorAll('.mobile-menu a');

    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    const serviceSelect = document.getElementById('service');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');

    // Cancel Form
    const cancelForm = document.getElementById('cancelForm');

    // Modal
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeModalElements = document.querySelectorAll('.close-modal, #closeModalBtn');

    // --- Scroll Effects ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Logic ---
    const toggleMenu = (show) => {
        mobileMenu.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';
    };

    hamburger.addEventListener('click', () => toggleMenu(true));
    closeMenu.addEventListener('click', () => toggleMenu(false));
    menuLinks.forEach(link => link.addEventListener('click', () => toggleMenu(false)));

    // --- Booking System Logic ---

    // Restrict date to today onwards
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    function updateTimeSlots() {
        const selectedDate = dateInput.value;
        const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];

        timeSelect.innerHTML = '';
        timeSelect.disabled = true;

        if (!selectedDate || !selectedServiceOption.value) {
            timeSelect.innerHTML = '<option value="">Primero elige servicio y fecha</option>';
            return;
        }

        const duration = parseInt(selectedServiceOption.getAttribute('data-duration')) || 30;
        const startHour = 11;
        const endHour = 21;

        const now = new Date();
        const isToday = selectedDate === today;

        let iterTime = new Date(selectedDate);
        iterTime.setHours(startHour, 0, 0, 0);

        let endTime = new Date(selectedDate);
        endTime.setHours(endHour, 0, 0, 0);

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.text = "Selecciona una hora";
        timeSelect.add(defaultOption);

        let hasSlots = false;

        while (iterTime < endTime) {
            let slotValid = true;
            if (isToday) {
                const timeDiff = (iterTime - now) / 1000 / 60;
                if (timeDiff < 60) slotValid = false; // Block if within 1 hour
            }

            if (slotValid) {
                const timeStr = iterTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const option = document.createElement('option');
                option.value = timeStr;
                option.text = timeStr;
                timeSelect.add(option);
                hasSlots = true;
            }
            iterTime.setMinutes(iterTime.getMinutes() + duration);
        }

        if (hasSlots) {
            timeSelect.disabled = false;
        } else {
            timeSelect.innerHTML = '<option>No hay horas disponibles</option>';
        }
    }

    serviceSelect.addEventListener('change', updateTimeSlots);
    dateInput.addEventListener('change', updateTimeSlots);

    // --- Modal Helpers ---
    const showModal = (title, msg) => {
        modalTitle.textContent = title;
        modalMessage.textContent = msg;
        modal.classList.add('active');
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    };

    closeModalElements.forEach(el => el.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // --- Form Submissions ---

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        const data = {
            nombre: document.getElementById('name').value,
            email: document.getElementById('email').value,
            barbero: document.getElementById('employee').value,
            servicio: serviceSelect.options[serviceSelect.selectedIndex].text,
            fecha: dateInput.value,
            hora: timeSelect.value
        };

        if (!data.hora) {
            showModal('Atención', 'Por favor, selecciona una hora para tu cita.');
            return;
        }

        // UI Feedback
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> PROCESANDO...';

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showModal('¡Cita Confirmada!', `Hola ${data.nombre}, tu cita ha sido reservada con éxito para el ${data.fecha} a las ${data.hora}.`);
                bookingForm.reset();
                updateTimeSlots();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Error:', error);
            showModal('Error', 'No hemos podido procesar tu reserva. Inténtalo de nuevo o contacta con nosotros directamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    cancelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('cancelEmail').value;
        showModal('Cancelación en proceso', `Hemos recibido tu solicitud para el correo ${email}. Nuestro equipo la procesará a la brevedad.`);
        cancelForm.reset();
    });
});
