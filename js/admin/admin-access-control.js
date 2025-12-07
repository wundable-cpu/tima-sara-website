// admin-access-control.js - Role-Based Access Control

let currentUser = null;
let userRole = null;
let userPermissions = {};

// Check user access on page load
async function checkPageAccess() {
    const currentPage = getCurrentPage();
    
    // Get user role
    const role = await getUserRole();
    
    if (!role) {
        alert('⚠️ No role assigned to your account. Contact administrator.');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Get permissions for this page
    const permissions = await getPagePermissions(role, currentPage);
    
    if (!permissions || !permissions.can_view) {
        alert('🚫 Access Denied\n\nYou do not have permission to view this page.');
        window.location.href = 'admin-dashboard.html';
        return;
    }
    
    // Apply permissions to page
    applyPermissions(permissions);
    
    // Update UI to show user role
    updateUserDisplay(role);
}

// Get current page name
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '').replace('admin-', '');
    return page || 'dashboard';
}

// Get user role from database
async function getUserRole() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return null;
        
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
        
        if (error) throw error;
        
        userRole = data.role;
        return data.role;
        
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

// Get page permissions
async function getPagePermissions(role, page) {
    try {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role', role)
            .eq('page', page)
            .single();
        
        if (error) throw error;
        
        userPermissions = data;
        return data;
        
    } catch (error) {
        console.error('Error getting permissions:', error);
        return null;
    }
}

// Apply permissions to page elements
function applyPermissions(permissions) {
    // Disable edit buttons if no edit permission
    if (!permissions.can_edit) {
        document.querySelectorAll('.btn-edit, .edit-btn, [data-action="edit"]').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = 'You do not have edit permissions';
        });
        
        // Disable all input fields
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('search-input') && !input.classList.contains('filter-select')) {
                input.disabled = true;
                input.style.opacity = '0.7';
            }
        });
    }
    
    // Hide delete buttons if no delete permission
    if (!permissions.can_delete) {
        document.querySelectorAll('.btn-delete, .delete-btn, [data-action="delete"]').forEach(btn => {
            btn.style.display = 'none';
        });
    }
    
    // Add read-only indicator
    if (!permissions.can_edit) {
        const indicator = document.createElement('div');
        indicator.style.cssText = 'position: fixed; top: 70px; right: 20px; background: #ff9800; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; z-index: 1000;';
        indicator.textContent = '👁️ Read-Only Access';
        document.body.appendChild(indicator);
    }
}

// Update user display with role
function updateUserDisplay(role) {
    const roleNames = {
        'admin': 'Administrator',
        'manager': 'Manager',
        'frontdesk': 'Front Desk',
        'housekeeping': 'Housekeeping',
        'finance': 'Finance'
    };
    
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = roleNames[role] || role;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only run on admin pages, not login page
    if (window.location.pathname.includes('admin-') && !window.location.pathname.includes('login')) {
        checkPageAccess();
    }
});

console.log('🔐 Access control module loaded');