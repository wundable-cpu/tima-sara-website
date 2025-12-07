console.log('💬 WhatsApp module loading...');

const supabase = window.supabase_client;

let allMessages = [];
let allGuests = [];
let templates = [];
let settings = {
    provider: 'ultramsg',
    instanceId: '',
    apiToken: '',
    autoSend: true,
    reminders: true,
    testMode: true // Default to test mode until configured
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ WhatsApp page loaded');
    
    if (!supabase) {
        alert('Database connection failed. Please refresh.');
        return;
    }
    
    await loadSettings();
    await loadMessages();
    await loadTemplates();
    await loadGuests();
    setupFilters();
    setupForms();
    checkConfiguration();
});

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('whatsapp_settings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        console.log('✅ WhatsApp settings loaded');
    }
}

// Check if WhatsApp is configured
function checkConfiguration() {
    if (!settings.instanceId || !settings.apiToken) {
        document.getElementById('setupNotice').style.display = 'block';
        console.log('⚠️ WhatsApp not configured');
    } else {
        document.getElementById('setupNotice').style.display = 'none';
        console.log('✅ WhatsApp configured');
    }
}

// Load WhatsApp messages
async function loadMessages() {
    console.log('📡 Loading WhatsApp messages...');
    
    try {
        const { data: messages, error } = await supabase
            .from('whatsapp_notifications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allMessages = messages || [];
        console.log(`✅ Loaded ${allMessages.length} messages`);
        
        displayMessages(allMessages);
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        document.getElementById('messagesContainer').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-title">Failed to load messages</div>
                <div class="empty-state-description">${error.message}</div>
            </div>
        `;
    }
}

// Load templates
async function loadTemplates() {
    console.log('📡 Loading WhatsApp templates...');
    
    try {
        const { data: tmpl, error } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('is_active', true)
            .order('template_name');
        
        if (error) throw error;
        
        templates = tmpl || [];
        console.log(`✅ Loaded ${templates.length} templates`);
        
        populateTemplateDropdown();
        
    } catch (error) {
        console.error('❌ Error loading templates:', error);
    }
}

// Load guests for dropdown
async function loadGuests() {
    console.log('📡 Loading guests...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: guests, error } = await supabase
            .from('bookings')
            .select('*')
            .gte('check_out', today)
            .order('guest_name');
        
        if (error) throw error;
        
        allGuests = guests || [];
        console.log(`✅ Loaded ${allGuests.length} guests`);
        
        populateGuestDropdown();
        
    } catch (error) {
        console.error('❌ Error loading guests:', error);
    }
}

// Populate guest dropdown
function populateGuestDropdown() {
    const select = document.getElementById('whatsappRecipient');
    
    if (allGuests.length === 0) {
        select.innerHTML = '<option value="">-- No active guests --</option>';
        return;
    }
    
    select.innerHTML = '<option value="">-- Select Guest --</option>' +
        allGuests.map(guest => 
            `<option value="${guest.id}" data-phone="${guest.guest_phone}" data-name="${guest.guest_name}">
                ${guest.guest_name} - ${guest.room_number} (${new Date(guest.check_in).toLocaleDateString('en-GB')})
            </option>`
        ).join('');
    
    // Update phone when guest selected
    select.addEventListener('change', function() {
        const option = this.options[this.selectedIndex];
        const phone = option.getAttribute('data-phone') || '';
        document.getElementById('whatsappPhone').value = formatPhoneNumber(phone);
    });
}

// Populate template dropdown
// Populate template dropdown
function populateTemplateDropdown() {
    const select = document.getElementById('whatsappTemplate');
    
    select.innerHTML = '<option value="">-- Custom Message --</option>' +
        templates.map(template => 
            `<option value="${template.id}">${template.template_name}</option>`
        ).join('');
    
    // Load template when selected
    select.addEventListener('change', function() {
        if (this.value) {
            const template = templates.find(t => t.id === this.value);
            const recipientId = document.getElementById('whatsappRecipient').value;
            
            if (!recipientId) {
                alert('⚠️ Please select a guest first!');
                this.value = '';
                return;
            }
            
            if (template) {
                const guest = allGuests.find(g => g.id === recipientId);
                if (guest) {
                    const message = fillTemplateVariables(template.message_template, guest);
                    document.getElementById('whatsappMessage').value = message;
                    updateCharCount();
                }
            }
        }
    });
}

// Fill template variables with actual guest data
function fillTemplateVariables(template, guest) {
    let message = template;
    
    // Replace all variables
    message = message
        .replace(/{guest_name}/g, guest.guest_name)
        .replace(/{booking_reference}/g, guest.booking_reference)
        .replace(/{check_in}/g, new Date(guest.check_in).toLocaleDateString('en-GB', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }))
        .replace(/{check_out}/g, new Date(guest.check_out).toLocaleDateString('en-GB', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }))
        .replace(/{room_type}/g, guest.room_type || 'Standard')
        .replace(/{room_number}/g, guest.room_number)
        .replace(/{num_adults}/g, guest.num_adults || 1)
        .replace(/{num_children}/g, guest.num_children || 0)
        .replace(/{total_price}/g, parseFloat(guest.total_price || 0).toFixed(2));
    
    return message;
}

// Display messages
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-title">No Messages Yet</div>
                <div class="empty-state-description">Send your first WhatsApp message to guests!</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="sms-log-card" style="border-left: 4px solid ${getStatusColor(msg.status)};">
            <div class="sms-log-header">
                <div>
                    <div class="sms-log-recipient">${msg.recipient_name || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
                        📱 ${msg.recipient_phone}
                        ${msg.booking_reference ? `• 📋 ${msg.booking_reference}` : ''}
                    </div>
                </div>
                <span class="badge badge-${msg.status}">${getStatusIcon(msg.status)} ${formatStatus(msg.status)}</span>
            </div>
            
            <div class="sms-log-message" style="white-space: pre-wrap;">${msg.message}</div>
            
            <div class="sms-log-footer">
                <div>
                    <span style="background: ${getTypeColor(msg.sms_type)}; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${getTypeIcon(msg.sms_type)} ${formatType(msg.sms_type)}
                    </span>
                </div>
                <div>
                    📅 ${new Date(msg.created_at).toLocaleString('en-GB', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                    ${msg.sent_at ? ` • ✅ Sent ${new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
            </div>
            
            ${msg.error_message ? `
                <div style="margin-top: 10px; padding: 10px; background: #ffebee; border-radius: 6px; font-size: 12px; color: #c62828;">
                    ❌ Error: ${msg.error_message}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Update stats
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const sentToday = allMessages.filter(m => 
        m.sent_at && m.sent_at.startsWith(today)
    ).length;
    
    const deliveredToday = allMessages.filter(m => 
        m.status === 'delivered' && m.delivered_at && m.delivered_at.startsWith(today)
    ).length;
    
    const pending = allMessages.filter(m => m.status === 'pending').length;
    const failed = allMessages.filter(m => m.status === 'failed').length;
    
    document.getElementById('sentToday').textContent = sentToday;
    document.getElementById('deliveredToday').textContent = deliveredToday;
    document.getElementById('pendingMessages').textContent = pending;
    document.getElementById('failedMessages').textContent = failed;
}

// Setup filters
function setupFilters() {
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const status = document.getElementById('statusFilter').value;
    const type = document.getElementById('typeFilter').value;
    
    let filtered = allMessages;
    
    if (status !== 'all') {
        filtered = filtered.filter(m => m.status === status);
    }
    
    if (type !== 'all') {
        filtered = filtered.filter(m => m.sms_type === type);
    }
    
    displayMessages(filtered);
}

// Setup forms
function setupForms() {
    // WhatsApp form
    document.getElementById('whatsappForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await sendWhatsAppMessage();
    });
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSettings();
    });
    
    // Character count
    document.getElementById('whatsappMessage').addEventListener('input', updateCharCount);
}

function updateCharCount() {
    const message = document.getElementById('whatsappMessage').value;
    document.getElementById('charCount').textContent = message.length;
}

// Open send WhatsApp modal
function openSendWhatsAppModal() {
    document.getElementById('whatsappForm').reset();
    document.getElementById('whatsappModal').style.display = 'flex';
}

// Close modal
function closeWhatsAppModal() {
    document.getElementById('whatsappModal').style.display = 'none';
}

// Send WhatsApp message
async function sendWhatsAppMessage() {
    const recipientId = document.getElementById('whatsappRecipient').value;
    const phone = document.getElementById('whatsappPhone').value;
    const message = document.getElementById('whatsappMessage').value;
    
    if (!recipientId || !phone || !message) {
        alert('Please fill in all required fields');
        return;
    }
    
    const guest = allGuests.find(g => g.id === recipientId);
    if (!guest) {
        alert('Guest not found');
        return;
    }
    
    // Save to database first
    const messageData = {
        recipient_phone: phone,
        recipient_name: guest.guest_name,
        message: message,
        status: settings.testMode ? 'sent' : 'pending',
        sms_type: 'custom',
        booking_reference: guest.booking_reference
    };
    
    try {
        const { data, error } = await supabase
            .from('whatsapp_notifications')
            .insert([messageData])
            .select();
        
        if (error) throw error;
        
        // If not in test mode, send via API
        if (!settings.testMode && settings.instanceId && settings.apiToken) {
            await sendViaUltramsg(phone, message, data[0].id);
        } else {
            console.log('🧪 Test mode - message logged but not sent');
            alert('✅ Message saved! (Test Mode - not actually sent)\n\nConfigure WhatsApp API in Settings to send real messages.');
        }
        
        console.log('✅ Message saved');
        closeWhatsAppModal();
        await loadMessages();
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message: ' + error.message);
    }
}

// Send via Ultramsg API
async function sendViaUltramsg(phone, message, messageId) {
    const url = `https://api.ultramsg.com/${settings.instanceId}/messages/chat`;
    
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
    
    const payload = {
        token: settings.apiToken,
        to: cleanPhone,
        body: message
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.sent === 'true' || result.sent === true) {
            // Update message status
            await supabase
                .from('whatsapp_notifications')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    external_id: result.id
                })
                .eq('id', messageId);
            
            console.log('✅ WhatsApp sent successfully');
            alert('✅ WhatsApp message sent successfully!');
        } else {
            throw new Error(result.error || 'Failed to send');
        }
        
    } catch (error) {
        console.error('❌ Ultramsg API error:', error);
        
        // Update message status
        await supabase
            .from('whatsapp_notifications')
            .update({
                status: 'failed',
                error_message: error.message
            })
            .eq('id', messageId);
        
        throw error;
    }
}

// Send check-in reminders
// Send check-in reminders
async function sendCheckInReminders() {
    if (!confirm('Send check-in reminders to all guests checking in tomorrow?')) {
        return;
    }
    
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Get guests checking in tomorrow
        const { data: guests, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('check_in', tomorrowStr)
            .in('status', ['confirmed', 'pending']);
        
        if (error) throw error;
        
        if (!guests || guests.length === 0) {
            alert('ℹ️ No guests checking in tomorrow');
            return;
        }
        
        // Get reminder template
        const template = templates.find(t => t.template_type === 'reminder' && t.template_name === 'check_in_reminder');
        
        let sent = 0;
        for (const guest of guests) {
            if (!guest.guest_phone) continue;
            
            let message = template ? fillTemplateVariables(template.message_template, guest) : 
                `Hello *${guest.guest_name}*!\n\nYour check-in at Tima Sara Hotel is *tomorrow* (${new Date(guest.check_in).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })})\n\n🛏️ *Room ${guest.room_number}* will be ready for you\n⏰ *Check-in time:* 2:00 PM onwards\n\nSee you soon! 😊`;
            
            const messageData = {
                recipient_phone: guest.guest_phone,
                recipient_name: guest.guest_name,
                message: message,
                status: settings.testMode ? 'sent' : 'pending',
                sms_type: 'check_in_reminder',
                booking_reference: guest.booking_reference
            };
            
            const { data, error: insertError } = await supabase
                .from('whatsapp_notifications')
                .insert([messageData])
                .select();
            
            if (insertError) {
                console.error('Error saving reminder:', insertError);
                continue;
            }
            
            // Send if not test mode
            if (!settings.testMode && settings.instanceId && settings.apiToken) {
                try {
                    await sendViaUltramsg(guest.guest_phone, message, data[0].id);
                } catch (sendError) {
                    console.error('Error sending to', guest.guest_name, ':', sendError);
                }
            }
            
            sent++;
        }
        
        alert(`✅ ${sent} check-in reminder(s) ${settings.testMode ? 'logged' : 'sent'}!`);
        await loadMessages();
        
    } catch (error) {
        console.error('❌ Error sending reminders:', error);
        alert('Failed to send reminders: ' + error.message);
    }
}

// View templates (future feature)
function viewTemplates() {
    alert('📝 Template Management\n\nComing soon! You can currently edit templates directly in the database.\n\nGo to Supabase → whatsapp_templates table');
}

// View settings
function viewSettings() {
    // Populate settings form
    document.getElementById('settingProvider').value = settings.provider;
    document.getElementById('settingInstanceId').value = settings.instanceId;
    document.getElementById('settingApiToken').value = settings.apiToken;
    document.getElementById('settingAutoSend').checked = settings.autoSend;
    document.getElementById('settingReminders').checked = settings.reminders;
    document.getElementById('settingTestMode').checked = settings.testMode;
    
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Save settings
async function saveSettings() {
    settings.provider = document.getElementById('settingProvider').value;
    settings.instanceId = document.getElementById('settingInstanceId').value.trim();
    settings.apiToken = document.getElementById('settingApiToken').value.trim();
    settings.autoSend = document.getElementById('settingAutoSend').checked;
    settings.reminders = document.getElementById('settingReminders').checked;
    settings.testMode = document.getElementById('settingTestMode').checked;
    
    localStorage.setItem('whatsapp_settings', JSON.stringify(settings));
    
    console.log('✅ Settings saved');
    closeSettingsModal();
    checkConfiguration();
    
    alert('✅ WhatsApp settings saved successfully!');
}

// Test WhatsApp connection
async function testWhatsApp() {
    if (!settings.instanceId || !settings.apiToken) {
        alert('⚠️ Please enter Instance ID and API Token first');
        return;
    }
    
    try {
        const url = `https://api.ultramsg.com/${settings.instanceId}/instance/status?token=${settings.apiToken}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.accountStatus === 'authenticated') {
            alert('✅ Connection successful!\n\nYour WhatsApp is connected and ready to send messages.');
        } else {
            alert('⚠️ Connection issue\n\nStatus: ' + result.accountStatus + '\n\nPlease check your credentials or scan the QR code in Ultramsg dashboard.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        alert('❌ Connection test failed\n\nError: ' + error.message + '\n\nPlease check your Instance ID and API Token.');
    }
}

// Helper functions
function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +233
    if (cleaned.startsWith('0')) {
        cleaned = '233' + cleaned.substring(1);
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    
    return cleaned;
}

function getStatusIcon(status) {
    const icons = {
        pending: '⏳',
        sent: '✅',
        delivered: '✓✓',
        failed: '❌'
    };
    return icons[status] || '•';
}

function getStatusColor(status) {
    const colors = {
        pending: '#FF9800',
        sent: '#4CAF50',
        delivered: '#25D366',
        failed: '#f44336'
    };
    return colors[status] || '#9e9e9e';
}

function getTypeIcon(type) {
    const icons = {
        booking_confirmation: '🎉',
        check_in_reminder: '🏨',
        check_out_reminder: '👋',
        payment_confirmation: '💵',
        custom: '✉️'
    };
    return icons[type] || '💬';
}

function getTypeColor(type) {
    const colors = {
        booking_confirmation: '#E3F2FD',
        check_in_reminder: '#FFF3E0',
        check_out_reminder: '#F3E5F5',
        payment_confirmation: '#E8F5E9',
        custom: '#F5F5F5'
    };
    return colors[type] || '#f5f5f5';
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatType(type) {
    return type.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Close modals on outside click
document.getElementById('whatsappModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeWhatsAppModal();
});

document.getElementById('settingsModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeSettingsModal();
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('hms_user');
        window.location.href = 'admin-login.html';
    }
});

console.log('✅ WhatsApp module loaded');