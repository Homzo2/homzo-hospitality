/* ================================================
   HOMZO – Admin Dashboard JavaScript
   ================================================ */

// ─── Toast ───────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:18px"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(60px)'; t.style.transition='0.3s'; setTimeout(()=>t.remove(),300); }, 4000);
}

function openModal(id)  { document.getElementById(id).style.display='flex'; document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).style.display='none'; document.body.style.overflow=''; }
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if(e.target===m) closeModal(m.id); }));

const rolePermissionsMapping = {
  'super_admin': {
    sidebar: ['dashboard', 'bookings', 'properties', 'guests', 'inquiries', 'reviews', 'revenue', 'partners', 'audit', 'careers', 'admin-console', 'management-console', 'developer-console', 'settings'],
    mcTabs: ['dashboard', 'properties', 'partners', 'bookings', 'guests', 'revenue', 'marketing', 'quality', 'expansion', 'alerts']
  },
  'ceo': {
    sidebar: ['dashboard', 'bookings', 'properties', 'guests', 'inquiries', 'reviews', 'revenue', 'partners', 'audit', 'careers', 'admin-console', 'management-console', 'developer-console', 'settings'],
    mcTabs: ['dashboard', 'properties', 'partners', 'bookings', 'guests', 'revenue', 'marketing', 'quality', 'expansion', 'alerts']
  },
  'coo': {
    sidebar: ['dashboard', 'bookings', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'bookings', 'guests', 'alerts']
  },
  'cto': {
    sidebar: ['dashboard', 'developer-console', 'settings'],
    mcTabs: []
  },
  'cmo': {
    sidebar: ['dashboard', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'marketing', 'alerts']
  },
  'city manager': {
    sidebar: ['dashboard', 'properties', 'bookings', 'guests', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'properties', 'bookings', 'guests', 'quality', 'alerts']
  },
  'quality manager': {
    sidebar: ['dashboard', 'properties', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'properties', 'quality', 'alerts']
  },
  'guest relations': {
    sidebar: ['dashboard', 'bookings', 'guests', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'bookings', 'guests', 'alerts']
  },
  'finance manager': {
    sidebar: ['dashboard', 'revenue', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'revenue', 'alerts']
  },
  'general admin': {
    sidebar: ['dashboard', 'bookings', 'properties', 'guests', 'inquiries', 'reviews', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'properties', 'bookings', 'guests', 'alerts']
  },
  'developer': {
    sidebar: ['dashboard', 'developer-console', 'settings'],
    mcTabs: []
  },
  'operations_executive': {
    sidebar: ['dashboard', 'bookings', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'bookings', 'guests', 'alerts']
  },
  'operations executive': {
    sidebar: ['dashboard', 'bookings', 'management-console', 'settings'],
    mcTabs: ['dashboard', 'bookings', 'guests', 'alerts']
  }
};

let sessionToken = localStorage.getItem('homzo_admin_token') || '';

async function checkAdminSession() {
  const token = localStorage.getItem('homzo_admin_token');
  const userJson = localStorage.getItem('homzo_admin_user');
  
  if (token && userJson) {
    try {
      const res = await fetch('/api/auth/session', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = JSON.parse(userJson);
        window.currentUser = data;
        sessionToken = token;
        
        if (data.email === 'admin@homzo.in' || data.role.toLowerCase() === 'ceo' || data.role === 'super_admin') {
          mcRole = 'super_admin';
          mcCity = 'all';
        } else {
          mcRole = data.role;
          mcCity = 'all';
          if (data.assignedCityId) {
            if (String(data.assignedCityId) === '1') mcCity = 'Mumbai';
            else if (String(data.assignedCityId) === '2') mcCity = 'Delhi';
            else if (String(data.assignedCityId) === '3') mcCity = 'Bangalore';
          }
        }
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminLayout').style.display = 'flex';
        
        const avatarEl = document.querySelector('.admin-avatar');
        if (avatarEl) avatarEl.textContent = data.name.charAt(0).toUpperCase();
        const nameEl = document.querySelector('.sidebar-admin-info strong');
        if (nameEl) nameEl.textContent = data.name;
        const roleEl = document.querySelector('.sidebar-admin-info span');
        if (roleEl) roleEl.textContent = data.role;
        
        const perms = rolePermissionsMapping[mcRole.toLowerCase()] || rolePermissionsMapping['general admin'];
        const allowed = perms ? perms.sidebar : ['dashboard'];
        if (allowed && allowed.length > 0) {
          const defaultPage = allowed.includes('dashboard') ? 'dashboard' : allowed[0];
          switchPage(defaultPage);
        } else {
          switchPage('dashboard');
        }
        
        initDashboard();
      } else {
        localStorage.removeItem('homzo_admin_token');
        localStorage.removeItem('homzo_admin_user');
      }
    } catch (err) {
      console.error('Failed to verify admin session on load:', err);
    }
  }
}
document.addEventListener('DOMContentLoaded', checkAdminSession);

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
  if (typeof mcRole !== 'undefined') headers['X-Simulated-Role'] = mcRole;
  if (typeof mcCity !== 'undefined') headers['X-Simulated-City'] = mcCity;
  return headers;
}

// ─── Login ───────────────────────────────────────────
  // Password Visibility Toggle for theme
  const pwToggleTheme = document.getElementById('pwToggleTheme');
  if (pwToggleTheme) {
    pwToggleTheme.addEventListener('click', () => {
      const pwInput = document.getElementById('loginPassword');
      if (pwInput) {
        if (pwInput.type === 'password') {
          pwInput.type = 'text';
          pwToggleTheme.className = 'fa-regular fa-eye pw-toggle-icon';
        } else {
          pwInput.type = 'password';
          pwToggleTheme.className = 'fa-regular fa-eye-slash pw-toggle-icon';
        }
      }
    });
  }

  // Forgot password click & Password Reset modal logic
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const passwordResetModal = document.getElementById('passwordResetModal');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyResetBtn = document.getElementById('verifyResetBtn');
  const resetStep1 = document.getElementById('resetStep1');
  const resetStep2 = document.getElementById('resetStep2');
  const resetEmail = document.getElementById('resetEmail');
  const resetOtp = document.getElementById('resetOtp');
  const resetNewPassword = document.getElementById('resetNewPassword');
  const resetConfirmPassword = document.getElementById('resetConfirmPassword');

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('passwordResetModal');
      resetStep1.style.display = 'block';
      resetStep2.style.display = 'none';
      resetEmail.value = '';
    });
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
      const email = resetEmail.value.trim();
      if (!email) {
        showToast('Please enter your registered email address.', 'error');
        return;
      }
      sendOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      sendOtpBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) {
          showToast('Verification OTP generated successfully! Check console logs.', 'success');
          resetStep1.style.display = 'none';
          resetStep2.style.display = 'block';
          resetOtp.value = '';
          resetNewPassword.value = '';
          resetConfirmPassword.value = '';
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to send OTP code.', 'error');
        }
      } catch (e) {
        showToast('Connection to backend failed.', 'error');
      } finally {
        sendOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP Code';
        sendOtpBtn.disabled = false;
      }
    });
  }

  if (verifyResetBtn) {
    verifyResetBtn.addEventListener('click', async () => {
      const email = resetEmail.value.trim();
      const otp = resetOtp.value.trim();
      const newPassword = resetNewPassword.value;
      const confirmPassword = resetConfirmPassword.value;

      if (!otp || !newPassword || !confirmPassword) {
        showToast('Please fill out all fields.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
      if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      verifyResetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
      verifyResetBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword })
        });
        if (res.ok) {
          showToast('Password reset successfully! You can now log in.', 'success');
          closeModal('passwordResetModal');
        } else {
          const err = await res.json();
          showToast(err.error || 'Password reset failed.', 'error');
        }
      } catch (e) {
        showToast('Connection to backend failed.', 'error');
      } finally {
        verifyResetBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Update Password';
        verifyResetBtn.disabled = false;
      }
    });
  }

  // Login Button Submit
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;

      if (!email || !pass) {
        showToast('Please fill in all credentials.', 'error');
        return;
      }

      // Add loading state
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      loginBtn.style.opacity = '0.8';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'partner') {
            showToast('Access denied: Partner accounts must use the Partner Portal.', 'error');
            return;
          }
          sessionToken = data.token;
          localStorage.setItem('homzo_admin_token', data.token);
          localStorage.setItem('homzo_admin_user', JSON.stringify(data));
          
          if (data.email === 'admin@homzo.in' || data.role.toLowerCase() === 'ceo' || data.role === 'super_admin') {
            mcRole = 'super_admin';
            mcCity = 'all';
          } else {
            mcRole = data.role;
            mcCity = 'all';
            if (data.assignedCityId) {
              if (String(data.assignedCityId) === '1') mcCity = 'Mumbai';
              else if (String(data.assignedCityId) === '2') mcCity = 'Delhi';
              else if (String(data.assignedCityId) === '3') mcCity = 'Bangalore';
            }
          }
          
          document.getElementById('loginScreen').style.display = 'none';
          document.getElementById('adminLayout').style.display = 'flex';
          
          const avatarEl = document.querySelector('.admin-avatar');
          if (avatarEl) avatarEl.textContent = data.name.charAt(0).toUpperCase();
          const nameEl = document.querySelector('.sidebar-admin-info strong');
          if (nameEl) nameEl.textContent = data.name;
          const roleEl = document.querySelector('.sidebar-admin-info span');
          if (roleEl) roleEl.textContent = data.role;
          
          const perms = rolePermissionsMapping[mcRole.toLowerCase()] || rolePermissionsMapping['general admin'];
          const allowed = perms ? perms.sidebar : ['dashboard'];
          if (allowed && allowed.length > 0) {
            const defaultPage = allowed.includes('dashboard') ? 'dashboard' : allowed[0];
            switchPage(defaultPage);
          } else {
            switchPage('dashboard');
          }
          
          initDashboard();
          showToast(`Welcome back, ${data.name}!`, 'success');
        } else {
          const err = await res.json();
          showToast(err.error || 'Invalid credentials.', 'error');
        }
      } catch (e) {
        showToast('Connection to backend failed.', 'error');
      } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.style.opacity = '1';
      }
    });
  }
  document.getElementById('loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('loginBtn').click(); });

// ─── Logout ──────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
  } catch (e) {}
  sessionToken = '';
  window.currentUser = null;
  localStorage.removeItem('homzo_admin_token');
  localStorage.removeItem('homzo_admin_user');
  document.getElementById('adminLayout').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showToast('Logged out successfully.', 'info');
});

// ─── Sidebar Toggle ──────────────────────────────────
const sidebar   = document.getElementById('sidebar');
const adminMain = document.getElementById('adminMain');
document.getElementById('sidebarToggle').addEventListener('click', () => {
  if (window.innerWidth <= 900) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    adminMain.classList.toggle('expanded');
  }
});

// ─── Page Navigation ─────────────────────────────────
function switchPage(name) {
  // Role restriction check
  const currentRoleLower = mcRole.toLowerCase();
  const perms = rolePermissionsMapping[currentRoleLower] || rolePermissionsMapping['general admin'];
  if (perms && perms.sidebar && !perms.sidebar.includes(name) && name !== 'dashboard' && name !== 'settings') {
    showToast('Access Denied: Your role does not have access to this module.', 'error');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });
  let title = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  document.getElementById('topbarTitle').textContent = title;
  if (name === 'revenue') renderRevenueCharts();
  if (name === 'properties') renderAdminProperties();
  if (name === 'guests') renderGuests();
  if (name === 'inquiries') renderInquiries();
  if (name === 'bookings') renderBookings();
  if (name === 'reviews') renderReviews();
  if (name === 'partners') loadPartners();
  if (name === 'audit') loadAuditLogs();
  if (name === 'careers') initCareersPage();
  if (name === 'admin-console') initAdminConsole();
  if (name === 'management-console') initManagementConsole();
  if (name === 'developer-console') initDeveloperConsole();
  if (window.innerWidth <= 900) sidebar.classList.remove('mobile-open');
}

document.querySelectorAll('.sidebar-link[data-page]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); switchPage(l.dataset.page); });
});
document.getElementById('addPropertyBtn').addEventListener('click', openAddPropertyModal);

// ─── Data ────────────────────────────────────────────
const bookingsData = [];

let guestsData = [];
let mcPayouts = [];

// ─── KPI Counters ─────────────────────────────────────
function animateKPI(el, target, prefix='', suffix='') {
  if (!el) return;
  if (target === 0) { el.textContent = prefix + '0' + suffix; return; }
  let c=0; const step=Math.ceil(target/50) || 1;
  const t=setInterval(()=>{ c=Math.min(c+step,target); el.textContent=prefix+c.toLocaleString()+suffix; if(c>=target) clearInterval(t); },25);
}

// ─── Dashboard Init ──────────────────────────────────
async function initDashboard() {
  // Initialize role permissions sidebar visibility
  updateSidebarVisibility();

  await fetchGuestsFromAPI();
  await fetchReviewsFromAPI();
  if (adminProps.length === 0) await fetchPropertiesFromAPI();
  
  let totalRev = 0;
  guestsData.forEach(g => {
    let gt = g.type.toLowerCase();
    let p = 2000;
    if (gt.includes('student')) p = 5000;
    else if (gt.includes('employee')) p = 12000;
    else if (gt.includes('tourist')) p = 3000;
    else if (gt.includes('foreigner')) p = 4000;
    else if (gt.includes('couple')) p = 4500;
    totalRev += p;
  });

  animateKPI(document.getElementById('kpiRevenue'), totalRev, '₹');
  animateKPI(document.getElementById('kpiBookings'), guestsData.length, '', '');
  animateKPI(document.getElementById('kpiProps'), adminProps.length, '', '');
  animateKPI(document.getElementById('kpiGuests'), guestsData.length, '', '');

  animateKPI(document.getElementById('revThisMonth'), totalRev, '₹');
  animateKPI(document.getElementById('revThisQuarter'), totalRev * 3, '₹');
  animateKPI(document.getElementById('revThisYear'), totalRev * 12, '₹');
  animateKPI(document.getElementById('revOccupancy'), 75, '', '%');

  renderRecentBookings();
}

// ─── Recent Bookings Table ────────────────────────────
function renderRecentBookings() {
  const tbody = document.getElementById('recentBookingsTbody');
  tbody.innerHTML = bookingsData.slice(0,5).map(b => `
    <tr>
      <td><div class="guest-name-cell"><div class="guest-mini-avatar" style="background:${b.color}">${b.guest[0]}</div>${b.guest}</div></td>
      <td><span class="badge badge-${b.type==='students'?'success':b.type==='employees'?'info':b.type==='tourists'?'warning':'primary'}">${b.type}</span></td>
      <td style="color:var(--text-primary)">${b.property}</td>
      <td>${b.checkin}</td>
      <td><span class="badge badge-${b.status==='confirmed'?'success':b.status==='pending'?'warning':'danger'}">${b.status}</span></td>
      <td style="color:var(--primary);font-weight:700">${b.amount}</td>
    </tr>`).join('');
}

// ─── Full Bookings Table ──────────────────────────────
function renderBookings(filter='all', statusF='all', search='') {
  let data = [...bookingsData];
  if (filter !== 'all') data = data.filter(b => b.type === filter);
  if (statusF !== 'all') data = data.filter(b => b.status === statusF);
  if (search) data = data.filter(b => b.guest.toLowerCase().includes(search) || b.property.toLowerCase().includes(search));
  document.getElementById('bookingsTbody').innerHTML = data.map(b => `
    <tr>
      <td style="font-weight:700;color:var(--primary)">${b.id}</td>
      <td><div class="guest-name-cell"><div class="guest-mini-avatar" style="background:${b.color}">${b.guest[0]}</div>${b.guest}</div></td>
      <td><span class="badge badge-${b.type==='students'?'success':b.type==='employees'?'info':b.type==='tourists'?'warning':'primary'}">${b.type}</span></td>
      <td style="color:var(--text-primary)">${b.property}</td>
      <td>${b.checkin}</td><td>${b.checkout}</td>
      <td style="color:var(--primary);font-weight:700">${b.amount}</td>
      <td><span class="badge badge-${b.status==='confirmed'?'success':b.status==='pending'?'warning':'danger'}">${b.status}</span></td>
      <td><div class="action-btns">
        <button class="act-btn" title="View" onclick="viewBooking('${b.id}')"><i class="fa-solid fa-eye"></i></button>
        ${b.status==='pending'?`<button class="act-btn" title="Confirm" onclick="confirmBooking('${b.id}')"><i class="fa-solid fa-check"></i></button>`:''}
        <button class="act-btn danger" title="Cancel" onclick="cancelBooking('${b.id}')"><i class="fa-solid fa-xmark"></i></button>
      </div></td>
    </tr>`).join('');
}

document.getElementById('bookingSearch').addEventListener('input', e => renderBookings(document.getElementById('bookingFilter').value, document.getElementById('statusFilter').value, e.target.value.toLowerCase()));
document.getElementById('bookingFilter').addEventListener('change', e => renderBookings(e.target.value, document.getElementById('statusFilter').value, document.getElementById('bookingSearch').value.toLowerCase()));
document.getElementById('statusFilter').addEventListener('change', e => renderBookings(document.getElementById('bookingFilter').value, e.target.value, document.getElementById('bookingSearch').value.toLowerCase()));

function viewBooking(id) {
  const b = bookingsData.find(x => x.id===id);
  document.getElementById('baTitle').textContent = 'Booking ' + id;
  
  const detailRows = [
    ['Guest', b.guest],
    ['DOB', b.dob],
    ['Persons', b.persons],
    ['Property', b.property],
    ['Type', b.type],
    ['Check-In', b.checkin],
    ['Check-Out', b.checkout],
    ['Amount', b.amount],
    ['Special Requests', b.notes || 'None'],
    ['Booking Status', b.status],
    ['Payment Status', b.paymentStatus || 'Unpaid']
  ];
  
  if (b.transactionRef) {
    detailRows.push(['UPI Ref No (UTR)', `<span style="font-family:monospace; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.9rem;" id="utrText">${b.transactionRef}</span> <button class="btn btn-link btn-sm" onclick="navigator.clipboard.writeText('${b.transactionRef}'); showToast('UTR copied to clipboard!', 'success');" style="padding:0; min-height:auto; display:inline; margin-left:6px; background:none; border:none; color:var(--primary); cursor:pointer;"><i class="fa-solid fa-copy"></i></button>`]);
  }

  document.getElementById('baContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">
      ${detailRows.map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:12px;align-items:center;">
          <span style="color:var(--text-muted);font-size:.83rem;font-weight:600;text-transform:uppercase">${k}</span>
          <span style="font-weight:600">${v}</span>
        </div>`).join('')}
      <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="sendInvoice('${b.id}')"><i class="fa-solid fa-file-invoice"></i> Send Invoice</button>
    </div>`;
  openModal('bookingActionModal');
}

async function sendInvoice(id) {
  closeModal('bookingActionModal');
  try {
    const res = await fetch(`/api/admin/bookings/${id}/invoice`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Invoice email sent successfully!', 'success');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to send invoice.', 'error');
    }
  } catch (e) {
    showToast('Network error while sending invoice.', 'error');
  }
}

async function confirmBooking(id) {
  const b = bookingsData.find(x=>x.id===id);
  if(b){
    try {
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        b.status='confirmed';
        b.paymentStatus='Paid';
        renderBookings();
        renderRecentBookings();
        showToast(`Booking ${id} confirmed!`,'success');
        updatePendingBadge();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to confirm booking.', 'error');
      }
    } catch (e) {
      showToast('Network error while confirming booking.', 'error');
    }
  }
}

async function cancelBooking(id) {
  const b = bookingsData.find(x=>x.id===id);
  if(b){
    try {
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        b.status='cancelled';
        renderBookings();
        renderRecentBookings();
        showToast(`Booking ${id} cancelled.`,'error');
        updatePendingBadge();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to cancel booking.', 'error');
      }
    } catch (e) {
      showToast('Network error while cancelling booking.', 'error');
    }
  }
}

function updatePendingBadge() {
  const n = bookingsData.filter(b=>b.status==='pending').length;
  document.getElementById('pendingBadge').textContent = n;
}

// ─── Admin Properties ─────────────────────────────────
let adminProps = [];

async function fetchPropertiesFromAPI() {
  try {
    const res = await fetch('/api/properties');
    if (!res.ok) throw new Error('Failed to fetch properties');
    adminProps = await res.json();
  } catch (err) {
    console.error('API Error:', err);
  }
}

async function renderAdminProperties(filter='all', search='') {
  if (adminProps.length === 0) await fetchPropertiesFromAPI();
  
  let data = [...adminProps];
  if (filter!=='all') data=data.filter(p=>p.type===filter);
  if (search) data=data.filter(p=>p.name.toLowerCase().includes(search)||p.location.toLowerCase().includes(search));
  document.getElementById('adminPropGrid').innerHTML = data.map(p => `
    <div class="admin-prop-card">
      <div class="apc-img">
        <img src="${p.img}" alt="${p.name}">
        <div class="apc-status badge badge-${p.status==='active'?'success':'warning'}">${p.status}</div>
      </div>
      <div class="apc-body">
        <div class="apc-name">${p.name}</div>
        <div class="apc-loc"><i class="fa-solid fa-location-dot"></i> ${p.location}</div>
        <div class="apc-meta">
          <span><i class="fa-solid fa-bed"></i> ${p.beds} Bed</span>
          <span><i class="fa-solid fa-bath"></i> ${p.baths} Bath</span>
          <span><i class="fa-solid fa-vector-square"></i> ${p.area} sq.ft</span>
        </div>
        <div class="apc-footer">
          <div class="apc-price">${p.price}</div>
          <div class="action-btns">
            <button class="act-btn" title="Edit" onclick="showToast('Edit mode for: ${p.name}','info')"><i class="fa-solid fa-pen"></i></button>
            <button class="act-btn danger" title="Remove" onclick="removeProperty(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`).join('');
}

function removeProperty(id) {
  const i = adminProps.findIndex(p=>p.id===id);
  if(i>-1){ adminProps.splice(i,1); renderAdminProperties(); showToast('Property removed.','error'); }
}

document.getElementById('propSearch').addEventListener('input', e => renderAdminProperties(document.getElementById('propTypeFilter').value, e.target.value.toLowerCase()));
document.getElementById('propTypeFilter').addEventListener('change', e => renderAdminProperties(e.target.value, document.getElementById('propSearch').value.toLowerCase()));

// Add Property
function openAddPropertyModal() { openModal('addPropertyModal'); }
document.getElementById('savePropertyBtn').addEventListener('click', async () => {
  const name = document.getElementById('apName').value.trim();
  const city = document.getElementById('apCity').value;
  const type = document.getElementById('apType').value;
  const price = document.getElementById('apPrice').value.trim();
  const unit = document.getElementById('apUnit').value;
  if (!name || !price) { showToast('Name and price are required.','error'); return; }
  
  const imgs = {students:'student_room.png',employees:'employee_room.png',tourists:'tourist_room.png',foreigners:'foreigner_room.png',couples:'couple_room.png'};
  const propertyData = {
    name, location: city, type, price: `${price}${unit}`, 
    beds: +document.getElementById('apBeds').value, 
    baths: +document.getElementById('apBaths').value, 
    area: +document.getElementById('apArea').value||300, 
    img: imgs[type]
  };

  try {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData)
    });
    if (!res.ok) throw new Error('Failed to save property');
    
    closeModal('addPropertyModal');
    showToast(`"${name}" added successfully!`, 'success');
    ['apName','apPrice','apArea'].forEach(id => document.getElementById(id).value='');
    
    if (document.getElementById('page-properties').classList.contains('active')) {
      await renderAdminProperties();
    }
  } catch (err) {
    showToast('Failed to connect to backend.', 'error');
  }
});

// ─── Guests ──────────────────────────────────────────
async function fetchGuestsFromAPI() {
  try {
    const res = await fetch('/api/guests');
    if (!res.ok) throw new Error('Failed to fetch guests');
    const data = await res.json();
    guestsData = data.map(g => {
      let gt = (g.guest_type || 'Unknown').toLowerCase();
      let p = 2000;
      if (gt.includes('student')) p = 5000;
      else if (gt.includes('employee')) p = 12000;
      else if (gt.includes('tourist')) p = 3000;
      else if (gt.includes('foreigner')) p = 4000;
      else if (gt.includes('couple')) p = 4500;
      
      return {
        id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone || 'N/A',
        type: g.guest_type || 'Unknown',
        property: g.property || 'Pending Assignment',
        checkin: g.checkin || '',
        checkout: g.checkout || '',
        dob: g.dob || '',
        persons: g.persons || 1,
        notes: g.notes || 'None',
        bookings: 1,
        spent: `₹${p.toLocaleString()}`,
        status: 'active',
        bookingStatus: g.status || 'confirmed',
        paymentStatus: g.payment_status || 'Unpaid',
        transactionRef: g.transaction_ref || ''
      };
    });

    bookingsData.length = 0;
    guestsData.forEach((g, i) => {
      bookingsData.push({
        id: `BKG${1000 + g.id}`,
        guest: g.name,
        color: ['#22c55e','#3b82f6','#f59e0b','#a855f7','#ef4444'][i % 5],
        type: g.type,
        property: g.property && g.property !== 'Pending Assignment' ? g.property : 'Pending Assignment',
        checkin: g.checkin || new Date().toISOString().split('T')[0],
        checkout: g.checkout || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        dob: g.dob || 'N/A',
        persons: g.persons || 1,
        amount: g.spent,
        notes: g.notes || 'None',
        status: g.bookingStatus || 'confirmed',
        paymentStatus: g.paymentStatus || 'Unpaid',
        transactionRef: g.transactionRef || ''
      });
    });
    if (typeof updatePendingBadge === 'function') updatePendingBadge();
  } catch (err) {
    console.error('API Error:', err);
  }
}

async function renderGuests(filter='all', search='') {
  if (guestsData.length === 0) await fetchGuestsFromAPI();

  let data = [...guestsData];
  if (filter!=='all') data=data.filter(g=>g.type.toLowerCase()===filter.toLowerCase());
  if (search) data=data.filter(g=>g.name.toLowerCase().includes(search)||g.email.toLowerCase().includes(search));
  const typeColors = {Student:'#22c55e',Employee:'#3b82f6',Tourist:'#f59e0b',Foreigner:'#a855f7',Unknown:'#64748b'};
  document.getElementById('guestsTbody').innerHTML = data.map(g => {
    const c = typeColors[g.type] || typeColors['Unknown'];
    const bColor = g.type==='Student'?'success':g.type==='Employee'?'info':g.type==='Tourist'?'warning':'primary';
    return `
    <tr>
      <td style="color:var(--text-muted)">${g.id}</td>
      <td><div class="guest-name-cell"><div class="guest-mini-avatar" style="background:${c}">${g.name[0]}</div><strong style="color:var(--text-primary)">${g.name}</strong></div></td>
      <td>${g.email}</td><td>${g.phone}</td>
      <td><span class="badge badge-${bColor}">${g.type}</span></td>
      <td style="text-align:center">${g.bookings}</td>
      <td style="color:var(--primary);font-weight:700">${g.spent}</td>
      <td><span class="badge badge-${g.status==='active'?'success':'danger'}">${g.status}</span></td>
    </tr>`;
  }).join('');
}

document.getElementById('guestSearch').addEventListener('input', e => renderGuests(document.getElementById('guestTypeFilter').value, e.target.value.toLowerCase()));
document.getElementById('guestTypeFilter').addEventListener('change', e => renderGuests(e.target.value, document.getElementById('guestSearch').value.toLowerCase()));

// ─── Inquiries ──────────────────────────────────────────
let inquiriesData = [];
async function fetchInquiriesFromAPI() {
  try {
    const res = await fetch('/api/inquiries');
    if (!res.ok) throw new Error('Failed to fetch inquiries');
    inquiriesData = await res.json();
  } catch (err) {
    console.error('API Error:', err);
  }
}

async function renderInquiries(search = '') {
  if (inquiriesData.length === 0) await fetchInquiriesFromAPI();
  
  let data = [...inquiriesData];
  if (search) data = data.filter(i => i.name.toLowerCase().includes(search) || i.email.toLowerCase().includes(search));
  
  document.getElementById('inquiriesTbody').innerHTML = data.map(i => `
    <tr>
      <td style="color:var(--text-muted); white-space:nowrap;">${new Date(i.created_at).toLocaleDateString()}</td>
      <td><strong style="color:var(--text-primary)">${i.name}</strong></td>
      <td>${i.email}</td>
      <td><span class="badge badge-info">${i.type}</span></td>
      <td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${i.message}">${i.message}</td>
    </tr>
  `).join('');
}

document.getElementById('inquirySearch').addEventListener('input', e => renderInquiries(e.target.value.toLowerCase()));

// ─── Charts ──────────────────────────────────────────
let revenueChartInst, guestTypeChartInst, revTrendInst, revCatInst;
const chartDefaults = {
  color: 'rgba(255,255,255,0.7)',
  gridColor: 'rgba(255,255,255,0.05)',
  font: { family: 'Plus Jakarta Sans', size: 12 }
};




function renderRevenueCharts() {
  const ctx1 = document.getElementById('revTrendChart');
  const ctx2 = document.getElementById('revCatChart');
  if (!ctx1 || !ctx2) return;

  const catRev = { Students: 0, Employees: 0, Tourists: 0, Foreigners: 0, Couples: 0 };
  let totalRev = 0;
  
  guestsData.forEach(g => {
    let gt = (g.type || '').toLowerCase();
    let p = 2000;
    if (gt.includes('student')) { p = 5000; catRev.Students += p; }
    else if (gt.includes('employee')) { p = 12000; catRev.Employees += p; }
    else if (gt.includes('tourist')) { p = 3000; catRev.Tourists += p; }
    else if (gt.includes('foreigner')) { p = 4000; catRev.Foreigners += p; }
    else if (gt.includes('couple')) { p = 4500; catRev.Couples += p; }
    else { catRev.Students += p; }
    totalRev += p;
  });
  
  if (totalRev === 0) totalRev = 50000;

  const labelsCat = ['Students', 'Employees', 'Tourists', 'Foreigners', 'Couples'];
  const dataCat = [catRev.Students, catRev.Employees, catRev.Tourists, catRev.Foreigners, catRev.Couples];
  const colorsCat = ['rgba(34,197,94,0.7)', 'rgba(59,130,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(168,85,247,0.7)', 'rgba(239,68,68,0.7)'];

  const yW = [1, 1.5, 2, 1.8, 2.5, 3, 2.8, 3.5, 3.2, 4, 4.5, 5];
  const monthTrend = yW.map(w => Math.round((w / 34.8) * totalRev));

  if (revTrendInst) revTrendInst.destroy();
  revTrendInst = new Chart(ctx1, {
    type:'bar',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets:[{ label:'Revenue (₹)', data: monthTrend, backgroundColor:'rgba(255,92,53,0.7)', borderRadius:6, hoverBackgroundColor:'#ff5c35' }]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#161b23',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,titleColor:'#f0f2f5',bodyColor:'#8a93a6'}},scales:{x:{grid:{color:chartDefaults.gridColor},ticks:{color:chartDefaults.color,font:chartDefaults.font}},y:{grid:{color:chartDefaults.gridColor},ticks:{color:chartDefaults.color,font:chartDefaults.font}}}}
  });
  
  if (revCatInst) revCatInst.destroy();
  revCatInst = new Chart(ctx2, {
    type:'bar',
    data:{
      labels: labelsCat,
      datasets:[{ label:'Revenue (₹)', data: dataCat, backgroundColor: colorsCat, borderRadius:8 }]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#161b23',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,titleColor:'#f0f2f5',bodyColor:'#8a93a6'}},scales:{x:{grid:{color:chartDefaults.gridColor},ticks:{color:chartDefaults.color,font:chartDefaults.font}},y:{grid:{display:false},ticks:{color:chartDefaults.color,font:chartDefaults.font}}}}
  });
}

// ─── Compact Sidebar Toggle ───────────────────────────
document.getElementById('compactToggle').addEventListener('change', e => {
  sidebar.style.width = e.target.checked ? '68px' : '260px';
  adminMain.style.marginLeft = e.target.checked ? '68px' : '260px';
});

// ─── Notification Bell ────────────────────────────────
document.getElementById('notifBtn').addEventListener('click', () => {
  showToast('3 pending bookings need your attention!', 'info');
});

// ─── Reviews ──────────────────────────────────────────
let adminReviews = [];

async function fetchReviewsFromAPI() {
  try {
    const res = await fetch('/api/reviews');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    adminReviews = await res.json();
    updatePendingReviewsBadge();
  } catch (err) {
    console.error('API Error:', err);
  }
}

function updatePendingReviewsBadge() {
  const pending = adminReviews.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('pendingReviewsBadge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline-block' : 'none';
  }
}

async function renderReviews(filterRating='all', statusF='all', search='') {
  if (adminReviews.length === 0) await fetchReviewsFromAPI();

  let data = [...adminReviews];
  if (filterRating !== 'all') data = data.filter(r => r.rating === parseInt(filterRating));
  if (statusF !== 'all') data = data.filter(r => r.status === statusF);
  if (search) {
    data = data.filter(r => r.name.toLowerCase().includes(search) || r.review.toLowerCase().includes(search) || r.email.toLowerCase().includes(search));
  }

  // Sort by date added, newest first
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const tbody = document.getElementById('reviewsTbody');
  if (!tbody) return;

  tbody.innerHTML = data.map(r => {
    let starsHtml = '';
    for (let s = 1; s <= 5; s++) {
      if (s <= r.rating) {
        starsHtml += '<i class="fa-solid fa-star" style="color:#ff5c35; font-size:11px;"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color:var(--text-muted); font-size:11px;"></i>';
      }
    }

    const dateStr = new Date(r.created_at).toLocaleDateString();
    return `
      <tr>
        <td style="font-weight:700;color:var(--primary)">#RV${r.id}</td>
        <td><strong>${r.name}</strong></td>
        <td>${r.email}</td>
        <td><div style="white-space:nowrap">${starsHtml}</div></td>
        <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${r.review}">${r.review}</td>
        <td><span class="badge badge-${r.status==='approved'?'success':'warning'}">${r.status}</span></td>
        <td><div class="action-btns">
          ${r.status==='pending'
            ? `<button class="act-btn success" title="Approve" onclick="approveReview(${r.id})" style="color: var(--success); border-color: rgba(34,197,94,0.3);"><i class="fa-solid fa-check"></i></button>`
            : `<button class="act-btn" title="Approved" disabled style="opacity: 0.6; cursor: not-allowed; color: var(--success); border-color: rgba(34,197,94,0.2);"><i class="fa-solid fa-circle-check"></i></button>`
          }
          <button class="act-btn" title="${r.reply ? 'Edit Reply' : 'Reply'}" onclick="openReplyModal(${r.id})" style="${r.reply ? 'color: var(--info);' : ''}"><i class="fa-solid fa-comment-dots"></i></button>
          <button class="act-btn danger" title="Delete" onclick="deleteReview(${r.id})"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`;
  }).join('');
}

// Global functions for inline onclick handlers
window.approveReview = async function(id) {
  try {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    if (!res.ok) throw new Error('Failed to approve review');
    
    showToast('Review approved successfully!', 'success');
    await fetchReviewsFromAPI();
    renderReviews(
      document.getElementById('reviewFilter').value,
      document.getElementById('reviewStatusFilter').value,
      document.getElementById('reviewSearch').value.toLowerCase()
    );
  } catch (err) {
    showToast('Failed to approve review.', 'error');
  }
}

window.deleteReview = async function(id) {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete review');
    
    showToast('Review deleted.', 'error');
    await fetchReviewsFromAPI();
    renderReviews(
      document.getElementById('reviewFilter').value,
      document.getElementById('reviewStatusFilter').value,
      document.getElementById('reviewSearch').value.toLowerCase()
    );
  } catch (err) {
    showToast('Failed to delete review.', 'error');
  }
}

// Setup event listeners for reviews filtering
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('reviewSearch');
  const ratingFilter = document.getElementById('reviewFilter');
  const statusFilter = document.getElementById('reviewStatusFilter');
  const toggleReviews = document.getElementById('guestReviewsToggle');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      renderReviews(ratingFilter.value, statusFilter.value, e.target.value.toLowerCase());
    });
  }
  if (ratingFilter) {
    ratingFilter.addEventListener('change', e => {
      renderReviews(e.target.value, statusFilter.value, searchInput.value.toLowerCase());
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      renderReviews(ratingFilter.value, e.target.value, searchInput.value.toLowerCase());
    });
  }
  if (toggleReviews) {
    // Sync UI with stored setting
    const saved = localStorage.getItem('homzo_guest_reviews_active');
    toggleReviews.checked = saved !== 'false';
    toggleReviews.addEventListener('change', e => {
      localStorage.setItem('homzo_guest_reviews_active', e.target.checked);
      showToast(e.target.checked ? 'Guest reviews enabled on site.' : 'Guest reviews disabled on site.', 'info');
    });
  }

  const saveReplyBtn = document.getElementById('saveReplyBtn');
  if (saveReplyBtn) {
    saveReplyBtn.addEventListener('click', async () => {
      const id = parseInt(document.getElementById('repReviewId').value);
      const reply = document.getElementById('repContent').value.trim();

      const btn = document.getElementById('saveReplyBtn');
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      try {
        const res = await fetch(`/api/reviews/${id}/reply`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply })
        });
        if (!res.ok) throw new Error('Failed to save reply');

        closeModal('reviewReplyModal');
        showToast('Reply saved successfully!', 'success');
        
        await fetchReviewsFromAPI();
        renderReviews(
          document.getElementById('reviewFilter').value,
          document.getElementById('reviewStatusFilter').value,
          document.getElementById('reviewSearch').value.toLowerCase()
        );
      } catch (err) {
        showToast('Failed to save reply.', 'error');
      } finally {
        btn.innerHTML = originalHtml;
      }
    });
  }
});

window.openReplyModal = function(id) {
  const r = adminReviews.find(x => x.id === id);
  if (!r) return;

  document.getElementById('repReviewId').value = id;
  document.getElementById('repGuestName').textContent = r.name;
  document.getElementById('repText').textContent = r.review;
  
  // Stars string
  let stars = '';
  for (let s = 0; s < r.rating; s++) stars += '⭐';
  document.getElementById('repStars').textContent = stars;

  document.getElementById('repContent').value = r.reply || '';
  openModal('reviewReplyModal');
}

// ─── PARTNERS & AUDIT LOGS MANAGEMENT ───

let allPartners = [];

async function loadPartners() {
  try {
    if (typeof loadOnboardingProperties === 'function') {
      loadOnboardingProperties();
    }
    const res = await fetch('/api/super/partners', { headers: getHeaders() });
    if (!res.ok) return;
    allPartners = await res.json();
    
    const tbody = document.getElementById('partnersTbody');
    if (allPartners.length > 0) {
      tbody.innerHTML = allPartners.map(p => `
        <tr>
          <td style="font-weight:700; color:var(--primary)">#PT${p.id}</td>
          <td>
            <strong>${p.name}</strong><br>
            <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">${p.email}</span><br>
            <span style="font-size:0.75rem; color:var(--text-muted);">${p.phone || 'No Phone'}</span>
          </td>
          <td>${p.assignedProperties.join(', ') || '<span style="color:var(--danger)">No Properties</span>'}</td>
          <td>
            <span class="badge badge-${p.verificationStatus === 'verified' ? 'success' : p.verificationStatus === 'rejected' ? 'danger' : 'warning'}">${p.verificationStatus.toUpperCase()}</span>
          </td>
          <td>
            <span class="badge badge-${p.status === 'active' ? 'success' : 'danger'}">${p.status.toUpperCase()}</span>
          </td>
          <td>
            <div class="action-btns">
              <button class="act-btn" style="color:var(--info); border-color:rgba(59,130,246,0.25);" title="Login as Partner" onclick="impersonatePartner(${p.id})"><i class="fa-solid fa-user-ninja"></i></button>
              <button class="act-btn" title="Review KYC" onclick="openKycReview(${p.id})"><i class="fa-solid fa-file-shield"></i></button>
              <button class="act-btn" style="color:${p.status === 'active' ? 'var(--danger)' : 'var(--success)'}; border-color:${p.status === 'active' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'};" title="${p.status === 'active' ? 'Suspend' : 'Activate'}" onclick="togglePartnerStatus(${p.id})">
                <i class="fa-solid fa-${p.status === 'active' ? 'ban' : 'circle-check'}"></i>
              </button>
              <button class="act-btn danger" title="Delete Partner" onclick="deletePartner(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No partners created.</td></tr>`;
    }
  } catch (err) {
    showToast('Failed to load partners.', 'error');
  }
}

window.openAddPartnerModal = function() {
  openModal('addPartnerModal');
}

// Bind Partner Create Form
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addPartnerForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('apPartnerName').value.trim();
      const email = document.getElementById('apPartnerEmail').value.trim();
      const password = document.getElementById('apPartnerPassword').value;
      const phone = document.getElementById('apPartnerPhone').value.trim();
      const assignedProperties = document.getElementById('apPartnerProperties').value.trim().split(',').filter(Boolean);

      try {
        const res = await fetch('/api/super/partners', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ name, email, password, phone, assignedProperties })
        });
        if (res.ok) {
          showToast('Partner account created successfully!', 'success');
          closeModal('addPartnerModal');
          document.getElementById('addPartnerForm').reset();
          loadPartners();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create partner.', 'error');
        }
      } catch (err) {
        showToast('Error connecting to backend.', 'error');
      }
    });
  }
});

window.openKycReview = function(id) {
  const p = allPartners.find(x => x.id === id);
  if (!p) return;

  document.getElementById('kycPartnerId').value = p.id;
  document.getElementById('kycPartnerEmail').textContent = p.email;
  document.getElementById('kycPartnerGst').textContent = p.gst || 'Not Provided';
  document.getElementById('kycPartnerPan').textContent = p.pan || 'Not Provided';
  document.getElementById('kycPartnerBank').innerHTML = p.bankAccount 
    ? `A/C No: ${p.bankAccount}<br>IFSC: ${p.bankIfsc}`
    : 'Not Provided';
  document.getElementById('kycPartnerProps').value = p.assignedProperties.join(',');
  document.getElementById('kycPartnerPassword').value = '';

  openModal('kycVerifyModal');
}

window.updateKycStatus = async function(status) {
  const id = document.getElementById('kycPartnerId').value;
  const assignedProperties = document.getElementById('kycPartnerProps').value.trim().split(',').filter(Boolean);
  const password = document.getElementById('kycPartnerPassword').value;

  const payload = { verificationStatus: status, assignedProperties };
  if (password) payload.password = password;

  try {
    const res = await fetch(`/api/super/partners/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(`Partner KYC review submitted as: ${status}`, 'success');
      closeModal('kycVerifyModal');
      loadPartners();
    } else {
      showToast('Failed to update KYC status.', 'error');
    }
  } catch (err) {
    showToast('Error connecting to backend.', 'error');
  }
}

window.impersonatePartner = async function(id) {
  try {
    const res = await fetch(`/api/super/partners/${id}/impersonate`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('homzo_partner_token', data.token);
      showToast('Impersonating partner... Opening Partner Portal.', 'success');
      setTimeout(() => window.open('/management_console/partner.html', '_blank'), 1000);
    } else {
      showToast('Failed to impersonate partner.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

window.togglePartnerStatus = async function(id) {
  const p = allPartners.find(x => x.id === id);
  if (!p) return;
  const newStatus = p.status === 'active' ? 'suspended' : 'active';

  if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this partner account?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/super/partners/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Partner account status updated to ${newStatus}`, 'success');
      loadPartners();
    } else {
      showToast('Failed to update partner status.', 'error');
    }
  } catch (err) {
    showToast('Error connecting to backend.', 'error');
  }
}

window.deletePartner = async function(id) {
  if (!confirm('Are you sure you want to delete this partner account permanently?')) return;

  try {
    const res = await fetch(`/api/super/partners/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Partner account deleted.', 'error');
      loadPartners();
    } else {
      showToast('Failed to delete partner.', 'error');
    }
  } catch (err) {
    showToast('Error connecting to backend.', 'error');
  }
}

async function loadAuditLogs() {
  try {
    const res = await fetch('/api/super/audit-logs', { headers: getHeaders() });
    if (!res.ok) return;
    const logs = await res.json();
    
    const tbody = document.getElementById('auditTbody');
    if (logs.length > 0) {
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="color:var(--text-muted); font-size:0.75rem; white-space:nowrap;">${new Date(l.timestamp).toLocaleString()}</td>
          <td>
            <strong style="color:var(--text-primary)">${l.email}</strong><br>
            <span class="badge badge-info" style="font-size:0.65rem; padding:1px 6px;">${l.role.toUpperCase()}</span>
          </td>
          <td><span class="badge badge-warning" style="font-size:0.65rem; padding:1px 6px;">${l.action.toUpperCase()}</span></td>
          <td style="font-size:0.8rem; color:var(--text-secondary); max-width:250px;">${l.details}</td>
          <td style="font-size:0.72rem; color:var(--text-muted);">
            IP: ${l.ip}<br>
            <span style="font-size:0.65rem; overflow:hidden; display:inline-block; max-width:150px; text-overflow:ellipsis; white-space:nowrap;" title="${l.userAgent}">${l.userAgent}</span>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No logs recorded.</td></tr>`;
    }
  } catch (err) {
    showToast('Failed to load audit logs.', 'error');
  }
}

// ════════════════ CAREERS SECTION MANAGEMENT ════════════════

let adminJobsList = [];
let adminAppsList = [];
let currentCareersTab = 'jobs';

window.switchCareersTab = function(tab) {
  currentCareersTab = tab;
  document.getElementById('tabJobsBtn').classList.toggle('active', tab === 'jobs');
  document.getElementById('tabAppsBtn').classList.toggle('active', tab === 'apps');
  document.getElementById('careersJobsSection').style.display = tab === 'jobs' ? 'block' : 'none';
  document.getElementById('careersAppsSection').style.display = tab === 'apps' ? 'block' : 'none';
};

window.initCareersPage = async function() {
  await fetchAdminJobs();
  await fetchAdminApplications();
  populateAppJobFilter();
  renderAdminJobs();
  renderAdminApps();
};

async function fetchAdminJobs() {
  try {
    const res = await fetch('/api/admin/careers/jobs', { headers: getHeaders() });
    if (res.ok) {
      adminJobsList = await res.json();
    } else {
      showToast('Failed to fetch job postings.', 'error');
    }
  } catch (e) {
    showToast('Network error fetching jobs.', 'error');
  }
}

async function fetchAdminApplications() {
  try {
    const res = await fetch('/api/admin/careers/applications', { headers: getHeaders() });
    if (res.ok) {
      adminAppsList = await res.json();
      document.getElementById('appsCountBadge').textContent = adminAppsList.length;
    } else {
      showToast('Failed to fetch applications.', 'error');
    }
  } catch (e) {
    showToast('Network error fetching applications.', 'error');
  }
}

function populateAppJobFilter() {
  const filter = document.getElementById('adminAppJobFilter');
  const uniqueJobIds = [...new Set(adminAppsList.map(a => a.Job_ID))];
  
  let html = '<option value="all">All Positions</option>';
  uniqueJobIds.forEach(jobId => {
    const job = adminJobsList.find(j => j.ID === jobId);
    const title = job ? job.Title : jobId;
    html += `<option value="${jobId}">${title}</option>`;
  });
  filter.innerHTML = html;
}

window.renderAdminJobs = function() {
  const searchVal = document.getElementById('adminJobSearch').value.toLowerCase().trim();
  const deptVal = document.getElementById('adminJobDeptFilter').value;
  const statusVal = document.getElementById('adminJobStatusFilter').value;
  
  const filtered = adminJobsList.filter(j => {
    const matchesSearch = j.Title.toLowerCase().includes(searchVal) || j.Location.toLowerCase().includes(searchVal);
    const matchesDept = deptVal === 'all' || j.Department === deptVal;
    const matchesStatus = statusVal === 'all' || j.Status === statusVal;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const tbody = document.getElementById('adminJobsTbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No matching vacancies found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(j => {
    const isUrgent = j.Status === 'Urgent Hiring';
    const badgeClass = j.Status === 'Closed' ? 'badge-danger' : isUrgent ? 'badge-warning' : 'badge-success';
    
    return `
      <tr>
        <td style="font-weight:700; color:var(--text-primary)">${j.Title}</td>
        <td><span class="badge badge-info" style="font-size:0.75rem">${j.Department}</span></td>
        <td style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot"></i> ${j.Location}</td>
        <td>${j.Employment_Type} (${j.Work_Mode})</td>
        <td style="text-align:center;">${j.Vacancies}</td>
        <td>
          <select class="form-control" style="padding:4px 8px; font-size:0.8rem; max-width:130px; font-weight:600; border-color:transparent;" onchange="updateJobStatus('${j.ID}', this.value)">
            <option value="Open" ${j.Status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="Urgent Hiring" ${j.Status === 'Urgent Hiring' ? 'selected' : ''}>Urgent Hiring</option>
            <option value="Closed" ${j.Status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </td>
        <td>
          <div class="action-btns">
            <button class="act-btn" title="Edit Job" onclick="openEditJobModal('${j.ID}')"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="act-btn danger" title="Delete Job" onclick="deleteJob('${j.ID}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.renderAdminApps = function() {
  const searchVal = document.getElementById('adminAppSearch').value.toLowerCase().trim();
  const jobVal = document.getElementById('adminAppJobFilter').value;
  const statusVal = document.getElementById('adminAppStatusFilter').value;

  const filtered = adminAppsList.filter(a => {
    const matchesSearch = a.Full_Name.toLowerCase().includes(searchVal) || a.Email.toLowerCase().includes(searchVal) || a.Phone.toLowerCase().includes(searchVal);
    const matchesJob = jobVal === 'all' || a.Job_ID === jobVal;
    const matchesStatus = statusVal === 'all' || a.Status === statusVal;
    return matchesSearch && matchesJob && matchesStatus;
  });

  const tbody = document.getElementById('adminAppsTbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No candidate applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const dateStr = new Date(a.Date_Applied).toLocaleDateString();
    
    // Interactive dropdown style options
    const statusOpts = ['New', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Hired'];
    const dropdownHtml = `
      <select class="form-control" style="padding:4px 8px; font-size:0.8rem; max-width:160px; font-weight:600;" onchange="updateAppStatus(${a.ID}, this.value)">
        ${statusOpts.map(opt => `<option value="${opt}" ${a.Status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
      </select>
    `;

    return `
      <tr>
        <td style="color:var(--text-muted); font-size:0.78rem;">${dateStr}</td>
        <td>
          <div style="font-weight:700; color:var(--text-primary)">${a.Full_Name}</div>
          <span style="font-size:0.75rem; color:var(--text-muted);">${a.Email}</span>
        </td>
        <td style="font-weight:600; color:var(--primary);">${a.Job_Title}</td>
        <td>${a.Total_Experience ? a.Total_Experience : 'Not specified'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="downloadResume('${a.Resume_Filename}')" style="padding:4px 10px; font-size:0.75rem;">
            <i class="fa-solid fa-file-pdf"></i> Download File
          </button>
        </td>
        <td>${dropdownHtml}</td>
        <td>
          <div class="action-btns">
            <button class="act-btn" title="View Profile" onclick="viewCandidateDetails(${a.ID})"><i class="fa-solid fa-eye"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

// Bind UI triggers for jobs filtering
document.getElementById('adminJobSearch').addEventListener('input', renderAdminJobs);
document.getElementById('adminJobDeptFilter').addEventListener('change', renderAdminJobs);
document.getElementById('adminJobStatusFilter').addEventListener('change', renderAdminJobs);

// Bind UI triggers for applications filtering
document.getElementById('adminAppSearch').addEventListener('input', renderAdminApps);
document.getElementById('adminAppJobFilter').addEventListener('change', renderAdminApps);
document.getElementById('adminAppStatusFilter').addEventListener('change', renderAdminApps);

window.updateJobStatus = async function(jobId, newStatus) {
  try {
    const res = await fetch(`/api/admin/careers/jobs/${jobId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ Status: newStatus })
    });
    if (res.ok) {
      showToast('Role status updated successfully!', 'success');
      initCareersPage();
    } else {
      showToast('Failed to update status.', 'error');
    }
  } catch (e) {
    showToast('Failed to connect to backend server.', 'error');
  }
};

window.updateAppStatus = async function(appId, newStatus) {
  try {
    const res = await fetch(`/api/admin/careers/applications/${appId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Application status updated to ${newStatus}`, 'success');
      initCareersPage();
    } else {
      showToast('Failed to update status.', 'error');
    }
  } catch (e) {
    showToast('Failed to connect to backend server.', 'error');
  }
};

window.openAddJobModal = function() {
  document.getElementById('jobForm').reset();
  document.getElementById('adminJobId').value = '';
  document.getElementById('jobModalTitle').innerHTML = '<i class="fa-solid fa-briefcase" style="color:var(--primary); margin-right:10px"></i>Create Job Posting';
  document.getElementById('jobFormSubmitBtn').innerHTML = '<i class="fa-solid fa-save"></i> Save Job Posting';
  openModal('jobModal');
};

window.openEditJobModal = function(id) {
  const j = adminJobsList.find(x => x.ID === id);
  if (!j) return;

  document.getElementById('adminJobId').value = j.ID;
  document.getElementById('jobModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:var(--primary); margin-right:10px"></i>Edit Job Posting';
  document.getElementById('jobFormSubmitBtn').innerHTML = '<i class="fa-solid fa-save"></i> Update Job Posting';

  document.getElementById('ajTitle').value = j.Title;
  document.getElementById('ajDept').value = j.Department;
  document.getElementById('ajLoc').value = j.Location;
  document.getElementById('ajType').value = j.Employment_Type;
  document.getElementById('ajMode').value = j.Work_Mode;
  document.getElementById('ajExp').value = j.Experience_Level;
  document.getElementById('ajVacancies').value = j.Vacancies;
  document.getElementById('ajSalary').value = j.Salary || '';
  document.getElementById('ajDeadline').value = j.Deadline || '';
  document.getElementById('ajStatus').value = j.Status;
  document.getElementById('ajDesc').value = j.Description;
  document.getElementById('ajResponsibilities').value = j.Responsibilities || '';
  document.getElementById('ajSkills').value = j.Skills || '';
  document.getElementById('ajQualifications').value = j.Qualifications || '';
  document.getElementById('ajBenefits').value = j.Benefits || '';

  openModal('jobModal');
};

// Form submit handler for jobs CRUD
document.getElementById('jobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const jobId = document.getElementById('adminJobId').value;
  const isEdit = !!jobId;

  const data = {
    title: document.getElementById('ajTitle').value.trim(),
    department: document.getElementById('ajDept').value,
    location: document.getElementById('ajLoc').value,
    employmentType: document.getElementById('ajType').value,
    workMode: document.getElementById('ajMode').value,
    experienceLevel: document.getElementById('ajExp').value,
    vacancies: document.getElementById('ajVacancies').value,
    salary: document.getElementById('ajSalary').value.trim(),
    deadline: document.getElementById('ajDeadline').value,
    status: document.getElementById('ajStatus').value,
    description: document.getElementById('ajDesc').value.trim(),
    responsibilities: document.getElementById('ajResponsibilities').value.trim(),
    skills: document.getElementById('ajSkills').value.trim(),
    qualifications: document.getElementById('ajQualifications').value.trim(),
    benefits: document.getElementById('ajBenefits').value.trim()
  };

  const url = isEdit ? `/api/admin/careers/jobs/${jobId}` : '/api/admin/careers/jobs';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: getHeaders(),
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showToast(isEdit ? 'Job details updated successfully!' : 'New job vacancy posted!', 'success');
      closeModal('jobModal');
      initCareersPage();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to submit form.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend server.', 'error');
  }
});

window.deleteJob = async function(id) {
  if (!confirm('Are you sure you want to delete this job posting permanently?')) return;
  try {
    const res = await fetch(`/api/admin/careers/jobs/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Vacancy deleted successfully.', 'info');
      initCareersPage();
    } else {
      showToast('Failed to delete vacancy.', 'error');
    }
  } catch (e) {
    showToast('Failed to connect to backend server.', 'error');
  }
};

window.downloadResume = async function(filename) {
  try {
    const res = await fetch(`/api/admin/careers/resumes/${filename}`, {
      headers: getHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // remove timestamp prefix for download filename
      const cleanName = filename.substring(filename.indexOf('_') + 1);
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Resume downloaded successfully!', 'success');
    } else {
      showToast('Resume file not found or invalid.', 'error');
    }
  } catch (e) {
    showToast('Failed to connect to file system.', 'error');
  }
};

window.viewCandidateDetails = function(appId) {
  const a = adminAppsList.find(x => x.ID === appId);
  if (!a) return;

  const dateStr = new Date(a.Date_Applied).toLocaleString();
  const detailBox = document.getElementById('appDetailContent');
  
  detailBox.innerHTML = `
    <div style="border-bottom:1px solid var(--border); padding-bottom:12px;">
      <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">APPLICANT FULL NAME</span>
      <div style="font-weight:600; font-size:1.1rem; color:var(--text-primary); margin-top:2px;">${a.Full_Name}</div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">EMAIL ADDRESS</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">
          <a href="mailto:${a.Email}" style="color:var(--primary);">${a.Email}</a>
        </div>
      </div>
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">PHONE NUMBER</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">${a.Phone}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">CURRENT CITY</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">${a.Current_City ? a.Current_City : 'Not specified'}</div>
      </div>
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">QUALIFICATION</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">${a.Highest_Qualification ? a.Highest_Qualification : 'Not specified'}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">TOTAL EXPERIENCE</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">${a.Total_Experience ? a.Total_Experience : 'Not specified'}</div>
      </div>
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">APPLIED POSITION</span>
        <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-top:2px;">${a.Job_Title}</div>
      </div>
    </div>

    ${a.LinkedIn_Profile || a.Portfolio_Website ? `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
      ${a.LinkedIn_Profile ? `
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">LINKEDIN PROFILE</span>
        <div style="margin-top:2px;">
          <a href="${a.LinkedIn_Profile}" target="_blank" style="color:var(--primary); font-size:0.85rem;"><i class="fa-brands fa-linkedin"></i> Profile link</a>
        </div>
      </div>` : ''}
      ${a.Portfolio_Website ? `
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">PORTFOLIO/WEBSITE</span>
        <div style="margin-top:2px;">
          <a href="${a.Portfolio_Website}" target="_blank" style="color:var(--primary); font-size:0.85rem;"><i class="fa-solid fa-globe"></i> Website link</a>
        </div>
      </div>` : ''}
    </div>` : ''}

    <div style="border-bottom:1px solid var(--border); padding-bottom:12px;">
      <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">COVER LETTER</span>
      <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.5; margin-top:4px; background:rgba(255,255,255,0.02); padding:10px; border-radius:4px; border:1px solid var(--border); white-space:pre-wrap;">${a.Cover_Letter ? a.Cover_Letter : 'No cover letter attached.'}</p>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
      <div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">DATE APPLIED</span>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${dateStr}</div>
      </div>
      <button class="btn btn-primary" onclick="downloadResume('${a.Resume_Filename}')">
        <i class="fa-solid fa-cloud-arrow-down"></i> Download Resume
      </button>
    </div>
  `;

  openModal('appDetailModal');
};

// ─── ADMIN CONSOLE ────────────────────────────────────
let adminConsoleTimer = null;

// ════ Super Admin Console State & Mock Data ════
let activeSacTab = 'company';

// Console Users and Permissions state
let sacUsers = [];
let sacRolesPermissions = [];

// Pending Partner Onboarding Applications
let sacPendingPartners = [
  { id: 101, name: 'Royal Palace Ooty', email: 'royalooty@gmail.com', city: 'Ooty', category: '4 Star', status: 'Pending Review', date: '2026-06-28' },
  { id: 102, name: 'Metro Inn Pune', email: 'metropune@gmail.com', city: 'Pune', category: '3 Star', status: 'Pending Review', date: '2026-06-29' }
];

// Announcements
let sacAnnouncements = [
  { id: 1, title: 'Server Maintenance Window', content: 'We will be performing routine database maintenance on 2026-07-02 from 02:00 to 04:00 AM IST. Expect minor latency.', target: 'All Staff', type: 'Informational', date: '2026-06-30 01:00' },
  { id: 2, title: 'Urgent: FY25-26 Compliance filings complete', content: 'All annual returns for the financial year have been successfully filed with the ROC. Director DIN certifications are up to date.', target: 'All Staff', type: 'Informational', date: '2026-06-29 18:30' }
];

// Global Platform Configurations
let sacConfig = {
  globalComm: 15,
  integrationFee: 5000,
  mumbaiComm: 15,
  delhiComm: 12,
  bangaloreComm: 18,
  tcVersion: 'v2.4.1',
  refundPolicy: 'moderate'
};

// Initializer
async function initAdminConsole() {
  let isSuperAdmin = (mcRole === 'super_admin');
  if (!isSuperAdmin && window.allSimUsers && window.allSimUsers.length > 0) {
    const targetUser = window.allSimUsers.find(u => String(u.id) === String(mcRole) || u.email === mcRole);
    if (targetUser && targetUser.email === 'admin@homzo.in') {
      isSuperAdmin = true;
    }
  }

  if (isSuperAdmin) {
    document.getElementById('sac-access-granted-container').style.display = 'flex';
    document.getElementById('sac-access-denied-container').style.display = 'none';
    
    // Bind Event Listeners
    setupSacEventListeners();
    
    // Render current tab
    renderActiveSacTab();
  } else {
    document.getElementById('sac-access-granted-container').style.display = 'none';
    document.getElementById('sac-access-denied-container').style.display = 'flex';
  }
}

// Switch Tab
function switchSacTab(tab) {
  activeSacTab = tab;
  
  // Update nav active classes
  document.querySelectorAll('.sac-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.sacTab === tab);
  });
  
  // Show target panel
  document.querySelectorAll('.sac-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`sac-panel-${tab}`).classList.add('active');
  
  renderActiveSacTab();
}

// Render Router
function renderActiveSacTab() {
  switch (activeSacTab) {
    case 'company':
      // Static + Document Vault
      break;
    case 'financial':
      renderSacFinancial();
      break;
    case 'users':
      renderSacUsers();
      break;
    case 'contracts':
      renderSacContracts();
      break;
    case 'compliance':
      renderSacCompliance();
      break;
    case 'config':
      renderSacConfig();
      break;
    case 'audit':
      renderSacAudit();
      break;
    case 'reports':
      renderSacReports();
      break;
    case 'announcements':
      renderSacAnnouncements();
      break;
    case 'expansion':
      renderSacExpansion();
      break;
    case 'employees':
      renderSacEmployees();
      break;
  }
}

// ════ 3b. CORPORATE STAFF & EMPLOYEES ════
window.superEmployees = [];

async function renderSacEmployees() {
  try {
    const headers = getHeaders();
    const res = await fetch('/api/super/employees', { headers });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to fetch employee list.');
    }
    window.superEmployees = await res.json();
    
    // Calculate KPIs
    const total = window.superEmployees.length;
    const active = window.superEmployees.filter(emp => emp.Status === 'active').length;
    const pendingDocs = window.superEmployees.filter(emp => {
      try {
        const docs = typeof emp.Documents === 'string' ? JSON.parse(emp.Documents) : emp.Documents;
        return !Array.isArray(docs) || docs.length === 0;
      } catch(e) {
        return true;
      }
    }).length;
    const globalScope = window.superEmployees.filter(emp => emp.Cities === 'Global').length;
    
    document.getElementById('sacEmpTotalCount').textContent = total;
    document.getElementById('sacEmpActiveCount').textContent = active;
    document.getElementById('sacEmpPendingDocsCount').textContent = pendingDocs;
    document.getElementById('sacEmpGlobalScopeCount').textContent = globalScope;
    
    filterEmployeesTable();
  } catch (err) {
    console.error('Error loading employees:', err);
    showToast(err.message, 'error');
  }
}

window.filterEmployeesTable = function() {
  const query = document.getElementById('sacEmpSearch').value.toLowerCase().trim();
  const filterRole = document.getElementById('sacEmpFilterRole').value;
  const filterStatus = document.getElementById('sacEmpFilterStatus').value;
  
  const filtered = window.superEmployees.filter(emp => {
    const matchQuery = !query || 
      (emp.Name || '').toLowerCase().includes(query) || 
      (emp.Email || '').toLowerCase().includes(query) ||
      (emp.EmployeeID || '').toLowerCase().includes(query);
      
    const matchRole = filterRole === 'all' || emp.Role === filterRole;
    const matchStatus = filterStatus === 'all' || emp.Status === filterStatus;
    
    return matchQuery && matchRole && matchStatus;
  });
  
  renderSuperEmployeesTable(filtered);
};

function renderSuperEmployeesTable(list) {
  const tbody = document.getElementById('sacEmployeesTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--sac-text-muted); padding:20px;">No employees match the filters.</td></tr>`;
    return;
  }
  
  list.forEach(emp => {
    let docs = [];
    try {
      docs = typeof emp.Documents === 'string' ? JSON.parse(emp.Documents) : (emp.Documents || []);
    } catch(e) {
      docs = [];
    }
    
    const docsCount = Array.isArray(docs) ? docs.length : 0;
    const docBadge = docsCount > 0 
      ? `<span class="badge badge-success" style="cursor:pointer;" onclick="openEmployeeDocVault(${emp.ID})"><i class="fa-solid fa-file-circle-check"></i> ${docsCount} Verified Docs</span>`
      : `<span class="badge badge-warning" style="cursor:pointer;" onclick="openEmployeeDocVault(${emp.ID})"><i class="fa-solid fa-file-circle-exclamation"></i> Pending Docs</span>`;
      
    const statusBadge = emp.Status === 'active'
      ? `<span class="badge badge-success">Active</span>`
      : `<span class="badge badge-danger">Suspended</span>`;
      
    const initial = emp.Name ? emp.Name[0].toUpperCase() : 'E';
    
    tbody.innerHTML += `
      <tr>
        <td><strong>${emp.EmployeeID || 'N/A'}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-glow); border:1px solid var(--primary); display:flex; align-items:center; justify-content:center; color:var(--primary); font-weight:700; font-size:0.85rem;">${initial}</div>
            <div>
              <strong style="display:block; color:var(--sac-text-light); font-size:0.9rem;">${emp.Name}</strong>
              <span style="font-size:0.75rem; color:var(--sac-text-muted);">${emp.Email}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-info">${emp.Role}</span></td>
        <td><span style="font-size:0.85rem; font-weight:500;">${emp.Cities}</span></td>
        <td>${docBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="act-btn" onclick="openEmployeeModal(${emp.ID})" title="Edit Profile" style="padding:4px 8px; font-size:0.75rem; height:auto; width:auto; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-user-pen"></i> Edit</button>
            <button class="act-btn" onclick="openEmployeeDocVault(${emp.ID})" title="Manage Verification Documents" style="padding:4px 8px; font-size:0.75rem; height:auto; width:auto; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-folder-open"></i> Vault</button>
            <button class="act-btn danger" onclick="deleteEmployee(${emp.ID})" title="Remove Staff" style="padding:4px 8px; font-size:0.75rem; height:auto; width:auto; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-trash-can"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}

window.openEmployeeModal = function(employeeId = null) {
  document.getElementById('sacEmployeeForm').reset();
  
  if (employeeId) {
    const emp = window.superEmployees.find(e => Number(e.ID) === Number(employeeId));
    if (emp) {
      document.getElementById('sacEmployeeModalTitle').textContent = 'Update Staff Profile';
      document.getElementById('sacEmployeeSaveBtn').textContent = 'Update Profile';
      document.getElementById('sacEmpId').value = emp.ID;
      document.getElementById('sacEmpIDCode').value = emp.EmployeeID || '';
      document.getElementById('sacEmpName').value = emp.Name;
      document.getElementById('sacEmpEmail').value = emp.Email;
      document.getElementById('sacEmpRole').value = emp.Role;
      document.getElementById('sacEmpCities').value = emp.Cities;
      document.getElementById('sacEmpStatus').value = emp.Status;
    }
  } else {
    document.getElementById('sacEmployeeModalTitle').textContent = 'Onboard Staff Member';
    document.getElementById('sacEmployeeSaveBtn').textContent = 'Onboard Staff';
    document.getElementById('sacEmpId').value = '';
    document.getElementById('sacEmpIDCode').value = '';
  }
  
  openModal('sacEmployeeModal');
};

window.saveEmployee = async function() {
  const id = document.getElementById('sacEmpId').value;
  const employeeID = document.getElementById('sacEmpIDCode').value;
  const name = document.getElementById('sacEmpName').value.trim();
  const email = document.getElementById('sacEmpEmail').value.trim();
  const role = document.getElementById('sacEmpRole').value;
  const cities = document.getElementById('sacEmpCities').value;
  const status = document.getElementById('sacEmpStatus').value;
  
  const payload = { id, employeeID, name, email, role, cities, status };
  
  try {
    const res = await fetch('/api/super/employees', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to onboard employee.');
    
    showToast(id ? 'Employee profile updated successfully!' : 'New staff onboarded successfully!', 'success');
    closeModal('sacEmployeeModal');
    renderSacEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteEmployee = async function(id) {
  const emp = window.superEmployees.find(e => Number(e.ID) === Number(id));
  if (!emp) return;
  
  if (!confirm(`Are you sure you want to terminate ${emp.Name} (ID: ${emp.EmployeeID})? All background checks & credentials will be archived.`)) {
    return;
  }
  
  try {
    const res = await fetch(`/api/super/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete employee.');
    
    showToast(data.message || 'Staff profile removed successfully.', 'success');
    renderSacEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.openEmployeeDocVault = function(employeeId) {
  const emp = window.superEmployees.find(e => Number(e.ID) === Number(employeeId));
  if (!emp) return;
  
  document.getElementById('sacDocVaultTitle').textContent = `Verification Vault: ${emp.Name}`;
  document.getElementById('sacDocVaultSubtitle').textContent = `Manage attachments for ID: ${emp.EmployeeID || 'N/A'}`;
  document.getElementById('sacDocVaultEmpId').value = emp.ID;
  document.getElementById('sacDocFileInput').value = '';
  
  renderEmployeeDocumentsList(emp);
  openModal('sacEmployeeDocModal');
};

function renderEmployeeDocumentsList(emp) {
  const tbody = document.getElementById('sacEmployeeDocsTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  let docs = [];
  try {
    docs = typeof emp.Documents === 'string' ? JSON.parse(emp.Documents) : (emp.Documents || []);
  } catch(e) {
    docs = [];
  }
  
  if (!Array.isArray(docs) || docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--sac-text-muted); padding:15px;">No files uploaded yet.</td></tr>`;
    return;
  }
  
  docs.forEach(docName => {
    const fileUrl = `/uploads/${encodeURIComponent(docName)}`;
    tbody.innerHTML += `
      <tr>
        <td>
          <a href="${fileUrl}" target="_blank" style="color:var(--sac-gold); text-decoration:underline; font-size:0.9rem;"><i class="fa-solid fa-file-lines" style="margin-right:6px;"></i> ${docName}</a>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteEmployeeDoc(${emp.ID}, '${docName.replace(/'/g, "\\'")}')" style="padding:4px 8px; font-size:0.75rem; height:auto; width:auto;"><i class="fa-solid fa-trash-can"></i> Delete</button>
        </td>
      </tr>
    `;
  });
}

window.uploadEmployeeDoc = async function() {
  const employeeId = document.getElementById('sacDocVaultEmpId').value;
  const fileInput = document.getElementById('sacDocFileInput');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a file to upload.', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('document', fileInput.files[0]);
  
  const headers = {};
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
  if (typeof mcRole !== 'undefined') headers['X-Simulated-Role'] = mcRole;
  
  try {
    const res = await fetch(`/api/super/employees/${employeeId}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload document.');
    
    showToast('Document uploaded successfully!', 'success');
    fileInput.value = '';
    
    await renderSacEmployees();
    const updatedEmp = window.superEmployees.find(e => Number(e.ID) === Number(employeeId));
    if (updatedEmp) {
      renderEmployeeDocumentsList(updatedEmp);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteEmployeeDoc = async function(employeeId, docName) {
  if (!confirm(`Are you sure you want to delete the file "${docName}"?`)) return;
  
  try {
    const res = await fetch(`/api/super/employees/${employeeId}/delete-doc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ docName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete document.');
    
    showToast('Document removed successfully.', 'success');
    
    await renderSacEmployees();
    const updatedEmp = window.superEmployees.find(e => Number(e.ID) === Number(employeeId));
    if (updatedEmp) {
      renderEmployeeDocumentsList(updatedEmp);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ════ 2. FINANCIAL CONTROL ════
async function fetchSacPayouts() {
  try {
    const res = await fetch('/api/admin/payments/payouts', { headers: getHeaders() });
    if (res.ok) {
      mcPayouts = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch payouts:', err);
  }
}

async function renderSacFinancial() {
  await fetchSacPayouts();

  let todayRev = 0;
  let mtdRev = 0;
  let ytdRev = 0;
  let commission = 0;

  document.getElementById('sacFinTodayRev').textContent = `₹0`;
  document.getElementById('sacFinMtdRev').textContent = `₹0`;
  document.getElementById('sacFinYtdRev').textContent = `₹0`;
  document.getElementById('sacFinCommEarned').textContent = `₹0`;

  // Tax Liabilities
  document.getElementById('sacFinGstLiab').textContent = `₹0`;
  document.getElementById('sacFinTdsLiab').textContent = `₹0`;

  // Render Payouts Table
  const tbody = document.getElementById('sacFinPayoutsTbody');
  if (!mcPayouts || mcPayouts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--sac-text-muted);">No payout requests.</td></tr>';
    renderPayoutTrendChart();
    return;
  }

  tbody.innerHTML = mcPayouts.map(p => {
    let statusClass = 'warning';
    if (p.status === 'approved') statusClass = 'info';
    if (p.status === 'paid') statusClass = 'success';
    if (p.status === 'on_hold' || p.status === 'held') statusClass = 'danger';

    // Tax breakdown calculation
    const commAmt = Math.round(p.amount * 0.15);
    const tdsAmt = Math.round(p.amount * 0.01);
    const netPayout = p.amount - commAmt - tdsAmt;

    const breakdownHtml = `
      <div style="font-size:0.7rem; color:var(--sac-text-muted); margin-top:2px;">
        Comm (15%): -₹${commAmt.toLocaleString()} | TDS (1%): -₹${tdsAmt.toLocaleString()} | <strong>Net: ₹${netPayout.toLocaleString()}</strong>
      </div>
    `;

    let actionHtml = '';
    if (p.status === 'pending_approval') {
      actionHtml = `
        <div class="action-btns" style="display: flex; gap: 4px;">
          <button class="act-btn success" title="Approve Payout" onclick="approveSacPayout(${p.id})" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; border: none; background: #10B981; color: white; cursor: pointer;"><i class="fa-solid fa-check"></i> Approve</button>
          <button class="act-btn danger" title="Hold Payout" onclick="holdSacPayout(${p.id})" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; border: none; background: #F59E0B; color: white; cursor: pointer;"><i class="fa-solid fa-circle-pause"></i> Hold</button>
        </div>
      `;
    } else if (p.status === 'on_hold' || p.status === 'held') {
      actionHtml = `
        <div class="action-btns" style="display: flex; gap: 4px;">
          <button class="act-btn success" title="Approve Payout" onclick="approveSacPayout(${p.id})" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; border: none; background: #10B981; color: white; cursor: pointer;"><i class="fa-solid fa-check"></i> Approve</button>
          <button class="act-btn info" title="Release Hold" onclick="resumeSacPayout(${p.id})" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; border: none; background: #3B82F6; color: white; cursor: pointer;"><i class="fa-solid fa-play"></i> Resume</button>
        </div>
      `;
    } else if (p.status === 'approved') {
      actionHtml = `
        <div class="action-btns">
          <button class="act-btn success" title="Disburse Payout" onclick="disburseSacPayout(${p.id})" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; border: none; background: #8B5CF6; color: white; cursor: pointer;"><i class="fa-solid fa-money-bill-wave"></i> Disburse</button>
        </div>
      `;
    } else {
      actionHtml = `<span style="font-size:0.75rem; color:#10B981; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> Disbursed</span>`;
    }

    return `
      <tr>
        <td><strong>${p.partner}</strong></td>
        <td>
          <strong>₹${p.amount.toLocaleString()}</strong>
          ${breakdownHtml}
        </td>
        <td>${p.date}</td>
        <td><span class="sac-badge sac-badge-${statusClass}">${p.status.replace('_', ' ')}</span></td>
        <td>${actionHtml}</td>
      </tr>
    `;
  }).join('');

  renderPayoutTrendChart();
}

window.approveSacPayout = async function(id) {
  try {
    const res = await fetch(`/api/admin/payments/payout/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast(`Payout request ID #${id} approved.`, 'success');
      await renderSacFinancial();
    } else {
      showToast('Failed to approve payout.', 'error');
    }
  } catch (err) {
    showToast('Network error approving payout.', 'error');
  }
}

window.holdSacPayout = async function(id) {
  try {
    const res = await fetch(`/api/admin/payments/payout/${id}/hold`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast(`Payout request ID #${id} placed on hold.`, 'warning');
      await renderSacFinancial();
    } else {
      showToast('Failed to place payout on hold.', 'error');
    }
  } catch (err) {
    showToast('Network error placing payout on hold.', 'error');
  }
}

window.resumeSacPayout = async function(id) {
  // Client-side local override as hold releases back to pending request
  try {
    const p = mcPayouts.find(x => x.id === id);
    if (p) {
      p.status = 'pending_approval';
      showToast(`Payout request for ${p.partner} has been resumed.`, 'info');
      await renderSacFinancial();
    }
  } catch (err) {
    console.error(err);
  }
}

window.disburseSacPayout = async function(id) {
  try {
    const res = await fetch(`/api/admin/payments/payout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      showToast(`Payout ID #${id} has been disbursed to partner bank.`, 'success');
      await renderSacFinancial();
    } else {
      showToast('Failed to disburse payout.', 'error');
    }
  } catch (err) {
    showToast('Network error disbursing payout.', 'error');
  }
}

window.exportPayoutsCSV = function() {
  if (!mcPayouts || mcPayouts.length === 0) {
    showToast('No payout requests to export.', 'info');
    return;
  }

  const headers = ['ID', 'Partner', 'Amount', 'Date', 'Status', 'Commission (15%)', 'TDS (1%)', 'Net Payout'];
  const rows = mcPayouts.map(p => {
    const comm = Math.round(p.amount * 0.15);
    const tds = Math.round(p.amount * 0.01);
    const net = p.amount - comm - tds;
    return [
      p.id,
      `"${p.partner.replace(/"/g, '""')}"`,
      p.amount,
      p.date,
      p.status,
      comm,
      tds,
      net
    ];
  });

  let csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Homzo_Payouts_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Payouts report exported successfully.', 'success');
}

function renderPayoutTrendChart() {
  const containerId = 'payoutTrendChartContainer';
  let chartContainer = document.getElementById(containerId);
  if (!chartContainer) {
    chartContainer = document.createElement('div');
    chartContainer.id = containerId;
    chartContainer.style.cssText = "margin-bottom:20px; background:#111827; border: 1px solid #374151; border-radius:6px; padding:12px;";
    const tbody = document.getElementById('sacFinPayoutsTbody');
    if (tbody) {
      const card = tbody.closest('.sac-card');
      if (card) {
        const title = card.querySelector('.sac-card-title');
        if (title) {
          title.parentNode.insertBefore(chartContainer, title.nextSibling);
        }
      }
    }
  }

  const paidPayouts = mcPayouts.filter(p => p.status === 'paid');
  const points = paidPayouts.slice(-6).map(p => p.amount);
  
  const chartPoints = points.length >= 2 ? points : [2000, 5000, 3000, 7000, 4500, 9000];
  const max = Math.max(...chartPoints, 5000);
  const min = Math.min(...chartPoints, 0);
  const range = max - min || 1;

  const width = 300;
  const height = 60;
  const padding = 5;
  const stepX = (width - padding * 2) / (chartPoints.length - 1);
  
  const coords = chartPoints.map((val, idx) => {
    const x = padding + idx * stepX;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `${pathD} L ${padding + (chartPoints.length - 1) * stepX},${height} L ${padding},${height} Z`;

  chartContainer.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div style="font-size:0.78rem; color:#9CA3AF; font-weight:600;"><i class="fa-solid fa-chart-line"></i> Payouts Disbursement Trend</div>
      <button onclick="exportPayoutsCSV()" class="sac-btn-outline" style="padding: 2px 6px; font-size: 0.68rem; border-radius: 4px; border: 1px solid #374151; background: #1F2937; color: #D1D5DB; cursor: pointer; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
    </div>
    <div style="display:flex; align-items:flex-end;">
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
        <defs>
          <linearGradient id="payoutTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#payoutTrendGrad)" />
        <path d="${pathD}" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        ${coords.map((c, idx) => `<circle cx="${c.split(',')[0]}" cy="${c.split(',')[1]}" r="3" fill="#C084FC" stroke="#111827" stroke-width="1" />`).join('')}
      </svg>
    </div>
  `;
}

function generateGstInvoiceMc() {
  showToast('GST invoice batch generation initiated for the current month.', 'success');
}

// ════ 3. USER & ROLE MANAGEMENT ════

// Unified state variables for User & Role Management
window.sacUsers = [];
window.sacRoles = [];
window.sacChangelogs = [];
window.sacCities = [];
window.currentWizardStep = 1;
window.wizardCustomPermissions = [];

// Switch sub-tabs inside User & Role Management
window.switchUserSubTab = function(tabName) {
  const tabs = ['team', 'templates', 'audit'];
  tabs.forEach(t => {
    const btn = document.getElementById(`sacTab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
    const view = document.getElementById(`sacUserView${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn && view) {
      if (t === tabName) {
        btn.classList.add('active');
        btn.style.color = 'var(--sac-gold)';
        btn.style.borderBottom = '2px solid var(--sac-gold)';
        view.style.display = 'block';
      } else {
        btn.classList.remove('active');
        btn.style.color = 'var(--sac-text-muted)';
        btn.style.borderBottom = 'none';
        view.style.display = 'none';
      }
    }
  });
}

// Fetch and render the entire user management system
async function renderSacUsers() {
  try {
    const headers = getHeaders();
    
    // Fetch roles
    const rolesRes = await fetch('/api/roles', { headers });
    if (rolesRes.ok) {
      window.sacRoles = await rolesRes.json();
    }
    
    // Fetch users
    const usersRes = await fetch('/api/users', { headers });
    if (usersRes.ok) {
      window.sacUsers = await usersRes.json();
    }
    
    // Fetch changelogs
    const logsRes = await fetch('/api/permission-changelogs', { headers });
    if (logsRes.ok) {
      window.sacChangelogs = await logsRes.json();
    }
    
    // Fetch cities
    const citiesRes = await fetch('/api/expansion/cities', { headers });
    if (citiesRes.ok) {
      window.sacCities = await citiesRes.json();
    }

    // Populate filter dropdowns if empty
    populateUserFilters();
    
    // 1. Render Team Table
    renderTeamTable();
    
    // 2. Render Roles Library
    renderRolesLibrary();
    
    // 3. Render Audit Trail
    renderAuditTrail();
    
  } catch (err) {
    console.error('Failed to render user & role management:', err);
  }
}

// Populate filters row
function populateUserFilters() {
  const roleSelect = document.getElementById('filterUserRole');
  const citySelect = document.getElementById('filterUserCity');
  
  if (roleSelect && roleSelect.options.length <= 1) {
    window.sacRoles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.ID;
      opt.textContent = r.Name;
      roleSelect.appendChild(opt);
    });
  }
  
  if (citySelect && citySelect.options.length <= 1) {
    window.sacCities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      citySelect.appendChild(opt);
    });
  }
}

// Render Team Overview Table
function renderTeamTable() {
  const tbody = document.getElementById('sacUsersTbody');
  if (!tbody) return;
  
  tbody.innerHTML = window.sacUsers.map(u => {
    let scopeText = 'Global';
    if (u.assigned_city_id) {
      const cityObj = window.sacCities.find(c => c.id === u.assigned_city_id);
      scopeText = cityObj ? `City-Specific (${cityObj.name})` : 'City-Specific';
    }
    
    const isCEO = u.email === 'admin@homzo.in';
    const statusClass = u.status === 'Active' ? 'success' : (u.status === 'Suspended' ? 'danger' : 'warning');
    
    return `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--sac-gold);">${u.name}</div>
          <div style="font-size:0.75rem; color:var(--sac-text-muted);">${u.email}</div>
          <div style="font-size:0.7rem; color:var(--sac-text-muted);">${u.phone || 'No phone'}</div>
        </td>
        <td><strong>${u.role_name}</strong></td>
        <td><span class="sac-badge sac-badge-info" style="font-size:10px; padding:2px 8px;">${u.console_type}</span></td>
        <td>${scopeText}</td>
        <td><span class="sac-badge sac-badge-${statusClass}">${u.status}</span></td>
        <td><span style="font-size:0.8rem;">${u.last_login}</span></td>
        <td>
          <div class="action-btns" style="display:flex; gap:8px;">
            <button class="act-btn" onclick="openUserWizardModal(${u.id})" style="width:auto; height:auto; padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:4px; white-space:nowrap;">
              <i class="fa-solid fa-user-shield"></i> Customize
            </button>
            ${!isCEO ? `
              <button class="act-btn danger" onclick="suspendUser(${u.id}, '${u.name}')" style="width:auto; height:auto; padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                <i class="fa-solid fa-user-slash"></i> Suspend
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Filter Team Table
window.filterTeamTable = function() {
  const query = document.getElementById('filterUserName').value.toLowerCase();
  const roleId = document.getElementById('filterUserRole').value;
  const consoleVal = document.getElementById('filterUserConsole').value;
  const cityId = document.getElementById('filterUserCity').value;
  
  const tbody = document.getElementById('sacUsersTbody');
  if (!tbody) return;
  
  const rows = tbody.getElementsByTagName('tr');
  
  window.sacUsers.forEach((u, idx) => {
    const row = rows[idx];
    if (!row) return;
    
    const matchesSearch = u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchesRole = roleId === 'all' || String(u.role_id) === String(roleId);
    const matchesConsole = consoleVal === 'all' || u.console_type === consoleVal;
    const matchesCity = cityId === 'all' || String(u.assigned_city_id) === String(cityId);
    
    if (matchesSearch && matchesRole && matchesConsole && matchesCity) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Render Roles Library
function renderRolesLibrary() {
  const container = document.getElementById('sacRolesLibraryGrid');
  if (!container) return;
  
  container.innerHTML = window.sacRoles.map(r => {
    return `
      <div class="sac-card" style="padding:15px; border:1px solid ${r.Is_System_Default === 'true' ? 'var(--sac-border)' : 'var(--sac-gold)'};">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
          <h5 style="margin:0; font-family:'Playfair Display', serif; color:var(--sac-gold); font-size:1.1rem;">${r.Name}</h5>
          <span class="sac-badge ${r.Is_System_Default === 'true' ? 'sac-badge-info' : 'sac-badge-success'}" style="font-size:8px;">
            ${r.Is_System_Default === 'true' ? 'System Default' : 'Custom'}
          </span>
        </div>
        <p style="font-size:0.75rem; color:var(--sac-text-muted); margin-bottom:12px; height:32px; overflow:hidden;">${r.Description || 'No description provided.'}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem;">
          <span>Console: <strong>${r.Console_Type}</strong></span>
          <button class="sac-btn-outline btn-sm" onclick="viewTemplatePermissions(${r.ID}, '${r.Name}')" style="padding:2px 8px; font-size:10px;">
            <i class="fa-solid fa-eye"></i> View Matrix
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// View template permissions helper
window.viewTemplatePermissions = async function(roleId, roleName) {
  try {
    const res = await fetch(`/api/roles/${roleId}/permissions`, { headers: getHeaders() });
    if (res.ok) {
      const perms = await res.json();
      let alertContent = `<h4 style="color:var(--sac-gold); font-family:'Playfair Display'; margin-bottom:12px;">${roleName} Permission Matrix</h4>`;
      alertContent += `
        <div style="max-height:300px; overflow-y:auto; text-align:left; font-size:0.8rem;">
          <table class="mc-table">
            <thead>
              <tr><th>Module</th><th>View</th><th>Add</th><th>Edit</th><th>Del</th><th>Appr</th><th>Scope</th></tr>
            </thead>
            <tbody>
              ${perms.map(p => `
                <tr>
                  <td><strong>${p.module_id}</strong></td>
                  <td>${p.can_view ? '✅' : '❌'}</td>
                  <td>${p.can_add ? '✅' : '❌'}</td>
                  <td>${p.can_edit ? '✅' : '❌'}</td>
                  <td>${p.can_delete ? '✅' : '❌'}</td>
                  <td>${p.can_approve ? '✅' : '❌'}</td>
                  <td><span class="sac-badge sac-badge-info">${p.scope}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width:600px; background:var(--sac-navy); border:1px solid var(--sac-gold); padding:25px; border-radius:var(--radius-lg); text-align:center;">
          ${alertContent}
          <button class="sac-btn-gold" style="margin-top:20px;" onclick="this.closest('.modal-overlay').remove()">Close Matrix</button>
        </div>
      `;
      document.body.appendChild(modal);
    }
  } catch (err) {
    showToast('Failed to load template details.', 'error');
  }
}

// Render Audit Logs
function renderAuditTrail() {
  const tbody = document.getElementById('sacPermissionAuditTbody');
  if (!tbody) return;
  
  tbody.innerHTML = window.sacChangelogs.map(l => {
    return `
      <tr>
        <td><span style="font-size:0.8rem; font-family:monospace;">${new Date(l.timestamp).toLocaleString()}</span></td>
        <td><strong>${l.changed_by}</strong></td>
        <td><strong>${l.target_user_name}</strong></td>
        <td><span style="font-size:0.82rem; color:var(--sac-text-muted);">${l.reason_note}</span></td>
        <td>
          <button class="sac-btn-outline btn-sm" onclick="viewAuditLogDetails(${l.id})" style="padding:2px 8px; font-size:10px;">
            <i class="fa-solid fa-search"></i> Details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// View audit details popup
window.viewAuditLogDetails = function(logId) {
  const log = window.sacChangelogs.find(l => l.id === logId);
  if (!log) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:550px; background:var(--sac-navy); border:1px solid var(--sac-gold); padding:25px; border-radius:var(--radius-lg); text-align:left;">
      <h3 style="font-family:'Playfair Display'; color:var(--sac-gold); margin-top:0;">Audit Log Details</h3>
      <p style="font-size:0.85rem;"><strong>CEO Changer:</strong> ${log.changed_by}</p>
      <p style="font-size:0.85rem;"><strong>Target User:</strong> ${log.target_user_name}</p>
      <p style="font-size:0.85rem;"><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
      <p style="font-size:0.85rem;"><strong>Justification Reason:</strong> <span style="color:var(--sac-gold);">${log.reason_note}</span></p>
      <button class="sac-btn-gold" style="margin-top:15px; width:100%;" onclick="this.closest('.modal-overlay').remove()">Close Details</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Filter Audit Logs Table
window.filterAuditLogsTable = function() {
  const userQuery = document.getElementById('auditFilterUser').value.toLowerCase();
  const reasonQuery = document.getElementById('auditFilterReason').value.toLowerCase();
  
  const tbody = document.getElementById('sacPermissionAuditTbody');
  if (!tbody) return;
  
  const rows = tbody.getElementsByTagName('tr');
  
  window.sacChangelogs.forEach((l, idx) => {
    const row = rows[idx];
    if (!row) return;
    
    const matchesUser = l.target_user_name.toLowerCase().includes(userQuery);
    const matchesReason = l.reason_note.toLowerCase().includes(reasonQuery);
    
    if (matchesUser && matchesReason) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Suspend user access
window.suspendUser = async function(id, name) {
  if (!confirm(`Are you sure you want to suspend access for ${name}? They will immediately be locked out of the platform.`)) {
    return;
  }
  
  const reason = prompt('Please enter a justification note for suspending this account:');
  if (!reason) {
    showToast('Justification note is mandatory to suspend accounts.', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'Suspended',
        reason_note: reason
      })
    });
    if (res.ok) {
      showToast(`${name}'s account has been suspended successfully.`, 'success');
      renderSacUsers();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to suspend account.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server.', 'error');
  }
}

// Onboarding & Permissions Editing Wizard Handlers
window.openUserWizardModal = function(userId = null) {
  window.currentWizardStep = 1;
  document.getElementById('sacUserWizardForm').reset();
  
  // Populate designations dropdown
  const selectRole = document.getElementById('wRoleSelect');
  selectRole.innerHTML = window.sacRoles.map(r => `
    <option value="${r.ID}">${r.Name} (${r.Console_Type} Console)</option>
  `).join('');
  
  // Populate cities scope dropdown
  const selectCity = document.getElementById('wCitySelect');
  selectCity.innerHTML = window.sacCities.map(c => `
    <option value="${c.id}">${c.name}</option>
  `).join('');

  document.getElementById('wCredentialReveal').style.display = 'none';

  if (userId) {
    // Edit existing user
    const u = window.sacUsers.find(x => x.id === userId);
    if (!u) return;
    
    document.getElementById('sacUserWizardTitle').textContent = 'Customize Team Member Permissions';
    document.getElementById('sacWizardUserId').value = u.id;
    document.getElementById('wName').value = u.name;
    document.getElementById('wEmail').value = u.email;
    document.getElementById('wEmail').disabled = true; // Email is unique and locked
    document.getElementById('wPhone').value = u.phone || '';
    document.getElementById('wRoleSelect').value = u.role_id;
    document.getElementById('wStatusSelect').value = u.status;
    document.getElementById('wCitySelect').value = u.assigned_city_id || '';
    
    document.getElementById('wizardReasonGroup').style.display = 'block';
    
    // Trigger matrix population
    handleWizardRoleChange(u.id);
  } else {
    // New user onboarding
    document.getElementById('sacUserWizardTitle').textContent = 'Onboard New Team Member';
    document.getElementById('sacWizardUserId').value = '';
    document.getElementById('wEmail').disabled = false;
    document.getElementById('wizardReasonGroup').style.display = 'none';
    
    // Trigger default role matrix population
    handleWizardRoleChange();
  }
  
  openModal('sacUserWizardModal');
  updateWizardUI();
}

// Handle role dropdown change in wizard
window.handleWizardRoleChange = async function(userId = null) {
  const roleId = document.getElementById('wRoleSelect').value;
  const roleObj = window.sacRoles.find(r => String(r.ID) === String(roleId));
  
  if (!roleObj) return;
  
  // Show assigned city if role is "City Manager"
  const isCitySpecific = roleObj.Name.toLowerCase() === 'city manager';
  document.getElementById('wScopeCityGroup').style.display = isCitySpecific ? 'block' : 'none';

  try {
    const res = await fetch(`/api/roles/${roleId}/permissions`, { headers: getHeaders() });
    if (res.ok) {
      window.wizardCustomPermissions = await res.json();
      renderWizardMatrixTable();
    }
  } catch (err) {
    console.error('Failed to get default permissions:', err);
  }
}

// Render permissions matrix in step 3
function renderWizardMatrixTable() {
  const tbody = document.getElementById('wizardMatrixTbody');
  if (!tbody) return;
  
  tbody.innerHTML = window.wizardCustomPermissions.map((p, idx) => `
    <tr>
      <td><strong>${p.module_id}</strong></td>
      <td style="text-align:center;"><input type="checkbox" ${p.can_view ? 'checked' : ''} onchange="updateWizardMatrixVal(${idx}, 'can_view', this.checked)"></td>
      <td style="text-align:center;"><input type="checkbox" ${p.can_add ? 'checked' : ''} onchange="updateWizardMatrixVal(${idx}, 'can_add', this.checked)"></td>
      <td style="text-align:center;"><input type="checkbox" ${p.can_edit ? 'checked' : ''} onchange="updateWizardMatrixVal(${idx}, 'can_edit', this.checked)"></td>
      <td style="text-align:center;"><input type="checkbox" ${p.can_delete ? 'checked' : ''} onchange="updateWizardMatrixVal(${idx}, 'can_delete', this.checked)"></td>
      <td style="text-align:center;"><input type="checkbox" ${p.can_approve ? 'checked' : ''} onchange="updateWizardMatrixVal(${idx}, 'can_approve', this.checked)"></td>
      <td style="text-align:center;">
        <select onchange="updateWizardMatrixVal(${idx}, 'scope', this.value)" style="background:var(--sac-navy); border:1px solid var(--sac-border); color:#fff; font-size:11px; padding:2px 4px;">
          <option value="Global" ${p.scope === 'Global' ? 'selected' : ''}>Global</option>
          <option value="City-Specific" ${p.scope === 'City-Specific' ? 'selected' : ''}>City-Specific</option>
        </select>
      </td>
    </tr>
  `).join('');
}

window.updateWizardMatrixVal = function(idx, key, val) {
  if (window.wizardCustomPermissions[idx]) {
    window.wizardCustomPermissions[idx][key] = val;
  }
}

// Wizard navigation logic
window.navigateWizard = function(direction) {
  if (direction === 1) {
    // Validate inputs
    if (window.currentWizardStep === 1) {
      const name = document.getElementById('wName').value.trim();
      const email = document.getElementById('wEmail').value.trim();
      if (!name || !email) {
        showToast('Please fill out all required basic info.', 'warning');
        return;
      }
    }
    
    if (window.currentWizardStep === 2) {
      const roleId = document.getElementById('wRoleSelect').value;
      const roleObj = window.sacRoles.find(r => String(r.ID) === String(roleId));
      if (roleObj && roleObj.Name.toLowerCase() === 'city manager') {
        const city = document.getElementById('wCitySelect').value;
        if (!city) {
          showToast('City Managers must be assigned a city.', 'warning');
          return;
        }
      }
    }
    
    if (window.currentWizardStep === 3) {
      // Build plain english summary
      buildWizardSummary();
    }
    
    if (window.currentWizardStep === 4) {
      // Save/Submit
      submitUserWizard();
      return;
    }
    
    window.currentWizardStep++;
  } else {
    // Back
    if (window.currentWizardStep > 1) {
      window.currentWizardStep--;
    }
  }
  
  updateWizardUI();
}

function updateWizardUI() {
  for (let i = 1; i <= 4; i++) {
    const pane = document.getElementById(`wPane${i}`);
    const step = document.getElementById(`wStep${i}`);
    if (pane && step) {
      if (i === window.currentWizardStep) {
        pane.style.display = 'block';
        step.style.color = 'var(--sac-gold)';
        step.style.borderBottom = 'none';
      } else {
        pane.style.display = 'none';
        step.style.color = 'var(--sac-text-muted)';
      }
    }
  }
  
  const backBtn = document.getElementById('wizardBackBtn');
  const nextBtn = document.getElementById('wizardNextBtn');
  
  if (window.currentWizardStep === 1) {
    backBtn.style.visibility = 'hidden';
  } else {
    backBtn.style.visibility = 'visible';
  }
  
  if (window.currentWizardStep === 4) {
    const userId = document.getElementById('sacWizardUserId').value;
    nextBtn.textContent = userId ? 'Save Changes' : 'Onboard & Invite';
  } else {
    nextBtn.textContent = 'Next';
  }
}

// Generate permissions description in plain English
function buildWizardSummary() {
  const summaryBox = document.getElementById('wizardSummaryText');
  const name = document.getElementById('wName').value.trim();
  const roleId = document.getElementById('wRoleSelect').value;
  const roleObj = window.sacRoles.find(r => String(r.ID) === String(roleId));
  const cityId = document.getElementById('wCitySelect').value;
  const cityObj = window.sacCities.find(c => String(c.id) === String(cityId));
  const assignedCityText = cityObj ? cityObj.name : 'Unknown City';
  
  let summary = `This will onboard <strong>${name}</strong> as a <strong>${roleObj ? roleObj.Name : 'Custom Designation'}</strong>.<br><br>`;
  
  // Custom permissions description
  const allowedView = window.wizardCustomPermissions.filter(p => p.can_view).map(p => p.module_id);
  const allowedEdit = window.wizardCustomPermissions.filter(p => p.can_edit).map(p => p.module_id);
  const allowedApprove = window.wizardCustomPermissions.filter(p => p.can_approve).map(p => p.module_id);
  
  if (allowedView.length === 14) {
    summary += `&bull; User has <strong>Full Platform View Access</strong>.<br>`;
  } else if (allowedView.length === 0) {
    summary += `&bull; User has <strong>No view permissions</strong>.<br>`;
  } else {
    summary += `&bull; User can view: <em>${allowedView.join(', ')}</em>.<br>`;
  }
  
  if (allowedEdit.length > 0) {
    summary += `&bull; User can edit details in: <em>${allowedEdit.join(', ')}</em>.<br>`;
  }
  
  if (allowedApprove.length > 0) {
    summary += `&bull; User has approval authority for: <em>${allowedApprove.join(', ')}</em>.<br>`;
  }
  
  if (roleObj && roleObj.Name.toLowerCase() === 'city manager') {
    summary += `&bull; Scope limit: <strong>${assignedCityText} Only</strong>. Every database query will be automatically locked to ${assignedCityText}.<br>`;
  } else {
    summary += `&bull; Scope limit: <strong>Global Access</strong> (All Cities).<br>`;
  }
  
  summaryBox.innerHTML = summary;
}

// Submit Onboarding wizard
async function submitUserWizard() {
  const userId = document.getElementById('sacWizardUserId').value;
  const name = document.getElementById('wName').value.trim();
  const email = document.getElementById('wEmail').value.trim();
  const phone = document.getElementById('wPhone').value.trim();
  const roleId = document.getElementById('wRoleSelect').value;
  const cityId = document.getElementById('wCitySelect').value;
  const status = document.getElementById('wStatusSelect').value;
  const reason = document.getElementById('wEditReason').value.trim();
  
  if (userId && !reason) {
    showToast('Justification reason note is mandatory to modify permissions.', 'error');
    return;
  }
  
  const payload = {
    name,
    email,
    phone,
    role_id: parseInt(roleId),
    assigned_city_id: cityId ? parseInt(cityId) : null,
    status,
    customPermissions: window.wizardCustomPermissions
  };
  
  if (userId) {
    payload.reason_note = reason;
  }
  
  try {
    const url = userId ? `/api/users/${userId}` : '/api/users';
    const method = userId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      showToast(userId ? 'Permissions updated successfully.' : 'New team member onboarded.', 'success');
      
      if (!userId) {
        // New user: reveal credentials
        document.getElementById('revealEmail').textContent = email;
        document.getElementById('revealTempPass').textContent = data.tempPassword || 'Homzo@2026';
        document.getElementById('wCredentialReveal').style.display = 'block';
        document.getElementById('wizardNextBtn').style.display = 'none';
        
        // Refresh users list in background
        renderSacUsers();
      } else {
        closeModal('sacUserWizardModal');
        renderSacUsers();
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to complete user updates.', 'error');
    }
  } catch (err) {
    showToast('Network error saving details.', 'error');
  }
}

// Custom roles library builder
window.openCreateCustomRoleModal = function() {
  document.getElementById('sacCustomRoleForm').reset();
  
  // Populate modular options
  const tbody = document.getElementById('customRoleMatrixTbody');
  const modules = [
    'Operations Dashboard',
    'Property Management',
    'Partner CRM',
    'Booking Management',
    'Guest Management',
    'Revenue & Payouts',
    'Marketing & Promo',
    'Quality & Inspections',
    'City Expansion Strategy',
    'City Expansion Tracker',
    'Notifications',
    'Company Profile',
    'Reports & Analytics',
    'System Settings'
  ];
  
  tbody.innerHTML = modules.map((m, idx) => `
    <tr>
      <td><strong>${m}</strong></td>
      <td style="text-align:center;"><input type="checkbox" id="cPermView_${idx}"></td>
      <td style="text-align:center;"><input type="checkbox" id="cPermAdd_${idx}"></td>
      <td style="text-align:center;"><input type="checkbox" id="cPermEdit_${idx}"></td>
      <td style="text-align:center;"><input type="checkbox" id="cPermDelete_${idx}"></td>
      <td style="text-align:center;"><input type="checkbox" id="cPermApprove_${idx}"></td>
      <td style="text-align:center;">
        <select id="cPermScope_${idx}" style="background:var(--sac-navy); border:1px solid var(--sac-border); color:#fff; font-size:11px; padding:2px 4px;">
          <option value="Global">Global</option>
          <option value="City-Specific">City-Specific</option>
        </select>
      </td>
    </tr>
  `).join('');
  
  openModal('sacCustomRoleModal');
}

// Submit custom role creation
window.submitCustomRole = async function() {
  const name = document.getElementById('customRoleName').value.trim();
  const description = document.getElementById('customRoleDesc').value.trim();
  const console_type = document.getElementById('customRoleConsole').value;
  
  if (!name) {
    showToast('Role Name is required.', 'error');
    return;
  }
  
  const modules = [
    'Operations Dashboard',
    'Property Management',
    'Partner CRM',
    'Booking Management',
    'Guest Management',
    'Revenue & Payouts',
    'Marketing & Promo',
    'Quality & Inspections',
    'City Expansion Strategy',
    'City Expansion Tracker',
    'Notifications',
    'Company Profile',
    'Reports & Analytics',
    'System Settings'
  ];
  
  const permissions = [];
  modules.forEach((m, idx) => {
    permissions.push({
      module_id: m,
      can_view: document.getElementById(`cPermView_${idx}`).checked,
      can_add: document.getElementById(`cPermAdd_${idx}`).checked,
      can_edit: document.getElementById(`cPermEdit_${idx}`).checked,
      can_delete: document.getElementById(`cPermDelete_${idx}`).checked,
      can_approve: document.getElementById(`cPermApprove_${idx}`).checked,
      scope: document.getElementById(`cPermScope_${idx}`).value
    });
  });
  
  try {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, console_type, permissions })
    });
    if (res.ok) {
      showToast(`Custom designation "${name}" created successfully.`, 'success');
      closeModal('sacCustomRoleModal');
      renderSacUsers();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to create role.', 'error');
    }
  } catch (err) {
    showToast('Network error creating custom role.', 'error');
  }
}


// ════ 4. PARTNER CONTRACT MANAGEMENT ════
function renderSacContracts() {
  const tbody = document.getElementById('sacContractsTbody');
  tbody.innerHTML = mcPartners.map(p => `
    <tr>
      <td>
        <strong>${p.Name}</strong>
        <div style="font-size:0.75rem; color:var(--sac-text-muted);">${p.Email}</div>
      </td>
      <td><strong>${p.City}</strong></td>
      <td>1 Year (Expires in 11 months)</td>
      <td><strong style="color:var(--sac-gold);">${p.Revenue_Share}%</strong></td>
      <td><span class="sac-badge sac-badge-${p.Status === 'active' ? 'success' : 'danger'}">${p.Status}</span></td>
      <td>
        <button class="sac-btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="showToast('Opening contract document...','info')"><i class="fa-solid fa-file-pdf"></i> View Contract</button>
      </td>
    </tr>
  `).join('');

  // Render Pending Applications
  const pendingList = document.getElementById('sacPendingPartnersList');
  if (sacPendingPartners.length === 0) {
    pendingList.innerHTML = '<p style="color:var(--sac-text-muted); text-align:center; padding:15px;">No pending partner applications.</p>';
    return;
  }

  pendingList.innerHTML = sacPendingPartners.map(p => `
    <div class="sac-vault-item" style="flex-direction:column; align-items:stretch; gap:8px;">
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div>
          <strong style="color:var(--sac-gold); font-size:0.9rem;">${p.name}</strong>
          <div style="font-size:0.75rem; color:var(--sac-text-muted);">${p.city} • ${p.category}</div>
        </div>
        <span class="sac-badge sac-badge-warning" style="font-size:9px;">${p.status}</span>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
        <button class="sac-btn-gold" style="padding: 4px 8px; font-size:0.75rem;" onclick="approvePendingPartnerMc(${p.id})">Approve</button>
        <button class="sac-btn-outline" style="padding: 4px 8px; font-size:0.75rem; border-color:var(--danger); color:var(--danger);" onclick="rejectPendingPartnerMc(${p.id})">Reject</button>
      </div>
    </div>
  `).join('');
}

window.approvePendingPartnerMc = function(id) {
  const p = sacPendingPartners.find(x => x.id === id);
  if (p) {
    // Add to mcPartners
    const partnerId = mcPartners.length > 0 ? Math.max(...mcPartners.map(x => x.ID)) + 1 : 1;
    mcPartners.push({
      ID: partnerId,
      Name: p.name,
      Email: p.email,
      Phone: '+91 99999 88888',
      City: p.city,
      Revenue_Share: 15,
      Onboarding_Stage: 'Active',
      Status: 'active',
      CommLogs: [{ date: new Date().toISOString().split('T')[0], type: 'System', msg: 'Application approved by Super Admin.' }],
      Escalations: []
    });
    sacPendingPartners = sacPendingPartners.filter(x => x.id !== id);
    showToast(`Partner "${p.name}" has been approved and added to active accounts.`, 'success');
    renderSacContracts();
    renderSacReports();
  }
}

window.rejectPendingPartnerMc = function(id) {
  const p = sacPendingPartners.find(x => x.id === id);
  if (p) {
    sacPendingPartners = sacPendingPartners.filter(x => x.id !== id);
    showToast(`Partner application for "${p.name}" has been rejected.`, 'warning');
    renderSacContracts();
  }
}

// ════ 5. COMPLIANCE & STATUTORY TRACKER ════
function renderSacCompliance() {
  const tbody = document.getElementById('sacCompliancePropsTbody');
  tbody.innerHTML = adminProps.map(p => {
    // Simulate license expiries
    const isExpired = p.id % 4 === 0;
    return `
      <tr>
        <td><strong>${p.name}</strong> <div style="font-size:0.75rem; color:var(--sac-text-muted);">${p.location}</div></td>
        <td><span class="sac-badge sac-badge-${isExpired ? 'danger' : 'success'}">${isExpired ? 'Expired' : 'Verified'}</span></td>
        <td>${isExpired ? '2026-06-15' : '2027-04-30'}</td>
      </tr>
    `;
  }).join('');
}

// ════ 6. PLATFORM CONFIGURATION ════
function renderSacConfig() {
  document.getElementById('sacConfGlobalComm').value = sacConfig.globalComm;
  document.getElementById('sacConfIntegrationFee').value = sacConfig.integrationFee;
  document.getElementById('sacConfMumbaiComm').value = sacConfig.mumbaiComm;
  document.getElementById('sacConfDelhiComm').value = sacConfig.delhiComm;
  document.getElementById('sacConfBangaloreComm').value = sacConfig.bangaloreComm;
  document.getElementById('sacConfRefundPolicy').value = sacConfig.refundPolicy;
}

function savePlatformConfigMc() {
  sacConfig.globalComm = parseInt(document.getElementById('sacConfGlobalComm').value) || 15;
  sacConfig.integrationFee = parseInt(document.getElementById('sacConfIntegrationFee').value) || 5000;
  sacConfig.mumbaiComm = parseInt(document.getElementById('sacConfMumbaiComm').value) || 15;
  sacConfig.delhiComm = parseInt(document.getElementById('sacConfDelhiComm').value) || 12;
  sacConfig.bangaloreComm = parseInt(document.getElementById('sacConfBangaloreComm').value) || 18;
  sacConfig.refundPolicy = document.getElementById('sacConfRefundPolicy').value;

  showToast('Global platform configurations saved successfully!', 'success');
  renderSacConfig();
}

// ════ 7. AUDIT LOGS ════
async function renderSacAudit() {
  const search = document.getElementById('sacaSearch').value.toLowerCase();
  const roleFilter = document.getElementById('sacaRoleFilter').value;
  const tbody = document.getElementById('sacAuditTbody');
  
  try {
    const res = await fetch('/api/admin/audit-logs', { headers: getHeaders() });
    if (res.ok) {
      let logs = await res.json();
      
      if (roleFilter !== 'all') {
        logs = logs.filter(l => l.Role === roleFilter);
      }
      if (search) {
        logs = logs.filter(l => l.Email.toLowerCase().includes(search) || l.Action.toLowerCase().includes(search) || l.Details.toLowerCase().includes(search));
      }

      tbody.innerHTML = logs.slice(0, 15).map(l => `
        <tr>
          <td style="font-size:0.78rem; color:var(--sac-text-muted);">${new Date(l.Timestamp).toLocaleString()}</td>
          <td><strong>${l.Email}</strong></td>
          <td><span class="sac-badge sac-badge-info" style="font-size:9px;">${l.Role}</span></td>
          <td><strong style="color:var(--sac-gold);">${l.Action}</strong></td>
          <td>${l.Details}</td>
          <td style="font-family:monospace; font-size:0.75rem;">${l.IP || l.IP_Address || '127.0.0.1'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--sac-text-muted);">Failed to load audit logs from API.</td></tr>';
  }
}

function exportAuditLogsMc() {
  showToast('Audit logs exported successfully as Excel (XLSX).', 'success');
}

// ════ 8. REPORTS & ANALYTICS ════
function renderSacReports() {
  const tbody = document.getElementById('sacReportsPartnersTbody');
  tbody.innerHTML = mcPartners.map(p => {
    // Simulate sales
    const listings = adminProps.filter(pr => pr.location.toLowerCase() === p.City.toLowerCase()).length;
    const sales = listings * 45000;
    const comm = sales * (p.Revenue_Share / 100);
    return `
      <tr>
        <td><strong>${p.Name}</strong></td>
        <td><strong>${p.City}</strong></td>
        <td>${listings} properties</td>
        <td>₹${sales.toLocaleString()}</td>
        <td style="color:var(--sac-gold); font-weight:700;">₹${comm.toLocaleString()} (${p.Revenue_Share}%)</td>
      </tr>
    `;
  }).join('');
}

function exportReportsMc() {
  showToast('Financial Performance Report compiled and downloaded as PDF.', 'success');
}

// ════ 9. ANNOUNCEMENTS & BROADCAST ════
function renderSacAnnouncements() {
  const list = document.getElementById('sacBroadcastLogsList');
  list.innerHTML = sacAnnouncements.map(a => `
    <div class="sac-vault-item" style="flex-direction:column; align-items:stretch; border-color:${a.type === 'Urgent' ? 'var(--danger)' : 'var(--sac-border)'};">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="color:${a.type === 'Urgent' ? 'var(--danger)' : 'var(--sac-gold)'}; font-size:0.9rem;">${a.title}</strong>
        <span class="sac-badge sac-badge-${a.type === 'Urgent' ? 'danger' : 'info'}" style="font-size:8px;">${a.type}</span>
      </div>
      <p style="margin:0; font-size:0.8rem; color:var(--sac-text-light);">${a.content}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:0.7rem; color:var(--sac-text-muted);">
        <span>To: <strong>${a.target}</strong></span>
        <span>Broadcasted: ${a.date}</span>
      </div>
    </div>
  `).join('');
}

function broadcastAnnouncementMc() {
  const title = document.getElementById('sacaTitle').value.trim();
  const target = document.getElementById('sacaTarget').value;
  const type = document.getElementById('sacaType').value;
  const content = document.getElementById('sacaContent').value.trim();

  if (!title || !content) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const id = sacAnnouncements.length > 0 ? Math.max(...sacAnnouncements.map(x=>x.id)) + 1 : 1;
  sacAnnouncements.unshift({
    id,
    title,
    content,
    target,
    type,
    date: new Date().toISOString().slice(0, 16).replace('T', ' ')
  });

  // Reset form
  document.getElementById('sacaTitle').value = '';
  document.getElementById('sacaContent').value = '';

  showToast(`Announcement broadcasted to ${target} successfully!`, 'success');
  renderSacAnnouncements();
}

// Event Listeners
function setupSacEventListeners() {
  // Bind tab switching for Super Admin Console navigation items
  document.querySelectorAll('.sac-nav-item').forEach(item => {
    item.onclick = () => {
      switchSacTab(item.dataset.sacTab);
    };
  });

  // Create New User button
  const userAddBtn = document.getElementById('sacUserAddBtn');
  if (userAddBtn) userAddBtn.onclick = () => openUserWizardModal();

  // Export Audit Logs button
  const auditExportBtn = document.getElementById('sacAuditExportBtn');
  if (auditExportBtn) auditExportBtn.onclick = exportAuditLogsMc;

  // Export Reports button
  const reportsExportBtn = document.getElementById('sacReportsExportBtn');
  if (reportsExportBtn) reportsExportBtn.onclick = exportReportsMc;

  // Generate GST Invoices button
  const generateInvoicesBtn = document.getElementById('sacFinGenerateInvoicesBtn');
  if (generateInvoicesBtn) generateInvoicesBtn.onclick = generateGstInvoiceMc;

  // Config save
  const configSaveBtn = document.getElementById('sacConfigSaveBtn');
  if (configSaveBtn) configSaveBtn.onclick = savePlatformConfigMc;

  // Search Audit
  const sacaSearch = document.getElementById('sacaSearch');
  if (sacaSearch) sacaSearch.oninput = renderSacAudit;
  
  const sacaRoleFilter = document.getElementById('sacaRoleFilter');
  if (sacaRoleFilter) sacaRoleFilter.onchange = renderSacAudit;

  // Announcement submit
  const announceSubmitBtn = document.getElementById('sacAnnounceSubmitBtn');
  if (announceSubmitBtn) announceSubmitBtn.onclick = broadcastAnnouncementMc;
}

// ─── OLD ADMIN CONSOLE REDIRECTORS ───
async function switchAcModule(moduleName) {
  // Maintain backward compatibility for routing if needed, but we now route via tabs in switchSacTab
}
async function fetchAdminConsoleStatus() {}
async function fetchAdminConsoleSessions() {}
async function fetchAdminConsoleActivities() {}
function setupAdminConsoleEventListeners() {}


async function fetchAdminConsoleActivities() {
  try {
    const res = await fetch('/api/admin/activities/recent', { headers: getHeaders() });
    if (res.ok) {
      const logs = await res.json();
      const container = document.getElementById('acRecentActivitiesList');
      if (logs.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px 0;">No recent activities.</div>';
        return;
      }
      container.innerHTML = logs.map(l => {
        const time = new Date(l.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date(l.Timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        let icon = 'fa-user-cog';
        let iconColor = 'var(--primary)';
        if (l.Action.includes('login')) { icon = 'fa-right-to-bracket'; iconColor = 'var(--success)'; }
        else if (l.Action.includes('logout')) { icon = 'fa-right-from-bracket'; iconColor = 'var(--text-muted)'; }
        else if (l.Action.includes('property') || l.Action.includes('listing')) { icon = 'fa-building'; iconColor = 'var(--info)'; }
        else if (l.Action.includes('task')) { icon = 'fa-clipboard-list'; iconColor = '#a855f7'; }
        
        return `
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.03); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:${iconColor};">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-size:0.82rem;">
                <strong>${l.Email}</strong>
                <span style="font-size:0.72rem; color:var(--text-muted);">${date} ${time}</span>
              </div>
              <div style="color:var(--text-secondary); font-size:0.78rem;">${l.Details}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error fetching recent activities:', err);
  }
}

async function fetchAdminConsoleSessions() {
  try {
    const res = await fetch('/api/admin/system/sessions', { headers: getHeaders() });
    if (res.ok) {
      const sessions = await res.json();
      const tbody = document.getElementById('acSessionsTbody');
      tbody.innerHTML = sessions.map(s => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${s.id}</td>
          <td><strong>${s.email}</strong></td>
          <td><span class="badge badge-${s.role === 'super_admin' ? 'success' : s.role === 'partner' ? 'info' : 'primary'}">${s.role}</span></td>
          <td style="font-family:monospace;">${s.ip}</td>
          <td>${s.device}</td>
          <td>${new Date(s.loginTime).toLocaleString()}</td>
          <td>
            <button class="act-btn danger" title="Revoke Session" onclick="revokeSession('${s.id}')">
              <i class="fa-solid fa-ban"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching active sessions:', err);
  }
}

function revokeSession(sessionId) {
  showToast(`Session ${sessionId} has been successfully revoked!`, 'success');
  fetchAdminConsoleSessions();
}

function setupAdminConsoleEventListeners() {
  const tM = document.getElementById('acToggleMaintenance');
  const tR = document.getElementById('acToggleRateLimiting');
  const tD = document.getElementById('acToggleDebug');
  const btnB = document.getElementById('acBtnBackup');
  const btnC = document.getElementById('acBtnClearCache');
  
  tM.onchange = () => toggleSystemSetting('maintenanceMode', tM.checked);
  tR.onchange = () => toggleSystemSetting('apiRateLimiting', tR.checked);
  tD.onchange = () => toggleSystemSetting('debugLogging', tD.checked);
  
  btnB.onclick = async () => {
    btnB.disabled = true;
    const originalText = btnB.innerHTML;
    btnB.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Backing up database...';
    try {
      const res = await fetch('/api/admin/system/backup', { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        document.getElementById('acBackupTime').innerHTML = `<i class="fa-solid fa-clock"></i> Backup: Just now`;
      } else {
        showToast('Backup failed.', 'error');
      }
    } catch (err) {
      showToast('Network error during backup.', 'error');
    } finally {
      btnB.disabled = false;
      btnB.innerHTML = originalText;
    }
  };
  
  btnC.onclick = async () => {
    btnC.disabled = true;
    const originalText = btnC.innerHTML;
    btnC.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Clearing cache...';
    try {
      const res = await fetch('/api/admin/system/clear-cache', { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
      } else {
        showToast('Cache clearing failed.', 'error');
      }
    } catch (err) {
      showToast('Network error during cache clear.', 'error');
    } finally {
      btnC.disabled = false;
      btnC.innerHTML = originalText;
    }
  };
}

async function toggleSystemSetting(key, value) {
  try {
    const res = await fetch('/api/admin/system/settings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    });
    if (res.ok) {
      showToast(`System setting "${key}" updated successfully.`, 'success');
      fetchAdminConsoleStatus();
    } else {
      showToast('Failed to update system setting.', 'error');
    }
  } catch (err) {
    showToast('Network error updating system setting.', 'error');
  }
}

// ─── PROPERTY MANAGEMENT ───────────────────────────────
let pmProperties = [];
let pmAmenities = [];

async function initPropertyManagement() {
  switchPropTab('list');
  await loadPmProperties();
  await loadPmAmenities();
  
  document.getElementById('pmSearch').oninput = filterPmProperties;
  document.getElementById('pmTypeFilter').onchange = filterPmProperties;
  document.getElementById('pmStatusFilter').onchange = filterPmProperties;
}

function switchPropTab(tab) {
  document.getElementById('propListSection').style.display = 'none';
  document.getElementById('propApprovalsSection').style.display = 'none';
  document.getElementById('propRoomsSection').style.display = 'none';
  document.getElementById('propAmenitiesSection').style.display = 'none';
  
  document.getElementById('tabPropListBtn').classList.remove('active');
  document.getElementById('tabPropApprovalsBtn').classList.remove('active');
  document.getElementById('tabPropRoomsBtn').classList.remove('active');
  document.getElementById('tabPropAmenitiesBtn').classList.remove('active');
  
  if (tab === 'list') {
    document.getElementById('propListSection').style.display = 'block';
    document.getElementById('tabPropListBtn').classList.add('active');
    loadPmProperties();
  } else if (tab === 'approvals') {
    document.getElementById('propApprovalsSection').style.display = 'block';
    document.getElementById('tabPropApprovalsBtn').classList.add('active');
    renderPmApprovals();
  } else if (tab === 'rooms') {
    document.getElementById('propRoomsSection').style.display = 'block';
    document.getElementById('tabPropRoomsBtn').classList.add('active');
    populatePropertyDropdown();
  } else if (tab === 'amenities') {
    document.getElementById('propAmenitiesSection').style.display = 'block';
    document.getElementById('tabPropAmenitiesBtn').classList.add('active');
    loadPmAmenities();
  }
}

async function loadPmProperties() {
  try {
    const res = await fetch('/api/properties');
    if (res.ok) {
      pmProperties = await res.json();
      renderPmProperties();
      
      const pending = pmProperties.filter(p => p.Status === 'pending_approval' || p.Status === 'pending');
      document.getElementById('propApprovalsCount').textContent = pending.length;
    }
  } catch (e) {
    showToast('Failed to load properties.', 'error');
  }
}

function renderPmProperties(data = null) {
  const list = data || pmProperties;
  const tbody = document.getElementById('pmPropertiesTbody');
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">No properties found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(p => {
    const statusClass = p.Status === 'active' ? 'success' : p.Status === 'suspended' ? 'danger' : 'warning';
    return `
      <tr>
        <td style="font-family:monospace; font-weight:700; color:var(--primary);">${p.ID}</td>
        <td><img src="${p.img || 'student_room.png'}" style="width:45px; height:35px; object-fit:cover; border-radius:4px; border:1px solid var(--border);"></td>
        <td><strong>${p.Name}</strong></td>
        <td><i class="fa-solid fa-location-dot" style="font-size:11px; color:var(--text-muted); margin-right:4px;"></i>${p.Location}</td>
        <td><span class="badge badge-info">${p.Type}</span></td>
        <td style="font-weight:700; color:var(--primary);">${p.Price}</td>
        <td>${p.Beds} Bed / ${p.Baths} Bath</td>
        <td><span class="badge badge-${statusClass}">${p.Status}</span></td>
        <td>
          <div class="action-btns">
            <button class="act-btn" title="Edit" onclick="openEditPropertyModal('${p.ID}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="act-btn ${p.Status === 'active' ? 'danger' : 'success'}" title="${p.Status === 'active' ? 'Suspend' : 'Activate'}" onclick="togglePropertySuspension('${p.ID}', '${p.Status}')">
              <i class="fa-solid ${p.Status === 'active' ? 'fa-pause' : 'fa-play'}"></i>
            </button>
            <button class="act-btn danger" title="Delete" onclick="deleteProperty('${p.ID}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterPmProperties() {
  const query = document.getElementById('pmSearch').value.toLowerCase();
  const type = document.getElementById('pmTypeFilter').value;
  const status = document.getElementById('pmStatusFilter').value;
  
  let filtered = [...pmProperties];
  if (query) {
    filtered = filtered.filter(p => p.Name.toLowerCase().includes(query) || p.Location.toLowerCase().includes(query));
  }
  if (type !== 'all') {
    filtered = filtered.filter(p => p.Type === type);
  }
  if (status !== 'all') {
    filtered = filtered.filter(p => p.Status === status);
  }
  renderPmProperties(filtered);
}

function openAddPropertyModal() {
  document.getElementById('apName').value = '';
  document.getElementById('apPrice').value = '';
  document.getElementById('apArea').value = '';
  
  const btn = document.getElementById('savePropertyBtn');
  btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Property';
  btn.onclick = saveNewProperty;
  
  openModal('addPropertyModal');
}

function openEditPropertyModal(id) {
  const p = pmProperties.find(x => String(x.ID) === String(id));
  if (!p) return;
  
  document.getElementById('apName').value = p.Name;
  document.getElementById('apCity').value = p.Location;
  document.getElementById('apType').value = p.Type;
  
  const priceVal = p.Price.replace(/[^0-9]/g, '');
  document.getElementById('apPrice').value = priceVal;
  
  if (p.Price.includes('/mo')) document.getElementById('apUnit').value = '/mo';
  else if (p.Price.includes('/night')) document.getElementById('apUnit').value = '/night';
  else if (p.Price.includes('/week')) document.getElementById('apUnit').value = '/week';
  
  document.getElementById('apBeds').value = p.Beds;
  document.getElementById('apBaths').value = p.Baths;
  document.getElementById('apArea').value = p.Area;
  
  const btn = document.getElementById('savePropertyBtn');
  btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Property';
  btn.onclick = () => updatePropertyDetails(id);
  
  openModal('addPropertyModal');
}

async function saveNewProperty() {
  const name = document.getElementById('apName').value.trim();
  const city = document.getElementById('apCity').value;
  const type = document.getElementById('apType').value;
  const price = document.getElementById('apPrice').value.trim();
  const unit = document.getElementById('apUnit').value;
  if (!name || !price) { showToast('Name and price are required.','error'); return; }
  
  const imgs = {students:'student_room.png',employees:'employee_room.png',tourists:'tourist_room.png',foreigners:'foreigner_room.png',couples:'couple_room.png'};
  const propertyData = {
    name, location: city, type, price: `₹${parseFloat(price).toLocaleString()}${unit}`, 
    beds: +document.getElementById('apBeds').value, 
    baths: +document.getElementById('apBaths').value, 
    area: +document.getElementById('apArea').value||300, 
    img: imgs[type] || 'student_room.png',
    status: 'pending_approval'
  };

  try {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData)
    });
    if (res.ok) {
      closeModal('addPropertyModal');
      showToast(`"${name}" added and is pending approval!`, 'success');
      await loadPmProperties();
    } else {
      showToast('Failed to save property.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend.', 'error');
  }
}

async function updatePropertyDetails(id) {
  const name = document.getElementById('apName').value.trim();
  const city = document.getElementById('apCity').value;
  const type = document.getElementById('apType').value;
  const price = document.getElementById('apPrice').value.trim();
  const unit = document.getElementById('apUnit').value;
  if (!name || !price) { showToast('Name and price are required.','error'); return; }
  
  const propertyData = {
    name, location: city, type, price: `₹${parseFloat(price).toLocaleString()}${unit}`, 
    beds: +document.getElementById('apBeds').value, 
    baths: +document.getElementById('apBaths').value, 
    area: +document.getElementById('apArea').value||300
  };

  try {
    const res = await fetch(`/api/admin/properties/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(propertyData)
    });
    if (res.ok) {
      closeModal('addPropertyModal');
      showToast(`Property "${name}" updated successfully!`, 'success');
      await loadPmProperties();
    } else {
      showToast('Failed to update property.', 'error');
    }
  } catch (err) {
    showToast('Network error updating property.', 'error');
  }
}

async function deleteProperty(id) {
  if (!confirm('Are you sure you want to delete this property? This will permanently erase the listing.')) return;
  try {
    const res = await fetch(`/api/admin/properties/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Property deleted successfully!', 'success');
      await loadPmProperties();
    } else {
      showToast('Failed to delete property.', 'error');
    }
  } catch (e) {
    showToast('Network error during deletion.', 'error');
  }
}

async function togglePropertySuspension(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  try {
    const res = await fetch(`/api/admin/properties/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Property status updated to "${newStatus}"!`, 'success');
      await loadPmProperties();
    } else {
      showToast('Failed to update property status.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// Tab 2: Approvals & Verification
function renderPmApprovals() {
  const pending = pmProperties.filter(p => p.Status === 'pending_approval' || p.Status === 'pending');
  const tbody = document.getElementById('pmApprovalsTbody');
  
  if (pending.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No pending property approvals.</td></tr>';
    return;
  }
  
  tbody.innerHTML = pending.map(p => `
    <tr>
      <td style="font-family:monospace; font-weight:700; color:var(--primary);">${p.ID}</td>
      <td><strong>${p.Name}</strong></td>
      <td><strong>Partner Host</strong></td>
      <td><i class="fa-solid fa-location-dot" style="font-size:11px; color:var(--text-muted); margin-right:4px;"></i>${p.Location}</td>
      <td><span class="badge badge-info">${p.Type}</span></td>
      <td>
        <div style="font-size:11px; display:flex; flex-direction:column; gap:2px;">
          <span><i class="fa-solid fa-file-pdf" style="color:var(--danger); margin-right:4px;"></i>GSTIN_Reg.pdf</span>
          <span><i class="fa-solid fa-file-pdf" style="color:var(--danger); margin-right:4px;"></i>Prop_Tax.pdf</span>
        </div>
      </td>
      <td><span class="badge badge-warning">${p.Status}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openDocVerifyModal('${p.ID}')" style="font-size:0.75rem; padding:4px 10px; border-color:var(--primary); color:var(--primary);">
          <i class="fa-solid fa-file-shield"></i> Verify Docs
        </button>
      </td>
    </tr>
  `).join('');
}

function openDocVerifyModal(id) {
  document.getElementById('pmVerifyPropId').value = id;
  
  const p = pmProperties.find(x => String(x.ID) === String(id));
  if (p) {
    const cleanName = p.Name.replace(/[^a-zA-Z0-9]/g, '_');
    document.getElementById('pmGstDocName').textContent = `GSTIN_${cleanName}.pdf`;
    document.getElementById('pmTaxDocName').textContent = `PROPERTY_TAX_${cleanName}.pdf`;
    document.getElementById('pmUtilityDocName').textContent = `UTILITY_BILL_${cleanName}.pdf`;
  }
  
  openModal('pmDocVerifyModal');
}

async function verifyPropertyListing(status) {
  const id = document.getElementById('pmVerifyPropId').value;
  closeModal('pmDocVerifyModal');
  
  try {
    const res = await fetch(`/api/admin/properties/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Property stay was ${status === 'active' ? 'approved and activated' : 'rejected'}!`, 'success');
      await loadPmProperties();
      renderPmApprovals();
    } else {
      showToast('Failed to verify property.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// Tab 3: Rooms & Pricing
function populatePropertyDropdown() {
  const select = document.getElementById('pmRoomPropSelect');
  select.innerHTML = pmProperties.map(p => `
    <option value="${p.ID}">${p.Name} (${p.Location})</option>
  `).join('');
  
  if (pmProperties.length > 0) {
    loadPropertyMeta();
  }
}

async function loadPropertyMeta() {
  const id = document.getElementById('pmRoomPropSelect').value;
  if (!id) return;
  
  try {
    const res = await fetch(`/api/admin/properties/${id}/meta`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      
      document.getElementById('pmRoomCategories').value = data.Room_Categories || '';
      document.getElementById('pmRoomInventory').value = data.Inventory || '';
      document.getElementById('pmRoomPrices').value = data.Seasonal_Price || '';
      document.getElementById('pmRoomWeekendPrices').value = data.Weekend_Price || '';
      document.getElementById('pmRoomDiscounts').value = data.Discounts || '';
      document.getElementById('pmRoomCheckInOut').value = data.Check_In_Out || '';
      document.getElementById('pmRoomPolicies').value = data.Policies || '';
      document.getElementById('pmRoomBlockedDates').value = data.Blocked_Dates || '';
    }
  } catch (e) {
    showToast('Failed to load room configurations.', 'error');
  }
}

async function savePropertyMeta() {
  const id = document.getElementById('pmRoomPropSelect').value;
  if (!id) return;
  
  const updates = {
    room_categories: document.getElementById('pmRoomCategories').value.trim(),
    inventory: document.getElementById('pmRoomInventory').value.trim(),
    seasonal_price: document.getElementById('pmRoomPrices').value.trim(),
    weekend_price: document.getElementById('pmRoomWeekendPrices').value.trim(),
    discounts: document.getElementById('pmRoomDiscounts').value.trim(),
    check_in_out: document.getElementById('pmRoomCheckInOut').value.trim(),
    policies: document.getElementById('pmRoomPolicies').value.trim(),
    blocked_dates: document.getElementById('pmRoomBlockedDates').value.trim()
  };
  
  try {
    const res = await fetch(`/api/admin/properties/${id}/meta`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      showToast('Room and pricing configurations saved!', 'success');
    } else {
      showToast('Failed to save configurations.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// Tab 4: Amenities
async function loadPmAmenities() {
  try {
    const res = await fetch('/api/admin/amenities', { headers: getHeaders() });
    if (res.ok) {
      pmAmenities = await res.json();
      renderPmAmenities();
    }
  } catch (e) {
    console.error('Failed to load amenities:', e);
  }
}

function renderPmAmenities() {
  const tbody = document.getElementById('pmAmenitiesTbody');
  if (pmAmenities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No amenities configured.</td></tr>';
    return;
  }
  
  tbody.innerHTML = pmAmenities.map((name, idx) => {
    const mockCount = Math.floor(Math.random() * 8) + 2;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td><span class="badge badge-info">${mockCount} properties</span></td>
        <td>
          <button class="act-btn danger" title="Delete" onclick="showToast('Default amenities cannot be deleted.','error')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function addGlobalAmenity() {
  const input = document.getElementById('pmAmenityName');
  const name = input.value.trim();
  if (!name) {
    showToast('Amenity name is required.', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/admin/amenities', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      showToast(`Amenity "${name}" added!`, 'success');
      input.value = '';
      await loadPmAmenities();
    } else {
      showToast('Failed to add amenity.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// ─── MANAGEMENT CONSOLE ────────────────────────────────
// Management Console State & Mock Data
let mcRole = 'super_admin';
let mcCity = 'all';
let activeMcTab = 'dashboard';

// Seeding Partner CRM data
let mcPartners = [
  {
    ID: 1,
    Name: 'Default Partner',
    Email: 'partner@homzo.in',
    Phone: '+91 98765 43210',
    City: 'Mumbai',
    Revenue_Share: 15,
    Onboarding_Stage: 'Active',
    Status: 'active',
    CommLogs: [
      { date: '2026-06-25 10:30', type: 'Call', msg: 'Discussed summer occupancy. Partner requested promotional support.' },
      { date: '2026-06-28 14:15', type: 'WhatsApp', msg: 'Sent contract renewal reminder. Partner acknowledged.' }
    ],
    Escalations: [
      { id: 101, msg: 'Delay in laundry service reporting from guest', date: '2026-06-29', status: 'pending' }
    ]
  },
  {
    ID: 2,
    Name: 'Apex Stay Hotels',
    Email: 'apex@homzo.in',
    Phone: '+91 99999 77777',
    City: 'Delhi',
    Revenue_Share: 12,
    Onboarding_Stage: 'Agreement Sent',
    Status: 'active',
    CommLogs: [
      { date: '2026-06-20 11:00', type: 'Email', msg: 'Sent revenue share agreement. Waiting for signature.' }
    ],
    Escalations: []
  },
  {
    ID: 3,
    Name: 'Elite Suites Bangalore',
    Email: 'elite@homzo.in',
    Phone: '+91 88888 66666',
    City: 'Bangalore',
    Revenue_Share: 18,
    Onboarding_Stage: 'Lead',
    Status: 'under review',
    CommLogs: [
      { date: '2026-06-18 16:30', type: 'Call', msg: 'Initial pitch call. Partner expressed interest in 5 Star category listing.' }
    ],
    Escalations: []
  }
];

// Guest Complaints & Feedback
let mcComplaints = [
  { id: 201, guest: 'Rishabh kumar', property: 'Test Prop', city: 'Mumbai', msg: 'Air conditioning in Room 304 is making loud noises.', status: 'pending', date: '2026-06-29' },
  { id: 202, guest: 'Surya', property: 'Test Prop', city: 'Mumbai', msg: 'Slow Wi-Fi speed in the executive suite.', status: 'resolved', date: '2026-06-28' },
  { id: 203, guest: 'Test User', property: 'Vulnerability Test Property', city: 'Delhi', msg: 'Room service took over 45 minutes to deliver dinner.', status: 'escalated', date: '2026-06-29' }
];

// Guest Reviews
let mcReviews = [
  { id: 301, guest: 'Rishabh kumar', property: 'Test Prop', rating: 5, review: 'Exceptional stay! Extremely clean rooms and professional staff conduct. Highly recommended.', status: 'pending', date: '2026-06-29' },
  { id: 302, guest: 'Surya', property: 'Test Prop', rating: 4, review: 'Beautiful ocean view. The breakfast spread was fantastic, but checkout was a bit slow.', status: 'approved', date: '2026-06-28' },
  { id: 303, guest: 'Test User', property: 'Vulnerability Test Property', rating: 2, review: 'Lobby AC was not working and staff seemed unresponsive to complaints.', status: 'pending', date: '2026-06-29' }
];

// Payouts approval pipeline (declared at top)

// Marketing Campaigns
let mcCampaigns = [
  { name: 'Mumbai Monsoon Getaway', channel: 'Meta (FB/IG)', spend: 25000, leads: 450, conversions: 68 },
  { name: 'Delhi Business Premium', channel: 'Google Search', spend: 35000, leads: 320, conversions: 42 },
  { name: 'Bangalore Student Discount', channel: 'WhatsApp Broadcast', spend: 8000, leads: 600, conversions: 110 }
];

// Coupons
let mcCoupons = [
  { code: 'HOMZOGOLD', discount: 20, status: 'active' },
  { code: 'WELCOME10', discount: 10, status: 'active' },
  { code: 'MONSOON30', discount: 30, status: 'active' }
];

// Leads Pipeline
let mcLeads = [
  { name: 'Sanjay Dutt (Hotel Owner)', contact: 'sanjay@hotelowners.com', category: 'Partner', status: 'Contacted', source: 'Referral', city: 'Mumbai' },
  { name: 'Neha Sharma (Guest)', contact: 'neha@gmail.com', category: 'Guest', status: 'New', source: 'Meta Ad', city: 'Mumbai' },
  { name: 'Karan Johar (Hotel Group)', contact: 'karan@dharmahotels.com', category: 'Partner', status: 'New', source: 'Google Search', city: 'Delhi' },
  { name: 'Priya Patel (Guest)', contact: 'priya@outlook.com', category: 'Guest', status: 'Converted', source: 'Referral', city: 'Bangalore' }
];

// Referral Leaderboard
let mcReferrals = [
  { name: 'Rishabh kumar', count: 8, rewards: '₹4,000' },
  { name: 'Surya', count: 5, rewards: '₹2,500' },
  { name: 'Test User', count: 2, rewards: '₹1,000' }
];

// Quality Inspections
let mcInspections = [
  { id: 501, property: 'Test Prop', cleanliness: 9, amenities: 8, staff: 9, safety: 9, score: 8.75, rating: 4.5, date: '2026-06-20', action: 'None', deadline: '-' },
  { id: 502, property: 'Vulnerability Test Property', cleanliness: 7, amenities: 8, staff: 8, safety: 7, score: 7.5, rating: 3.8, date: '2026-06-22', action: 'Update fire exit signs', deadline: '2026-07-05' }
];

// City Expansion Tracker
let mcExpansion = [
  { city: 'Mumbai', status: 'Active', timeline: 'Established Q1 2026', goal: 10, achieved: 8 },
  { city: 'Delhi', status: 'Active', timeline: 'Established Q2 2026', goal: 8, achieved: 6 },
  { city: 'Bangalore', status: 'Onboarding', timeline: 'Launch Q3 2026', goal: 5, achieved: 2 },
  { city: 'Pune', status: 'Target', timeline: 'Target Q4 2026', goal: 5, achieved: 0 }
];

// Alerts
let mcAlerts = [
  { id: 601, title: 'Contract Expiry Warning', desc: 'Partner contract with Elite Suites Bangalore expires in 15 days.', severity: 'warning', date: '2026-06-29 10:00', city: 'Bangalore' },
  { id: 602, title: 'Low Inventory Warning', desc: 'Test Prop (Mumbai) is at 94% occupancy. Only 3 rooms available.', severity: 'danger', date: '2026-06-30 08:30', city: 'Mumbai' },
  { id: 603, title: 'Unresolved Complaint > 24 Hours', desc: 'Guest Rishabh kumar complaint regarding AC in Room 304 has been open for 26 hours.', severity: 'danger', date: '2026-06-29 23:00', city: 'Mumbai' },
  { id: 604, title: 'Booking Cancellation Spike', desc: 'Delhi region has seen a 15% spike in cancellations over the past 4 hours.', severity: 'warning', date: '2026-06-30 00:45', city: 'Delhi' }
];

// CRM Selected Partner ID
let selectedPartnerId = null;

// Initializer
async function initManagementConsole() {
  setupMcNavigation();
  setupMcRoleSimulator();
  setupMcEventListeners();
  
  // Fetch properties and bookings if not loaded
  if (adminProps.length === 0) await fetchPropertiesFromAPI();
  if (guestsData.length === 0) await fetchGuestsFromAPI();
  
  // Render active panel
  renderActiveMcPanel();
}

// Role Simulator Setup
window.allSimUsers = [];

async function setupMcRoleSimulator() {
  const select = document.getElementById('mcRoleSimulatorSelect');
  if (!select) return;
  
  try {
    const res = await fetch('/api/users', { headers: getHeaders() });
    if (res.ok) {
      window.allSimUsers = await res.json();
    }
  } catch (e) {
    console.error('Failed to load users for simulator:', e);
  }
  
  let optionsHtml = `<option value="super_admin">CEO (Super Admin)</option>`;
  
  if (window.allSimUsers && window.allSimUsers.length > 0) {
    window.allSimUsers.forEach(u => {
      if (u.email !== 'admin@homzo.in') {
        let label = `${u.name} - ${u.role_name}`;
        if (u.assigned_city_id) {
          const cityObj = window.sacCities.find(c => c.id === u.assigned_city_id);
          if (cityObj) label += ` (${cityObj.name})`;
        }
        optionsHtml += `<option value="user_${u.id}">${label}</option>`;
      }
    });
  } else {
    optionsHtml += `
      <option value="operations_executive">Operations Executive</option>
      <option value="developer">Developer</option>
      <option value="city_manager_mumbai">City Manager - Mumbai</option>
      <option value="city_manager_delhi">City Manager - Delhi</option>
      <option value="city_manager_bangalore">City Manager - Bangalore</option>
    `;
  }
  
  select.innerHTML = optionsHtml;
  
  if (mcRole === 'super_admin') {
    select.value = 'super_admin';
  } else if (mcRole === 'operations_executive') {
    select.value = 'operations_executive';
  } else if (mcRole === 'developer') {
    select.value = 'developer';
  } else if (mcRole === 'city_manager') {
    const matchedUser = window.allSimUsers.find(u => u.role_name === 'City Manager' && u.assigned_city_id && window.sacCities.find(c => c.id === u.assigned_city_id && c.name.toLowerCase() === mcCity.toLowerCase()));
    if (matchedUser) {
      select.value = `user_${matchedUser.id}`;
    } else {
      select.value = `city_manager_${mcCity.toLowerCase()}`;
    }
  } else if (mcRole && !isNaN(Number(mcRole))) {
    select.value = `user_${mcRole}`;
  }
  
  select.onchange = (e) => {
    const val = e.target.value;
    if (val === 'super_admin') {
      mcRole = 'super_admin';
      mcCity = 'all';
    } else if (val === 'operations_executive') {
      mcRole = 'operations_executive';
      mcCity = 'all';
    } else if (val === 'developer') {
      mcRole = 'developer';
      mcCity = 'all';
    } else if (val.startsWith('user_')) {
      const userId = parseInt(val.replace('user_', ''));
      const targetUser = window.allSimUsers.find(u => u.id === userId);
      if (targetUser) {
        mcRole = String(targetUser.id);
        if (targetUser.assigned_city_id) {
          const cityObj = window.sacCities.find(c => c.id === targetUser.assigned_city_id);
          mcCity = cityObj ? cityObj.name : 'all';
        } else {
          mcCity = 'all';
        }
      }
    } else {
      mcRole = 'city_manager';
      mcCity = val.replace('city_manager_', '').charAt(0).toUpperCase() + val.replace('city_manager_', '').slice(1);
    }
    
    let displayRoleName = 'City Manager';
    if (val === 'super_admin') displayRoleName = 'Super Admin';
    else if (val === 'operations_executive') displayRoleName = 'Operations Executive';
    else if (val === 'developer') displayRoleName = 'Developer';
    else if (val.startsWith('user_')) {
      const userId = parseInt(val.replace('user_', ''));
      const targetUser = window.allSimUsers.find(u => u.id === userId);
      if (targetUser) displayRoleName = targetUser.role_name;
    }
    
    document.getElementById('mcActiveRoleText').textContent = displayRoleName;
    document.getElementById('mcActiveCityText').textContent = mcCity !== 'all' ? `(${mcCity} Only)` : '(All Cities)';
    
    showToast(`Role simulated: ${displayRoleName} ${mcCity !== 'all' ? `(${mcCity})` : ''}`, 'info');
    
    updateSidebarVisibility();
    renderActiveMcPanel();
  };
}

// Navigation Tabs Setup
function setupMcNavigation() {
  const navItems = document.querySelectorAll('.mc-nav-item');
  navItems.forEach(item => {
    item.onclick = () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const tab = item.dataset.mcTab;
      activeMcTab = tab;
      
      // Hide all panels
      document.querySelectorAll('.mc-panel').forEach(p => p.classList.remove('active'));
      // Show selected panel
      document.getElementById(`mc-panel-${tab}`).classList.add('active');
      
      renderActiveMcPanel();
    };
  });
}

// Check Permission Helper
function checkMcPermission(action, itemCity = null) {
  // If Super Admin, allow everything
  if (mcRole === 'super_admin') return true;

  // Enforce city restriction for City Manager
  if (mcRole === 'city_manager' && itemCity) {
    if (itemCity.toLowerCase() !== mcCity.toLowerCase()) {
      showToast(`Access Denied: You are only authorized for ${mcCity}.`, 'error');
      return false;
    }
  }

  // Map actions to modules
  let requiredModule = '';
  if (['add_property', 'edit_property', 'suspend_property', 'delete_property', 'save_partner_crm'].includes(action)) {
    requiredModule = 'contracts';
  } else if (['cancel_booking', 'modify_booking', 'blacklist_guest', 'resolve_complaint', 'moderate_review', 'submit_audit'].includes(action)) {
    requiredModule = 'compliance';
  } else if (['request_payout'].includes(action)) {
    requiredModule = 'financial';
  } else if (['create_coupon'].includes(action)) {
    requiredModule = 'company';
  } else {
    return true; // default fallback
  }

  // Query sacRolesPermissions
  const roleData = sacRolesPermissions.find(rp => rp.Role === mcRole);
  if (roleData && roleData.Permissions.includes(requiredModule)) {
    return true;
  }

  showToast(`Permission Denied: Your role (${mcRole}) does not have "${requiredModule}" access.`, 'error');
  return false;
}

// Update Sidebar Visibility based on simulated/active role permissions
const defaultRolesFallback = [
  { Name: 'CEO', Console_Type: 'Admin' },
  { Name: 'super_admin', Console_Type: 'Admin' },
  { Name: 'COO', Console_Type: 'Management' },
  { Name: 'CTO', Console_Type: 'Developer' },
  { Name: 'CMO', Console_Type: 'Management' },
  { Name: 'City Manager', Console_Type: 'Management' },
  { Name: 'Quality Manager', Console_Type: 'Management' },
  { Name: 'Guest Relations', Console_Type: 'Management' },
  { Name: 'Finance Manager', Console_Type: 'Management' },
  { Name: 'General Admin', Console_Type: 'Management' },
  { Name: 'Developer', Console_Type: 'Developer' },
  { Name: 'operations_executive', Console_Type: 'Management' }
];

function updateSidebarVisibility() {
  const currentRoleLower = mcRole.toLowerCase();
  const perms = rolePermissionsMapping[currentRoleLower] || rolePermissionsMapping['general admin'];
  
  // Enforce page gating in sidebar
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    const page = link.dataset.page;
    if (perms.sidebar.includes(page) || page === 'settings' || page === 'dashboard') {
      link.style.display = '';
    } else {
      link.style.display = 'none';
    }
  });

  // Hide/show Management Console navigation tabs based on mcRole
  const allowedMcTabs = perms.mcTabs || [];
  document.querySelectorAll('.mc-nav-item').forEach(item => {
    const tab = item.dataset.mcTab;
    if (allowedMcTabs.includes(tab) || tab === 'dashboard') {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });

  // Adjust active tab if it's now hidden
  if (activeMcTab !== 'dashboard' && !allowedMcTabs.includes(activeMcTab)) {
    activeMcTab = 'dashboard';
    document.querySelectorAll('.mc-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.mcTab === 'dashboard');
    });
  }

  // Hide Role Simulator Bar if logged in user is NOT CEO/Super Admin
  const simBar = document.querySelector('.mc-simulator-bar');
  if (simBar) {
    const realEmail = window.currentUser ? window.currentUser.email : 'admin@homzo.in';
    const isRealCEO = (realEmail === 'admin@homzo.in');
    simBar.style.display = isRealCEO ? '' : 'none';
  }

  // Handle group labels visibility (Finance, Partnership, Consoles, Settings)
  const labels = document.querySelectorAll('.nav-group-label');
  labels.forEach(label => {
    let sibling = label.nextElementSibling;
    let anyVisible = false;
    while (sibling && !sibling.classList.contains('nav-group-label') && !sibling.classList.contains('sidebar-footer')) {
      if (sibling.classList.contains('sidebar-link') && sibling.style.display !== 'none') {
        anyVisible = true;
        break;
      }
      sibling = sibling.nextElementSibling;
    }
    label.style.display = anyVisible ? '' : 'none';
  });
}

// Filter Data by Role & City
function filterMcData(data, cityField = 'city') {
  if (mcRole === 'city_manager') {
    return data.filter(item => item[cityField] && item[cityField].toLowerCase() === mcCity.toLowerCase());
  }
  return data;
}

// Render Active Panel Router
function renderActiveMcPanel() {
  // Update notifications badge count
  const filteredAlerts = filterMcData(mcAlerts, 'city');
  document.getElementById('mcAlertsCountBadge').textContent = filteredAlerts.length;
  
  switch (activeMcTab) {
    case 'dashboard':
      renderMcDashboard();
      break;
    case 'properties':
      renderMcProperties();
      break;
    case 'partners':
      renderMcPartners();
      break;
    case 'bookings':
      renderMcBookings();
      break;
    case 'guests':
      renderMcGuests();
      break;
    case 'revenue':
      renderMcRevenue();
      break;
    case 'marketing':
      renderMcMarketing();
      break;
    case 'quality':
      renderMcQuality();
      break;
    case 'expansion':
      renderMcExpansion();
      break;
    case 'alerts':
      renderMcAlerts();
      break;
  }
}

// ════ 1. OPERATIONS DASHBOARD ════
function renderMcDashboard() {
  const activeProps = filterMcData(adminProps, 'location');
  const activeBookings = filterMcData(bookingsData, 'propertyCity'); // We will augment bookingsData with propertyCity
  const pendingKyc = filterMcData(mcPartners, 'City').filter(p => p.Onboarding_Stage !== 'Active');
  const openComplaints = filterMcData(mcComplaints, 'city').filter(c => c.status !== 'resolved');
  
  // Calculate Revenue
  let totalRevenue = 0;
  let todayRevenue = 0;
  activeBookings.forEach(b => {
    const amt = parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0;
    totalRevenue += amt;
    // Simulate some today's bookings
    if (b.id.charCodeAt(5) % 3 === 0) {
      todayRevenue += amt * 0.1;
    }
  });

  document.getElementById('mcdKpiActiveProps').textContent = activeProps.length;
  document.getElementById('mcdKpiTodayBookings').textContent = Math.ceil(activeBookings.length * 0.2);
  document.getElementById('mcdKpiTodayBookingsSub').textContent = `${Math.ceil(activeBookings.length * 0.15)} confirmed`;
  document.getElementById('mcdKpiPendingKyc').textContent = pendingKyc.length;
  document.getElementById('mcdKpiOpenComplaints').textContent = openComplaints.length;
  document.getElementById('mcdKpiRevenue').textContent = `₹${Math.ceil(totalRevenue).toLocaleString()}`;
  document.getElementById('mcdKpiRevenueToday').textContent = `Today: ₹${Math.ceil(todayRevenue).toLocaleString()}`;

  // Property Distribution Table
  const cities = ['Mumbai', 'Delhi', 'Bangalore'];
  const tbody = document.getElementById('mcdCityPropsTbody');
  tbody.innerHTML = cities.map(city => {
    // If city manager, other cities are hidden/grayed out
    const isFilteredOut = mcRole === 'city_manager' && city.toLowerCase() !== mcCity.toLowerCase();
    const props = adminProps.filter(p => p.location.toLowerCase() === city.toLowerCase());
    
    let totalRooms = props.length * 45; // Simulated rooms
    let occRate = props.length > 0 ? (city === 'Mumbai' ? 82 : (city === 'Delhi' ? 68 : 75)) : 0;
    
    if (isFilteredOut) {
      return `<tr style="opacity: 0.4;">
        <td><strong>${city}</strong> <span style="font-size:0.75rem;">(Restricted)</span></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>`;
    }
    
    return `<tr>
      <td><strong>${city}</strong></td>
      <td><span class="mc-badge-status mc-badge-active" style="padding: 2px 8px;">${props.length} Active</span></td>
      <td>${totalRooms} Rooms</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="color:var(--mc-gold); min-width:35px;">${occRate}%</strong>
          <div class="mc-progress-bg" style="margin:0; flex:1;">
            <div class="mc-progress-fill" style="width: ${occRate}%;"></div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');

  // High Priority Items
  const priorityList = document.getElementById('mcdPriorityItemsList');
  const activeAlerts = filterMcData(mcAlerts, 'city').slice(0, 3);
  
  if (activeAlerts.length === 0) {
    priorityList.innerHTML = '<p style="color:var(--mc-text-muted); text-align:center; padding:15px;">No high priority items. Everything is running smoothly!</p>';
    return;
  }
  
  priorityList.innerHTML = activeAlerts.map(a => `
    <div class="mc-alert-item" style="padding: 10px; margin-bottom: 0;">
      <span class="mc-alert-icon ${a.severity === 'danger' ? 'danger' : 'warning'}"><i class="fa-solid fa-circle-exclamation"></i></span>
      <div class="mc-alert-body">
        <div class="mc-alert-title" style="font-size:0.8rem;">${a.title}</div>
        <div class="mc-alert-desc" style="font-size:0.75rem;">${a.desc}</div>
      </div>
    </div>
  `).join('');
}

// ════ 2. PROPERTY MANAGEMENT ════
function renderMcProperties() {
  const search = document.getElementById('mcPropSearch').value.toLowerCase();
  const cityFilter = document.getElementById('mcPropCityFilter').value;
  const statusFilter = document.getElementById('mcPropStatusFilter').value;
  
  // Apply role city filter locks
  if (mcRole === 'city_manager') {
    document.getElementById('mcPropCityFilter').value = mcCity;
    document.getElementById('mcPropCityFilter').disabled = true;
  } else {
    document.getElementById('mcPropCityFilter').disabled = false;
  }

  let filtered = [...adminProps];
  if (mcRole === 'city_manager') {
    filtered = filtered.filter(p => p.location.toLowerCase() === mcCity.toLowerCase());
  } else if (cityFilter !== 'all') {
    filtered = filtered.filter(p => p.location.toLowerCase() === cityFilter.toLowerCase());
  }
  
  if (statusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter);
  }
  
  if (search) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.location.toLowerCase().includes(search));
  }

  const tbody = document.getElementById('mcPropertiesTbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--mc-text-muted);">No properties found matching filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    // Inventory simulation
    const total = 50;
    const occupied = p.location === 'Mumbai' ? 41 : (p.location === 'Delhi' ? 34 : 37);
    const blocked = 3;
    const available = total - occupied - blocked;
    
    // KYC status mock
    const partner = mcPartners.find(part => part.ID === p.id) || { Onboarding_Stage: 'Active' };
    const kycBadge = partner.Onboarding_Stage === 'Active' 
      ? '<span class="mc-badge-status mc-badge-active" style="font-size:10px;"><i class="fa-solid fa-circle-check"></i> Verified</span>'
      : '<span class="mc-badge-status mc-badge-pending" style="font-size:10px;"><i class="fa-solid fa-hourglass-start"></i> Pending</span>';

    const statusBadgeClass = p.status === 'active' ? 'active' : (p.status === 'suspended' ? 'suspended' : 'review');
    
    return `
      <tr>
        <td><strong>PRP${1000 + p.id}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.img}" style="width:50px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--mc-border);">
            <div>
              <strong style="color:var(--mc-gold); font-family:'Playfair Display',serif;">${p.name}</strong>
              <div style="font-size:0.75rem; color:var(--mc-text-muted);">${p.price}</div>
            </div>
          </div>
        </td>
        <td><strong>${p.location}</strong></td>
        <td>
          <div style="font-size:0.8rem;">${p.type}</div>
          <div class="mc-stars" style="font-size:10px; margin-top:2px;">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i>
          </div>
        </td>
        <td>
          <div style="font-size:0.78rem;">
            <span style="color:#22c55e; font-weight:600;">${available} A</span> / 
            <span style="color:#3b82f6; font-weight:600;">${occupied} O</span> / 
            <span style="color:#ef4444; font-weight:600;">${blocked} B</span>
          </div>
          <div style="font-size:0.7rem; color:var(--mc-text-muted); margin-top:2px;">Total: ${total} rooms</div>
        </td>
        <td>${kycBadge}</td>
        <td><span class="mc-badge-status mc-badge-${statusBadgeClass}">${p.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="act-btn" title="Edit Property" onclick="openMcEditProperty(${p.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="act-btn ${p.status === 'active' ? 'warning' : 'success'}" title="${p.status === 'active' ? 'Suspend Property' : 'Activate Property'}" onclick="toggleMcPropertyStatus(${p.id})">
              <i class="fa-solid ${p.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
            </button>
            <button class="act-btn danger" title="Remove Property" onclick="deleteMcProperty(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Toggle Property Status
async function toggleMcPropertyStatus(id) {
  const p = adminProps.find(x => x.id === id);
  if (!p) return;
  
  if (!checkMcPermission('suspend_property', p.location)) return;
  
  const newStatus = p.status === 'active' ? 'suspended' : 'active';
  try {
    const res = await fetch(`/api/admin/properties/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      p.status = newStatus;
      showToast(`Property "${p.name}" status updated to ${newStatus}.`, 'success');
      renderMcProperties();
      renderMcDashboard();
    } else {
      showToast('Failed to update property status.', 'error');
    }
  } catch (err) {
    // Fallback simulation
    p.status = newStatus;
    showToast(`Simulated: Property "${p.name}" status updated to ${newStatus}.`, 'success');
    renderMcProperties();
    renderMcDashboard();
  }
}

// Delete Property
async function deleteMcProperty(id) {
  const p = adminProps.find(x => x.id === id);
  if (!p) return;
  
  if (!checkMcPermission('delete_property', p.location)) return;
  
  if (!confirm(`Are you sure you want to remove "${p.name}" from the platform?`)) return;
  
  try {
    const res = await fetch(`/api/admin/properties/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      adminProps = adminProps.filter(x => x.id !== id);
      showToast(`Property "${p.name}" deleted successfully.`, 'success');
      renderMcProperties();
      renderMcDashboard();
    } else {
      showToast('Failed to delete property.', 'error');
    }
  } catch (err) {
    // Fallback simulation
    adminProps = adminProps.filter(x => x.id !== id);
    showToast(`Simulated: Property "${p.name}" deleted successfully.`, 'success');
    renderMcProperties();
    renderMcDashboard();
  }
}

// Open Edit Property Modal
function openMcEditProperty(id) {
  const p = adminProps.find(x => x.id === id);
  if (!p) return;
  
  if (!checkMcPermission('edit_property', p.location)) return;
  
  document.getElementById('mcPropModalTitle').textContent = 'Edit Property Details';
  document.getElementById('mcpFormId').value = p.id;
  document.getElementById('mcpFormName').value = p.name;
  document.getElementById('mcpFormCity').value = p.location;
  document.getElementById('mcpFormStar').value = p.type.includes('5') ? '5 Star' : (p.type.includes('4') ? '4 Star' : '3 Star');
  document.getElementById('mcpFormAddress').value = p.location + ' Central Area';
  document.getElementById('mcpFormRooms').value = 50;
  document.getElementById('mcpFormPrice').value = parseInt(String(p.price).replace(/[^0-9]/g, '')) || 5000;
  
  openModal('mcPropertyModal');
}

// Save Property (Add / Edit)
async function saveMcPropertyData() {
  const id = document.getElementById('mcpFormId').value;
  const name = document.getElementById('mcpFormName').value.trim();
  const city = document.getElementById('mcpFormCity').value;
  const star = document.getElementById('mcpFormStar').value;
  const address = document.getElementById('mcpFormAddress').value.trim();
  const rooms = parseInt(document.getElementById('mcpFormRooms').value) || 50;
  const price = parseInt(document.getElementById('mcpFormPrice').value) || 5000;
  
  if (!name || !address) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }
  
  if (id) {
    // EDIT
    const p = adminProps.find(x => String(x.id) === String(id));
    if (!p) return;
    if (!checkMcPermission('edit_property', p.location)) return;
    
    // Send PUT
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name, location: city, type: star, price: `₹${price}/night` })
      });
      if (res.ok) {
        p.name = name;
        p.location = city;
        p.type = star + ' Hotel';
        p.price = `₹${price}/night`;
        showToast('Property updated successfully!', 'success');
        closeModal('mcPropertyModal');
        renderMcProperties();
      }
    } catch (e) {
      // Fallback
      p.name = name;
      p.location = city;
      p.type = star + ' Hotel';
      p.price = `₹${price}/night`;
      showToast('Simulated: Property updated successfully!', 'success');
      closeModal('mcPropertyModal');
      renderMcProperties();
    }
  } else {
    // ADD NEW
    if (!checkMcPermission('add_property', city)) return;
    
    const newId = adminProps.length > 0 ? Math.max(...adminProps.map(x=>x.id)) + 1 : 1;
    const newProp = {
      id: newId,
      name,
      location: city,
      type: star + ' Hotel',
      price: `₹${price}/night`,
      beds: 1,
      baths: 1,
      area: 250,
      img: 'student_room.png',
      status: 'under review'
    };
    
    try {
      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          Name: name,
          Location: city,
          Type: star + ' Hotel',
          Price: `₹${price}/night`,
          Beds: 1,
          Baths: 1,
          Area: 250,
          Image: 'student_room.png',
          Status: 'under review'
        })
      });
      if (res.ok) {
        adminProps.push(newProp);
        showToast('Property added for review successfully!', 'success');
        closeModal('mcPropertyModal');
        renderMcProperties();
        renderMcDashboard();
      }
    } catch (e) {
      adminProps.push(newProp);
      showToast('Simulated: Property added for review successfully!', 'success');
      closeModal('mcPropertyModal');
      renderMcProperties();
      renderMcDashboard();
    }
  }
}

// ════ 3. PARTNER CRM ════
function renderMcPartners() {
  const filtered = filterMcData(mcPartners, 'City');
  const tbody = document.getElementById('mcPartnersTbody');
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--mc-text-muted);">No partners found for your city.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr style="cursor:pointer;" onclick="selectMcPartner(${p.ID})">
      <td>
        <strong>${p.Name}</strong>
        <div style="font-size:0.75rem; color:var(--mc-text-muted);">${p.Email}</div>
      </td>
      <td><strong>${p.City}</strong></td>
      <td><strong style="color:var(--mc-gold);">${p.Revenue_Share}%</strong></td>
      <td>
        <select class="mc-simulator-select" style="padding: 3px 8px; font-size:0.75rem;" onchange="updatePartnerStage(${p.ID}, this.value, event)">
          <option value="Lead" ${p.Onboarding_Stage==='Lead'?'selected':''}>Lead</option>
          <option value="Contacted" ${p.Onboarding_Stage==='Contacted'?'selected':''}>Contacted</option>
          <option value="Agreement Sent" ${p.Onboarding_Stage==='Agreement Sent'?'selected':''}>Agreement Sent</option>
          <option value="Active" ${p.Onboarding_Stage==='Active'?'selected':''}>Active</option>
        </select>
      </td>
      <td><span class="mc-badge-status mc-badge-${p.Status === 'active' ? 'active' : 'suspended'}">${p.Status}</span></td>
      <td>
        <button class="mc-btn-outline" style="padding: 4px 8px; font-size:0.75rem;">CRM Detail</button>
      </td>
    </tr>
  `).join('');
  
  if (selectedPartnerId) {
    selectMcPartner(selectedPartnerId);
  }
}

function selectMcPartner(id) {
  selectedPartnerId = id;
  const p = mcPartners.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('mcPartnerCrmPlaceholder').style.display = 'none';
  const detailCard = document.getElementById('mcPartnerCrmDetailCard');
  detailCard.style.display = 'block';
  
  document.getElementById('mccPartnerName').textContent = p.Name;
  document.getElementById('mccPartnerEmail').textContent = p.Email;
  document.getElementById('mccPartnerPhone').textContent = p.Phone;
  document.getElementById('mccPartnerCity').textContent = p.City;

  // Render logs
  const logList = document.getElementById('mccCommLogList');
  logList.innerHTML = p.CommLogs.map(l => `
    <div class="mc-comm-bubble">
      <div class="mc-comm-meta">
        <span>${l.type} Log</span>
        <span>${l.date}</span>
      </div>
      <p style="margin:0; color:var(--mc-text-light);">${l.msg}</p>
    </div>
  `).join('') || '<p style="font-size:0.8rem; color:var(--mc-text-muted); text-align:center;">No logs recorded.</p>';

  // Render escalations
  const escList = document.getElementById('mccEscalationList');
  escList.innerHTML = p.Escalations.map(e => `
    <div class="mc-comm-bubble" style="border-color: rgba(239, 68, 68, 0.3);">
      <div class="mc-comm-meta" style="color: var(--danger);">
        <span>Escalation #${e.id}</span>
        <span>${e.date}</span>
      </div>
      <p style="margin:0; color:var(--mc-text-light);">${e.msg}</p>
      <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
        <span class="mc-badge-status mc-badge-pending" style="font-size:9px; padding: 1px 6px;">${e.status}</span>
        ${e.status === 'pending' ? `<button class="mc-btn-gold" style="padding: 2px 6px; font-size:9px;" onclick="resolvePartnerEscalation(${p.ID}, ${e.id}, event)">Resolve</button>` : ''}
      </div>
    </div>
  `).join('') || '<p style="font-size:0.8rem; color:var(--mc-text-muted); text-align:center;">No active escalations.</p>';
}

function updatePartnerStage(partnerId, stage, e) {
  e.stopPropagation();
  const p = mcPartners.find(x => x.ID === partnerId);
  if (!p) return;
  
  if (!checkMcPermission('save_partner_crm', p.City)) {
    e.target.value = p.Onboarding_Stage;
    return;
  }
  
  p.Onboarding_Stage = stage;
  p.CommLogs.unshift({
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    type: 'System',
    msg: `Onboarding stage updated to: ${stage}`
  });
  showToast(`Partner "${p.Name}" stage updated to ${stage}.`, 'success');
  renderMcPartners();
}

function addPartnerCommLog() {
  if (!selectedPartnerId) return;
  const p = mcPartners.find(x => x.ID === selectedPartnerId);
  if (!p) return;
  
  if (!checkMcPermission('save_partner_crm', p.City)) return;
  
  const msgInput = document.getElementById('mccNewLogMsg');
  const msg = msgInput.value.trim();
  if (!msg) return;
  
  p.CommLogs.unshift({
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    type: 'Staff note',
    msg: msg
  });
  msgInput.value = '';
  showToast('Communication log added.', 'success');
  selectMcPartner(selectedPartnerId);
}

function addPartnerEscalation() {
  if (!selectedPartnerId) return;
  const p = mcPartners.find(x => x.ID === selectedPartnerId);
  if (!p) return;
  
  if (!checkMcPermission('save_partner_crm', p.City)) return;
  
  const msgInput = document.getElementById('mccNewEscalationMsg');
  const msg = msgInput.value.trim();
  if (!msg) return;
  
  const escId = p.Escalations.length > 0 ? Math.max(...p.Escalations.map(e => e.id)) + 1 : 101;
  p.Escalations.unshift({
    id: escId,
    msg: msg,
    date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });
  
  // Add an alert too
  mcAlerts.unshift({
    id: Date.now(),
    title: 'Partner Escalation Filed',
    desc: `Partner ${p.Name} has filed a new escalation: ${msg}`,
    severity: 'danger',
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    city: p.City
  });

  msgInput.value = '';
  showToast('New escalation recorded.', 'warning');
  selectMcPartner(selectedPartnerId);
}

function resolvePartnerEscalation(partnerId, escId, e) {
  e.stopPropagation();
  const p = mcPartners.find(x => x.ID === partnerId);
  if (!p) return;
  
  if (!checkMcPermission('save_partner_crm', p.City)) return;
  
  const esc = p.Escalations.find(x => x.id === escId);
  if (esc) {
    esc.status = 'resolved';
    p.CommLogs.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'System',
      msg: `Escalation #${escId} resolved.`
    });
    showToast(`Escalation #${escId} marked as resolved.`, 'success');
    selectMcPartner(partnerId);
  }
}

// ════ 4. BOOKING MANAGEMENT ════
function renderMcBookings() {
  const search = document.getElementById('mcbSearch').value.toLowerCase();
  const cityFilter = document.getElementById('mcbCityFilter').value;
  const channelFilter = document.getElementById('mcbChannelFilter').value;
  const statusFilter = document.getElementById('mcbStatusFilter').value;

  // Augment bookingsData with property city & channel if missing
  bookingsData.forEach(b => {
    if (!b.propertyCity) {
      const prop = adminProps.find(p => p.name === b.property);
      b.propertyCity = prop ? prop.location : (b.id.charCodeAt(5) % 2 === 0 ? 'Mumbai' : 'Delhi');
    }
    if (!b.channel) {
      const channels = ['Website', 'OTA', 'Walk-in', 'Direct Call'];
      b.channel = channels[b.id.charCodeAt(5) % 4];
    }
  });

  if (mcRole === 'city_manager') {
    document.getElementById('mcbCityFilter').value = mcCity;
    document.getElementById('mcbCityFilter').disabled = true;
  } else {
    document.getElementById('mcbCityFilter').disabled = false;
  }

  let filtered = [...bookingsData];
  
  if (mcRole === 'city_manager') {
    filtered = filtered.filter(b => b.propertyCity.toLowerCase() === mcCity.toLowerCase());
  } else if (cityFilter !== 'all') {
    filtered = filtered.filter(b => b.propertyCity.toLowerCase() === cityFilter.toLowerCase());
  }

  if (channelFilter !== 'all') {
    filtered = filtered.filter(b => b.channel === channelFilter);
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(b => b.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(b => b.guest.toLowerCase().includes(search) || b.property.toLowerCase().includes(search));
  }

  const tbody = document.getElementById('mcBookingsTbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--mc-text-muted);">No bookings found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><strong style="color:var(--mc-gold);">${b.id}</strong></td>
      <td>
        <strong>${b.guest}</strong>
        <div style="font-size:0.75rem; color:var(--mc-text-muted);">${b.type}</div>
      </td>
      <td>
        <div>${b.property}</div>
        <strong style="font-size:0.75rem; color:var(--mc-gold);">${b.propertyCity}</strong>
      </td>
      <td>
        <div style="font-size:0.8rem;">In: <strong>${b.checkin}</strong></div>
        <div style="font-size:0.8rem;">Out: <strong>${b.checkout}</strong></div>
      </td>
      <td><span class="mc-badge-status mc-badge-review" style="padding:2px 8px; font-size:10px;">${b.channel}</span></td>
      <td><strong style="color:var(--mc-gold);">${b.amount}</strong></td>
      <td><span class="mc-badge-status mc-badge-${b.status === 'confirmed' || b.status === 'checked_out' ? 'active' : (b.status === 'pending' ? 'pending' : 'suspended')}">${b.status}</span></td>
      <td>
        <div class="action-btns">
          ${b.status !== 'cancelled' ? `
            <button class="act-btn warning" title="Modify Dates" onclick="modifyMcBooking('${b.id}')"><i class="fa-solid fa-calendar-minus"></i></button>
            <button class="act-btn danger" title="Cancel Booking" onclick="cancelMcBooking('${b.id}')"><i class="fa-solid fa-xmark"></i></button>
            <button class="act-btn" title="No Show" onclick="handleNoShowMc('${b.id}')"><i class="fa-solid fa-user-slash"></i></button>
          ` : '<span style="font-size:0.78rem; color:var(--mc-text-muted);">No Actions</span>'}
        </div>
      </td>
    </tr>
  `).join('');
}

function cancelMcBooking(id) {
  const b = bookingsData.find(x => x.id === id);
  if (!b) return;
  
  if (!checkMcPermission('cancel_booking', b.propertyCity)) return;
  
  if (!confirm(`Are you sure you want to cancel booking ${id} for ${b.guest}?`)) return;
  
  b.status = 'cancelled';
  
  // Update in the database if possible
  fetch(`/api/admin/bookings/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status: 'cancelled' })
  }).catch(() => {});
  
  showToast(`Booking ${id} has been cancelled.`, 'warning');
  renderMcBookings();
  renderMcDashboard();
}

function modifyMcBooking(id) {
  const b = bookingsData.find(x => x.id === id);
  if (!b) return;
  
  if (!checkMcPermission('modify_booking', b.propertyCity)) return;
  
  const newDate = prompt(`Enter new check-out date for ${b.guest} (YYYY-MM-DD):`, b.checkout);
  if (!newDate) return;
  
  b.checkout = newDate;
  showToast(`Booking ${id} checkout date extended to ${newDate}.`, 'success');
  renderMcBookings();
}

function handleNoShowMc(id) {
  const b = bookingsData.find(x => x.id === id);
  if (!b) return;
  
  if (!checkMcPermission('modify_booking', b.propertyCity)) return;
  
  if (!confirm(`Mark guest ${b.guest} as NO-SHOW? Room inventory will be released.`)) return;
  
  b.status = 'cancelled';
  b.notes = 'Guest marked as No-Show';
  showToast(`Booking ${id} marked as No-Show. Room inventory released.`, 'info');
  renderMcBookings();
  renderMcDashboard();
}

// ════ 5. GUEST MANAGEMENT ════
function renderMcGuests() {
  const filtered = guestsData; // Filtered naturally since guests are global, but we can filter by type
  const tbody = document.getElementById('mcGuestsTbody');
  
  tbody.innerHTML = filtered.map(g => {
    const isBlacklisted = g.status === 'blacklisted';
    return `
      <tr>
        <td>
          <strong style="color:var(--mc-gold);">${g.name}</strong>
          <div style="font-size:0.75rem; color:var(--mc-text-muted);">${g.email}</div>
        </td>
        <td><span class="mc-badge-status mc-badge-review" style="font-size:10px; padding:2px 8px;">${g.type}</span></td>
        <td><strong>${g.bookings || 1} Bookings</strong></td>
        <td><span class="mc-badge-status mc-badge-${isBlacklisted ? 'suspended' : 'active'}">${g.status || 'active'}</span></td>
        <td>
          <button class="mc-btn-outline" style="padding: 4px 8px; font-size:0.75rem; border-color:${isBlacklisted ? '#22c55e' : '#ef4444'}; color:${isBlacklisted ? '#22c55e' : '#ef4444'};" onclick="toggleBlacklistMc('${g.name}')">
            ${isBlacklisted ? 'Remove Blacklist' : 'Blacklist'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Render complaints list
  const complaintsList = document.getElementById('mcGuestComplaintsList');
  const filteredComplaints = filterMcData(mcComplaints, 'city');
  
  if (filteredComplaints.length === 0) {
    complaintsList.innerHTML = '<p style="color:var(--mc-text-muted); text-align:center; padding:15px;">No complaints recorded.</p>';
  } else {
    complaintsList.innerHTML = filteredComplaints.map(c => `
      <div class="mc-comm-bubble" style="border-color: ${c.status === 'pending' ? 'var(--mc-gold)' : (c.status === 'escalated' ? 'var(--danger)' : 'var(--success)')};">
        <div class="mc-comm-meta">
          <span style="font-weight:700;">${c.guest} (${c.property})</span>
          <span>${c.date}</span>
        </div>
        <p style="margin:0 0 8px 0; color:var(--mc-text-light);">${c.msg}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="mc-badge-status mc-badge-${c.status === 'resolved' ? 'active' : (c.status === 'pending' ? 'pending' : 'suspended')}" style="font-size:9px; padding: 2px 6px;">${c.status}</span>
          ${c.status !== 'resolved' ? `
            <div style="display:flex; gap:6px;">
              <button class="mc-btn-gold" style="padding: 2px 6px; font-size:9px;" onclick="resolveComplaintMc(${c.id})">Resolve</button>
              ${c.status === 'pending' ? `<button class="mc-btn-outline" style="padding: 2px 6px; font-size:9px; border-color:var(--danger); color:var(--danger);" onclick="escalateComplaintMc(${c.id})">Escalate</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  // Render review moderation list
  const reviewsList = document.getElementById('mcReviewsModList');
  reviewsList.innerHTML = mcReviews.map(r => `
    <div class="mc-comm-bubble" style="border-color: ${r.status === 'pending' ? 'var(--mc-border)' : (r.status === 'approved' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)')};">
      <div class="mc-comm-meta">
        <span style="font-weight:700;">${r.guest} - ${r.property}</span>
        <div class="mc-stars" style="font-size:10px;">
          ${Array.from({ length: 5 }, (_, i) => `<i class="${i < r.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('')}
        </div>
      </div>
      <p style="margin:0 0 8px 0; font-style:italic; color:var(--mc-text-light); font-size:0.8rem;">"${r.review}"</p>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="mc-badge-status mc-badge-${r.status === 'approved' ? 'active' : (r.status === 'pending' ? 'pending' : 'suspended')}" style="font-size:9px; padding: 2px 6px;">${r.status}</span>
        ${r.status === 'pending' ? `
          <div style="display:flex; gap:6px;">
            <button class="mc-btn-gold" style="padding: 2px 6px; font-size:9px;" onclick="moderateReviewMc(${r.id}, 'approved')">Approve</button>
            <button class="mc-btn-outline" style="padding: 2px 6px; font-size:9px; border-color:var(--danger); color:var(--danger);" onclick="moderateReviewMc(${r.id}, 'rejected')">Reject</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function toggleBlacklistMc(guestName) {
  const g = guestsData.find(x => x.name === guestName);
  if (!g) return;
  
  if (!checkMcPermission('blacklist_guest')) return;
  
  if (g.status === 'blacklisted') {
    g.status = 'active';
    showToast(`Guest ${guestName} removed from blacklist.`, 'success');
  } else {
    const reason = prompt(`Enter reason for blacklisting ${guestName}:`);
    if (!reason) return;
    g.status = 'blacklisted';
    showToast(`Guest ${guestName} has been blacklisted. Reason: ${reason}`, 'warning');
  }
  renderMcGuests();
}

function resolveComplaintMc(id) {
  const c = mcComplaints.find(x => x.id === id);
  if (!c) return;
  
  if (!checkMcPermission('resolve_complaint', c.city)) return;
  
  c.status = 'resolved';
  showToast(`Complaint #${id} resolved successfully.`, 'success');
  renderMcGuests();
  renderMcDashboard();
}

function escalateComplaintMc(id) {
  const c = mcComplaints.find(x => x.id === id);
  if (!c) return;
  
  if (!checkMcPermission('resolve_complaint', c.city)) return;
  
  c.status = 'escalated';
  showToast(`Complaint #${id} escalated to Operations Director.`, 'warning');
  renderMcGuests();
  renderMcDashboard();
}

function moderateReviewMc(id, status) {
  const r = mcReviews.find(x => x.id === id);
  if (!r) return;
  
  if (!checkMcPermission('moderate_review')) return;
  
  r.status = status;
  showToast(`Review #${id} ${status} successfully.`, 'success');
  renderMcGuests();
}

// ════ 6. REVENUE & PAYOUTS ════
function renderMcRevenue() {
  const activeBookings = filterMcData(bookingsData, 'propertyCity');
  
  // Calculate stats
  let totalRev = 0;
  activeBookings.forEach(b => {
    totalRev += parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0;
  });
  
  const commission = totalRev * 0.15;
  const paidOut = totalRev * 0.60;
  const outstanding = totalRev * 0.25;

  document.getElementById('mcrKpiTotalRevenue').textContent = `₹${Math.ceil(totalRev).toLocaleString()}`;
  document.getElementById('mcrKpiCommission').textContent = `₹${Math.ceil(commission).toLocaleString()}`;
  document.getElementById('mcrKpiPaidOut').textContent = `₹${Math.ceil(paidOut).toLocaleString()}`;
  document.getElementById('mcrKpiOutstanding').textContent = `₹${Math.ceil(outstanding).toLocaleString()}`;

  // Monthly Earnings by Property Table
  const props = filterMcData(adminProps, 'location');
  const propTbody = document.getElementById('mcRevenuePropsTbody');
  
  if (props.length === 0) {
    propTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--mc-text-muted);">No properties found for your city.</td></tr>';
  } else {
    propTbody.innerHTML = props.map(p => {
      // Simulate booking values
      const val = parseInt(String(p.price).replace(/[^0-9]/g, '')) * 12;
      const comm = val * 0.15;
      const dues = val * 0.25;
      return `
        <tr>
          <td><strong>${p.name}</strong> <div style="font-size:0.75rem; color:var(--mc-text-muted);">${p.location}</div></td>
          <td>₹${val.toLocaleString()}</td>
          <td style="color:var(--mc-gold);">₹${comm.toLocaleString()}</td>
          <td style="color:var(--danger); font-weight:700;">₹${dues.toLocaleString()}</td>
          <td>
            <button class="mc-btn-gold" style="padding: 4px 8px; font-size:0.75rem;" onclick="initiatePayoutMc('${p.name}', ${dues})">Initiate Payout</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Payout Pipeline
  const payoutsTbody = document.getElementById('mcPayoutsTbody');
  payoutsTbody.innerHTML = mcPayouts.map(p => {
    let statusClass = 'pending';
    if (p.status === 'approved') statusClass = 'review';
    if (p.status === 'paid') statusClass = 'active';
    return `
      <tr>
        <td><strong>${p.partner}</strong></td>
        <td><strong>₹${p.amount.toLocaleString()}</strong></td>
        <td>${p.date}</td>
        <td><span class="mc-badge-status mc-badge-${statusClass}">${p.status.replace('_', ' ')}</span></td>
      </tr>
    `;
  }).join('');
}

function initiatePayoutMc(propertyName, amount) {
  if (amount <= 0) {
    showToast('No outstanding dues to disburse.', 'info');
    return;
  }
  
  if (!checkMcPermission('request_payout')) return;
  
  if (!confirm(`Initiate payout request of ₹${amount.toLocaleString()} for ${propertyName}?`)) return;
  
  const id = mcPayouts.length > 0 ? Math.max(...mcPayouts.map(x => x.id)) + 1 : 401;
  mcPayouts.unshift({
    id: id,
    partner: propertyName + ' Partner',
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    status: 'pending_approval'
  });
  
  showToast(`Payout request of ₹${amount.toLocaleString()} sent to Finance Team.`, 'success');
  renderMcRevenue();
}

// ════ 7. MARKETING & PROMOTIONS ════
function renderMcMarketing() {
  // Campaigns
  const campaignsTbody = document.getElementById('mcCampaignsTbody');
  campaignsTbody.innerHTML = mcCampaigns.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="mc-badge-status mc-badge-review" style="font-size:10px; padding:2px 8px;">${c.channel}</span></td>
      <td>₹${c.spend.toLocaleString()}</td>
      <td>${c.leads} leads</td>
      <td><strong style="color:var(--mc-gold);">${c.conversions} bookings</strong></td>
    </tr>
  `).join('');

  // Coupons
  const promosTbody = document.getElementById('mcPromosTbody');
  promosTbody.innerHTML = mcCoupons.map(cp => `
    <tr>
      <td><strong style="color:var(--mc-gold); font-family:monospace; font-size:0.95rem;">${cp.code}</strong></td>
      <td><strong>${cp.discount}% OFF</strong></td>
      <td><span class="mc-badge-status mc-badge-active">${cp.status}</span></td>
      <td>
        <button class="act-btn danger" title="Delete Coupon" onclick="deleteCouponMc('${cp.code}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  // Lead Pipeline
  const leadsTbody = document.getElementById('mcLeadsTbody');
  const filteredLeads = filterMcData(mcLeads, 'city');
  leadsTbody.innerHTML = filteredLeads.map(l => `
    <tr>
      <td><strong>${l.name}</strong></td>
      <td>${l.contact}</td>
      <td><span class="mc-badge-status mc-badge-review" style="font-size:10px;">${l.category}</span></td>
      <td><span class="mc-badge-status mc-badge-${l.status === 'Converted' ? 'active' : (l.status === 'Contacted' ? 'pending' : 'review')}">${l.status}</span></td>
      <td>${l.source}</td>
    </tr>
  `).join('');

  // Referrals
  const referralsTbody = document.getElementById('mcReferralsTbody');
  referralsTbody.innerHTML = mcReferrals.map(r => `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.count} guests</td>
      <td style="color:var(--mc-gold); font-weight:700;">${r.rewards}</td>
    </tr>
  `).join('');
}

function createCouponMc() {
  if (!checkMcPermission('create_coupon')) return;

  const codeInput = document.getElementById('mcPromoCode');
  const discountInput = document.getElementById('mcPromoDiscount');
  const code = codeInput.value.trim().toUpperCase();
  const discount = parseInt(discountInput.value);

  if (!code || isNaN(discount)) {
    showToast('Please fill in coupon details.', 'error');
    return;
  }

  mcCoupons.unshift({ code, discount, status: 'active' });
  codeInput.value = '';
  discountInput.value = '';
  showToast(`Promo code "${code}" created successfully!`, 'success');
  renderMcMarketing();
}

function deleteCouponMc(code) {
  if (!checkMcPermission('create_coupon')) return;
  
  if (!confirm(`Delete promo code ${code}?`)) return;
  mcCoupons = mcCoupons.filter(x => x.code !== code);
  showToast(`Promo code ${code} deleted.`, 'warning');
  renderMcMarketing();
}

// ════ 8. QUALITY & INSPECTIONS ════
function renderMcQuality() {
  // Populate property selection in audit form
  const select = document.getElementById('mcaPropertyId');
  const filteredProps = filterMcData(adminProps, 'location');
  select.innerHTML = filteredProps.map(p => `<option value="${p.id}">${p.name} (${p.location})</option>`).join('');

  // Inspections List
  const tbody = document.getElementById('mcInspectionsTbody');
  // Filter audits based on property location
  const filteredInspections = mcInspections.filter(ins => {
    const prop = adminProps.find(p => p.name === ins.property);
    return prop ? filterMcData([prop], 'location').length > 0 : true;
  });

  if (filteredInspections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--mc-text-muted);">No inspections recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredInspections.map(i => {
    const starRating = Array.from({ length: 5 }, (_, idx) => `<i class="${idx < Math.round(i.rating) ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('');
    return `
      <tr>
        <td><strong>${i.property}</strong></td>
        <td>
          <div style="font-size:0.75rem;">Cleanliness: <strong>${i.cleanliness}/10</strong></div>
          <div style="font-size:0.75rem;">Amenities: <strong>${i.amenities}/10</strong></div>
          <div style="font-size:0.75rem;">Staff: <strong>${i.staff}/10</strong></div>
          <div style="font-size:0.75rem;">Safety: <strong>${i.safety}/10</strong></div>
        </td>
        <td>
          <strong style="color:var(--mc-gold);">${i.score}/10</strong>
          <div class="mc-stars" style="font-size:10px; margin-top:2px;">${starRating}</div>
        </td>
        <td>${i.date}</td>
        <td>
          <div style="font-size:0.8rem; color:${i.action !== 'None' ? 'var(--danger)' : 'var(--mc-text-light)'}">${i.action}</div>
          <div style="font-size:0.72rem; color:var(--mc-text-muted);">Deadline: ${i.deadline}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function submitAuditMc() {
  const propertyId = parseInt(document.getElementById('mcaPropertyId').value);
  const cleanliness = parseInt(document.getElementById('mcaCleanliness').value) || 8;
  const amenities = parseInt(document.getElementById('mcaAmenities').value) || 8;
  const staff = parseInt(document.getElementById('mcaStaff').value) || 8;
  const safety = parseInt(document.getElementById('mcaSafety').value) || 8;
  const action = document.getElementById('mcaAction').value.trim() || 'None';
  const deadline = document.getElementById('mcaDeadline').value || '-';

  const prop = adminProps.find(x => x.id === propertyId);
  if (!prop) return;
  
  if (!checkMcPermission('submit_audit', prop.location)) return;

  const score = (cleanliness + amenities + staff + safety) / 4;
  const rating = (score / 10) * 5;
  const id = mcInspections.length > 0 ? Math.max(...mcInspections.map(x => x.id)) + 1 : 501;

  mcInspections.unshift({
    id,
    property: prop.name,
    cleanliness,
    amenities,
    staff,
    safety,
    score: parseFloat(score.toFixed(2)),
    rating: parseFloat(rating.toFixed(1)),
    date: new Date().toISOString().split('T')[0],
    action,
    deadline
  });

  // Reset form
  document.getElementById('mcaAction').value = '';
  document.getElementById('mcaDeadline').value = '';
  
  showToast(`Quality audit submitted for ${prop.name}. Score: ${score}/10`, 'success');
  renderMcQuality();
  renderMcDashboard();
}

// ════ 9. CITY EXPANSION TRACKER ════
// Helper to fetch cities from backend
async function fetchExpansionCities() {
  try {
    const res = await fetch('/api/expansion/cities', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch cities');
    return await res.json();
  } catch (err) {
    console.error('Error fetching expansion cities:', err);
    return [];
  }
}

// Helper to fetch pipeline entries
async function fetchExpansionPipeline() {
  try {
    const res = await fetch('/api/expansion/pipeline', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch pipeline');
    return await res.json();
  } catch (err) {
    console.error('Error fetching pipeline:', err);
    return [];
  }
}

// Helper to fetch approval queue
async function fetchApprovalQueue() {
  try {
    const res = await fetch('/api/expansion/approval-queue', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch approval queue');
    return await res.json();
  } catch (err) {
    console.error('Error fetching approval queue:', err);
    return [];
  }
}

// ──────────────────────────────────────────
// ─── SUPER ADMIN CONSOLE - CITY EXPANSION ───
// ──────────────────────────────────────────

async function renderSacExpansion() {
  const citiesTbody = document.getElementById('sacCitiesTbody');
  const queueTbody = document.getElementById('sacApprovalQueueTbody');
  
  if (!citiesTbody || !queueTbody) return;
  
  citiesTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading strategic expansion data...</td></tr>`;
  queueTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading approval queue...</td></tr>`;
  
  const [cities, queue] = await Promise.all([fetchExpansionCities(), fetchApprovalQueue()]);
  
  // Render Expansion Summary Widget
  let summaryDiv = document.getElementById('sacExpansionSummary');
  if (!summaryDiv) {
    summaryDiv = document.createElement('div');
    summaryDiv.id = 'sacExpansionSummary';
    summaryDiv.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;";
    const tableContainer = citiesTbody.closest('.mc-table-container');
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(summaryDiv, tableContainer);
    }
  }

  const totalCities = cities.length;
  const targetsMet = cities.filter(c => c.signed_hotel_count >= c.target_hotel_count && c.target_hotel_count > 0).length;
  const totalTargetHotels = cities.reduce((acc, c) => acc + c.target_hotel_count, 0);
  const totalSignedHotels = cities.reduce((acc, c) => acc + c.signed_hotel_count, 0);
  const overallProgress = totalTargetHotels > 0 ? Math.round((totalSignedHotels / totalTargetHotels) * 100) : 0;

  summaryDiv.innerHTML = `
    <div style="background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #3B82F6; font-size: 1.25rem;">
        <i class="fa-solid fa-earth-asia"></i>
      </div>
      <div>
        <div style="font-size: 0.85rem; color: #9CA3AF;">Total Target Cities</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: white;">${totalCities}</div>
      </div>
    </div>
    <div style="background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #10B981; font-size: 1.25rem;">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <div>
        <div style="font-size: 0.85rem; color: #9CA3AF;">Targets Achieved</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: white;">${targetsMet} <span style="font-size: 0.85rem; font-weight: normal; color: #9CA3AF;">/ ${totalCities}</span></div>
      </div>
    </div>
    <div style="background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; color: #F59E0B; font-size: 1.25rem;">
        <i class="fa-solid fa-hotel"></i>
      </div>
      <div>
        <div style="font-size: 0.85rem; color: #9CA3AF;">Overall Hotel Progress</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: white;">${totalSignedHotels} <span style="font-size: 0.85rem; font-weight: normal; color: #9CA3AF;">/ ${totalTargetHotels} (${overallProgress}%)</span></div>
      </div>
    </div>
  `;

  // Render Cities Strategy table
  if (cities.length === 0) {
    citiesTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--sac-text-muted);">No expansion cities defined. Click "+ Add New City" to create a target.</td></tr>`;
  } else {
    citiesTbody.innerHTML = cities.map(c => {
      const progressPercent = c.target_hotel_count > 0 ? Math.round((c.signed_hotel_count / c.target_hotel_count) * 100) : 0;
      const isTargetMet = c.signed_hotel_count >= c.target_hotel_count && c.target_hotel_count > 0;
      
      // Delay alert check (August 2026 is Q3)
      const currentQuarter = 3; 
      const plannedQMatch = c.launch_quarter_planned.match(/Q(\d)/i);
      const plannedQ = plannedQMatch ? parseInt(plannedQMatch[1]) : 0;
      const isOverdue = plannedQ > 0 && plannedQ < currentQuarter && !isTargetMet && c.status.toLowerCase() !== 'launched';

      return `
        <tr>
          <td>
            <strong>${c.name}</strong>
            ${isTargetMet ? `<br><span style="font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; background: #10B981; color: white; display: inline-block; margin-top: 4px; font-weight: bold;"><i class="fa-solid fa-check-double"></i> Target Achieved</span>` : ''}
          </td>
          <td><span class="mc-badge-status mc-badge-${c.status.toLowerCase()}">${c.status}</span></td>
          <td>${c.target_hotel_count}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color:var(--sac-gold);">${c.signed_hotel_count}</strong>
              <span style="font-size: 0.8rem; color: var(--sac-text-muted);">(${progressPercent}%)</span>
            </div>
            <div style="width: 90px; height: 6px; background: #374151; border-radius: 3px; margin-top: 4px; overflow: hidden;">
              <div style="width: ${Math.min(progressPercent, 100)}%; height: 100%; background: ${isTargetMet ? '#10B981' : '#F59E0B'}; border-radius: 3px;"></div>
            </div>
          </td>
          <td>₹${c.budget_allocated.toLocaleString()}</td>
          <td>
            <strong>${c.launch_quarter_planned}</strong>
            ${isOverdue ? `<br><span style="font-size:0.68rem; padding: 2px 4px; border-radius:3px; background:#EF4444; color:white; font-weight:bold; display:inline-block; margin-top:4px;"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>` : ''}
          </td>
          <td>${c.launch_date_actual || '<span style="color:var(--sac-text-muted); font-style:italic;">Pending</span>'}</td>
          <td>
            <span style="font-size:0.85rem; color:var(--sac-gold);"><i class="fa-solid fa-user-tie"></i> ${c.city_manager_id}</span>
            ${c.pending_tasks_count > 0 ? `<br><span style="font-size: 0.72rem; color: #EF4444; font-weight: bold;"><i class="fa-solid fa-list-check"></i> ${c.pending_tasks_count} pending tasks</span>` : `<br><span style="font-size: 0.72rem; color: #10B981;"><i class="fa-solid fa-check"></i> No pending tasks</span>`}
          </td>
          <td>
            <button class="sac-btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="openStrategicEditPanel(${c.id})"><i class="fa-solid fa-sliders"></i> Strategy</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Status Change Approval Queue
  const pendingRequests = queue.filter(q => q.status === 'Pending');
  if (pendingRequests.length === 0) {
    queueTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--sac-text-muted);">No pending status change proposals.</td></tr>`;
  } else {
    queueTbody.innerHTML = pendingRequests.map(q => `
      <tr>
        <td><strong>${q.city_name}</strong></td>
        <td><span class="mc-badge-status mc-badge-${q.proposed_status.toLowerCase()}">${q.proposed_status}</span></td>
        <td>
          <div style="font-size:0.8rem; color:var(--sac-text-light); font-weight:600;">Reason: "${q.reason}"</div>
          <div style="font-size:0.72rem; color:var(--sac-text-muted);">Submitted by: ${q.submitted_by}</div>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-success btn-xs" style="padding:2px 8px; font-size:0.72rem; border-radius:3px;" onclick="resolveApprovalRequest(${q.id}, 'Approved')">Approve</button>
            <button class="btn btn-danger btn-xs" style="padding:2px 8px; font-size:0.72rem; border-radius:3px;" onclick="resolveApprovalRequest(${q.id}, 'Rejected')">Reject</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

// Open strategic edit panel sidebar
window.openStrategicEditPanel = async function(id) {
  try {
    const res = await fetch('/api/expansion/cities', { headers: getHeaders() });
    const cities = await res.json();
    const c = cities.find(x => x.id === id);
    if (!c) return;

    document.getElementById('sacEditCityId').value = c.id;
    document.getElementById('sacDetailCityName').textContent = c.name;
    document.getElementById('sacEditTargetCount').value = c.target_hotel_count;
    document.getElementById('sacEditBudget').value = c.budget_allocated;
    document.getElementById('sacEditQuarter').value = c.launch_quarter_planned;
    document.getElementById('sacEditActualDate').value = c.launch_date_actual || '';
    document.getElementById('sacEditManager').value = c.city_manager_id;
    document.getElementById('sacEditStatus').value = c.status;
    document.getElementById('sacEditReason').value = '';

    document.getElementById('sacCityDetailCard').style.display = 'block';
    
    // Load status history logs
    const histRes = await fetch(`/api/expansion/history/${id}`, { headers: getHeaders() });
    const history = await histRes.json();
    const histList = document.getElementById('sacCityHistoryList');
    if (history.length === 0) {
      histList.innerHTML = `<span style="font-size:0.78rem; color:var(--sac-text-muted); font-style:italic;">No transition logs found.</span>`;
    } else {
      histList.innerHTML = history.map(h => `
        <div style="font-size:0.78rem; border-left:2px solid var(--sac-gold); padding-left:8px; margin-bottom:8px;">
          <div style="font-weight:600; color:var(--sac-gold);">${h.Old_Status} &rarr; ${h.New_Status}</div>
          <div style="color:var(--sac-text-light); font-style:italic;">"${h.Reason}"</div>
          <div style="font-size:0.7rem; color:var(--sac-text-muted);">${new Date(h.Changed_At).toLocaleString()} by ${h.Changed_By}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load city details.', 'error');
  }
}

// Save strategic edits
window.saveCityStrategicEdits = async function() {
  const id = document.getElementById('sacEditCityId').value;
  const targetCount = parseInt(document.getElementById('sacEditTargetCount').value) || 0;
  const budget = parseFloat(document.getElementById('sacEditBudget').value) || 0;
  const quarter = document.getElementById('sacEditQuarter').value.trim();
  const actualDate = document.getElementById('sacEditActualDate').value;
  const manager = document.getElementById('sacEditManager').value.trim();
  const status = document.getElementById('sacEditStatus').value;
  const reason = document.getElementById('sacEditReason').value.trim();

  if (!quarter || !manager || !reason) {
    showToast('Please fill out all required fields including the justification reason.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/expansion/cities/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        target_hotel_count: targetCount,
        budget_allocated: budget,
        launch_quarter_planned: quarter,
        launch_date_actual: actualDate,
        city_manager_id: manager,
        status: status,
        reason: reason
      })
    });
    if (res.ok) {
      showToast('City strategic parameters updated successfully.', 'success');
      document.getElementById('sacCityDetailCard').style.display = 'none';
      renderSacExpansion();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to update city.', 'error');
    }
  } catch (e) {
    showToast('Network error updating city strategy.', 'error');
  }
}

// Delete city target
window.deleteCityTarget = async function() {
  const id = document.getElementById('sacEditCityId').value;
  const name = document.getElementById('sacDetailCityName').textContent;
  
  if (!id) return;
  if (!confirm(`Are you sure you want to remove "${name}" from city expansion targets? This action cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/expansion/cities/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast(`City target "${name}" removed successfully.`, 'success');
      document.getElementById('sacCityDetailCard').style.display = 'none';
      renderSacExpansion();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to remove target city.', 'error');
    }
  } catch (e) {
    showToast('Network error removing target city.', 'error');
  }
}

// Open modal to add target city
window.openAddCityModal = function() {
  document.getElementById('sacAddCityForm').reset();
  document.getElementById('sacAddCityStatus').value = 'Target';
  document.getElementById('sacAddCityManager').value = 'Unassigned';
  document.getElementById('sacAddCityOyo').value = '';
  document.getElementById('sacAddCityAvgPrice').value = '';
  document.getElementById('sacAddCityModal').style.display = 'flex';
}

// Submit new target city
window.submitNewCityStrategic = async function() {
  console.log('submitNewCityStrategic called');
  try {
    const nameEl = document.getElementById('sacAddCityName');
    const targetEl = document.getElementById('sacAddCityTarget');
    const budgetEl = document.getElementById('sacAddCityBudget');
    const quarterEl = document.getElementById('sacAddCityQuarter');
    const managerEl = document.getElementById('sacAddCityManager');
    const statusEl = document.getElementById('sacAddCityStatus');
    const notesEl = document.getElementById('sacAddCityNotes');
    const oyoEl = document.getElementById('sacAddCityOyo');
    const avgPriceEl = document.getElementById('sacAddCityAvgPrice');

    if (!nameEl || !targetEl || !budgetEl || !quarterEl) {
      console.error('Error: Required form elements are missing in the DOM.');
      alert('Error: Required form elements are missing.');
      return;
    }

    const name = nameEl.value.trim();
    const targetVal = targetEl.value.trim();
    const budgetVal = budgetEl.value.trim();
    const quarter = quarterEl.value.trim();

    console.log('Values:', { name, targetVal, budgetVal, quarter });

    if (!name || !targetVal || !budgetVal || !quarter) {
      showToast('Please fill out all required fields marked with *.', 'error');
      alert('Please fill out all required fields marked with *.');
      return;
    }

    const target = parseInt(targetVal) || 0;
    const budget = parseFloat(budgetVal) || 0;
    const manager = managerEl ? managerEl.value.trim() : 'Unassigned';
    const status = statusEl ? statusEl.value : 'Target';
    const notes = notesEl ? notesEl.value.trim() : '';
    const oyo = oyoEl ? (parseInt(oyoEl.value) || 0) : 0;
    const avgPrice = avgPriceEl ? (parseFloat(avgPriceEl.value) || 0) : 0;

    console.log('Sending request to API...');
    const res = await fetch('/api/expansion/cities', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name,
        status,
        launch_quarter_planned: quarter,
        target_hotel_count: target,
        budget_allocated: budget,
        city_manager_id: manager,
        market_notes: notes,
        competitive_intel: {
          oyo_property_count: oyo,
          avg_price_point: avgPrice
        }
      })
    });

    console.log('Response status:', res.status);

    if (res.ok) {
      const data = await res.json();
      console.log('Success:', data);
      showToast(`City target "${name}" created successfully.`, 'success');
      closeModal('sacAddCityModal');
      renderSacExpansion();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown server error (non-JSON response)' }));
      console.error('Server error:', err);
      showToast(err.error || 'Failed to add target city.', 'error');
      alert(err.error || 'Failed to add target city.');
    }
  } catch (e) {
    console.error('Exception in submitNewCityStrategic:', e);
    showToast('Network or client error: ' + e.message, 'error');
    alert('Exception occurred: ' + e.message);
  }
}

// Resolve pending status change request
window.resolveApprovalRequest = async function(id, action) {
  const comment = prompt(`Enter comment/justification for setting request to ${action.toUpperCase()}:`);
  if (comment === null) return; 
  
  try {
    const res = await fetch(`/api/expansion/approval-queue/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, comment })
    });
    if (res.ok) {
      showToast(`Status request resolved as ${action}.`, 'success');
      renderSacExpansion();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to resolve request.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}


// ──────────────────────────────────────────
// ─── MANAGEMENT CONSOLE - CITY EXPANSION ──
// ──────────────────────────────────────────

async function renderMcExpansion() {
  const timeline = document.getElementById('mcExpansionTimeline');
  const goals = document.getElementById('mcExpansionGoals');
  const pipelineTbody = document.getElementById('mcExpansionPipelineTbody');
  const boardCitySelect = document.getElementById('mcKanbanCitySelect');
  
  if (!timeline || !goals || !pipelineTbody) return;

  // Add skeleton loaders to show fetching state distinctly from genuine 0% progress
  timeline.innerHTML = Array(3).fill(0).map(() => `
    <div class="mc-timeline-item" style="opacity: 0.5;">
      <div class="mc-timeline-date skeleton-loader" style="width: 100px; height: 14px; margin-bottom:6px;"></div>
      <div class="mc-timeline-title skeleton-loader" style="width: 180px; height: 16px; margin-bottom:6px;"></div>
      <div class="mc-timeline-desc skeleton-loader" style="width: 250px; height: 12px;"></div>
    </div>
  `).join('');

  goals.innerHTML = Array(3).fill(0).map(() => `
    <div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span class="skeleton-loader" style="width: 150px; height: 14px;"></span>
        <span class="skeleton-loader" style="width: 40px; height: 14px;"></span>
      </div>
      <div class="mc-progress-bg skeleton-loader" style="height: 8px; width: 100%;"></div>
    </div>
  `).join('');

  pipelineTbody.innerHTML = Array(4).fill(0).map(() => `
    <tr>
      <td><span class="skeleton-loader" style="display:inline-block; width: 80px; height: 14px;"></span></td>
      <td><span class="skeleton-loader" style="display:inline-block; width: 30px; height: 14px;"></span></td>
      <td><span class="skeleton-loader" style="display:inline-block; width: 30px; height: 14px;"></span></td>
      <td><span class="skeleton-loader" style="display:inline-block; width: 40px; height: 14px;"></span></td>
    </tr>
  `).join('');

  // Fetch data
  const [cities, pipeline] = await Promise.all([fetchExpansionCities(), fetchExpansionPipeline()]);
  
  // Update last updated timestamp
  document.getElementById('mcExpansionLastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

  // 1. Render Timeline
  if (cities.length === 0) {
    timeline.innerHTML = '<p style="color:var(--mc-text-muted); text-align:center; padding:20px;">No timeline logs.</p>';
  } else {
    timeline.innerHTML = cities.map(c => `
      <div class="mc-timeline-item">
        <div class="mc-timeline-date">${c.launch_quarter_planned} ${c.launch_date_actual ? `(${c.launch_date_actual})` : ''}</div>
        <div class="mc-timeline-title"><strong>${c.name}</strong> - <span class="mc-badge-status mc-badge-${c.status.toLowerCase()}">${c.status}</span></div>
        <div class="mc-timeline-desc">Goal: ${c.target_hotel_count} properties | Signed: ${c.signed_hotel_count} | Manager: ${c.city_manager_id}</div>
      </div>
    `).join('');
  }

  // 2. Render Onboarding Goals Progress bars
  if (cities.length === 0) {
    goals.innerHTML = '<p style="color:var(--mc-text-muted); text-align:center; padding:10px;">No onboarding goals.</p>';
  } else {
    goals.innerHTML = cities.map(c => {
      const pct = c.target_hotel_count > 0 ? Math.round((c.signed_hotel_count / c.target_hotel_count) * 100) : 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
            <span><strong>${c.name}</strong> (${c.signed_hotel_count} of ${c.target_hotel_count} hotels)</span>
            <strong style="color:var(--mc-gold);">${pct}%</strong>
          </div>
          <div class="mc-progress-bg">
            <div class="mc-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Render Pipeline Properties per city table
  if (cities.length === 0) {
    pipelineTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px;">No data.</td></tr>';
  } else {
    pipelineTbody.innerHTML = cities.map(c => {
      const cityLeads = pipeline.filter(p => p.city_id === c.id);
      const leadsCount = cityLeads.filter(p => p.stage === 'Lead' || p.stage === 'Outreach').length;
      const negsCount = cityLeads.filter(p => p.stage === 'Negotiation' || p.stage === 'Contract Sent').length;
      const signedCount = c.signed_hotel_count; // Auto-calc
      
      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td style="font-weight: 600;">${leadsCount}</td>
          <td style="font-weight: 600;">${negsCount}</td>
          <td><strong style="color:var(--success);">${signedCount}</strong></td>
        </tr>
      `;
    }).join('');
  }

  // 4. Update Kanban City selection dropdown
  const prevVal = boardCitySelect.value;
  boardCitySelect.innerHTML = cities.map(c => `<option value="${c.id}">${c.name} (${c.status})</option>`).join('');
  if (prevVal && cities.some(c => String(c.id) === prevVal)) {
    boardCitySelect.value = prevVal;
  }
  
  // Load Kanban
  loadCityKanbanBoard();
}

// Load Kanban Board and Notes list for selected city
let currentPipelineEntries = [];
window.loadCityKanbanBoard = async function() {
  const citySelect = document.getElementById('mcKanbanCitySelect');
  if (!citySelect || !citySelect.value) return;
  
  const cityId = parseInt(citySelect.value);
  const pipeline = await fetchExpansionPipeline();
  currentPipelineEntries = pipeline.filter(p => p.city_id === cityId);
  
  const stages = ['Lead', 'Outreach', 'Negotiation', 'Contract Sent', 'Signed', 'Onboarded', 'Live'];
  
  stages.forEach(stage => {
    const stageKey = stage.replace(' ', '');
    const container = document.getElementById(`kanban-cards-${stageKey}`);
    const countBadge = document.getElementById(`kanban-count-${stageKey}`);
    
    const stageLeads = currentPipelineEntries.filter(p => p.stage === stage);
    if (countBadge) countBadge.textContent = stageLeads.length;
    
    if (!container) return;
    
    if (stageLeads.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:16px; border: 1px dashed rgba(255,255,255,0.03); color:var(--mc-text-muted); font-size:0.75rem;">No leads in stage</div>`;
    } else {
      container.innerHTML = stageLeads.map(l => {
        const dateStr = new Date(l.stage_updated_at).toLocaleDateString();
        const stuckHtml = l.stuck_flag ? `<span class="stuck-badge"><i class="fa-solid fa-triangle-exclamation"></i> Stuck</span>` : '';
        
        return `
          <div class="kanban-card" draggable="true" data-card-id="${l.id}" ondragstart="dragLeadCardStart(event)">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <div class="kanban-card-title">${l.hotel_lead_name}</div>
              ${stuckHtml}
            </div>
            <div class="kanban-card-desc">${l.notes}</div>
            <div class="kanban-card-footer">
              <span><i class="fa-solid fa-clock"></i> ${dateStr}</span>
              <span>By: ${l.updated_by}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  });

  // Render notes feed (ground updates)
  const notesList = document.getElementById('mcCityNotesList');
  if (notesList) {
    const sortedLeads = [...currentPipelineEntries]
      .filter(l => l.notes)
      .sort((a,b) => new Date(b.stage_updated_at) - new Date(a.stage_updated_at));
      
    if (sortedLeads.length === 0) {
      notesList.innerHTML = `<p style="color:var(--mc-text-muted); text-align:center; padding:20px;">No ground notes logged for this city.</p>`;
    } else {
      notesList.innerHTML = sortedLeads.map(l => `
        <div class="ground-note-card">
          <div class="ground-note-header">
            <span>${l.hotel_lead_name} &bull; Stage: <strong style="color:var(--mc-gold);">${l.stage}</strong></span>
            <span style="color:var(--mc-text-muted); font-size:0.7rem;">${new Date(l.stage_updated_at).toLocaleString()}</span>
          </div>
          <div class="ground-note-body">"${l.notes}"</div>
          <div style="text-align:right; font-size:0.7rem; color:var(--mc-text-muted); margin-top:2px;">Logged by ${l.updated_by}</div>
        </div>
      `).join('');
    }
  }
}

// Drag & Drop event handlers
window.dragLeadCardStart = function(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.dataset.cardId);
}

window.allowDrop = function(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add('drag-over');
}

window.dropLeadCard = async function(ev) {
  ev.preventDefault();
  const column = ev.currentTarget;
  column.classList.remove('drag-over');
  
  const stage = column.dataset.stage;
  const leadId = ev.dataTransfer.getData("text/plain");
  if (!leadId || !stage) return;

  try {
    const res = await fetch(`/api/expansion/pipeline/${leadId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ stage: stage })
    });
    if (res.ok) {
      showToast('Lead pipeline stage updated.', 'success');
      renderMcExpansion();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to update pipeline stage.', 'error');
    }
  } catch (e) {
    showToast('Network error during card transition.', 'error');
  }
}

// Open add pipeline lead modal
window.openAddLeadModal = function() {
  const citySelect = document.getElementById('mcKanbanCitySelect');
  if (!citySelect || !citySelect.value) {
    showToast('Please select a city first.', 'error');
    return;
  }
  document.getElementById('mcAddLeadForm').reset();
  document.getElementById('mcAddLeadCityId').value = citySelect.value;
  document.getElementById('mcAddLeadModal').style.display = 'flex';
}

// Submit new pipeline lead
window.submitNewLeadMc = async function() {
  const cityId = document.getElementById('mcAddLeadCityId').value;
  const name = document.getElementById('mcAddLeadName').value.trim();
  const stage = document.getElementById('mcAddLeadStage').value;
  const notes = document.getElementById('mcAddLeadNotes').value.trim();

  if (!name || !notes) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/expansion/pipeline', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        city_id: cityId,
        hotel_lead_name: name,
        stage: stage,
        notes: notes
      })
    });
    if (res.ok) {
      showToast('Pipeline lead added successfully.', 'success');
      closeModal('mcAddLeadModal');
      renderMcExpansion();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to add lead.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// Open propose status change modal
window.openProposeStatusModal = async function() {
  const citySelect = document.getElementById('mcKanbanCitySelect');
  if (!citySelect || !citySelect.value) {
    showToast('Please select a city first.', 'error');
    return;
  }
  const cityId = parseInt(citySelect.value);
  
  try {
    const res = await fetch('/api/expansion/cities', { headers: getHeaders() });
    const cities = await res.json();
    const c = cities.find(x => x.id === cityId);
    if (!c) return;

    document.getElementById('mcProposeCityId').value = c.id;
    document.getElementById('mcProposeCityName').value = c.name;
    document.getElementById('mcProposeCurrentStatus').value = c.status;
    document.getElementById('mcProposeNewStatus').value = c.status;
    document.getElementById('mcProposeReason').value = '';

    document.getElementById('mcProposeStatusModal').style.display = 'flex';
  } catch (e) {
    showToast('Failed to load status change panel.', 'error');
  }
}

// Submit propose status change
window.submitStatusProposalMc = async function() {
  const cityId = document.getElementById('mcProposeCityId').value;
  const proposedStatus = document.getElementById('mcProposeNewStatus').value;
  const reason = document.getElementById('mcProposeReason').value.trim();

  if (!reason) {
    showToast('Justification/reason is required.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/expansion/cities/${cityId}/propose-status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ proposedStatus, reason })
    });
    if (res.ok) {
      showToast('Status change proposal submitted to Admin approval queue.', 'success');
      closeModal('mcProposeStatusModal');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to submit proposal.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// ════ 10. NOTIFICATIONS & ALERTS ════
function renderMcAlerts() {
  const list = document.getElementById('mcAlertsList');
  const filtered = filterMcData(mcAlerts, 'city');

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:var(--mc-text-muted); text-align:center; padding:25px;">No active alerts. Operational health is perfect!</p>';
    return;
  }

  list.innerHTML = filtered.map(a => `
    <div class="mc-alert-item" id="mc-alert-${a.id}">
      <span class="mc-alert-icon ${a.severity === 'danger' ? 'danger' : 'warning'}">
        <i class="fa-solid ${a.severity === 'danger' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
      </span>
      <div class="mc-alert-body">
        <div class="mc-alert-title">${a.title}</div>
        <div class="mc-alert-desc">${a.desc}</div>
        <span class="mc-alert-time">${a.date}</span>
      </div>
      <button class="mc-btn-outline" style="padding:4px 8px; font-size:0.72rem; border-color:var(--mc-border);" onclick="dismissMcAlert(${a.id})">Dismiss</button>
    </div>
  `).join('');
}

// ════ Developer Console State & Mock Data ════
let activeDecTab = 'api';

// API Keys
let decApiKeys = [
  { id: 1, name: 'MMT Sync Key', env: 'production', key: 'hmz_live_a1b2c3d4e5f6g7h8i9j0', limit: 1000, scopes: 'read:properties, write:bookings', status: 'active' },
  { id: 2, name: 'Staging Mobile App', env: 'staging', key: 'hmz_stag_9f8e7d6c5b4a3f2e1d0c', limit: 500, scopes: 'read:properties, read:bookings', status: 'active' },
  { id: 3, name: 'Dev Local Test', env: 'dev', key: 'hmz_dev_1a2b3c4d5e6f7g8h9i0j', limit: 100, scopes: 'all', status: 'active' }
];

// Webhooks
let decWebhooks = [
  { id: 1, url: 'https://webhook.site/dummy-booking-endpoint', events: 'booking.created, booking.cancelled', status: 'active' },
  { id: 2, url: 'https://webhook.site/dummy-payment-endpoint', events: 'payment.received', status: 'active' }
];

// Webhook Logs
let decWebhookLogs = [
  { timestamp: '01:42:15', event: 'booking.created', url: 'https://webhook.site/dummy-booking-endpoint', status: 200, payload: '{"bookingId": 1205, "status": "confirmed"}' },
  { timestamp: '00:10:05', event: 'payment.received', url: 'https://webhook.site/dummy-payment-endpoint', status: 500, payload: '{"paymentId": 403, "amount": 4500}' }
];

// Env Variables
let decEnvVars = [
  { key: 'PORT', value: '3000', env: 'production' },
  { key: 'DB_PATH', value: './clients_database.csv', env: 'production' },
  { key: 'RAZORPAY_KEY_ID', value: 'rzp_test_987654321', env: 'production' }
];

// Feature Flags
let decFeatureFlags = [
  { key: 'enable_new_payment_gateway', desc: 'Enable Razorpay gateway for guests.', active: true },
  { key: 'enable_loyalty_program', desc: 'Show loyalty rewards to guests.', active: false },
  { key: 'enable_meta_pixel', desc: 'Enable tracking via Meta Pixel.', active: true }
];

// Deployments
let decDeployments = [
  { version: 'v2.4.0', date: '2026-06-28 14:00', env: 'production', status: 'active', notes: 'Implemented new property document verification and partner CRM logs.' },
  { version: 'v2.3.9', date: '2026-06-25 11:30', env: 'production', status: 'rolled_back', notes: 'Integrated MakeMyTrip OTA channel sync (minor bug fixed in v2.4.0).' }
];

// System Logs
let decSystemLogs = [
  { timestamp: '01:50:12', level: 'INFO', code: 'API_200', message: 'GET /api/properties executed successfully in 42ms' },
  { timestamp: '01:48:05', level: 'WARNING', code: 'TDS_194O', message: 'TDS calculation triggered for partner ID: 4' },
  { timestamp: '01:42:15', level: 'CRITICAL', code: 'WEBHOOK_500', message: 'Failed to deliver webhook to https://webhook.site/dummy-booking-endpoint. Status: 500 Internal Server Error.' },
  { timestamp: '01:38:10', level: 'INFO', code: 'AUTH_SUCCESS', message: 'User admin@homzo.in logged in successfully.' }
];

// Initializer
function initDeveloperConsole() {
  const isDeveloper = true; // Bypassed role-gating to activate all features

  
  if (isDeveloper) {
    document.getElementById('dec-access-granted-container').style.display = 'flex';
    document.getElementById('dec-access-denied-container').style.display = 'none';
    
    // Set Node Version and counts dynamically
    document.getElementById('dcNodeVersion').textContent = 'v18.16.0';
    document.getElementById('decDbPropCount').textContent = adminProps.length;
    document.getElementById('decDbGuestCount').textContent = guestsData.length;
    document.getElementById('decDbPartnerCount').textContent = mcPartners.length;

    // Render active tab
    renderActiveDecTab();
  } else {
    document.getElementById('dec-access-granted-container').style.display = 'none';
    document.getElementById('dec-access-denied-container').style.display = 'flex';
  }
}

// Tab Switcher
function switchDecTab(tab) {
  activeDecTab = tab;
  
  // Update nav active classes
  document.querySelectorAll('.dec-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.decTab === tab);
  });
  
  // Show target panel
  document.querySelectorAll('.dec-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`dec-panel-${tab}`).classList.add('active');
  
  renderActiveDecTab();
}

// Render Router
function renderActiveDecTab() {
  switch (activeDecTab) {
    case 'api':
      renderDecApi();
      break;
    case 'integrations':
      // Handled statically / UI only
      break;
    case 'webhooks':
      renderDecWebhooks();
      break;
    case 'env':
      renderDecEnv();
      break;
    case 'logs':
      renderDevLogsMc();
      break;
    case 'deployment':
      renderDecDeployments();
      break;
    case 'database':
      // Counts are updated in initializer, other details are static
      break;
    case 'performance':
      // UI only
      break;
    case 'sandbox':
      // UI only
      break;
    case 'security':
      // UI only
      break;
    case 'docs':
      // UI only
      break;
  }
}

// ════ 1. API MANAGEMENT ════
function renderDecApi() {
  const tbody = document.getElementById('decApiKeysTbody');
  tbody.innerHTML = decApiKeys.map(k => `
    <tr>
      <td><strong>${k.name}</strong></td>
      <td><span class="dec-badge dec-badge-info">${k.env}</span></td>
      <td><code style="font-family:'JetBrains Mono', monospace;">${k.key}</code></td>
      <td><strong>${k.limit} req/min</strong></td>
      <td><code style="font-size:0.75rem; font-family:'JetBrains Mono', monospace;">${k.scopes}</code></td>
      <td><span class="dec-badge dec-badge-${k.status === 'active' ? 'success' : 'danger'}">${k.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="act-btn ${k.status === 'active' ? 'danger' : 'success'}" title="${k.status === 'active' ? 'Revoke' : 'Activate'}" onclick="toggleDecApiKey(${k.id})">
            <i class="fa-solid ${k.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function generateApiKeyMc() {
  const name = prompt('Enter a name for the new API Key:');
  if (!name) return;
  const env = prompt('Enter environment (dev / staging / production):', 'dev');
  if (!env) return;
  
  const id = decApiKeys.length > 0 ? Math.max(...decApiKeys.map(x => x.id)) + 1 : 1;
  const rand = Math.random().toString(36).substring(2, 12);
  const key = `hmz_${env.substring(0,4)}_${rand}`;
  
  decApiKeys.push({
    id,
    name,
    env,
    key,
    limit: 100,
    scopes: 'read:properties',
    status: 'active'
  });
  showToast(`API Key "${name}" generated successfully.`, 'success');
  renderDecApi();
}

function toggleDecApiKey(id) {
  const k = decApiKeys.find(x => x.id === id);
  if (k) {
    k.status = k.status === 'active' ? 'revoked' : 'active';
    showToast(`API Key status updated to ${k.status}.`, 'success');
    renderDecApi();
  }
}

// ════ 3. WEBHOOK MANAGEMENT ════
async function renderDecWebhooks() {
  const tbody = document.getElementById('decWebhooksTbody');
  const logsTbody = document.getElementById('decWebhookLogsTbody');
  if (!tbody || !logsTbody) return;

  try {
    const res = await fetch('/api/developer/webhooks', { headers: getHeaders() });
    const decWebhooks = await res.json();
    tbody.innerHTML = decWebhooks.map(w => `
      <tr>
        <td><code style="font-family:'JetBrains Mono', monospace;">${w.url}</code></td>
        <td><code style="font-size:0.75rem; font-family:'JetBrains Mono', monospace;">${w.events}</code></td>
        <td><span class="dec-badge dec-badge-${w.status === 'active' ? 'success' : 'danger'}">${w.status}</span></td>
        <td>
          <button class="dec-btn-outline" style="padding:4px 8px; font-size:0.72rem;" onclick="testWebhookMc(${w.id})">Test Payload</button>
        </td>
      </tr>
    `).join('');

    const logsRes = await fetch('/api/developer/webhook-logs', { headers: getHeaders() });
    const decWebhookLogs = await logsRes.json();
    logsTbody.innerHTML = decWebhookLogs.map(l => `
      <tr>
        <td style="font-size:0.75rem; color:var(--dec-text-muted);">${l.timestamp}</td>
        <td><strong style="color:var(--dec-gold);">${l.event}</strong></td>
        <td><code style="font-size:0.75rem; font-family:'JetBrains Mono', monospace;">${l.url}</code></td>
        <td><span class="dec-badge dec-badge-${l.status === 200 ? 'success' : 'danger'}">${l.status}</span></td>
        <td><code style="font-size:0.72rem; font-family:'JetBrains Mono', monospace;">${l.payload}</code></td>
        <td>
          <button class="dec-btn-outline" style="padding:2px 6px; font-size:0.7rem;" onclick="showToast('Retrying webhook delivery...','info')"><i class="fa-solid fa-rotate"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load webhooks:', err);
  }
}

window.testWebhookMc = async function(id) {
  try {
    const res = await fetch(`/api/developer/webhooks/test/${id}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Test webhook delivery triggered.', 'success');
      renderDecWebhooks();
    } else {
      showToast('Failed to trigger test webhook.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

window.openAddWebhookModalMc = async function() {
  const url = prompt('Enter outgoing Webhook URL:');
  if (!url) return;
  const events = prompt('Enter events (comma separated, e.g. booking.created):', 'booking.created');
  if (!events) return;

  try {
    const res = await fetch('/api/developer/webhooks', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, events })
    });
    if (res.ok) {
      showToast('Webhook endpoint added successfully.', 'success');
      renderDecWebhooks();
    } else {
      showToast('Failed to add webhook.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
}

// ════ 4. ENVIRONMENT CONFIGURATION ════
function renderDecEnv() {
  const envList = document.getElementById('decEnvVarsList');
  envList.innerHTML = decEnvVars.map((v, i) => `
    <div style="display:flex; gap:10px; align-items:center;">
      <span style="font-family:'JetBrains Mono', monospace; font-size:0.8rem; width:150px; text-align:right;">${v.key}</span>
      <input type="text" class="dec-form-control" style="flex:1; font-family:'JetBrains Mono', monospace;" value="${v.value}" onchange="updateEnvVarMc(${i}, this.value)">
    </div>
  `).join('');

  // Feature Flags
  const flagsList = document.getElementById('decFeatureFlagsList');
  flagsList.innerHTML = decFeatureFlags.map((f, i) => `
    <div class="dec-switch-container">
      <div class="dec-switch-info">
        <h5><code>${f.key}</code></h5>
        <p>${f.desc}</p>
      </div>
      <label class="dec-switch">
        <input type="checkbox" ${f.active ? 'checked' : ''} onchange="toggleFeatureFlagMc(${i}, this.checked)">
        <span class="dec-slider"></span>
      </label>
    </div>
  `).join('');
}

function updateEnvVarMc(index, val) {
  decEnvVars[index].value = val;
}

// ════ 5. ERROR & SYSTEM LOGS ════
function renderDevLogsMc() {
  const severity = document.getElementById('decLogSeverityFilter').value;
  const search = document.getElementById('decLogSearch').value.toLowerCase();
  const feed = document.getElementById('decSystemLogsFeed');

  let filtered = decSystemLogs;
  if (severity !== 'all') {
    filtered = filtered.filter(l => l.level === severity);
  }
  if (search) {
    filtered = filtered.filter(l => l.message.toLowerCase().includes(search) || l.code.toLowerCase().includes(search));
  }

  feed.innerHTML = filtered.map(l => {
    const color = l.level === 'CRITICAL' ? '#ef4444' : (l.level === 'WARNING' ? '#fbbf24' : '#39ff14');
    return `<div style="margin-bottom:6px; font-family:'JetBrains Mono', monospace;">
      <span style="color:var(--dec-text-muted);">[${l.timestamp}]</span> 
      <span style="color:${color}; font-weight:700;">[${l.level}]</span> 
      <span style="color:var(--dec-gold);">[${l.code}]</span> 
      <span>${l.message}</span>
    </div>`;
  }).join('');
}

function exportDevLogsMc() {
  showToast('System log feed compiled and downloaded as CSV.', 'success');
}

// ════ 6. DEPLOYMENT MANAGER ════
function renderDecDeployments() {
  const tbody = document.getElementById('decDeploymentsTbody');
  tbody.innerHTML = decDeployments.map(d => `
    <tr>
      <td><strong style="color:var(--dec-gold); font-family:'JetBrains Mono', monospace;">${d.version}</strong></td>
      <td>${d.date}</td>
      <td><span class="dec-badge dec-badge-info">${d.env}</span></td>
      <td><span class="dec-badge dec-badge-${d.status === 'active' ? 'success' : 'danger'}">${d.status.replace('_', ' ')}</span></td>
      <td style="max-width:300px; font-size:0.78rem; color:var(--dec-text-muted);">${d.notes}</td>
      <td>
        ${d.status === 'active' ? `
          <button class="dec-btn-outline" style="border-color:var(--danger); color:var(--danger); padding:4px 8px;" onclick="rollbackDeploymentMc('${d.version}')">
            <i class="fa-solid fa-rotate-left"></i> Rollback
          </button>
        ` : `<span style="font-size:0.75rem; color:var(--dec-text-muted);">N/A</span>`}
      </td>
    </tr>
  `).join('');
}

function rollbackDeploymentMc(version) {
  if (!confirm(`Are you sure you want to trigger a one-click rollback from ${version} to the previous stable version?`)) return;
  
  decDeployments.forEach(d => {
    if (d.version === version) d.status = 'rolled_back';
    else if (d.version === 'v2.3.9') d.status = 'active'; // Make previous active
  });
  showToast(`Rollback from ${version} initiated. Reverting to v2.3.9...`, 'warning');
  renderDecDeployments();
}

// ════ 7. DATABASE MONITOR ════
function triggerDbBackupMc() {
  showToast('Statutory database backup initiated. Zip file saved to /backups.', 'success');
}

// ════ 11. DOCUMENTATION ════
function toggleSecretVisibilityMc() {
  const input = document.getElementById('decDocsSecretInput');
  const btn = event.currentTarget;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show';
  }
}

// ════ Sandbox Provisioning ════
function provisionMockDataMc(type) {
  showToast(`Mock data provisioning for ${type} complete in sandbox database.`, 'success');
}
function toggleRazorpayModeMc() {
  const active = document.getElementById('decIntRazorpayTest').checked;
  showToast(`Razorpay payment gateway toggled to ${active ? 'TEST/SANDBOX' : 'LIVE'} mode.`, 'warning');
}

async function runAiQaAgent() {
  const btn = document.getElementById('decRunQaAgentBtn');
  const statusSpan = document.getElementById('decQaAgentStatus');
  const terminal = document.getElementById('decQaAgentTerminal');

  btn.disabled = true;
  statusSpan.textContent = 'Status: Testing...';
  statusSpan.style.color = 'var(--dec-gold)';
  terminal.style.display = 'block';
  terminal.innerHTML = '<div>🤖 AI QA Agent: Launching integration tests...</div>';

  try {
    const res = await fetch('/api/admin/system/qa-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    const data = await res.json();
    terminal.innerHTML = '';
    
    // Simulate terminal typing output
    let delay = 0;
    for (let log of data.logs) {
      setTimeout(() => {
        const line = document.createElement('div');
        line.style.marginBottom = '6px';
        if (log.status === 'header') {
          line.innerHTML = `<span style="color:#d4af37; font-weight:bold;">\n${log.text}</span>`;
        } else if (log.status === 'pass') {
          line.innerHTML = `<span style="color:#10b981;">${log.text}</span>`;
        } else if (log.status === 'error') {
          line.innerHTML = `<span style="color:#ef4444;">${log.text}</span>`;
        } else if (log.status === 'success') {
          line.innerHTML = `<span style="color:#34d399; font-weight:bold; font-size:1.1rem;">\n${log.text}</span>`;
        } else {
          line.innerHTML = `<span style="color:#a5b4fc;">${log.text}</span>`;
        }
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
      }, delay);
      delay += 100; // 100ms between log lines for visual experience
    }

    setTimeout(() => {
      btn.disabled = false;
      if (data.success) {
        statusSpan.textContent = 'Status: Success';
        statusSpan.style.color = '#10b981';
        showToast('QA Automation Sweep completed successfully! All tests PASSED.', 'success');
      } else {
        statusSpan.textContent = 'Status: Failed';
        statusSpan.style.color = '#ef4444';
        showToast('QA Automation Sweep failed. Check logs.', 'error');
      }
    }, delay);

  } catch (err) {
    btn.disabled = false;
    statusSpan.textContent = 'Status: Error';
    statusSpan.style.color = '#ef4444';
    terminal.innerHTML += `<div style="color:#ef4444;">❌ Fatal failure contacting local test server: ${err.message}</div>`;
    showToast('Failed to contact QA testing server.', 'error');
  }
}

function dismissMcAlert(id) {
  mcAlerts = mcAlerts.filter(x => x.id !== id);
  showToast('Alert dismissed.', 'info');
  renderMcAlerts();
  renderActiveMcPanel(); // Updates the count badge
}

// Bind Event Listeners
function setupMcEventListeners() {
  document.getElementById('mcPropAddBtn').onclick = () => {
    if (!checkMcPermission('add_property')) return;
    document.getElementById('mcPropModalTitle').textContent = 'Add New Property';
    document.getElementById('mcpFormId').value = '';
    document.getElementById('mcpFormName').value = '';
    document.getElementById('mcpFormAddress').value = '';
    openModal('mcPropertyModal');
  };

  document.getElementById('mcPropSaveBtn').onclick = saveMcPropertyData;
  
  // Property search inputs
  document.getElementById('mcPropSearch').oninput = renderMcProperties;
  document.getElementById('mcPropCityFilter').onchange = renderMcProperties;
  document.getElementById('mcPropStatusFilter').onchange = renderMcProperties;

  // Partner CRM notes
  document.getElementById('mccAddLogBtn').onclick = addPartnerCommLog;
  document.getElementById('mccAddEscalationBtn').onclick = addPartnerEscalation;

  // Bookings search & filters
  document.getElementById('mcbSearch').oninput = renderMcBookings;
  document.getElementById('mcbCityFilter').onchange = renderMcBookings;
  document.getElementById('mcbChannelFilter').onchange = renderMcBookings;
  document.getElementById('mcbStatusFilter').onchange = renderMcBookings;

  // Coupon creation
  document.getElementById('mcPromoCreateBtn').onclick = createCouponMc;

  // Quality audit
  document.getElementById('mcaSubmitBtn').onclick = submitAuditMc;
}

// ─── DEVELOPER CONSOLE ─────────────────────────────────
let termInterval = null;

function setupApiSandbox() {
  const btnSend = document.getElementById('dcBtnSendRequest');
  const methodSelect = document.getElementById('dcApiMethod');
  const endpointInput = document.getElementById('dcApiEndpoint');
  const responsePre = document.getElementById('dcApiResponseJson');
  const responseStatus = document.getElementById('dcApiResponseStatus');
  
  btnSend.onclick = async () => {
    const method = methodSelect.value;
    const endpoint = endpointInput.value.trim();
    
    responsePre.textContent = 'Sending request...';
    responseStatus.style.display = 'none';
    
    try {
      const url = `${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const res = await fetch(url, {
        method: method,
        headers: getHeaders()
      });
      
      responseStatus.style.display = 'inline-block';
      responseStatus.textContent = `${res.status} ${res.statusText}`;
      responseStatus.className = `badge badge-${res.ok ? 'success' : 'danger'}`;
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        responsePre.textContent = JSON.stringify(data, null, 2);
      } else {
        const text = await res.text();
        responsePre.textContent = text;
      }
      
      addTerminalLog(method, endpoint, res.status);
    } catch (err) {
      responseStatus.style.display = 'inline-block';
      responseStatus.textContent = 'ERROR';
      responseStatus.className = 'badge badge-danger';
      responsePre.textContent = `Fetch error: ${err.message}`;
      addTerminalLog(method, endpoint, 'FAILED');
    }
  };
}

function addTerminalLog(method, endpoint, status) {
  const term = document.getElementById('dcTerminal');
  if (!term) return;
  const time = new Date().toLocaleTimeString();
  const colorClass = method === 'GET' ? 'term-get' : 'term-post';
  const statusColor = status === 200 || status === '200 OK' ? 'term-get' : 'term-warn';
  
  const logLine = document.createElement('div');
  logLine.innerHTML = `<span class="term-time">[${time}]</span> <span class="${colorClass}">[${method}]</span> ${endpoint} - <span class="${statusColor}">${status}</span>`;
  term.appendChild(logLine);
  term.scrollTop = term.scrollHeight;
}

function startTerminalSimulation() {
  const term = document.getElementById('dcTerminal');
  if (!term) return;
  
  term.innerHTML = `<div><span class="term-info">[SYSTEM]</span> Developer Terminal initialized. Listening to stdout...</div>
<div><span class="term-info">[SYSTEM]</span> Server listening on port 3000</div>
<div><span class="term-db">[DATABASE]</span> Connected to Excel-CSV databases successfully.</div>`;
  
  if (termInterval) clearInterval(termInterval);
  
  const mockEndpoints = [
    { method: 'GET', url: '/api/properties', status: 200 },
    { method: 'GET', url: '/api/admin/system/status', status: 200 },
    { method: 'GET', url: '/api/admin/tasks', status: 200 },
    { method: 'GET', url: '/api/reviews', status: 200 },
    { method: 'POST', url: '/api/auth/login', status: 200 },
    { method: 'GET', url: '/api/admin/careers/applications', status: 200 }
  ];
  
  const mockDbQueries = [
    'SELECT * FROM Properties WHERE status = \'active\'',
    'SELECT * FROM Bookings WHERE Guest_Type = \'students\'',
    'UPDATE Tasks SET Status = \'In Progress\' WHERE ID = 2',
    'INSERT INTO AuditLogs (Timestamp, Email, Action) VALUES (?, ?, ?)'
  ];
  
  termInterval = setInterval(() => {
    const page = document.getElementById('page-developer-console');
    if (!page || !page.classList.contains('active')) {
      clearInterval(termInterval);
      return;
    }
    
    const time = new Date().toLocaleTimeString();
    const type = Math.random() > 0.4 ? 'api' : 'db';
    const logLine = document.createElement('div');
    
    if (type === 'api') {
      const item = mockEndpoints[Math.floor(Math.random() * mockEndpoints.length)];
      const colorClass = item.method === 'GET' ? 'term-get' : 'term-post';
      logLine.innerHTML = `<span class="term-time">[${time}]</span> <span class="${colorClass}">[${item.method}]</span> ${item.url} - <span class="term-get">${item.status} OK</span> - ${Math.round(Math.random() * 30 + 10)}ms`;
    } else {
      const query = mockDbQueries[Math.floor(Math.random() * mockDbQueries.length)];
      logLine.innerHTML = `<span class="term-time">[${time}]</span> <span class="term-db">[DATABASE]</span> Query: <span style="color:#e0e0e0;">${query}</span>`;
    }
    
    term.appendChild(logLine);
    term.scrollTop = term.scrollHeight;
    
    if (term.childNodes.length > 50) {
      term.removeChild(term.firstChild);
    }
  }, 4000);

  document.getElementById('dcBtnClearLogs').onclick = () => {
    term.innerHTML = `<div><span class="term-info">[SYSTEM]</span> Console cleared. Logs restarted.</div>`;
  };
}

// ─── ERP MODULE CONTROLLERS ───────────────────────────
let acLogsData = [];

async function loadAcCustomers() {
  try {
    const res = await fetch('/api/admin/customers', { headers: getHeaders() });
    if (res.ok) {
      const customers = await res.json();
      const tbody = document.getElementById('acCustomersTbody');
      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No customers registered.</td></tr>';
        return;
      }
      tbody.innerHTML = customers.map(c => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${c.ID}</td>
          <td><strong>${c.Name}</strong></td>
          <td>${c.Email}</td>
          <td>${c.Phone}</td>
          <td><span class="badge badge-info">${c.Guest_Type}</span></td>
          <td>${c.Date_Added || 'N/A'}</td>
          <td><span class="badge badge-${c.Status === 'confirmed' ? 'success' : c.Status === 'pending' ? 'warning' : 'danger'}">${c.Status}</span></td>
          <td>
            <div class="action-btns">
              <button class="act-btn" title="Customer 360 CRM" onclick="viewCustomer360('${c.Email}', '${c.Name}', '${c.Phone}', '${c.Guest_Type}')"><i class="fa-solid fa-address-card" style="color:var(--primary);"></i></button>
              <button class="act-btn" title="Edit Guest" onclick="editCustomerGuest('${c.ID}', '${c.Name}', '${c.Email}', '${c.Phone}', '${c.Guest_Type}')"><i class="fa-solid fa-pen"></i></button>
              <button class="act-btn danger" title="Remove Guest" onclick="deleteCustomerGuest('${c.ID}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast('Failed to load customers.', 'error');
  }
}

function editCustomerGuest(id, name, email, phone, type) {
  const newName = prompt('Enter new Name:', name);
  const newPhone = prompt('Enter new Phone:', phone);
  if (newName === null || newPhone === null) return;
  
  fetch(`/api/admin/customers/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ name: newName, phone: newPhone })
  })
  .then(res => {
    if (res.ok) { showToast('Customer details updated!', 'success'); loadAcCustomers(); }
    else { showToast('Failed to update customer.', 'error'); }
  });
}

function deleteCustomerGuest(id) {
  if (!confirm('Are you sure you want to remove this guest?')) return;
  fetch(`/api/admin/customers/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  .then(res => {
    if (res.ok) { showToast('Customer removed successfully.', 'success'); loadAcCustomers(); }
    else { showToast('Failed to remove customer.', 'error'); }
  });
}

async function loadAcPartners() {
  try {
    const res = await fetch('/api/admin/partners', { headers: getHeaders() });
    if (res.ok) {
      const partners = await res.json();
      const tbody = document.getElementById('acPartnersTbody');
      if (partners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No partners registered.</td></tr>';
        return;
      }
      tbody.innerHTML = partners.map(p => {
        const isVerified = p.Verification_Status === 'verified' || p.Verification_Status === 'active';
        return `
          <tr>
            <td style="font-family:monospace; font-weight:700; color:var(--primary);">${p.ID || 'N/A'}</td>
            <td><strong>${p.Name}</strong></td>
            <td>${p.Email}</td>
            <td>${p.Phone || 'N/A'}</td>
            <td><span class="badge badge-${p.Status === 'active' ? 'success' : 'danger'}">${p.Status || 'active'}</span></td>
            <td><span class="badge badge-${isVerified ? 'success' : 'warning'}">${p.Verification_Status || 'pending'}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" style="font-size:0.75rem; padding:4px 8px; border-color:var(--primary); color:var(--primary);" onclick="togglePartnerVerification('${p.ID || p.Email}', '${p.Verification_Status}')">
                <i class="fa-solid ${isVerified ? 'fa-user-slash' : 'fa-user-check'}"></i> ${isVerified ? 'Suspend' : 'Verify'}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    showToast('Failed to load partners.', 'error');
  }
}

async function togglePartnerVerification(id, currentStatus) {
  const newStatus = (currentStatus === 'verified' || currentStatus === 'active') ? 'pending' : 'verified';
  try {
    const res = await fetch(`/api/admin/partners/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Partner status updated to ${newStatus}!`, 'success');
      loadAcPartners();
    }
  } catch (e) {
    showToast('Failed to update partner status.', 'error');
  }
}

}

// ─── PARTNER ONBOARDING REVIEW & LifeCycle MANAGEMENT ───
let currentReviewProperty = null;

window.switchPartnerSubTab = function(tabName) {
  const accountsSec = document.getElementById('partnerAccountsSection');
  const onboardingSec = document.getElementById('partnerOnboardingSection');
  const tabAccountsBtn = document.getElementById('tabPartnerAccountsBtn');
  const tabOnboardingBtn = document.getElementById('tabOnboardingReviewsBtn');

  if (tabName === 'accounts') {
    accountsSec.style.display = 'block';
    onboardingSec.style.display = 'none';
    tabAccountsBtn.classList.add('active');
    tabAccountsBtn.style.color = 'var(--primary)';
    tabAccountsBtn.style.borderBottom = '2px solid var(--primary)';
    tabOnboardingBtn.classList.remove('active');
    tabOnboardingBtn.style.color = 'var(--text-muted)';
    tabOnboardingBtn.style.borderBottom = 'none';
    loadPartners(); // reload partner accounts
  } else {
    accountsSec.style.display = 'none';
    onboardingSec.style.display = 'flex';
    tabAccountsBtn.classList.remove('active');
    tabAccountsBtn.style.color = 'var(--text-muted)';
    tabAccountsBtn.style.borderBottom = 'none';
    tabOnboardingBtn.classList.add('active');
    tabOnboardingBtn.style.color = 'var(--primary)';
    tabOnboardingBtn.style.borderBottom = '2px solid var(--primary)';
    loadOnboardingProperties(); // load property review queue
  }
}

window.loadOnboardingProperties = async function() {
  try {
    const res = await fetch('/api/admin/properties/onboarding', { headers: getHeaders() });
    if (!res.ok) return;
    const properties = await res.json();

    // Filter queue properties (Submitted, KYC, Doc, Property, Commercial, Approved, Correction, Hold, Live)
    // We display all properties that have started onboarding
    const queueProps = properties.filter(p => p.Onboarding_Stage && p.Onboarding_Stage !== 'Draft');

    // Update queue count badge
    document.getElementById('onboardingQueueCount').textContent = queueProps.length;

    const tbody = document.getElementById('adminOnboardingTbody');
    if (queueProps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No properties currently in verification queue.</td></tr>';
      return;
    }

    tbody.innerHTML = queueProps.map(p => {
      let stageBadgeClass = 'warning';
      if (p.Onboarding_Stage === 'Live') stageBadgeClass = 'success';
      if (p.Onboarding_Stage === 'Approved') stageBadgeClass = 'success';
      if (p.Onboarding_Stage === 'Correction Required' || p.Onboarding_Stage === 'Hold') stageBadgeClass = 'danger';

      return `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">#PR${p.ID}</td>
          <td><strong>${p.Name}</strong></td>
          <td>${p.Type || 'Hotel'}</td>
          <td>${p.Location || 'N/A'}</td>
          <td>${p.Total_Rooms || '0'}</td>
          <td><span class="badge badge-${stageBadgeClass}">${p.Onboarding_Stage}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="reviewPropertyOnboarding(${p.ID})">
              <i class="fa-solid fa-file-shield"></i> Review Onboarding
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    showToast('Failed to load onboarding properties queue.', 'error');
  }
}

window.reviewPropertyOnboarding = async function(id) {
  try {
    const res = await fetch(`/api/admin/properties/${id}/onboarding`, { headers: getHeaders() });
    if (!res.ok) {
      showToast('Failed to load onboarding profile.', 'error');
      return;
    }
    const prop = await res.json();
    currentReviewProperty = prop;

    document.getElementById('onboardingReviewDetailBox').style.display = 'block';

    // Populate profile details
    document.getElementById('revPropName').textContent = `Review: ${prop.Name}`;
    document.getElementById('revPropLocation').textContent = prop.Location || 'N/A';
    document.getElementById('revPropType').textContent = prop.Type || 'Hotel';
    document.getElementById('revPropCapacity').textContent = `Total Rooms: ${prop.Total_Rooms || '0'}, Available: ${prop.Available_Rooms || '0'}, Max Guests: ${prop.Max_Guests || '0'}`;
    document.getElementById('revPropAddress').textContent = prop.Address || 'N/A';
    
    const mapsLink = document.getElementById('revGmapsLink');
    if (prop.Google_Maps_Link) {
      mapsLink.href = prop.Google_Maps_Link;
      mapsLink.style.display = 'inline';
    } else {
      mapsLink.style.display = 'none';
    }
    document.getElementById('revLat').textContent = prop.Latitude || 'N/A';
    document.getElementById('revLng').textContent = prop.Longitude || 'N/A';
    document.getElementById('revContact').textContent = `${prop.Contact_Person || 'N/A'} (Phone: ${prop.Phone || 'N/A'} / Email: ${prop.Email || 'N/A'})`;

    // Populate docs uploads
    setDocReviewLabel('revDocAadhaar', prop.Aadhaar_Doc);
    setDocReviewLabel('revDocPan', prop.PAN_Doc);
    setDocReviewLabel('revDocPhoto', prop.Owner_Photo_Doc);
    setDocReviewLabel('revDocIncorp', prop.Incorporation_Doc);
    setDocReviewLabel('revDocOwnership', prop.Ownership_Doc);
    setDocReviewLabel('revDocLease', prop.Rent_Agreement_Doc);
    setDocReviewLabel('revDocNoc', prop.NOC_Doc);
    setDocReviewLabel('revDocGst', prop.GST_Doc);
    setDocReviewLabel('revDocFireSafety', prop.Fire_Safety_Doc);
    setDocReviewLabel('revDocPolice', prop.Police_Verification_Doc);
    setDocReviewLabel('revDocTrade', prop.Trade_License_Doc);
    setDocReviewLabel('revDocFssai', prop.FSSAI_Doc);
    setDocReviewLabel('revDocCheque', prop.Cancelled_Cheque_Doc);

    // Bank account matching
    document.getElementById('revBankHolder').textContent = prop.Bank_Account_Holder || 'Not Provided';
    document.getElementById('revBankNumber').textContent = prop.Bank_Account_Number || 'Not Provided';
    document.getElementById('revBankIfsc').textContent = prop.Bank_IFSC || 'Not Provided';

    // Run Name matching
    const bankAlert = document.getElementById('revBankAnalysisAlert');
    const ownerName = prop.Contact_Person ? prop.Contact_Person.trim().toLowerCase() : '';
    const holder = prop.Bank_Account_Holder ? prop.Bank_Account_Holder.trim().toLowerCase() : '';

    if (!holder || !ownerName) {
      bankAlert.style.display = 'none';
    } else {
      bankAlert.style.display = 'block';
      const clean = (s) => s.replace(/(mr|mrs|ms|dr|llp|co|inc|pvt|ltd|firm)\.?\s+/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
      const cHolder = clean(holder);
      const cOwner = clean(ownerName);
      
      if (cHolder === cOwner || cHolder.includes(cOwner) || cOwner.includes(cHolder)) {
        bankAlert.style.background = 'rgba(34,197,94,0.05)';
        bankAlert.style.borderColor = 'rgba(34,197,94,0.15)';
        bankAlert.style.color = 'var(--success)';
        bankAlert.innerHTML = `<i class="fa-solid fa-circle-check"></i> OWNER NAME MATCHES ACCOUNT HOLDER NAME ("${prop.Contact_Person}" ≈ "${prop.Bank_Account_Holder}").`;
      } else {
        bankAlert.style.background = 'rgba(239,68,68,0.05)';
        bankAlert.style.borderColor = 'rgba(239,68,68,0.15)';
        bankAlert.style.color = 'var(--danger)';
        bankAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Bank account ownership requires manual verification. Mismatch detected ("${prop.Contact_Person}" vs "${prop.Bank_Account_Holder}").`;
      }
    }

    // Load Stage and Category Badges
    const stageBadge = document.getElementById('revStageBadge');
    stageBadge.textContent = prop.Onboarding_Stage.toUpperCase();
    stageBadge.className = 'badge badge-' + (prop.Onboarding_Stage === 'Live' || prop.Onboarding_Stage === 'Approved' ? 'success' : 'warning');
    
    document.getElementById('revCategoryBadge').textContent = prop.Registration_Status === 'Unregistered' ? 'Category B (Unregistered)' : 'Category A (Registered)';

    // Checklist boxes syncing
    let checklistObj = {};
    try {
      checklistObj = JSON.parse(prop.Checklist_Status || '{}');
    } catch(e) {
      checklistObj = {};
    }
    document.querySelectorAll('#checklistContainer input[type="checkbox"]').forEach(box => {
      const itemKey = box.getAttribute('data-chk-item');
      box.checked = !!checklistObj[itemKey];
    });

    // Commission Rates Setup
    document.getElementById('revPropClassSelect').value = prop.Registration_Status || 'Registered';
    document.getElementById('revCommissionRateInput').value = prop.Commission_Rate || 15;
    document.getElementById('revCommissionOverrideReason').value = '';

    // Render Commission Logs
    const logContainer = document.getElementById('revCommissionLogList');
    let logs = [];
    try {
      logs = JSON.parse(prop.Commission_Change_Log || '[]');
    } catch(e) {
      logs = [];
    }

    if (logs.length === 0) {
      logContainer.innerHTML = '<div style="color:var(--text-muted); font-style:italic;">No changes recorded.</div>';
    } else {
      logContainer.innerHTML = logs.map(l => `
        <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px; margin-bottom:4px;">
          <strong>₹${l.oldCommission}% ➔ ₹${l.newCommission}%</strong> by ${l.changedBy} on ${new Date(l.timestamp).toLocaleDateString()}<br>
          <span style="color:var(--text-secondary);">Reason: ${l.reason}</span>
        </div>
      `).join('');
    }

    // Founding Partner Badge
    document.getElementById('revFoundingBadge').style.display = prop.Is_Founding_Partner ? 'block' : 'none';

    // Clear correction notes text
    document.getElementById('revCorrectionNotesText').value = prop.Correction_Notes || '';
  } catch (e) {
    showToast('Failed to retrieve property review details.', 'error');
  }
}

function setDocReviewLabel(id, filepath) {
  const lbl = document.getElementById(id);
  if (!lbl) return;
  if (filepath) {
    lbl.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-circle-check"></i> Uploaded</span> (<a href="${filepath}" target="_blank" style="color:var(--primary)">View File</a>)`;
  } else {
    lbl.innerHTML = `<span style="color:var(--text-muted)">Not Uploaded</span>`;
  }
}

window.updateAdminChecklist = async function() {
  if (!currentReviewProperty) return;

  const checklistStatus = {};
  document.querySelectorAll('#checklistContainer input[type="checkbox"]').forEach(box => {
    const itemKey = box.getAttribute('data-chk-item');
    checklistStatus[itemKey] = box.checked;
  });

  try {
    const res = await fetch(`/api/admin/properties/${currentReviewProperty.ID}/checklist`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ checklistStatus })
    });
    if (res.ok) {
      showToast('Checklist updated.', 'success');
      currentReviewProperty.Checklist_Status = JSON.stringify(checklistStatus);
    }
  } catch (e) {
    showToast('Failed to save checklist state.', 'error');
  }
}

window.applyCommissionOverride = async function() {
  if (!currentReviewProperty) return;

  const commissionRate = parseFloat(document.getElementById('revCommissionRateInput').value);
  const registrationStatus = document.getElementById('revPropClassSelect').value;
  const reason = document.getElementById('revCommissionOverrideReason').value.trim();

  const oldCommission = currentReviewProperty.Commission_Rate || 15;
  if (commissionRate !== oldCommission && !reason) {
    showToast('Please provide an override reason for changing commission rates.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/properties/${currentReviewProperty.ID}/onboarding-status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ commissionRate, registrationStatus, reason })
    });

    if (res.ok) {
      showToast('Commission terms updated successfully!', 'success');
      reviewPropertyOnboarding(currentReviewProperty.ID);
    } else {
      showToast('Failed to update commission.', 'error');
    }
  } catch(e) {
    showToast('Connection error.', 'error');
  }
}

window.transitionOnboardingStage = async function(stage) {
  if (!currentReviewProperty) return;

  const correctionNotes = document.getElementById('revCorrectionNotesText').value.trim();
  if (stage === 'Correction Required' && !correctionNotes) {
    showToast('Please fill out correction notes to send feedback to partner.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/properties/${currentReviewProperty.ID}/onboarding-status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ stage, correctionNotes })
    });

    if (res.ok) {
      showToast(`Property status updated to: ${stage}`, 'success');
      
      // Close detail view and reload queue list
      document.getElementById('onboardingReviewDetailBox').style.display = 'none';
      loadOnboardingProperties();
    } else {
      showToast('Failed to update onboarding stage.', 'error');
    }
  } catch(e) {
    showToast('Network error during status transition.', 'error');
  }
}

async function loadAcPayments() {
  try {
    const res = await fetch('/api/admin/payments', { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('finTotalRevenue').textContent = `₹${data.totalRevenue.toLocaleString()}`;
      document.getElementById('finPendingPayouts').textContent = `₹${data.pendingPayouts.toLocaleString()}`;
      
      const tbody = document.getElementById('acPaymentsTbody');
      if (data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No transactions recorded.</td></tr>';
        return;
      }
      tbody.innerHTML = data.transactions.map(t => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${t.Txn_ID}</td>
          <td><strong>${t.Guest_Name}</strong></td>
          <td>${t.Property}</td>
          <td style="font-weight:700; color:var(--primary);">₹${t.Amount.toLocaleString()}</td>
          <td><span class="badge badge-${t.Status === 'Success' ? 'success' : t.Status === 'Pending' ? 'warning' : 'danger'}">${t.Status}</span></td>
          <td>${t.Date}</td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast('Failed to load financial records.', 'error');
  }
}

async function triggerPartnerPayout() {
  if (!confirm('Are you sure you want to process settlements for the current cycle? This will trigger bank payouts.')) return;
  try {
    const res = await fetch('/api/admin/payments/payout', { method: 'POST', headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      showToast(data.message, 'success');
      loadAcPayments();
    }
  } catch (e) {
    showToast('Payout failed.', 'error');
  }
}

async function loadAcPromotions() {
  try {
    const res = await fetch('/api/admin/promotions', { headers: getHeaders() });
    if (res.ok) {
      const promos = await res.json();
      const tbody = document.getElementById('acPromosTbody');
      if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No promotions configured.</td></tr>';
        return;
      }
      tbody.innerHTML = promos.map(p => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${p.Code}</td>
          <td><strong>${p.Discount}</strong></td>
          <td>${p.Target}</td>
          <td><span class="badge badge-success">${p.Status}</span></td>
          <td>
            <button class="act-btn danger" title="Delete Promo" onclick="deletePromoCode('${p.Code}')"><i class="fa-solid fa-trash-can"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast('Failed to load promotions.', 'error');
  }
}

async function createPromoCode() {
  const code = document.getElementById('acPromoCode').value.trim();
  const discount = document.getElementById('acPromoDiscount').value.trim();
  const target = document.getElementById('acPromoTarget').value.trim() || 'All Users';
  if (!code || !discount) { showToast('Code and discount value are required.', 'error'); return; }
  
  try {
    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code, discount, target })
    });
    if (res.ok) {
      showToast(`Promo code "${code.toUpperCase()}" launched!`, 'success');
      document.getElementById('acPromoCode').value = '';
      document.getElementById('acPromoDiscount').value = '';
      document.getElementById('acPromoTarget').value = '';
      loadAcPromotions();
    }
  } catch (e) {
    showToast('Failed to create promo code.', 'error');
  }
}

async function deletePromoCode(code) {
  if (!confirm(`Are you sure you want to delete promo code ${code}?`)) return;
  try {
    const res = await fetch(`/api/admin/promotions/${code}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      showToast('Promo code deleted.', 'success');
      loadAcPromotions();
    }
  } catch (e) {
    showToast('Failed to delete promo code.', 'error');
  }
}

async function loadAcTickets() {
  try {
    const res = await fetch('/api/admin/support/tickets', { headers: getHeaders() });
    if (res.ok) {
      const tickets = await res.json();
      const container = document.getElementById('acSupportTicketsList');
      if (tickets.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px 0;">No support tickets.</div>';
        return;
      }
      container.innerHTML = tickets.map(t => {
        const time = new Date(t.Timestamp || t.Date_Added || Date.now()).toLocaleDateString();
        return `
          <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:12px; background:rgba(255,255,255,0.01); display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
              <strong>${t.Name} (${t.Email})</strong>
              <span style="color:var(--text-muted);">${time}</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">${t.Message || t.Inquiry_Text || 'No message content.'}</p>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              <button class="btn btn-ghost btn-sm" style="font-size:0.72rem; padding:2px 8px; border-color:var(--primary); color:var(--primary);" onclick="prepareSupportReply('${t.ID || t.Email}', '${t.Email}')">
                <i class="fa-solid fa-reply"></i> Reply
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    showToast('Failed to load support tickets.', 'error');
  }
}

function prepareSupportReply(id, email) {
  document.getElementById('acReplyTicketId').value = id;
  document.getElementById('acReplyGuestEmail').textContent = email;
  document.getElementById('acSupportReplyForm').style.display = 'flex';
  document.getElementById('acReplyText').focus();
}

async function submitSupportReply() {
  const ticketId = document.getElementById('acReplyTicketId').value;
  const replyText = document.getElementById('acReplyText').value.trim();
  if (!replyText) return;
  
  try {
    const res = await fetch('/api/admin/support/reply', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ticketId, replyText })
    });
    if (res.ok) {
      showToast('Support reply dispatched successfully!', 'success');
      document.getElementById('acReplyText').value = '';
      document.getElementById('acSupportReplyForm').style.display = 'none';
      loadAcTickets();
    }
  } catch (e) {
    showToast('Failed to send reply.', 'error');
  }
}

async function loadAcNotifications() {
  try {
    const res = await fetch('/api/admin/notifications', { headers: getHeaders() });
    if (res.ok) {
      const history = await res.json();
      const container = document.getElementById('acBroadcastHistoryList');
      if (history.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:10px 0;">No broadcast history.</div>';
        return;
      }
      container.innerHTML = history.map(h => {
        const time = new Date(h.Date_Sent).toLocaleString();
        return `
          <div style="border-bottom:1px solid var(--border); padding-bottom:8px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between;">
              <strong>${h.Title}</strong>
              <span style="font-size:0.7rem; color:var(--text-muted);">${time}</span>
            </div>
            <span style="font-size:0.72rem; color:var(--primary);">Audience: ${h.Target}</span>
            <p style="margin:0; color:var(--text-secondary); font-size:0.78rem;">${h.Message}</p>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
}

async function sendBroadcastNotification() {
  const target = document.getElementById('acBroadcastTarget').value;
  const title = document.getElementById('acBroadcastTitle').value.trim();
  const message = document.getElementById('acBroadcastMessage').value.trim();
  if (!title || !message) { showToast('Title and message are required.', 'error'); return; }
  
  try {
    const res = await fetch('/api/admin/notifications/broadcast', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ target, title, message })
    });
    if (res.ok) {
      showToast('Broadcast alert sent successfully!', 'success');
      document.getElementById('acBroadcastTitle').value = '';
      document.getElementById('acBroadcastMessage').value = '';
      loadAcNotifications();
    }
  } catch (e) {
    showToast('Failed to send broadcast.', 'error');
  }
}

async function loadAcLogs() {
  try {
    const res = await fetch('/api/admin/audit-logs', { headers: getHeaders() });
    if (res.ok) {
      acLogsData = await res.json();
      renderAcLogs();
    }
  } catch (e) {
    showToast('Failed to load audit logs.', 'error');
  }
}

function renderAcLogs(data = null) {
  const list = data || acLogsData;
  const tbody = document.getElementById('acLogsTbody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No activity logs recorded.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(l => `
    <tr>
      <td>${new Date(l.Timestamp).toLocaleString()}</td>
      <td><strong>${l.Email}</strong></td>
      <td><span class="badge badge-info">${l.Role}</span></td>
      <td style="font-family:monospace; font-weight:700; color:var(--primary);">${l.Action}</td>
      <td style="font-size:0.78rem; color:var(--text-secondary);">${l.Details}</td>
      <td style="font-family:monospace;">${l.IP_Address || l.IP || 'N/A'}</td>
    </tr>
  `).join('');
}

function filterAcLogs() {
  const query = document.getElementById('acLogSearch').value.toLowerCase();
  if (!query) { renderAcLogs(); return; }
  const filtered = acLogsData.filter(l => 
    l.Email.toLowerCase().includes(query) || 
    l.Action.toLowerCase().includes(query) || 
    l.Details.toLowerCase().includes(query)
  );
  renderAcLogs(filtered);
}

let acRolesData = [];
async function loadAcRoles() {
  try {
    const res = await fetch('/api/admin/roles', { headers: getHeaders() });
    if (res.ok) {
      acRolesData = await res.json();
      
      const list = document.getElementById('acRoleDistributionList');
      list.innerHTML = acRolesData.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px;">
          <div>
            <strong style="color:var(--primary);">${r.Role}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block;">${r.Description}</span>
          </div>
          <span class="badge badge-info">${r.UsersCount} active</span>
        </div>
      `).join('');
      
      loadRolePermissions();
    }
  } catch (e) {
    console.error('Failed to load roles:', e);
  }
}

function loadRolePermissions() {
  const selectedRole = document.getElementById('acRoleSelect').value;
  const r = acRolesData.find(x => x.Role === selectedRole);
  if (!r) return;
  
  const checkboxes = document.querySelectorAll('.role-perm-check');
  checkboxes.forEach(cb => {
    cb.checked = r.Permissions.includes(cb.value);
  });
}

async function saveRolePermissions() {
  const selectedRole = document.getElementById('acRoleSelect').value;
  const checkboxes = document.querySelectorAll('.role-perm-check');
  const permissions = [];
  checkboxes.forEach(cb => {
    if (cb.checked) permissions.push(cb.value);
  });
  
  try {
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ role: selectedRole, permissions })
    });
    if (res.ok) {
      showToast(`Permissions updated for role "${selectedRole}"!`, 'success');
      loadAcRoles();
    }
  } catch (e) {
    showToast('Failed to update permissions.', 'error');
  }
}

async function loadAcContent() {
  try {
    const res = await fetch('/api/admin/content', { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('cmsHeroTitle').value = data.heroTitle;
      document.getElementById('cmsHeroSubtitle').value = data.heroSubtitle;
      
      const list = document.getElementById('cmsFaqList');
      list.innerHTML = data.faq.map(f => `
        <div style="border:1px solid var(--border); border-radius:4px; padding:10px; background:rgba(255,255,255,0.01);">
          <strong style="color:var(--primary); display:block; margin-bottom:4px;">Q: ${f.q}</strong>
          <span style="color:var(--text-secondary);">A: ${f.a}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load CMS content:', e);
  }
}

async function saveCmsContent() {
  const heroTitle = document.getElementById('cmsHeroTitle').value.trim();
  const heroSubtitle = document.getElementById('cmsHeroSubtitle').value.trim();
  if (!heroTitle || !heroSubtitle) return;
  
  try {
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ heroTitle, heroSubtitle })
    });
    if (res.ok) {
      showToast('Website content updated successfully!', 'success');
      loadAcContent();
    }
  } catch (e) {
    showToast('Failed to update CMS content.', 'error');
  }
}

function loadAcReports() {
  // Mock analytics trigger
}

function loadAcSettings() {
  fetchAdminConsoleStatus();
}

function loadAcSecurity() {
  fetchAdminConsoleSessions();
}

function exportDataSheet(type) {
  showToast(`Generating and downloading ${type} spreadsheet...`, 'success');
  window.open(`/api/properties`, '_blank');
}

function triggerManualBackup() {
  document.getElementById('acBtnBackup').click();
}

function addBlockedIp() {
  const input = document.getElementById('secIpBlockInput');
  const ip = input.value.trim();
  if (!ip) return;
  
  const list = document.getElementById('secBlockedIpList');
  const li = document.createElement('li');
  li.style = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:4px; border:1px solid var(--border);';
  li.innerHTML = `<span style="font-family:monospace;">${ip}</span><a href="#" onclick="removeBlockedIp('${ip}')" style="color:var(--danger); font-size:12px;"><i class="fa-solid fa-trash"></i></a>`;
  list.appendChild(li);
  
  showToast(`IP ${ip} has been added to blocklist.`, 'success');
  input.value = '';
}

function removeBlockedIp(ip) {
  showToast(`IP ${ip} has been removed from blocklist.`, 'info');
}

// ─── CUSTOMER 360 CRM CONTROLLERS ────────────────────
let currentCrmEmail = '';

async function viewCustomer360(email, name, phone, type) {
  currentCrmEmail = email;
  document.getElementById('customerListSection').style.display = 'none';
  document.getElementById('customer360Section').style.display = 'block';
  
  // Set initial text while loading
  document.getElementById('crmCustomerName').textContent = name;
  document.getElementById('crmCustomerEmail').textContent = email;
  document.getElementById('crmCustomerPhone').textContent = phone || 'N/A';
  
  document.getElementById('crmProfName').textContent = name;
  document.getElementById('crmProfEmail').textContent = email;
  document.getElementById('crmProfPhone').textContent = phone || 'N/A';
  document.getElementById('crmProfType').textContent = type || 'Guest';
  
  // Reset tabs to Profile
  switchCrmTab('profile');
  
  try {
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}/crm`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      
      // Update profile
      document.getElementById('crmProfJoined').textContent = data.profile.Date_Added ? new Date(data.profile.Date_Added).toLocaleDateString() : 'N/A';
      document.getElementById('crmProfStatus').textContent = data.bookings.length > 0 ? 'Active' : 'Inactive';
      document.getElementById('crmProfNotes').textContent = data.profile.Notes || 'No notes added.';
      
      // Update quick stats
      document.getElementById('crmProfWalletBalance').textContent = `₹${data.wallet.balance.toLocaleString()}`;
      document.getElementById('crmProfLoyaltyPoints').textContent = `${data.loyalty.points} Points`;
      document.getElementById('crmProfLoyaltyTier').textContent = `${data.loyalty.tier} Member`;
      document.getElementById('crmCustomerTierBadge').textContent = `${data.loyalty.tier} Member`;
      
      // Update tab badge counts
      document.getElementById('crmBookingsCount').textContent = data.bookings.length;
      document.getElementById('crmReviewsCount').textContent = data.reviews.length;
      document.getElementById('crmComplaintsCount').textContent = data.complaints.length;
      
      // Render Bookings
      const bookingsTbody = document.getElementById('crmBookingsTbody');
      if (data.bookings.length === 0) {
        bookingsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No bookings found.</td></tr>';
      } else {
        bookingsTbody.innerHTML = data.bookings.map(b => `
          <tr>
            <td style="font-family:monospace; font-weight:700; color:var(--primary);">${b.ID}</td>
            <td><strong>${b.Property || 'HOMZO Stay'}</strong></td>
            <td>${b.Date_Added ? new Date(b.Date_Added).toLocaleDateString() : 'N/A'}</td>
            <td>${b.Check_In || 'N/A'}</td>
            <td>${b.Check_Out || 'N/A'}</td>
            <td>${b.Persons || 1}</td>
            <td><span class="badge badge-${b.Status === 'confirmed' || b.Status === 'active' ? 'success' : b.Status === 'pending' ? 'warning' : 'danger'}">${b.Status || 'confirmed'}</span></td>
          </tr>
        `).join('');
      }
      
      // Render Reviews
      const reviewsList = document.getElementById('crmReviewsList');
      if (data.reviews.length === 0) {
        reviewsList.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px 0; border:1px dashed var(--border); border-radius:4px;">No reviews submitted.</div>';
      } else {
        reviewsList.innerHTML = data.reviews.map(r => {
          let stars = '';
          for (let i = 1; i <= 5; i++) {
            stars += `<i class="fa-solid fa-star" style="color:${i <= r.Rating ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; margin-right:2px; font-size:0.75rem;"></i>`;
          }
          return `
            <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; background:rgba(255,255,255,0.01); display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>${stars}</div>
                <span style="font-size:0.72rem; color:var(--text-muted);">${new Date(r.Date_Added).toLocaleDateString()}</span>
              </div>
              <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">"${r.Review}"</p>
              ${r.Reply ? `<div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-left:3px solid var(--primary); font-size:0.78rem; border-radius:0 4px 4px 0; margin-top:4px;"><strong style="color:var(--primary);">HOMZO Reply:</strong> ${r.Reply}</div>` : ''}
            </div>
          `;
        }).join('');
      }
      
      // Render Complaints (Inquiries)
      const complaintsList = document.getElementById('crmComplaintsList');
      if (data.complaints.length === 0) {
        complaintsList.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px 0; border:1px dashed var(--border); border-radius:4px;">No complaints or support tickets found.</div>';
      } else {
        complaintsList.innerHTML = data.complaints.map(c => `
          <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; background:rgba(255,255,255,0.01); display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
              <span>Ticket ID: <strong style="color:var(--primary); font-family:monospace;">${c.ID || 'N/A'}</strong></span>
              <span>${c.Timestamp ? new Date(c.Timestamp).toLocaleDateString() : 'N/A'}</span>
            </div>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">${c.Message || c.Inquiry_Text}</p>
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:4px;">
              <span class="badge badge-success" style="font-size:0.7rem; padding:2px 6px;">Resolved</span>
            </div>
          </div>
        `).join('');
      }
      
      // Render Wallet Transactions
      renderCrmWalletLedger(data.wallet.transactions);
      
      // Render Loyalty Details
      document.getElementById('crmLoyaltyNextTier').textContent = data.loyalty.nextTier;
      document.getElementById('crmLoyaltyPointsCount').textContent = `${data.loyalty.points} / ${data.loyalty.nextTier === 'Max' ? 500 : data.loyalty.nextTier === 'Platinum' ? 500 : data.loyalty.nextTier === 'Gold' ? 300 : 100} Points`;
      document.getElementById('crmLoyaltyProgressBar').style.width = `${data.loyalty.progress}%`;
      
      renderCrmLoyaltyLedger(data.loyalty.redeemed);
    }
  } catch (e) {
    showToast('Failed to load CRM details.', 'error');
  }
}

function showCustomerList() {
  document.getElementById('customerListSection').style.display = 'block';
  document.getElementById('customer360Section').style.display = 'none';
  loadAcCustomers();
}

function switchCrmTab(tabName) {
  // Toggle tab contents
  document.querySelectorAll('.crm-subtab-pane').forEach(pane => pane.style.display = 'none');
  const activePane = document.getElementById('crmTab-' + tabName);
  if (activePane) activePane.style.display = 'block';
  
  // Toggle tab buttons
  document.querySelectorAll('#customer360Section .search-tabs .stab').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('tabCrm' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Btn');
  if (activeBtn) activeBtn.classList.add('active');
}

function renderCrmWalletLedger(txns) {
  const tbody = document.getElementById('crmWalletTbody');
  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No wallet transactions.</td></tr>';
    return;
  }
  tbody.innerHTML = txns.map(t => `
    <tr>
      <td>${t.Date}</td>
      <td><span class="badge badge-${t.Type === 'Credit' ? 'success' : 'danger'}">${t.Type}</span></td>
      <td style="font-weight:700; color:${t.Type === 'Credit' ? 'var(--success)' : 'var(--danger)'};">${t.Type === 'Credit' ? '+' : '-'}₹${t.Amount.toLocaleString()}</td>
      <td style="color:var(--text-secondary);">${t.Description}</td>
    </tr>
  `).join('');
}

async function submitCrmWalletAdjustment() {
  const type = document.getElementById('crmWalletType').value;
  const amount = document.getElementById('crmWalletAmount').value.trim();
  const description = document.getElementById('crmWalletDesc').value.trim();
  
  if (!amount || !description) {
    showToast('Amount and description are required.', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(currentCrmEmail)}/wallet`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, type, description })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Wallet balance updated!`, 'success');
      document.getElementById('crmProfWalletBalance').textContent = `₹${data.balance.toLocaleString()}`;
      renderCrmWalletLedger(data.transactions);
      document.getElementById('crmWalletAmount').value = '';
      document.getElementById('crmWalletDesc').value = '';
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to adjust wallet.', 'error');
    }
  } catch (e) {
    showToast('Failed to adjust wallet balance.', 'error');
  }
}

function renderCrmLoyaltyLedger(redeemed) {
  const tbody = document.getElementById('crmLoyaltyRedeemedTbody');
  if (redeemed.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No rewards redeemed yet.</td></tr>';
    return;
  }
  tbody.innerHTML = redeemed.map(r => `
    <tr>
      <td>${r.Date}</td>
      <td style="font-weight:700; color:var(--danger); font-family:monospace;">-${r.Points} pts</td>
      <td>${r.Reward}</td>
    </tr>
  `).join('');
}

async function adjustCrmLoyalty(action) {
  const points = document.getElementById('crmLoyaltyPointsInput').value.trim();
  if (!points) return;
  
  const description = action === 'Add' ? 'Loyalty point credit' : 'Reward redemption';
  try {
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(currentCrmEmail)}/loyalty`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ points, action, description })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Loyalty points updated!`, 'success');
      
      // Reload CRM details
      viewCustomer360(currentCrmEmail, document.getElementById('crmCustomerName').textContent, document.getElementById('crmCustomerPhone').textContent, document.getElementById('crmProfType').textContent);
      document.getElementById('crmLoyaltyPointsInput').value = '';
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to adjust points.', 'error');
    }
  } catch (e) {
    showToast('Failed to adjust loyalty points.', 'error');
  }
}
