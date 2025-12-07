console.log('🧹 Housekeeping module loading...');

// ================================
// SMART SUPABASE INITIALIZATION (Like Reservations & Guests)
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

let allTasks = [];
let allRoomStatus = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Housekeeping page loaded');
    
    await loadData();
    setupFilters();
    setupForm();
});

// Load all data
async function loadData() {
    await Promise.all([
        loadTasks(),
        loadRoomStatus(),
        updateStats()
    ]);
}

// Load housekeeping tasks
async function loadTasks() {
    console.log('📡 Loading housekeeping tasks...');
    
    try {
        // Get Supabase client (global or create new)
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const { data: tasks, error } = await supabaseClient
            .from('housekeeping_tasks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allTasks = tasks || [];
        console.log(`✅ Loaded ${allTasks.length} tasks`);
        
        displayTasks(allTasks);
        
    } catch (error) {
        console.error('❌ Error loading tasks:', error);
        document.getElementById('tasksContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e53e3e;">
                <p>Failed to load tasks: ${error.message}</p>
            </div>
        `;
    }
}

// Load room status
async function loadRoomStatus() {
    console.log('📡 Loading room status...');
    
    try {
        // Ensure Supabase client exists
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const { data: rooms, error } = await supabaseClient
            .from('room_status')
            .select('*')
            .order('room_number');
        
        if (error) throw error;
        
        allRoomStatus = rooms || [];
        console.log(`✅ Loaded ${allRoomStatus.length} room statuses`);
        
        displayRoomStatus();
        
    } catch (error) {
        console.error('❌ Error loading room status:', error);
        document.getElementById('roomStatusGrid').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e53e3e;">
                Failed to load room status: ${error.message}
            </div>
        `;
    }
}

// Display room status organized by floor
function displayRoomStatus() {
    const grid = document.getElementById('roomStatusGrid');
    
    if (allRoomStatus.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-light);">No rooms found</div>';
        return;
    }
    
    // Group rooms by floor
    const floors = {
        'Ground': [],
        'First': [],
        'Second': [],
        'Third': []
    };
    
    allRoomStatus.forEach(room => {
        if (floors[room.floor]) {
            floors[room.floor].push(room);
        }
    });
    
    // Sort rooms within each floor
    Object.keys(floors).forEach(floor => {
        floors[floor].sort((a, b) => a.room_number.localeCompare(b.room_number));
    });
    
    // Generate HTML grouped by floor
    let html = '';
    
    ['Ground', 'First', 'Second', 'Third'].forEach(floor => {
        if (floors[floor].length > 0) {
            html += `
                <div class="floor-section">
                    <div class="floor-header">
                        <h3>🏢 ${floor} Floor</h3>
                        <span class="floor-count">${floors[floor].length} rooms</span>
                    </div>
                    <div class="room-status-grid">
                        ${floors[floor].map(room => `
                            <div class="room-status-card ${room.status} ${room.room_type.toLowerCase().replace(' ', '-')}" 
                                 onclick="changeRoomStatus('${room.room_number}', '${room.status}')"
                                 title="Click to change status">
                                <div class="room-number">${room.room_number}</div>
                                <div class="room-type-label">${room.room_type}</div>
                                <div class="room-status-badge">${getStatusIcon(room.status)} ${formatStatus(room.status)}</div>
                                ${room.last_cleaned ? `<div class="room-info">Cleaned: ${new Date(room.last_cleaned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>` : ''}
                                ${room.notes ? `<div class="room-notes">${room.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    grid.innerHTML = html;
}

// Display tasks
function displayTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧹</div>
                <div class="empty-state-title">No Tasks Found</div>
                <div class="empty-state-description">Click "New Housekeeping Task" to create your first task</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Room</th>
                        <th>Task Type</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assigned To</th>
                        <th>Created</th>
                        <th>Notes</th>
                        <th style="text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td><strong>${task.room_number}</strong></td>
                            <td>${formatTaskType(task.task_type)}</td>
                            <td><span class="badge badge-${task.status}">${getStatusIcon(task.status)} ${formatStatus(task.status)}</span></td>
                            <td><span class="badge badge-priority-${task.priority}">${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}</span></td>
                            <td>${task.assigned_to || '<em>Unassigned</em>'}</td>
                            <td>${new Date(task.created_at).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${task.notes || ''}">${task.notes || '<em>No notes</em>'}</td>
                            <td>
                                <div style="justify-content: center;">
                                    ${task.status === 'pending' ? `
                                        <button onclick="updateTaskStatus('${task.id}', 'in_progress')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #4CAF50, #45a049);">
                                            ▶️ Start
                                        </button>
                                    ` : ''}
                                    ${task.status === 'in_progress' ? `
                                        <button onclick="updateTaskStatus('${task.id}', 'completed')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white;">
                                            ✅ Complete
                                        </button>
                                    ` : ''}
                                    ${task.status === 'completed' ? `
                                        <button onclick="updateTaskStatus('${task.id}', 'verified')" class="btn-icon btn-sm" style="background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white;">
                                            ✓✓ Verify
                                        </button>
                                    ` : ''}
                                    ${task.status === 'verified' ? `
                                        <span class="badge badge-verified">✓ Verified</span>
                                    ` : ''}
                                    <button onclick="deleteTask('${task.id}')" class="btn-icon btn-sm delete" title="Delete task">
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
async function updateStats() {
    try {
        const pending = allTasks.filter(t => t.status === 'pending').length;
        const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
        const highPriority = allTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
        
        const today = new Date().toISOString().split('T')[0];
        const completedToday = allTasks.filter(t => 
            t.completed_at && t.completed_at.startsWith(today)
        ).length;
        
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('inProgressTasks').textContent = inProgress;
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('highPriority').textContent = highPriority;
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Setup filters
function setupFilters() {
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    
    let filtered = allTasks;
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
        filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    displayTasks(filtered);
}

// Setup form
function setupForm() {
    document.getElementById('taskForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveTask();
    });
}

// Open new task modal
function openNewTaskModal() {
    document.getElementById('modalTitle').textContent = 'Create Housekeeping Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskModal').style.display = 'flex';
}

// Close modal
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Save task
async function saveTask() {
    const room = document.getElementById('taskRoom').value;
    const type = document.getElementById('taskType').value;
    const priority = document.getElementById('taskPriority').value;
    const assignedTo = document.getElementById('taskAssignedTo').value;
    const notes = document.getElementById('taskNotes').value;
    
    const taskData = {
        room_number: room,
        task_type: type,
        priority: priority,
        assigned_to: assignedTo || null,
        notes: notes || null,
        status: 'pending',
        created_by: JSON.parse(localStorage.getItem('hms_user') || '{}').name || 'Admin'
    };
    
    try {
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const { error } = await supabaseClient
            .from('housekeeping_tasks')
            .insert([taskData]);
        
        if (error) throw error;
        
        console.log('✅ Task created');
        closeTaskModal();
        await loadData();
        
    } catch (error) {
        console.error('❌ Error creating task:', error);
        alert('Failed to create task: ' + error.message);
    }
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    try {
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const updateData = { 
            status: newStatus,
            updated_at: new Date().toISOString()
        };
        
        if (newStatus === 'completed') {
            updateData.completed_at = new Date().toISOString();
        }
        
        const { error } = await supabaseClient
            .from('housekeeping_tasks')
            .update(updateData)
            .eq('id', taskId);
        
        if (error) throw error;
        
        console.log(`✅ Task updated to ${newStatus}`);
        await loadData();
        
    } catch (error) {
        console.error('❌ Error updating task:', error);
        alert('Failed to update task: ' + error.message);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    
    try {
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const { error } = await supabaseClient
            .from('housekeeping_tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        
        console.log('✅ Task deleted');
        await loadData();
        
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        alert('Failed to delete task: ' + error.message);
    }
}

// Change room status
async function changeRoomStatus(roomNumber, currentStatus) {
    const statuses = ['clean', 'dirty', 'in_progress', 'inspected', 'out_of_service'];
    const currentIndex = statuses.indexOf(currentStatus);
    const newStatus = statuses[(currentIndex + 1) % statuses.length];
    
    try {
        if (!supabaseClient) {
            supabaseClient = await getSupabaseClient();
        }
        
        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };
        
        if (newStatus === 'clean') {
            updateData.last_cleaned = new Date().toISOString();
        } else if (newStatus === 'inspected') {
            updateData.last_inspected = new Date().toISOString();
        }
        
        const { error } = await supabaseClient
            .from('room_status')
            .update(updateData)
            .eq('room_number', roomNumber);
        
        if (error) throw error;
        
        console.log(`✅ Room ${roomNumber} status: ${newStatus}`);
        await loadRoomStatus();
        
    } catch (error) {
        console.error('❌ Error updating room status:', error);
    }
}

// Helper functions
function getStatusIcon(status) {
    const icons = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        verified: '✓✓',
        clean: '✨',
        dirty: '🧹',
        inspected: '👁️',
        out_of_service: '🚫'
    };
    return icons[status] || '•';
}

function getPriorityIcon(priority) {
    const icons = {
        low: '⬇️',
        normal: '➖',
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

function formatTaskType(type) {
    return type.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Close modal on outside click
document.getElementById('taskModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeTaskModal();
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ Housekeeping module loaded');