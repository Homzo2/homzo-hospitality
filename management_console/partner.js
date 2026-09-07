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
  updatePartnerUiDetails(currentUser.name, currentUser.avatar);
  
  // Init data loading
  switchPage('dashboard');
  loadNotifications();
}

function updatePartnerUiDetails(name, avatar) {
  const dispName = name || 'Partner';
  const nameEl = document.getElementById('partnerName');
  if (nameEl) nameEl.textContent = dispName;
  
  const topbarProfile = document.getElementById('topbarProfileName');
  if (topbarProfile) topbarProfile.textContent = dispName;
  
  const avEl = document.getElementById('partnerAvatar');
  if (avEl) {
    if (avatar) {
      avEl.innerHTML = `<img src="${avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      avEl.textContent = dispName.charAt(0).toUpperCase();
    }
  }

  const welcomeEl = document.getElementById('welcomeHeader');
  if (welcomeEl) {
    welcomeEl.innerHTML = `Welcome back, ${dispName}! 👋`;
  }
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
  if (name === 'profile') loadProfileData();
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

  // Partner Profile Form Submit
  const partnerProfileForm = document.getElementById('partnerProfileForm');
  if (partnerProfileForm) {
    partnerProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveProfileBtn');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
      }

      const payload = {
        name: document.getElementById('profName').value.trim(),
        businessName: document.getElementById('profBusinessName').value.trim(),
        phone: document.getElementById('profPhone').value.trim(),
        alternatePhone: document.getElementById('profAlternatePhone').value.trim(),
        pincode: document.getElementById('profPincode').value.trim(),
        address: document.getElementById('profAddress').value.trim(),
        city: document.getElementById('profCity').value.trim(),
        state: document.getElementById('profState').value.trim()
      };

      try {
        const res = await fetch(`${API_BASE}/partner/profile`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          showToast(data.message || 'Profile updated successfully!', 'success');
          currentUser.name = payload.name;
          updatePartnerUiDetails(payload.name, currentUser.avatar);
          loadProfileData();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        showToast('Connection error updating profile.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.innerHTML = origText;
          saveBtn.disabled = false;
        }
      }
    });
  }

  // Password Change Form Submit
  const partnerPasswordForm = document.getElementById('partnerPasswordForm');
  if (partnerPasswordForm) {
    partnerPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmNewPassword = document.getElementById('confirmNewPassword').value;

      if (newPassword !== confirmNewPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }
      if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      const updateBtn = document.getElementById('updatePasswordBtn');
      const origText = updateBtn ? updateBtn.innerHTML : '';
      if (updateBtn) {
        updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
        updateBtn.disabled = true;
      }

      try {
        const res = await fetch(`${API_BASE}/partner/change-password`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (res.ok) {
          showToast('Password changed successfully!', 'success');
          document.getElementById('currPassword').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('confirmNewPassword').value = '';
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update password.', 'error');
        }
      } catch (err) {
        showToast('Connection error changing password.', 'error');
      } finally {
        if (updateBtn) {
          updateBtn.innerHTML = origText;
          updateBtn.disabled = false;
        }
      }
    });
  }

  // KYC details form submit
  const kycDetailsForm = document.getElementById('kycDetailsForm');
  if (kycDetailsForm) {
    kycDetailsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveKycDetailsBtn');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        saveBtn.disabled = true;
      }

      const payload = {
        entityType: document.getElementById('kycEntityType').value,
        aadhaar: document.getElementById('kycAadhaar').value.trim(),
        pan: document.getElementById('kycPan').value.trim().toUpperCase(),
        gst: document.getElementById('kycGst').value.trim().toUpperCase(),
        bankHolder: document.getElementById('kycBankHolder').value.trim(),
        bankName: document.getElementById('kycBankName').value.trim(),
        bankAccount: document.getElementById('kycAccount').value.trim(),
        bankIfsc: document.getElementById('kycIfsc').value.trim().toUpperCase()
      };

      try {
        const res = await fetch(`${API_BASE}/partner/verification`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast('Verification KYC details submitted successfully for admin review!', 'success');
          loadVerificationData();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to save KYC details.', 'error');
        }
      } catch (err) {
        showToast('Server KYC update error.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.innerHTML = origText;
          saveBtn.disabled = false;
        }
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
      const priorityEl = document.getElementById('ticketPriority');
      const priority = priorityEl ? priorityEl.value : 'Normal';
      const message = document.getElementById('ticketMessage').value.trim();

      const submitBtn = document.getElementById('btnSubmitTicket') || ticketForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
      }

      try {
        const res = await fetch(`${API_BASE}/partner/tickets`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ subject, category, priority, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Support ticket raised successfully! Our team will respond shortly.', 'success');
          ticketForm.reset();
          await loadSupportTickets();
        } else {
          showToast(data.error || 'Failed to raise ticket.', 'error');
        }
      } catch (err) {
        showToast('Support server error.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
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
        <div style="display:flex; align-items:center; gap:4px; margin-bottom:6px;">
          <button class="sidebar-link" style="flex:1; text-align:left; border:1px solid var(--border); border-radius:var(--radius-sm); background:${selectedPropertyId === p.id ? 'var(--primary-glow)' : 'none'}; color:${selectedPropertyId === p.id ? 'var(--primary)' : 'var(--text-primary)'}; margin:0;" onclick="selectProperty(${p.id})">
            <i class="fa-solid fa-hotel"></i> ${p.name}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" title="Delete this property" onclick="deletePartnerProperty(event, ${p.id}, '${p.name.replace(/'/g, "\\'")}')" style="padding:6px 8px; color:var(--danger); border-radius:var(--radius-sm); background:rgba(239,68,68,0.06);">
            <i class="fa-solid fa-trash-can" style="font-size:0.75rem;"></i>
          </button>
        </div>`).join('');
        
      if (!selectedPropertyId) {
        selectProperty(currentProperties[0].id);
      } else {
        selectProperty(selectedPropertyId);
      }
    } else {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:16px 8px; color:var(--text-muted); font-size:0.8rem;">
          <p style="margin-bottom:10px;">No properties added yet.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="openAddPropertyModal()" style="font-size:0.75rem; width:100%; justify-content:center; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-plus"></i> Add Property
          </button>
        </div>`;
      document.getElementById('propDetailsEditor').style.display = 'none';
      document.getElementById('noPropSelected').style.display = 'flex';
      selectedPropertyId = null;
    }
  } catch (err) {
    console.error(err);
  }
}

// ─── Modal & Add Property Handlers ──────────────────
window.openAddPropertyModal = function() {
  const modal = document.getElementById('addPropertyModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const nameInput = document.getElementById('newPropName');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  }
};

window.closeAddPropertyModal = function() {
  const modal = document.getElementById('addPropertyModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.handleAddNewProperty = async function(event) {
  if (event) event.preventDefault();
  const name = document.getElementById('newPropName').value.trim();
  const type = document.getElementById('newPropType').value;
  const city = document.getElementById('newPropCity').value.trim();
  const totalRooms = parseInt(document.getElementById('newPropRooms').value) || 10;
  const address = document.getElementById('newPropAddress').value.trim();

  if (!name) {
    showToast('Please enter property name', 'error');
    return;
  }
  if (totalRooms < 5) {
    showToast("Homzo requires a minimum of 5 rentable rooms", 'error');
    return;
  }

  const btn = document.getElementById('btnSubmitNewProp');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
  }

  try {
    const res = await fetch(`${API_BASE}/partner/properties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, city, address, totalRooms })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Property created successfully! Opening configuration...', 'success');
      closeAddPropertyModal();
      document.getElementById('addPropertyForm').reset();
      selectedPropertyId = (data.property && (data.property.id || data.property.ID)) || data.id;
      await loadPropertiesData();
      if (typeof switchWzStep === 'function') switchWzStep(1);
    } else {
      showToast(data.error || 'Failed to create property.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error while creating property.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.deletePartnerProperty = async function(event, id, name) {
  if (event) event.stopPropagation();
  if (!confirm(`Are you sure you want to delete "${name}" from your account?`)) return;

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Property deleted successfully.', 'success');
      if (selectedPropertyId === id) selectedPropertyId = null;
      await loadPropertiesData();
    } else {
      showToast(data.error || 'Failed to delete property.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error while deleting property.', 'error');
  }
};

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
let partnerRevenueLedger = [];

function getNextPayoutDate() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  let target;
  if (d <= 10) {
    target = new Date(y, m, 10);
  } else if (d <= 25) {
    target = new Date(y, m, 25);
  } else {
    target = new Date(y, m + 1, 10);
  }
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadRevenueData() {
  try {
    const nextPayoutEl = document.getElementById('nextPayoutDate');
    if (nextPayoutEl) nextPayoutEl.textContent = getNextPayoutDate();

    const res = await fetch(`${API_BASE}/partner/revenue`, { headers: getHeaders() });
    if (!res.ok) return;
    partnerRevenueLedger = await res.json();
    if (!Array.isArray(partnerRevenueLedger)) partnerRevenueLedger = [];

    let gross = 0;
    let commission = 0;
    let net = 0;

    partnerRevenueLedger.forEach(item => {
      gross += Number(item.amount || 0);
      commission += Number(item.commission || 0);
      net += Number(item.netPayout || 0);
    });

    const grossEl = document.getElementById('payoutGross');
    const commEl = document.getElementById('payoutCommission');
    const netEl = document.getElementById('payoutNet');

    if (grossEl) grossEl.textContent = '₹' + gross.toLocaleString();
    if (commEl) commEl.textContent = '₹' + commission.toLocaleString();
    if (netEl) netEl.textContent = '₹' + net.toLocaleString();

    renderRevenueLedger(partnerRevenueLedger);
  } catch (err) {
    console.error('Error loading partner revenue:', err);
  }
}

function renderRevenueLedger(records) {
  const tbody = document.getElementById('revenueTbody');
  if (!tbody) return;

  const countBadge = document.getElementById('ledgerCountBadge');
  if (countBadge) {
    countBadge.textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
  }

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--text-muted);"><i class="fa-solid fa-receipt" style="font-size:1.5rem; display:block; margin-bottom:8px; opacity:0.4;"></i>No payout transactions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(item => `
    <tr>
      <td style="font-weight:700; color:var(--primary);">${item.bookingId || '—'}</td>
      <td><strong>${item.guestName || 'Guest'}</strong></td>
      <td>₹${Number(item.amount || 0).toLocaleString()}</td>
      <td style="color:var(--danger); font-weight:600;">₹${Number(item.commission || 0).toLocaleString()}</td>
      <td style="color:var(--success); font-weight:700;">₹${Number(item.netPayout || 0).toLocaleString()}</td>
      <td>${item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
      <td><span class="badge badge-success" style="font-size:0.75rem; padding: 4px 10px;"><i class="fa-solid fa-check-circle" style="font-size:0.7rem; margin-right:4px;"></i>${item.status || 'Settled'}</span></td>
    </tr>
  `).join('');
}

function filterLedgerTable() {
  const q = (document.getElementById('ledgerSearchInput')?.value || '').toLowerCase().trim();
  if (!q) {
    renderRevenueLedger(partnerRevenueLedger);
    return;
  }
  const filtered = partnerRevenueLedger.filter(item => 
    (item.bookingId && item.bookingId.toLowerCase().includes(q)) ||
    (item.guestName && item.guestName.toLowerCase().includes(q))
  );
  renderRevenueLedger(filtered);
}

function exportLedgerCsv() {
  if (!partnerRevenueLedger || partnerRevenueLedger.length === 0) {
    showToast('No payout transactions available to export.', 'info');
    return;
  }
  const headers = ['Booking Ref', 'Guest Name', 'Amount Received', 'Homzo Fee (15%)', 'Net Payout Value', 'Date Processed', 'Status'];
  const rows = partnerRevenueLedger.map(item => [
    `"${item.bookingId || ''}"`,
    `"${(item.guestName || '').replace(/"/g, '""')}"`,
    item.amount || 0,
    item.commission || 0,
    item.netPayout || 0,
    `"${item.date || ''}"`,
    `"${item.status || 'Settled'}"`
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `homzo_payouts_ledger_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Payout ledger exported successfully.', 'success');
}

// ─── Personal Profile Loader ───────────────────────────
async function loadProfileData() {
  try {
    const res = await fetch(`${API_BASE}/partner/profile`, { headers: getHeaders() });
    if (!res.ok) return;
    const p = await res.json();

    // Populate form inputs
    if (document.getElementById('profName')) document.getElementById('profName').value = p.name || '';
    if (document.getElementById('profBusinessName')) document.getElementById('profBusinessName').value = p.businessName || '';
    if (document.getElementById('profEmail')) document.getElementById('profEmail').value = p.email || '';
    if (document.getElementById('profPhone')) document.getElementById('profPhone').value = p.phone || '';
    if (document.getElementById('profAlternatePhone')) document.getElementById('profAlternatePhone').value = p.alternatePhone || '';
    if (document.getElementById('profPincode')) document.getElementById('profPincode').value = p.pincode || '';
    if (document.getElementById('profAddress')) document.getElementById('profAddress').value = p.address || '';
    if (document.getElementById('profCity')) document.getElementById('profCity').value = p.city || '';
    if (document.getElementById('profState')) document.getElementById('profState').value = p.state || '';

    // Update Hero Card details
    if (document.getElementById('heroProfileName')) document.getElementById('heroProfileName').textContent = p.name || 'Partner';
    if (document.getElementById('heroProfileEmail')) document.getElementById('heroProfileEmail').textContent = p.email || '';
    if (document.getElementById('heroProfilePhone')) document.getElementById('heroProfilePhone').textContent = p.phone || 'Not added';
    if (document.getElementById('heroPartnerId')) document.getElementById('heroPartnerId').textContent = '#' + (p.id || '1');
    if (document.getElementById('heroMemberSince')) {
      document.getElementById('heroMemberSince').textContent = p.dateCreated ? new Date(p.dateCreated).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '2026';
    }

    // Update state and UI
    currentUser.name = p.name;
    currentUser.avatar = p.avatar;
    updatePartnerUiDetails(p.name, p.avatar);

    const img = document.getElementById('profilePhotoImg');
    const initial = document.getElementById('profilePhotoInitial');
    if (img && initial) {
      if (p.avatar) {
        img.src = p.avatar;
        img.style.display = 'block';
        initial.style.display = 'none';
      } else {
        img.style.display = 'none';
        initial.style.display = 'inline';
        initial.textContent = (p.name || 'P').charAt(0).toUpperCase();
      }
    }

    // Status Badges
    const kycStatus = (p.verificationStatus || 'pending').toUpperCase();
    const heroKycBadge = document.getElementById('heroKycBadge');
    const cardKycStatusText = document.getElementById('cardKycStatusText');
    const sidebarKycBadge = document.getElementById('sidebarKycBadge');
    const verificationBadge = document.getElementById('verificationStatusBadge');

    if (heroKycBadge) {
      heroKycBadge.textContent = 'KYC ' + kycStatus;
      if (kycStatus === 'VERIFIED') {
        heroKycBadge.style.background = 'rgba(34,197,94,0.15)';
        heroKycBadge.style.color = 'var(--success)';
      } else if (kycStatus === 'REJECTED') {
        heroKycBadge.style.background = 'rgba(239,68,68,0.15)';
        heroKycBadge.style.color = 'var(--danger)';
      } else {
        heroKycBadge.style.background = 'rgba(245,158,11,0.15)';
        heroKycBadge.style.color = 'var(--warning)';
      }
    }

    if (cardKycStatusText) {
      cardKycStatusText.textContent = kycStatus;
      cardKycStatusText.style.color = kycStatus === 'VERIFIED' ? 'var(--success)' : (kycStatus === 'REJECTED' ? 'var(--danger)' : 'var(--warning)');
    }

    if (sidebarKycBadge) {
      sidebarKycBadge.textContent = kycStatus;
      sidebarKycBadge.className = `badge badge-sm badge-${kycStatus === 'VERIFIED' ? 'success' : (kycStatus === 'REJECTED' ? 'danger' : 'warning')}`;
    }

    if (verificationBadge) {
      verificationBadge.textContent = 'KYC ' + kycStatus;
      verificationBadge.style.color = kycStatus === 'VERIFIED' ? 'var(--success)' : (kycStatus === 'REJECTED' ? 'var(--danger)' : 'var(--warning)');
    }
  } catch (err) {
    console.error('Error loading partner profile:', err);
  }
}

// Upload Avatar / Profile Photo
window.handleAvatarUpload = async function(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];

  const formData = new FormData();
  formData.append('avatar', file);

  showToast('Uploading profile picture...', 'info');

  try {
    const res = await fetch(`${API_BASE}/partner/upload-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast('Profile picture updated successfully!', 'success');
      currentUser.avatar = data.avatar;
      updatePartnerUiDetails(currentUser.name, data.avatar);
      
      const img = document.getElementById('profilePhotoImg');
      const initial = document.getElementById('profilePhotoInitial');
      if (img && initial) {
        img.src = data.avatar;
        img.style.display = 'block';
        initial.style.display = 'none';
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to upload photo.', 'error');
    }
  } catch (err) {
    showToast('Network error uploading avatar.', 'error');
  }
};

// ─── Verification & KYC Loader ──────────────────────
async function loadVerificationData() {
  try {
    const res = await fetch(`${API_BASE}/partner/verification`, { headers: getHeaders() });
    if (!res.ok) return;
    const kyc = await res.json();

    if (document.getElementById('kycEntityType')) document.getElementById('kycEntityType').value = kyc.entityType || 'Individual';
    if (document.getElementById('kycAadhaar')) document.getElementById('kycAadhaar').value = kyc.aadhaar || '';
    if (document.getElementById('kycPan')) document.getElementById('kycPan').value = kyc.pan || '';
    if (document.getElementById('kycGst')) document.getElementById('kycGst').value = kyc.gst || '';
    if (document.getElementById('kycBankHolder')) document.getElementById('kycBankHolder').value = kyc.bankHolder || '';
    if (document.getElementById('kycBankName')) document.getElementById('kycBankName').value = kyc.bankName || '';
    if (document.getElementById('kycAccount')) document.getElementById('kycAccount').value = kyc.bankAccount || '';
    if (document.getElementById('kycIfsc')) document.getElementById('kycIfsc').value = kyc.bankIfsc || '';

    // Verify name match
    verifyKycBankNameMatch();

    // Documents status
    updateKycDocLabel('lblKycAadhaar', kyc.aadhaarDoc);
    updateKycDocLabel('lblKycPan', kyc.panDoc);
    updateKycDocLabel('lblKycGst', kyc.gstDoc);
    updateKycDocLabel('lblKycCheque', kyc.chequeDoc);
    updateKycDocLabel('lblKycAddressProof', kyc.addressProofDoc);

    // Badges update
    const status = (kyc.verificationStatus || 'pending').toLowerCase();
    const badge = document.getElementById('verificationStatusBadge');
    const headerBadge = document.getElementById('kycHeaderBadge');
    const dashBanner = document.getElementById('kycBanner');
    const centerBanner = document.getElementById('kycCenterStatusBanner');
    const centerIcon = document.getElementById('kycCenterIcon');
    const centerTitle = document.getElementById('kycCenterBannerTitle');
    const centerDesc = document.getElementById('kycCenterBannerDesc');
    const sidebarKycBadge = document.getElementById('sidebarKycBadge');

    if (badge) {
      badge.textContent = 'KYC ' + status.toUpperCase();
    }
    if (headerBadge) {
      headerBadge.textContent = status.toUpperCase();
    }
    if (sidebarKycBadge) {
      sidebarKycBadge.textContent = status.toUpperCase();
      sidebarKycBadge.className = `badge badge-sm badge-${status === 'verified' ? 'success' : (status === 'rejected' ? 'danger' : 'warning')}`;
    }

    if (status === 'verified') {
      if (badge) {
        badge.style.color = 'var(--success)';
        badge.style.borderColor = 'rgba(34,197,94,0.3)';
      }
      if (headerBadge) {
        headerBadge.style.background = 'rgba(34,197,94,0.15)';
        headerBadge.style.color = 'var(--success)';
        headerBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> VERIFIED &amp; ACTIVE';
      }
      if (dashBanner) dashBanner.style.display = 'none';

      if (centerBanner) {
        centerBanner.className = 'verification-banner verified';
        if (centerIcon) centerIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--success);"></i>';
        if (centerTitle) centerTitle.textContent = 'KYC Approved &amp; Verified!';
        if (centerDesc) centerDesc.textContent = 'Your identity, compliance documents, and bank details have been verified by Homzo. Automatic booking payouts are enabled.';
      }
    } else if (status === 'rejected') {
      if (badge) {
        badge.style.color = 'var(--danger)';
        badge.style.borderColor = 'rgba(239,68,68,0.3)';
      }
      if (headerBadge) {
        headerBadge.style.background = 'rgba(239,68,68,0.15)';
        headerBadge.style.color = 'var(--danger)';
        headerBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> CORRECTION REQUIRED';
      }
      if (dashBanner) {
        dashBanner.style.display = 'flex';
        dashBanner.className = 'verification-banner rejected';
        dashBanner.querySelector('strong').textContent = 'KYC Submission Rejected';
        dashBanner.querySelector('span').textContent = kyc.kycRemarks || 'Your KYC documents require correction. Please update details and re-upload files.';
      }

      if (centerBanner) {
        centerBanner.className = 'verification-banner rejected';
        if (centerIcon) centerIcon.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i>';
        if (centerTitle) centerTitle.textContent = 'KYC Correction Needed';
        if (centerDesc) centerDesc.textContent = kyc.kycRemarks || 'Admin has requested corrections on your details or documents. Please review and re-submit.';
      }
    } else {
      // Pending
      if (badge) {
        badge.style.color = 'var(--warning)';
        badge.style.borderColor = 'rgba(245,158,11,0.3)';
      }
      if (headerBadge) {
        headerBadge.style.background = 'rgba(245,158,11,0.15)';
        headerBadge.style.color = 'var(--warning)';
        headerBadge.innerHTML = '<i class="fa-solid fa-clock"></i> KYC IN REVIEW';
      }
      if (dashBanner) {
        dashBanner.style.display = 'flex';
        if (kyc.aadhaar || kyc.pan || kyc.bankAccount) {
          dashBanner.className = 'verification-banner';
          dashBanner.querySelector('strong').textContent = 'KYC Review In Progress';
          dashBanner.querySelector('span').textContent = 'Your documents are being reviewed by the Super Admin team. Automatic transfers will activate upon approval.';
          const bBtn = dashBanner.querySelector('button');
          if (bBtn) bBtn.textContent = 'Check Status';
        }
      }

      if (centerBanner) {
        centerBanner.className = 'verification-banner';
        if (centerIcon) centerIcon.innerHTML = '<i class="fa-solid fa-clock-rotate-left" style="color:var(--warning);"></i>';
        if (centerTitle) centerTitle.textContent = 'KYC Review In Progress';
        if (centerDesc) centerDesc.textContent = 'Your identity, bank details, and compliance documents are under review. You can make updates anytime.';
      }
    }
  } catch (err) {
    console.error('Error loading verification data:', err);
  }
}

// Upload Partner KYC Document
window.uploadPartnerKycDoc = async function(docType, fileInputId, labelId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files.length) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const lbl = document.getElementById(labelId);
  if (lbl) lbl.innerHTML = `Status: <span style="color:var(--primary);"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>`;

  try {
    const res = await fetch(`${API_BASE}/partner/upload-kyc-doc?docType=${docType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.message || 'Document uploaded successfully!', 'success');
      updateKycDocLabel(labelId, data.filepath);
      // Reload verification data to sync status
      loadVerificationData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Document upload failed.', 'error');
      if (lbl) lbl.innerHTML = `Status: <span style="color:var(--danger)">Upload Failed</span>`;
    }
  } catch (err) {
    showToast('Network error during document upload.', 'error');
    if (lbl) lbl.innerHTML = `Status: <span style="color:var(--danger)">Error</span>`;
  }
};

function updateKycDocLabel(labelId, filepath) {
  const lbl = document.getElementById(labelId);
  if (!lbl) return;
  if (filepath) {
    lbl.innerHTML = `Status: <span style="color:var(--success); font-weight:600;"><i class="fa-solid fa-circle-check"></i> Uploaded</span> (<a href="${filepath}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:underline;">View Document</a>)`;
  } else {
    lbl.innerHTML = `Status: <span style="color:var(--text-muted);">Not Uploaded</span>`;
  }
}

// Name matching validator
window.verifyKycBankNameMatch = function() {
  const holderInput = document.getElementById('kycBankHolder');
  const alertBox = document.getElementById('kycBankMatchAlert');
  if (!holderInput || !alertBox) return;

  const holder = holderInput.value.trim().toLowerCase();
  const ownerName = (currentUser && currentUser.name) ? currentUser.name.trim().toLowerCase() : '';

  if (!holder || !ownerName) {
    alertBox.style.display = 'none';
    return;
  }

  const clean = s => s.replace(/(mr|mrs|ms|dr|llp|co|inc|pvt|ltd|firm)\.?\s+/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  const cHolder = clean(holder);
  const cOwner = clean(ownerName);

  alertBox.style.display = 'block';
  if (cHolder === cOwner || cHolder.includes(cOwner) || cOwner.includes(cHolder)) {
    alertBox.style.background = 'rgba(34,197,94,0.06)';
    alertBox.style.borderColor = 'rgba(34,197,94,0.25)';
    alertBox.style.color = 'var(--success)';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Account Holder Name matches Partner Profile Name ("${currentUser.name}").`;
  } else {
    alertBox.style.background = 'rgba(245,158,11,0.06)';
    alertBox.style.borderColor = 'rgba(245,158,11,0.25)';
    alertBox.style.color = '#fbbf24';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Account Holder Name ("${holderInput.value}") does not closely match Partner Name ("${currentUser.name}"). Admin manual verification will be required.`;
  }
};

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
let currentTicketFilter = 'all';

window.filterSupportTickets = function(filter) {
  currentTicketFilter = filter;
  ['all', 'open', 'resolved'].forEach(f => {
    const btn = document.getElementById(`tabFilter${f.charAt(0).toUpperCase() + f.slice(1)}`);
    if (btn) {
      if (f === filter) {
        btn.style.background = 'var(--primary)';
        btn.style.color = '#111';
        btn.style.fontWeight = '600';
      } else {
        btn.style.background = 'none';
        btn.style.color = 'var(--text-secondary)';
        btn.style.fontWeight = 'normal';
      }
    }
  });
  renderTicketLog();
};

window.resolvePartnerTicket = async function(id) {
  if (!confirm('Mark this support case as resolved?')) return;
  try {
    const res = await fetch(`${API_BASE}/partner/tickets/${id}/resolve`, {
      method: 'PUT',
      headers: getHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Support ticket marked as resolved.', 'success');
      await loadSupportTickets();
    } else {
      showToast(data.error || 'Failed to update ticket.', 'error');
    }
  } catch (err) {
    showToast('Failed to resolve ticket.', 'error');
  }
};

function renderTicketLog() {
  const log = document.getElementById('ticketLog');
  if (!log) return;

  let filtered = currentTickets;
  if (currentTicketFilter === 'open') {
    filtered = currentTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
  } else if (currentTicketFilter === 'resolved') {
    filtered = currentTickets.filter(t => t.status === 'resolved' || t.status === 'closed');
  }

  if (filtered.length > 0) {
    log.innerHTML = filtered.map(t => {
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      const prio = t.priority || 'Normal';
      let prioBadge = `<span style="background:rgba(59,130,246,0.12); color:#3b82f6; font-size:0.68rem; padding:3px 8px; border-radius:10px; font-weight:600;"><i class="fa-solid fa-flag"></i> ${prio}</span>`;
      if (prio === 'Urgent') {
        prioBadge = `<span style="background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.68rem; padding:3px 8px; border-radius:10px; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> URGENT</span>`;
      } else if (prio === 'High') {
        prioBadge = `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.68rem; padding:3px 8px; border-radius:10px; font-weight:600;"><i class="fa-solid fa-arrow-up"></i> HIGH</span>`;
      }

      const statusBadge = isResolved
        ? `<span class="badge badge-success" style="font-size:0.7rem; padding:3px 8px; background:rgba(34,197,94,0.15); color:var(--success);"><i class="fa-solid fa-circle-check"></i> RESOLVED</span>`
        : `<span class="badge badge-warning" style="font-size:0.7rem; padding:3px 8px; background:rgba(245,158,11,0.15); color:var(--warning);"><i class="fa-solid fa-hourglass-half"></i> OPEN</span>`;

      return `
        <div class="ticket-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
            <div>
              <span style="font-size:0.7rem; color:var(--primary); font-weight:700; letter-spacing:0.5px;">#TKT-${String(t.id).padStart(4, '0')}</span>
              <strong style="display:block; font-size:0.95rem; color:var(--text-primary); margin-top:2px;">${t.subject}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              ${prioBadge}
              ${statusBadge}
            </div>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:10px; display:flex; gap:12px; flex-wrap:wrap;">
            <span><i class="fa-solid fa-folder-open" style="color:var(--primary); margin-right:4px;"></i>${t.category}</span>
            <span><i class="fa-solid fa-calendar-day" style="color:var(--primary); margin-right:4px;"></i>${t.dateCreated ? new Date(t.dateCreated).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }) : 'Recently'}</span>
          </div>
          <p style="font-size:0.83rem; color:var(--text-secondary); line-height:1.45; margin:0 0 10px 0; background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.04);">${t.message}</p>
          ${t.reply ? `
            <div style="background:rgba(212,175,55,0.06); border-left:3px solid var(--primary); padding:10px 12px; border-radius:0 var(--radius-sm) var(--radius-sm) 0; margin-top:10px;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <i class="fa-solid fa-headset" style="color:var(--primary); font-size:0.75rem;"></i>
                <strong style="font-size:0.75rem; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Homzo Operations Team Response:</strong>
              </div>
              <p style="font-size:0.82rem; color:var(--text-primary); margin:0; line-height:1.4;">${t.reply}</p>
            </div>` : `
            <div style="font-size:0.72rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-clock" style="color:var(--warning);"></i> Awaiting review from operations team (SLA: &lt; 2 hours)
            </div>`}
          ${!isResolved ? `
            <div style="display:flex; justify-content:flex-end; margin-top:10px; padding-top:8px; border-top:1px dashed var(--border);">
              <button type="button" class="btn btn-ghost btn-xs" onclick="resolvePartnerTicket(${t.id})" style="font-size:0.72rem; color:var(--text-muted);">
                <i class="fa-solid fa-check"></i> Mark as Resolved
              </button>
            </div>` : ''}
        </div>`;
    }).join('');
  } else {
    log.innerHTML = `
      <div style="text-align:center; padding:36px 16px; color:var(--text-muted);">
        <div style="width:54px; height:54px; border-radius:50%; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
          <i class="fa-solid fa-inbox" style="font-size:24px; color:var(--text-muted);"></i>
        </div>
        <strong style="display:block; font-size:0.95rem; color:var(--text-primary); margin-bottom:4px;">No Support Cases Found</strong>
        <p style="font-size:0.78rem; max-width:280px; margin:0 auto; line-height:1.4;">
          ${currentTicketFilter === 'all' 
            ? 'You currently have no open or past tickets. If you encounter any issue, raise a ticket using the form on the left.' 
            : `No ${currentTicketFilter} support tickets found.`}
        </p>
      </div>`;
  }
}

async function loadSupportTickets() {
  try {
    const res = await fetch(`${API_BASE}/partner/tickets`, { headers: getHeaders() });
    if (!res.ok) return;
    currentTickets = await res.json();
    renderTicketLog();
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
