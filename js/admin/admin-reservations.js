// ================================
// RESERVATIONS PAGE - BULLETPROOF VERSION
// Handles both global and local Supabase initialization
// ================================

console.log('🚀 Reservations script loading...');

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

const bookingsTableBody = document.getElementById('bookingsTableBody');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const exportBtn = document.getElementById('exportBtn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

console.log('📋 Elements found:', {
    tbody: !!bookingsTableBody,
    search: !!searchInput,
    searchBtn: !!searchBtn,
    statusFilter: !!statusFilter,
    dateFilter: !!dateFilter,
    exportBtn: !!exportBtn,
    pagination: !!(prevPageBtn && nextPageBtn)
});

// ================================
// STATE
// ================================

let allBookings = [];
let filteredBookings = [];
let currentPage = 1;
const itemsPerPage = 20;

// ================================
// LOAD BOOKINGS
// ================================

async function loadBookings() {
    console.log('📥 Loading bookings from Supabase...');
    
    if (!bookingsTableBody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    bookingsTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7" style="text-align: center; padding: 40px;">
                <div class="loading-spinner">⏳ Loading bookings...</div>
            </td>
        </tr>
    `;
    
    try {
        // Get Supabase client (global or create new)
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        console.log('🔍 Fetching from bookings table...');
        console.log('🔧 Supabase client type:', typeof supabaseClient);
        console.log('🔧 Has .from method?', typeof supabaseClient.from === 'function');
        
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('📊 Query result:', { 
            success: !error,
            count: data ? data.length : 0,
            error: error || 'none'
        });
        
        if (error) {
            console.error('❌ Query error:', error);
            throw error;
        }
        
        console.log('✅ Bookings loaded:', data.length);
        if (data.length > 0) {
            console.log('📋 First booking:', data[0]);
        }
        
        allBookings = data || [];
        applyFilters();
        
    } catch (error) {
        console.error('💥 Error loading bookings:', error);
        console.error('💥 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: red;">
                    <strong>❌ Error Loading Bookings</strong><br><br>
                    ${error.message || 'Unknown error'}<br><br>
                    <small>Check console (F12) for full details</small><br><br>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                        🔄 Reload Page
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
    console.log('🔍 Applying filters to', allBookings.length, 'bookings...');
    
    let filtered = [...allBookings];
    
    // Search filter
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        filtered = filtered.filter(b => 
            (b.guest_name?.toLowerCase() || '').includes(searchTerm) ||
            (b.guest_email?.toLowerCase() || '').includes(searchTerm) ||
            (b.guest_phone?.toLowerCase() || '').includes(searchTerm) ||
            (b.room_number?.toLowerCase() || '').includes(searchTerm) ||
            (b.reference?.toLowerCase() || '').includes(searchTerm)
        );
        console.log('🔎 After search:', filtered.length, 'results');
    }
    
    // Status filter
    const status = statusFilter?.value || 'all';
    if (status !== 'all') {
        filtered = filtered.filter(b => b.status?.toLowerCase() === status);
        console.log('📊 After status filter:', filtered.length, 'results');
    }
    
    // Date filter
    const dateRange = dateFilter?.value || 'all';
    if (dateRange !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filtered = filtered.filter(b => {
            const checkIn = new Date(b.check_in);
            checkIn.setHours(0, 0, 0, 0);
            
            switch(dateRange) {
                case 'today': 
                    return checkIn.getTime() === today.getTime();
                case 'tomorrow':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    return checkIn.getTime() === tomorrow.getTime();
                case 'week':
                    const weekEnd = new Date(today);
                    weekEnd.setDate(today.getDate() + 7);
                    return checkIn >= today && checkIn <= weekEnd;
                case 'month':
                    const monthEnd = new Date(today);
                    monthEnd.setMonth(today.getMonth() + 1);
                    return checkIn >= today && checkIn <= monthEnd;
                default: 
                    return true;
            }
        });
        console.log('📅 After date filter:', filtered.length, 'results');
    }
    
    filteredBookings = filtered;
    console.log('✅ Final filtered:', filteredBookings.length, 'bookings');
    
    currentPage = 1;
    displayCurrentPage();
    updatePagination();
}

// ================================
// DISPLAY CURRENT PAGE
// ================================

function displayCurrentPage() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageBookings = filteredBookings.slice(start, end);
    
    console.log(`📄 Page ${currentPage} - Showing ${pageBookings.length} bookings`);
    displayBookings(pageBookings);
}

// ================================
// DISPLAY BOOKINGS - 7 COLUMNS ONLY
// ================================

function displayBookings(bookings) {
    if (!bookingsTableBody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    bookingsTableBody.innerHTML = '';
    
    if (!bookings || bookings.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                    <strong>No bookings found</strong><br>
                    <small style="color: #666;">
                        Total: ${allBookings.length} | Filtered: ${filteredBookings.length}
                    </small>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('✅ Creating rows for', bookings.length, 'bookings');
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => viewBookingDetails(booking);
        
        // Format dates
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-GB', {
            day: '2-digit', 
            month: 'short', 
            year: 'numeric'
        });
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-GB', {
            day: '2-digit', 
            month: 'short', 
            year: 'numeric'
        });
        
        // Calculate nights
        const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
        
        // Format price
        const price = parseFloat(booking.total_price || 0).toLocaleString('en-GH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // ✅ EXACTLY 7 COLUMNS - MATCHING YOUR HEADER
        row.innerHTML = `
            <td class="sticky-col" data-label="Guest Name">
                <div class="guest-name-cell">
                    <strong style="font-size: 14px; color: #2c3e50;">${booking.guest_name || 'N/A'}</strong>
                    <span class="mobile-meta" style="display: none; font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                        ${nights} night${nights !== 1 ? 's' : ''} • GH₵${price}
                    </span>
                </div>
            </td>
            <td data-label="Contact">
                <div class="contact-cell">
                    <div style="font-size: 13px; color: #34495e;">${booking.guest_email || 'N/A'}</div>
                    <div class="sub-info" style="font-size: 12px; color: #95a5a6; margin-top: 3px;">${booking.guest_phone || 'N/A'}</div>
                </div>
            </td>
            <td data-label="Check In">
                <div class="date-cell" style="font-size: 13px; color: #2c3e50;">${checkIn}</div>
            </td>
            <td data-label="Check Out">
                <div class="date-cell" style="font-size: 13px; color: #2c3e50;">${checkOut}</div>
            </td>
            <td data-label="Room">
                <div class="room-cell">
                    <strong style="font-size: 14px; color: #2980b9;">${booking.room_number || 'Unassigned'}</strong>
                    <div class="sub-info" style="font-size: 11px; color: #7f8c8d; margin-top: 2px;">${booking.room_type || 'N/A'}</div>
                </div>
            </td>
            <td data-label="Status">
                <span class="status-badge status-${(booking.status || 'pending').toLowerCase().replace(/\s/g, '-')}" 
                      style="padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                    ${booking.status || 'Pending'}
                </span>
            </td>
            <td data-label="Actions" class="actions-cell">
                <button class="action-btn btn-view" 
                        onclick="event.stopPropagation(); viewBookingDetails(${JSON.stringify(booking).replace(/"/g, '&quot;')})"
                        style="padding: 6px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                    👁️ View
                </button>
            </td>
        `;
        
        bookingsTableBody.appendChild(row);
    });
    
    console.log('✅ All rows created');
    updateTableLayout();
}

// ================================
// VIEW BOOKING DETAILS MODAL
// ================================

function viewBookingDetails(booking) {
    console.log('👁️ Viewing booking:', booking.reference || booking.id);
    
    const checkIn = new Date(booking.check_in).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit', 
        month: 'long', 
        year: 'numeric'
    });
    const checkOut = new Date(booking.check_out).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit', 
        month: 'long', 
        year: 'numeric'
    });
    
    const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
    
    const price = parseFloat(booking.total_price || 0).toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    const modalHTML = `
        <div class="modal-overlay" id="bookingModal" onclick="closeModal(event)" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px; width: 90%; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); position: relative; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="border-bottom: 2px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: 24px;">📋 Booking Details</h2>
                    <button onclick="document.getElementById('bookingModal').remove()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: #95a5a6;">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="booking-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Guest Information</h3>
                        <p style="margin: 8px 0;"><strong>Name:</strong> ${booking.guest_name || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${booking.guest_email}" style="color: #3498db;">${booking.guest_email || 'N/A'}</a></p>
                        <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${booking.guest_phone}" style="color: #3498db;">${booking.guest_phone || 'N/A'}</a></p>
                    </div>
                    
                    <div class="booking-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Stay Details</h3>
                        <p style="margin: 8px 0;"><strong>Check-In:</strong> ${checkIn}</p>
                        <p style="margin: 8px 0;"><strong>Check-Out:</strong> ${checkOut}</p>
                        <p style="margin: 8px 0;"><strong>Duration:</strong> ${nights} night${nights !== 1 ? 's' : ''}</p>
                    </div>
                    
                    <div class="booking-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Room Details</h3>
                        <p style="margin: 8px 0;"><strong>Room Number:</strong> ${booking.room_number || 'Not assigned'}</p>
                        <p style="margin: 8px 0;"><strong>Room Type:</strong> ${booking.room_type || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Adults:</strong> ${booking.adults || 1}</p>
                        <p style="margin: 8px 0;"><strong>Children:</strong> ${booking.children || 0}</p>
                    </div>
                    
                    <div class="booking-section" style="margin-bottom: 20px;">
                        <h3 style="color: #34495e; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">Booking Status</h3>
                        <p style="margin: 8px 0;"><strong>Status:</strong> <span class="status-badge status-${(booking.status || 'pending').toLowerCase().replace(/\s/g, '-')}" style="padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-left: 10px;">${booking.status || 'Pending'}</span></p>
                        <p style="margin: 8px 0;"><strong>Reference:</strong> ${booking.reference || 'N/A'}</p>
                        ${booking.special_requests ? `<p style="margin: 8px 0;"><strong>Special Requests:</strong> ${booking.special_requests}</p>` : ''}
                    </div>
                    
                    <div class="booking-section" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                        <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 5px 0;">Total Amount</h3>
                        <p style="font-size: 32px; font-weight: bold; color: #d4af37; margin: 0;">GH₵${price}</p>
                    </div>
                </div>
                
                <div class="modal-footer" style="margin-top: 25px; text-align: center; border-top: 2px solid #e0e0e0; padding-top: 15px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px; font-size: 14px;">🖨️ Print</button>
                    <button onclick="document.getElementById('bookingModal').remove()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        document.getElementById('bookingModal').remove();
    }
}

// ================================
// PAGINATION
// ================================

function updatePagination() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
        prevPageBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevPageBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage === totalPages;
        nextPageBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextPageBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
    }
}

function goToPage(direction) {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
        displayCurrentPage();
        updatePagination();
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
        displayCurrentPage();
        updatePagination();
    }
}

// ================================
// RESPONSIVE TABLE LAYOUT
// ================================

function updateTableLayout() {
    const table = document.getElementById('bookingsTable');
    if (!table) return;
    
    if (window.innerWidth <= 480) {
        // Card view for phones
        table.classList.add('card-view');
        table.classList.remove('sticky-view');
        
        // Show mobile meta
        document.querySelectorAll('.mobile-meta').forEach(el => {
            el.style.display = 'block';
        });
    } else if (window.innerWidth <= 1024) {
        // Sticky view for tablets
        table.classList.add('sticky-view');
        table.classList.remove('card-view');
        
        // Hide mobile meta
        document.querySelectorAll('.mobile-meta').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        // Normal view for desktop
        table.classList.remove('card-view', 'sticky-view');
        
        // Hide mobile meta
        document.querySelectorAll('.mobile-meta').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ================================
// EXPORT TO CSV
// ================================

function exportToCSV() {
    if (filteredBookings.length === 0) {
        alert('⚠️ No bookings to export!');
        return;
    }
    
    console.log('📥 Exporting', filteredBookings.length, 'bookings to CSV...');
    
    // CSV Header
    let csv = 'Guest Name,Email,Phone,Check In,Check Out,Room Number,Room Type,Adults,Children,Status,Total Price,Reference\n';
    
    // CSV Data
    filteredBookings.forEach(b => {
        csv += `"${b.guest_name || 'N/A'}",`;
        csv += `"${b.guest_email || 'N/A'}",`;
        csv += `"${b.guest_phone || 'N/A'}",`;
        csv += `"${b.check_in || 'N/A'}",`;
        csv += `"${b.check_out || 'N/A'}",`;
        csv += `"${b.room_number || 'Unassigned'}",`;
        csv += `"${b.room_type || 'N/A'}",`;
        csv += `"${b.adults || 1}",`;
        csv += `"${b.children || 0}",`;
        csv += `"${b.status || 'Pending'}",`;
        csv += `"${b.total_price || 0}",`;
        csv += `"${b.reference || 'N/A'}"\n`;
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tima-sara-bookings-${new Date().toISOString().split('T')[0]}.csv`;
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
    console.log('🎬 DOM loaded, initializing reservations page...');
    
    // Load bookings
    await loadBookings();
    
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
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
        console.log('✅ Status filter listener added');
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
        console.log('✅ Date filter listener added');
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
        console.log('✅ Export button listener added');
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => goToPage('prev'));
        console.log('✅ Previous page button listener added');
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => goToPage('next'));
        console.log('✅ Next page button listener added');
    }
    
    // Responsive handler
    window.addEventListener('resize', updateTableLayout);
    console.log('✅ Resize listener added');
    
    console.log('✅ Reservations page ready!');
});