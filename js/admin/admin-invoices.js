console.log('🧾 Invoice script loading...');

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Invoice page loaded');
    
    // Check if Supabase is available
    if (!window.supabase_client) {
        console.error('❌ Supabase not available!');
        alert('Database connection failed. Please refresh the page.');
        return;
    }
    
    console.log('✅ Supabase connected');
    loadBookings();
});

// Store current invoice data
let currentInvoice = null;

// Load all bookings
async function loadBookings() {
    console.log('📡 Loading bookings...');
    
    const dropdown = document.getElementById('bookingSelect');
    
    try {
        const { data: bookings, error } = await window.supabase_client
            .from('bookings')
            .select('*')
            .order('check_in', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Found ${bookings.length} bookings`);
        
        // Populate dropdown
        dropdown.innerHTML = '<option value="">Select a booking...</option>';
        
        bookings.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.id;
            option.textContent = `${booking.booking_reference} - ${booking.guest_name} - Room ${booking.room_number || booking.room_type}`;
            dropdown.appendChild(option);
        });
        
        // Listen for selection
        dropdown.addEventListener('change', function() {
            if (this.value) {
                generateInvoice(this.value);
            } else {
                document.getElementById('invoiceCard').style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Failed to load bookings: ' + error.message);
    }
}

// Generate invoice for selected booking
async function generateInvoice(bookingId) {
    console.log('📄 Generating invoice for:', bookingId);
    
    try {
        // Get booking details
        const { data: booking, error: bookingError } = await window.supabase_client
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        
        if (bookingError) throw bookingError;
        
        console.log('✅ Got booking:', booking.booking_reference);
        
        // Get F&B charges
        const { data: charges, error: chargesError } = await window.supabase_client
            .from('guest_charges')
            .select('*')
            .eq('booking_id', bookingId)
            .order('charge_date', { ascending: true });
        
        if (chargesError) {
            console.warn('⚠️ No charges found:', chargesError);
        }
        
        console.log(`💰 Found ${charges ? charges.length : 0} F&B charges`);
        
        // Calculate totals
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        const roomTotal = parseFloat(booking.total_price || 0);
        const fbTotal = charges ? charges.reduce((sum, c) => sum + parseFloat(c.total_amount), 0) : 0;
        const grandTotal = roomTotal + fbTotal;
        
        // Store for email
        currentInvoice = { booking, charges, grandTotal };
        
        // Build invoice HTML
        let invoiceHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a365d; margin: 0;">TIMA SARA HOTEL</h1>
                <p style="color: #666;">Tamale, Northern Region, Ghana</p>
                <h2 style="color: #d4af37; margin-top: 20px;">GUEST INVOICE</h2>
                <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
            
            <hr style="border: 2px solid #d4af37; margin: 30px 0;">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #1a365d;">Guest Details</h3>
                    <p><strong>Name:</strong> ${booking.guest_name}</p>
                    <p><strong>Email:</strong> ${booking.guest_email}</p>
                    <p><strong>Phone:</strong> ${booking.guest_phone}</p>
                </div>
                <div>
                    <h3 style="color: #1a365d;">Booking Details</h3>
                    <p><strong>Reference:</strong> ${booking.booking_reference}</p>
                    <p><strong>Room:</strong> ${booking.room_number || '—'}</p>
                    <p><strong>Check-in:</strong> ${checkIn.toLocaleDateString('en-GB')}</p>
                    <p><strong>Check-out:</strong> ${checkOut.toLocaleDateString('en-GB')}</p>
                </div>
            </div>
            
            <hr style="border: 1px solid #ddd; margin: 30px 0;">
            
            <h3 style="color: #1a365d;">ROOM CHARGES</h3>
            <table style="width: 100%; margin-bottom: 30px;">
                <tr>
                    <td>${booking.room_type}</td>
                    <td style="text-align: right;">${nights} night(s)</td>
                    <td style="text-align: right; font-weight: bold;">₵${roomTotal.toFixed(2)}</td>
                </tr>
            </table>
        `;
        
        // Add F&B charges if any
        if (charges && charges.length > 0) {
            invoiceHTML += `
                <h3 style="color: #1a365d;">FOOD & BEVERAGE CHARGES</h3>
                <table style="width: 100%; margin-bottom: 30px;">
            `;
            
            charges.forEach(charge => {
                invoiceHTML += `
                    <tr>
                        <td>${charge.item_description}</td>
                        <td style="text-align: center;">${charge.quantity}x @ ₵${parseFloat(charge.unit_price).toFixed(2)}</td>
                        <td style="text-align: right; font-weight: bold;">₵${parseFloat(charge.total_amount).toFixed(2)}</td>
                    </tr>
                `;
            });
            
            invoiceHTML += `
                    <tr style="border-top: 1px solid #ddd;">
                        <td colspan="2" style="text-align: right; padding-top: 10px;"><strong>F&B Subtotal:</strong></td>
                        <td style="text-align: right; padding-top: 10px; font-weight: bold;">₵${fbTotal.toFixed(2)}</td>
                    </tr>
                </table>
            `;
        }
        
        // Grand total
        invoiceHTML += `
            <hr style="border: 2px solid #d4af37; margin: 30px 0;">
            
            <div style="text-align: right; font-size: 24px; color: #d4af37; font-weight: bold; margin: 30px 0;">
                GRAND TOTAL: ₵${grandTotal.toFixed(2)}
            </div>
            
            <hr style="border: 1px solid #ddd; margin: 30px 0;">
            
            <p style="text-align: center; color: #666;">
                Thank you for staying with us at Tima Sara Hotel!
            </p>
        `;
        
        // Display invoice
        document.getElementById('invoiceContent').innerHTML = invoiceHTML;
        document.getElementById('invoiceCard').style.display = 'block';
        
        console.log('✅ Invoice generated successfully');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Failed to generate invoice: ' + error.message);
    }
}

// Email invoice
function emailInvoice() {
    if (!currentInvoice) {
        alert('⚠️ Please select a booking first');
        return;
    }
    
    const { booking, grandTotal } = currentInvoice;
    
    const subject = `Invoice - ${booking.booking_reference}`;
    const body = `Dear ${booking.guest_name},\n\nYour invoice for ${booking.booking_reference}:\nTotal: ₵${grandTotal.toFixed(2)}\n\nThank you!\nTima Sara Hotel`;
    
    window.location.href = `mailto:${booking.guest_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ Invoice script loaded');