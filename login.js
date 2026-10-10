document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleText = document.getElementById('toggleText');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    // State
    let isLoginMode = true;

    // 1. LIQUID GLASS TOAST NOTIFICATION HELPER
    function showToast(message, type = 'info') {
        let container = document.getElementById('glassToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'glassToastContainer';
            container.style.cssText = `
                position: fixed;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: 90%;
                max-width: 380px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'glass-toast';
        
        let icon = 'ℹ️';
        let borderColor = 'rgba(99, 102, 241, 0.4)';
        let glowColor = 'rgba(99, 102, 241, 0.2)';
        
        if (type === 'error') {
            icon = '⚠️';
            borderColor = 'rgba(239, 68, 68, 0.4)';
            glowColor = 'rgba(239, 68, 68, 0.25)';
        } else if (type === 'success') {
            icon = '✅';
            borderColor = 'rgba(16, 185, 129, 0.4)';
            glowColor = 'rgba(16, 185, 129, 0.25)';
        }

        toast.style.cssText = `
            background: rgba(18, 24, 38, 0.85);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid ${borderColor};
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 14px;
            padding: 14px 18px;
            color: #ffffff;
            font-size: 0.92rem;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6), 0 0 15px ${glowColor};
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
            transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
        `;

        toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span style="line-height: 1.4;">${message}</span>`;
        container.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        });

        // Auto Dismiss
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-15px) scale(0.95)';
            setTimeout(() => toast.remove(), 350);
        }, 3600);
    }

    // 2. TOGGLE LOGIN / REGISTER (Using Clean Event Delegation)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'toggleAuthMode') {
            e.preventDefault();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                if (formTitle) formTitle.textContent = "Login";
                if (submitBtn) submitBtn.textContent = "Login";
                if (toggleText) {
                    toggleText.innerHTML = `No account? <a href="#" id="toggleAuthMode" style="color: #818cf8; font-weight: 600;">Create one</a>`;
                }
                if (forgotPasswordLink) forgotPasswordLink.style.display = 'block';
            } else {
                if (formTitle) formTitle.textContent = "Create Account";
                if (submitBtn) submitBtn.textContent = "Sign Up";
                if (toggleText) {
                    toggleText.innerHTML = `Already have an account? <a href="#" id="toggleAuthMode" style="color: #818cf8; font-weight: 600;">Login</a>`;
                }
                if (forgotPasswordLink) forgotPasswordLink.style.display = 'none';
            }
        }
    });

    // 3. HANDLE FORM SUBMISSION
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (password.length < 6) {
                showToast("Password must be at least 6 characters long.", "error");
                return;
            }

            // Tactile Loading State
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Connecting...";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.75";

            if (isLoginMode) {
                // LOGIN FLOW
                auth.signInWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // Verification Check
                        if (user.emailVerified) {
                            showToast("Access Granted. Redirecting...", "success");
                            
                            // Self-Healing Firestore Doc Creation
                            db.collection('users').doc(user.uid).set({
                                email: user.email,
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                                isVerified: true
                            }, { merge: true })
                            .then(() => {
                                setTimeout(() => {
                                    window.location.href = 'index.html';
                                }, 600);
                            });

                        } else {
                            auth.signOut();
                            showToast("Email not verified yet. Please check your inbox.", "error");
                            submitBtn.textContent = originalText;
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = "1";
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        showToast(error.message.replace("Firebase: ", ""), "error");
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = "1";
                    });

            } else {
                // REGISTER FLOW
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        user.sendEmailVerification().then(() => {
                            return db.collection('users').doc(user.uid).set({
                                email: email,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                isVerified: false
                            });
                        }).then(() => {
                            auth.signOut();
                            showToast("Account Created! Check inbox for verification link.", "success");
                            setTimeout(() => location.reload(), 2000); 
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        showToast(error.message.replace("Firebase: ", ""), "error");
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = "1";
                    });
            }
        });
    }

    // 4. FORGOT PASSWORD
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) { 
                showToast("Please enter your email address first.", "error"); 
                emailInput.focus();
                return; 
            }

            if (confirm(`Send password reset email to ${email}?`)) {
                auth.sendPasswordResetEmail(email)
                    .then(() => showToast(`Password reset link sent to ${email}`, "success"))
                    .catch((error) => showToast(error.message.replace("Firebase: ", ""), "error"));
            }
        });
    }

    // 5. GOOGLE LOGIN (WEB POPUP)
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            auth.signInWithPopup(provider)
                .then((result) => {
                    showToast("Authentication successful! Welcome.", "success");
                    db.collection('users').doc(result.user.uid).set({
                        email: result.user.email,
                        name: result.user.displayName,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        isVerified: true
                    }, { merge: true }).then(() => {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 600);
                    });
                })
                .catch((error) => {
                    if (error.code !== 'auth/popup-closed-by-user') {
                        showToast("Google Login Failed: " + error.message, "error");
                    }
                });
        });
    }
});