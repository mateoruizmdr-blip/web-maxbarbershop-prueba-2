// ========================================
// MAX STUDIO BARBER SHOP - SCRIPT PRINCIPAL
// Conexión con n8n workflows
// ========================================

// URLs de los webhooks de n8n
const WEBHOOK_GET_EVENTS = 'https://unstormable-trothless-gilberto.ngrok-free.dev/webhook-test/eee10825-ff7e-4622-8ba9-37596ffd9745';
const WEBHOOK_CREATE_APPOINTMENT = 'https://unstormable-trothless-gilberto.ngrok-free.dev/webhook-test/ec2331d9-fca8-482b-920e-aedce6dfc718';

// Duraciones de servicios en minutos
const SERVICE_DURATIONS = {
    "Corte de pelo": 30,
    "Corte y barba": 40,
    "Corte de barba": 15,
    "Cejas": 10,
    "Jubilados": 20
};

// Variables globales
let occupiedSlots = {}; // Almacenará las horas ocupadas por barbero
let currentDate = null;
let currentEmployee = null;
let currentService = null;
let currentServiceDuration = null;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupDatePicker();
    setupEventListeners();
    setupMobileMenu();
    setupSmoothScroll();
    
    // Cargar horas ocupadas al iniciar
    loadOccupiedSlots();
}

// ========================================
// CARGAR HORAS OCUPADAS DESDE N8N
// ========================================
async function loadOccupiedSlots() {
    try {
        console.log('Cargando horas ocupadas de los calendarios...');
        
        const response = await fetch(WEBHOOK_GET_EVENTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getOccupiedSlots'
            })
        });

        if (!response.ok) {
            throw new Error('Error al obtener las horas ocupadas');
        }

        const data = await response.json();
        console.log('Datos recibidos de n8n:', data);
        
        // Procesar los eventos para crear el objeto de horas ocupadas
        processOccupiedSlots(data);
        
    } catch (error) {
        console.error('Error al cargar horas ocupadas:', error);
        showModal('Error', 'No se pudieron cargar las disponibilidades. Por favor, intenta de nuevo más tarde.');
    }
}

function processOccupiedSlots(events) {
    occupiedSlots = {
        'Ayoub': {},
        'Ragnar Ab': {},
        'Yasin': {},
        'Alejandro': {}
    };

    if (!Array.isArray(events)) {
        console.error('Formato de eventos inválido');
        return;
    }

    events.forEach(event => {
        const barber = event.calendar || event.barbero;
        const startTime = new Date(event.start || event.inicio);
        const endTime = event.end ? new Date(event.end) : null;
        const date = startTime.toISOString().split('T')[0];
        const time = startTime.toTimeString().slice(0, 5);
        
        // Calcular duración del evento en minutos
        const duration = endTime ? Math.round((endTime - startTime) / (1000 * 60)) : 30;

        if (occupiedSlots[barber]) {
            if (!occupiedSlots[barber][date]) {
                occupiedSlots[barber][date] = [];
            }
            occupiedSlots[barber][date].push({
                time: time,
                duration: duration
            });
        }
    });

    console.log('Horas ocupadas procesadas:', occupiedSlots);
}

// ========================================
// CONFIGURACIÓN FECHA MÍNIMA
// ========================================
function setupDatePicker() {
    const dateInput = document.getElementById('date');
    const today = new Date();
    today.setDate(today.getDate() + 1); // Mínimo mañana
    dateInput.min = today.toISOString().split('T')[0];
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    const form = document.getElementById('bookingForm');
    const cancelForm = document.getElementById('cancelForm');
    const serviceSelect = document.getElementById('service');
    const dateInput = document.getElementById('date');
    const employeeSelect = document.getElementById('employee');
    const timeSelect = document.getElementById('time');

    // Listener para cambios en servicio
    serviceSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        currentService = selectedOption.text.split(' - ')[0]; // Extrae solo el nombre del servicio
        currentServiceDuration = parseInt(selectedOption.getAttribute('data-duration')) || 30;
        console.log('Servicio seleccionado:', currentService, 'Duración:', currentServiceDuration);
        updateAvailableSlots();
    });

    // Listener para cambios en fecha
    dateInput.addEventListener('change', function() {
        currentDate = this.value;
        updateAvailableSlots();
    });

    // Listener para cambios en barbero
    employeeSelect.addEventListener('change', function() {
        currentEmployee = this.value;
        updateAvailableSlots();
    });

    // Listener para envío del formulario
    form.addEventListener('submit', handleBookingSubmit);
    cancelForm.addEventListener('submit', handleCancelSubmit);
}

// ========================================
// ACTUALIZAR SLOTS DISPONIBLES
// ========================================
function updateAvailableSlots() {
    const timeSelect = document.getElementById('time');
    
    if (!currentService || !currentDate || !currentEmployee || !currentServiceDuration) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Selecciona servicio, barbero y fecha primero</option>';
        return;
    }

    const availableSlots = generateTimeSlots(currentDate, currentEmployee, currentServiceDuration);
    
    timeSelect.disabled = false;
    timeSelect.innerHTML = '';

    if (availableSlots.length === 0) {
        timeSelect.innerHTML = '<option value="">No hay disponibilidad para este día</option>';
        timeSelect.disabled = true;
    } else {
        timeSelect.innerHTML = '<option value="">Selecciona una hora</option>';
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            timeSelect.appendChild(option);
        });
    }
}

function generateTimeSlots(date, employee, serviceDuration) {
    const slots = [];
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    
    // Horario: 11:00 - 21:00, Domingo cerrado
    if (dayOfWeek === 0) return slots;

    const openTime = 11 * 60; // 11:00 en minutos
    const closeTime = 21 * 60; // 21:00 en minutos
    
    // EL INTERVALO ES LA DURACIÓN DEL SERVICIO
    const interval = serviceDuration;

    // Obtener horas ocupadas para este barbero y fecha
    const occupied = getOccupiedSlotsForEmployeeAndDate(employee, date);

    for (let minutes = openTime; minutes < closeTime; minutes += interval) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        
        // Verificar si hay suficiente tiempo antes del cierre
        if (minutes + serviceDuration <= closeTime) {
            // Verificar si esta hora está disponible
            if (!isSlotOccupied(minutes, serviceDuration, occupied)) {
                slots.push(timeStr);
            }
        }
    }

    return slots;
}

function getOccupiedSlotsForEmployeeAndDate(employee, date) {
    // Si es "Cualquiera", obtener slots ocupados de todos
    if (employee === 'Cualquiera') {
        let allOccupied = [];
        Object.keys(occupiedSlots).forEach(barber => {
            if (occupiedSlots[barber][date]) {
                allOccupied = allOccupied.concat(occupiedSlots[barber][date]);
            }
        });
        return allOccupied;
    }
    
    return occupiedSlots[employee]?.[date] || [];
}

function isSlotOccupied(startMinutes, serviceDuration, occupiedTimes) {
    const endMinutes = startMinutes + serviceDuration;

    // Verificar si alguna cita ocupada colisiona con este slot
    return occupiedTimes.some(occupied => {
        const [occHours, occMinutes] = occupied.time.split(':').map(Number);
        const occStartMinutes = occHours * 60 + occMinutes;
        const occEndMinutes = occStartMinutes + occupied.duration;
        
        // Hay colisión si:
        // 1. El nuevo servicio empieza durante una cita existente
        // 2. El nuevo servicio termina durante una cita existente
        // 3. El nuevo servicio engloba completamente una cita existente
        return (
            (startMinutes >= occStartMinutes && startMinutes < occEndMinutes) || // Empieza durante
            (endMinutes > occStartMinutes && endMinutes <= occEndMinutes) || // Termina durante
            (startMinutes <= occStartMinutes && endMinutes >= occEndMinutes) // Engloba
        );
    });
}

// ========================================
// MANEJO DE RESERVA
// ========================================
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serviceFullText = document.getElementById('service').options[document.getElementById('service').selectedIndex].text;
    const serviceName = serviceFullText.split(' - ')[0]; // Extrae "Corte de pelo" de "Corte de pelo - 11€ (30 min)"
    
    const data = {
        nombre: formData.get('name'),
        email: formData.get('email'),
        barbero: formData.get('employee'),
        servicio: serviceName, // Solo el nombre del servicio
        fecha: formData.get('date'),
        hora: formData.get('time'),
        duracion: currentServiceDuration
    };

    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const response = await fetch(WEBHOOK_CREATE_APPOINTMENT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Error al crear la cita');
        }

        const result = await response.json();
        console.log('Cita creada:', result);

        // Mostrar confirmación
        showBookingConfirmation(data);
        
        // Resetear formulario
        e.target.reset();
        currentService = null;
        currentServiceDuration = null;
        currentDate = null;
        currentEmployee = null;
        document.getElementById('time').disabled = true;
        document.getElementById('time').innerHTML = '<option value="">Selecciona servicio y fecha primero</option>';
        
        // Recargar horas ocupadas
        await loadOccupiedSlots();

    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'No se pudo completar la reserva. Por favor, inténtalo de nuevo.');
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'CONFIRMAR RESERVA';
    }
}

function showBookingConfirmation(data) {
    const fechaFormatted = new Date(data.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const message = `
        Tu cita ha sido confirmada exitosamente.<br><br>
        <strong>Detalles de la reserva:</strong><br>
        📅 Fecha: ${fechaFormatted}<br>
        🕐 Hora: ${data.hora}<br>
        ✂️ Servicio: ${data.servicio}<br>
        💈 Barbero: ${data.barbero}<br><br>
        Te hemos enviado un email de confirmación a <strong>${data.email}</strong>
    `;

    showModal('¡Cita Confirmada!', message);
}

// ========================================
// CANCELACIÓN DE CITA
// ========================================
async function handleCancelSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('cancelEmail').value;
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        // Aquí se debería implementar la lógica de cancelación en n8n
        // Por ahora mostramos un mensaje
        showModal('Información', 'Para cancelar tu cita, por favor contacta directamente con la barbería.');

    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'No se pudo procesar la cancelación.');
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'CANCELAR CITA';
    }
}

// ========================================
// MODAL
// ========================================
function showModal(title, message) {
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    modal.style.display = 'flex';
    
    // Cerrar modal
    const closeBtn = document.querySelector('.close-modal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    closeBtn.onclick = () => modal.style.display = 'none';
    closeModalBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

// ========================================
// MENÚ MÓVIL
// ========================================
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenu = document.querySelector('.close-menu');
    const mobileLinks = document.querySelectorAll('.mobile-menu a');

    hamburger.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });

    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    });
}

// ========================================
// SCROLL SUAVE
// ========================================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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

    // Header transparente al hacer scroll
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.style.background = 'rgba(17, 17, 17, 0.95)';
        } else {
            header.style.background = 'rgba(17, 17, 17, 0.9)';
        }
    });
}
