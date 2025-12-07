// admin-rooms.js - Room Management System
let supabaseClient = null;

async function getSupabaseClient() {
    // Try to use global supabase first
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') {
        console.log('✅ Using existing global Supabase client');
        return supabase;
    }
    
    // If global doesn't work, create our own
    console.log('⚙️ Creating new Supabase client...');
    
    if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase library not loaded! Check CDN script tag.');
    }
    
    const SUPABASE_URL = 'https://yglehirjsxaxvrpfbvse.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbGVoaXJqc3hheHZycGZidnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NjIzOTksImV4cCI6MjA0ODAzODM5OX0.bJqQrJ-H7eUoEOEBp8hZL_xCm9kQKT9LHqXJ_3QVLPs';
    
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('✅ New Supabase client created');
    return client;
}

// Tima Sara Hotel - ACTUAL Room Layout (28 rooms total)
const HOTEL_ROOMS = {
    'Standard': [4, 5, 102, 103, 104, 202, 203, 204, 302, 303, 304], // 11 rooms
    'Executive': [2, 101, 105, 106, 201, 205, 206, 301, 305, 306], // 10 rooms (removed duplicate 103)
    'Deluxe': [107, 207, 307], // 3 rooms
    'Royal': [108, 208, 308] // 3 suites
};

let rooms = [];
let currentBookings = [];
let currentStatusFilter = 'all';
let currentTypeFilter = 'all';

// Initialize room data
function initializeRooms() {
    rooms = [];
    
    for (const [type, numbers] of Object.entries(HOTEL_ROOMS)) {
        numbers.forEach(number => {
            rooms.push({
                number: number,
                type: type + ' Room',
                status: 'available', // default status
                currentGuest: null,
                checkIn: null,
                checkOut: null
            });
        });
    }
    
    console.log('🏠 Initialized rooms:', rooms.length);
}

// Load bookings and update room status
async function loadRoomStatus() {
    try {
        // Get all current and upcoming bookings
        const today = new Date().toISOString().split('T')[0];
        
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .gte('check_out', today)
            .order('check_in', { ascending: true });
        
        if (error) throw error;
        
        currentBookings = bookings;
        
        // Update room status based on bookings
        updateRoomStatusFromBookings(bookings);
        
        // Update statistics
        updateRoomStats();
        
        // Display rooms
        displayRooms();
        
        console.log('📊 Room status updated from bookings');
        
    } catch (error) {
        console.error('Error loading room status:', error);
    }
}

// Update room status based on bookings
function updateRoomStatusFromBookings(bookings) {
    const today = new Date();
    
    bookings.forEach(booking => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        
        // Find room by type (simplified - in real system you'd assign specific room numbers)
        const roomType = booking.room_type;
        const availableRoom = rooms.find(r => 
            r.type === roomType && 
            r.status === 'available' &&
            checkIn <= today && 
            checkOut >= today
        );
        
        if (availableRoom) {
            availableRoom.status = 'occupied';
            availableRoom.currentGuest = booking.full_name;
            availableRoom.checkIn = booking.check_in;
            availableRoom.checkOut = booking.check_out;
            availableRoom.bookingId = booking.id;
        }
    });
}

// Update room statistics
function updateRoomStats() {
    const stats = {
        available: rooms.filter(r => r.status === 'available').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        cleaning: rooms.filter(r => r.status === 'cleaning').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length
    };
    
    document.getElementById('availableCount').textContent = stats.available;
    document.getElementById('occupiedCount').textContent = stats.occupied;
    document.getElementById('cleaningCount').textContent = stats.cleaning;
    document.getElementById('maintenanceCount').textContent = stats.maintenance;
    
    // Update filter tag counts
    document.querySelector('[data-status="all"]').textContent = `All (${rooms.length})`;
    document.querySelector('[data-status="available"]').textContent = `Available (${stats.available})`;
    document.querySelector('[data-status="occupied"]').textContent = `Occupied (${stats.occupied})`;
    document.querySelector('[data-status="cleaning"]').textContent = `Cleaning (${stats.cleaning})`;
    document.querySelector('[data-status="maintenance"]').textContent = `Maintenance (${stats.maintenance})`;
}

// Display rooms
function displayRooms() {
    const grid = document.getElementById('roomsGrid');
    
    // Filter rooms
    let filteredRooms = rooms;
    
    if (currentStatusFilter !== 'all') {
        filteredRooms = filteredRooms.filter(r => r.status === currentStatusFilter);
    }
    
    if (currentTypeFilter !== 'all') {
        filteredRooms = filteredRooms.filter(r => r.type.includes(currentTypeFilter));
    }
    
    if (filteredRooms.length === 0) {
        grid.innerHTML = '<div class="loading-container">No rooms match the selected filters</div>';
        return;
    }
    
    grid.innerHTML = filteredRooms.map(room => `
    <div class="room-card status-${room.status}" data-type="${room.type}" onclick="viewRoomDetails(${room.number})">
        <div class="room-number">${room.number}</div>
        <div class="room-type">${room.type}</div>
        <span class="room-status-badge ${room.status}">
            ${getStatusIcon(room.status)} ${room.status.charAt(0).toUpperCase() + room.status.slice(1)}
        </span>
        ${room.currentGuest ? `
            <div class="room-guest-info">
                <span class="room-guest-name">👤 ${room.currentGuest}</span>
                <span class="room-guest-dates">
                    ${formatDate(room.checkIn)} - ${formatDate(room.checkOut)}
                </span>
            </div>
        ` : ''}
    </div>
`).join('');
}

// Get status icon
function getStatusIcon(status) {
    const icons = {
        available: '✅',
        occupied: '🔑',
        cleaning: '🧹',
        maintenance: '🔧'
    };
    return icons[status] || '❓';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short'
    });
}

// View room details
function viewRoomDetails(roomNumber) {
    const room = rooms.find(r => r.number === roomNumber);
    if (!room) return;
    
    const modal = document.getElementById('roomModal');
    const modalBody = document.getElementById('roomModalBody');
    
    document.getElementById('modalRoomNumber').textContent = `Room ${room.number}`;
    
    modalBody.innerHTML = `
        <div class="room-detail-info">
            <div class="room-info-item">
                <h4>Room Number</h4>
                <p>${room.number}</p>
            </div>
            <div class="room-info-item">
                <h4>Room Type</h4>
                <p>${room.type}</p>
            </div>
            <div class="room-info-item">
                <h4>Current Status</h4>
                <p><span class="room-status-badge ${room.status}">
                    ${getStatusIcon(room.status)} ${room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span></p>
            </div>
            <div class="room-info-item">
                <h4>Floor</h4>
                <p>${Math.floor(room.number / 100)}</p>
            </div>
            ${room.currentGuest ? `
                <div class="room-info-item" style="grid-column: 1 / -1;">
                    <h4>Current Guest</h4>
                    <p>👤 ${room.currentGuest}</p>
                </div>
                <div class="room-info-item">
                    <h4>Check-In</h4>
                    <p>${formatDateFull(room.checkIn)}</p>
                </div>
                <div class="room-info-item">
                    <h4>Check-Out</h4>
                    <p>${formatDateFull(room.checkOut)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Store current room number for status updates
    modal.dataset.roomNumber = roomNumber;
    
    // Show/hide status update buttons based on current status
    const statusBtns = modal.querySelectorAll('.status-update-btn');
    statusBtns.forEach(btn => {
        const btnStatus = btn.dataset.status;
        btn.style.display = btnStatus === room.status ? 'none' : 'inline-block';
    });
    
    modal.style.display = 'flex';
}

// Format date full
function formatDateFull(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
    });
}

// Update room status
async function updateRoomStatus(roomNumber, newStatus) {
    const room = rooms.find(r => r.number === roomNumber);
    if (!room) return;
    
    // If setting to available, clear guest info
    if (newStatus === 'available') {
        room.currentGuest = null;
        room.checkIn = null;
        room.checkOut = null;
        room.bookingId = null;
    }
    
    room.status = newStatus;
    
    // Update display
    updateRoomStats();
    displayRooms();
    
    // Close modal
    document.getElementById('roomModal').style.display = 'none';
    
    console.log(`🔄 Room ${roomNumber} status updated to: ${newStatus}`);
}

// Status filter buttons
document.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active from all status buttons
        document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        currentStatusFilter = this.dataset.status;
        displayRooms();
    });
});

// Type filter buttons
document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active from all type buttons
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        currentTypeFilter = this.dataset.type;
        displayRooms();
    });
});

// Close modal
document.getElementById('closeRoomModal')?.addEventListener('click', () => {
    document.getElementById('roomModal').style.display = 'none';
});

document.getElementById('closeRoomModalBtn')?.addEventListener('click', () => {
    document.getElementById('roomModal').style.display = 'none';
});

// Status update button handlers
document.querySelectorAll('.status-update-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const modal = document.getElementById('roomModal');
        const roomNumber = parseInt(modal.dataset.roomNumber);
        const newStatus = this.dataset.status;
        
        if (confirm(`Change room ${roomNumber} status to ${newStatus}?`)) {
            updateRoomStatus(roomNumber, newStatus);
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('rooms')) {
        initializeRooms();
        loadRoomStatus();
    }
});

console.log('🏠 Rooms module loaded');