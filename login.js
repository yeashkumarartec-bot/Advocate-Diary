document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const toggleText = document.getElementById('toggleText');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    // State
    let isLoginMode = true;

    // --- 1. TOGGLE LOGIN / REGISTER ---
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                formTitle.textContent = "Login";
                submitBtn.textContent = "Login";
                toggleText.innerHTML = `No account? <a href="#" id="toggleAuthMode" style="color: var(--primary); font-weight: bold;">Create one</a>`;
                forgotPasswordLink.style.display = 'block';
            } else {
                formTitle.textContent = "Create Account";
                submitBtn.textContent = "Sign Up";
                toggleText.innerHTML = `Already have an account? <a href="#" id="toggleAuthMode" style="color: var(--primary); font-weight: bold;">Login</a>`;
                forgotPasswordLink.style.display = 'none';
            }
            
            // Re-attach listener
            document.getElementById('toggleAuthMode').addEventListener('click', toggleAuthMode.click.bind(toggleAuthMode));
        });
    }

    // --- 2. HANDLE SUBMIT (SECURE LOGIC) ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;

            if(password.length < 6) {
                alert("Security Alert: Password must be at least 6 characters long.");
                return;
            }

            // Loading State
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Processing...";
            submitBtn.disabled = true;

            if (isLoginMode) {
                // --- LOGIN LOGIC (With Verification Check) ---
                auth.signInWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // 🔒 SECURITY CHECK: Is Email Verified?
                        if (user.emailVerified) {
                            // Success
                            window.location.href = 'index.html';
                        } else {
                            // Failed: Email not verified
                            auth.signOut(); // Logout immediately
                            alert("Access Denied: Your email is not verified yet.\n\nPlease check your inbox (and spam folder) for the verification link.");
                            submitBtn.textContent = originalText;
                            submitBtn.disabled = false;
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        alert("Login Failed: " + error.message);
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    });

            } else {
                // --- REGISTER LOGIC (Send Verification Email) ---
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // 1. Send Verification Link
                        user.sendEmailVerification().then(() => {
                            // 2. Create Database Entry
                            return db.collection('users').doc(user.uid).set({
                                email: email,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                isVerified: false
                            });
                        }).then(() => {
                            // 3. Force Logout & Show Alert
                            auth.signOut();
                            alert(`✅ Account Created Successfully!\n\n🔒 SECURITY STEP: We have sent a verification link to ${email}.\n\nPlease verify your email before logging in.`);
                            
                            // 4. Switch back to Login Mode
                            location.reload(); 
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        alert("Registration Failed: " + error.message);
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    });
            }
        });
    }

    // --- 3. FORGOT PASSWORD ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            if (!email) {
                alert("Please enter your email address to reset password.");
                emailInput.focus();
                return;
            }
            if(confirm(`Send password reset link to ${email}?`)) {
                auth.sendPasswordResetEmail(email)
                    .then(() => alert("Reset link sent! Check your email."))
                    .catch((error) => alert("Error: " + error.message));
            }
        });
    }

    // --- 4. GOOGLE LOGIN (Always Secure) ---
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // Google users are automatically verified
                    db.collection('users').doc(result.user.uid).set({
                        email: result.user.email,
                        name: result.user.displayName,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        isVerified: true
                    }, { merge: true });
                    window.location.href = 'index.html';
                })
                .catch((error) => alert("Google Sign-In Failed: " + error.message));
        });
    }
});