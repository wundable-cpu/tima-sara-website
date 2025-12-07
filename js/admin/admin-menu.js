console.log('📋 Menu Management module loading...');

const supabase = window.supabase_client;

let allMenuItems = [];
let currentItem = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Menu Management page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    loadMenuItems();
    setupFilters();
    setupForm();
});

// Load menu items
async function loadMenuItems() {
    console.log('📡 Loading menu items...');
    
    try {
        const { data: items, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category')
            .order('name');
        
        if (error) throw error;
        
        allMenuItems = items || [];
        console.log(`✅ Loaded ${allMenuItems.length} menu items`);
        
        displayMenuItems(allMenuItems);
        
    } catch (error) {
        console.error('❌ Error loading menu items:', error);
        
        // Check if table exists
        if (error.message.includes('relation "menu_items" does not exist')) {
            showTableSetup();
        } else {
            alert('Failed to load menu items: ' + error.message);
        }
    }
}

// Display menu items
function displayMenuItems(items) {
    const grid = document.getElementById('menuGrid');
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <p style="font-size: 18px; margin-bottom: 10px;">📋 No menu items yet</p>
                <p>Click "Add New Menu Item" to get started!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(item => `
        <div class="menu-item-card ${item.is_available ? '' : 'unavailable'}">
            <div class="menu-item-header">
                <div class="menu-item-title">
                    <h3>${item.name}</h3>
                    <span class="item-category ${item.category}">${getCategoryIcon(item.category)} ${formatCategory(item.category)}</span>
                </div>
                <span class="availability-badge ${item.is_available ? 'available' : 'unavailable'}">
                    ${item.is_available ? '✅ Available' : '❌ Unavailable'}
                </span>
            </div>
            
            ${item.description ? `<p class="menu-item-description">${item.description}</p>` : ''}
            
            <div class="menu-item-price">₵${parseFloat(item.price).toFixed(2)}</div>
            
            <div class="menu-item-actions">
                <button onclick='editItem(${JSON.stringify(item).replace(/'/g, "&apos;")})' class="btn-icon edit">
                    ✏️ Edit
                </button>
                <button onclick="toggleAvailability(${item.id}, ${!item.is_available})" class="btn-icon toggle">
                    ${item.is_available ? '❌ Disable' : '✅ Enable'}
                </button>
                <button onclick="deleteItem(${item.id}, '${item.name}')" class="btn-icon delete">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Setup filters
function setupFilters() {
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('availabilityFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const availability = document.getElementById('availabilityFilter').value;
    
    let filtered = allMenuItems;
    
    if (category !== 'all') {
        filtered = filtered.filter(item => item.category === category);
    }
    
    if (availability === 'available') {
        filtered = filtered.filter(item => item.is_available);
    } else if (availability === 'unavailable') {
        filtered = filtered.filter(item => !item.is_available);
    }
    
    console.log(`🔍 Filtered: ${filtered.length} of ${allMenuItems.length} items`);
    displayMenuItems(filtered);
}

// Setup form
function setupForm() {
    document.getElementById('itemForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveItem();
    });
}

// Open add modal
function openAddItemModal() {
    currentItem = null;
    document.getElementById('modalTitle').textContent = 'Add New Menu Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemAvailable').checked = true;
    document.getElementById('itemModal').style.display = 'flex';
}

// Edit item
function editItem(item) {
    currentItem = item;
    document.getElementById('modalTitle').textContent = 'Edit Menu Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemAvailable').checked = item.is_available;
    document.getElementById('itemModal').style.display = 'flex';
}

// Save item
async function saveItem() {
    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDescription').value;
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const isAvailable = document.getElementById('itemAvailable').checked;
    
    const itemData = {
        name,
        description,
        category,
        price,
        is_available: isAvailable
    };
    
    try {
        if (id) {
            // Update existing item
            const { error } = await supabase
                .from('menu_items')
                .update(itemData)
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Item updated');
        } else {
            // Insert new item
            const { error } = await supabase
                .from('menu_items')
                .insert([itemData]);
            
            if (error) throw error;
            console.log('✅ Item added');
        }
        
        closeModal();
        await loadMenuItems();
        
    } catch (error) {
        console.error('❌ Error saving item:', error);
        alert('Failed to save item: ' + error.message);
    }
}

// Toggle availability
async function toggleAvailability(id, newStatus) {
    try {
        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        console.log(`✅ Item ${newStatus ? 'enabled' : 'disabled'}`);
        await loadMenuItems();
        
    } catch (error) {
        console.error('❌ Error toggling availability:', error);
        alert('Failed to update item: ' + error.message);
    }
}

// Delete item
async function deleteItem(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('✅ Item deleted');
        await loadMenuItems();
        
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        alert('Failed to delete item: ' + error.message);
    }
}

// Close modal
function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    currentItem = null;
}

// Helper functions
function getCategoryIcon(category) {
    const icons = {
        restaurant: '🍽️',
        bar: '🍺',
        room_service: '🛎️',
        beverage: '☕'
    };
    return icons[category] || '📋';
}

function formatCategory(category) {
    return category.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Show table setup message
function showTableSetup() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = `
        <div class="loading-state">
            <p style="font-size: 18px; margin-bottom: 15px; color: var(--accent-gold);">⚠️ Menu Items Table Not Found</p>
            <p style="margin-bottom: 20px;">The menu_items table needs to be created in Supabase.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: left; max-width: 600px; margin: 0 auto;">
                <p style="font-weight: 600; margin-bottom: 10px;">Run this SQL in Supabase:</p>
                <pre style="background: white; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
                </pre>
            </div>
        </div>
    `;
}

// Close modal on outside click
document.getElementById('itemModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ Menu Management module loaded');