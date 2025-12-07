console.log('🔧 Maintenance module loading...');

const supabase = window.supabase_client;

let allRequests = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Maintenance page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    await loadRequests();
    setupFilters();
    setupForm();
});

// Load maintenance requests
async function loadRequests() {
    console.log('📡 Loading maintenance requests...');
    
    try {
        const { data: requests, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allRequests = requests || [];
        console.log(`✅ Loaded ${allRequests.length} maintenance requests`);
        
        displayRequests(allRequests);
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading requests:', error);
        document.getElementById('requestsContainer').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <div class="empty-state-title">Failed to load requests</div>
                <div class="empty-state-description">${error.message}</div>
            </div>
        `;
    }
}

// Display requests
function displayRequests(requests) {
    const container = document.getElementById('requestsContainer');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <div class="empty-state-title">No Maintenance Requests</div>
                <div class="empty-state-description">Click "New Maintenance Request" to report an issue</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Issue Type</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Description</th>
                        <th>Assigned To</th>
                        <th>Cost</th>
                        <th>Reported</th>
                        <th style="text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(request => `
                        <tr>
                            <td>
                                <strong>${request.location}</strong>
                                ${request.room_number ? `<br><small style="color: var(--text-light);">Room ${request.room_number}</small>` : ''}
                            </td>
                            <td>${getIssueTypeIcon(request.issue_type)} ${formatIssueType(request.issue_type)}</td>
                            <td><span class="badge badge-${request.status}">${getStatusIcon(request.status)} ${formatStatus(request.status)}</span></td>
                            <td><span class="badge badge-priority-${request.priority}">${getPriorityIcon(request.priority)} ${request.priority.toUpperCase()}</span></td>
                            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${request.description}">${request.description}</td>
                            <td>${request.assigned_to || '<em>Unassigned</em>'}</td>
                            <td>
                                ${request.estimated_cost ? `<div style="font-size: 12px; color: var(--text-light);">Est: ₵${parseFloat(request.estimated_cost).toFixed(2)}</div>` : ''}
                                ${request.actual_cost ? `<div style="font-weight: 600;">₵${parseFloat(request.actual_cost).toFixed(2)}</div>` : '<em>-</em>'}
                            </td>
                            <td>
                                <div>${new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                <div style="font-size: 11px; color: var(--text-light);">${request.reported_by}</div>
                            </td>
                            <td>
                                <div style="justify-content: center;">
                                    ${request.status === 'pending' ? `
                                        <button onclick="updateRequestStatus('${request.id}', 'in_progress')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white;">
                                            ▶️ Start
                                        </button>
                                    ` : ''}
                                    ${request.status === 'in_progress' ? `
                                        <button onclick="updateRequestStatus('${request.id}', 'completed')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white;">
                                            ✅ Complete
                                        </button>
                                    ` : ''}
                                    ${request.status === 'completed' ? `
                                        <span class="badge badge-completed">✓ Done</span>
                                    ` : ''}
                                    ${request.status !== 'completed' && request.status !== 'cancelled' ? `
                                        <button onclick="updateRequestStatus('${request.id}', 'cancelled')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #9E9E9E, #757575); color: white;">
                                            ❌ Cancel
                                        </button>
                                    ` : ''}
                                    <button onclick="deleteRequest('${request.id}')" class="btn-icon btn-sm delete">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Update stats
function updateStats() {
    const pending = allRequests.filter(r => r.status === 'pending').length;
    const inProgress = allRequests.filter(r => r.status === 'in_progress').length;
    const urgent = allRequests.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const resolvedMonth = allRequests.filter(r => 
        r.status === 'completed' && new Date(r.completed_at) >= thisMonth
    ).length;
    
    document.getElementById('pendingRequests').textContent = pending;
    document.getElementById('inProgressRequests').textContent = inProgress;
    document.getElementById('urgentRequests').textContent = urgent;
    document.getElementById('resolvedMonth').textContent = resolvedMonth;
}

// Setup filters
function setupFilters() {
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('issueTypeFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const issueType = document.getElementById('issueTypeFilter').value;
    
    let filtered = allRequests;
    
    if (status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
    }
    
    if (priority !== 'all') {
        filtered = filtered.filter(r => r.priority === priority);
    }
    
    if (issueType !== 'all') {
        filtered = filtered.filter(r => r.issue_type === issueType);
    }
    
    displayRequests(filtered);
}

// Setup form
function setupForm() {
    document.getElementById('requestForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveRequest();
    });
}

// Open new request modal
function openNewRequestModal() {
    document.getElementById('modalTitle').textContent = 'Create Maintenance Request';
    document.getElementById('requestForm').reset();
    document.getElementById('requestId').value = '';
    document.getElementById('requestModal').style.display = 'flex';
}

// Close modal
function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

// Save request
async function saveRequest() {
    const location = document.getElementById('requestLocation').value;
    const room = document.getElementById('requestRoom').value;
    const issueType = document.getElementById('requestIssueType').value;
    const priority = document.getElementById('requestPriority').value;
    const description = document.getElementById('requestDescription').value;
    const assignedTo = document.getElementById('requestAssignedTo').value;
    const estimatedCost = document.getElementById('requestEstimatedCost').value;
    
    const requestData = {
        location: location,
        room_number: room || null,
        issue_type: issueType,
        priority: priority,
        description: description,
        assigned_to: assignedTo || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        status: 'pending',
        reported_by: JSON.parse(localStorage.getItem('hms_user') || '{}').name || 'Admin'
    };
    
    try {
        const { error } = await supabase
            .from('maintenance_requests')
            .insert([requestData]);
        
        if (error) throw error;
        
        console.log('✅ Request created');
        closeRequestModal();
        await loadRequests();
        
    } catch (error) {
        console.error('❌ Error creating request:', error);
        alert('Failed to create request: ' + error.message);
    }
}

// Update request status
async function updateRequestStatus(requestId, newStatus) {
    try {
        const updateData = { 
            status: newStatus,
            updated_at: new Date().toISOString()
        };
        
        if (newStatus === 'completed') {
            updateData.completed_at = new Date().toISOString();
        }
        
        const { error } = await supabase
            .from('maintenance_requests')
            .update(updateData)
            .eq('id', requestId);
        
        if (error) throw error;
        
        console.log(`✅ Request updated to ${newStatus}`);
        await loadRequests();
        
    } catch (error) {
        console.error('❌ Error updating request:', error);
        alert('Failed to update request: ' + error.message);
    }
}

// Delete request
async function deleteRequest(requestId) {
    if (!confirm('Delete this maintenance request?')) return;
    
    try {
        const { error } = await supabase
            .from('maintenance_requests')
            .delete()
            .eq('id', requestId);
        
        if (error) throw error;
        
        console.log('✅ Request deleted');
        await loadRequests();
        
    } catch (error) {
        console.error('❌ Error deleting request:', error);
        alert('Failed to delete request: ' + error.message);
    }
}

// Helper functions
function getIssueTypeIcon(type) {
    const icons = {
        plumbing: '🚰',
        electrical: '⚡',
        hvac: '❄️',
        furniture: '🪑',
        fixture: '💡',
        other: '🔧'
    };
    return icons[type] || '🔧';
}

function formatIssueType(type) {
    return type.toUpperCase();
}

function getStatusIcon(status) {
    const icons = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        cancelled: '❌'
    };
    return icons[status] || '•';
}

function getPriorityIcon(priority) {
    const icons = {
        low: '⬇️',
        medium: '➖',
        high: '⚠️',
        urgent: '🚨'
    };
    return icons[priority] || '•';
}

function formatStatus(status) {
    return status.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Close modal on outside click
document.getElementById('requestModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeRequestModal();
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ Maintenance module loaded');