document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); 
    const db = firebase.firestore(); 
    let userCasesCollection = null;

    const els = { 
        name: document.getElementById('userEmail'), 
        welcome: document.getElementById('welcomeMessage'), 
        today: document.getElementById('todayCount'), 
        week: document.getElementById('weekCount'), 
        active: document.getElementById('activeCount'),
        adminName: document.getElementById('adminName')
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            let name = user.displayName || user.email.split('@')[0]; 
            name = name.charAt(0).toUpperCase() + name.slice(1);
            
            if (els.name) els.name.innerHTML = `👋 ${name}`;
            if (els.welcome) els.welcome.textContent = `Welcome, ${name}!`;
            if (els.adminName) els.adminName.textContent = name;
            
            userCasesCollection = db.collection("users").doc(user.uid).collection("cases");
            
            // Modern Liquid Glass Admin Button
            const adminUid = "hMGcI2FMfCTmgs4rglCgihZsU8m1";
            if (user.uid === adminUid && !document.getElementById('adminBtn')) {
                const headerControls = document.querySelector('.header-controls');
                const logoutBtn = document.getElementById('btnLogout');
                
                if (headerControls) {
                    const btn = document.createElement('a'); 
                    btn.id = 'adminBtn'; 
                    btn.href = 'admin.html'; 
                    btn.textContent = '👑 Admin Panel'; 
                    btn.className = 'header-link'; 
                    btn.style.cssText = `
                        background: rgba(245, 158, 11, 0.15) !important;
                        border: 1px solid rgba(245, 158, 11, 0.35) !important;
                        color: #fbbf24 !important;
                        padding: 9px 16px !important;
                        border-radius: 10px !important;
                        font-weight: 600 !important;
                        font-size: 0.88rem !important;
                        margin-right: 8px !important;
                        text-decoration: none !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    `;
                    
                    btn.onmouseenter = () => {
                        btn.style.background = 'rgba(245, 158, 11, 0.25)';
                        btn.style.transform = 'translateY(-2px)';
                    };
                    btn.onmouseleave = () => {
                        btn.style.background = 'rgba(245, 158, 11, 0.15)';
                        btn.style.transform = 'translateY(0)';
                    };

                    if (logoutBtn) {
                        headerControls.insertBefore(btn, logoutBtn);
                    } else {
                        headerControls.appendChild(btn);
                    }
                }
            }
            loadData();
        } else { 
            window.location.href = 'login.html'; 
        }
    });

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    // Number Counting Micro-Animation
    function animateValue(element, target) {
        if (!element) return;
        let start = 0;
        const duration = 600;
        const stepTime = 20;
        const steps = Math.max(Math.floor(duration / stepTime), 1);
        const increment = target / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.ceil(start);
            }
        }, stepTime);
    }

    async function loadData() {
        if (!userCasesCollection) return;
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(); 
        nextWeek.setDate(new Date().getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        try {
            const [t, w, a] = await Promise.all([
                userCasesCollection.where("current_date", "==", today).where("isClosed", "==", false).where("isDeleted", "==", false).get(),
                userCasesCollection.where("current_date", ">=", today).where("current_date", "<=", nextWeekStr).where("isClosed", "==", false).where("isDeleted", "==", false).get(),
                userCasesCollection.where("isClosed", "==", false).where("isDeleted", "==", false).get()
            ]);

            animateValue(els.today, t.size);
            animateValue(els.week, w.size);
            animateValue(els.active, a.size);
        } catch (e) { 
            console.error("Dashboard Load Error:", e); 
        }
    }
});