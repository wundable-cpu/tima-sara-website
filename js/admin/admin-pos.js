console.log('🍽️ POS module loading...');

const supabase = window.supabase_client;

// POS State
let currentOrder = [];
let menuItems = [];
let currentGuests = [];
let activeCategory = 'restaurant';

// Initialize POS
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ POS page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    await loadMenuItems();
    await loadActiveGuests();
    setupCategoryTabs();
    setupPaymentType();
});

// Load menu items from database
async function loadMenuItems() {
    console.log('📡 Loading menu items from database...');
    
    try {
        const { data: items, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('is_available', true)
            .order('name');
        
        if (error) throw error;
        
        menuItems = items || [];
        console.log(`✅ Loaded ${menuItems.length} menu items`);
        
        displayMenuItems(activeCategory);
        
    } catch (error) {
        console.error('❌ Error loading menu items:', error);
        document.getElementById('menuItemsGrid').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e53e3e;">
                <p style="font-size: 18px; margin-bottom: 10px;">⚠️ Failed to load menu</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Display menu items for category
function displayMenuItems(category) {
    const grid = document.getElementById('menuItemsGrid');
    
    // Filter by category
    let filtered = menuItems;
    if (category !== 'all') {
        filtered = menuItems.filter(item => item.category === category);
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">
                <p style="font-size: 18px;">No items in this category</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filtered.map(item => `
        <div class="menu-item-card" onclick='addToOrder(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <div class="menu-item-name">${item.name}</div>
            ${item.description ? `<div class="menu-item-desc">${item.description}</div>` : ''}
            <div class="menu-item-price">₵${parseFloat(item.price).toFixed(2)}</div>
            <div class="menu-item-category">${getCategoryLabel(item.category)}</div>
        </div>
    `).join('');
}

// Setup category tabs
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.pos-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            this.classList.add('active');
            // Get category
            activeCategory = this.dataset.category;
            // Display items
            displayMenuItems(activeCategory);
        });
    });
}

// Filter menu (called from HTML onclick)
function filterMenu(category) {
    activeCategory = category;
    displayMenuItems(category);
}

// Add item to order
function addToOrder(item) {
    console.log('➕ Adding to order:', item.name);
    
    // Check if item already in order
    const existing = currentOrder.find(orderItem => orderItem.id === item.id);
    
    if (existing) {
        existing.quantity++;
    } else {
        currentOrder.push({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            category: item.category,
            quantity: 1
        });
    }
    
    updateOrderDisplay();
}

// Update order display
function updateOrderDisplay() {
    const orderItemsDiv = document.getElementById('orderItems');
    
    if (currentOrder.length === 0) {
        orderItemsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <p>No items added yet</p>
                <p style="font-size: 14px; margin-top: 10px;">Click on menu items to add</p>
            </div>
        `;
        updateTotals();
        return;
    }
    
    orderItemsDiv.innerHTML = currentOrder.map((item, index) => `
        <div class="order-item">
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-price">₵${item.price.toFixed(2)} each</div>
            </div>
            <div class="order-item-controls">
                <button onclick="updateQuantity(${index}, -1)" class="qty-btn">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)" class="qty-btn">+</button>
                <button onclick="removeItem(${index})" class="remove-btn">🗑️</button>
            </div>
        </div>
    `).join('');
    
    updateTotals();
}

// Update quantity
function updateQuantity(index, change) {
    currentOrder[index].quantity += change;
    
    if (currentOrder[index].quantity <= 0) {
        currentOrder.splice(index, 1);
    }
    
    updateOrderDisplay();
}

// Remove item
function removeItem(index) {
    currentOrder.splice(index, 1);
    updateOrderDisplay();
}

// ✅ FIXED: Update totals with CORRECT IDs
function updateTotals() {
    const subtotal = currentOrder.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    
    const serviceCharge = subtotal * 0.10;
    const total = subtotal + serviceCharge;
    
    console.log('💰 Calculations:', { subtotal, serviceCharge, total });
    
    // ✅ USING CORRECT IDs FROM HTML
    document.getElementById('orderSubtotal').textContent = `₵${subtotal.toFixed(2)}`;
    document.getElementById('orderService').textContent = `₵${serviceCharge.toFixed(2)}`;
    document.getElementById('orderTotal').textContent = `₵${total.toFixed(2)}`;
}

// Clear order
function clearOrder() {
    if (currentOrder.length === 0) return;
    
    if (confirm('Clear all items from order?')) {
        currentOrder = [];
        updateOrderDisplay();
        console.log('🗑️ Order cleared');
    }
}

// ✅ FIXED: Setup payment type with CORRECT event listener
function setupPaymentType() {
    const paymentRadios = document.querySelectorAll('input[name="paymentType"]');
    const guestSelect = document.getElementById('guestSelect');
    const roomSelectContainer = document.getElementById('roomSelectContainer');
    
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'room') {
                roomSelectContainer.style.display = 'block';
                guestSelect.disabled = false;
                loadActiveGuests();
            } else {
                roomSelectContainer.style.display = 'none';
                guestSelect.disabled = true;
            }
        });
    });
}

// ✅ NEW: Toggle guest select function (called from HTML)
function toggleGuestSelect() {
    const roomType = document.querySelector('input[name="paymentType"]:checked').value;
    const roomSelectContainer = document.getElementById('roomSelectContainer');
    const guestSelect = document.getElementById('guestSelect');
    
    if (roomType === 'room') {
        roomSelectContainer.style.display = 'block';
        guestSelect.disabled = false;
        loadActiveGuests();
    } else {
        roomSelectContainer.style.display = 'none';
        guestSelect.disabled = true;
    }
}

// Load active guests
async function loadActiveGuests() {
    console.log('📡 Loading active guests...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: guests, error } = await supabase
            .from('bookings')
            .select('*')
            .lte('check_in', today)
            .gte('check_out', today)
            .in('status', ['confirmed', 'checked-in'])
            .order('guest_name');
        
        if (error) throw error;
        
        currentGuests = guests || [];
        console.log(`✅ Loaded ${currentGuests.length} active guests`);
        
        const select = document.getElementById('guestSelect');
        select.innerHTML = '<option value="">-- Select Guest --</option>' +
            currentGuests.map(guest => 
                `<option value="${guest.id}">${guest.guest_name} - Room ${guest.room_number}</option>`
            ).join('');
        
    } catch (error) {
        console.error('❌ Error loading guests:', error);
    }
}

// Process order
async function processOrder() {
    if (currentOrder.length === 0) {
        alert('⚠️ Please add items to the order first');
        return;
    }
    
    const paymentType = document.querySelector('input[name="paymentType"]:checked').value;
    const guestId = document.getElementById('guestSelect').value;
    
    if (paymentType === 'room' && !guestId) {
        alert('⚠️ Please select a guest/room to charge');
        return;
    }
    
    try {
        const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const serviceCharge = subtotal * 0.10;
        const total = subtotal + serviceCharge;
        
        console.log('💳 Processing order:', { paymentType, total, items: currentOrder.length });
        
        if (paymentType === 'room') {
            // Save to guest_charges table
            const guest = currentGuests.find(g => g.id === guestId);
            
            for (const item of currentOrder) {
                const chargeData = {
                    booking_id: guestId,
                    guest_name: guest.guest_name,
                    room_number: guest.room_number,
                    item_description: item.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_amount: item.price * item.quantity,
                    category: item.category,
                    charge_date: new Date().toISOString()
                };
                
                console.log('📝 Saving charge:', chargeData);
                
                const { error } = await supabase
                    .from('guest_charges')
                    .insert([chargeData]);
                
                if (error) throw error;
            }
            
            console.log(`✅ Charged ₵${total.toFixed(2)} to Room ${guest.room_number}`);
            alert(`✅ Order charged to Room ${guest.room_number}\n\nTotal: ₵${total.toFixed(2)}\n\nGuest: ${guest.guest_name}`);
        } else {
            // Cash payment
            console.log(`💵 Cash payment: ₵${total.toFixed(2)}`);
            alert(`✅ Cash Payment Received\n\nTotal: ₵${total.toFixed(2)}\n\nThank you!`);
        }
        
        // Clear order
        currentOrder = [];
        updateOrderDisplay();
        document.getElementById('guestSelect').value = '';
        
    } catch (error) {
        console.error('❌ Error processing order:', error);
        alert('Failed to process order: ' + error.message);
    }
}

// Helper functions
function getCategoryLabel(category) {
    const labels = {
        food: '🍽️ Food',
        beverage: '☕ Beverage',
        bar: '🍺 Bar',
        room_service: '🛎️ Room Service'
    };
    return labels[category] || category;
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ POS module loaded');

