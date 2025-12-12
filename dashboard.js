document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); const db = firebase.firestore(); let userCasesCollection = null;
    const els = { name: document.getElementById('userEmail'), welcome: document.getElementById('welcomeMessage'), today: document.getElementById('todayCount'), week: document.getElementById('weekCount'), active: document.getElementById('activeCount') };

    auth.onAuthStateChanged(user => {
        if (user) {
            let name = user.displayName || user.email.split('@')[0]; name = name.charAt(0).toUpperCase() + name.slice(1);
            if(els.name) els.name.innerHTML = `👋 ${name}`;
            if(els.welcome) els.welcome.textContent = `Welcome, ${name}!`;
            
            userCasesCollection = db.collection("users").doc(user.uid).collection("cases");
            
            // Admin Button
            if (user.uid === "hMGcI2FMfCTmgs4rglCgihZsU8m1" && !document.getElementById('adminBtn')) {
                const btn = document.createElement('a'); btn.id='adminBtn'; btn.href='admin.html'; btn.textContent='👮‍♂️ Admin'; btn.className='header-link'; btn.style.background='#d32f2f'; btn.style.color='white'; btn.style.marginRight='10px';
                document.querySelector('.header-controls').insertBefore(btn, document.getElementById('btnLogout'));
            }
            loadData();
        } else { window.location.href = 'login.html'; }
    });

    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut().then(() => window.location.href = 'login.html'));

    async function loadData() {
        if (!userCasesCollection) return;
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(); nextWeek.setDate(new Date().getDate() + 7);
        try {
            const [t, w, a] = await Promise.all([
                userCasesCollection.where("current_date", "==", today).where("isClosed", "==", false).where("isDeleted", "==", false).get(),
                userCasesCollection.where("current_date", ">=", today).where("current_date", "<=", nextWeek.toISOString().split('T')[0]).where("isClosed", "==", false).where("isDeleted", "==", false).get(),
                userCasesCollection.where("isClosed", "==", false).where("isDeleted", "==", false).get()
            ]);
            els.today.textContent = t.size; els.week.textContent = w.size; els.active.textContent = a.size;
        } catch (e) { console.error(e); }
    }
});