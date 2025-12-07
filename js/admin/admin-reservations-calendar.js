console.log('📅 Calendar module loading...');

const supabase = window.supabase_client;

// Calendar state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let allRooms = [];
let allBookings = [];

// Initialize calendar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Calendar page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    await loadRoomsAndBookings();
    renderCalendar();
    setupNavigation();
});

// Load rooms and bookings from Supabase
async function loadRoomsAndBookings() {
    console.log('📡 Loading rooms and bookings...');
    
    try {
        // Load all bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .order('room_number');
        
        if (error) throw error;
        
        allBookings = bookings || [];
        console.log(`✅ Loaded ${allBookings.length} bookings`);
        
        // ACTUAL TIMA SARA HOTEL ROOM LAYOUT (28 rooms)
        allRooms = [
            // Ground Floor (4 rooms)
            '002', '003', '004', '005',
            // First Floor (8 rooms)
            '101', '102', '103', '104', '105', '106', '107', '108',
            // Second Floor (8 rooms)
            '201', '202', '203', '204', '205', '206', '207', '208',
            // Third Floor (8 rooms)
            '301', '302', '303', '304', '305', '306', '307', '308'
        ];
        
        console.log(`✅ Using ${allRooms.length} actual hotel rooms`);
        
        await loadBookingsForMonth();
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        alert('Failed to load calendar data: ' + error.message);
    }
}

// Load bookings for the current displayed month
async function loadBookingsForMonth() {
    try {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - 7);
        
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + 7);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .or(`check_in.lte.${endStr},check_out.gte.${startStr}`);
        
        if (error) throw error;
        
        allBookings = bookings || [];
        console.log(`✅ Loaded ${allBookings.length} bookings for ${firstDay.toLocaleDateString()}`);
        
    } catch (error) {
        console.error('❌ Error loading bookings:', error);
    }
}

// Render the calendar with horizontal scroll (like the sample image)
function renderCalendar() {
    console.log('🎨 Rendering calendar...');
    
    const calendarBody = document.getElementById('calendarBody');
    const monthYearDisplay = document.getElementById('monthYear');
    
    if (!calendarBody || !monthYearDisplay) {
        console.error('❌ Calendar elements not found');
        return;
    }
    
    // Update month/year display
    const monthName = new Date(currentYear, currentMonth).toLocaleString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();
    monthYearDisplay.textContent = monthName;
    
    // Get calendar data - Start exactly on the 1st of the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Start date is exactly the 1st of the month
    const startDate = new Date(currentYear, currentMonth, 1);
    
    // Show the full month (from 1st to last day)
    const totalDaysToShow = daysInMonth;
    
    // Create scrollable container with table
    let html = '<div style="overflow-x: auto; max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px;">';
    html += '<table style="border-collapse: collapse; min-width: 100%; background: white;">';
    
    // Create header row
    html += '<thead><tr>';
    
    // Sticky room header
    html += `<th style="
        position: sticky;
        left: 0;
        background: #1a365d;
        color: white;
        padding: 16px 20px;
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        border: 1px solid #2d3748;
        z-index: 30;
        min-width: 120px;
        max-width: 120px;
        box-shadow: 2px 0 8px rgba(0,0,0,0.15);
    ">ROOM</th>`;
    
    // Date headers - start from the actual day the 1st falls on
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday
    
    for (let i = 0; i < totalDaysToShow; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Calculate correct day name
        const dayIndex = (firstDayOfWeek + i) % 7;
        const dayName = dayNames[dayIndex];
        const dateNum = currentDate.getDate();
        
        const headerBg = 'linear-gradient(135deg, #1a365d, #2d3748)';
        
        html += `<th style="
            padding: 12px;
            text-align: center;
            font-size: 11px;
            border: 1px solid #2d3748;
            background: ${headerBg};
            color: white;
            min-width: 100px;
            max-width: 100px;
            white-space: nowrap;
        ">
            <div style="font-weight: 600; letter-spacing: 0.5px;">${dayName}</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">${dateNum}</div>
        </th>`;
    }
    
    html += '</tr></thead>';
    
    // Create body with rooms
    html += '<tbody>';
    
    allRooms.forEach((roomNumber, rowIndex) => {
        const rowBg = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        html += '<tr>';
        
        // Sticky room cell
        html += `<td style="
            position: sticky;
            left: 0;
            background: ${rowBg};
            padding: 18px;
            text-align: center;
            font-weight: 700;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            z-index: 20;
            min-width: 120px;
            max-width: 120px;
            box-shadow: 2px 0 5px rgba(0,0,0,0.08);
        ">
            <div style="color: #2d3748;">Room ${roomNumber}</div>
        </td>`;
        
        // Date cells
        for (let i = 0; i < totalDaysToShow; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Find bookings for this room and date
            const dayBookings = allBookings.filter(booking => {
                if (booking.room_number !== roomNumber) return false;
                
                const checkIn = new Date(booking.check_in);
                const checkOut = new Date(booking.check_out);
                
                checkIn.setHours(0, 0, 0, 0);
                checkOut.setHours(0, 0, 0, 0);
                currentDate.setHours(0, 0, 0, 0);
                
                return currentDate >= checkIn && currentDate < checkOut;
            });
            
            let cellContent = '';
            let cellBg = rowBg; // Use alternating row background
            let cellStyle = `
                padding: 0;
                text-align: center;
                vertical-align: middle;
                border: 1px solid #e2e8f0;
                min-width: 100px;
                max-width: 100px;
                height: 70px;
                background: ${cellBg};
            `;
            
            // Display booking info
            if (dayBookings.length > 0) {
                const booking = dayBookings[0];
                const checkInDate = new Date(booking.check_in);
                checkInDate.setHours(0, 0, 0, 0);
                
                const isFirstDay = currentDate.getTime() === checkInDate.getTime();
                
                // Status colors matching sample
                const statusColors = {
                    'confirmed': '#48bb78',      // Green
                    'pending': '#ed8936',        // Orange
                    'checked-in': '#4299e1',     // Blue
                    'checked-out': '#718096',    // Gray
                    'cancelled': '#f56565'       // Red
                };
                
                const bgColor = statusColors[booking.status] || '#cbd5e0';
                
                if (isFirstDay) {
                    // Show guest name on first day - centered and visible
                    const firstName = booking.guest_name.split(' ')[0];
                    const guestInitials = booking.guest_name.split(' ').map(n => n[0]).join('');
                    
                    cellContent = `
                        <div onclick='showBookingDetails(${JSON.stringify(booking).replace(/'/g, "&apos;")})' 
                             style="
                                height: 100%;
                                width: 100%;
                                background: ${bgColor};
                                color: white;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                transition: opacity 0.2s;
                                padding: 8px 4px;
                             "
                             onmouseover="this.style.opacity='0.85'"
                             onmouseout="this.style.opacity='1'"
                             title="Click for details: ${booking.guest_name}">
                            <div style="font-size: 13px; font-weight: 600; line-height: 1.2; text-align: center;">
                                ${firstName}
                            </div>
                            <div style="font-size: 10px; margin-top: 4px; opacity: 0.9; font-weight: 500;">
                                ${guestInitials}
                            </div>
                        </div>
                    `;
                } else {
                    // Continuation of booking - just colored background, clickable
                    cellContent = `
                        <div onclick='showBookingDetails(${JSON.stringify(booking).replace(/'/g, "&apos;")})' 
                             style="
                                height: 100%;
                                width: 100%;
                                background: ${bgColor};
                                cursor: pointer;
                                transition: opacity 0.2s;
                             "
                             onmouseover="this.style.opacity='0.85'"
                             onmouseout="this.style.opacity='1'"
                             title="Click for details: ${booking.guest_name}">
                        </div>
                    `;
                }
            }
            
            html += `<td style="${cellStyle}">${cellContent}</td>`;
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    calendarBody.innerHTML = html;
    
    console.log('✅ Calendar rendered');
}

// Show booking details in alert (matching the detailed format)
function showBookingDetails(booking) {
    const checkIn = new Date(booking.check_in).toLocaleDateString('en-GB');
    const checkOut = new Date(booking.check_out).toLocaleDateString('en-GB');
    const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));
    
    const details = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BOOKING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔖 Reference: ${booking.booking_reference}
👤 Guest Name: ${booking.guest_name}
📧 Email: ${booking.guest_email}
📞 Phone: ${booking.guest_phone}

🏠 Room Number: ${booking.room_number}
🛏️  Room Type: ${booking.room_type}

📅 Check-In: ${checkIn}
📅 Check-Out: ${checkOut}
🌙 Duration: ${nights} Night(s)

👥 Guests: ${booking.num_adults} Adult(s)${booking.num_children ? ', ' + booking.num_children + ' Child(ren)' : ''}

💰 Total Price: ₵${parseFloat(booking.total_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}

🏷️  Status: ${booking.status.toUpperCase()}

${booking.special_requests ? `📝 Special Requests:\n${booking.special_requests}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    alert(details);
}

// Setup navigation
function setupNavigation() {
    document.getElementById('prevMonth')?.addEventListener('click', async () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        await loadBookingsForMonth();
        renderCalendar();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', async () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        await loadBookingsForMonth();
        renderCalendar();
    });
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ Calendar module loaded');