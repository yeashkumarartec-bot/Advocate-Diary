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

    // --- 2. HANDLE SUBMIT ---
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
                // --- LOGIN LOGIC (With Auto-Save Fix) ---
                auth.signInWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // 🔒 Check Verification
                        if (user.emailVerified) {
                            
                            // ✅ FIX: Ensure User exists in DB (Self-Healing)
                            // पुराने यूजर्स को लॉगिन पर रजिस्टर में चढ़ा देगा
                            db.collection('users').doc(user.uid).set({
                                email: user.email,
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                                isVerified: true
                            }, { merge: true }) // merge: true मतलब पुराना डेटा नहीं उड़ेगा
                            .then(() => {
                                window.location.href = 'index.html';
                            });

                        } else {
                            auth.signOut();
                            alert("Access Denied: Your email is not verified yet.\n\nPlease check your inbox.");
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
                // --- REGISTER LOGIC ---
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
                            alert(`✅ Account Created!\n\nVerfication link sent to ${email}. Check inbox.`);
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
            if (!email) { alert("Enter email first."); return; }
            if(confirm(`Send reset link to ${email}?`)) {
                auth.sendPasswordResetEmail(email)
                    .then(() => alert("Reset link sent!"))
                    .catch((error) => alert(error.message));
            }
        });
    }

    // --- 4. GOOGLE LOGIN ---
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // Save User on Google Login too
                    db.collection('users').doc(result.user.uid).set({
                        email: result.user.email,
                        name: result.user.displayName,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        isVerified: true
                    }, { merge: true });
                    window.location.href = 'index.html';
                })
                .catch((error) => alert("Google Login Failed: " + error.message));
        });
    }
});