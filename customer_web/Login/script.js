const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

// Unified Portal Authentication Logic
const signInSubmitBtn = document.getElementById('signInSubmitBtn');
const signUpSubmitBtn = document.getElementById('signUpSubmitBtn');

if (signInSubmitBtn) {
    signInSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }

        const originalText = signInSubmitBtn.innerHTML;
        signInSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        signInSubmitBtn.disabled = true;

        try {
            // Step 1: Attempt standard login (/api/auth/login) for Admins/Employees and Partners
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                
                if (data.role === 'partner') {
                    localStorage.setItem('homzo_partner_token', data.token);
                    alert('Sign In successful! Redirecting to Partner Portal...');
                    window.location.href = '/management_console/partner.html';
                } else {
                    localStorage.setItem('homzo_admin_token', data.token);
                    localStorage.setItem('homzo_admin_user', JSON.stringify(data));
                    
                    const companyControlRoles = ['ceo', 'super_admin', 'cto', 'developer'];
                    if (companyControlRoles.includes(data.role.toLowerCase())) {
                        alert('Sign In successful! Redirecting to Admin Dashboard...');
                        window.location.href = '/admin_console/admin.html';
                    } else {
                        alert('Sign In successful! Redirecting to Management Dashboard...');
                        window.location.href = '/management_console/management.html';
                    }
                }
                return;
            }

            // Step 2: Fallback to customer login (/api/auth/customer/login)
            const custRes = await fetch('/api/auth/customer/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (custRes.ok) {
                const data = await custRes.json();
                localStorage.setItem('customerToken', data.token);
                localStorage.setItem('customerName', data.name);
                localStorage.setItem('customerEmail', data.email);
                localStorage.setItem('customerId', data.customerId);
                alert(`Welcome back, ${data.name}! Redirecting to homepage...`);
                window.location.href = '/index.html';
                return;
            }

            // If both failed, try to parse error message
            let errMsg = 'Invalid email or password.';
            try {
                const errData = await res.clone().json();
                errMsg = errData.error || errMsg;
            } catch (errJson) {}
            alert(errMsg);

        } catch (err) {
            alert('Network error while processing Sign In.');
            console.error(err);
        } finally {
            signInSubmitBtn.innerHTML = originalText;
            signInSubmitBtn.disabled = false;
        }
    });
}

if (signUpSubmitBtn) {
    signUpSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;

        if (!name || !email || !phone || !password) {
            alert('Please fill out all registration fields.');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        const originalText = signUpSubmitBtn.innerHTML;
        signUpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        signUpSubmitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/customer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Registration successful! Please sign in with your credentials.');
                // Switch to login panel
                container.classList.remove("right-panel-active");
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = '';
            } else {
                alert(data.error || 'Registration failed.');
            }
        } catch (err) {
            alert('Network error while processing registration.');
            console.error(err);
        } finally {
            signUpSubmitBtn.innerHTML = originalText;
            signUpSubmitBtn.disabled = false;
        }
    });
}

// Forgot Password Modal Controls
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const resetPasswordModal = document.getElementById('resetPasswordModal');
const closeResetModalBtn = document.getElementById('closeResetModalBtn');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyResetBtn = document.getElementById('verifyResetBtn');

const resetStep1 = document.getElementById('resetStep1');
const resetStep2 = document.getElementById('resetStep2');
const resetEmail = document.getElementById('resetEmail');
const resetOtp = document.getElementById('resetOtp');
const resetNewPassword = document.getElementById('resetNewPassword');
const resetConfirmPassword = document.getElementById('resetConfirmPassword');

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetPasswordModal.style.display = 'flex';
        resetStep1.style.display = 'block';
        resetStep2.style.display = 'none';
        resetEmail.value = '';
    });
}

if (closeResetModalBtn) {
    closeResetModalBtn.addEventListener('click', () => {
        resetPasswordModal.style.display = 'none';
    });
}

// Close on overlay click
if (resetPasswordModal) {
    resetPasswordModal.addEventListener('click', (e) => {
        if (e.target === resetPasswordModal) {
            resetPasswordModal.style.display = 'none';
        }
    });
}

if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
        const email = resetEmail.value.trim();
        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendOtpBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                alert('OTP code generated successfully! Check server console log in simulation mode.');
                resetStep1.style.display = 'none';
                resetStep2.style.display = 'block';
                resetOtp.value = '';
                resetNewPassword.value = '';
                resetConfirmPassword.value = '';
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to send OTP code.');
            }
        } catch (e) {
            alert('Network error while requesting OTP.');
        } finally {
            sendOtpBtn.innerText = 'Send OTP Code';
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
            alert('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        verifyResetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        verifyResetBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });

            if (res.ok) {
                alert('Password reset successfully! You can now log in.');
                resetPasswordModal.style.display = 'none';
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to reset password.');
            }
        } catch (e) {
            alert('Network error during password reset.');
        } finally {
            verifyResetBtn.innerText = 'Update Password';
            verifyResetBtn.disabled = false;
        }
    });
}
