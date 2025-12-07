
// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://yglehirjsxaxvrpfbvse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbGVoaXJqc3hheHZycGZidnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODA1NDAsImV4cCI6MjA3NzY1NjU0MH0.o631vL64ZMuQNDZQBs9Lx4ANILQgkq_5DrPhz36fpu8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Admin - Supabase connected!');

async function loadBookings() {
    console.log('📊 Loading bookings from Supabase...');
    
    const bookingsTable = document.getElementById('bookingsTable');
    const statsDiv = document.querySelector('.stats-grid');
    
    if (!bookingsTable) return;
    
    bookingsTable.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;">⏳ Loading bookings from database...</td></tr>';
    
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('✅ Loaded bookings:', bookings.length);
        
        bookingsTable.innerHTML = '';
        
        if (bookings.length === 0) {
            bookingsTable.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#666;">No bookings yet. When guests make bookings, they will appear here.</td></tr>';
            return;
        }
        
        // Calculate stats
        const totalBookings = bookings.length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(b => {
            const bookingDate = b.created_at ? b.created_at.split('T')[0] : '';
            return bookingDate === today;
        }).length;
        
        // Update stats
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <h3>${totalBookings}</h3>
                    <p>Total Bookings</p>
                </div>
                <div class="stat-card">
                    <h3>${pendingBookings}</h3>
                    <p>Pending Bookings</p>
                </div>
                <div class="stat-card">
                    <h3>₵${totalRevenue.toLocaleString()}</h3>
                    <p>Total Revenue</p>
                </div>
                <div class="stat-card">
                    <h3>${todayBookings}</h3>
                    <p>Today's Bookings</p>
                </div>
            `;
        }
        
        // Display bookings
        bookings.forEach(booking => {
            const row = document.createElement('tr');
            
            // Format dates - USING YOUR EXACT COLUMN NAMES
            const checkinDate = booking.check_in ? 
                new Date(booking.check_in).toLocaleDateString('en-GB') : 'N/A';
            const checkoutDate = booking.check_out ? 
                new Date(booking.check_out).toLocaleDateString('en-GB') : 'N/A';
            const bookingDate = booking.created_at ? 
                new Date(booking.created_at).toLocaleDateString('en-GB') : 'N/A';
            
            // Format guests
            let guestsDisplay = '';
            if (booking.num_adults || booking.num_children) {
                const adults = booking.num_adults || 0;
                const children = booking.num_children || 0;
                if (children > 0) {
                    guestsDisplay = `${adults} adult(s), ${children} child(ren)`;
                } else {
                    guestsDisplay = `${adults} adult(s)`;
                }
            } else {
                guestsDisplay = 'N/A';
            }
            
            row.innerHTML = `
                <td>${booking.booking_reference || 'N/A'}</td>
                <td>${booking.guest_name || 'N/A'}</td>
                <td>${booking.guest_email || 'N/A'}</td>
                <td>${booking.guest_phone || 'N/A'}</td>
                <td>${checkinDate}</td>
                <td>${checkoutDate}</td>
                <td>${booking.room_type || 'N/A'}</td>
                <td>${guestsDisplay}</td>
                <td>₵${booking.total_price ? parseFloat(booking.total_price).toLocaleString() : '0'}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status || 'pending'}</span></td>
                <td>${bookingDate}</td>
                <td>
                    <button class="print-btn" onclick='printBookingReceipt(${JSON.stringify(booking).replace(/'/g, "&apos;")})'>
                        🖨️ Print
                    </button>
                </td>
            `;
            
            bookingsTable.appendChild(row);
        });
        
        console.log('✅ Bookings displayed successfully!');
        
    } catch (error) {
        console.error('❌ Failed to load bookings:', error);
        bookingsTable.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center;padding:40px;color:#d32f2f;">
                    <div style="font-size:24px;">❌</div>
                    <div><strong>Error loading bookings</strong></div>
                    <div style="margin-top:10px;color:#666;">${error.message}</div>
                    <div style="margin-top:15px;">
                        <button onclick="loadBookings()" style="padding:10px 20px;background:#d4af37;color:white;border:none;border-radius:5px;cursor:pointer;">Try Again</button>
                    </div>
                </td>
            </tr>
        `;
    }
}

const refreshBtn = document.getElementById('refreshBookings');
if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
        console.log('🔄 Refresh clicked');
        const originalText = this.innerHTML;
        this.innerHTML = '🔄 Refreshing...';
        this.disabled = true;
        await loadBookings();
        setTimeout(() => {
            this.innerHTML = originalText;
            this.disabled = false;
        }, 500);
    });
}

const searchInput = document.getElementById('searchBookings');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        document.querySelectorAll('#bookingsTable tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin page loaded!');
    console.log('✅ Supabase:', typeof supabase !== 'undefined' ? 'CONNECTED ✓' : 'NOT CONNECTED ✗');
    loadBookings();
});

setInterval(loadBookings, 30000);

// ============================================
// PRINT BOOKING RECEIPT FROM ADMIN
// ============================================
function printBookingReceipt(booking) {
    const receiptData = {
        reference: booking.booking_reference,
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
        checkin: booking.check_in,
        checkout: booking.check_out,
        room: booking.room_type,
        guests: `${booking.num_adults || 0} adult(s)${booking.num_children ? ', ' + booking.num_children + ' child(ren)' : ''}`,
        nights: booking.nights,
        total: booking.total_price,
        status: booking.status || 'pending',
        date: booking.created_at
    };
    
    if (typeof window.printReceipt === 'function') {
        window.printReceipt(receiptData);
    } else {
        alert('Print function not available. Please refresh the page.');
    }
}

// Make function globally available
window.printBookingReceipt = printBookingReceipt;

console.log('✅ Admin.js loaded!');