console.log('📊 Dashboard module loading...');

const supabase = window.supabase_client;
const TOTAL_ROOMS = 28;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Dashboard page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    // Update current time and date
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load all dashboard data
    await loadDashboardData();
    
    // Setup logout
    setupLogout();
});

// Update current date and time display
function updateDateTime() {
    const now = new Date();
    
    // Update time (e.g., "10:30 AM")
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById('currentTime').textContent = `${displayHours}:${displayMinutes} ${ampm}`;
    
    // Update date (e.g., "WED, NOV 27, 2024")
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    document.getElementById('currentDate').textContent = `${dayName}, ${monthName} ${date}, ${year}`;
}

// Load all dashboard data
async function loadDashboardData() {
    console.log('📡 Loading dashboard data...');
    
    try {
        // Load all data in parallel
        await Promise.all([
            loadRoomStatus(),
            loadUpcomingArrivals(),
            loadDeparturesToday(),
            loadOccupancyOverview(),
            loadMonthlyOccupancyTrend()
        ]);
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// AUTO ROOM ALLOCATION FUNCTION - Using real Tima Sara Hotel room numbers
async function autoAllocateRooms() {
    console.log('🤖 Auto-allocating rooms for bookings without room numbers...');
    
    try {
        // Get all confirmed bookings without room numbers
        const { data: unallocatedBookings, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .is('room_number', null)
            .eq('status', 'confirmed')
            .order('check_in');
        
        if (fetchError) throw fetchError;
        
        if (!unallocatedBookings || unallocatedBookings.length === 0) {
            console.log('✅ No bookings need room allocation');
            return;
        }
        
        console.log(`📋 Found ${unallocatedBookings.length} bookings needing room allocation`);
        
        // Process each booking
        for (const booking of unallocatedBookings) {
            const roomNumber = await findAvailableRoom(booking.check_in, booking.check_out, booking.room_type);
            
            if (roomNumber) {
                // Update booking with allocated room
                const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ room_number: roomNumber })
                    .eq('id', booking.id);
                
                if (updateError) {
                    console.error(`❌ Error allocating room ${roomNumber} to booking ${booking.id}:`, updateError);
                } else {
                    console.log(`✅ Allocated Room ${roomNumber} to ${booking.guest_name} (${booking.booking_reference})`);
                }
            } else {
                console.warn(`⚠️ No available room for ${booking.guest_name} (${booking.room_type})`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error in auto room allocation:', error);
    }
}

// Find an available room for given dates and type - Using actual Tima Sara Hotel layout
async function findAvailableRoom(checkIn, checkOut, roomType) {
    try {
        // Get all bookings that overlap with the requested dates
        const { data: overlappingBookings, error } = await supabase
            .from('bookings')
            .select('room_number')
            .not('room_number', 'is', null)
            .or(`and(check_in.lt.${checkOut},check_out.gt.${checkIn})`);
        
        if (error) throw error;
        
        // Extract occupied room numbers
        const occupiedRooms = overlappingBookings.map(b => b.room_number);
        
        // ACTUAL TIMA SARA HOTEL ROOM LAYOUT
        const roomRanges = {
            'Standard': [
                '004', '005',                                    // Ground Floor
                '102', '103', '104',                            // First Floor
                '202', '203', '204',                            // Second Floor
                '302', '303', '304'                             // Third Floor
            ],  // Total: 11 Standard rooms
            
            'Executive': [
                '002', '003',                                   // Ground Floor
                '101', '105', '106',                            // First Floor
                '201', '205', '206',                            // Second Floor
                '301', '305', '306'                             // Third Floor
            ],  // Total: 11 Executive rooms
            
            'Deluxe': [
                '107',                                          // First Floor
                '207',                                          // Second Floor
                '307'                                           // Third Floor
            ],  // Total: 3 Deluxe rooms
            
            'Royal Suite': [
                '108',                                          // First Floor
                '208',                                          // Second Floor
                '308'                                           // Third Floor
            ]   // Total: 3 Royal Suites
        };
        
        // Total: 11 + 11 + 3 + 3 = 28 rooms
        
        // Get rooms for the requested type, fallback to all rooms
        let availableRooms = roomRanges[roomType] || [];
        
        // If no specific type, use all rooms
        if (availableRooms.length === 0) {
            availableRooms = Object.values(roomRanges).flat();
        }
        
        // Find first available room
        for (const room of availableRooms) {
            if (!occupiedRooms.includes(room)) {
                return room;
            }
        }
        
        // If no room of preferred type, try any available room
        const allRooms = Object.values(roomRanges).flat();
        for (const room of allRooms) {
            if (!occupiedRooms.includes(room)) {
                console.log(`⚠️ Allocated ${room} (different type) for ${roomType} request`);
                return room;
            }
        }
        
        return null; // No rooms available
        
    } catch (error) {
        console.error('Error finding available room:', error);
        return null;
    }
}

// Load room status (Available, Occupied, etc.)
async function loadRoomStatus() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's bookings (checked-in or overlapping)
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('room_number, status')
            .or(`and(check_in.lte.${today},check_out.gt.${today})`);
        
        if (error) throw error;
        
        // Count by status
        const checkedInRooms = bookings.filter(b => b.status === 'checked-in' && b.room_number).length;
        const confirmedRooms = bookings.filter(b => b.status === 'confirmed' && b.room_number).length;
        const occupiedCount = checkedInRooms;
        const reservedCount = confirmedRooms;
        const availableCount = TOTAL_ROOMS - occupiedCount - reservedCount;
        
        // Update display
        document.getElementById('availableRooms').textContent = availableCount;
        document.getElementById('occupiedRooms').textContent = occupiedCount;
        document.getElementById('reservedRooms').textContent = reservedCount;
        
        console.log(`✅ Room Status: ${availableCount} available, ${occupiedCount} occupied, ${reservedCount} reserved`);
        
        // Auto-allocate rooms for bookings without room numbers
        await autoAllocateRooms();
        
    } catch (error) {
        console.error('Error loading room status:', error);
    }
}

// Load upcoming arrivals (today's check-ins)
async function loadUpcomingArrivals() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: arrivals, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('check_in', today)
            .in('status', ['confirmed', 'pending'])
            .order('created_at')
            .limit(5);
        
        if (error) throw error;
        
        const arrivalsList = document.getElementById('arrivalsList');
        
        if (!arrivals || arrivals.length === 0) {
            arrivalsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #718096;">
                    No arrivals scheduled for today
                </div>
            `;
            return;
        }
        
        let html = '';
        arrivals.forEach(booking => {
            const checkInTime = new Date(booking.check_in + 'T14:00:00').toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
            
            html += `
                <div class="arrival-item">
                    <div class="arrival-info">
                        <span class="guest-name">Guest: ${booking.guest_name}</span>
                        <span class="room-number">Room: ${booking.room_number || 'TBA'}</span>
                    </div>
                    <div class="arrival-time">${checkInTime}</div>
                </div>
            `;
        });
        
        arrivalsList.innerHTML = html;
        console.log(`✅ Loaded ${arrivals.length} upcoming arrivals`);
        
    } catch (error) {
        console.error('Error loading arrivals:', error);
    }
}

// Load departures today (today's check-outs)
async function loadDeparturesToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: departures, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('check_out', today)
            .eq('status', 'checked-in')
            .order('created_at')
            .limit(5);
        
        if (error) throw error;
        
        const departuresList = document.getElementById('departuresList');
        
        if (!departures || departures.length === 0) {
            departuresList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #718096;">
                    No departures scheduled for today
                </div>
            `;
            return;
        }
        
        let html = '';
        departures.forEach(booking => {
            const checkOutTime = new Date(booking.check_out + 'T11:00:00').toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
            
            html += `
                <div class="departure-item">
                    <div class="departure-info">
                        <span class="guest-name">Guest: ${booking.guest_name}</span>
                        <span class="room-number">Room: ${booking.room_number || 'N/A'}</span>
                    </div>
                    <div class="departure-time">${checkOutTime}</div>
                </div>
            `;
        });
        
        departuresList.innerHTML = html;
        console.log(`✅ Loaded ${departures.length} departures today`);
        
    } catch (error) {
        console.error('Error loading departures:', error);
    }
}

// Load occupancy overview
async function loadOccupancyOverview() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get current occupancy
        const { data: occupiedBookings, error: occError } = await supabase
            .from('bookings')
            .select('room_number')
            .eq('status', 'checked-in')
            .lte('check_in', today)
            .gt('check_out', today);
        
        if (occError) throw occError;
        
        const occupiedCount = occupiedBookings?.length || 0;
        const occupancyRate = Math.round((occupiedCount / TOTAL_ROOMS) * 100);
        
        // Update display
        document.getElementById('occupiedCount').textContent = occupiedCount;
        document.getElementById('progressText').textContent = `${occupancyRate}%`;
        
        // Update SVG circle
        const circle = document.getElementById('progressCircle');
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (occupancyRate / 100) * circumference;
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${offset}`;
        
        // Get today's check-ins and check-outs count
        const { data: checkIns, error: ciError } = await supabase
            .from('bookings')
            .select('id')
            .eq('check_in', today);
        
        const { data: checkOuts, error: coError } = await supabase
            .from('bookings')
            .select('id')
            .eq('check_out', today);
        
        document.getElementById('checkInsToday').textContent = checkIns?.length || 0;
        document.getElementById('checkOutsToday').textContent = checkOuts?.length || 0;
        
        console.log(`✅ Occupancy: ${occupiedCount}/${TOTAL_ROOMS} (${occupancyRate}%)`);
        
    } catch (error) {
        console.error('Error loading occupancy:', error);
    }
}

// Load monthly occupancy trend (last 12 months)
async function loadMonthlyOccupancyTrend() {
    try {
        const monthLabels = [];
        const occupancyData = [];
        
        // Calculate for last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthName = date.toLocaleString('en-US', { month: 'short' });
            const yearShort = date.getFullYear().toString().slice(-2);
            
            monthLabels.push(`${monthName} '${yearShort}`);
            
            // Calculate occupancy for this month
            const occupancy = await calculateMonthOccupancy(year, month);
            occupancyData.push(occupancy);
        }
        
        // Create chart
        const ctx = document.getElementById('monthlyOccupancyChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Occupancy Rate (%)',
                    data: occupancyData,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#d4af37',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Occupancy: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Monthly occupancy trend loaded');
        
    } catch (error) {
        console.error('Error loading monthly trend:', error);
    }
}

// Calculate occupancy for a specific month
async function calculateMonthOccupancy(year, month) {
    try {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month, daysInMonth).toISOString().split('T')[0];
        
        // Get all bookings overlapping with this month
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('check_in, check_out')
            .or(`and(check_in.lte.${lastDay},check_out.gte.${firstDay})`);
        
        if (error) throw error;
        
        if (!bookings || bookings.length === 0) return 0;
        
        // Calculate total room-nights
        let totalRoomNights = 0;
        
        bookings.forEach(booking => {
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month, daysInMonth);
            
            // Find overlap
            const overlapStart = checkIn > monthStart ? checkIn : monthStart;
            const overlapEnd = checkOut < monthEnd ? checkOut : monthEnd;
            
            if (overlapStart < overlapEnd) {
                const nights = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
                totalRoomNights += nights;
            }
        });
        
        // Calculate occupancy rate
        const totalAvailableRoomNights = TOTAL_ROOMS * daysInMonth;
        const occupancyRate = (totalRoomNights / totalAvailableRoomNights) * 100;
        
        return occupancyRate;
        
    } catch (error) {
        console.error(`Error calculating occupancy for ${year}-${month}:`, error);
        return 0;
    }
}

// Setup logout
function setupLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('hms_user');
            window.location.href = 'admin-login.html';
        }
    });
}

console.log('✅ Dashboard module loaded');