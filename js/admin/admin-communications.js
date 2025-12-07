// admin-communications.js - Bulk Email Communications

// Email templates
const EMAIL_TEMPLATES = {
    welcome: {
        subject: "Welcome to Tima Sara Hotel! Your Stay Awaits 🎉",
        body: `Dear {name},

We're thrilled to welcome you to Tima Sara Hotel!

Your reservation is confirmed and we're preparing everything for your arrival. Our team is excited to host you and ensure you have a memorable stay.

Check-In Details:
- Date: [Check-in Date]
- Time: 2:00 PM onwards
- Location: Tamale, Northern Ghana

What to expect:
✓ Warm hospitality from our dedicated team
✓ Comfortable, well-appointed rooms
✓ Delicious dining options
✓ Easy access to local attractions

If you have any special requests or questions, please don't hesitate to contact us.

We look forward to welcoming you soon!

Warm regards,
Tima Sara Hotel Team
info@timasarahotel.com`
    },
    checkin: {
        subject: "Check-In Reminder - We're Ready for You! ⏰",
        body: `Dear {name},

Your check-in day is approaching! We wanted to remind you of your upcoming stay with us.

Arrival Details:
- Check-In: Tomorrow at 2:00 PM
- Room: [Room Type]
- Duration: [Number of nights]

Quick Reminders:
✓ Early check-in available upon request
✓ Complimentary Wi-Fi throughout
✓ 24/7 front desk assistance
✓ Secure parking available

Have a safe journey to us!

Best regards,
Tima Sara Hotel Team`
    },
    thankyou: {
        subject: "Thank You for Staying with Us! 💙",
        body: `Dear {name},

Thank you for choosing Tima Sara Hotel for your recent stay. It was our pleasure to host you!

We hope you enjoyed your time with us and that every aspect of your stay met your expectations.

We'd Love Your Feedback:
Your opinion matters to us. If you have a moment, we'd greatly appreciate hearing about your experience.

Special Offer for Return Visits:
As a valued guest, enjoy 10% off your next booking when you mention this email.

We look forward to welcoming you back soon!

Warmest regards,
Tima Sara Hotel Team
info@timasarahotel.com`
    },
    promotion: {
        subject: "Exclusive Offer Just for You! 🎁",
        body: `Dear {name},

As one of our valued guests, we have an exclusive offer just for you!

Special Promotion:
✨ 15% OFF your next stay
✨ Complimentary room upgrade (subject to availability)
✨ Late checkout at no extra charge

Valid for bookings made in the next 30 days.

To redeem this offer, simply mention promo code: WELCOME15

Book now: info@timasarahotel.com

This exclusive offer won't last long!

Best regards,
Tima Sara Hotel Team`
    },
    feedback: {
        subject: "We'd Love Your Feedback ⭐",
        body: `Dear {name},

Thank you for your recent stay at Tima Sara Hotel!

Your Experience Matters:
We strive to provide exceptional service, and your feedback helps us improve.

Could you spare 2 minutes to share your thoughts?
- What did you enjoy most about your stay?
- Is there anything we could improve?
- Would you recommend us to friends and family?

As a thank you, guests who provide feedback receive a special discount on their next visit!

Share your thoughts: info@timasarahotel.com

Thank you for helping us serve you better!

Sincerely,
Tima Sara Hotel Team`
    }
};

let communicationHistory = [];

// Initialize
async function initializeCommunications() {
    updateRecipientCount();
    
    // Load guest data from localStorage if available
    const savedGuests = localStorage.getItem('hotelGuests');
    if (savedGuests) {
        console.log('📧 Communications module ready');
    }
}

// Update recipient count
function updateRecipientCount() {
    const group = document.getElementById('recipientGroup').value;
    // In production, this would query actual guest database
    const counts = {
        all: 50,
        vip: 12,
        current: 8,
        upcoming: 15,
        past: 25,
        returning: 18
    };
    
    const count = counts[group] || 0;
    document.getElementById('recipientCount').textContent = `${count} recipients selected`;
    document.getElementById('sendCount').textContent = count;
}

// Load template
function loadTemplate(templateKey) {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) return;
    
    document.getElementById('emailSubject').value = template.subject;
    document.getElementById('emailBody').value = template.body;
    document.getElementById('messageTemplate').value = templateKey;
    
    // Scroll to composer
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Preview email
function previewEmail() {
    const subject = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;
    const group = document.getElementById('recipientGroup').value;
    
    if (!subject || !body) {
        alert('Please enter both subject and message');
        return;
    }
    
    // Sample preview with placeholder name
    const sampleBody = body.replace(/{name}/g, 'John Doe');
    
    const modal = document.getElementById('previewModal');
    const previewBody = document.getElementById('previewBody');
    
    previewBody.innerHTML = `
        <div style="padding: 20px; background: var(--bg-light); border-radius: 10px;">
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--border-color);">
                <strong>To:</strong> ${group === 'all' ? 'All Guests' : group.charAt(0).toUpperCase() + group.slice(1) + ' Guests'}<br>
                <strong>Subject:</strong> ${subject}
            </div>
            <div style="white-space: pre-wrap; line-height: 1.6;">
                ${sampleBody}
            </div>
        </div>
        <p style="margin-top: 15px; font-size: 13px; color: var(--text-light);">
            💡 This is a sample preview. Actual emails will be personalized with each guest's name.
        </p>
    `;
    
    modal.style.display = 'flex';
}

// Close preview
function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

// Send bulk email
function sendBulkEmail() {
    const subject = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;
    const group = document.getElementById('recipientGroup').value;
    
    if (!subject || !body) {
        alert('Please enter both subject and message');
        return;
    }
    
    if (!confirm(`Send this email to ${group === 'all' ? 'all' : group} guests?`)) {
        return;
    }
    
    // In production, this would:
    // 1. Query guest database based on group
    // 2. Send personalized emails via EmailJS
    // 3. Track delivery status
    
    // Simulate sending
    const recipientCount = document.getElementById('sendCount').textContent;
    
    // Add to history
    const communication = {
        id: Date.now(),
        subject: subject,
        recipients: group,
        count: recipientCount,
        sentAt: new Date().toISOString(),
        status: 'sent'
    };
    
    communicationHistory.unshift(communication);
    displayHistory();
    
    // Clear form
    document.getElementById('emailSubject').value = '';
    document.getElementById('emailBody').value = '';
    document.getElementById('messageTemplate').value = '';
    
    alert(`✅ Email sent successfully to ${recipientCount} guests!`);
    console.log('📧 Bulk email sent:', communication);
}

// Display communication history
function displayHistory() {
    const historyList = document.getElementById('historyList');
    
    if (communicationHistory.length === 0) {
        historyList.innerHTML = `
            <p style="text-align: center; color: var(--text-light); padding: 40px;">
                No communications sent yet
            </p>
        `;
        return;
    }
    
    historyList.innerHTML = communicationHistory.map(comm => `
        <div class="booking-history-item" style="margin-bottom: 15px;">
            <div>
                <strong>${comm.subject}</strong><br>
                <small style="color: var(--text-light);">
                    To: ${comm.recipients} (${comm.count} recipients) • 
                    ${new Date(comm.sentAt).toLocaleString('en-GB')}
                </small>
            </div>
            <div>
                <span class="status-badge status-confirmed">✅ Sent</span>
            </div>
        </div>
    `).join('');
}

// Event listeners
document.getElementById('recipientGroup')?.addEventListener('change', updateRecipientCount);

document.getElementById('messageTemplate')?.addEventListener('change', function() {
    if (this.value) {
        loadTemplate(this.value);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('communications')) {
        initializeCommunications();
    }
});

console.log('📧 Communications module loaded'); 

function sendViaWhatsApp(phoneNumber, message) {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
    console.log('✅ WhatsApp opened');
}