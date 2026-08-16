/* ================================================
   HOMZO Client Page – JavaScript
   ================================================ */

// ─── Utility: Toast ───────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:18px"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(60px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ─── Utility: Modal ───────────────────────────────────
function openModal(id) { document.getElementById(id).style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; document.body.style.overflow = ''; }
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ─── Navbar scroll ────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 60) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');

  // Active link highlighting
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.remove('active');
    if (l.getAttribute('href') === '#' + current) l.classList.add('active');
  });
});

// ─── Hamburger ────────────────────────────────────────
const hamburgerEl = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');
if (hamburgerEl && navLinksEl) {
  hamburgerEl.addEventListener('click', () => {
    navLinksEl.classList.toggle('open');
  });
}
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => {
  const nl = document.getElementById('navLinks');
  if (nl) nl.classList.remove('open');
}));

// ─── Hero Image Ken Burns ──────────────────────────────
window.addEventListener('load', () => {
  const img = document.getElementById('heroBg');
  if (img) img.classList.add('loaded');
});

// ─── Contact Form ─────────────────────────────────────
const contactFormEl = document.getElementById('contactForm');
if (contactFormEl) {
  contactFormEl.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('cfName').value.trim();
    const email = document.getElementById('cfEmail').value.trim();
    const type = document.getElementById('cfType').value;
    const msg = document.getElementById('cfMessage').value.trim();
    if (!name || !email || !msg) { showToast('Please fill all required fields.', 'error'); return; }
    
    const btn = e.target.querySelector('button');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message: msg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      showToast('Message sent! We\'ll get back to you soon.', 'success');
      e.target.reset();
    } catch (err) {
      console.error('Inquiry Error:', err);
      showToast(err.message === 'Failed to fetch' ? 'Failed to connect to backend. Is server running?' : err.message, 'error');
    } finally {
      btn.innerHTML = originalHtml;
    }
  });
}

// ─── Customer Authentication State & Logic ────────────────────────────────────
let currentCustomer = null;

function updateCustomerAuthWidget() {
  const widget = document.getElementById('customerAuthWidget');
  const signInBtn = document.getElementById('custSignInBtn');
  const dropdown = document.getElementById('custProfileDropdown');
  
  if (currentCustomer) {
    signInBtn.style.display = 'none';
    
    let avatarBtn = widget.querySelector('.nav-avatar-btn');
    if (!avatarBtn) {
      avatarBtn = document.createElement('button');
      avatarBtn.className = 'nav-avatar-btn';
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
      widget.insertBefore(avatarBtn, dropdown);
    }
    
    const initial = currentCustomer.name ? currentCustomer.name[0].toUpperCase() : 'G';
    const shortName = currentCustomer.name ? currentCustomer.name.split(' ')[0] : 'Guest';
    avatarBtn.innerHTML = `
      <div class="avatar-circle">${initial}</div>
      <span>${shortName}</span>
      <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
    `;
  } else {
    signInBtn.style.display = 'inline-flex';
    const avatarBtn = widget.querySelector('.nav-avatar-btn');
    if (avatarBtn) avatarBtn.remove();
    dropdown.classList.remove('show');
  }
}

document.addEventListener('click', () => {
  const dropdown = document.getElementById('custProfileDropdown');
  if (dropdown) dropdown.classList.remove('show');
});

function showAuthTab(tab) {
  const loginView = document.getElementById('custLoginView');
  const signUpView = document.getElementById('custSignUpView');
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignUp = document.getElementById('authTabSignUp');
  
  if (tab === 'login') {
    loginView.style.display = 'block';
    signUpView.style.display = 'none';
    tabLogin.classList.add('active');
    tabSignUp.classList.remove('active');
    
    tabLogin.style.background = 'var(--primary)';
    tabLogin.style.color = '#051A24';
    tabLogin.style.fontWeight = '700';
    
    tabSignUp.style.background = 'transparent';
    tabSignUp.style.color = 'var(--text-secondary)';
    tabSignUp.style.fontWeight = '600';
  } else {
    loginView.style.display = 'none';
    signUpView.style.display = 'block';
    tabLogin.classList.remove('active');
    tabSignUp.classList.add('active');
    
    tabSignUp.style.background = 'var(--primary)';
    tabSignUp.style.color = '#051A24';
    tabSignUp.style.fontWeight = '700';
    
    tabLogin.style.background = 'transparent';
    tabLogin.style.color = 'var(--text-secondary)';
    tabLogin.style.fontWeight = '600';
  }
}

const authTabLoginEl = document.getElementById('authTabLogin');
const authTabSignUpEl = document.getElementById('authTabSignUp');
if (authTabLoginEl && authTabSignUpEl) {
  authTabLoginEl.addEventListener('click', () => showAuthTab('login'));
  authTabSignUpEl.addEventListener('click', () => showAuthTab('signup'));
}

document.getElementById('custSignInBtn').addEventListener('click', () => {
  showAuthTab('login');
  openModal('customerAuthModal');
});

document.getElementById('toSignUpBtn').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthTab('signup');
});

document.getElementById('toLogInBtn').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthTab('login');
});

const custForgotPasswordBtn = document.getElementById('custForgotPasswordBtn');
if (custForgotPasswordBtn) {
  custForgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('customerAuthModal');
    openModal('passwordResetModal');
    document.getElementById('resetStep1').style.display = 'block';
    document.getElementById('resetStep2').style.display = 'none';
    document.getElementById('resetEmail').value = '';
  });
}

// Password reset modal submit handlers
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyResetBtn = document.getElementById('verifyResetBtn');

if (sendOtpBtn) {
  sendOtpBtn.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim();
    if (!email) {
      showToast('Please enter your email address.', 'error');
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
        document.getElementById('resetStep1').style.display = 'none';
        document.getElementById('resetStep2').style.display = 'block';
        document.getElementById('resetOtp').value = '';
        document.getElementById('resetNewPassword').value = '';
        document.getElementById('resetConfirmPassword').value = '';
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
    const email = document.getElementById('resetEmail').value.trim();
    const otp = document.getElementById('resetOtp').value.trim();
    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;

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

document.getElementById('custLoginSubmitBtn').addEventListener('click', async () => {
  const email = document.getElementById('custLogEmail').value.trim();
  const password = document.getElementById('custLogPassword').value;
  
  if (!email || !password) {
    showToast('Please enter both email and password.', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');
    
    localStorage.setItem('customerToken', data.token);
    localStorage.setItem('customerName', data.name);
    localStorage.setItem('customerEmail', data.email);
    localStorage.setItem('customerId', data.customerId);
    
    currentCustomer = { token: data.token, name: data.name, email: data.email, id: data.customerId };
    updateCustomerAuthWidget();
    closeModal('customerAuthModal');
    showToast(`Welcome back, ${data.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('custSignUpSubmitBtn').addEventListener('click', async () => {
  const name = document.getElementById('custRegName').value.trim();
  const email = document.getElementById('custRegEmail').value.trim();
  const phone = document.getElementById('custRegPhone').value.trim();
  const password = document.getElementById('custRegPassword').value;
  
  if (!name || !email || !phone || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    
    showToast(data.message, 'success');
    document.getElementById('custLogEmail').value = email;
    document.getElementById('custLogPassword').value = '';
    document.getElementById('custLoginView').style.display = 'block';
    document.getElementById('custSignUpView').style.display = 'none';
  } catch (err) {
    showToast(err.message, 'error');
  }
});

const custSignOutBtnEl = document.getElementById('custSignOutBtn');
if (custSignOutBtnEl) {
  custSignOutBtnEl.addEventListener('click', () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerId');
    currentCustomer = null;
    updateCustomerAuthWidget();
    showToast('Logged out successfully.', 'info');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('customerToken');
  const name = localStorage.getItem('customerName');
  const email = localStorage.getItem('customerEmail');
  const id = localStorage.getItem('customerId');
  
  if (token && name && email && id) {
    currentCustomer = { token, name, email, id };
    updateCustomerAuthWidget();
  }
  
  const dobInput = document.getElementById('bkDOB');
  if (dobInput) {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    dobInput.max = today.toISOString().split('T')[0];
  }

  // Initialize Flatpickr date pickers for Search Box
  if (document.getElementById('searchCheckin') && document.getElementById('searchCheckout')) {
    let searchCheckoutPicker;
    const searchCheckinPicker = flatpickr("#searchCheckin", {
      minDate: "today",
      dateFormat: "Y-m-d",
      theme: "dark",
      onChange: function(selectedDates, dateStr, instance) {
        if (searchCheckoutPicker) {
          searchCheckoutPicker.set("minDate", dateStr || "today");
        }
      }
    });

    searchCheckoutPicker = flatpickr("#searchCheckout", {
      minDate: "today",
      theme: "dark",
      dateFormat: "Y-m-d"
    });
  }

  // Initialize Flatpickr date pickers for Booking Modal
  if (document.getElementById('bkCheckin') && document.getElementById('bkCheckout')) {
    let bkCheckoutPicker;
    const bkCheckinPicker = flatpickr("#bkCheckin", {
      minDate: "today",
      dateFormat: "Y-m-d",
      theme: "dark",
      onChange: function(selectedDates, dateStr, instance) {
        if (bkCheckoutPicker) {
          bkCheckoutPicker.set("minDate", dateStr || "today");
        }
      }
    });

    bkCheckoutPicker = flatpickr("#bkCheckout", {
      minDate: "today",
      theme: "dark",
      dateFormat: "Y-m-d"
    });
  }
  
  populateSearchCities();
});

async function populateSearchCities() {
  const searchLocationSelect = document.getElementById('searchLocation');
  if (!searchLocationSelect) return;

  try {
    const res = await fetch('/api/properties');
    if (!res.ok) throw new Error('Failed to fetch properties');
    const properties = await res.json();
    
    const cities = [...new Set(properties.map(p => p.Location || ''))]
      .map(city => city.trim())
      .filter(city => city !== '')
      .sort((a, b) => a.localeCompare(b));
    
    searchLocationSelect.innerHTML = '<option value="">Select City</option>';
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      searchLocationSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error populating search cities:', err);
  }
}

// ─── Search & Advanced Filtering Sidebar ────────────────────────────────────
let searchAvailabilityMap = {};
let leafletMap = null;
let leafletMarkers = [];
let userCoordinates = null;

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

const findNearestBtn = document.getElementById('findNearestBtn');
if (findNearestBtn) {
  findNearestBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    showToast('Fetching your location...', 'info');
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      userCoordinates = { lat, lng };
      showToast('Location fetched! Finding closest hotels...', 'success');
      
      let closestCity = "";
      let minDistance = Infinity;
      properties.forEach(p => {
        if (p.latitude && p.longitude) {
          const dist = calculateDistance(lat, lng, p.latitude, p.longitude);
          if (dist !== null && dist < minDistance) {
            minDistance = dist;
            closestCity = p.location;
          }
        }
      });
      
      if (closestCity) {
        const locSelect = document.getElementById('searchLocation');
        if (locSelect) {
          for (let i = 0; i < locSelect.options.length; i++) {
            const optVal = locSelect.options[i].value.toLowerCase();
            if (optVal && closestCity.toLowerCase().includes(optVal)) {
              locSelect.selectedIndex = i;
              break;
            }
          }
        }
      }
      
      const distOption = document.getElementById('distanceSortOption');
      if (distOption) {
        distOption.style.display = 'block';
      }
      const sortSelect = document.getElementById('resultsSortSelect');
      if (sortSelect) {
        sortSelect.value = 'distance-nearest';
      }
      
      document.getElementById('properties').style.display = 'none';
      const searchResultsSec = document.getElementById('searchResults');
      searchResultsSec.style.display = 'block';
      searchResultsSec.scrollIntoView({ behavior: 'smooth' });
      
      performAdvancedFilters();
    }, error => {
      console.error(error);
      showToast('Failed to access location. Using default search.', 'error');
    });
  });
}

const searchBtnEl = document.getElementById('searchBtn');
if (searchBtnEl) {
  searchBtnEl.addEventListener('click', async () => {
    const loc = document.getElementById('searchLocation').value;
  const ci  = document.getElementById('searchCheckin').value;
  const co  = document.getElementById('searchCheckout').value;
  if (!loc) { showToast('Please select a city first.', 'error'); return; }
  
  showToast(`Searching properties in ${loc}...`, 'info');
  
  document.getElementById('properties').style.display = 'none';
  const searchResultsSec = document.getElementById('searchResults');
  searchResultsSec.style.display = 'block';
  searchResultsSec.scrollIntoView({ behavior: 'smooth' });
  
  if (ci && co) {
    if (new Date(ci) >= new Date(co)) {
      showToast('Check-out must be after check-in.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/properties/availabilities?checkin=${ci}&checkout=${co}`);
      if (res.ok) {
        searchAvailabilityMap = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch dates availability:', e);
      searchAvailabilityMap = {};
    }
  } else {
    searchAvailabilityMap = {};
  }
  
  performAdvancedFilters();
  });
}

const slider = document.getElementById('priceFilterSlider');
const sliderValLabel = document.getElementById('priceSliderValue');
if (slider && sliderValLabel) {
  slider.addEventListener('input', (e) => {
    sliderValLabel.textContent = `₹${parseInt(e.target.value).toLocaleString()}`;
    performAdvancedFilters();
  });
}

const clearFiltersBtnEl = document.getElementById('clearFiltersBtn');
if (clearFiltersBtnEl) {
  clearFiltersBtnEl.addEventListener('click', () => {
    const sliderEl = document.getElementById('priceFilterSlider');
    const labelEl = document.getElementById('priceSliderValue');
    if (sliderEl) sliderEl.value = 20000;
    if (labelEl) labelEl.textContent = '₹20,000';
    document.querySelectorAll('.stay-type-chk, .amenity-chk').forEach(c => c.checked = false);
    performAdvancedFilters();
  });
}

const resultsSortSelectEl = document.getElementById('resultsSortSelect');
if (resultsSortSelectEl) {
  resultsSortSelectEl.addEventListener('change', () => {
    performAdvancedFilters();
  });
}

document.querySelectorAll('.stay-type-chk, .amenity-chk').forEach(chk => {
  chk.addEventListener('change', () => performAdvancedFilters());
});

// Search Tab synchronization
document.querySelectorAll('.stab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const stayTypeChks = document.querySelectorAll('.stay-type-chk');
    stayTypeChks.forEach(chk => {
      chk.checked = (chk.value === btn.dataset.tab);
    });
    
    performAdvancedFilters();
  });
});

function performAdvancedFilters() {
  const location = document.getElementById('searchLocation').value;
  const maxPrice = parseInt(document.getElementById('priceFilterSlider').value);
  const sortOption = document.getElementById('resultsSortSelect').value;
  
  const selectedTypes = [];
  document.querySelectorAll('.stay-type-chk:checked').forEach(c => selectedTypes.push(c.value));
  
  const selectedAmenities = [];
  document.querySelectorAll('.amenity-chk:checked').forEach(c => selectedAmenities.push(c.value));
  
  let filtered = properties.filter(p => {
    const matchLoc = !location || (p.location || '').toLowerCase().includes(location.toLowerCase());
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(p.type);
    
    const priceNum = parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0;
    const matchPrice = priceNum <= maxPrice;
    
    let matchAmenities = true;
    if (selectedAmenities.length > 0) {
      const mockAmenities = getPropertyAmenitiesMock(p);
      matchAmenities = selectedAmenities.every(a => mockAmenities.includes(a));
    }
    
    return matchLoc && matchType && matchPrice && matchAmenities;
  });
  
  if (sortOption === 'price-low') {
    filtered.sort((a, b) => {
      const pa = parseInt(String(a.price).replace(/[^0-9]/g, '')) || 0;
      const pb = parseInt(String(b.price).replace(/[^0-9]/g, '')) || 0;
      return pa - pb;
    });
  } else if (sortOption === 'price-high') {
    filtered.sort((a, b) => {
      const pa = parseInt(String(a.price).replace(/[^0-9]/g, '')) || 0;
      const pb = parseInt(String(b.price).replace(/[^0-9]/g, '')) || 0;
      return pb - pa;
    });
  } else if (sortOption === 'distance-nearest' && userCoordinates) {
    filtered.sort((a, b) => {
      const distA = calculateDistance(userCoordinates.lat, userCoordinates.lng, a.latitude, a.longitude) || Infinity;
      const distB = calculateDistance(userCoordinates.lat, userCoordinates.lng, b.latitude, b.longitude) || Infinity;
      return distA - distB;
    });
  } else {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  
  const grid = document.getElementById('searchResultsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  document.getElementById('resultsTitleCount').textContent = `${filtered.length} Stays Available`;
  document.getElementById('resultsSubtext').textContent = location ? `Verified stays in ${location}` : 'Explore verified stays across India';
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-secondary)">
        <i class="fa-solid fa-hotel" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted)"></i>
        <p>No stays match your search criteria. Try adjusting the filters!</p>
      </div>`;
    updateSearchResultsMap([]);
    return;
  }
  
  filtered.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'prop-card reveal';
    card.style.animationDelay = `${idx * 0.05}s`;
    
    let badgeHtml = '';
    let isSoldOut = false;
    if (Object.keys(searchAvailabilityMap).length > 0 && searchAvailabilityMap[p.id]) {
      const check = searchAvailabilityMap[p.id];
      if (check.available) {
        badgeHtml = `<div class="prop-status-badge available"><i class="fa-solid fa-circle-check"></i> ${check.availableRooms} Left</div>`;
      } else {
        badgeHtml = `<div class="prop-status-badge sold-out"><i class="fa-solid fa-circle-xmark"></i> Sold Out</div>`;
        isSoldOut = true;
      }
    } else {
      badgeHtml = `<div class="prop-status-badge available"><i class="fa-solid fa-circle-check"></i> Available</div>`;
    }

    let distanceHtml = '';
    if (userCoordinates && p.latitude && p.longitude) {
      const dist = calculateDistance(userCoordinates.lat, userCoordinates.lng, p.latitude, p.longitude);
      if (dist !== null) {
        distanceHtml = `<div style="font-size:0.75rem; color:var(--primary); margin-top:4px;"><i class="fa-solid fa-location-arrow"></i> ${dist.toFixed(1)} km away</div>`;
      }
    }
    
    card.innerHTML = `
      <div class="prop-img-wrap">
        <img src="${p.img || 'couple_room.png'}" alt="${p.name}">
        <div class="prop-tag badge badge-${p.type === 'couples' ? 'danger' : p.type === 'students' ? 'success' : p.type === 'employees' ? 'info' : p.type === 'tourists' ? 'warning' : 'primary'}">${p.type}</div>
        ${badgeHtml}
        <button class="prop-fav ${likedProps.has(p.id) ? 'liked' : ''}" onclick="toggleFav(${p.id}, this)">
          <i class="fa-${likedProps.has(p.id) ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
      <div class="prop-body">
        <div class="prop-location"><i class="fa-solid fa-location-dot"></i> ${p.location}</div>
        ${distanceHtml}
        <div class="prop-name">${p.name}</div>
        <div class="prop-meta">
          <span><i class="fa-solid fa-star" style="color:var(--warning)"></i> ${p.rating || '4.8'} (${p.reviews || '24'} reviews)</span>
          <span><i class="fa-solid fa-bed"></i> ${p.beds || 2} Bed</span>
        </div>
        <div class="prop-footer">
          <div class="prop-price"><strong>${p.price}</strong><span>${p.unit || '/mo'}</span></div>
        </div>
        <button class="btn btn-primary" style="width:100%; margin-top:14px" ${isSoldOut ? 'disabled style="background:var(--text-muted); cursor:not-allowed"' : ''} onclick="bookProperty('${p.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-calendar-check"></i> Book Now
        </button>
      </div>`;
    grid.appendChild(card);
  });
  
  setTimeout(activateReveal, 50);
  updateSearchResultsMap(filtered);
}

function updateSearchResultsMap(filtered) {
  const mapContainer = document.getElementById('searchMap');
  if (!mapContainer) return;

  const mappedProps = filtered.filter(p => p.latitude && p.longitude);

  if (mappedProps.length === 0) {
    mapContainer.style.display = 'none';
    return;
  }

  mapContainer.style.display = 'block';

  let centerLat = 19.0760;
  let centerLng = 72.8777;
  let zoomLevel = 12;

  if (userCoordinates) {
    centerLat = userCoordinates.lat;
    centerLng = userCoordinates.lng;
  } else if (mappedProps.length > 0) {
    centerLat = mappedProps[0].latitude;
    centerLng = mappedProps[0].longitude;
  }

  if (!leafletMap) {
    leafletMap = L.map('searchMap').setView([centerLat, centerLng], zoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
  } else {
    leafletMap.setView([centerLat, centerLng], zoomLevel);
  }

  leafletMarkers.forEach(m => leafletMap.removeLayer(m));
  leafletMarkers = [];

  if (userCoordinates) {
    const userMarker = L.marker([userCoordinates.lat, userCoordinates.lng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: `<div style="background:#528ff0; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 8px #528ff0;"></div>`,
        iconSize: [12, 12]
      })
    }).addTo(leafletMap).bindPopup('<strong>Your Location</strong>');
    leafletMarkers.push(userMarker);
  }

  mappedProps.forEach(p => {
    const dist = userCoordinates ? calculateDistance(userCoordinates.lat, userCoordinates.lng, p.latitude, p.longitude) : null;
    const distText = dist !== null ? `<br>Distance: ${dist.toFixed(1)} km` : '';
    const popupContent = `
      <div style="font-family: 'Outfit', sans-serif; font-size: 0.75rem; color: #000; min-width: 120px;">
        <strong style="color:#d4af37;">${p.name}</strong><br>
        <span>Price: ${p.price}${p.unit}</span><br>
        <span>Rating: ⭐ ${p.rating}</span>${distText}<br>
        <button class="btn btn-primary" style="width:100%; margin-top:6px; font-size:9px; padding:3px 6px; height:auto; line-height:1;" onclick="bookProperty('${p.name.replace(/'/g, "\\'")}')">Book Now</button>
      </div>
    `;
    const marker = L.marker([p.latitude, p.longitude]).addTo(leafletMap).bindPopup(popupContent);
    leafletMarkers.push(marker);
  });

  setTimeout(() => {
    leafletMap.invalidateSize();
  }, 100);
}

function getPropertyAmenitiesMock(p) {
  const type = p.type;
  if (type === 'students') return ['wifi', 'meal'];
  if (type === 'employees') return ['wifi', 'ac', 'gym'];
  if (type === 'tourists') return ['wifi', 'ac'];
  if (type === 'foreigners') return ['wifi', 'ac', 'gym'];
  return ['wifi', 'ac'];
}

// ─── My Stays Dashboard Portal ────────────────────────────────────
const myStaysBtnEl = document.getElementById('myStaysBtn');
if (myStaysBtnEl) {
  myStaysBtnEl.addEventListener('click', () => {
    openModal('myStaysModal');
    loadCustomerBookings();
  });
}

async function loadCustomerBookings() {
  if (!currentCustomer) return;
  const container = document.getElementById('myStaysListContainer');
  const emptyState = document.getElementById('myStaysEmptyState');
  
  container.innerHTML = '<div style="text-align:center; padding:20px 0;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:var(--primary)"></i></div>';
  emptyState.style.display = 'none';
  
  try {
    const res = await fetch('/api/customer/bookings', {
      headers: { 'Authorization': `Bearer ${currentCustomer.token}` }
    });
    const bookings = await res.json();
    
    if (!res.ok) throw new Error(bookings.error || 'Failed to load bookings.');
    
    container.innerHTML = '';
    if (bookings.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    bookings.forEach(b => {
      const card = document.createElement('div');
      card.className = 'booking-history-card';
      
      const isPast = new Date(b.checkIn) < new Date();
      const canCancel = b.status.toLowerCase() === 'confirmed' && !isPast;
      
      const statusColor = b.status.toLowerCase() === 'cancelled' ? 'var(--text-muted)' : 'var(--success)';
      const payColor = b.paymentStatus.toLowerCase() === 'paid' ? 'var(--success)' : 'var(--warning)';
      
      let cancelBtnHtml = '';
      if (canCancel) {
        cancelBtnHtml = `<button class="btn btn-ghost btn-sm text-danger" style="margin-top:10px;" onclick="cancelBooking(${b.id})"><i class="fa-solid fa-ban"></i> Cancel Stay</button>`;
      }
      
      card.innerHTML = `
        <div class="booking-history-info">
          <h5>${b.propertyName}</h5>
          <p><i class="fa-solid fa-calendar"></i> Check-in: <strong>${b.checkIn}</strong></p>
          <p><i class="fa-solid fa-calendar-xmark"></i> Check-out: <strong>${b.checkOut}</strong></p>
          <p><i class="fa-solid fa-ticket"></i> Booking ID: <strong>${b.bookingCode}</strong></p>
        </div>
        <div class="booking-history-status-block">
          <div style="font-size:1.1rem; font-weight:700; color:var(--primary)">₹${b.totalAmount.toLocaleString()}</div>
          <div style="font-size:0.8rem; margin-top:4px;">Status: <span style="font-weight:700; color:${statusColor}">${b.status}</span></div>
          <div style="font-size:0.8rem; margin-top:2px;">Payment: <span style="font-weight:700; color:${payColor}">${b.paymentStatus}</span></div>
          ${cancelBtnHtml}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger); text-align:center; padding:20px 0;">${err.message}</p>`;
  }
}

async function cancelBooking(bookingId) {
  if (!currentCustomer) return;
  if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
  
  try {
    const res = await fetch(`/api/customer/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentCustomer.token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking.');
    
    showToast(data.message, 'success');
    loadCustomerBookings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Multi-Provider Payment Gateway Integration ────────────────────────────────────
let activePayProvider = 'razorpay';
let pendingBookingPayload = null;
let upiId = 'homzo@upi';

async function fetchPaymentConfig() {
  try {
    const res = await fetch('/api/payments/checkout-config');
    if (res.ok) {
      const config = await res.json();
      if (config.upiId) {
        upiId = config.upiId;
      }
    }
  } catch (err) {
    console.error('Failed to load payment config:', err);
  }
}
fetchPaymentConfig();


document.querySelectorAll('.payment-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.payment-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.payment-tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    activePayProvider = btn.dataset.payProvider;
    
    const contentId = `payContent${activePayProvider.charAt(0).toUpperCase() + activePayProvider.slice(1)}`;
    document.getElementById(contentId).classList.add('active');
  });
});

const confirmBookBtnEl = document.getElementById('confirmBookBtn');
if (confirmBookBtnEl) {
  confirmBookBtnEl.addEventListener('click', () => {
    const name = document.getElementById('bkName').value.trim();
    const email = document.getElementById('bkEmail').value.trim();
    const type = document.getElementById('bkType').value;
    const phone = document.getElementById('bkPhone').value.trim();
    const checkin = document.getElementById('bkCheckin').value;
    const checkout = document.getElementById('bkCheckout').value;
    const dob = document.getElementById('bkDOB').value;
    const persons = parseInt(document.getElementById('bkPersons').value);
    const notes = document.getElementById('bkNotes').value.trim();
    const property = document.getElementById('bkProperty').value || 'General Booking (Any Property)';
    
    if (!name || name.length < 2) {
      showToast('Please enter your full name (at least 2 characters).', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    if (!phone) {
      showToast('Please enter your phone number.', 'error');
      return;
    }
    if (!dob) {
      showToast('Please enter your Date of Birth.', 'error');
      return;
    }
    if (!checkin || !checkout) {
      showToast('Please select check-in and check-out dates.', 'error');
      return;
    }
    if (new Date(checkin) >= new Date(checkout)) {
      showToast('Check-out must be after check-in.', 'error');
      return;
    }
    
    pendingBookingPayload = {
      name, email, phone, guest_type: type, property, checkin, checkout, dob, persons, notes,
      customerId: currentCustomer ? currentCustomer.id : ''
    };
    
    const typeLower = type.toLowerCase();
    let roomRate = 2000;
    if (typeLower.includes('student')) roomRate = 5000;
    else if (typeLower.includes('employee')) roomRate = 12000;
    else if (typeLower.includes('tourist')) roomRate = 3000;
    else if (typeLower.includes('foreigner')) roomRate = 4000;
    else if (typeLower.includes('couple')) roomRate = 4500;
    
    const days = Math.max(1, Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24)));
    const subtotal = roomRate * days;
    const gst = Math.round(subtotal * 0.18);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + gst + serviceCharge;
    
    document.getElementById('paySummaryProp').textContent = property;
    document.getElementById('paySummaryDates').textContent = `${checkin} to ${checkout} (${days} night(s))`;
    document.getElementById('paySummarySub').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('paySummaryFees').textContent = `₹${(gst + serviceCharge).toLocaleString()}`;
    document.getElementById('paySummaryTotal').textContent = `₹${total.toLocaleString()}`;
    
    closeModal('bookingModal');
    
    // Generate dynamic UPI URL and QR Code
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("Homzo Stays")}&am=${total}&tn=${encodeURIComponent(`Booking BKG ${name.substring(0, 10)}`)}&cu=INR`;
    
    const qrImg = document.getElementById('paytmQrImg');
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUri)}`;
    }
    
    const deepLinkBtn = document.getElementById('paytmUpiDeepLinkBtn');
    if (deepLinkBtn) {
      deepLinkBtn.href = upiUri;
      if (/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)) {
        deepLinkBtn.style.display = 'flex';
      } else {
        deepLinkBtn.style.display = 'none';
      }
    }

    document.getElementById('paytmUpiUtr').value = '';
    
    document.getElementById('payCheckoutFlow').style.display = 'block';
    document.getElementById('payProcessingScreen').style.display = 'none';
    document.getElementById('paySuccessScreen').style.display = 'none';
    
    openModal('paymentModal');
  });
}

const paySubmitBtnEl = document.getElementById('paySubmitBtn');
if (paySubmitBtnEl) {
  paySubmitBtnEl.addEventListener('click', async () => {
    if (activePayProvider === 'razorpay') {
      const card = document.getElementById('payRazorCardNum').value.trim();
      if (!card) { showToast('Please enter your card number.', 'error'); return; }
    } else if (activePayProvider === 'paytm') {
      const utr = document.getElementById('paytmUpiUtr').value.trim();
      if (!/^\d{12}$/.test(utr)) {
        showToast('Please enter a valid 12-digit UPI UTR / Ref No.', 'error');
        return;
      }
    }
    
    document.getElementById('payCheckoutFlow').style.display = 'none';
    document.getElementById('payProcessingScreen').style.display = 'flex';
    
    setTimeout(async () => {
      try {
        const isUpi = activePayProvider === 'paytm';
        const payload = {
          ...pendingBookingPayload,
          paymentStatus: isUpi ? 'Pending Verification' : 'Paid',
          paymentId: isUpi ? '' : 'PAYID_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          transactionRef: isUpi ? document.getElementById('paytmUpiUtr').value.trim() : 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase()
        };
        
        const res = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Booking reservation failed.');
        
        const successTxt = isUpi 
          ? `Your booking is received! Booking ID: BKG${1000 + data.id}. It is pending payment verification (UTR Ref: ${payload.transactionRef}).`
          : `Room successfully reserved! Booking ID: BKG${1000 + data.id}. A payment confirmation has been simulated.`;
        document.getElementById('paySuccessTxt').textContent = successTxt;
        
        document.getElementById('payProcessingScreen').style.display = 'none';
        document.getElementById('paySuccessScreen').style.display = 'flex';
        
        showToast(isUpi ? 'Booking received! Pending verification.' : 'Booking and Payment successful!', 'success');
        
        if (currentCustomer) {
          loadCustomerBookings();
        }
        
        const loc = document.getElementById('searchLocation').value;
        const ci  = document.getElementById('searchCheckin').value;
        const co  = document.getElementById('searchCheckout').value;
        if (loc && ci && co) {
          const checkRes = await fetch(`/api/properties/availabilities?checkin=${ci}&checkout=${co}`);
          if (checkRes.ok) {
            searchAvailabilityMap = await checkRes.json();
            performAdvancedFilters();
          }
        }
        
      } catch (err) {
        document.getElementById('payProcessingScreen').style.display = 'none';
        document.getElementById('payCheckoutFlow').style.display = 'block';
        showToast(err.message, 'error');
      }
    }, 2500);
  });
}

// ─── Dynamic Properties Data Fetching ────────────────────────────────────
const fallbackProperties = [
  { id:1, name:'HOMZO Scholar Nest', location:'Andheri West, Mumbai', type:'students', price:'₹4,200', unit:'/mo', rating:4.8, reviews:124, beds:1, baths:1, area:220, img:'student_room.png' },
  { id:2, name:'HOMZO Executive Suite', location:'Koramangala, Bengaluru', type:'employees', price:'₹12,500', unit:'/mo', rating:4.9, reviews:89, beds:2, baths:2, area:480, img:'employee_room.png' },
  { id:3, name:'HOMZO Beach Retreat', location:'Calangute, Goa', type:'tourists', price:'₹2,800', unit:'/night', rating:4.7, reviews:218, beds:1, baths:1, area:320, img:'tourist_room.png' },
  { id:4, name:'HOMZO Global Residency', location:'Bandra, Mumbai', type:'foreigners', price:'$45', unit:'/night', rating:4.9, reviews:63, beds:2, baths:2, area:550, img:'foreigner_room.png' },
  { id:5, name:'HOMZO Campus Pad', location:'Hauz Khas, Delhi', type:'students', price:'₹5,000', unit:'/mo', rating:4.6, reviews:97, beds:1, baths:1, area:260, img:'student_room.png' },
  { id:6, name:'HOMZO Corp Quarters', location:'HITEC City, Hyderabad', type:'employees', price:'₹10,800', unit:'/mo', rating:4.8, reviews:112, beds:2, baths:1, area:430, img:'employee_room.png' },
  { id:7, name:'HOMZO Heritage View', location:'Amer, Jaipur', type:'tourists', price:'₹1,900', unit:'/night', rating:4.7, reviews:174, beds:1, baths:1, area:290, img:'tourist_room.png' },
  { id:8, name:'HOMZO International Inn', location:'Connaught Place, Delhi', type:'foreigners', price:'$35', unit:'/night', rating:4.8, reviews:55, beds:1, baths:1, area:380, img:'foreigner_room.png' },
  { id:9, name:'HOMZO Study Haven', location:'FC Road, Pune', type:'students', price:'₹3,800', unit:'/mo', rating:4.5, reviews:81, beds:1, baths:1, area:210, img:'student_room.png' },
  { id:10, name:'HOMZO Romantic Retreat', location:'Lonavala, Maharashtra', type:'couples', price:'₹4,500', unit:'/night', rating:4.9, reviews:156, beds:1, baths:1, area:350, img:'couple_room.png' },
  { id:11, name:'HOMZO Family Haven', location:'Whitefield, Bengaluru', type:'families', price:'₹2,500', unit:'/night', rating:4.8, reviews:45, beds:3, baths:2, area:750, img:'family_room.png' },
  { id:12, name:'HOMZO Grand Family Suite', location:'Juhu, Mumbai', type:'families', price:'₹4,500', unit:'/night', rating:4.9, reviews:38, beds:3, baths:3, area:950, img:'family_room.png' },
];

let properties = [];
let likedProps = new Set();
let visibleCount = 6;
let activeFilter = 'all';

async function fetchProperties() {
  try {
    const res = await fetch('/api/properties');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      properties = data.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        type: p.type || 'tourists',
        price: '₹' + p.price.toLocaleString(),
        unit: p.type === 'students' || p.type === 'employees' ? '/mo' : '/night',
        rating: parseFloat(p.rating) || 4.8,
        reviews: parseInt(p.reviews) || 50,
        beds: p.beds || 2,
        baths: p.baths || 2,
        area: p.area || 350,
        img: p.img || 'couple_room.png',
        latitude: p.latitude,
        longitude: p.longitude
      }));
    } else {
      properties = [];
    }
  } catch (err) {
    console.error('Failed to fetch properties from server:', err);
    properties = [];
  }
  
  const searchBox = document.getElementById('searchBox');
  const categories = document.getElementById('categories');
  const propertiesSec = document.getElementById('properties');
  const testimonials = document.getElementById('testimonials');
  const launchingSoonSec = document.getElementById('launchingSoonSection');

  if (properties.length === 0) {
    if (searchBox) searchBox.style.display = 'none';
    if (categories) categories.style.display = 'none';
    if (propertiesSec) propertiesSec.style.display = 'none';
    if (testimonials) testimonials.style.display = 'none';
    if (launchingSoonSec) launchingSoonSec.style.display = 'block';
  } else {
    if (searchBox) searchBox.style.display = 'block';
    if (categories) categories.style.display = 'block';
    if (propertiesSec) propertiesSec.style.display = 'block';
    if (testimonials) testimonials.style.display = 'block';
    if (launchingSoonSec) launchingSoonSec.style.display = 'none';
    renderProperties('all', 6);
  }

  // Handle Launch Notify Form Submission
  const notifyForm = document.getElementById('notifyLaunchForm');
  if (notifyForm) {
    // Prevent duplicate listener attachments by setting onclick/onsubmit directly or checking an custom flag
    if (!notifyForm.dataset.listenerAttached) {
      notifyForm.dataset.listenerAttached = "true";
      notifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('notifyEmail').value.trim();
        if (email) {
          showToast(`Subscription successful! We will notify ${email} at launch.`, 'success');
          notifyForm.reset();
        }
      });
    }
  }
}

function renderProperties(filter = 'all', count = 6) {
  const grid = document.getElementById('propGrid');
  if (!grid) return;
  
  const filtered = filter === 'all' ? properties : properties.filter(p => p.type === filter);
  const slice = filtered.slice(0, count);
  grid.innerHTML = '';
  
  slice.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'prop-card reveal';
    card.setAttribute('data-type', p.type);
    card.style.animationDelay = `${i * 0.08}s`;
    card.innerHTML = `
      <div class="prop-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <div class="prop-tag badge badge-${p.type === 'couples' ? 'danger' : p.type === 'students' ? 'success' : p.type === 'employees' ? 'info' : p.type === 'tourists' ? 'warning' : 'primary'}">${p.type}</div>
        <button class="prop-fav ${likedProps.has(p.id) ? 'liked' : ''}" onclick="toggleFav(${p.id}, this)">
          <i class="fa-${likedProps.has(p.id) ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
      <div class="prop-body">
        <div class="prop-location"><i class="fa-solid fa-location-dot"></i> ${p.location}</div>
        <div class="prop-name">${p.name}</div>
        <div class="prop-meta">
          <span><i class="fa-solid fa-bed"></i> ${p.beds} Bed</span>
          <span><i class="fa-solid fa-bath"></i> ${p.baths} Bath</span>
          <span><i class="fa-solid fa-vector-square"></i> ${p.area} sq.ft</span>
        </div>
        <div class="prop-footer">
          <div class="prop-price"><strong>${p.price}</strong><span>${p.unit}</span></div>
        </div>
        <button class="btn btn-primary" style="width:100%; margin-top:14px" onclick="bookProperty('${p.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-calendar-check"></i> Book Now
        </button>
      </div>`;
    grid.appendChild(card);
  });
  
  const hasMore = filtered.length > count;
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
  
  setTimeout(activateReveal, 50);
}

function filterProperties(type) {
  activeFilter = type;
  visibleCount = 6;
  renderProperties(type, visibleCount);
}

function toggleFav(id, el) {
  if (likedProps.has(id)) {
    likedProps.delete(id);
    el.classList.remove('liked');
    el.innerHTML = '<i class="fa-regular fa-heart"></i>';
    showToast('Removed from wishlist.', 'info');
  } else {
    likedProps.add(id);
    el.classList.add('liked');
    el.innerHTML = '<i class="fa-solid fa-heart"></i>';
    showToast('Added to wishlist! ❤️', 'success');
  }
}

function bookProperty(name) {
  document.getElementById('bkProperty').value = name;
  
  if (currentCustomer) {
    document.getElementById('bkName').value = currentCustomer.name || '';
    document.getElementById('bkEmail').value = currentCustomer.email || '';
  }
  
  openModal('bookingModal');
}

window.toggleFav = toggleFav;
window.bookProperty = bookProperty;

const loadMoreBtn = document.getElementById('loadMoreBtn');
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    visibleCount += 3;
    renderProperties(activeFilter, visibleCount);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterProperties(btn.dataset.filter);
    const stab = document.querySelector(`.stab[data-tab="${btn.dataset.filter}"]`);
    if (stab) {
      document.querySelectorAll('.stab').forEach(s => s.classList.remove('active'));
      stab.classList.add('active');
    }
  });
});

// ─── Scroll Reveal ────────────────────────────────────
function activateReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

document.querySelectorAll('.why-card, .amenity-item, .testi-card, .cat-card').forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${(i % 6) * 0.08}s`;
});
activateReveal();

// ─── Category Modal ───────────────────────────────────
const catData = {
  students: {
    icon: 'fa-graduation-cap',
    iconBg: 'rgba(34,197,94,0.15)',
    iconColor: '#22c55e',
    title: 'Student Accommodation',
    desc: 'Fully furnished Homzo stays and shared suites near top colleges and universities. Designed for focused learning and comfortable living.',
    plans: [
      { name: 'Shared Room', desc: 'Up to 3 sharing, common kitchen', price: '₹3,500/mo' },
      { name: 'Semi-Private', desc: '2 sharing, attached bathroom', price: '₹5,500/mo', recommended: true },
      { name: 'Private Room', desc: 'Solo room, fully furnished', price: '₹8,000/mo' },
    ]
  },
  employees: {
    icon: 'fa-briefcase',
    iconBg: 'rgba(59,130,246,0.15)',
    iconColor: '#3b82f6',
    title: 'Corporate Stays',
    desc: 'Premium service apartments for professionals. Corporate billing available, flexible lease from 1 week to 12 months.',
    plans: [
      { name: 'Studio Suite', desc: '1BHK, work desk, fast WiFi', price: '₹9,000/mo' },
      { name: 'Business Deluxe', desc: '2BHK, gym, meeting room', price: '₹14,500/mo', recommended: true },
      { name: 'Executive Penthouse', desc: '3BHK, city view, concierge', price: '₹22,000/mo' },
    ]
  },
  tourists: {
    icon: 'fa-umbrella-beach',
    iconBg: 'rgba(245,158,11,0.15)',
    iconColor: '#f59e0b',
    title: 'Tourist Stays',
    desc: 'Cozy and vibrant rooms at prime tourist destinations. Includes local guide packages, cab services, and daily housekeeping.',
    plans: [
      { name: 'Solo Backpacker', desc: 'Dormitory bed, shared bathroom, free WiFi', price: '₹499/night' },
      { name: 'Budget Escape', desc: 'Single room, breakfast included', price: '₹1,200/night' },
      { name: 'Explorer Pack', desc: 'Double room + 1 guided tour', price: '₹2,500/night', recommended: true },
      { name: 'Premium Vacation', desc: 'Suite + all tours + cab', price: '₹5,000/night' },
    ]
  },
  foreigners: {
    icon: 'fa-globe',
    iconBg: 'rgba(168,85,247,0.15)',
    iconColor: '#a855f7',
    title: 'International Guest Stays',
    desc: 'International-standard suites with multi-lingual support, visa assistance, global payment options, and 24/7 concierge.',
    plans: [
      { name: 'Standard Suite', desc: '1BHK, multi-lingual support', price: '$25/night' },
      { name: 'Premium Suite', desc: '2BHK, visa help + concierge', price: '$50/night', recommended: true },
      { name: 'Luxury Villa', desc: 'Private villa, all-inclusive', price: '$120/night' },
    ]
  },
  couples: {
    icon: 'fa-heart',
    iconBg: 'rgba(239,68,68,0.15)',
    iconColor: '#ef4444',
    title: 'Couples Retreat',
    desc: 'Private, romantic stays with absolute privacy and hassle-free check-ins for couples. Verified, secure, and comfortable.',
    plans: [
      { name: 'Cozy Room', desc: 'Standard room with privacy', price: '₹1,500/night' },
      { name: 'Romantic Suite', desc: 'Premium room, welcome drinks', price: '₹3,000/night', recommended: true },
      { name: 'Luxury Getaway', desc: 'Suite with private jacuzzi', price: '₹6,500/night' },
    ]
  },
  families: {
    icon: 'fa-people-roof',
    iconBg: 'rgba(6,182,212,0.15)',
    iconColor: '#06b6d4',
    title: 'Families & Groups',
    desc: 'Spacious suites and interconnected rooms designed for family comfort and group stays. Kid-safe layout, kitchen access, and laundry services.',
    plans: [
      { name: 'Comfort Suite', desc: '2BHK, private kitchen, 4 guests max', price: '₹2,500/night' },
      { name: 'Family Grand', desc: '3BHK, kids play zone, laundry, 6 guests max', price: '₹4,500/night', recommended: true },
      { name: 'Royal Villa', desc: 'Private luxury villa, private pool, full dining service', price: '₹10,000/night' }
    ]
  }
};

function openCategoryModal(type) {
  const d = catData[type];
  const content = document.getElementById('categoryModalContent');
  const defaultPlan = d.plans.find(p => p.recommended) || d.plans[0];
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal('categoryModal')"><i class="fa-solid fa-xmark"></i></button>
    <div class="cmodal-header">
      <div class="cmodal-icon" style="background:${d.iconBg}; color:${d.iconColor}"><i class="fa-solid ${d.icon}"></i></div>
      <div>
        <h2 style="font-size:1.4rem; margin-bottom:4px">${d.title}</h2>
        <p style="font-size:0.85rem; color:var(--text-secondary)">${d.desc}</p>
      </div>
    </div>
    <h4 style="font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:12px">Available Plans</h4>
    <div class="cmodal-plans">
      ${d.plans.map(p => `
        <div class="cmodal-plan ${p.name === defaultPlan.name ? 'selected' : ''}" onclick="selectModalPlan(this, '${p.name}')" style="cursor:pointer; transition: 0.3s;">
          <div>
            ${p.recommended ? '<div class="badge badge-primary" style="margin-bottom:6px; font-size:10px">Recommended</div>' : ''}
            <h5>${p.name}</h5>
            <p>${p.desc}</p>
          </div>
          <div class="price">${p.price}</div>
        </div>
      `).join('')}
    </div>
    <button id="cmodalBookBtn" class="btn btn-primary" style="width:100%" data-plan="${defaultPlan.name}" onclick="closeModal('categoryModal'); document.getElementById('bkProperty').value = '${d.title} - ' + this.dataset.plan; openModal('bookingModal');">
      <i class="fa-solid fa-calendar-check"></i> Book This Plan
    </button>
  `;
  openModal('categoryModal');
}

window.selectModalPlan = function(el, planName) {
  document.querySelectorAll('.cmodal-plan').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('cmodalBookBtn').dataset.plan = planName;
}

// ─── Guest Reviews Logic ──────────────────────────────
let publicReviews = [];
let visibleReviewsCount = 3;

const writeReviewBtnEl = document.getElementById('writeReviewBtn');
if (writeReviewBtnEl) {
  writeReviewBtnEl.addEventListener('click', () => {
    openModal('reviewModal');
  });
}

const starSelector = document.getElementById('starRatingSelector');
if (starSelector) {
  const starIcons = starSelector.querySelectorAll('i');
  const ratingInput = document.getElementById('rvRating');

  starIcons.forEach(star => {
    star.addEventListener('mouseover', () => {
      const val = parseInt(star.dataset.value);
      highlightStars(val);
    });
    star.addEventListener('mouseout', () => {
      const activeVal = ratingInput ? parseInt(ratingInput.value) : 0;
      highlightStars(activeVal);
    });
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value);
      if (ratingInput) ratingInput.value = val;
      highlightStars(val);
    });
  });
}

function highlightStars(count) {
  const starSelector = document.getElementById('starRatingSelector');
  if (!starSelector) return;
  const starIcons = starSelector.querySelectorAll('i');
  starIcons.forEach(star => {
    const val = parseInt(star.dataset.value);
    if (val <= count) {
      star.className = 'fa-solid fa-star';
      star.style.color = '#ff5c35';
    } else {
      star.className = 'fa-regular fa-star';
      star.style.color = 'var(--text-muted)';
    }
  });
}

const confirmReviewBtnEl = document.getElementById('confirmReviewBtn');
if (confirmReviewBtnEl) {
  confirmReviewBtnEl.addEventListener('click', async () => {
    const name = document.getElementById('rvName').value.trim();
    const email = document.getElementById('rvEmail').value.trim();
    const ratingInput = document.getElementById('rvRating');
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const review = document.getElementById('rvContent').value.trim();

    if (!name || !email || !review) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    if (rating === 0) {
      showToast('Please select a star rating.', 'error');
      return;
    }

    const btn = document.getElementById('confirmReviewBtn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, rating, review })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      closeModal('reviewModal');
      showToast('Review submitted! It will appear after admin approval.', 'success');
      
      document.getElementById('rvName').value = '';
      document.getElementById('rvEmail').value = '';
      document.getElementById('rvContent').value = '';
      if (ratingInput) ratingInput.value = 0;
      highlightStars(0);
    } catch (err) {
      console.error('Review submission error:', err);
      showToast(err.message === 'Failed to fetch' ? 'Backend offline. Review not saved.' : err.message, 'error');
    } finally {
      btn.innerHTML = originalHtml;
    }
  });
}

async function fetchAndRenderReviews() {
  const reviewsActive = localStorage.getItem('homzo_guest_reviews_active') !== 'false';
  if (!reviewsActive) {
    document.getElementById('testimonials').style.display = 'none';
    return;
  }
  document.getElementById('testimonials').style.display = 'block';
  try {
    const res = await fetch('/api/reviews?status=approved');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    publicReviews = await res.json();
    publicReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderReviewsSummary();
    renderPublicReviewsList();
  } catch (err) {
    console.error('Fetch reviews error:', err);
    renderReviewsSummary();
  }
}

function renderReviewsSummary() {
  const count = publicReviews.length;
  document.getElementById('totalReviewsCount').textContent = `Based on ${count} review${count !== 1 ? 's' : ''}`;
  
  if (count === 0) {
    document.getElementById('avgRatingNum').textContent = '0.0';
    renderStars('avgRatingStars', 0);
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`bar${i}`).style.width = '0%';
      document.getElementById(`pct${i}`).textContent = '0%';
    }
    document.getElementById('reviewsGridContainer').style.display = 'none';
    return;
  }

  const sum = publicReviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = (sum / count).toFixed(1);
  document.getElementById('avgRatingNum').textContent = avg;
  renderStars('avgRatingStars', parseFloat(avg));

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  publicReviews.forEach(r => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
  });

  for (let i = 1; i <= 5; i++) {
    const pct = Math.round((breakdown[i] / count) * 100);
    document.getElementById(`bar${i}`).style.width = `${pct}%`;
    document.getElementById(`pct${i}`).textContent = `${pct}%`;
  }

  document.getElementById('reviewsGridContainer').style.display = 'block';
}

function renderStars(containerId, rating) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  for (let i = 0; i < fullStars; i++) {
    container.innerHTML += '<i class="fa-solid fa-star" style="color:#ff5c35"></i>';
  }
  if (halfStar) {
    container.innerHTML += '<i class="fa-solid fa-star-half-stroke" style="color:#ff5c35"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    container.innerHTML += '<i class="fa-regular fa-star" style="color:var(--text-muted)"></i>';
  }
}

function renderPublicReviewsList() {
  const grid = document.getElementById('publicReviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const visible = publicReviews.slice(0, visibleReviewsCount);
  if (visible.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted)">No reviews approved yet.</p>';
    return;
  }

  visible.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'review-card reveal';
    card.style.animationDelay = `${i * 0.08}s`;
    
    let starsHtml = '';
    for (let s = 1; s <= 5; s++) {
      if (s <= r.rating) {
        starsHtml += '<i class="fa-solid fa-star" style="color:#ff5c35; font-size:12px; margin-right:2px"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color:var(--text-muted); font-size:12px; margin-right:2px"></i>';
      }
    }

    const dateStr = new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const initial = r.name ? r.name.charAt(0).toUpperCase() : 'G';
    
    let replyHtml = '';
    if (r.reply) {
      replyHtml = `
        <div class="review-reply">
          <div class="reply-header">
            <div class="reply-avatar-mini"><i class="fa-solid fa-user-shield"></i></div>
            <div class="reply-author">HOMZO Team Response</div>
          </div>
          <div class="reply-body">
            <p>${r.reply}</p>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="review-header">
        <div class="review-avatar">${initial}</div>
        <div class="review-meta">
          <div class="review-author">${r.name}</div>
          <div class="review-date">${dateStr}</div>
        </div>
        <div class="review-rating">${starsHtml}</div>
      </div>
      <div class="review-body">
        <p>${r.review}</p>
      </div>
      ${replyHtml}
    `;
    grid.appendChild(card);
  });

  const loadMoreBtn = document.getElementById('loadMoreReviewsBtn');
  if (loadMoreBtn) {
    if (publicReviews.length > visibleReviewsCount) {
      loadMoreBtn.style.display = 'inline-flex';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  setTimeout(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    grid.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }, 50);
}

const loadMoreReviewsBtn = document.getElementById('loadMoreReviewsBtn');
if (loadMoreReviewsBtn) {
  loadMoreReviewsBtn.addEventListener('click', () => {
    visibleReviewsCount += 3;
    renderPublicReviewsList();
  });
}

// ─── Initialize ───────────────────────────────────────
fetchProperties();
fetchAndRenderReviews();

// Set min date on date pickers
const todayDateStr = new Date().toISOString().split('T')[0];
document.querySelectorAll('input[type="date"]').forEach(d => {
  if (d.id !== 'bkDOB') d.min = todayDateStr;
});
