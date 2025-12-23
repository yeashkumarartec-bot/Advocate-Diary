document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INSTANT THEME CHECK ---
    (function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    })();

    // --- 2. TOGGLE BUTTON LOGIC ---
    const headerControls = document.querySelector('.header-controls');
    if (headerControls && !document.getElementById('themeToggle')) {
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'header-link';
        const isDark = localStorage.getItem('theme') === 'dark';
        btn.innerHTML = isDark ? '☀️' : '🌙'; 
        btn.title = "Toggle Dark Mode";
        btn.style.fontSize = "1.2em";
        btn.style.padding = "8px 12px";
        btn.style.marginRight = "5px";
        
        btn.onclick = (e) => {
            e.preventDefault();
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                btn.innerHTML = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                btn.innerHTML = '☀️';
            }
        };
        headerControls.insertBefore(btn, headerControls.firstChild);
    }

    // --- 3. FIREBASE & APP LOGIC ---
    const auth = firebase.auth(); 
    const db = firebase.firestore();
    
    // ⚡ OFFLINE MODE
    db.enablePersistence({ synchronizeTabs: true }).catch(err => console.log(err));

    let userCasesCollection = null; 
    let userClientsCollection = null; 
    let currentUserId = null;
    let allCasesCache = []; 

    const elements = { 
        currentDate: document.getElementById('currentDate'), 
        displayDate: document.getElementById('displayDate'), 
        tableBody: document.getElementById('caseTableBody'), 
        form: document.getElementById('addCaseForm'), 
        search: document.getElementById('searchInput'), 
        userEmail: document.getElementById('userEmail'), 
        logoutBtn: document.getElementById('btnLogout'), 
        clientList: document.getElementById('clientList') 
    };

    // --- 🔐 APP LOCK VARIABLES ---
    const overlay = document.getElementById('securityOverlay');
    const pinInput = document.getElementById('pinInput');
    const btnUnlock = document.getElementById('btnUnlock');
    const title = document.getElementById('securityTitle');
    const msg = document.getElementById('securityMsg');
    const forgotBtn = document.getElementById('forgotPin');

    // --- AUTHENTICATION ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if(elements.userEmail) elements.userEmail.innerHTML = `👋 ${name}`;

            db.collection('users').doc(user.uid).set({
                email: user.email,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                isVerified: user.emailVerified 
            }, { merge: true });

            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients");
            
            checkAppLock();
            if(elements.tableBody) initializePage();
        } else { 
            if(overlay) overlay.style.display = 'none';
            if(!document.title.includes("Login") && !document.title.includes("Updates") && !document.title.includes("Policy")) {
                 window.location.href = 'login.html'; 
            }
        }
    });

    // --- 🔐 APP LOCK FUNCTION ---
    function checkAppLock() {
        if (!overlay) return;
        if (sessionStorage.getItem('is_unlocked_now') === 'true') {
            overlay.style.display = 'none';
            return; 
        }
        const savedPin = localStorage.getItem('advocateAppPin');
        overlay.style.display = 'flex'; 
        if(pinInput) { pinInput.value = ''; pinInput.focus(); }

        if (!savedPin) {
            if(title) title.textContent = "Set New Security PIN";
            if(msg) msg.textContent = "Create a 4-digit PIN to secure your diary.";
            if(btnUnlock) {
                btnUnlock.textContent = "Set PIN";
                btnUnlock.onclick = () => {
                    const val = pinInput.value;
                    if (val.length === 4 && !isNaN(val)) {
                        localStorage.setItem('advocateAppPin', val);
                        sessionStorage.setItem('is_unlocked_now', 'true');
                        alert("✅ Security PIN Set Successfully!");
                        overlay.style.display = 'none';
                    } else { alert("Please enter a 4-digit number."); }
                };
            }
        } else {
            if(title) title.textContent = "Advocate Diary Locked";
            if(msg) msg.textContent = "Enter your PIN to access data.";
            if(btnUnlock) {
                btnUnlock.textContent = "Unlock";
                btnUnlock.onclick = () => {
                    if (pinInput.value === savedPin) {
                        sessionStorage.setItem('is_unlocked_now', 'true');
                        overlay.style.display = 'none'; 
                    } else {
                        pinInput.style.borderColor = 'red';
                        alert("❌ Incorrect PIN");
                        pinInput.value = '';
                    }
                };
            }
        }
        if(forgotBtn) {
            forgotBtn.onclick = () => {
                if(confirm("Forgot PIN? You need to Login again to reset it.")) {
                    localStorage.removeItem('advocateAppPin');
                    sessionStorage.removeItem('is_unlocked_now');
                    auth.signOut().then(() => window.location.href = 'login.html');
                }
            };
        }
    }

    if(elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('is_unlocked_now');
            auth.signOut().then(() => window.location.href = 'login.html');
        });
    }

    // --- PAGE INITIALIZATION ---
    function initializePage() {
        const today = new Date().toISOString().split('T')[0];
        elements.currentDate.value = today;
        displayCases(today); 
        loadClients(); 

        elements.currentDate.addEventListener('change', () => { 
            elements.search.value = ''; 
            displayCases(elements.currentDate.value); 
        });

        elements.form.addEventListener('submit', addCase);
        const colorInput = document.getElementById('caseColor');
        if(colorInput) colorInput.addEventListener('input', (e) => elements.form.querySelectorAll('input:not([type="color"]), select').forEach(i => { i.style.color = e.target.value; i.style.fontWeight='600'; }));

        let debounce;
        elements.search.addEventListener('input', (e) => { 
            clearTimeout(debounce); 
            debounce = setTimeout(() => smartSearch(e.target.value), 300); 
        });
        
        const printBtn = document.getElementById('btnPrint');
        if(printBtn) printBtn.addEventListener('click', () => window.print());
        
        elements.tableBody.addEventListener('click', handleActions);
        
        const modal = document.getElementById('editModal');
        if(modal) {
            document.getElementById('closeEditModal').onclick = () => modal.style.display = 'none';
            window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };
            document.getElementById('editCaseForm').onsubmit = updateCase;
            const editColor = document.getElementById('editCaseColor');
            if(editColor) editColor.oninput = (e) => document.getElementById('editCaseForm').querySelectorAll('input:not([type="color"])').forEach(i => i.style.color = e.target.value);
        }
    }

    async function loadClients() {
        if(!userClientsCollection) return;
        const snap = await userClientsCollection.where("isDeleted", "==", false).orderBy("name").get();
        if(elements.clientList) { 
            elements.clientList.innerHTML = ''; 
            snap.forEach(doc => { 
                const opt = document.createElement('option'); 
                opt.value = doc.data().name; 
                elements.clientList.appendChild(opt); 
            }); 
        }
    }

    // --- DATA FUNCTIONS ---
    async function addCase(e) {
        e.preventDefault();
        const data = {
            previousDate: null, caseNo: document.getElementById('caseNo').value, year: document.getElementById('year').value, courtName: document.getElementById('courtName').value, nature: document.getElementById('nature').value, partyName: document.getElementById('partyName').value, dateFixedFor: document.getElementById('addDateFixedFor').value, current_date: document.getElementById('firstDate').value, fontColor: document.getElementById('caseColor').value, nextDate: null, isClosed: false, isDeleted: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try { 
            await userCasesCollection.add(data); 
            allCasesCache = []; 
            elements.currentDate.value = data.current_date; 
            displayCases(data.current_date); 
            elements.form.reset(); 
            document.getElementById('caseColor').value='#000000'; 
            elements.form.querySelectorAll('input').forEach(i=>i.style.color='var(--text-main)'); 
        } catch(e){ alert("Error"); }
    }

    async function displayCases(date) {
        elements.displayDate.textContent = `Cases for ${date.split('-').reverse().join('-')}`;
        elements.tableBody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
        
        const snap = await userCasesCollection.where("current_date", "==", date).where("isDeleted", "==", false).get();
        const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(cases);
    }

    async function smartSearch(term) {
        term = term.trim().toLowerCase(); 
        if(!term) { displayCases(elements.currentDate.value); return; }
        
        elements.displayDate.textContent = `Results: "${term}"`; 
        elements.tableBody.innerHTML = '<tr><td colspan="9">Searching...</td></tr>';
        
        if (allCasesCache.length === 0) {
            try { 
                const snap = await userCasesCollection.where('isDeleted', '==', false).orderBy('current_date', 'desc').get(); 
                allCasesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            } catch (e) { console.error(e); }
        }
        
        const results = allCasesCache.filter(c => (c.caseNo||'').toLowerCase().includes(term) || (c.partyName||'').toLowerCase().includes(term));
        renderTable(results);
    }

    // ✅ RENDER TABLE WITH ANIMATION (UPDATED)
    function renderTable(dataArray) {
        if(!dataArray.length) { elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No cases found.</td></tr>'; return; }
        let html = '';
        
        // 👇 ANIMATION LOGIC ADDED HERE 👇
        dataArray.forEach((c, index) => {
            const id = c.id; 
            const safe = encodeURIComponent(JSON.stringify(c));
            
            // Stagger Delay (0.05s per row)
            const delay = index * 0.05;

            let btns = `<div class="action-cell">
                <button type="button" class="action-btn edit-btn" data-id="${id}" title="Edit">✏️</button>
                <button type="button" class="action-btn calendar-btn" data-id="${id}" data-case="${safe}" title="Calendar">📅</button>
                <button type="button" class="action-btn email-btn" data-id="${id}" data-case="${safe}" title="Email">📧</button>`;
            
            if(!c.isClosed && !c.nextDate) btns += `<button type="button" class="action-btn close-btn" data-id="${id}" title="Close">✅</button>`;
            btns += `<button type="button" class="action-btn delete-btn" data-id="${id}" title="Delete">🗑️</button></div>`;
            
            if(c.nextDate) btns += `<span style="color:var(--success);font-weight:bold;margin-left:5px;">Done</span>`;
            
            // 👇 Added class="animate-row" and animation-delay style
            html += `<tr class="animate-row ${c.isClosed?'case-closed':''}" style="color:${c.fontColor||'inherit'}; animation-delay: ${delay}s">
                <td>${formatDate(c.previousDate)}</td><td>${c.caseNo}</td><td>${c.year}</td><td>${c.courtName}</td><td>${c.nature}</td><td>${c.partyName}</td><td>${c.dateFixedFor}</td><td>${formatDate(c.nextDate)}</td><td>${btns}</td></tr>`;
        });
        elements.tableBody.innerHTML = html;
    }

    function handleActions(e) {
        const btn = e.target.closest('button'); if(!btn) return;
        e.stopPropagation();
        const id = btn.dataset.id;
        
        if(btn.classList.contains('delete-btn')) { 
            if(confirm('Recycle Bin?')) { userCasesCollection.doc(id).update({isDeleted:true}).then(() => { allCasesCache = []; displayCases(elements.currentDate.value); }); } 
        }
        else if(btn.classList.contains('close-btn')) { 
            userCasesCollection.doc(id).update({isClosed:true}).then(() => displayCases(elements.currentDate.value)); 
        }
        else if(btn.classList.contains('edit-btn')) { openEdit(id); }
        
        else if(btn.classList.contains('calendar-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case)); 
                const title = `Court: ${c.partyName} (Case: ${c.caseNo})`;
                const details = `Case: ${c.caseNo} | Court: ${c.courtName} | Purpose: ${c.dateFixedFor}`;
                const dates = `${c.current_date.replace(/-/g,'')}/${c.current_date.replace(/-/g,'')}`;
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dates}`, '_blank'); 
            } catch(err) { alert("Error"); }
        }
        else if(btn.classList.contains('email-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case));
                const subject = `Case Update: ${c.partyName} (Case No: ${c.caseNo})`;
                let body = `Dear Client,\n\nUpdate regarding your case.\n\nCase No: ${c.caseNo}\nCourt: ${c.courtName}\nNext Hearing: ${formatDate(c.nextDate || c.current_date)}\nPurpose: ${c.dateFixedFor}\n\nRegards,\nAdvocate`;
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; 
            } catch(err) { alert("Error"); }
        }
    }

    async function openEdit(id) {
        const d = (await userCasesCollection.doc(id).get()).data();
        document.getElementById('editCaseId').value = id; document.getElementById('editCaseNo').value = d.caseNo; document.getElementById('editYear').value = d.year; document.getElementById('editCourtName').value = d.courtName; document.getElementById('editNature').value = d.nature; document.getElementById('editPartyName').value = d.partyName; document.getElementById('editPreviousDate').value = d.previousDate; document.getElementById('editDateFixedFor').value = d.dateFixedFor; document.getElementById('editNextDate').value = d.nextDate; document.getElementById('editCaseColor').value = d.fontColor || '#000000'; document.getElementById('editModal').style.display = 'block';
    }

    async function updateCase(e) {
        e.preventDefault(); const id = document.getElementById('editCaseId').value;
        const u = { caseNo: document.getElementById('editCaseNo').value, year: document.getElementById('editYear').value, courtName: document.getElementById('editCourtName').value, nature: document.getElementById('editNature').value, partyName: document.getElementById('editPartyName').value, dateFixedFor: document.getElementById('editDateFixedFor').value, fontColor: document.getElementById('editCaseColor').value, nextDate: document.getElementById('editNextDate').value };
        await userCasesCollection.doc(id).update(u); allCasesCache = []; 
        if(u.nextDate) { const old = (await userCasesCollection.doc(id).get()).data(); await userCasesCollection.add({...u, previousDate:old.current_date, current_date:u.nextDate, nextDate:'', isClosed:false, isDeleted:false, createdAt: firebase.firestore.FieldValue.serverTimestamp()}); }
        document.getElementById('editModal').style.display = 'none'; displayCases(elements.currentDate.value);
    }
    function formatDate(d) { return d ? d.split('-').reverse().join('-') : '—'; }
});

// ==========================================
// 🔔 PROFESSIONAL NOTIFICATION SYSTEM
// ==========================================
const notifBtn = document.getElementById('btnInitNotifs');
const notifBadge = document.getElementById('notifBadge');

if(notifBtn) {
    notifBtn.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showSystemNotification("Notifications Active", "You will now receive updates about your cases and app policies.", "🔔");
                checkTodaysCases();
            } else { alert("Please allow notifications to get daily case reminders."); }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== 'granted') {
        if(notifBadge) notifBadge.style.display = 'flex';
    } else {
        if(notifBadge) notifBadge.style.display = 'none';
        setTimeout(checkTodaysCases, 3000); 
        setTimeout(checkSystemUpdates, 6000);
    }
});

async function checkTodaysCases() {
    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const todayStr = today.split('-').reverse().join('-');
    const lastNotified = localStorage.getItem('lastCaseNotification');
    if (lastNotified === today) return; 

    try {
        const snapshot = await db.collection("users").doc(user.uid).collection("cases")
            .where("current_date", "==", today)
            .where("isDeleted", "==", false).get();
        if (!snapshot.empty) {
            const count = snapshot.size;
            showSystemNotification(`📅 Morning Briefing: ${todayStr}`, `You have ${count} cases listed for hearing today. Click to view.`, "⚖️");
            localStorage.setItem('lastCaseNotification', today);
        }
    } catch (error) { console.error("Notif Error:", error); }
}

function checkSystemUpdates() {
    const policyVersion = "2.0"; 
    const userSeenVersion = localStorage.getItem('policySeenVersion');
    if (userSeenVersion !== policyVersion) {
        showSystemNotification("🔒 Policy Update", "We have updated our Privacy Policy to ensure better security. Please review.", "🛡️");
        localStorage.setItem('policySeenVersion', policyVersion);
    }
}

function showSystemNotification(title, body, iconChar) {
    if (Notification.permission === "granted") {
        const options = { body: body, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200] };
        const notif = new Notification(title, options);
        notif.onclick = function(event) {
            event.preventDefault(); window.focus();
            if(title.includes("Policy")) { window.location.href = 'policy.html'; } else { window.location.href = 'index.html'; }
            notif.close();
        };
    }
}