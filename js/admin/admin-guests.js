// ================================
// GUEST MANAGEMENT PAGE - BULLETPROOF VERSION
// Same smart initialization as Reservations & Housekeeping
// ================================

console.log('🚀 Guest Management module loaded');

// ================================
// SMART SUPABASE INITIALIZATION
// ================================

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
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbGVoaXJqc3hheHZycGZidnNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA4MDU0MCwiZXhwIjoyMDc3NjU2NTQwfQ.Gkvs5_Upf0WVnuC7BM9rOyGI2GyaR1Ar4tYMXoIa_g8';
    
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('✅ New Supabase client created');
    return client;
}

// ================================
// DOM ELEMENTS
// ================================

const guestsTableBody = document.getElementById('guestsTableBody');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterSelect = document.getElementById('filterSelect');
const exportBtn = document.getElementById('exportBtn');

console.log('📋 Elements found:', {
    tbody: !!guestsTableBody,
    search: !!searchInput,
    searchBtn: !!searchBtn,
    filter: !!filterSelect,
    export: !!exportBtn
});

// ================================
// STATE VARIABLES
// ================================

let allGuests = [];
let filteredGuests = [];
let allBookings = [];

// ================================
// LOAD BOOKINGS & PROCESS GUESTS
// ================================

async function loadGuests() {
    console.log('📥 Loading guests from Supabase...');
    
    if (!guestsTableBody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    guestsTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7" style="text-align: center; padding: 40px;">
                <div class="loading-spinner">⏳ Loading guests...</div>
            </td>
        </tr>
    `;
    
    try {
        // Get Supabase client (global or create new)
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        console.log('🔍 Fetching bookings from Supabase...');
        
        // Load all bookings
        const { data: bookings, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Query error:', error);
            throw error;
        }
        
        console.log('✅ Loaded', bookings.length, 'bookings');
        allBookings = bookings || [];
        
        // Process bookings into unique guests
        const guestsMap = new Map();
        
        bookings.forEach(booking => {
            const email = booking.guest_email;
            
            if (!email) return; // Skip bookings without email
            
            if (!guestsMap.has(email)) {
                // New guest
                guestsMap.set(email, {
                    guest_email: email,
                    guest_name: booking.guest_name,
                    guest_phone: booking.guest_phone,
                    total_bookings: 1,
                    total_spent: parseFloat(booking.total_price || 0),
                    first_visit: booking.check_in,
                    last_visit: booking.check_in,
                    bookings: [booking]
                });
            } else {
                // Existing guest
                const guest = guestsMap.get(email);
                guest.total_bookings++;
                guest.total_spent += parseFloat(booking.total_price || 0);
                
                // Update first/last visit
                if (new Date(booking.check_in) < new Date(guest.first_visit)) {
                    guest.first_visit = booking.check_in;
                }
                if (new Date(booking.check_in) > new Date(guest.last_visit)) {
                    guest.last_visit = booking.check_in;
                }
                
                guest.bookings.push(booking);
            }
        });
        
        allGuests = Array.from(guestsMap.values());
        console.log('✅ Processed', allGuests.length, 'unique guests');
        
        applyFilters();
        
    } catch (error) {
        console.error('💥 Error loading guests:', error);
        guestsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: red;">
                    <strong>❌ Error Loading Guests</strong><br><br>
                    ${error.message || 'Unknown error'}<br><br>
                    <small>Check console (F12) for details</small><br><br>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                        🔄 Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ================================
// APPLY FILTERS
// ================================

function applyFilters() {
    console.log('🔍 Applying filters to', allGuests.length, 'guests...');
    
    let filtered = [...allGuests];
    
    // Search filter
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        filtered = filtered.filter(g => 
            (g.guest_name?.toLowerCase() || '').includes(searchTerm) ||
            (g.guest_email?.toLowerCase() || '').includes(searchTerm) ||
            (g.guest_phone?.toLowerCase() || '').includes(searchTerm)
        );
        console.log('🔎 After search:', filtered.length, 'results');
    }
    
    // Category filter
    const filter = filterSelect?.value || 'all';
    if (filter !== 'all') {
        switch(filter) {
            case 'vip':
                // Guests with 3+ bookings or GH₵2000+ spent
                filtered = filtered.filter(g => g.total_bookings >= 3 || g.total_spent >= 2000);
                break;
            case 'regular':
                // Guests with 2+ bookings
                filtered = filtered.filter(g => g.total_bookings >= 2);
                break;
            case 'new':
                // Guests with only 1 booking
                filtered = filtered.filter(g => g.total_bookings === 1);
                break;
        }
        console.log('📊 After filter:', filtered.length, 'results');
    }
    
    // Sort by total spent (descending)
    filtered.sort((a, b) => b.total_spent - a.total_spent);
    
    filteredGuests = filtered;
    console.log('✅ Final filtered:', filteredGuests.length, 'guests');
    
    displayGuests(filteredGuests);
}

// ================================
// DISPLAY GUESTS - WITH RESPONSIVE SUPPORT
// ================================

function displayGuests(guests) {
    if (!guestsTableBody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    guestsTableBody.innerHTML = '';
    
    if (!guests || guests.length === 0) {
        guestsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">👥</div>
                    <strong>No guests found</strong><br>
                    <small style="color: #666;">
                        Total: ${allGuests.length} | Filtered: ${filteredGuests.length}
                    </small>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('✅ Creating rows for', guests.length, 'guests');
    
    guests.forEach(guest => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => viewGuestDetails(guest);
        
        // Format last visit date
        const lastVisit = guest.last_visit 
            ? new Date(guest.last_visit).toLocaleDateString('en-GB', {
                day: '2-digit', 
                month: 'short', 
                year: 'numeric'
              })
            : 'Never';
        
        // Format total spent
        const totalSpent = parseFloat(guest.total_spent || 0).toLocaleString('en-GH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // ✅ ADD data-label AND sticky-col class to first column
        row.innerHTML = `
            <td class="sticky-col" data-label="Guest Name">
                <strong style="font-size: 14px; color: #2c3e50;">${guest.guest_name || 'N/A'}</strong>
            </td>
            <td data-label="Email">
                <div style="font-size: 13px; color: #34495e;">${guest.guest_email || 'N/A'}</div>
            </td>
            <td data-label="Phone">
                <div style="font-size: 13px; color: #2c3e50;">${guest.guest_phone || 'N/A'}</div>
            </td>
            <td data-label="Total Bookings">
                <strong style="font-size: 14px; color: #2980b9;">${guest.total_bookings || 0}</strong>
            </td>
            <td data-label="Total Spent">
                <strong style="font-size: 14px; color: #27ae60;">GH₵${totalSpent}</strong>
            </td>
            <td data-label="Last Visit">
                <div style="font-size: 13px; color: #7f8c8d;">${lastVisit}</div>
            </td>
            <td data-label="Actions" class="actions-cell">
                <button class="action-btn btn-view" 
                        onclick="event.stopPropagation(); viewGuestDetails(${JSON.stringify(guest).replace(/"/g, '&quot;')})"
                        style="padding: 6px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                    👁️ View
                </button>
            </td>
        `;
        
        guestsTableBody.appendChild(row);
    });
    
    console.log('✅ All guest rows created');
    updateTableLayout();
}

// ================================
// VIEW GUEST DETAILS MODAL
// ================================

function viewGuestDetails(guest) {
    console.log('👁️ Viewing guest:', guest.guest_name);
    
    // Format last visit
    const lastVisit = guest.last_visit 
        ? new Date(guest.last_visit).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
          })
        : 'Never';
    
    // Format first visit
    const firstVisit = guest.first_visit 
        ? new Date(guest.first_visit).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
          })
        : 'N/A';
    
    // Format total spent
    const totalSpent = parseFloat(guest.total_spent || 0).toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Calculate average booking value
    const avgBooking = guest.total_bookings > 0 
        ? (guest.total_spent / guest.total_bookings).toLocaleString('en-GH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : '0.00';
    
    // Determine loyalty status
    let loyaltyStatus = 'New Guest';
    let loyaltyColor = '#95a5a6';
    if (guest.total_bookings >= 5 || guest.total_spent >= 5000) {
        loyaltyStatus = '👑 Platinum VIP';
        loyaltyColor = '#9b59b6';
    } else if (guest.total_bookings >= 3 || guest.total_spent >= 2000) {
        loyaltyStatus = '⭐ Gold VIP';
        loyaltyColor = '#f39c12';
    } else if (guest.total_bookings >= 2) {
        loyaltyStatus = '🎖️ Regular Guest';
        loyaltyColor = '#3498db';
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="guestModal" onclick="closeGuestModal(event)" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px; width: 90%; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); position: relative; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: 24px;">👤 Guest Profile</h2>
                    <button onclick="document.getElementById('guestModal').remove()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: #95a5a6;">&times;</button>
                </div>
                
                <div class="modal-body">
                    <!-- Loyalty Status Badge -->
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="display: inline-block; padding: 8px 20px; background: ${loyaltyColor}; color: white; border-radius: 20px; font-size: 14px; font-weight: 700;">
                            ${loyaltyStatus}
                        </span>
                    </div>
                    
                    <div class="guest-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Contact Information</h3>
                        <p style="margin: 8px 0;"><strong>Name:</strong> ${guest.guest_name || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${guest.guest_email}" style="color: #3498db; text-decoration: none;">${guest.guest_email || 'N/A'}</a></p>
                        <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${guest.guest_phone}" style="color: #3498db; text-decoration: none;">${guest.guest_phone || 'N/A'}</a></p>
                    </div>
                    
                    <div class="guest-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Guest Statistics</h3>
                        <p style="margin: 8px 0;"><strong>Total Bookings:</strong> ${guest.total_bookings || 0}</p>
                        <p style="margin: 8px 0;"><strong>Average Booking Value:</strong> GH₵${avgBooking}</p>
                        <p style="margin: 8px 0;"><strong>First Visit:</strong> ${firstVisit}</p>
                        <p style="margin: 8px 0;"><strong>Last Visit:</strong> ${lastVisit}</p>
                    </div>
                    
                    <div class="guest-section" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; text-align: center; color: white; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Lifetime Value</h3>
                        <p style="font-size: 36px; font-weight: bold; margin: 0;">GH₵${totalSpent}</p>
                    </div>
                    
                    <div class="guest-section" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Recent Activity</h3>
                        <p style="margin: 0; color: #666; font-size: 13px;">
                            ${guest.total_bookings} booking${guest.total_bookings !== 1 ? 's' : ''} since ${firstVisit}
                        </p>
                    </div>
                </div>
                
                <div class="modal-footer" style="margin-top: 25px; text-align: center; border-top: 2px solid #e0e0e0; padding-top: 15px; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="viewGuestBookings('${guest.guest_email.replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        📋 View Bookings
                    </button>
                    <button onclick="contactGuest('${guest.guest_email.replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        📧 Contact
                    </button>
                    <button onclick="document.getElementById('guestModal').remove()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeGuestModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        document.getElementById('guestModal').remove();
    }
}

function viewGuestBookings(email) {
    console.log('📋 Viewing bookings for:', email);
    // Redirect to reservations page with search filter
    window.location.href = `admin-reservations.html?search=${encodeURIComponent(email)}`;
}

function contactGuest(email) {
    console.log('📧 Contacting:', email);
    // Open email client
    window.location.href = `mailto:${email}`;
}

// ================================
// RESPONSIVE TABLE LAYOUT SWITCHER
// ================================

function updateTableLayout() {
    const table = document.getElementById('guestsTable');
    if (!table) return;
    
    if (window.innerWidth <= 480) {
        // Card view for phones
        table.classList.add('card-view');
        table.classList.remove('sticky-view');
    } else if (window.innerWidth <= 1024) {
        // Sticky view for tablets
        table.classList.add('sticky-view');
        table.classList.remove('card-view');
    } else {
        // Normal view for desktop
        table.classList.remove('card-view', 'sticky-view');
    }
}

// ================================
// EXPORT TO CSV
// ================================

function exportToCSV() {
    if (filteredGuests.length === 0) {
        alert('⚠️ No guests to export!');
        return;
    }
    
    console.log('📥 Exporting', filteredGuests.length, 'guests to CSV...');
    
    // CSV Header
    let csv = 'Guest Name,Email,Phone,Total Bookings,Total Spent,First Visit,Last Visit\n';
    
    // CSV Data
    filteredGuests.forEach(g => {
        csv += `"${g.guest_name || 'N/A'}",`;
        csv += `"${g.guest_email || 'N/A'}",`;
        csv += `"${g.guest_phone || 'N/A'}",`;
        csv += `"${g.total_bookings || 0}",`;
        csv += `"${g.total_spent || 0}",`;
        csv += `"${g.first_visit || 'N/A'}",`;
        csv += `"${g.last_visit || 'N/A'}"\n`;
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tima-sara-guests-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ CSV exported');
}

// ================================
// INITIALIZE ON PAGE LOAD
// ================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎬 DOM loaded, initializing guest management page...');
    
    // Load guests
    await loadGuests();
    
    // Set up event listeners
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
        console.log('✅ Search button listener added');
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
        console.log('✅ Search input listener added');
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', applyFilters);
        console.log('✅ Filter select listener added');
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
        console.log('✅ Export button listener added');
    }
    
    // Responsive handler
    window.addEventListener('resize', updateTableLayout);
    console.log('✅ Resize listener added');
    
    console.log('✅ Guest management page ready!');
});