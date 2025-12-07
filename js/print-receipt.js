// ============================================
// PRINT RECEIPT FUNCTIONALITY
// ============================================

function printReceipt(bookingData) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Format dates nicely
    const checkinFormatted = bookingData.checkin ? new Date(bookingData.checkin).toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }) : 'N/A';
    
    const checkoutFormatted = bookingData.checkout ? new Date(bookingData.checkout).toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }) : 'N/A';
    
    const bookingDateFormatted = bookingData.date ? new Date(bookingData.date).toLocaleDateString('en-GB', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString('en-GB', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // Calculate nights if dates are available
    let nights = bookingData.nights || 'N/A';
    if (bookingData.checkin && bookingData.checkout) {
        const checkin = new Date(bookingData.checkin);
        const checkout = new Date(bookingData.checkout);
        nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    }
    
    // Build the receipt HTML
    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Booking Receipt - ${bookingData.reference}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            padding: 40px;
            background: white;
            color: #333;
        }
        
        .receipt {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #d4af37;
            padding: 40px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #d4af37;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .hotel-name {
            font-size: 36px;
            font-weight: bold;
            color: #d4af37;
            margin-bottom: 10px;
        }
        
        .hotel-tagline {
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
        
        .receipt-title {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #333;
        }
        
        .booking-ref {
            text-align: center;
            font-size: 18px;
            color: #d4af37;
            margin-bottom: 30px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #d4af37;
        }
        
        .section {
            margin: 25px 0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .info-label {
            flex: 0 0 200px;
            font-weight: bold;
            color: #555;
        }
        
        .info-value {
            flex: 1;
            color: #333;
        }
        
        .price-section {
            background: #f9f9f9;
            padding: 20px;
            margin: 30px 0;
            border-left: 4px solid #d4af37;
        }
        
        .price-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
        }
        
        .total-row {
            font-size: 22px;
            font-weight: bold;
            color: #d4af37;
            border-top: 2px solid #d4af37;
            padding-top: 15px;
            margin-top: 15px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        .terms {
            margin-top: 30px;
            padding: 20px;
            background: #f9f9f9;
            font-size: 11px;
            color: #666;
            line-height: 1.6;
        }
        
        .terms-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-confirmed {
            background: #d4edda;
            color: #155724;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .receipt {
                border: none;
                padding: 20px;
            }
            
            @page {
                margin: 1cm;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="hotel-name">TIMA SARA HOTEL</div>
            <div class="hotel-tagline">Experience Luxury & Comfort</div>
        </div>
        
        <div class="receipt-title">BOOKING RECEIPT</div>
        
        <div class="booking-ref">
            <strong>Booking Reference:</strong> ${bookingData.reference}
        </div>
        
        <div class="section">
            <div class="section-title">Guest Information</div>
            <div class="info-row">
                <div class="info-label">Guest Name:</div>
                <div class="info-value">${bookingData.name}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Email Address:</div>
                <div class="info-value">${bookingData.email}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Phone Number:</div>
                <div class="info-value">${bookingData.phone}</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Booking Details</div>
            <div class="info-row">
                <div class="info-label">Check-in Date:</div>
                <div class="info-value">${checkinFormatted}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Check-out Date:</div>
                <div class="info-value">${checkoutFormatted}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Number of Nights:</div>
                <div class="info-value">${nights}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Room Type:</div>
                <div class="info-value">${bookingData.room}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Number of Guests:</div>
                <div class="info-value">${bookingData.guests}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Booking Status:</div>
                <div class="info-value">
                    <span class="status-badge status-${bookingData.status}">${bookingData.status}</span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-label">Booking Date:</div>
                <div class="info-value">${bookingDateFormatted}</div>
            </div>
        </div>
        
        <div class="price-section">
            <div class="section-title">Price Summary</div>
            <div class="price-row">
                <div>Room Rate (${nights} night${nights != 1 ? 's' : ''})</div>
                <div>₵${bookingData.total ? parseFloat(bookingData.total).toLocaleString() : '0'}</div>
            </div>
            <div class="price-row total-row">
                <div>Total Amount</div>
                <div>₵${bookingData.total ? parseFloat(bookingData.total).toLocaleString() : '0'}</div>
            </div>
        </div>
        
        <div class="terms">
            <div class="terms-title">Terms & Conditions:</div>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Check-in time: 2:00 PM | Check-out time: 11:00 AM</li>
                <li>Valid photo ID required at check-in</li>
                <li>Cancellation must be made 48 hours before check-in for full refund</li>
                <li>Late check-out subject to availability and additional charges</li>
                <li>Smoking is prohibited in all rooms</li>
                <li>Pets are not allowed unless previously arranged</li>
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>Tima Sara Hotel</strong></p>
            <p>Email: info@timasarahotel.com | Phone: +233 XX XXX XXXX</p>
            <p style="margin-top: 10px;">Thank you for choosing Tima Sara Hotel. We look forward to hosting you!</p>
            <p style="margin-top: 15px; font-size: 10px;">This is a computer-generated receipt. No signature required.</p>
        </div>
    </div>
    
    <script>
        // Auto-print when window loads
        window.onload = function() {
            window.print();
        };
        
        // Close window after printing
        window.onafterprint = function() {
            window.close();
        };
    </script>
</body>
</html>
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
}

// Make printReceipt globally available
window.printReceipt = printReceipt;