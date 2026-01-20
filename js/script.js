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

    // Handle Form Submit
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simple client-side validation simulation
        const formData = new FormData(bookingForm);
        const name = formData.get('name');
        const time = formData.get('time');
        
        if (!time) {
            showBookingMessage('Por favor selecciona una hora válida.', 'error');
            return;
        }

        // Simulate API call
        // In a real app, send data to backend here
        
        showBookingMessage(`¡Reserva Confirmada! Gracias ${name}, te esperamos a las ${time}.`, 'success');
        bookingForm.reset();
        timeSelect.innerHTML = '<option value="">Selecciona servicio y fecha primero</option>';
        timeSelect.disabled = true;
    });

    function showBookingMessage(msg, type) {
        bookingMessage.textContent = msg;
        bookingMessage.className = `message ${type}`;
        setTimeout(() => {
            bookingMessage.style.display = 'none';
        }, 5000);
    }

    // Handle Cancel Form
    cancelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('cancelEmail').value;
        
        // Simulate cancellation
        cancelMessage.textContent = `Se ha enviado un correo de cancelación a ${email} (Simulado).`;
        cancelMessage.className = 'message success';
        cancelForm.reset();
        setTimeout(() => {
            cancelMessage.style.display = 'none';
        }, 5000);
    });

});
