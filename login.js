document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); const db = firebase.firestore();
    const els = { login: document.getElementById('loginView'), signup: document.getElementById('signupView'), forgot: document.getElementById('forgotView') };

    function show(view) {
        els.login.style.display = 'none'; els.signup.style.display = 'none'; els.forgot.style.display = 'none';
        view.style.display = 'flex'; // Flex makes it stack correctly
    }

    document.getElementById('showSignup').onclick = () => show(els.signup);
    document.getElementById('showForgot').onclick = () => show(els.forgot);
    document.getElementById('showLoginFromSignup').onclick = () => show(els.login);
    document.getElementById('showLoginFromForgot').onclick = () => show(els.login);

    document.getElementById('btnLogin').onclick = () => {
        const e = document.getElementById('loginEmail').value, p = document.getElementById('loginPassword').value;
        auth.signInWithEmailAndPassword(e, p).then(u => { saveUser(u.user); window.location.href='dashboard.html'; }).catch(e => alert(e.message));
    };

    document.getElementById('btnSignup').onclick = () => {
        const e = document.getElementById('signupEmail').value, p = document.getElementById('signupPassword').value, m = document.getElementById('signupMobile').value;
        auth.createUserWithEmailAndPassword(e, p).then(u => { saveUser(u.user, m); window.location.href='dashboard.html'; }).catch(e => alert(e.message));
    };

    document.getElementById('btnGoogle').onclick = () => {
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(u => { saveUser(u.user); window.location.href='dashboard.html'; }).catch(e => alert(e.message));
    };
    
    document.getElementById('btnForgotPassword').onclick = () => {
        const e = document.getElementById('forgotEmail').value;
        auth.sendPasswordResetEmail(e).then(() => alert("Reset link sent!")).catch(e => alert(e.message));
    };

    function saveUser(user, mobile='') {
        db.collection('user_profiles').doc(user.uid).set({ email: user.email, uid: user.uid, lastLogin: firebase.firestore.FieldValue.serverTimestamp(), ...(mobile && { mobile: mobile }) }, { merge: true });
    }
});