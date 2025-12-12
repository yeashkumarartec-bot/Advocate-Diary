document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); const db = firebase.firestore();
    const ADMIN_UID = "hMGcI2FMfCTmgs4rglCgihZsU8m1"; 
    const els = { userBody: document.getElementById('usersTableBody'), diarySec: document.getElementById('userDiarySection'), caseTable: document.getElementById('adminCaseTable'), title: document.getElementById('diaryTitle'), main: document.getElementById('adminMain'), denied: document.getElementById('accessDenied') };

    auth.onAuthStateChanged(user => {
        if (user) {
            if(user.uid !== ADMIN_UID) { els.denied.style.display = 'block'; setTimeout(() => window.location.href = 'dashboard.html', 2000); }
            else { document.getElementById('adminEmail').textContent = "Admin Mode"; els.main.style.display = 'block'; loadUsers(); }
        } else { window.location.href = 'login.html'; }
    });

    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut().then(() => window.location.href='login.html'));

    async function loadUsers() {
        els.userBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
        try {
            const snap = await db.collection('user_profiles').orderBy('lastLogin', 'desc').get();
            let html = '';
            snap.forEach(doc => { const u = doc.data(); html += `<tr><td>${u.email}</td><td>${u.mobile||'-'}</td><td><button class="action-btn edit-btn" onclick="view('${u.uid}','${u.email}')">👁️</button></td></tr>`; });
            els.userBody.innerHTML = html;
        } catch (e) { els.userBody.innerHTML = '<tr><td colspan="3">Error</td></tr>'; }
    }

    window.view = async (uid, email) => {
        els.diarySec.style.display = 'block'; els.title.textContent = `User: ${email}`; els.caseTable.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
        els.diarySec.scrollIntoView({ behavior: 'smooth' });
        try {
            const snap = await db.collection('users').doc(uid).collection('cases').orderBy('current_date', 'desc').limit(50).get();
            if(snap.empty) { els.caseTable.innerHTML = '<tr><td colspan="4">No cases.</td></tr>'; return; }
            let html = '';
            snap.forEach(doc => { const c = doc.data(); html += `<tr><td>${c.caseNo}</td><td>${c.partyName}</td><td>${c.nextDate||c.current_date}</td><td>${c.isDeleted?'Deleted':(c.isClosed?'Closed':'Active')}</td></tr>`; });
            els.caseTable.innerHTML = html;
        } catch (e) { alert("Error"); }
    };

    document.getElementById('closeDiaryBtn').onclick = () => els.diarySec.style.display = 'none';
});