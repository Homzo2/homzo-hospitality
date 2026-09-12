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
          const resData = await res.json().catch(() => ({}));
          showToast(resData.message || 'Verification OTP sent successfully! Please check your email or phone.', 'success');
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
      const aadhaarVal = document.getElementById('kycAadhaar').value.replace(/\s/g, '');
      const panVal = document.getElementById('kycPan').value.trim().toUpperCase();
      const gstVal = document.getElementById('kycGst').value.trim().toUpperCase();
      const accHolderVal = document.getElementById('kycBankHolder').value.trim();
      const accNumVal = document.getElementById('kycAccount').value.trim();
      const ifscVal = document.getElementById('kycIfsc').value.trim().toUpperCase();

      // Client-side validations
      if (!/^\d{12}$/.test(aadhaarVal)) {
        showToast('Please enter a valid 12-digit numeric Aadhaar Card Number.', 'error');
        return;
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
        showToast('Please enter a valid 10-character PAN Number (e.g. ABCDE1234F).', 'error');
        return;
      }
      if (gstVal && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstVal)) {
        showToast('Please enter a valid 15-character GSTIN format (e.g. 27AAAAA1111A1Z1).', 'error');
        return;
      }
      if (!accHolderVal) {
        showToast('Please enter Bank Account Holder Name.', 'error');
        return;
      }
      if (!/^\d{9,18}$/.test(accNumVal)) {
        showToast('Please enter a valid Bank Account Number (9 to 18 numeric digits).', 'error');
        return;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscVal)) {
        showToast('Please enter a valid 11-character Bank IFSC Code (e.g. HDFC0000123).', 'error');
        return;
      }

      const saveBtn = document.getElementById('saveKycDetailsBtn');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        saveBtn.disabled = true;
      }

      const payload = {
        entityType: document.getElementById('kycEntityType').value,
        aadhaar: aadhaarVal,
        pan: panVal,
        gst: gstVal,
        bankHolder: accHolderVal,
        bankName: document.getElementById('kycBankName').value.trim(),
        bankAccount: accNumVal,
        bankIfsc: ifscVal
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
    
    document.getElementById('dashBookings').textContent = stats.totalBookings || 0;
    document.getElementById('dashOccupancy').textContent = (stats.occupancyRate || 0) + '%';
    document.getElementById('dashEarnings').textContent = '₹' + Math.round(stats.netEarnings || 0).toLocaleString();
    document.getElementById('dashGuests').textContent = stats.activeGuests || 0;

    // Dynamic Occupancy Subtitle
    const occSub = document.getElementById('dashOccupancySub');
    if (occSub) {
      if (!stats.occupancyRate || stats.occupancyRate === 0) {
        occSub.innerHTML = '<i class="fa-solid fa-bed"></i> No active check-ins';
      } else {
        const occCount = stats.occupiedRooms || stats.activeGuests || 0;
        occSub.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> ${occCount} active ${occCount === 1 ? 'room' : 'rooms'} occupied`;
      }
    }

    // Dynamic Commission Rate display
    const commRate = (stats.commissionRate >= 12 && stats.commissionRate <= 20) ? stats.commissionRate : 15;
    const dashCommEl = document.getElementById('dashCommRate');
    if (dashCommEl) {
      dashCommEl.textContent = commRate;
    }

    // Load upcoming list
    await loadUpcomingBookings();

    // Render Dashboard Property Readiness Milestones & Cards
    await renderDashboardPropertiesAndMilestones();
    
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

// ─── Dashboard Properties & Milestones Loader ────────
async function renderDashboardPropertiesAndMilestones() {
  try {
    const res = await fetch(`${API_BASE}/partner/properties`, { headers: getHeaders() });
    if (!res.ok) return;
    currentProperties = await res.json();

    const pctEl = document.getElementById('dashProfilePct');
    const barEl = document.getElementById('dashProfileProgressBar');
    const gridEl = document.getElementById('dashPropsGrid');
    if (!gridEl) return;

    if (currentProperties.length === 0) {
      if (pctEl) pctEl.textContent = '0%';
      if (barEl) barEl.style.width = '0%';
      gridEl.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:36px 16px; background:rgba(255,255,255,0.02); border:1px dashed var(--hz-border); border-radius:var(--hz-radius-md);">
          <div style="width:48px; height:48px; border-radius:50%; background:rgba(212,175,55,0.1); color:var(--hz-gold); display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 12px auto;">
            <i class="fa-solid fa-hotel"></i>
          </div>
          <h4 style="color:#FFFFFF; font-size:1rem; margin-bottom:6px;">No Stays Added Yet</h4>
          <p style="color:var(--hz-text-muted); font-size:0.85rem; margin-bottom:16px;">Begin your journey by adding your hotel, homestay, or resort to HOMZO.</p>
          <button type="button" class="hz-btn-gold" onclick="openAddPropertyModal()" style="font-size:0.85rem; padding:10px 20px;">
            <i class="fa-solid fa-plus"></i> Add Your First Property
          </button>
        </div>`;
      return;
    }

    // Active property or first
    const p = (selectedPropertyId && currentProperties.find(x => x.id === selectedPropertyId)) || currentProperties[0];
    const score = computePropertyReadinessScore(p);

    if (pctEl) pctEl.textContent = `${score}%`;
    if (barEl) barEl.style.width = `${score}%`;

    // Update milestones
    updateMilestoneBadge('ms25', score >= 25, score >= 10);
    updateMilestoneBadge('ms50', score >= 50 || (p.Aadhaar_Doc && p.PAN_Doc), score >= 25);
    updateMilestoneBadge('ms75', score >= 75 || (p.Image && p.Total_Rooms >= 5), score >= 50);
    const isUnderReviewOrLive = ['Submitted', 'KYC Verification', 'Document Verification', 'Property Verification', 'Commercial Approval', 'Approved', 'Live'].includes(p.Onboarding_Stage);
    updateMilestoneBadge('ms100', isUnderReviewOrLive || score >= 95, score >= 75);

    // Render Luxury Property Cards in Grid
    gridEl.innerHTML = currentProperties.map(prop => {
      const comm = (parseFloat(prop.Commission_Rate) >= 12 && parseFloat(prop.Commission_Rate) <= 20) ? parseFloat(prop.Commission_Rate) : 15;
      const stage = prop.Onboarding_Stage || 'Draft';
      const stageBadgeStyle = getStageBadgeStyle(stage);
      const isLive = stage === 'Live';
      const isApproved = stage === 'Approved';

      return `
        <div class="hz-prop-card">
          <div class="hz-prop-card-media">
            <img src="${prop.Image || '/customer_web/hero_room.png'}" alt="${prop.name}">
            <span class="hz-prop-card-badge" style="${stageBadgeStyle}">${stage.toUpperCase()}</span>
          </div>
          <div class="hz-prop-card-body">
            <span class="hz-card-tag">${prop.type || 'Hotel'}</span>
            <h4 class="hz-prop-card-title">HOMZO ${prop.Brand_Name ? `× ${prop.Brand_Name}` : prop.name}</h4>
            <div class="hz-prop-card-meta">
              <span><i class="fa-solid fa-location-dot" style="color:var(--hz-gold);"></i> ${prop.City || 'India'}</span>
              <span><i class="fa-solid fa-bed" style="color:var(--hz-gold);"></i> ${prop.Total_Rooms || 10} Rooms</span>
              <span><i class="fa-solid fa-percent" style="color:var(--hz-gold);"></i> ${comm}% Commission</span>
            </div>
            <div class="hz-prop-card-actions">
              <button type="button" class="hz-btn-gold" onclick="selectProperty(${prop.id}); switchPage('properties');" style="flex:1; justify-content:center;">
                <i class="fa-solid ${isLive ? 'fa-sliders' : 'fa-pen-to-square'}"></i> ${isLive ? 'Manage Stay' : (isApproved ? 'View Approval' : 'Continue Setup')}
              </button>
              <button type="button" class="hz-btn-outline" onclick="selectProperty(${prop.id}); openLiveGuestPreviewModal();" style="padding:8px 12px;" title="Preview Guest View">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error rendering dashboard properties:', err);
  }
}

function computePropertyReadinessScore(p) {
  if (!p) return 0;
  if (['Submitted', 'Approved', 'Live'].includes(p.Onboarding_Stage)) return 100;
  let score = 0;
  if (p.name && p.type) score += 15;
  if (p.Address && p.City) score += 15;
  if (p.Total_Rooms && parseInt(p.Total_Rooms) >= 5) score += 15;
  if (p.Image || p.Owner_Photo_Doc) score += 15;
  if (p.amenities && (Array.isArray(p.amenities) ? p.amenities.length > 0 : p.amenities.length > 2)) score += 10;
  if (p.policies || p.checkInOut) score += 10;
  if (p.Aadhaar_Doc || p.PAN_Doc) score += 10;
  if (p.Bank_Account_Number && p.Bank_IFSC) score += 10;
  return Math.min(100, Math.max(10, score));
}

function updateMilestoneBadge(id, isCompleted, isActive) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('completed', 'active');
  if (isCompleted) {
    el.classList.add('completed');
  } else if (isActive) {
    el.classList.add('active');
  }
}

function getStageBadgeStyle(stage) {
  switch(stage) {
    case 'Live':
      return 'background:rgba(34,197,94,0.25); color:#4ADE80; border:1px solid rgba(74,222,128,0.4);';
    case 'Approved':
      return 'background:rgba(34,197,94,0.2); color:#4ADE80; border:1px solid rgba(74,222,128,0.3);';
    case 'Submitted':
    case 'KYC Verification':
    case 'Document Verification':
    case 'Property Verification':
    case 'Commercial Approval':
      return 'background:rgba(59,130,246,0.2); color:#60A5FA; border:1px solid rgba(96,165,250,0.3);';
    case 'Correction Required':
      return 'background:rgba(239,68,68,0.2); color:#F87171; border:1px solid rgba(248,113,113,0.3);';
    default:
      return 'background:rgba(255,255,255,0.1); color:#E2E8F0; border:1px solid rgba(255,255,255,0.15);';
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
  const commissionRate = parseFloat(document.getElementById('newPropCommission')?.value || 15);

  if (!name) {
    showToast('Please enter property name', 'error');
    return;
  }
  if (totalRooms < 5) {
    showToast("Homzo requires a minimum of 5 rentable rooms", 'error');
    return;
  }
  if (isNaN(commissionRate) || commissionRate < 12 || commissionRate > 20) {
    showToast('Platform Commission Rate must be between 12% and 20%.', 'error');
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
      body: JSON.stringify({ name, type, city, address, totalRooms, commissionRate })
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

async function selectProperty(id) {
  selectedPropertyId = id;
  let p = currentProperties.find(x => x.id === id);
  if (!p) return;

  // Highlight list item
  document.querySelectorAll('#partnerPropList button').forEach((btn, idx) => {
    const matched = currentProperties[idx] && currentProperties[idx].id === id;
    btn.style.background = matched ? 'rgba(212,175,55,0.15)' : 'none';
    btn.style.color = matched ? 'var(--hz-gold)' : 'var(--text-primary)';
  });

  document.getElementById('propDetailsEditor').style.display = 'block';
  document.getElementById('noPropSelected').style.display = 'none';

  // Fetch full onboarding metadata from server
  try {
    const res = await fetch(`${API_BASE}/partner/properties/${id}/onboarding`, { headers: getHeaders() });
    if (res.ok) {
      const fullProp = await res.json();
      p = { ...p, ...fullProp };
      const pIdx = currentProperties.findIndex(x => x.id === id);
      if (pIdx !== -1) currentProperties[pIdx] = p;
    }
  } catch (e) {
    console.warn('Could not fetch rich onboarding metadata:', e);
  }

  // Stepper Header Property Name
  const stepperPropDisp = document.getElementById('stepperPropNameDisplay');
  if (stepperPropDisp) {
    stepperPropDisp.textContent = p.name || 'Property Builder';
  }

  // Hidden IDs
  document.getElementById('editPropId').value = p.id;
  
  // Step 1: Property Type
  const propType = p.type || 'Hotel';
  document.getElementById('editPropType').value = propType;
  selectPropertyTypeCard(propType);

  // Step 2: Basics
  document.getElementById('editPropName').value = p.name || '';
  const brandInput = document.getElementById('editBrandName');
  if (brandInput) brandInput.value = p.Brand_Name || '';

  document.getElementById('wzContactPerson').value = p.Contact_Person || '';
  document.getElementById('wzPropPhone').value = p.Phone || '';
  document.getElementById('wzPropEmail').value = p.Email || '';

  const totalRooms = parseInt(p.Total_Rooms) || parseInt(p.Inventory) || 10;
  document.getElementById('wzTotalRooms').value = totalRooms;
  const roomsDisp = document.getElementById('bldRoomsDisplay');
  if (roomsDisp) {
    if (roomsDisp.tagName === 'INPUT') roomsDisp.value = totalRooms;
    else roomsDisp.textContent = totalRooms;
  }
  document.getElementById('wzAvailableRooms').value = p.Available_Rooms || totalRooms;
  document.getElementById('wzMaxGuests').value = p.Max_Guests || (totalRooms * 2);
  const guestsDisp = document.getElementById('bldGuestsDisplay');
  if (guestsDisp) guestsDisp.textContent = p.Max_Guests || (totalRooms * 2);

  const roomValBadge = document.getElementById('roomCountValidationBadge');
  if (roomValBadge) {
    if (totalRooms >= 5) {
      roomValBadge.innerHTML = '<span style="color:var(--hz-success);"><i class="fa-solid fa-circle-check"></i> Meets Homzo minimum requirement (5+ rooms)</span>';
    } else {
      roomValBadge.innerHTML = '<span style="color:var(--hz-warning);"><i class="fa-solid fa-triangle-exclamation"></i> Homzo requires minimum 5 rooms for onboarding</span>';
    }
  }

  // Step 3: Location
  document.getElementById('wzAddress').value = p.Address || '';
  document.getElementById('wzCity').value = p.City || '';
  document.getElementById('wzState').value = p.State || '';
  document.getElementById('wzPincode').value = p.Pincode || '';
  document.getElementById('wzGmapsLink').value = p.Google_Maps_Link || '';
  document.getElementById('wzLatitude').value = p.Latitude || '';
  document.getElementById('wzLongitude').value = p.Longitude || '';
  const locSummary = document.getElementById('bldLocationSummary');
  if (locSummary) {
    locSummary.textContent = (p.Address ? p.Address + ', ' : '') + (p.City || 'Location preview') + (p.Pincode ? ' - ' + p.Pincode : '');
  }

  // Step 4 & 5: Room Categories & Room Photos
  if (Array.isArray(p.roomCategories) && p.roomCategories.length > 0) {
    builderRoomCategories = JSON.parse(JSON.stringify(p.roomCategories));
  } else {
    builderRoomCategories = [
      {
        name: 'Standard Deluxe',
        type: 'deluxe',
        roomsCount: Math.min(totalRooms, 5),
        maxGuests: 2,
        bedType: 'Queen Bed',
        ac: true,
        price: 1800,
        photos: []
      }
    ];
  }
  renderBuilderRoomCategories();
  renderRoomPhotosPerCategory();

  // Step 6: Cover & Property Photos
  const coverImg = document.getElementById('bldCoverPreviewImg');
  if (coverImg) {
    coverImg.src = p.Image || '/customer_web/hero_room.png';
  }
  builderPropertyGallery = Array.isArray(p.propertyPhotos) ? [...p.propertyPhotos] : [];
  renderPropertyGallery();

  // Step 7: Amenities & Services
  builderAmenities = new Set();
  if (Array.isArray(p.amenities)) {
    p.amenities.forEach(a => builderAmenities.add(a));
  } else if (typeof p.amenities === 'string' && p.amenities) {
    p.amenities.split(',').map(s => s.trim()).filter(Boolean).forEach(a => builderAmenities.add(a));
  }
  if (builderAmenities.size === 0) {
    builderAmenities.add('WiFi');
    builderAmenities.add('AC');
    builderAmenities.add('Housekeeping');
  }

  document.querySelectorAll('#bldAmenitiesGrid .hz-amenity-pill').forEach(pill => {
    const text = pill.querySelector('span')?.textContent.trim() || '';
    const key = pill.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || text;
    if (builderAmenities.has(key) || builderAmenities.has(text)) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });
  const amenBadge = document.getElementById('bldAmenityCountBadge');
  if (amenBadge) amenBadge.textContent = `${builderAmenities.size} selected`;

  builderServices = new Set();
  if (Array.isArray(p.services)) {
    p.services.forEach(s => builderServices.add(s));
  } else if (typeof p.services === 'string' && p.services) {
    p.services.split(',').map(s => s.trim()).filter(Boolean).forEach(s => builderServices.add(s));
  }
  if (builderServices.size === 0) {
    builderServices.add('24-hour Reception');
    builderServices.add('Daily Housekeeping');
  }

  document.querySelectorAll('#bldServicesGrid .hz-amenity-pill').forEach(pill => {
    const text = pill.querySelector('span')?.textContent.trim() || '';
    const key = pill.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || text;
    if (builderServices.has(key) || builderServices.has(text)) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });

  // Step 8: Brand & Display Live Preview
  updateCoBrandLivePreview();

  // Step 9: Policies
  if (p.checkInOut) {
    if (document.getElementById('bldCheckInTime') && p.checkInOut.checkIn) document.getElementById('bldCheckInTime').value = p.checkInOut.checkIn;
    if (document.getElementById('bldCheckOutTime') && p.checkInOut.checkOut) document.getElementById('bldCheckOutTime').value = p.checkInOut.checkOut;
    if (document.getElementById('bldCancellationPolicy') && p.checkInOut.cancellation) document.getElementById('bldCancellationPolicy').value = p.checkInOut.cancellation;
    if (document.getElementById('bldCouplePolicy') && p.checkInOut.couples) document.getElementById('bldCouplePolicy').value = p.checkInOut.couples;
    if (document.getElementById('bldPetPolicy') && p.checkInOut.pets) document.getElementById('bldPetPolicy').value = p.checkInOut.pets;
    if (document.getElementById('bldSmokingPolicy') && p.checkInOut.smoking) document.getElementById('bldSmokingPolicy').value = p.checkInOut.smoking;
  }
  document.getElementById('editPropPolicies').value = p.policies || '';

  // Step 10: Owner Role & KYC
  const ownerRole = p.Owner_Type || 'Owner';
  document.getElementById('wzOwnerRole').value = ownerRole;
  selectOwnerRoleCard(ownerRole);

  const ownerNameInput = document.getElementById('wzLegalOwnerName');
  if (ownerNameInput) ownerNameInput.value = p.Contact_Person || (currentUser ? currentUser.name : '');
  const ownerPhoneInput = document.getElementById('wzOwnerPhone');
  if (ownerPhoneInput) ownerPhoneInput.value = p.Phone || '';

  document.getElementById('wzAadhaarNum').value = p.Aadhaar_Doc ? 'Aadhaar Verified' : '';
  document.getElementById('wzPanNum').value = p.PAN_Doc ? 'PAN Verified' : '';

  updateUploadLabel('lblPanDoc', p.PAN_Doc);
  updateUploadLabel('lblAadhaarDoc', p.Aadhaar_Doc);
  updateUploadLabel('lblPhotoDoc', p.Owner_Photo_Doc);

  // Step 11: Property Documents
  updateUploadLabel('lblOwnershipDoc', p.Ownership_Doc);
  updateUploadLabel('lblLeaseDoc', p.Rent_Agreement_Doc);
  updateUploadLabel('lblGstDoc', p.GST_Doc);
  updateUploadLabel('lblFireSafetyDoc', p.Fire_Safety_Doc);
  updateUploadLabel('lblTradeDoc', p.Trade_License_Doc);

  // Step 12: Bank Details & Commercials
  document.getElementById('wzBankAccountHolder').value = p.Bank_Account_Holder || '';
  document.getElementById('wzBankName').value = p.Bank_Account_Holder ? (p.Bank_Name || 'Verified Bank') : '';
  document.getElementById('wzBankAccountNumber').value = p.Bank_Account_Number || '';
  document.getElementById('wzBankIfsc').value = p.Bank_IFSC || '';
  updateUploadLabel('lblChequeDoc', p.Cancelled_Cheque_Doc);

  // Commission Rate (12% to 20%, default 15%)
  const propComm = (parseFloat(p.Commission_Rate) >= 12 && parseFloat(p.Commission_Rate) <= 20) ? parseFloat(p.Commission_Rate) : (p.Registration_Status === 'Unregistered' ? 17 : 15);
  const commInput = document.getElementById('wzCommissionRate');
  if (commInput) commInput.value = propComm;
  const commDisp = document.getElementById('bldCommRateDisplay');
  if (commDisp) commDisp.textContent = propComm;
  const shareDisp = document.getElementById('bldShareRateDisplay');
  if (shareDisp) shareDisp.textContent = (100 - propComm);

  // Step 13: Declarations
  const isAccepted = p.Partner_Agreement_Accepted || false;
  if (document.getElementById('chkDeclTrue1')) document.getElementById('chkDeclTrue1').checked = isAccepted;
  if (document.getElementById('chkDeclTrue2')) document.getElementById('chkDeclTrue2').checked = isAccepted;
  if (document.getElementById('chkAcceptAgreement')) document.getElementById('chkAcceptAgreement').checked = isAccepted;

  // Onboarding Stage Banner setup
  updateStageBanner(p);

  // Update builder progress count
  updateBuilderCompletionProgress();

  // Reset to Step 1
  switchBuilderStep(1);
}

function updateStageBanner(p) {
  const stage = p.Onboarding_Stage || 'Draft';
  const banner = document.getElementById('onboardingStageBanner');
  if (banner) banner.style.display = 'flex';

  const brandTag = document.getElementById('propStageBrand');
  const stageTitle = document.getElementById('propStageTitle');
  const stageDesc = document.getElementById('propStageDesc');
  const badgeRight = document.getElementById('badgeStatusRight');
  const correctionBox = document.getElementById('correctionNotesBox');
  const correctionNotes = document.getElementById('propCorrectionNotes');

  if (brandTag) brandTag.textContent = `HOMZO × ${p.Brand_Name || p.name || 'HOTEL'}`;
  if (badgeRight) badgeRight.textContent = stage;
  if (correctionBox) correctionBox.style.display = 'none';

  switch(stage) {
    case 'Draft':
      if (stageTitle) stageTitle.textContent = 'Status: DRAFT MODE';
      if (stageDesc) stageDesc.textContent = 'Your onboarding application is in Draft. Fill out the 12 guided steps and click Submit.';
      if (badgeRight) { badgeRight.style.background = 'rgba(255,255,255,0.05)'; badgeRight.style.color = 'var(--text-primary)'; }
      break;
    case 'Submitted':
      if (stageTitle) stageTitle.textContent = 'Status: SUBMITTED FOR HOMZO REVIEW';
      if (stageDesc) stageDesc.textContent = 'Your property details and documents have been submitted. Our compliance team is reviewing them.';
      if (badgeRight) { badgeRight.style.background = 'rgba(59,130,246,0.15)'; badgeRight.style.color = 'var(--info)'; }
      break;
    case 'KYC Verification':
      if (stageTitle) stageTitle.textContent = 'Status: KYC VERIFICATION IN PROGRESS';
      if (stageDesc) stageDesc.textContent = 'Super admin is validating your identity documents (PAN & Aadhaar).';
      if (badgeRight) { badgeRight.style.background = 'rgba(245,158,11,0.15)'; badgeRight.style.color = 'var(--warning)'; }
      break;
    case 'Document Verification':
      if (stageTitle) stageTitle.textContent = 'Status: DOCUMENT VERIFICATION';
      if (stageDesc) stageDesc.textContent = 'Super admin is validating property deeds and operating agreements.';
      if (badgeRight) { badgeRight.style.background = 'rgba(245,158,11,0.15)'; badgeRight.style.color = 'var(--warning)'; }
      break;
    case 'Property Verification':
      if (stageTitle) stageTitle.textContent = 'Status: PROPERTY AUDIT';
      if (stageDesc) stageDesc.textContent = 'HOMZO quality managers are checking rooms, amenities, and photography quality.';
      if (badgeRight) { badgeRight.style.background = 'rgba(139,92,246,0.15)'; badgeRight.style.color = '#a78bfa'; }
      break;
    case 'Commercial Approval':
      if (stageTitle) stageTitle.textContent = 'Status: COMMERCIAL TERMS SETTLED';
      if (stageDesc) stageDesc.textContent = `Commercial structure (${p.Commission_Rate || 15}%) and bank payout route confirmed.`;
      if (badgeRight) { badgeRight.style.background = 'rgba(34,197,94,0.15)'; badgeRight.style.color = 'var(--success)'; }
      break;
    case 'Approved':
      if (stageTitle) stageTitle.textContent = 'Status: APPROVED BY HOMZO';
      if (stageDesc) stageDesc.textContent = 'Congratulations! Your property is officially approved. HOMZO admin will transition your stay to LIVE.';
      if (badgeRight) { badgeRight.style.background = 'rgba(34,197,94,0.15)'; badgeRight.style.color = 'var(--success)'; }
      break;
    case 'Live':
      if (stageTitle) stageTitle.textContent = 'Status: ACTIVE / LIVE ON HOMZO';
      if (stageDesc) stageDesc.textContent = 'Your property is currently live and bookable by travelers. Payouts and bookings active.';
      if (badgeRight) { badgeRight.style.background = 'rgba(34,197,94,0.3)'; badgeRight.style.color = 'var(--success)'; }
      break;
    case 'Correction Required':
      if (stageTitle) stageTitle.textContent = 'Status: CORRECTION REQUIRED';
      if (stageDesc) stageDesc.textContent = 'Action needed: Super admin requested revisions on specific details. See comments below.';
      if (badgeRight) { badgeRight.style.background = 'rgba(239,68,68,0.15)'; badgeRight.style.color = 'var(--danger)'; }
      if (p.Correction_Notes && correctionBox && correctionNotes) {
        correctionBox.style.display = 'block';
        correctionNotes.textContent = p.Correction_Notes;
      }
      break;
  }
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

      // Update active inventory badge
      const propObj = currentProperties.find(x => x.id === id) || {};
      const propInventory = data.inventory || propObj.Total_Rooms || propObj.Inventory || propObj.inventory || 10;
      const pricingBadge = document.getElementById('pricingPropInventoryBadge');
      if (pricingBadge) {
        pricingBadge.textContent = `${propInventory} Rooms`;
      }

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

  // Get active property inventory
  const propObj = currentProperties.find(x => x.id === selectedPropertyId) || {};
  const propInventory = propObj.Total_Rooms || propObj.Inventory || propObj.inventory || 10;

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
      <span class="day-status">${isBlocked ? 'Blocked (0)' : `${propInventory} Rooms`}</span>
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

    // Update dynamic commission rate displays in Payout section
    let effCommRate = 15;
    if (partnerRevenueLedger.length > 0 && partnerRevenueLedger[0].commissionRate) {
      effCommRate = partnerRevenueLedger[0].commissionRate;
    } else if (currentProperties.length > 0 && currentProperties[0].Commission_Rate) {
      effCommRate = parseFloat(currentProperties[0].Commission_Rate) || 15;
    }
    const payoutCommEl = document.getElementById('payoutCommRate');
    if (payoutCommEl) payoutCommEl.textContent = effCommRate;
    const ledgerCommEl = document.getElementById('ledgerCommRate');
    if (ledgerCommEl) ledgerCommEl.textContent = effCommRate;

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
  let effCommRate = 15;
  if (partnerRevenueLedger.length > 0 && partnerRevenueLedger[0].commissionRate) {
    effCommRate = partnerRevenueLedger[0].commissionRate;
  } else if (currentProperties.length > 0 && currentProperties[0].Commission_Rate) {
    effCommRate = parseFloat(currentProperties[0].Commission_Rate) || 15;
  }
  const headers = ['Booking Ref', 'Guest Name', 'Amount Received', `Homzo Fee (${effCommRate}%)`, 'Net Payout Value', 'Date Processed', 'Status'];
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

  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExts.includes(ext)) {
    showToast('Invalid image format. Only JPG, PNG, and WEBP are allowed for profile photos.', 'error');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Profile photo is too large. Maximum size allowed is 5 MB.', 'error');
    input.value = '';
    return;
  }

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
  const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExts.includes(ext)) {
    showToast('Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed.', 'error');
    fileInput.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Document file is too large. Maximum size allowed is 10 MB.', 'error');
    fileInput.value = '';
    return;
  }

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

// ─── GUIDED 12-STEP PROPERTY BUILDER ENGINE ───────────
let currentBuilderStep = 1;
let builderRoomCategories = [];
let builderPropertyGallery = [];
let builderAmenities = new Set(['WiFi', 'AC', 'Housekeeping']);
let builderServices = new Set(['24-hour Reception', 'Daily Housekeeping']);

// 1. Navigation
function switchBuilderStep(step) {
  currentBuilderStep = Math.max(1, Math.min(13, step));

  // Toggle step content panes
  document.querySelectorAll('.hz-bld-step-pane').forEach(div => {
    div.style.display = 'none';
  });
  const activePane = document.getElementById(`bldStep${currentBuilderStep}`);
  if (activePane) activePane.style.display = 'block';

  // Toggle sidebar stepper items
  document.querySelectorAll('#builderStepperList .hz-stepper-item').forEach(btn => {
    const sNum = parseInt(btn.getAttribute('data-bld-step'));
    if (sNum === currentBuilderStep) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle Prev / Next button states
  const prevBtn = document.getElementById('bldPrevBtn');
  if (prevBtn) prevBtn.disabled = (currentBuilderStep === 1);

  const nextBtn = document.getElementById('bldNextBtn');
  if (nextBtn) {
    if (currentBuilderStep === 13) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'inline-flex';
      nextBtn.innerHTML = (currentBuilderStep === 12) 
        ? 'Review Profile <i class="fa-solid fa-flag-checkered"></i>' 
        : 'Continue <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  // Update live preview when switching
  updateCoBrandLivePreview();
  updateBuilderCompletionProgress();

  // Scroll to pane top smoothly
  const builderContent = document.querySelector('.hz-builder-content');
  if (builderContent) {
    builderContent.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function navigateBuilderStep(direction) {
  const targetStep = currentBuilderStep + direction;
  if (targetStep >= 1 && targetStep <= 13) {
    // If navigating forward, auto-save in background
    if (direction > 0 && selectedPropertyId) {
      saveBuilderDraft(false);
    }
    switchBuilderStep(targetStep);
  }
}

// 2. Visual Card Selectors
function selectPropertyTypeCard(type, el) {
  const hiddenInput = document.getElementById('editPropType');
  if (hiddenInput) hiddenInput.value = type;

  const displayEl = document.getElementById('selectedPropTypeDisplay');
  if (displayEl) displayEl.textContent = type;

  // Highlight selected card
  document.querySelectorAll('#bldStep1 .hz-visual-card').forEach(card => {
    card.classList.remove('selected');
  });

  if (el) {
    el.classList.add('selected');
  } else {
    // Find by type text
    document.querySelectorAll('#bldStep1 .hz-visual-card').forEach(card => {
      if (card.querySelector('.hz-visual-card-title')?.textContent.trim().toLowerCase() === type.toLowerCase()) {
        card.classList.add('selected');
      }
    });
  }

  updateCoBrandLivePreview();
  updateBuilderCompletionProgress();
}

function selectOwnerRoleCard(role, el) {
  const hiddenInput = document.getElementById('wzOwnerRole');
  if (hiddenInput) hiddenInput.value = role;

  document.querySelectorAll('#bldStep10 .hz-visual-card').forEach(card => {
    card.classList.remove('selected');
  });

  if (el) {
    el.classList.add('selected');
  } else {
    document.querySelectorAll('#bldStep10 .hz-visual-card').forEach(card => {
      if (card.querySelector('.hz-visual-card-title')?.textContent.toLowerCase().includes(role.toLowerCase())) {
        card.classList.add('selected');
      }
    });
  }
  updateBuilderCompletionProgress();
}

function setTotalRooms(val) {
  let rooms = parseInt(val);
  if (isNaN(rooms) || rooms < 1) rooms = 1;

  const hiddenInput = document.getElementById('wzTotalRooms');
  if (hiddenInput) hiddenInput.value = rooms;

  const disp = document.getElementById('bldRoomsDisplay');
  if (disp) {
    if (disp.tagName === 'INPUT') {
      if (disp.value !== String(rooms)) disp.value = rooms;
    } else {
      disp.textContent = rooms;
    }
  }

  const availInput = document.getElementById('wzAvailableRooms');
  if (availInput) availInput.value = rooms;

  const guestsVal = rooms * 2;
  const maxGuestsInput = document.getElementById('wzMaxGuests');
  if (maxGuestsInput) maxGuestsInput.value = guestsVal;
  const guestsDisp = document.getElementById('bldGuestsDisplay');
  if (guestsDisp) guestsDisp.textContent = guestsVal;

  const validationBadge = document.getElementById('roomCountValidationBadge');
  if (validationBadge) {
    if (rooms >= 5) {
      validationBadge.innerHTML = '<span style="color:var(--hz-success);"><i class="fa-solid fa-circle-check"></i> Meets Homzo minimum requirement (5+ rooms)</span>';
    } else {
      validationBadge.innerHTML = '<span style="color:var(--hz-warning);"><i class="fa-solid fa-triangle-exclamation"></i> Homzo requires minimum 5 rooms for onboarding</span>';
    }
  }

  // Live sync active property inventory cache & badge
  if (selectedPropertyId) {
    const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
    if (pIdx !== -1) {
      currentProperties[pIdx].Total_Rooms = rooms;
      currentProperties[pIdx].Available_Rooms = rooms;
      currentProperties[pIdx].Inventory = rooms;
      currentProperties[pIdx].inventory = rooms;
    }
    const pricingBadge = document.getElementById('pricingPropInventoryBadge');
    if (pricingBadge) {
      pricingBadge.textContent = `${rooms} Rooms`;
    }
  }

  updateCoBrandLivePreview();
  updateBuilderCompletionProgress();
}

function adjustTotalRooms(delta) {
  const hiddenInput = document.getElementById('wzTotalRooms');
  let currentVal = parseInt(hiddenInput?.value || 10);
  currentVal = Math.max(1, currentVal + delta);
  
  const disp = document.getElementById('bldRoomsDisplay');
  if (disp) {
    if (disp.tagName === 'INPUT') disp.value = currentVal;
    else disp.textContent = currentVal;
  }
  setTotalRooms(currentVal);
}

// 3. Amenities & Services Pills
function toggleAmenityPill(el, name) {
  if (builderAmenities.has(name)) {
    builderAmenities.delete(name);
    el.classList.remove('selected');
  } else {
    builderAmenities.add(name);
    el.classList.add('selected');
  }

  const badge = document.getElementById('bldAmenityCountBadge');
  if (badge) badge.textContent = `${builderAmenities.size} selected`;
  updateBuilderCompletionProgress();
}

function toggleServicePill(el, name) {
  if (builderServices.has(name)) {
    builderServices.delete(name);
    el.classList.remove('selected');
  } else {
    builderServices.add(name);
    el.classList.add('selected');
  }
  updateBuilderCompletionProgress();
}

// 4. Room Categories Builder
function renderBuilderRoomCategories() {
  const container = document.getElementById('bldRoomCategoriesContainer');
  if (!container) return;

  if (builderRoomCategories.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; color:var(--hz-text-muted); font-size:0.85rem; padding:24px 16px; border:1px dashed var(--hz-border); border-radius:var(--hz-radius-md); margin-bottom:16px;">
        No room categories added yet. Click "+ Add Room Category" below to configure your rooms.
      </div>`;
    return;
  }

  container.innerHTML = builderRoomCategories.map((c, i) => `
    <div class="hz-room-cat-card">
      <div class="hz-room-cat-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:28px; height:28px; border-radius:50%; background:rgba(212,175,55,0.12); color:var(--hz-gold); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.75rem;">
            0${i+1}
          </div>
          <h4 style="color:#FFFFFF; font-size:0.95rem; margin:0;">${c.name || 'Room Category'}</h4>
        </div>
        <button type="button" class="hz-room-delete-btn" title="Delete Category" onclick="deleteRoomCategory(${i})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <div class="hz-room-form-grid">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.72rem; color:var(--hz-text-muted);">Category Name *</label>
          <input type="text" class="form-control" style="padding:6px 10px; font-size:0.82rem;" value="${c.name || ''}" placeholder="e.g. Deluxe Room / Executive Suite" onchange="updateRoomCatField(${i}, 'name', this.value)">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.72rem; color:var(--hz-text-muted);">Bed Type</label>
          <select class="form-control" style="padding:6px 10px; font-size:0.82rem;" onchange="updateRoomCatField(${i}, 'bedType', this.value)">
            <option value="Queen Bed" ${c.bedType === 'Queen Bed' ? 'selected' : ''}>Queen Bed</option>
            <option value="King Bed" ${c.bedType === 'King Bed' ? 'selected' : ''}>King Bed</option>
            <option value="Twin Beds" ${c.bedType === 'Twin Beds' ? 'selected' : ''}>Twin Beds</option>
            <option value="Single Bed" ${c.bedType === 'Single Bed' ? 'selected' : ''}>Single Bed</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.72rem; color:var(--hz-text-muted);">Number of Rooms</label>
          <input type="number" min="1" class="form-control" style="padding:6px 10px; font-size:0.82rem;" value="${c.roomsCount || 1}" onchange="updateRoomCatField(${i}, 'roomsCount', parseInt(this.value) || 1)">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.72rem; color:var(--hz-text-muted);">Max Guests</label>
          <input type="number" min="1" class="form-control" style="padding:6px 10px; font-size:0.82rem;" value="${c.maxGuests || 2}" onchange="updateRoomCatField(${i}, 'maxGuests', parseInt(this.value) || 2)">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.72rem; color:var(--hz-text-muted);">Base Nightly Rate (₹) *</label>
          <input type="number" min="500" step="50" class="form-control" style="padding:6px 10px; font-size:0.82rem;" value="${c.price || 1800}" onchange="updateRoomCatField(${i}, 'price', parseInt(this.value) || 1800)">
        </div>
        <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px; margin-top:22px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.8rem; color:#E2E8F0;">
            <input type="checkbox" ${c.ac ? 'checked' : ''} onchange="updateRoomCatField(${i}, 'ac', this.checked)">
            <span>Air Conditioned</span>
          </label>
        </div>
      </div>
    </div>
  `).join('');
}

function addNewRoomCategory() {
  const catCount = builderRoomCategories.length + 1;
  builderRoomCategories.push({
    name: catCount === 1 ? 'Standard Deluxe' : (catCount === 2 ? 'Executive Suite' : 'Premium Room'),
    type: 'deluxe',
    roomsCount: 2,
    maxGuests: 2,
    bedType: 'Queen Bed',
    ac: true,
    price: 1800 + ((catCount - 1) * 800),
    photos: []
  });
  renderBuilderRoomCategories();
  renderRoomPhotosPerCategory();
  updateBuilderCompletionProgress();
}

function deleteRoomCategory(idx) {
  if (builderRoomCategories.length <= 1) {
    showToast('At least one room category is required.', 'info');
    return;
  }
  builderRoomCategories.splice(idx, 1);
  renderBuilderRoomCategories();
  renderRoomPhotosPerCategory();
  updateBuilderCompletionProgress();
}

function updateRoomCatField(idx, field, value) {
  if (!builderRoomCategories[idx]) return;
  builderRoomCategories[idx][field] = value;
  if (field === 'name') {
    renderRoomPhotosPerCategory();
  }
  updateCoBrandLivePreview();
}

// 5. Room Photos Manager
function renderRoomPhotosPerCategory() {
  const container = document.getElementById('bldRoomPhotosPerCategory');
  if (!container) return;

  if (builderRoomCategories.length === 0) {
    container.innerHTML = `<p style="color:var(--hz-text-muted); font-size:0.85rem;">Please configure room categories in Step 4 first.</p>`;
    return;
  }

  container.innerHTML = builderRoomCategories.map((cat, catIdx) => {
    const photos = Array.isArray(cat.photos) ? cat.photos : [];
    return `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--hz-border-subtle); border-radius:var(--hz-radius-md); padding:18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h5 style="color:#FFFFFF; font-size:0.95rem; margin:0 0 2px 0;">${cat.name || 'Room Category'}</h5>
            <span style="font-size:0.75rem; color:var(--hz-text-muted);">${photos.length} photos uploaded</span>
          </div>
          <div>
            <input type="file" id="fileRoomPhoto_${catIdx}" accept="image/*" style="display:none;" onchange="uploadRoomPhoto(${catIdx}, this)">
            <button type="button" class="hz-btn-outline" style="padding:6px 14px; font-size:0.78rem;" onclick="document.getElementById('fileRoomPhoto_${catIdx}').click()">
              <i class="fa-solid fa-plus"></i> Add Photo
            </button>
          </div>
        </div>

        <div class="hz-gallery-grid" style="grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));">
          ${photos.map((url, pIdx) => `
            <div class="hz-gallery-item" style="aspect-ratio:4/3;">
              <img src="${url}" alt="Room Photo">
              <button type="button" class="hz-gallery-delete-btn" onclick="deleteRoomPhoto(${catIdx}, ${pIdx})">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `).join('')}
          ${photos.length === 0 ? `
            <div style="grid-column:1/-1; padding:20px; text-align:center; color:var(--hz-text-muted); font-size:0.8rem; border:1px dashed var(--hz-border); border-radius:var(--hz-radius-sm);">
              <i class="fa-solid fa-camera" style="font-size:20px; color:var(--hz-gold); margin-bottom:6px; display:block;"></i>
              No photos uploaded for ${cat.name}. Upload bedroom, bathroom, and amenities photos.
            </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function uploadRoomPhoto(catIdx, fileInput) {
  if (!fileInput || !fileInput.files.length) return;
  if (!selectedPropertyId) {
    showToast('Please select or create a property first.', 'error');
    return;
  }
  const file = fileInput.files[0];
  if (file.size > 10 * 1024 * 1024) {
    showToast('Photo size must be less than 10MB.', 'error');
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    showToast('Uploading room photo...', 'info');
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/upload-doc?docType=roomPhoto`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (!builderRoomCategories[catIdx].photos) {
        builderRoomCategories[catIdx].photos = [];
      }
      builderRoomCategories[catIdx].photos.push(data.filepath);
      renderRoomPhotosPerCategory();
      showToast('Room photo uploaded successfully!', 'success');
      updateBuilderCompletionProgress();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to upload photo.', 'error');
    }
  } catch (err) {
    showToast('Network error during upload.', 'error');
  } finally {
    fileInput.value = '';
  }
}

function deleteRoomPhoto(catIdx, photoIdx) {
  if (builderRoomCategories[catIdx] && builderRoomCategories[catIdx].photos) {
    builderRoomCategories[catIdx].photos.splice(photoIdx, 1);
    renderRoomPhotosPerCategory();
    updateBuilderCompletionProgress();
  }
}

// 6. Property Gallery & Cover Photo
async function uploadPropertyCoverPhoto(fileInput) {
  if (!fileInput || !fileInput.files.length) return;
  if (!selectedPropertyId) {
    showToast('Please select a property first.', 'error');
    return;
  }
  const file = fileInput.files[0];
  if (file.size > 10 * 1024 * 1024) {
    showToast('Cover photo size must be less than 10MB.', 'error');
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    showToast('Uploading cover photo...', 'info');
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/upload-doc?docType=coverPhoto`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      const previewImg = document.getElementById('bldCoverPreviewImg');
      if (previewImg) previewImg.src = data.filepath;

      const cardCover = document.getElementById('cardDemoCoverImg');
      if (cardCover) cardCover.src = data.filepath;

      const modalCover = document.getElementById('gpCoverImg');
      if (modalCover) modalCover.src = data.filepath;

      const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
      if (pIdx !== -1) currentProperties[pIdx].Image = data.filepath;

      showToast('Property cover photo updated!', 'success');
      updateBuilderCompletionProgress();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to upload cover photo.', 'error');
    }
  } catch (err) {
    showToast('Network error during upload.', 'error');
  } finally {
    fileInput.value = '';
  }
}

async function handlePropGalleryUpload(fileInput) {
  if (!fileInput || !fileInput.files.length) return;
  if (!selectedPropertyId) {
    showToast('Please select a property first.', 'error');
    return;
  }

  const files = Array.from(fileInput.files);
  showToast(`Uploading ${files.length} property photos...`, 'info');

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) continue;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/upload-doc?docType=propertyPhoto`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        builderPropertyGallery.push(data.filepath);
      }
    } catch (e) {
      console.warn('Gallery photo upload error:', e);
    }
  }

  renderPropertyGallery();
  showToast('Property photos updated!', 'success');
  updateBuilderCompletionProgress();
  fileInput.value = '';
}

function deletePropGalleryPhoto(idx) {
  builderPropertyGallery.splice(idx, 1);
  renderPropertyGallery();
  updateBuilderCompletionProgress();
}

function renderPropertyGallery() {
  const grid = document.getElementById('bldPropertyGalleryGrid');
  if (!grid) return;

  if (builderPropertyGallery.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--hz-text-muted); font-size:0.8rem; padding:12px;">No additional gallery photos uploaded.</p>`;
    return;
  }

  grid.innerHTML = builderPropertyGallery.map((url, i) => `
    <div class="hz-gallery-item">
      <img src="${url}" alt="Property Gallery">
      <button type="button" class="hz-gallery-delete-btn" onclick="deletePropGalleryPhoto(${i})">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// 7. Live Co-Brand Preview & Guest View Modal
function updateCoBrandLivePreview() {
  const name = document.getElementById('editPropName')?.value.trim() || 'Your Property';
  const brand = document.getElementById('editBrandName')?.value.trim() || '';
  const type = document.getElementById('editPropType')?.value || 'Hotel';
  const city = document.getElementById('wzCity')?.value.trim() || 'Gurugram';
  const totalRooms = document.getElementById('wzTotalRooms')?.value || 10;
  const coverSrc = document.getElementById('bldCoverPreviewImg')?.src || '/customer_web/hero_room.png';

  // Demo Brand Name
  const demoBrand = document.getElementById('demoBrandName');
  if (demoBrand) demoBrand.textContent = brand || name;

  // Card Simulation
  const cardCover = document.getElementById('cardDemoCoverImg');
  if (cardCover && coverSrc) cardCover.src = coverSrc;

  const cardTitle = document.getElementById('cardDemoPropName');
  if (cardTitle) cardTitle.textContent = `HOMZO ${brand ? `× ${brand}` : name}`;

  const cardSub = document.getElementById('cardDemoSubTitle');
  if (cardSub) cardSub.textContent = brand ? `${type} · ${name}` : `${type} · Curated Homzo Partner`;

  const cardCity = document.getElementById('cardDemoCity');
  if (cardCity) cardCity.textContent = city;

  const cardRooms = document.getElementById('cardDemoRooms');
  if (cardRooms) cardRooms.textContent = totalRooms;

  // Header Stage Tag
  const stageBrand = document.getElementById('propStageBrand');
  if (stageBrand) stageBrand.textContent = `HOMZO × ${brand || name}`;
}

function openLiveGuestPreviewModal() {
  const modal = document.getElementById('guestPreviewModal');
  if (!modal) return;

  const name = document.getElementById('editPropName')?.value.trim() || 'Curated Stay';
  const brand = document.getElementById('editBrandName')?.value.trim() || '';
  const type = document.getElementById('editPropType')?.value || 'Hotel';
  const city = document.getElementById('wzCity')?.value.trim() || 'India';
  const address = document.getElementById('wzAddress')?.value.trim() || '';
  const totalRooms = document.getElementById('wzTotalRooms')?.value || 10;
  const coverSrc = document.getElementById('bldCoverPreviewImg')?.src || '/customer_web/hero_room.png';

  document.getElementById('gpCoverImg').src = coverSrc;
  document.getElementById('gpTitle').textContent = `HOMZO ${brand ? `× ${brand}` : name}`;
  document.getElementById('gpSubTitle').textContent = brand ? `${type} · ${name} · An HOMZO Partner Stay` : `${type} · An HOMZO Curated Stay`;
  document.getElementById('gpLocation').textContent = (address ? address + ', ' : '') + city;
  document.getElementById('gpRoomCount').textContent = totalRooms;

  // Room Categories Preview
  const roomsContainer = document.getElementById('gpRoomsList');
  if (roomsContainer) {
    if (builderRoomCategories.length > 0) {
      roomsContainer.innerHTML = builderRoomCategories.map(c => `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--hz-border-subtle); border-radius:var(--hz-radius-sm); padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color:#FFFFFF; font-size:0.95rem; display:block;">${c.name}</strong>
            <span style="font-size:0.75rem; color:var(--hz-text-muted);">${c.bedType || 'Queen Bed'} • Max ${c.maxGuests || 2} Guests • ${c.ac ? 'AC Included' : 'Non-AC'}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.15rem; font-weight:800; color:var(--hz-gold);">₹${Math.round(c.price || 1800).toLocaleString()}<span style="font-size:0.75rem; font-weight:400; color:var(--hz-text-muted);"> / night</span></div>
          </div>
        </div>
      `).join('');
    } else {
      roomsContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--hz-text-muted);">Standard deluxe rooms available.</span>`;
    }
  }

  // Amenities Preview
  const amenContainer = document.getElementById('gpAmenitiesList');
  if (amenContainer) {
    if (builderAmenities.size > 0) {
      amenContainer.innerHTML = Array.from(builderAmenities).map(a => `
        <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); border:1px solid var(--hz-border-subtle); border-radius:999px; padding:6px 14px; font-size:0.8rem; color:#E2E8F0;">
          <i class="fa-solid fa-circle-check" style="color:var(--hz-gold); font-size:0.75rem;"></i> ${a}
        </span>
      `).join('');
    } else {
      amenContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--hz-text-muted);">Wi-Fi, AC, Housekeeping.</span>`;
    }
  }

  // Policies Preview
  const polContainer = document.getElementById('gpPolicies');
  if (polContainer) {
    const inTime = document.getElementById('bldCheckInTime')?.value || '12:00 PM';
    const outTime = document.getElementById('bldCheckOutTime')?.value || '11:00 AM';
    const cancelPol = document.getElementById('bldCancellationPolicy')?.value || 'Flexible';
    const houseRules = document.getElementById('editPropPolicies')?.value.trim() || 'Standard Homzo house rules apply. Govt ID required at check-in.';

    polContainer.innerHTML = `
      <div><strong>Check-in:</strong> ${inTime} | <strong>Check-out:</strong> ${outTime}</div>
      <div style="margin:4px 0;"><strong>Cancellation:</strong> ${cancelPol}</div>
      <div style="margin-top:6px; color:#94A3B8;">${houseRules}</div>
    `;
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLiveGuestPreviewModal() {
  const modal = document.getElementById('guestPreviewModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// 8. Documents & KYC Uploads
async function uploadDocFile(docType, fileInputId, labelId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files.length) return;

  const file = fileInput.files[0];
  const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExts.includes(ext)) {
    showToast('Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed.', 'error');
    fileInput.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Document file is too large. Maximum size allowed is 10 MB.', 'error');
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const lbl = document.getElementById(labelId);
  if (lbl) lbl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/upload-doc?docType=${docType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast('Document uploaded successfully!', 'success');
      
      if (lbl) {
        lbl.innerHTML = `<span style="color:var(--hz-success)"><i class="fa-solid fa-circle-check"></i> Uploaded</span> (<a href="${data.filepath}" target="_blank" style="color:var(--hz-gold)">View</a>)`;
      }
      
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
      updateBuilderCompletionProgress();
    } else {
      const err = await res.json().catch(() => ({}));
      if (lbl) lbl.innerHTML = `<span style="color:var(--hz-danger)">Upload Failed</span>`;
      showToast(err.error || 'Document upload failed.', 'error');
    }
  } catch (err) {
    if (lbl) lbl.innerHTML = `<span style="color:var(--hz-danger)">Error</span>`;
    showToast('Network error during upload.', 'error');
  }
}

function toggleEntityKyc() {
  const type = document.getElementById('wzEntityType')?.value;
  const indBox = document.getElementById('wzKycIndividualBox');
  const compBox = document.getElementById('wzKycCompanyBox');
  if (indBox && compBox) {
    if (type === 'Individual') {
      indBox.style.display = 'grid';
      compBox.style.display = 'none';
    } else {
      indBox.style.display = 'none';
      compBox.style.display = 'grid';
    }
  }
}

function toggleGstInput() {
  const status = document.getElementById('wzGstStatus')?.value;
  const numBox = document.getElementById('wzGstNumberBox');
  const uploadBox = document.getElementById('wzGstUploadBox');
  if (numBox && uploadBox) {
    if (status === 'YES') {
      numBox.style.display = 'block';
      uploadBox.style.display = 'flex';
    } else {
      numBox.style.display = 'none';
      uploadBox.style.display = 'none';
    }
  }
}

function verifyBankNameMatching() {
  const holder = document.getElementById('wzBankAccountHolder')?.value.trim().toLowerCase();
  const alertBox = document.getElementById('bankNameMatchAlert');
  if (!alertBox) return;

  const ownerName = (currentUser && currentUser.name) ? currentUser.name.trim().toLowerCase() : '';
  if (!holder || !ownerName) {
    alertBox.style.display = 'none';
    return;
  }

  const clean = (s) => s.replace(/(mr|mrs|ms|dr|llp|co|inc|pvt|ltd|firm)\.?\s+/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  const cHolder = clean(holder);
  const cOwner = clean(ownerName);

  alertBox.style.display = 'block';
  if (cHolder === cOwner || cHolder.includes(cOwner) || cOwner.includes(cHolder)) {
    alertBox.style.background = 'rgba(34,197,94,0.05)';
    alertBox.style.borderColor = 'rgba(34,197,94,0.15)';
    alertBox.style.color = 'var(--hz-success)';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Account Holder Name matches Property Owner Name ("${currentUser.name}").`;
  } else {
    alertBox.style.background = 'rgba(245,158,11,0.05)';
    alertBox.style.borderColor = 'rgba(245,158,11,0.15)';
    alertBox.style.color = '#fbbf24';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Bank account ownership will be verified during admin audit ("${currentUser.name}" vs "${document.getElementById('wzBankAccountHolder').value}").`;
  }
}

// 9. Completion Progress Engine
function updateBuilderCompletionProgress() {
  if (!selectedPropertyId) return;
  const p = currentProperties.find(x => x.id === selectedPropertyId);

  let stepsDone = 0;
  // Step 1: Property Type
  if (document.getElementById('editPropType')?.value) stepsDone++;
  // Step 2: Basics
  if (document.getElementById('editPropName')?.value.trim() && document.getElementById('wzPropPhone')?.value.trim()) stepsDone++;
  // Step 3: Location
  if (document.getElementById('wzAddress')?.value.trim() && document.getElementById('wzCity')?.value.trim()) stepsDone++;
  // Step 4: Rooms
  const r = parseInt(document.getElementById('wzTotalRooms')?.value || 0);
  if (r >= 5 && builderRoomCategories.length > 0) stepsDone++;
  // Step 5: Room Photos
  const hasRoomPhoto = builderRoomCategories.some(c => c.photos && c.photos.length > 0);
  if (hasRoomPhoto) stepsDone++;
  // Step 6: Gallery & Cover
  if (document.getElementById('bldCoverPreviewImg')?.src || builderPropertyGallery.length > 0) stepsDone++;
  // Step 7: Amenities
  if (builderAmenities.size >= 3) stepsDone++;
  // Step 8: Brand & Display
  if (document.getElementById('editPropName')?.value.trim()) stepsDone++;
  // Step 9: Policies
  if (document.getElementById('bldCheckInTime')?.value && document.getElementById('bldCheckOutTime')?.value) stepsDone++;
  // Step 10: Owner KYC
  if ((p && (p.Aadhaar_Doc || p.PAN_Doc)) || document.getElementById('wzPanNum')?.value) stepsDone++;
  // Step 11: Documents
  if (p && (p.Ownership_Doc || p.Rent_Agreement_Doc || p.GST_Doc)) stepsDone++;
  // Step 12: Bank Details
  if (document.getElementById('wzBankAccountHolder')?.value.trim() && document.getElementById('wzBankAccountNumber')?.value.trim() && document.getElementById('wzBankIfsc')?.value.trim()) stepsDone++;

  const countEl = document.getElementById('bldStepsCompletedCount');
  if (countEl) countEl.textContent = stepsDone;

  const barEl = document.getElementById('bldSideProgressBar');
  if (barEl) barEl.style.width = `${Math.round((stepsDone / 12) * 100)}%`;
}

// 10. Save Draft & Submit Handlers
async function saveBuilderDraft(isExplicitSave = false) {
  if (!selectedPropertyId) return false;

  const commVal = parseFloat(document.getElementById('wzCommissionRate')?.value || 15);
  if (isNaN(commVal) || commVal < 12 || commVal > 20) {
    showToast('Platform Commission Rate must be between 12% and 20%.', 'error');
    return false;
  }

  const payload = {
    Name: document.getElementById('editPropName').value.trim(),
    Brand_Name: document.getElementById('editBrandName')?.value.trim() || '',
    Type: document.getElementById('editPropType').value || 'Hotel',
    Owner_Type: document.getElementById('wzOwnerRole')?.value || 'Owner',
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
    Total_Rooms: parseInt(document.getElementById('wzTotalRooms').value) || 10,
    Available_Rooms: parseInt(document.getElementById('wzAvailableRooms').value) || 10,
    Inventory: parseInt(document.getElementById('wzTotalRooms').value) || 10,
    Max_Guests: parseInt(document.getElementById('wzMaxGuests').value) || 20,
    Bank_Account_Holder: document.getElementById('wzBankAccountHolder').value.trim(),
    Bank_Name: document.getElementById('wzBankName')?.value.trim() || '',
    Bank_Account_Number: document.getElementById('wzBankAccountNumber').value.trim(),
    Bank_IFSC: document.getElementById('wzBankIfsc').value.trim().toUpperCase(),
    Commission_Rate: commVal,
    Registration_Status: document.getElementById('wzEntityType')?.value === 'Individual' ? 'Unregistered' : 'Registered',
    Partner_Agreement_Accepted: document.getElementById('chkAcceptAgreement')?.checked || false,
    Policies: document.getElementById('editPropPolicies').value.trim(),
    roomCategories: builderRoomCategories,
    amenities: Array.from(builderAmenities),
    services: Array.from(builderServices),
    propertyPhotos: builderPropertyGallery,
    checkInOut: {
      checkIn: document.getElementById('bldCheckInTime')?.value || '12:00 PM',
      checkOut: document.getElementById('bldCheckOutTime')?.value || '11:00 AM',
      cancellation: document.getElementById('bldCancellationPolicy')?.value || '',
      couples: document.getElementById('bldCouplePolicy')?.value || '',
      pets: document.getElementById('bldPetPolicy')?.value || '',
      smoking: document.getElementById('bldSmokingPolicy')?.value || ''
    }
  };

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/onboarding`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const statusText = document.getElementById('bldSaveStatus');
      if (statusText) {
        statusText.innerHTML = `<i class="fa-regular fa-clock"></i> Saved just now`;
      }
      if (isExplicitSave) {
        showToast('Property onboarding draft saved successfully.', 'success');
      }
      // Update local cache and active inventory
      const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
      if (pIdx !== -1) {
        currentProperties[pIdx] = {
          ...currentProperties[pIdx],
          ...payload,
          Inventory: payload.Total_Rooms,
          inventory: payload.Total_Rooms
        };
      }
      const pricingBadge = document.getElementById('pricingPropInventoryBadge');
      if (pricingBadge) {
        pricingBadge.textContent = `${payload.Total_Rooms} Rooms`;
      }
      updateBuilderCompletionProgress();
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (isExplicitSave) showToast(err.error || 'Failed to save draft.', 'error');
      return false;
    }
  } catch (err) {
    if (isExplicitSave) showToast('Network error while saving draft.', 'error');
    return false;
  }
}

async function submitBuilderOnboarding() {
  const p = currentProperties.find(x => x.id === selectedPropertyId);
  const rooms = parseInt(document.getElementById('wzTotalRooms').value);
  if (isNaN(rooms) || rooms < 5) {
    showToast("This property does not meet Homzo's minimum requirement (minimum 5 rentable rooms).", 'error');
    switchBuilderStep(2);
    return;
  }

  const propName = document.getElementById('editPropName')?.value.trim();
  const city = document.getElementById('wzCity')?.value.trim();
  if (!propName || !city) {
    showToast('Please provide your property name and city.', 'error');
    switchBuilderStep(2);
    return;
  }

  // Validate Owner Identity
  if (!p || (!p.Aadhaar_Doc && !p.PAN_Doc)) {
    const panVal = document.getElementById('wzPanNum')?.value.trim();
    const aadhVal = document.getElementById('wzAadhaarNum')?.value.trim();
    if (!panVal && !aadhVal) {
      showToast('Identity verification document (PAN or Aadhaar) is required in Step 10.', 'error');
      switchBuilderStep(10);
      return;
    }
  }

  // Validate Bank Details
  const accHolder = document.getElementById('wzBankAccountHolder').value.trim();
  const accNum = document.getElementById('wzBankAccountNumber').value.trim();
  const ifsc = document.getElementById('wzBankIfsc').value.trim().toUpperCase();

  if (!accHolder) {
    showToast('Please enter the Bank Account Holder Name in Step 12.', 'error');
    switchBuilderStep(12);
    return;
  }
  if (!accNum || !/^[0-9]{9,18}$/.test(accNum)) {
    showToast('Please enter a valid Bank Account Number (9 to 18 numeric digits) in Step 12.', 'error');
    switchBuilderStep(12);
    return;
  }
  if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    showToast('Please enter a valid 11-character Bank IFSC Code in Step 12.', 'error');
    switchBuilderStep(12);
    return;
  }
  if (!p || !p.Cancelled_Cheque_Doc) {
    showToast('Cancelled Cheque or Bank Passbook copy is required in Step 12.', 'error');
    switchBuilderStep(12);
    return;
  }

  // Validate Legal Terms
  if (!document.getElementById('chkAcceptAgreement')?.checked) {
    showToast('You must review and accept the HOMZO Partner Terms before submitting.', 'error');
    switchBuilderStep(13);
    return;
  }

  // Auto-save draft before submission
  const draftSaved = await saveBuilderDraft(false);
  if (!draftSaved) return;

  const submitBtn = document.getElementById('bldFinalSubmitBtn');
  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }

  try {
    const res = await fetch(`${API_BASE}/partner/properties/${selectedPropertyId}/submit`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (res.ok) {
      showToast('Property successfully submitted for HOMZO Verification! Our team will review your application.', 'success');
      
      const pIdx = currentProperties.findIndex(x => x.id === selectedPropertyId);
      if (pIdx !== -1) {
        currentProperties[pIdx].Onboarding_Stage = 'Submitted';
        updateStageBanner(currentProperties[pIdx]);
      }
      
      await loadPropertiesData();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || 'Failed to submit property.', 'error');
    }
  } catch (e) {
    showToast('Connection error during submission.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

// 11. Aliases & Global Bindings for Backward Compatibility
window.switchBuilderStep = switchBuilderStep;
window.navigateBuilderStep = navigateBuilderStep;
window.selectPropertyTypeCard = selectPropertyTypeCard;
window.selectOwnerRoleCard = selectOwnerRoleCard;
window.adjustTotalRooms = adjustTotalRooms;
window.setTotalRooms = setTotalRooms;
window.toggleAmenityPill = toggleAmenityPill;
window.toggleServicePill = toggleServicePill;
window.addNewRoomCategory = addNewRoomCategory;
window.deleteRoomCategory = deleteRoomCategory;
window.updateRoomCatField = updateRoomCatField;
window.uploadRoomPhoto = uploadRoomPhoto;
window.deleteRoomPhoto = deleteRoomPhoto;
window.uploadPropertyCoverPhoto = uploadPropertyCoverPhoto;
window.handlePropGalleryUpload = handlePropGalleryUpload;
window.deletePropGalleryPhoto = deletePropGalleryPhoto;
window.updateCoBrandLivePreview = updateCoBrandLivePreview;
window.openLiveGuestPreviewModal = openLiveGuestPreviewModal;
window.closeLiveGuestPreviewModal = closeLiveGuestPreviewModal;
window.uploadDocFile = uploadDocFile;
window.saveBuilderDraft = saveBuilderDraft;
window.submitBuilderOnboarding = submitBuilderOnboarding;

window.switchWzStep = function(step) {
  const stepMap = { 1: 2, 2: 10, 3: 4, 4: 12, 5: 11, 6: 13 };
  switchBuilderStep(stepMap[step] || step);
};
window.navigateWzStep = navigateBuilderStep;
window.saveWzDraft = saveBuilderDraft;
window.submitWzOnboarding = submitBuilderOnboarding;
window.addWzRoomCategory = addNewRoomCategory;
window.removeWzRoomCategory = deleteRoomCategory;
window.renderWzRoomCategories = renderBuilderRoomCategories;
window.updateWzRoomField = updateRoomCatField;
window.toggleAgreementChecked = function() {
  const checked = document.getElementById('chkAcceptAgreement')?.checked || false;
  if (document.getElementById('chkDeclTrue1')) document.getElementById('chkDeclTrue1').checked = checked;
  if (document.getElementById('chkDeclTrue2')) document.getElementById('chkDeclTrue2').checked = checked;
};
