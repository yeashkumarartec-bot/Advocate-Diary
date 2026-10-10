document.addEventListener('DOMContentLoaded', () => {

    // 1. FIREBASE SETUP & PERSISTENCE
    const auth = firebase.auth(); 
    const db = firebase.firestore();
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

    // 2. AUTH & USER INITIALIZATION
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // SUPERUSER / ADMIN CHECK
            const urlParams = new URLSearchParams(window.location.search);
            const targetUser = urlParams.get('superuser');
            const isAdmin = (user.email === "contact.advocatediary@gmail.com");

            if (isAdmin && targetUser) {
                currentUserId = targetUser; 
                allCasesCache = []; // Purana cache clear karein
            }

            // USER GREETING DISPLAY
            let name = user.displayName || user.email.split('@')[0];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if (elements.userEmail) {
                elements.userEmail.innerHTML = `👋 ${name}`;
            }

            // DYNAMIC ADMIN PANEL BUTTON INJECTION
            let adminBtn = document.getElementById('adminPanelLink');
            if (isAdmin) {
                const headerCtrl = document.querySelector('.header-controls');
                if (!adminBtn && headerCtrl) {
                    adminBtn = document.createElement('a');
                    adminBtn.id = 'adminPanelLink';
                    adminBtn.className = 'header-link';
                    adminBtn.href = 'admin.html';
                    adminBtn.innerHTML = '👑 Admin Panel';
                    adminBtn.style.fontSize = "0.88rem";
                    adminBtn.style.padding = "9px 16px";
                    adminBtn.style.marginRight = "4px";
                    adminBtn.style.background = "rgba(245, 158, 11, 0.12)";
                    adminBtn.style.borderColor = "rgba(245, 158, 11, 0.3)";
                    adminBtn.style.color = "#fbbf24";
                    headerCtrl.insertBefore(adminBtn, headerCtrl.firstChild);
                }
                if (adminBtn) adminBtn.style.setProperty('display', 'inline-flex', 'important');
            } else if (adminBtn) {
                adminBtn.remove(); 
            }

            // SYNC LAST SEEN & STATS (Only for regular login)
            if (!targetUser) {
                const userRef = db.collection('users').doc(user.uid);
                try {
                    const doc = await userRef.get();
                    if (!doc.exists) {
                        await userRef.set({
                            email: user.email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                            isVerified: user.emailVerified 
                        });
                    } else {
                        const data = doc.data();
                        const updateData = { lastSeen: firebase.firestore.FieldValue.serverTimestamp() };
                        if (!data.createdAt) updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                        await userRef.update(updateData);
                    }
                } catch(e) { console.log("Sync Error", e); }
            }

            // SETUP USER FIRESTORE REFS WITH TARGET UID
            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients");
            
            if (elements.tableBody) initializePage();

        } else {
            if (!document.title.includes("Login") && !document.title.includes("Updates") && !document.title.includes("Policy")) {
                 window.location.href = 'login.html'; 
            }
        }
    });

    // 3. LOGOUT HANDLER
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            const confirmed = window.glassConfirm 
                ? await window.glassConfirm("Sign Out", "Are you sure you want to log out of Advocate Diary?", "Logout", true)
                : confirm("Are you sure you want to logout?");

            if (confirmed) {
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                }).catch(err => {
                    if (window.showGlassToast) window.showGlassToast("Logout Error: " + err.message, "error");
                    else alert("Logout Error: " + err.message);
                });
            }
        });
    }

    // 4. MAIN CONTROLLER & PAGE INITIALIZATION
    function initializePage() {
        const today = new Date().toISOString().split('T')[0];
        const urlParams = new URLSearchParams(window.location.search);
        const targetUser = urlParams.get('superuser');
        const filterType = urlParams.get('filter');
        const searchTerm = urlParams.get('search');

        // SUPERUSER VIEW: Saare target user cases load karein
        if (targetUser) {
            elements.currentDate.value = today;
            loadSuperuserData(targetUser);
        } else if (filterType) {
            elements.currentDate.value = today;
            applyStatusFilter(filterType);
        } else if (searchTerm) {
            elements.currentDate.value = today; 
            elements.search.value = searchTerm; 
            smartSearch(searchTerm); 
        } else {
            elements.currentDate.value = today;
            displayCases(today); 
        }

        loadClients(); 

        elements.currentDate.addEventListener('change', () => { 
            elements.search.value = ''; 
            displayCases(elements.currentDate.value); 
        });

        elements.form.addEventListener('submit', addCase);
        
        const colorInput = document.getElementById('caseColor');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                elements.form.querySelectorAll('input:not([type="color"]), select').forEach(i => { 
                    i.style.color = e.target.value; 
                    i.style.fontWeight = '600'; 
                });
            });
        }

        let debounceTimer;
        elements.search.addEventListener('input', (e) => { 
            clearTimeout(debounceTimer); 
            debounceTimer = setTimeout(() => smartSearch(e.target.value), 250); 
        });
        
        const printBtn = document.getElementById('btnPrint');
        if (printBtn) printBtn.addEventListener('click', () => window.print());
        
        elements.tableBody.addEventListener('click', handleActions);
        
        // EDIT MODAL CONTROLS & QUICK RESCHEDULE DATE SHORTCUTS
        const modal = document.getElementById('editModal');
        if (modal) {
            document.getElementById('closeEditModal').onclick = () => modal.style.display = 'none';
            window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
            document.getElementById('editCaseForm').onsubmit = updateCase;
            
            const editColor = document.getElementById('editCaseColor');
            if (editColor) {
                editColor.oninput = (e) => {
                    document.getElementById('editCaseForm').querySelectorAll('input:not([type="color"])').forEach(i => i.style.color = e.target.value);
                };
            }

            const nextDateInput = document.getElementById('editNextDate');
            if (nextDateInput && !document.getElementById('quickDateBar')) {
                const bar = document.createElement('div');
                bar.id = 'quickDateBar';
                bar.style.cssText = 'display: flex; gap: 8px; margin: 8px 0 14px 0; flex-wrap: wrap;';
                
                const pills = [
                    { label: '+7 Days', days: 7 },
                    { label: '+15 Days', days: 15 },
                    { label: '+1 Month', days: 30 }
                ];

                pills.forEach(p => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = p.label;
                    btn.style.cssText = 'padding: 5px 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; border: 1px solid rgba(99,102,241,0.35); background: rgba(99,102,241,0.18); color: #818cf8; cursor: pointer; transition: all 0.2s;';
                    btn.onmouseenter = () => btn.style.background = 'rgba(99,102,241,0.35)';
                    btn.onmouseleave = () => btn.style.background = 'rgba(99,102,241,0.18)';
                    btn.onclick = () => {
                        const target = new Date();
                        target.setDate(target.getDate() + p.days);
                        nextDateInput.value = target.toISOString().split('T')[0];
                        if (window.showGlassToast) {
                            window.showGlassToast(`Auto-set Next Date: ${p.label}`, 'success', null, null, 2000);
                        }
                    };
                    bar.appendChild(btn);
                });

                nextDateInput.parentNode.insertBefore(bar, nextDateInput.nextSibling);
            }
        }
    }

    // SUPERUSER INSPECTOR DATA LOADER
    async function loadSuperuserData(targetUid) {
        elements.displayDate.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center;">
                <span style="background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding:4px 14px; border-radius:50px; font-size:0.84rem; font-weight:700;">INSPECTING USER DATA</span>
                <a href="admin.html" style="color:#fbbf24; font-size:0.84rem; font-weight:600; text-decoration:none; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); padding:4px 12px; border-radius:50px;">Exit to Admin ✕</a>
            </div>
        `;
        elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Loading user records from database...</td></tr>';

        try {
            const snap = await userCasesCollection.where("isDeleted", "==", false).get();
            const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            cases.sort((a, b) => (b.current_date || '').localeCompare(a.current_date || ''));
            renderTable(cases);
        } catch (err) {
            elements.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#ef4444;">Error fetching user cases: ${err.message}</td></tr>`;
        }
    }

    // CLIENT LIST AUTO-FILL
    async function loadClients() {
        if (!userClientsCollection) return;
        const snap = await userClientsCollection.where("isDeleted", "==", false).orderBy("name").get();
        if (elements.clientList) { 
            elements.clientList.innerHTML = ''; 
            snap.forEach(doc => { 
                const opt = document.createElement('option'); 
                opt.value = doc.data().name; 
                elements.clientList.appendChild(opt); 
            }); 
        }
    }

    // 5. DATA CRUD
    async function addCase(e) {
        e.preventDefault();
        const data = {
            previousDate: null, 
            caseNo: document.getElementById('caseNo').value.trim(), 
            year: document.getElementById('year').value.trim(), 
            courtName: document.getElementById('courtName').value.trim(), 
            nature: document.getElementById('nature').value.trim(), 
            partyName: document.getElementById('partyName').value.trim(), 
            dateFixedFor: document.getElementById('addDateFixedFor').value.trim(), 
            current_date: document.getElementById('firstDate').value, 
            fontColor: document.getElementById('caseColor').value, 
            nextDate: null, 
            isClosed: false, 
            isDeleted: false, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try { 
            await userCasesCollection.add(data); 
            allCasesCache = []; 
            elements.currentDate.value = data.current_date; 
            displayCases(data.current_date); 
            elements.form.reset(); 
            document.getElementById('caseColor').value = '#000000'; 
            elements.form.querySelectorAll('input').forEach(i => i.style.color = 'var(--text-main)'); 
            if (window.showGlassToast) window.showGlassToast("Case scheduled successfully!", "success");
        } catch(err) { 
            if (window.showGlassToast) window.showGlassToast("Error: " + err.message, "error");
            else alert("Error adding case: " + err.message); 
        }
    }

    async function displayCases(date) {
        elements.displayDate.innerHTML = `Cases for ${date.split('-').reverse().join('-')}`;
        elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Loading cases...</td></tr>';
        
        try {
            const snap = await userCasesCollection.where("current_date", "==", date).where("isDeleted", "==", false).get();
            const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable(cases);
        } catch(err) {
            elements.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#ef4444;">Error: ${err.message}</td></tr>`;
        }
    }

    // 5.1 DASHBOARD STATUS FILTER
    async function applyStatusFilter(filterType) {
        const type = filterType.toLowerCase();
        let label = "All Records";
        if (type === 'active') label = "Active Cases";
        else if (type === 'decided' || type === 'closed') label = "Decided Cases";

        elements.displayDate.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center;">
                <span style="background:rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.4); color:#c7d2fe; padding:4px 14px; border-radius:50px; font-size:0.84rem; font-weight:700;">VIEWING: ${label.toUpperCase()}</span>
                <a href="index.html" style="color:#f43f5e; font-size:0.84rem; font-weight:600; text-decoration:none; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); padding:4px 12px; border-radius:50px;">Clear Filter ✕</a>
            </div>
        `;
        elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Loading filtered case list...</td></tr>';

        try {
            let query = userCasesCollection.where("isDeleted", "==", false);
            if (type === 'active') {
                query = query.where("isClosed", "==", false);
            } else if (type === 'decided' || type === 'closed') {
                query = query.where("isClosed", "==", true);
            }

            const snap = await query.get();
            const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            cases.sort((a, b) => (b.current_date || '').localeCompare(a.current_date || ''));
            renderTable(cases);
        } catch (err) {
            elements.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#ef4444;">Error loading filtered records: ${err.message}</td></tr>`;
        }
    }

    // 6. HIGH-PERFORMANCE SMART SEARCH
    async function smartSearch(term) {
        term = term.trim().toLowerCase(); 
        if (!term) { 
            displayCases(elements.currentDate.value); 
            return; 
        }
        
        elements.displayDate.textContent = `Results: "${term}"`; 
        elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Searching case database...</td></tr>';
        
        if (allCasesCache.length === 0) {
            try { 
                const snap = await userCasesCollection.where('isDeleted', '==', false).orderBy('current_date', 'desc').get(); 
                allCasesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            } catch (e) { 
                console.error(e); 
            }
        }
        
        const results = allCasesCache.filter(c => {
            return (c.caseNo || '').toLowerCase().includes(term) || 
                   (c.partyName || '').toLowerCase().includes(term) ||
                   (c.courtName || '').toLowerCase().includes(term) ||
                   (c.nature || '').toLowerCase().includes(term) ||
                   (c.year || '').toLowerCase().includes(term) ||
                   (c.dateFixedFor || '').toLowerCase().includes(term) ||
                   (c.current_date || '').includes(term);
        });
        renderTable(results);
    }

    // 7. LIQUID GLASS TABLE RENDERING
    function renderTable(dataArray) {
        if (!dataArray.length) { 
            elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:#94a3b8; font-weight:500;">No cases scheduled for this view.</td></tr>'; 
            return; 
        }

        let html = '';
        dataArray.forEach((c, index) => {
            const id = c.id; 
            const safe = encodeURIComponent(JSON.stringify(c));
            const delay = (index * 0.04).toFixed(2);
            
            const waSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/></svg>`;

            let btns = `<div class="action-cell" style="display:flex; align-items:center; gap:6px;">
                <button type="button" class="action-btn edit-btn" data-id="${id}" title="Edit Case" style="width:34px; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); cursor:pointer;">✏️</button>
                <button type="button" class="action-btn whatsapp-btn" data-id="${id}" data-case="${safe}" title="Send WhatsApp Hearing Reminder" style="width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%) !important; border:none; color:white; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(37,211,102,0.3);">${waSvg}</button> 
                <button type="button" class="action-btn pdf-btn" data-id="${id}" data-case="${safe}" title="Generate PDF Case Sheet" style="width:34px; height:34px; border-radius:8px; border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.15); cursor:pointer;">📄</button>
                <button type="button" class="action-btn calendar-btn" data-id="${id}" data-case="${safe}" title="Add to Google Calendar" style="width:34px; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); cursor:pointer;">📅</button>`;
            
            if (!c.isClosed && !c.nextDate) {
                btns += `<button type="button" class="action-btn close-btn" data-id="${id}" title="Mark Case Closed" style="width:34px; height:34px; border-radius:8px; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.15); cursor:pointer;">✅</button>`;
            }
            btns += `<button type="button" class="action-btn delete-btn" data-id="${id}" title="Move to Recycle Bin" style="width:34px; height:34px; border-radius:8px; border:1px solid rgba(239,68,68,0.25); background:rgba(239,68,68,0.12); cursor:pointer;">🗑</button></div>`;
            
            let statusPill = '';
            if (c.isClosed) {
                statusPill = `<span style="display:inline-block; margin-top:4px; padding:2px 8px; border-radius:50px; font-size:0.72rem; font-weight:700; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#34d399;">Decided ✅</span>`;
            } else if (c.nextDate) {
                statusPill = `<span style="display:inline-block; margin-top:4px; padding:2px 8px; border-radius:50px; font-size:0.72rem; font-weight:700; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa;">Forwarded ➡️</span>`;
            }

            const customColor = c.fontColor && c.fontColor !== '#000000' ? `color:${c.fontColor} !important; font-weight:600;` : '';

            html += `
                <tr class="animate-row ${c.isClosed ? 'case-closed' : ''}" style="animation: fadeInUp 0.35s ease-out forwards; animation-delay: ${delay}s;">
                    <td style="color:#94a3b8; font-size:0.88rem;">${formatDate(c.previousDate)}</td>
                    <td><strong style="font-size:0.95rem; ${customColor}">${c.caseNo}</strong></td>
                    <td style="color:#cbd5e1;">${c.year}</td>
                    <td style="color:#e2e8f0; font-weight:500;">${c.courtName}</td>
                    <td style="color:#94a3b8;">${c.nature || '—'}</td>
                    <td>
                        <strong style="font-size:0.95rem; color:#ffffff;">${c.partyName}</strong>
                        <div>${statusPill}</div>
                    </td>
                    <td style="color:#cbd5e1; font-size:0.9rem;">${c.dateFixedFor}</td>
                    <td style="font-weight:600; color:#818cf8;">${formatDate(c.nextDate)}</td>
                    <td>${btns}</td>
                </tr>
            `;
        });
        elements.tableBody.innerHTML = html;
    }

    // 8. ACTIONS: GLASS CONFIRM DIALOG + INTERACTIVE UNDO TOAST
    async function handleActions(e) {
        const btn = e.target.closest('button'); 
        if (!btn) return;
        e.stopPropagation();
        const id = btn.dataset.id;
        
        if (btn.classList.contains('delete-btn')) { 
            const confirmed = window.glassConfirm 
                ? await window.glassConfirm("Move to Recycle Bin?", "This case will be removed from your active schedule.", "Move to Bin", true)
                : confirm("Move this case to Recycle Bin?");

            if (confirmed) { 
                await userCasesCollection.doc(id).update({ isDeleted: true });
                allCasesCache = []; 
                displayCases(elements.currentDate.value);

                if (window.showGlassToast) {
                    window.showGlassToast("Case moved to Recycle Bin", "warning", "Undo ↩️", async () => {
                        await userCasesCollection.doc(id).update({ isDeleted: false });
                        allCasesCache = [];
                        displayCases(elements.currentDate.value);
                        window.showGlassToast("Case restored successfully!", "success");
                    }, 5000);
                }
            } 
        }
        else if (btn.classList.contains('close-btn')) { 
            const confirmed = window.glassConfirm
                ? await window.glassConfirm("Mark Decided?", "Do you want to mark this case as closed/decided?", "Mark Closed", false)
                : confirm("Mark this case as Decided / Closed?");

            if (confirmed) {
                await userCasesCollection.doc(id).update({ isClosed: true });
                displayCases(elements.currentDate.value);
                if (window.showGlassToast) window.showGlassToast("Case marked as decided ✅", "success");
            }
        }
        else if (btn.classList.contains('edit-btn')) { 
            openEdit(id); 
        }
        else if (btn.classList.contains('whatsapp-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case));
                let msg = `*⚖️ Advocate Diary - Case Hearing Update*\n\n`;
                msg += `Dear *${c.partyName}*,\n`;
                msg += `Here are the details for your upcoming court hearing:\n\n`;
                msg += `📁 *Case:* ${c.caseNo} / ${c.year}\n`;
                msg += `🏛️ *Court:* ${c.courtName}\n`;
                msg += `📅 *Date of Hearing:* ${formatDate(c.nextDate || c.current_date)}\n`;
                msg += `📝 *Fixed For:* ${c.dateFixedFor}\n\n`;
                msg += `Kindly ensure your presence on time.\n`;
                msg += `_Advocate Diary Management System_`;

                const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
            } catch(err) { 
                if (window.showGlassToast) window.showGlassToast("Error launching WhatsApp", "error"); 
                else alert("Error launching WhatsApp message."); 
            }
        }
        else if (btn.classList.contains('pdf-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case));
                const printWindow = window.open('', '_blank');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Case Summary - ${c.partyName}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
                            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                            .header h1 { margin: 0; color: #2563eb; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
                            .header p { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
                            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #f8fafc; margin-bottom: 24px; }
                            .card-title { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                            .grid-row { display: grid; grid-template-columns: 200px 1fr; padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
                            .grid-row:last-child { border-bottom: none; }
                            .grid-label { font-weight: 600; color: #475569; }
                            .grid-val { color: #0f172a; font-weight: 500; }
                            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: 12px; font-weight: 700; }
                            .badge-active { background: #dcfce7; color: #15803d; }
                            .badge-closed { background: #fee2e2; color: #b91c1c; }
                            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <h1>Advocate Case Report</h1>
                                <p>Official Legal Hearing Summary</p>
                            </div>
                            <div style="text-align:right;">
                                <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-title">Case Information</div>
                            <div class="grid-row"><span class="grid-label">Party Name:</span><span class="grid-val">${c.partyName}</span></div>
                            <div class="grid-row"><span class="grid-label">Case Number:</span><span class="grid-val">${c.caseNo} / ${c.year}</span></div>
                            <div class="grid-row"><span class="grid-label">Court:</span><span class="grid-val">${c.courtName}</span></div>
                            <div class="grid-row"><span class="grid-label">Nature:</span><span class="grid-val">${c.nature || 'N/A'}</span></div>
                            <div class="grid-row"><span class="grid-label">Purpose:</span><span class="grid-val">${c.dateFixedFor}</span></div>
                            <div class="grid-row"><span class="grid-label">Current Status:</span><span><span class="status-badge ${c.isClosed ? 'badge-closed' : 'badge-active'}">${c.isClosed ? 'Decided / Closed' : 'Active Litigation'}</span></span></div>
                        </div>

                        <div class="card">
                            <div class="card-title">Hearing Timeline</div>
                            <div class="grid-row"><span class="grid-label">Previous Date:</span><span class="grid-val">${formatDate(c.previousDate)}</span></div>
                            <div class="grid-row"><span class="grid-label">Listed Date:</span><span class="grid-val">${formatDate(c.current_date)}</span></div>
                            <div class="grid-row"><span class="grid-label">Next Date:</span><span class="grid-val" style="font-weight:700; color:#2563eb;">${formatDate(c.nextDate)}</span></div>
                        </div>

                        <div class="footer">
                            <p>Generated automatically via Advocate Diary &bull; Confidential Legal Record</p>
                        </div>
                        <script>
                            window.onload = function() { window.print(); }
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } catch(err) { 
                if (window.showGlassToast) window.showGlassToast("Error generating PDF", "error");
                else alert("Error generating printable report."); 
            }
        }
        else if (btn.classList.contains('calendar-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case)); 
                const title = `Court Hearing: ${c.partyName} (${c.caseNo}/${c.year})`;
                const details = `Case: ${c.caseNo}/${c.year}\nCourt: ${c.courtName}\nPurpose: ${c.dateFixedFor}\nParty: ${c.partyName}`;
                const dates = `${c.current_date.replace(/-/g,'')}/${c.current_date.replace(/-/g,'')}`;
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dates}`, '_blank'); 
            } catch(err) { 
                if (window.showGlassToast) window.showGlassToast("Error opening calendar", "error");
                else alert("Error syncing with Calendar."); 
            }
        }
    }

    // 9. EDIT MODAL LOGIC
    async function openEdit(id) {
        try {
            const doc = await userCasesCollection.doc(id).get();
            const d = doc.data();
            document.getElementById('editCaseId').value = id; 
            document.getElementById('editCaseNo').value = d.caseNo || ''; 
            document.getElementById('editYear').value = d.year || ''; 
            document.getElementById('editCourtName').value = d.courtName || ''; 
            document.getElementById('editNature').value = d.nature || ''; 
            document.getElementById('editPartyName').value = d.partyName || ''; 
            document.getElementById('editPreviousDate').value = d.previousDate || ''; 
            document.getElementById('editDateFixedFor').value = d.dateFixedFor || ''; 
            document.getElementById('editNextDate').value = d.nextDate || ''; 
            document.getElementById('editCaseColor').value = d.fontColor || '#000000'; 
            document.getElementById('editModal').style.display = 'block';
        } catch(err) {
            if (window.showGlassToast) window.showGlassToast("Error loading case: " + err.message, "error");
            else alert("Error loading case details: " + err.message);
        }
    }

    // 10. UPDATE CASE & DATE FORWARDING
    async function updateCase(e) {
        e.preventDefault(); 
        const id = document.getElementById('editCaseId').value;
        const u = { 
            caseNo: document.getElementById('editCaseNo').value.trim(), 
            year: document.getElementById('editYear').value.trim(), 
            courtName: document.getElementById('editCourtName').value.trim(), 
            nature: document.getElementById('editNature').value.trim(), 
            partyName: document.getElementById('editPartyName').value.trim(), 
            dateFixedFor: document.getElementById('editDateFixedFor').value.trim(), 
            fontColor: document.getElementById('editCaseColor').value, 
            nextDate: document.getElementById('editNextDate').value 
        };
        
        try {
            await userCasesCollection.doc(id).update(u); 
            allCasesCache = []; 

            if (u.nextDate) { 
                const oldDoc = await userCasesCollection.doc(id).get();
                const old = oldDoc.data(); 
                await userCasesCollection.add({
                    ...u, 
                    previousDate: old.current_date, 
                    current_date: u.nextDate, 
                    nextDate: '', 
                    isClosed: false, 
                    isDeleted: false, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }); 
            }
            
            document.getElementById('editModal').style.display = 'none'; 
            displayCases(elements.currentDate.value);
            if (window.showGlassToast) window.showGlassToast("Case updated successfully!", "success");
        } catch(err) {
            if (window.showGlassToast) window.showGlassToast("Error updating case: " + err.message, "error");
            else alert("Error updating case: " + err.message);
        }
    }

    function formatDate(d) { 
        return d ? d.split('-').reverse().join('-') : '—'; 
    }
});

// 11. NOTIFICATION SYSTEM (PURE LIQUID GLASS TOAST)
const notifBtn = document.getElementById('btnInitNotifs');
const notifBadge = document.getElementById('notifBadge');

if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        if (!("Notification" in window)) {
            if (window.showGlassToast) window.showGlassToast("This browser does not support web notifications.", "error");
            else alert("❌ This browser does not support web notifications.");
        } else if (Notification.permission === "granted") {
            if (window.showGlassToast) window.showGlassToast("Notifications are active! Checking today's listings...", "success");
            else alert("✅ Notifications are active! Checking today's listings...");
            checkTodaysCases();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    if (window.showGlassToast) window.showGlassToast("Notifications enabled for hearing updates! 🔔", "success");
                    showSystemNotification("Advocate Diary", "Notifications enabled for hearing updates.", "🔔");
                    checkTodaysCases();
                } else { 
                    if (window.showGlassToast) window.showGlassToast("Notification permission was denied.", "warning");
                    else alert("❌ Permission was not granted."); 
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== 'granted') {
        if (notifBadge) notifBadge.style.display = 'flex';
    } else {
        if (notifBadge) notifBadge.style.display = 'none';
        setTimeout(checkTodaysCases, 2500); 
        setTimeout(checkSystemUpdates, 5000);
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
            .where("isDeleted", "==", false)
            .get();
        if (!snapshot.empty) {
            const count = snapshot.size;
            showSystemNotification(`📅 Hearing Briefing (${todayStr})`, `You have ${count} active case(s) listed today. Click to inspect.`, "⚖️");
            localStorage.setItem('lastCaseNotification', today);
        }
    } catch (error) { 
        console.error("Notification check error:", error); 
    }
}

function checkSystemUpdates() {
    const policyVersion = "2.0"; 
    const userSeenVersion = localStorage.getItem('policySeenVersion');
    if (userSeenVersion !== policyVersion) {
        showSystemNotification("🔒 Privacy Policy", "Advocate Diary security guidelines have been updated. Tap to read.", "🛡️");
        localStorage.setItem('policySeenVersion', policyVersion);
    }
}

function showSystemNotification(title, body, iconChar) {
    if (Notification.permission === "granted") {
        const options = { 
            body: body, 
            icon: 'icon-192.png', 
            badge: 'icon-192.png', 
            vibrate: [150, 80, 150] 
        };
        const notif = new Notification(title, options);
        notif.onclick = function(event) {
            event.preventDefault(); 
            window.focus();
            if (title.includes("Policy")) { 
                window.location.href = 'policy.html'; 
            } else { 
                window.location.href = 'index.html'; 
            }
            notif.close();
        };
    }
}