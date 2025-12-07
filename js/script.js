

// EmailJS initialization (should be near the top of script.js)
(function() {
    emailjs.init("a090NQ98p8bbpZ-jK"); // Replace with your actual key
})();

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://yglehirjsxaxvrpfbvse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbGVoaXJqc3hheHZycGZidnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODA1NDAsImV4cCI6MjA3NzY1NjU0MH0.o631vL64ZMuQNDZQBs9Lx4ANILQgkq_5DrPhz36fpu8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client initialized!');



// ============================================
// NAVIGATION SCROLL EFFECT
// ============================================
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (nav) {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(0, 0, 0, 0.95)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.background = 'rgba(0, 0, 0, 0.8)';
            nav.style.backdropFilter = 'blur(5px)';
        }
    }
});

// ============================================
// BOOKING FORM WITH SUPABASE
// ============================================
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
    console.log('✅ Booking form found!');
    
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    const adultsInput = document.getElementById('adults');
    const childrenInput = document.getElementById('children');
    const totalPriceDiv = document.getElementById('totalPrice');
    const specialRequestsInput = document.getElementById('specialRequests');
    
    if (checkInInput && checkOutInput) {
        const today = new Date().toISOString().split('T')[0];
        checkInInput.setAttribute('min', today);
        checkOutInput.setAttribute('min', today);
        
        checkInInput.addEventListener('change', function() {
            const checkinDate = new Date(this.value);
            checkinDate.setDate(checkinDate.getDate() + 1);
            const minCheckout = checkinDate.toISOString().split('T')[0];
            checkOutInput.setAttribute('min', minCheckout);
            calculatePrice();
        });
        
        checkOutInput.addEventListener('change', calculatePrice);
    }
    
    if (adultsInput) adultsInput.addEventListener('change', calculatePrice);
    if (childrenInput) childrenInput.addEventListener('change', calculatePrice);
    
    const roomRadios = document.querySelectorAll('input[name="roomType"]');
    roomRadios.forEach(radio => radio.addEventListener('change', calculatePrice));
    
    function calculatePrice() {
        if (!checkInInput || !checkOutInput) return null;
        
        const checkin = new Date(checkInInput.value);
        const checkout = new Date(checkOutInput.value);
        
        if (checkin && checkout && checkout > checkin) {
            const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            
            const selectedRoom = document.querySelector('input[name="roomType"]:checked');
            let roomPrice = 530;
            let roomTypeName = 'Standard Room';
            
            if (selectedRoom) {
                const roomValue = selectedRoom.value;
                if (roomValue === 'standard') { roomPrice = 530; roomTypeName = 'Standard Room'; }
                else if (roomValue === 'executive') { roomPrice = 800; roomTypeName = 'Executive Room'; }
                else if (roomValue === 'deluxe') { roomPrice = 1500; roomTypeName = 'Deluxe Room'; }
                else if (roomValue === 'royal') { roomPrice = 2500; roomTypeName = 'Royal Suite'; }
            }
            
            const adults = adultsInput ? parseInt(adultsInput.value) || 2 : 2;
            const children = childrenInput ? parseInt(childrenInput.value) || 0 : 0;
            
            const basePrice = roomPrice * nights;
            const guestSurcharge = (adults + children) > 2 ? ((adults + children) - 2) * 20 * nights : 0;
            const totalPrice = basePrice + guestSurcharge;
            
            if (totalPriceDiv) {
                totalPriceDiv.textContent = `Total: ₵${totalPrice.toLocaleString()} for ${nights} night(s)`;
            }
            
            return { totalPrice, nights, roomTypeName, adults, children };
        }
        
        if (totalPriceDiv) totalPriceDiv.textContent = 'Total: ₵0';
        return null;
    }
    
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Form submitted!');
        
        if (!firstNameInput || !lastNameInput || !emailInput || !phoneInput || !checkInInput || !checkOutInput) {
            alert('Please fill in all required fields');
            return;
        }
        
        const checkin = new Date(checkInInput.value);
        const checkout = new Date(checkOutInput.value);
        
        if (checkout <= checkin) {
            alert('❌ Checkout date must be after check-in date');
            return;
        }
        
        const selectedRoom = document.querySelector('input[name="roomType"]:checked');
        if (!selectedRoom) {
            alert('❌ Please select a room type');
            return;
        }
        
        const submitBtn = bookingForm.querySelector('.submit-booking-btn') || bookingForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        
        if (submitBtn) {
            submitBtn.textContent = '💾 Saving booking...';
            submitBtn.disabled = true;
        }
        
        const priceInfo = calculatePrice();
        if (!priceInfo) {
            alert('❌ Please fill in all booking details');
            if (submitBtn) {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
            return;
        }
        
        const bookingRef = 'TSH-' + Date.now();
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const fullName = `${firstName} ${lastName}`;
        const guestEmail = emailInput.value.trim();
        const guestPhone = phoneInput.value.trim();
        
        let guestCount = priceInfo.children > 0 ? 
            `${priceInfo.adults} adult(s), ${priceInfo.children} child(ren)` : 
            `${priceInfo.adults} adult(s)`;
        
        const checkinFormatted = checkin.toLocaleDateString('en-GB');
        const checkoutFormatted = checkout.toLocaleDateString('en-GB');
        
        console.log('💾 Saving to Supabase...');
        
        // MATCH YOUR EXACT TABLE STRUCTURE
        const bookingData = {
            booking_reference: bookingRef,
            guest_name: fullName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
            check_in: checkInInput.value,        // Using check_in (not checkin_date)
            check_out: checkOutInput.value,      // Using check_out (not checkout_date)
            room_type: priceInfo.roomTypeName,
            num_adults: priceInfo.adults,        // Using num_adults
            num_children: priceInfo.children,    // Using num_children
            total_price: priceInfo.totalPrice,   // Using total_price (not total_amount)
            special_requests: specialRequestsInput ? specialRequestsInput.value : null,
            status: 'pending'
        };
        
        try {
            const { data, error } = await supabase
                .from('bookings')
                .insert([bookingData])
                .select();
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
            console.log('✅ Booking saved to Supabase!', data);
            
            if (submitBtn) submitBtn.textContent = '📧 Sending email...';
            
            const emailParams = {
                guest_name: fullName,
                guest_email: guestEmail,
                guest_phone: guestPhone,
                booking_reference: bookingRef,
                checkin_date: checkinFormatted,
                checkout_date: checkoutFormatted,
                room_type: priceInfo.roomTypeName,
                guests: guestCount,
                nights: priceInfo.nights,
                total_amount: '₵' + priceInfo.totalPrice.toLocaleString(),
                from_email: 'wundable@gmail.com'
            };
            
            if (typeof emailjs !== 'undefined') {
                emailjs.send('service_cq4rt71', 'template_bbofvzz', emailParams)
                    .then(() => {
                        console.log('✅ Email sent!');
                        showSuccess();
                    }, (error) => {
                        console.error('⚠️ Email failed:', error);
                        alert(`✅ BOOKING CONFIRMED!\n\nReference: ${bookingRef}\n\n⚠️ Email failed but booking is saved in database!`);
                        resetForm();
                    });
            } else {
                showSuccess();
            }
            
            function showSuccess() {
                alert(
                    `✅ BOOKING CONFIRMED!\n\n` +
                    `Reference: ${bookingRef}\n\n` +
                    `Name: ${fullName}\n` +
                    `Email: ${guestEmail}\n` +
                    `Phone: ${guestPhone}\n\n` +
                    `Check-in: ${checkinFormatted}\n` +
                    `Check-out: ${checkoutFormatted}\n` +
                    `Room: ${priceInfo.roomTypeName}\n` +
                    `Guests: ${guestCount}\n` +
                    `Nights: ${priceInfo.nights}\n` +
                    `Total: ₵${priceInfo.totalPrice.toLocaleString()}\n\n` +
                    `📧 Confirmation email sent!\n` +
                    `💾 Saved to database!`
                );
                resetForm();
            }
            
            function resetForm() {
                bookingForm.reset();
                calculatePrice();
                if (submitBtn) {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert(`❌ ERROR: ${error.message}\n\nPlease try again or contact us.`);
            if (submitBtn) {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    });
    
    calculatePrice();

    // Trail Insertion
    

}

// ============================================
// GALLERY FILTER
// ============================================
function filterGallery(category) {
    const items = document.querySelectorAll('.gallery-item');
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    items.forEach(item => {
        if (category === '*') {
            item.style.display = 'block';
        } else {
            item.style.display = item.getAttribute('data-category') === category ? 'block' : 'none';
        }
    });
}

// ============================================
// PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded!');
    console.log('✅ Supabase:', typeof supabase !== 'undefined' ? 'CONNECTED ✓' : 'NOT CONNECTED ✗');
    console.log('✅ EmailJS:', typeof emailjs !== 'undefined' ? 'LOADED ✓' : 'NOT LOADED ✗');
});


// ============================================
// MOBILE MENU TOGGLE FUNCTIONALITY
// ============================================

const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle && navLinks) {
    
    // Define the function that opens/closes the menu and changes the button icon
    function toggleMobileMenu() {
        // Toggle a class (e.g., 'open') on the navigation container
        navLinks.classList.toggle('open'); 
        mobileMenuToggle.classList.toggle('is-open'); // Change the button appearance/icon
        
        // Update ARIA attribute for accessibility
        const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true' || false;
        mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
    }
    
    // Attach the function to the click event of the button
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
}


// ============================================
// CONTACT FORM WITH FORMSPREE
// ============================================


// --- Function to handle Contact Form Submission ---
function setupContactForm() {
    const form = document.getElementById('contactForm');
    const statusMessage = document.getElementById('formStatus');

    if (!form || !statusMessage) {
        console.error("Contact form or status element not found.");
        return;
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault(); // Stop the default Formspree redirect/feedback

        const formData = new FormData(form);
        
        // Show a temporary loading message
        statusMessage.textContent = 'Sending message...';
        statusMessage.className = 'form-result'; // Clear previous status styles

        try {
            // Use the fetch API to send the data to Formspree
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'Accept': 'application/json' // Crucial for Formspree AJAX
                }
            });

            if (response.ok) {
                // SUCCESS: Show success message and clear the form
                statusMessage.textContent = 'Thank you! Your message has been sent successfully.';
                statusMessage.classList.add('success');
                form.reset(); // Clear all form fields
                
                // Optional: Trigger a custom alert
                alert('Message Sent: Thank you for contacting us!');
            } else {
                // FAILURE: Get and show the specific error message
                const data = await response.json();
                if (data.errors) {
                    statusMessage.textContent = data.errors.map(error => error.message).join(", ");
                } else {
                    statusMessage.textContent = 'Oops! There was an issue sending your message.';
                }
                statusMessage.classList.add('error');
            }
        } catch (error) {
            // NETWORK ERROR: Handle connection issues
            console.error('Submission Error:', error);
            statusMessage.textContent = 'An unexpected error occurred. Please check your connection.';
            statusMessage.classList.add('error');
        }
    });
}

// Call the function to set up the event listener when the page loads
setupContactForm();



// Fetch prices from database
async function loadRoomPrices() {
    try {
        const { data, error } = await supabase
            .from('room_pricing')
            .select('*');
        
        if (error) throw error;
        
        // Store in global object
        window.ROOM_PRICES = {};
        data.forEach(room => {
            window.ROOM_PRICES[room.room_type] = room.base_price;
        });
        
        console.log('💰 Loaded dynamic prices:', window.ROOM_PRICES);
        
        // Update any displayed prices on the page
        updateDisplayedPrices();
        
    } catch (error) {
        console.error('Error loading prices:', error);
        // Fallback to default prices if database fails
        window.ROOM_PRICES = {
            'Standard Room': 550,
            'Executive Room': 800,
            'Deluxe Room': 1500,
            'Royal Suite': 2500
        };
    }
}

// Update prices displayed on page
function updateDisplayedPrices() {
    document.querySelectorAll('[data-room-price]').forEach(element => {
        const roomType = element.dataset.roomPrice;
        if (window.ROOM_PRICES[roomType]) {
            element.textContent = `₵${window.ROOM_PRICES[roomType]}`;
        }
    });
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRoomPrices();
});


// Add this test function to script.js
function testEmail() {
    if (typeof emailjs === 'undefined') {
        console.error('❌ EmailJS not loaded!');
        return;
    }
    
    console.log('📧 Testing EmailJS...');
    
    emailjs.send('service_cq4rt71', 'template_bbofvzz', {
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        guest_phone: '0241234567',
        booking_reference: 'TEST-123',
        checkin_date: '20 Nov 2025',
        checkout_date: '22 Nov 2025',
        room_type: 'Standard Room',
        guests: '2 Adults',
        nights: '2',
        total_amount: '₵1,100',
        from_email: 'wundable@gmail.com'
    })
    .then(() => {
        console.log('✅ Test email sent!');
        alert('Test email sent! Check your inbox.');
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        alert('Test failed: ' + JSON.stringify(error));
    });
}

// Run test in console: testEmail()