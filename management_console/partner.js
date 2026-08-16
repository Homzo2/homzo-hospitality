/* ================================================
   HOMZO – Child Admin / Property Partner Portal JS
   ================================================ */

// API Base URL
const API_BASE = '/api';

// State Management
let sessionToken = localStorage.getItem('homzo_partner_token') || '';
let currentUser = null;
let currentProperties = [];
let currentBookings = [];
let currentReviews = [];
let currentTickets = [];
let selectedPropertyId = null;
let blockedDates = [];

// ─── Toast Alerts ────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:18px"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(60px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// API Headers Builder
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
}

// ─── Initialization & Session Check ──────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkSession();
});

async function checkSession() {
  if (!sessionToken) {
    showLoginView();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/session`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      
      if (currentUser.role !== 'partner') {
        showToast('Access Denied. Redirecting to Admin Panel.', 'error');
        localStorage.removeItem('homzo_partner_token');
        setTimeout(() => window.location.href = 'admin.html', 1500);
        return;
      }
      
      showPortalView();
    } else {
      localStorage.removeItem('homzo_partner_token');
      sessionToken = '';
      showLoginView();
    }
  } catch (err) {
    showToast('Failed to connect to backend server.', 'error');
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('partnerLayout').style.display = 'none';
}

function showPortalView() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('partnerLayout').style.display = 'flex';
  
  // Update Header details
  document.getElementById('partnerName').textContent = currentUser.name || 'Property Partner';
  document.getElementById('partnerAvatar').textContent = (currentUser.name || 'P').charAt(0).toUpperCase();
  document.getElementById('welcomeHeader').innerHTML = `Welcome back, ${currentUser.name || 'Partner'}! 👋`;
  
  // Init data loading
  switchPage('dashboard');
  loadNotifications();
}

// ─── Tab Navigation ──────────────────────────────────
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });
  
  document.getElementById('topbarTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' ');
  
  // Load data based on page
  if (name === 'dashboard') loadDashboardData();
  if (name === 'properties') loadPropertiesData();
  if (name === 'pricing') loadPricingPageData();
  if (name === 'bookings') loadBookingsData();
  if (name === 'revenue') loadRevenueData();
  if (name === 'verification') loadVerificationData();
  if (name === 'reviews') loadReviewsData();
  if (name === 'support') loadSupportTickets();

  // Close sidebar on mobile
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
  }
}

// Setup Event Listeners
function setupEventListeners() {

  // Toggle between Login & Onboarding Request form
  const toggleLink = document.getElementById('toggleRegisterLink');
  const loginForm = document.getElementById('partnerLoginForm');
  const registerForm = document.getElementById('partnerRegisterForm');
  const cardTitle = document.getElementById('loginCardTitle');
  const cardSub = document.getElementById('loginCardSub');
  const toggleLabel = document.getElementById('toggleTextLabel');

  if (toggleLink && loginForm && registerForm) {
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      const card = document.querySelector('.theme-login-card');
      if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        cardTitle.textContent = 'Welcome Back!';
        cardSub.textContent = 'Sign in to continue to your account';
        toggleLabel.textContent = "Don't have an account?";
        toggleLink.textContent = 'Register Partnership';
        if (card) card.classList.remove('register-mode');
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        cardTitle.textContent = 'Onboard Stays';
        cardSub.textContent = 'Submit details to partner with Homzo';
        toggleLabel.textContent = 'Already registered?';
        toggleLink.textContent = 'Sign In';
        if (card) card.classList.add('register-mode');
      }
    });
  }

  // Submit Partner Onboarding Request
  const submitRegBtn = document.getElementById('submitRegBtn');
  if (submitRegBtn) {
    submitRegBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const propDetails = document.getElementById('regPropDetails').value.trim();
      const message = document.getElementById('regMessage').value.trim();

      if (!name || !email || !phone || !propDetails || !message) {
        showToast('Please fill out all registration fields.', 'error');
        return;
      }

      submitRegBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      submitRegBtn.disabled = true;

      try {
        const fullMessage = `Partner Onboard Request.\nPhone: ${phone}\nProperty: ${propDetails}\nDetails: ${message}`;
        const res = await fetch(`${API_BASE}/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, type: 'partner', message: fullMessage })
        });

        if (res.ok) {
          showToast('Request submitted successfully! Admin will contact you soon.', 'success');
          // Switch back to Login Form
          loginForm.style.display = 'block';
          registerForm.style.display = 'none';
          cardTitle.textContent = 'Welcome Back!';
          cardSub.textContent = 'Sign in to continue to your account';
          toggleLabel.textContent = "Don't have an account?";
          toggleLink.textContent = 'Register Property';
          const card = document.querySelector('.theme-login-card');
          if (card) card.classList.remove('register-mode');
          
          document.getElementById('regName').value = '';
          document.getElementById('regEmail').value = '';
          document.getElementById('regPhone').value = '';
          document.getElementById('regPropDetails').value = '';
          document.getElementById('regMessage').value = '';
        } else {
          showToast('Failed to submit request.', 'error');
        }
      } catch (err) {
        showToast('Network error during submission.', 'error');
      } finally {
        submitRegBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Registration Request';
        submitRegBtn.disabled = false;
      }
    });
  }

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

  // Login Button Submit
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      
      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passwordInput ? passwordInput.value : '';

      if (!email || !pass) {
        showToast('Please fill in all credentials.', 'error');
        return;
      }

      // Add loading state
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      loginBtn.style.opacity = '0.8';

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('homzo_partner_token', data.token);
          sessionToken = data.token;
          currentUser = { email: data.email, role: data.role, name: data.name };
          showToast('Welcome back, Partner!', 'success');
          showPortalView();
        } else {
          const errData = await res.json();
          showToast(errData.error || 'Invalid email or password.', 'error');
        }
      } catch (err) {
        showToast('Connection to backend failed.', 'error');
      } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.style.opacity = '1';
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

  // Sidebar toggling
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Global links handler
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(link.dataset.page);
    });
  });

  // Modal overlays click outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Logout Action
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: getHeaders() });
      } catch (e) {}
      localStorage.removeItem('homzo_partner_token');
      sessionToken = '';
      currentUser = null;
      showToast('Logged out successfully.', 'info');
      showLoginView();
    });
  }

  // Property Form Submit
  const propEditForm = document.getElementById('propEditForm');
  if (propEditForm) {
    propEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editPropId').value;
      const name = document.getElementById('editPropName').value.trim();
      const type = document.getElementById('editPropType').value;
      const inventory = parseInt(document.getElementById('editPropInventory').value);
      const checkInOut = document.getElementById('editPropCheckInOut').value.trim();
      const policies = document.getElementById('editPropPolicies').value.trim();
      
      const amenities = [];
      document.querySelectorAll('input[name="amenity"]:checked').forEach(c => {
        amenities.push(c.value);
      });

      try {
        const res = await fetch(`${API_BASE}/partner/properties/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ name, type, inventory, checkInOut, policies, amenities })
        });
        if (res.ok) {
          showToast('Property configuration saved successfully!', 'success');
          loadPropertiesData();
        } else {
          showToast('Failed to save configuration.', 'error');
        }
      } catch (err) {
        showToast('Server update error.', 'error');
      }
    });
  }

  // Pricing Adjustments Save
  const savePricingBtn = document.getElementById('savePricingBtn');
  if (savePricingBtn) {
    savePricingBtn.addEventListener('click', async () => {
      const seasonalPrice = parseInt(document.getElementById('rangeSeasonal').value);
      const weekendPrice = parseInt(document.getElementById('rangeWeekend').value);
      
      try {
        const res = await fetch(`${API_BASE}/partner/pricing/${selectedPropertyId}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ seasonalPrice, weekendPrice })
        });
        if (res.ok) {
          showToast('Price adjustments saved successfully!', 'success');
        } else {
          showToast('Failed to save prices.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  // Sliders labels sync
  const rangeSeasonal = document.getElementById('rangeSeasonal');
  const labelSeasonal = document.getElementById('labelSeasonal');
  if (rangeSeasonal && labelSeasonal) {
    rangeSeasonal.addEventListener('input', () => {
      labelSeasonal.textContent = (rangeSeasonal.value > 0 ? '+' : '') + rangeSeasonal.value + '%';
    });
  }

  const rangeWeekend = document.getElementById('rangeWeekend');
  const labelWeekend = document.getElementById('labelWeekend');
  if (rangeWeekend && labelWeekend) {
    rangeWeekend.addEventListener('input', () => {
      labelWeekend.textContent = '+' + rangeWeekend.value + '%';
    });
  }

  // KYC details form submit
  const kycDetailsForm = document.getElementById('kycDetailsForm');
  if (kycDetailsForm) {
    kycDetailsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const gst = document.getElementById('kycGst').value.trim();
      const pan = document.getElementById('kycPan').value.trim();
      const bankAccount = document.getElementById('kycAccount').value.trim();
      const bankIfsc = document.getElementById('kycIfsc').value.trim();

      try {
        const res = await fetch(`${API_BASE}/partner/verification`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ gst, pan, bankAccount, bankIfsc })
        });
        if (res.ok) {
          showToast('Verification KYC details submitted successfully!', 'success');
          loadVerificationData();
        } else {
          showToast('Failed to save details.', 'error');
        }
      } catch (err) {
        showToast('Server KYC update error.', 'error');
      }
    });
  }

  // Support Ticket Form Submit
  const ticketForm = document.getElementById('ticketForm');
  if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subject = document.getElementById('ticketSubject').value.trim();
      const category = document.getElementById('ticketCategory').value;
      const message = document.getElementById('ticketMessage').value.trim();

      try {
        const res = await fetch(`${API_BASE}/partner/tickets`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ subject, category, message })
        });
        if (res.ok) {
          showToast('Support ticket raised successfully!', 'success');
          document.getElementById('ticketSubject').value = '';
          document.getElementById('ticketMessage').value = '';
          loadSupportTickets();
        } else {
          showToast('Failed to raise ticket.', 'error');
        }
      } catch (err) {
        showToast('Support server error.', 'error');
      }
    });
  }

  // Review Reply Save Click
  const saveReplyBtn = document.getElementById('saveReplyBtn');
  if (saveReplyBtn) {
    saveReplyBtn.addEventListener('click', async () => {
      const id = document.getElementById('repReviewId').value;
      const reply = document.getElementById('repContent').value.trim();
      if (!reply) return;

      try {
        const res = await fetch(`${API_BASE}/partner/reviews/${id}/reply`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ reply })
        });
        if (res.ok) {
          showToast('Review reply updated!', 'success');
          closeModal('reviewReplyModal');
          loadReviewsData();
        } else {
          showToast('Failed to save review reply.', 'error');
        }
      } catch (err) {
        showToast('Error replying to review.', 'error');
      }
    });
  }

  // Search filter for bookings
  const bookingSearch = document.getElementById('bookingSearch');
  const bookingFilterStatus = document.getElementById('bookingFilterStatus');
  if (bookingSearch && bookingFilterStatus) {
    bookingSearch.addEventListener('input', () => filterBookings());
    bookingFilterStatus.addEventListener('change', () => filterBookings());
  }

  // Notifications modal trigger
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      openModal('notifCenterModal');
      // Mark all read on click
      markNotificationsRead();
    });
  }
}

// ─── Dashboard Stats Loader ──────────────────────────
async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/partner/dashboard`, { headers: getHeaders() });
    if (!res.ok) return;
    const stats = await res.json();
    
    document.getElementById('dashBookings').textContent = stats.totalBookings;
    document.getElementById('dashOccupancy').textContent = stats.occupancyRate + '%';
    document.getElementById('dashEarnings').textContent = '₹' + Math.round(stats.netEarnings).toLocaleString();
    document.getElementById('dashGuests').textContent = stats.activeGuests;

    // Load upcoming list
    await loadUpcomingBookings();
    
    // Render security logs widget
    const logContainer = document.getElementById('activityLogContainer');
    if (stats.recentLogs && stats.recentLogs.length > 0) {
      logContainer.innerHTML = stats.recentLogs.map(l => `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:10px 14px; border-radius:var(--radius-sm); font-size:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:var(--primary); font-weight:700;">${l.action.toUpperCase()}</strong>
            <span style="color:var(--text-muted); font-size:0.68rem;">${new Date(l.timestamp).toLocaleTimeString()}</span>
          </div>
          <span style="color:var(--text-secondary);">${l.details}</span>
        </div>`).join('');
    } else {
      logContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No recent security actions.</div>`;
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

async function loadUpcomingBookings() {
  try {
    const res = await fetch(`${API_BASE}/partner/bookings`, { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    
    // Upcoming filter (Status not cancelled, Check-In in the future or present)
    const upcoming = data
      .filter(b => b.status !== 'cancelled' && b.checkIn)
      .slice(0, 5);

    const tbody = document.getElementById('upcomingTbody');
    if (upcoming.length > 0) {
      tbody.innerHTML = upcoming.map(b => `
        <tr>
          <td><strong style="color:var(--text-primary);">${b.guestName}</strong></td>
          <td>${b.checkIn}</td>
          <td>${b.checkOut}</td>
          <td>${b.property}</td>
          <td><span class="badge badge-success">${b.status}</span></td>
        </tr>`).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No upcoming guests today.</td></tr>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ─── Properties Data Loader ──────────────────────────
async function loadPropertiesData() {
  try {
    const res = await fetch(`${API_BASE}/partner/properties`, { headers: getHeaders() });
    if (!res.ok) return;
    currentProperties = await res.json();

    const listContainer = document.getElementById('partnerPropList');
    if (currentProperties.length > 0) {
      listContainer.innerHTML = currentProperties.map(p => `
        <button class="sidebar-link" style="width:100%; text-align:left; border:1px solid var(--border); border-radius:var(--radius-sm); background:${selectedPropertyId === p.id ? 'var(--primary-glow)' : 'none'}; color:${selectedPropertyId === p.id ? 'var(--primary)' : 'var(--text-primary)'}; margin-bottom:6px;" onclick="selectProperty(${p.id})">
          <i class="fa-solid fa-hotel"></i> ${p.name}
        </button>`).join('');
        
      if (!selectedPropertyId) {
        selectProperty(currentProperties[0].id);
      } else {
        selectProperty(selectedPropertyId);
      }
    } else {
      listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem;">No properties assigned. Contact Homzo admin.</div>`;
      document.getElementById('propDetailsEditor').style.display = 'none';
      document.getElementById('noPropSelected').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

function selectProperty(id) {
  selectedPropertyId = id;
  const p = currentProperties.find(x => x.id === id);
  if (!p) return;

  // Highlight list item
  document.querySelectorAll('#partnerPropList button').forEach((btn, idx) => {
    const matched = currentProperties[idx] && currentProperties[idx].id === id;
    btn.style.background = matched ? 'var(--primary-glow)' : 'none';
    btn.style.color = matched ? 'var(--primary)' : 'var(--text-primary)';
  });

  document.getElementById('propDetailsEditor').style.display = 'block';
  document.getElementById('noPropSelected').style.display = 'none';

  // Set form fields
  document.getElementById('editPropId').value = p.id;
  document.getElementById('editPropName').value = p.name;
  document.getElementById('editPropType').value = p.type || 'Hotel';
  document.getElementById('wzAddress').value = p.Address || '';
  document.getElementById('wzCity').value = p.City || '';
  document.getElementById('wzState').value = p.State || '';
  document.getElementById('wzPincode').value = p.Pincode || '';
  document.getElementById('wzGmapsLink').value = p.Google_Maps_Link || '';
  document.getElementById('wzLatitude').value = p.Latitude || '';
  document.getElementById('wzLongitude').value = p.Longitude || '';
  
  document.getElementById('wzContactPerson').value = p.Contact_Person || '';
  document.getElementById('wzPropPhone').value = p.Phone || '';
  document.getElementById('wzPropEmail').value = p.Email || '';
  
  document.getElementById('wzTotalRooms').value = p.Total_Rooms || '';
  document.getElementById('wzAvailableRooms').value = p.Available_Rooms || '';
  document.getElementById('wzMaxGuests').value = p.Max_Guests || '';

  // Setup entity type & fields
  const entityType = p.Registration_Status === 'Unregistered' ? 'Individual' : 'Company';
  document.getElementById('wzEntityType').value = entityType === 'Individual' ? 'Individual' : 'Company';
  toggleEntityKyc();

  document.getElementById('wzAadhaarNum').value = p.Aadhaar_Doc ? 'Aadhaar Verified' : ''; 
  document.getElementById('wzPanNum').value = p.PAN_Doc ? 'PAN Verified' : '';
  document.getElementById('wzCompanyPan').value = p.PAN_Doc ? 'PAN Verified' : '';
  document.getElementById('wzAuthPersonId').value = p.Aadhaar_Doc ? 'ID Verified' : '';

  // GST
  const gstRegistered = p.GST_Doc ? 'YES' : 'NO';
  document.getElementById('wzGstStatus').value = gstRegistered;
  toggleGstInput();
  if (gstRegistered === 'YES') {
    document.getElementById('wzGstNumber').value = p.GST_Doc ? 'GST Verified' : '';
  }

  // Bank
  document.getElementById('wzBankAccountHolder').value = p.Bank_Account_Holder || '';
  document.getElementById('wzBankName').value = p.Bank_Account_Holder ? 'Verified Bank' : '';
  document.getElementById('wzBankAccountNumber').value = p.Bank_Account_Number || '';
  document.getElementById('wzBankIfsc').value = p.Bank_IFSC || '';
  verifyBankNameMatching();

  // Document labels
  updateUploadLabel('lblAadhaarDoc', p.Aadhaar_Doc);
  updateUploadLabel('lblPanDoc', p.PAN_Doc);
  updateUploadLabel('lblPhotoDoc', p.Owner_Photo_Doc);
  updateUploadLabel('lblIncorpDoc', p.Incorporation_Doc);
  updateUploadLabel('lblAuthDoc', p.Authorization_Doc);
  updateUploadLabel('lblOwnershipDoc', p.Ownership_Doc);
  updateUploadLabel('lblLeaseDoc', p.Rent_Agreement_Doc);
  updateUploadLabel('lblNocDoc', p.NOC_Doc);
  updateUploadLabel('lblGstDoc', p.GST_Doc);
  updateUploadLabel('lblBusinessRegDoc', p.Business_Registration_Doc);
  updateUploadLabel('lblFireSafetyDoc', p.Fire_Safety_Doc);
  updateUploadLabel('lblPoliceDoc', p.Police_Verification_Doc);
  updateUploadLabel('lblTradeDoc', p.Trade_License_Doc);
  updateUploadLabel('lblFssaiDoc', p.FSSAI_Doc);
  updateUploadLabel('lblChequeDoc', p.Cancelled_Cheque_Doc);

  // Check amenities
  const ams = p.amenities || [];
  document.querySelectorAll('input[name="wzAmenity"]').forEach(box => {
    box.checked = ams.includes(box.value);
  });

  // Policies & Legal
  document.getElementById('editPropPolicies').value = p.policies || '';
  
  // Set legal declarations
  document.getElementById('chkDeclTrue1').checked = p.Partner_Agreement_Accepted || false;
  document.getElementById('chkDeclTrue2').checked = p.Partner_Agreement_Accepted || false;
  document.getElementById('chkDeclTrue3').checked = p.Partner_Agreement_Accepted || false;
  document.getElementById('chkAcceptAgreement').checked = p.Partner_Agreement_Accepted || false;

  // Onboarding Stage Banner setup
  const stage = p.Onboarding_Stage || 'Draft';
  document.getElementById('onboardingStageBanner').style.display = 'flex';
  
  const stageTitle = document.getElementById('propStageTitle');
  const stageDesc = document.getElementById('propStageDesc');
  const badgeRight = document.getElementById('badgeStatusRight');
  const correctionBox = document.getElementById('correctionNotesBox');
  const correctionNotes = document.getElementById('propCorrectionNotes');

  stageTitle.textContent = 'Status: ' + stage.toUpperCase();
  badgeRight.textContent = stage;
  correctionBox.style.display = 'none';

  switch(stage) {
    case 'Draft':
      stageTitle.textContent = 'Status: DRAFT MODE';
      stageDesc.textContent = 'Your onboarding application is in Draft. Fill out all steps and click Submit.';
      badgeRight.style.background = 'rgba(255,255,255,0.05)';
      badgeRight.style.color = 'var(--text-primary)';
      break;
    case 'Submitted':
      stageTitle.textContent = 'Status: SUBMITTED';
      stageDesc.textContent = 'Your details and KYC documents have been successfully submitted. Our team is reviewing them.';
      badgeRight.style.background = 'rgba(59,130,246,0.15)';
      badgeRight.style.color = 'var(--info)';
      break;
    case 'KYC Verification':
      stageTitle.textContent = 'Status: KYC VERIFICATION IN PROGRESS';
      stageDesc.textContent = 'Super admin is currently validating your Aadhaar, PAN, and identity documents.';
      badgeRight.style.background = 'rgba(245,158,11,0.15)';
      badgeRight.style.color = 'var(--warning)';
      break;
    case 'Document Verification':
      stageTitle.textContent = 'Status: DOCUMENTS VERIFICATION IN PROGRESS';
      stageDesc.textContent = 'Super admin is verifying your property ownership deeds and business registrations.';
      badgeRight.style.background = 'rgba(245,158,11,0.15)';
      badgeRight.style.color = 'var(--warning)';
      break;
    case 'Property Verification':
      stageTitle.textContent = 'Status: PROPERTY AUDIT & VERIFICATION';
      stageDesc.textContent = 'Quality managers are scheduling a physical property audit and inspecting inventory/amenities.';
      badgeRight.style.background = 'rgba(139,92,246,0.15)';
      badgeRight.style.color = '#a78bfa';
      break;
    case 'Commercial Approval':
      stageTitle.textContent = 'Status: COMMERCIAL TERMS SETTLEMENT';
      stageDesc.textContent = 'Admin is finalizing commission structures (15% Category A / 17% Category B) and bank payouts routing.';
      badgeRight.style.background = 'rgba(34,197,94,0.15)';
      badgeRight.style.color = 'var(--success)';
      break;
    case 'Approved':
      stageTitle.textContent = 'Status: APPROVED!';
      stageDesc.textContent = 'Congratulations! Your stay is approved. Accept final terms below to publish it LIVE.';
      badgeRight.style.background = 'rgba(34,197,94,0.15)';
      badgeRight.style.color = 'var(--success)';
      break;
    case 'Live':
      stageTitle.textContent = 'Status: ACTIVE / LIVE ON HOMZO';
      stageDesc.textContent = 'Your property is currently live and visible on the guest search pages. Payouts are active.';
      badgeRight.style.background = 'rgba(34,197,94,0.3)';
      badgeRight.style.color = 'var(--success)';
      break;
    case 'Correction Required':
      stageTitle.textContent = 'Status: CORRECTION REQUIRED';
      stageDesc.textContent = 'Action needed: Admin has requested updates on some documents or details. Review comments below.';
      badgeRight.style.background = 'rgba(239,68,68,0.15)';
      badgeRight.style.color = 'var(--danger)';
      if (p.Correction_Notes) {
        correctionBox.style.display = 'block';
        correctionNotes.textContent = p.Correction_Notes;
      }
      break;
  }

  // Founding partner badge
  const foundingContainer = document.getElementById('foundingPartnerBadgeContainer');
  if (foundingContainer) {
    foundingContainer.style.display = p.Is_Founding_Partner ? 'block' : 'none';
  }

  // Load and render room categories from metadata
  wzRoomCategories = p.roomCategories || [];
  renderWzRoomCategories();

  // Reset to Step 1
  switchWzStep(1);
}

function updateUploadLabel(id, filepath) {
  const lbl = document.getElementById(id);
  if (!lbl) return;
  if (filepath) {
    lbl.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-circle-check"></i> Uploaded</span> (<a href="${filepath}" target="_blank" style="color:var(--primary)">View</a>)`;
  } else {
    lbl.innerHTML = `<span style="color:var(--text-muted)">Not Uploaded</span>`;
  }
}

// ─── Pricing & Availability Loader ──────────────────
async function loadPricingPageData() {
  try {
    const res = await fetch(`${API_BASE}/partner/properties`, { headers: getHeaders() });
    if (!res.ok) return;
    currentProperties = await res.json();

    const listContainer = document.getElementById('pricingPropList');
    if (currentProperties.length > 0) {
      listContainer.innerHTML = currentProperties.map(p => `
        <button class="sidebar-link" style="width:100%; text-align:left; border:1px solid var(--border); border-radius:var(--radius-sm); background:${selectedPropertyId === p.id ? 'var(--primary-glow)' : 'none'}; color:${selectedPropertyId === p.id ? 'var(--primary)' : 'var(--text-primary)'}; margin-bottom:6px;" onclick="selectPricingProperty(${p.id})">
          <i class="fa-solid fa-hotel"></i> ${p.name}
        </button>`).join('');
        
      if (!selectedPropertyId) {
        selectPricingProperty(currentProperties[0].id);
      } else {
        selectPricingProperty(selectedPropertyId);
      }
    } else {
      listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem;">No properties assigned.</div>`;
      document.getElementById('pricingCalSection').style.display = 'none';
      document.getElementById('noPricingSelected').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

async function selectPricingProperty(id) {
  selectedPropertyId = id;
  
  // Highlight list item
  document.querySelectorAll('#pricingPropList button').forEach((btn, idx) => {
    const matched = currentProperties[idx] && currentProperties[idx].id === id;
    btn.style.background = matched ? 'var(--primary-glow)' : 'none';
    btn.style.color = matched ? 'var(--primary)' : 'var(--text-primary)';
  });

  document.getElementById('pricingCalSection').style.display = 'flex';
  document.getElementById('noPricingSelected').style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/partner/pricing/${id}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      blockedDates = data.blockedDates || [];
      
      // Update sliders
      document.getElementById('rangeSeasonal').value = data.seasonalPrice;
      document.getElementById('labelSeasonal').textContent = (data.seasonalPrice > 0 ? '+' : '') + data.seasonalPrice + '%';
      
      document.getElementById('rangeWeekend').value = data.weekendPrice;
      document.getElementById('labelWeekend').textContent = '+' + data.weekendPrice + '%';

      renderCalendar();
    }
  } catch (err) {
    console.error(err);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  
  // Clear previous date cells, preserving weekdays headers
  const labels = grid.querySelectorAll('.calendar-day-label');
  grid.innerHTML = '';
  labels.forEach(l => grid.appendChild(l));

  // Render June 2026 calendar cells
  // June 1, 2026 is a Monday (weekday offset = 1 day empty)
  // Total days in June = 30
  
  // Add weekday offset empty cell
  const emptyCell = document.createElement('div');
  emptyCell.style.pointerEvents = 'none';
  grid.appendChild(emptyCell);

  for (let day = 1; day <= 30; day++) {
    const dateString = `2026-06-${day < 10 ? '0' + day : day}`;
    const isBlocked = blockedDates.includes(dateString);
    
    const dayCell = document.createElement('div');
    dayCell.className = `calendar-day ${isBlocked ? 'blocked' : ''}`;
    dayCell.innerHTML = `
      <span class="day-num">${day}</span>
      <span class="day-status">${isBlocked ? 'Blocked' : 'Available'}</span>
    `;
    
    dayCell.addEventListener('click', () => toggleDateAvailability(dateString));
    grid.appendChild(dayCell);
  }
}

async function toggleDateAvailability(dateString) {
  if (blockedDates.includes(dateString)) {
    blockedDates = blockedDates.filter(d => d !== dateString);
  } else {
    blockedDates.push(dateString);
  }
  
  try {
    const res = await fetch(`${API_BASE}/partner/pricing/${selectedPropertyId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ blockedDates })
    });
    if (res.ok) {
      renderCalendar();
      showToast(`Calendar updated for date: ${dateString}`, 'info');
    }
  } catch (err) {
    showToast('Failed to update calendar status.', 'error');
  }
}

// ─── Bookings Loader ────────────────────────────────
async function loadBookingsData() {
  try {
    const res = await fetch(`${API_BASE}/partner/bookings`, { headers: getHeaders() });
    if (!res.ok) return;
    currentBookings = await res.json();
    filterBookings();
  } catch (err) {
    console.error(err);
  }
}

function filterBookings() {
  const q = document.getElementById('bookingSearch').value.toLowerCase();
  const statusFilter = document.getElementById('bookingFilterStatus').value;
  
  let filtered = currentBookings;
  if (q) {
    filtered = filtered.filter(b => b.guestName.toLowerCase().includes(q));
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(b => b.status === statusFilter);
  }

  const tbody = document.getElementById('bookingsTbody');
  if (filtered.length > 0) {
    tbody.innerHTML = filtered.map(b => `
      <tr>
        <td style="font-weight:700; color:var(--primary);">${b.id}</td>
        <td><strong style="color:var(--text-primary);">${b.guestName}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${b.email}</span></td>
        <td>${b.checkIn}</td>
        <td>${b.checkOut}</td>
        <td>${b.property}</td>
        <td>${b.persons} Pax</td>
        <td style="color:var(--primary); font-weight:700;">${b.amount}</td>
        <td><span class="badge badge-${b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'danger'}">${b.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="act-btn" title="View Details" onclick="viewBookingDetails('${b.id}')"><i class="fa-solid fa-eye"></i></button>
            ${b.status === 'pending' ? `<button class="act-btn" title="Approve" onclick="updateBooking('${b.id}', 'confirmed')" style="color:var(--success); border-color:rgba(34,197,94,0.3);"><i class="fa-solid fa-check"></i></button>` : ''}
            ${b.status !== 'cancelled' ? `<button class="act-btn danger" title="Cancel Booking" onclick="updateBooking('${b.id}', 'cancelled')"><i class="fa-solid fa-ban"></i></button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">No matching bookings.</td></tr>`;
  }

  // Update navbar badge counts for pending bookings
  const pendingCount = currentBookings.filter(b => b.status === 'pending').length;
  const badge = document.getElementById('bkgBadge');
  if (badge) {
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

window.viewBookingDetails = function(id) {
  const b = currentBookings.find(x => x.id === id);
  if (!b) return;

  document.getElementById('baTitle').textContent = 'Reservation details: ' + id;
  document.getElementById('baContent').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      ${[
        ['Guest Name', b.guestName],
        ['Email', b.email],
        ['Phone', b.phone],
        ['Guest Type', b.guestType],
        ['Hotel Name', b.property],
        ['Check-In', b.checkIn],
        ['Check-Out', b.checkOut],
        ['Total guests', b.persons + ' Pax'],
        ['Notes', b.notes || 'None'],
        ['Transaction Price', b.amount],
        ['Booking Status', b.status]
      ].map(([k, v]) => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
          <span style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">${k}</span>
          <span style="font-weight:600; font-size:0.85rem;">${v}</span>
        </div>`).join('')}
    </div>`;
  openModal('bookingActionModal');
}

window.updateBooking = async function(id, status) {
  if (status === 'cancelled' && !confirm('Are you sure you want to cancel this booking? Policy rules will be auto-calculated.')) {
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/partner/bookings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Booking ${id} status updated to ${status}.`, 'success');
      loadBookingsData();
    } else {
      showToast('Error modifying booking status.', 'error');
    }
  } catch (err) {
    showToast('Network error.', 'error');
  }
}

// ─── Revenue Disbursement Loader ────────────────────
async function loadRevenueData() {
  try {
    const res = await fetch(`${API_BASE}/partner/revenue`, { headers: getHeaders() });
    if (!res.ok) return;
    const ledger = await res.json();

    let gross = 0;
    let commission = 0;
    let net = 0;

    const tbody = document.getElementById('revenueTbody');
    if (ledger.length > 0) {
      tbody.innerHTML = ledger.map(item => {
        gross += item.amount;
        commission += item.commission;
        net += item.netPayout;

        return `
          <tr>
            <td style="font-weight:700; color:var(--primary);">${item.bookingId}</td>
            <td><strong>${item.guestName}</strong></td>
            <td>₹${item.amount.toLocaleString()}</td>
            <td style="color:var(--danger);">₹${item.commission.toLocaleString()}</td>
            <td style="color:var(--success); font-weight:700;">₹${item.netPayout.toLocaleString()}</td>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td><span class="badge badge-success">${item.status}</span></td>
          </tr>`;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No processed payouts yet.</td></tr>`;
    }

    document.getElementById('payoutGross').textContent = '₹' + gross.toLocaleString();
    document.getElementById('payoutCommission').textContent = '₹' + commission.toLocaleString();
    document.getElementById('payoutNet').textContent = '₹' + net.toLocaleString();
  } catch (err) {
    console.error(err);
  }
}

// ─── Verification & KYC Loader ──────────────────────
async function loadVerificationData() {
  try {
    const res = await fetch(`${API_BASE}/partner/verification`, { headers: getHeaders() });
    if (!res.ok) return;
    const kyc = await res.json();

    document.getElementById('kycGst').value = kyc.gst;
    document.getElementById('kycPan').value = kyc.pan;
    document.getElementById('kycAccount').value = kyc.bankAccount;
    document.getElementById('kycIfsc').value = kyc.bankIfsc;

    // Badges update
    const badge = document.getElementById('verificationStatusBadge');
    const banner = document.getElementById('kycBanner');
    
    badge.textContent = 'KYC ' + kyc.verificationStatus.toUpperCase();
    
    if (kyc.verificationStatus === 'verified') {
      badge.style.color = 'var(--success)';
      badge.style.borderColor = 'rgba(34,197,94,0.3)';
      banner.style.display = 'none';
      
      document.getElementById('gstDocStatus').textContent = 'Status: Approved & Verified';
      document.getElementById('panDocStatus').textContent = 'Status: Approved & Verified';
      document.getElementById('deedDocStatus').textContent = 'Status: Approved & Verified';
    } else if (kyc.verificationStatus === 'rejected') {
      badge.style.color = 'var(--danger)';
      badge.style.borderColor = 'rgba(239,68,68,0.3)';
      banner.style.display = 'flex';
      banner.className = 'verification-banner rejected';
      banner.querySelector('strong').textContent = 'KYC Submission Rejected';
      banner.querySelector('span').textContent = 'Your documents were rejected. Please update your details and re-upload scans.';
    } else {
      badge.style.color = 'var(--warning)';
      badge.style.borderColor = 'rgba(245,158,11,0.3)';
      banner.style.display = 'flex';
      
      if (kyc.gst || kyc.pan) {
        banner.className = 'verification-banner';
        banner.querySelector('strong').textContent = 'KYC Review In Progress';
        banner.querySelector('span').textContent = 'Your documents are being reviewed by the Super Admin team. Automatic transfers are locked.';
        banner.querySelector('button').style.display = 'none';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// ─── Guest Reviews Loader ───────────────────────────
async function loadReviewsData() {
  try {
    const res = await fetch(`${API_BASE}/partner/reviews`, { headers: getHeaders() });
    if (!res.ok) return;
    currentReviews = await res.json();

    const tbody = document.getElementById('reviewsTbody');
    if (currentReviews.length > 0) {
      tbody.innerHTML = currentReviews.map(r => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += `<i class="${i <= r.rating ? 'fa-solid' : 'fa-regular'} fa-star" style="color:#ff5c35; font-size:11px;"></i>`;
        }

        return `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td><div style="white-space:nowrap;">${stars}</div></td>
            <td style="max-width:300px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${r.review}">${r.review}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td><span class="badge badge-${r.reply ? 'success' : 'warning'}">${r.reply ? 'Replied' : 'Pending Response'}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="openPartnerReplyModal(${r.id})">
                <i class="fa-solid fa-comment-dots"></i> ${r.reply ? 'Edit Reply' : 'Reply'}
              </button>
            </td>
          </tr>`;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No reviews posted yet.</td></tr>`;
    }
  } catch (err) {
    console.error(err);
  }
}

window.openPartnerReplyModal = function(id) {
  const r = currentReviews.find(x => x.id === id);
  if (!r) return;

  document.getElementById('repReviewId').value = r.id;
  document.getElementById('repGuestName').textContent = r.name;
  document.getElementById('repText').textContent = r.review;
  
  let starsHtml = '';
  for (let s = 1; s <= 5; s++) {
    starsHtml += s <= r.rating ? '⭐' : '☆';
  }
  document.getElementById('repStars').textContent = starsHtml;
  document.getElementById('repContent').value = r.reply || '';
  
  openModal('reviewReplyModal');
}

// ─── Support Desk Loader ─────────────────────────────
async function loadSupportTickets() {
  try {
    const res = await fetch(`${API_BASE}/partner/tickets`, { headers: getHeaders() });
    if (!res.ok) return;
    currentTickets = await res.json();

    const log = document.getElementById('ticketLog');
    if (currentTickets.length > 0) {
      log.innerHTML = currentTickets.map(t => `
        <div class="ticket-card">
          <div class="ticket-header">
            <strong>${t.subject}</strong>
            <span class="badge badge-${t.status === 'open' ? 'warning' : 'success'}">${t.status.toUpperCase()}</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:8px;">
            <span>Category: ${t.category}</span> &bull; <span>Date: ${new Date(t.dateCreated).toLocaleDateString()}</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.4;">${t.message}</p>
          ${t.reply ? `
            <div class="ticket-reply">
              <strong style="font-size:0.75rem; color:var(--primary); display:block; margin-bottom:4px;">Homzo Response:</strong>
              <p style="font-size:0.8rem; color:var(--text-primary); margin:0;">${t.reply}</p>
            </div>` : ''}
        </div>`).join('');
    } else {
      log.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No support cases filed.</div>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ─── Notifications Loader ────────────────────────────
async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE}/partner/notifications`, { headers: getHeaders() });
    if (!res.ok) return;
    const notifs = await res.json();
    
    const unread = notifs.filter(n => n.status === 'unread');
    const dot = document.getElementById('notifDot');
    if (dot) {
      dot.style.display = unread.length > 0 ? 'block' : 'none';
    }

    const list = document.getElementById('notifList');
    if (notifs.length > 0) {
      list.innerHTML = notifs.map(n => `
        <div style="padding:12px; background:${n.status === 'unread' ? 'rgba(255, 92, 53, 0.05)' : 'rgba(255,255,255,0.01)'}; border:1px solid var(--border); border-radius:var(--radius-sm); position:relative;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="font-size:0.85rem; color:var(--text-primary);">${n.title}</strong>
            <span style="font-size:0.68rem; color:var(--text-muted);">${new Date(n.dateCreated).toLocaleDateString()}</span>
          </div>
          <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.4;">${n.message}</p>
        </div>`).join('');
    } else {
      list.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No alerts.</div>`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function markNotificationsRead() {
  try {
    const res = await fetch(`${API_BASE}/partner/notifications`, { headers: getHeaders() });
    if (!res.ok) return;
    const notifs = await res.json();
    const unread = notifs.filter(n => n.status === 'unread');
    
    for (const n of unread) {
      await fetch(`${API_BASE}/partner/notifications/${n.id}/read`, { method: 'PUT', headers: getHeaders() });
    }
    
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
  } catch (err) {
    console.error(err);
  }
}

// ─── WIZARD HELPER FUNCTIONS ───
let currentWzStep = 1;
let wzRoomCategories = [];

function switchWzStep(step) {
  currentWzStep = step;
  
  // Toggle step containers
  document.querySelectorAll('.wz-step-content').forEach(div => {
    div.style.display = 'none';
  });
  const activeDiv = document.getElementById(`wz-step-${step}`);
  if (activeDiv) activeDiv.style.display = 'block';

  // Toggle step buttons
  document.querySelectorAll('.wizard-tabs button').forEach(btn => {
    const stepNum = parseInt(btn.getAttribute('data-wz-step'));
    if (stepNum === step) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Adjust button disabled states and visibility
  document.getElementById('wzPrevBtn').disabled = (step === 1);
  
  if (step === 6) {
    document.getElementById('wzNextBtn').style.display = 'none';
    document.getElementById('wzSubmitBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('wzNextBtn').style.display = 'inline-flex';
    document.getElementById('wzSubmitBtn').style.display = 'none';
  }
}

function navigateWzStep(direction) {
  const nextStep = currentWzStep + direction;
  if (nextStep >= 1 && nextStep <= 6) {
    switchWzStep(nextStep);
  }
}

function toggleEntityKyc() {
  const type = document.getElementById('wzEntityType').value;
  const indBox = document.getElementById('wzKycIndividualBox');
  const compBox = document.getElementById('wzKycCompanyBox');
  
  if (type === 'Individual') {
    indBox.style.display = 'grid';
    compBox.style.display = 'none';
  } else {
    indBox.style.display = 'none';
    compBox.style.display = 'grid';
  }
}

function toggleGstInput() {
  const status = document.getElementById('wzGstStatus').value;
  const numBox = document.getElementById('wzGstNumberBox');
  const uploadBox = document.getElementById('wzGstUploadBox');
  
  if (status === 'YES') {
    numBox.style.display = 'block';
    uploadBox.style.display = 'flex';
  } else {
    numBox.style.display = 'none';
    uploadBox.style.display = 'none';
  }
}

function verifyBankNameMatching() {
  const holder = document.getElementById('wzBankAccountHolder').value.trim().toLowerCase();
  const alertBox = document.getElementById('bankNameMatchAlert');
  if (!alertBox) return;

  const ownerName = (currentUser && currentUser.name) ? currentUser.name.trim().toLowerCase() : '';

  if (!holder || !ownerName) {
    alertBox.style.display = 'none';
    return;
  }

  // Clean strings
  const clean = (s) => s.replace(/(mr|mrs|ms|dr|llp|co|inc|pvt|ltd|firm)\.?\s+/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  const cHolder = clean(holder);
  const cOwner = clean(ownerName);

  alertBox.style.display = 'block';
  if (cHolder === cOwner || cHolder.includes(cOwner) || cOwner.includes(cHolder)) {
    alertBox.style.background = 'rgba(34,197,94,0.05)';
    alertBox.style.borderColor = 'rgba(34,197,94,0.15)';
    alertBox.style.color = 'var(--success)';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Account Holder Name matches Property Owner Name ("${currentUser.name}").`;
  } else {
    alertBox.style.background = 'rgba(245,158,11,0.05)';
    alertBox.style.borderColor = 'rgba(245,158,11,0.15)';
    alertBox.style.color = '#fbbf24';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Bank account ownership requires manual verification (Name mismatch: "${currentUser.name}" vs "${document.getElementById('wzBankAccountHolder').value}").`;
  }
}

function validateRoomRequirement() {
  const rooms = parseInt(document.getElementById('wzTotalRooms').value);
  const warning = document.getElementById('roomRequirementWarning');
  if (!warning) return;
  if (!isNaN(rooms) && rooms < 5) {
    warning.style.display = 'block';
  } else {
    warning.style.display = 'none';
  }
}

async function uploadDocFile(docType, fileInputId, labelId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files.length) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const lbl = document.getElementById(labelId);
  lbl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/upload-doc?docType=${docType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('homzo_partner_token')}`
      },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast('Document uploaded successfully!', 'success');
      
      // Update label
      lbl.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-circle-check"></i> Uploaded</span> (<a href="${data.filepath}" target="_blank" style="color:var(--primary)">View</a>)`;
      
      // Update local cache
      const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
      if (pIdx !== -1) {
        switch(docType) {
          case 'aadhaar': currentProperties[pIdx].Aadhaar_Doc = data.filepath; break;
          case 'pan': currentProperties[pIdx].PAN_Doc = data.filepath; break;
          case 'ownerPhoto': currentProperties[pIdx].Owner_Photo_Doc = data.filepath; break;
          case 'incorporation': currentProperties[pIdx].Incorporation_Doc = data.filepath; break;
          case 'authorization': currentProperties[pIdx].Authorization_Doc = data.filepath; break;
          case 'ownership': currentProperties[pIdx].Ownership_Doc = data.filepath; break;
          case 'rentAgreement': currentProperties[pIdx].Rent_Agreement_Doc = data.filepath; break;
          case 'noc': currentProperties[pIdx].NOC_Doc = data.filepath; break;
          case 'gst': currentProperties[pIdx].GST_Doc = data.filepath; break;
          case 'businessRegistration': currentProperties[pIdx].Business_Registration_Doc = data.filepath; break;
          case 'fireSafety': currentProperties[pIdx].Fire_Safety_Doc = data.filepath; break;
          case 'police': currentProperties[pIdx].Police_Verification_Doc = data.filepath; break;
          case 'tradeLicense': currentProperties[pIdx].Trade_License_Doc = data.filepath; break;
          case 'fssai': currentProperties[pIdx].FSSAI_Doc = data.filepath; break;
          case 'cheque': currentProperties[pIdx].Cancelled_Cheque_Doc = data.filepath; break;
        }
      }
    } else {
      lbl.innerHTML = `<span style="color:var(--danger)">Upload Failed</span>`;
      showToast('Document upload failed.', 'error');
    }
  } catch (err) {
    lbl.innerHTML = `<span style="color:var(--danger)">Error</span>`;
    showToast('Network error during upload.', 'error');
  }
}

async function saveWzDraft() {
  if (!selectedPropertyId) return false;
  
  const payload = {
    Name: document.getElementById('editPropName').value.trim(),
    Type: document.getElementById('editPropType').value,
    Address: document.getElementById('wzAddress').value.trim(),
    City: document.getElementById('wzCity').value.trim(),
    State: document.getElementById('wzState').value.trim(),
    Pincode: document.getElementById('wzPincode').value.trim(),
    Google_Maps_Link: document.getElementById('wzGmapsLink').value.trim(),
    Latitude: parseFloat(document.getElementById('wzLatitude').value) || null,
    Longitude: parseFloat(document.getElementById('wzLongitude').value) || null,
    Contact_Person: document.getElementById('wzContactPerson').value.trim(),
    Phone: document.getElementById('wzPropPhone').value.trim(),
    Email: document.getElementById('wzPropEmail').value.trim(),
    Total_Rooms: parseInt(document.getElementById('wzTotalRooms').value) || null,
    Available_Rooms: parseInt(document.getElementById('wzAvailableRooms').value) || null,
    Max_Guests: parseInt(document.getElementById('wzMaxGuests').value) || null,
    Bank_Account_Holder: document.getElementById('wzBankAccountHolder').value.trim(),
    Bank_Account_Number: document.getElementById('wzBankAccountNumber').value.trim(),
    Bank_IFSC: document.getElementById('wzBankIfsc').value.trim(),
    Registration_Status: document.getElementById('wzEntityType').value === 'Individual' ? 'Unregistered' : 'Registered',
    Partner_Agreement_Accepted: document.getElementById('chkAcceptAgreement').checked,
    Policies: document.getElementById('editPropPolicies').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/onboarding`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Onboarding draft saved successfully.', 'success');
      
      // Update local properties cache
      const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
      if (pIdx !== -1) {
        currentProperties[pIdx] = { ...currentProperties[pIdx], ...payload };
      }
      return true;
    } else {
      showToast('Failed to save onboarding draft.', 'error');
      return false;
    }
  } catch (err) {
    showToast('Connection error while saving.', 'error');
    return false;
  }
}

async function submitWzOnboarding() {
  const rooms = parseInt(document.getElementById('wzTotalRooms').value);
  if (isNaN(rooms) || rooms < 5) {
    showToast("This property currently does not meet Homzo's minimum room requirement (minimum 5 rentable rooms).", 'error');
    return;
  }

  if (!document.getElementById('chkAcceptAgreement').checked) {
    showToast('You must accept the Partner Agreement before submitting.', 'error');
    return;
  }

  // Save draft first
  const draftSaved = await saveWzDraft();
  if (!draftSaved) return;

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/submit`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (res.ok) {
      showToast('Property submitted for verification!', 'success');
      
      // Refresh page properties data
      loadPropertiesData();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Failed to submit property.', 'error');
    }
  } catch (e) {
    showToast('Connection error during submission.', 'error');
  }
}

function addWzRoomCategory() {
  wzRoomCategories.push({
    name: 'Standard Room',
    type: 'deluxe',
    roomsCount: 1,
    maxGuests: 2,
    bedType: 'queen',
    ac: true,
    price: 2000
  });
  renderWzRoomCategories();
}

function removeWzRoomCategory(idx) {
  wzRoomCategories.splice(idx, 1);
  renderWzRoomCategories();
}

function renderWzRoomCategories() {
  const container = document.getElementById('wzRoomCategoriesList');
  if (!container) return;

  if (wzRoomCategories.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:12px;">No room categories configured yet.</div>`;
    return;
  }

  container.innerHTML = wzRoomCategories.map((c, i) => `
    <div style="border:1px solid var(--border); padding:14px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.01); display:grid; grid-template-columns:1fr 1fr; gap:12px; position:relative;">
      <button type="button" class="act-btn" style="position:absolute; top:8px; right:8px; color:var(--danger); border:none; background:none; cursor:pointer;" onclick="removeWzRoomCategory(${i})"><i class="fa-solid fa-trash"></i></button>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.72rem;">Room Name</label>
        <input type="text" class="form-control" style="padding:4px 8px; font-size:0.8rem;" value="${c.name}" onchange="updateWzRoomField(${i}, 'name', this.value)">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.72rem;">Bed Type</label>
        <input type="text" class="form-control" style="padding:4px 8px; font-size:0.8rem;" value="${c.bedType}" onchange="updateWzRoomField(${i}, 'bedType', this.value)">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.72rem;">Number of Rooms</label>
        <input type="number" class="form-control" style="padding:4px 8px; font-size:0.8rem;" value="${c.roomsCount}" onchange="updateWzRoomField(${i}, 'roomsCount', parseInt(this.value))">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.72rem;">Base Price (₹)</label>
        <input type="number" class="form-control" style="padding:4px 8px; font-size:0.8rem;" value="${c.price}" onchange="updateWzRoomField(${i}, 'price', parseInt(this.value))">
      </div>
    </div>
  `).join('');
}

function updateWzRoomField(idx, field, value) {
  wzRoomCategories[idx][field] = value;
  
  // Automatically sync to propOnboardingForm metadata payload
  // We can write it back to PartnerMeta when saving draft
}

function toggleAgreementChecked() {
  const checked = document.getElementById('chkAcceptAgreement').checked;
  document.getElementById('chkDeclTrue1').checked = checked;
  document.getElementById('chkDeclTrue2').checked = checked;
  document.getElementById('chkDeclTrue3').checked = checked;
}
