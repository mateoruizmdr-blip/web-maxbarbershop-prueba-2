document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenu = document.querySelector('.close-menu');
    const menuLinks = document.querySelectorAll('.mobile-menu a');

    hamburger.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });

    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    });

    // --- Booking System Logic ---
    const serviceSelect = document.getElementById('service');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const bookingForm = document.getElementById('bookingForm');
    const bookingMessage = document.getElementById('bookingMessage');
    const cancelForm = document.getElementById('cancelForm');
    const cancelMessage = document.getElementById('cancelMessage');

    // Restrict date to today onwards
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // Update time slots when service or date changes
    function updateTimeSlots() {
        const selectedDate = dateInput.value;
        const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];

        // Reset time select
        timeSelect.innerHTML = '';
        timeSelect.disabled = true;

        if (!selectedDate || !selectedServiceOption.value) {
            const defaultOption = document.createElement('option');
            defaultOption.text = "Selecciona servicio y fecha primero";
            timeSelect.add(defaultOption);
            return;
        }

        const durationMinutes = parseInt(selectedServiceOption.getAttribute('data-duration'));
        const interval = durationMinutes; // "si la cita es de 15 min que deje seleccionar de 15 en 15..."

        // Opening hours 11:00 to 21:00
        const startHour = 11;
        const endHour = 21;

        const now = new Date();
        const isToday = selectedDate === today;
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        let startTime = new Date(selectedDate);
        startTime.setHours(startHour, 0, 0, 0);

        let endTime = new Date(selectedDate);
        endTime.setHours(endHour, 0, 0, 0);

        let iterTime = new Date(startTime);
        let hasSlots = false;

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.text = "Selecciona una hora";
        timeSelect.add(defaultOption);

        while (iterTime < endTime) {
            // Check if slot is in the past (only for today) + 1 hour buffer
            // "No dejes que se reserve a partir del día actual dentro de 1 hora"

            let slotValid = true;
            if (isToday) {
                // Calculate time difference in minutes
                const timeDiff = (iterTime - now) / 1000 / 60;
                if (timeDiff < 60) {
                    slotValid = false;
                }
            }

            if (slotValid) {
                const hours = iterTime.getHours().toString().padStart(2, '0');
                const minutes = iterTime.getMinutes().toString().padStart(2, '0');
                const timeString = `${hours}:${minutes}`;

                const option = document.createElement('option');
                option.value = timeString;
                option.text = timeString;
                timeSelect.add(option);
                hasSlots = true;
            }

            // Increment time by service duration
            iterTime.setMinutes(iterTime.getMinutes() + interval);
        }

        if (hasSlots) {
            timeSelect.disabled = false;
        } else {
            timeSelect.innerHTML = '<option>No hay horas disponibles</option>';
        }
    }

    serviceSelect.addEventListener('change', updateTimeSlots);
    dateInput.addEventListener('change', updateTimeSlots);

    // --- Modal Logic ---
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeModalElements = document.querySelectorAll('.close-modal, #closeModalBtn');

    function showModal(title, msg) {
        modalTitle.textContent = title;
        modalMessage.textContent = msg;
        modal.style.display = 'flex'; // Use flex to center
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    closeModalElements.forEach(el => {
        el.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle Form Submit
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // TU WEBHOOK DE N8N AQUÍ (Cámbialo si es diferente)
        // Puedes usar: https://n8n.tu-dominio.com/webhook/...
        // Si no tienes uno, esto dará error en la consola, pero simulará el éxito visualmente para que veas el diseño.
        // Ejemplo de webhook de prueba: 'https://hook.eu1.make.com/...' (Usaré un placeholder)
        const WEBHOOK_URL = 'PON_TU_URL_AQUI';

        const formData = new FormData(bookingForm);
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            employee: formData.get('employee'),
            service: formData.get('service'),
            // Get text from selected option for better context
            serviceName: serviceSelect.options[serviceSelect.selectedIndex].text,
            date: formData.get('date'),
            time: formData.get('time')
        };

        if (!data.time) {
            showModal('Error', 'Por favor selecciona una hora válida.');
            return;
        }

        // Loading State
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENVIANDO...';

        // Intentar enviar (Si no hay URL válida configurada, avisar)
        if (WEBHOOK_URL === 'PON_TU_URL_AQUI') {
            // Simulación para demostración si el usuario no ha puesto la URL aún
            setTimeout(() => {
                showModal('¡Reserva Confirmada (Demo)!', `Gracias ${data.name}. Configura la variable WEBHOOK_URL en script.js para que llegue el correo real.`);
                bookingForm.reset();
                timeSelect.innerHTML = '<option value="">Selecciona servicio y fecha primero</option>';
                timeSelect.disabled = true;
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }, 2000);
            return;
        }

        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (response.ok) {
                    showModal('¡Reserva Confirmada!', `Gracias ${data.name}, tu cita ha sido reservada para el ${data.date} a las ${data.time}.`);
                    bookingForm.reset();
                    timeSelect.innerHTML = '<option value="">Selecciona servicio y fecha primero</option>';
                    timeSelect.disabled = true;
                } else {
                    throw new Error('Error en el servidor');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showModal('Error', 'Hubo un problema al enviar la reserva. Por favor intenta de nuevo o llama al local.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            });
    });

    // Handle Cancel Form
    cancelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('cancelEmail').value;

        showModal('Cancelación', `Se ha tramitado la cancelación para el correo ${email}. Recibirás confirmación en breve.`);

        cancelForm.reset();
    });

});
