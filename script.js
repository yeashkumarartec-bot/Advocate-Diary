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

    // --- 3. FIREBASE SERVICES ---
    const auth = firebase.auth(); 
    const db = firebase.firestore();
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

    // --- AUTHENTICATION ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if(elements.userEmail) elements.userEmail.innerHTML = `👋 ${name}`;

            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients");
            
            if(elements.tableBody) initializePage();
        } else { 
            if(!document.title.includes("Login") && !document.title.includes("Updates") && !document.title.includes("Policy")) {
                 window.location.href = 'login.html'; 
            }
        }
    });

    if(elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'login.html'));

    // --- INITIALIZE PAGE ---
    function initializePage() {
        elements.currentDate.value = new Date().toISOString().split('T')[0];
        displayCases(elements.currentDate.value);
        loadClients();
        elements.currentDate.addEventListener('change', () => { elements.search.value = ''; displayCases(elements.currentDate.value); });
        elements.form.addEventListener('submit', addCase);
        
        const colorInput = document.getElementById('caseColor');
        if(colorInput) colorInput.addEventListener('input', (e) => elements.form.querySelectorAll('input:not([type="color"]), select').forEach(i => { i.style.color = e.target.value; i.style.fontWeight='600'; }));

        let debounce;
        elements.search.addEventListener('input', (e) => { clearTimeout(debounce); debounce = setTimeout(() => smartSearch(e.target.value), 300); });
        
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
        if(elements.clientList) { elements.clientList.innerHTML = ''; snap.forEach(doc => { const opt = document.createElement('option'); opt.value = doc.data().name; elements.clientList.appendChild(opt); }); }
    }

    // --- CORE FUNCTIONS ---
    async function addCase(e) {
        e.preventDefault();
        const data = {
            previousDate: null, caseNo: document.getElementById('caseNo').value, year: document.getElementById('year').value, courtName: document.getElementById('courtName').value, nature: document.getElementById('nature').value, partyName: document.getElementById('partyName').value, dateFixedFor: document.getElementById('addDateFixedFor').value, current_date: document.getElementById('firstDate').value, fontColor: document.getElementById('caseColor').value, nextDate: null, isClosed: false, isDeleted: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try { await userCasesCollection.add(data); allCasesCache = []; elements.currentDate.value = data.current_date; displayCases(data.current_date); elements.form.reset(); document.getElementById('caseColor').value='#000000'; elements.form.querySelectorAll('input').forEach(i=>i.style.color='var(--text-main)'); } catch(e){ alert("Error"); }
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
            try { const snap = await userCasesCollection.where('isDeleted', '==', false).orderBy('current_date', 'desc').get(); allCasesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); } catch (e) { console.error(e); }
        }
        const results = allCasesCache.filter(c => (c.caseNo||'').toLowerCase().includes(term) || (c.partyName||'').toLowerCase().includes(term));
        renderTable(results);
    }

    function renderTable(dataArray) {
        if(!dataArray.length) { elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No cases found.</td></tr>'; return; }
        let html = '';
        dataArray.forEach(c => {
            const id = c.id; 
            const safe = encodeURIComponent(JSON.stringify(c)); // Full object for both buttons
            
            let btns = `<div class="action-cell">
                <button type="button" class="action-btn edit-btn" data-id="${id}">✏️</button>
                <button type="button" class="action-btn calendar-btn" data-id="${id}" data-case="${safe}">📅</button>
                <button type="button" class="action-btn email-btn" data-id="${id}" data-case="${safe}">📧</button>`;
            
            if(!c.isClosed && !c.nextDate) btns += `<button type="button" class="action-btn close-btn" data-id="${id}">✅</button>`;
            btns += `<button type="button" class="action-btn delete-btn" data-id="${id}">🗑️</button></div>`;
            if(c.nextDate) btns += `<span style="color:var(--success);font-weight:bold;margin-left:5px;">Done</span>`;
            
            html += `<tr class="${c.isClosed?'case-closed':''}" style="color:${c.fontColor||'inherit'}"><td>${formatDate(c.previousDate)}</td><td>${c.caseNo}</td><td>${c.year}</td><td>${c.courtName}</td><td>${c.nature}</td><td>${c.partyName}</td><td>${c.dateFixedFor}</td><td>${formatDate(c.nextDate)}</td><td>${btns}</td></tr>`;
        });
        elements.tableBody.innerHTML = html;
    }

    // --- (FIXED) SMART ACTION HANDLERS ---
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
        
        // --- CALENDAR LOGIC ---
        else if(btn.classList.contains('calendar-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case)); 
                const title = `Court: ${c.partyName} (Case: ${c.caseNo})`;
                const details = `Court: ${c.courtName} | Nature: ${c.nature} | Purpose: ${c.dateFixedFor} | Previous Date: ${formatDate(c.previousDate)}`;
                // Remove dashes for Google format YYYYMMDD
                const dateStr = c.current_date.replace(/-/g,''); 
                const dates = `${dateStr}/${dateStr}`; // All Day Event
                
                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dates}`;
                window.open(url, '_blank'); 
            } catch(err) { alert("Error opening calendar"); }
        }
        
        // --- EMAIL LOGIC (Smart Fill) ---
        else if(btn.classList.contains('email-btn')) { 
            try {
                const c = JSON.parse(decodeURIComponent(btn.dataset.case));
                const subject = `Case Update: ${c.partyName} (Case No: ${c.caseNo})`;
                
                // Detailed Body
                let body = `Dear ${c.partyName},\n\nHere is an update regarding your court case.\n\n`;
                body += `🏛 Court: ${c.courtName}\n`;
                body += `📂 Case No: ${c.caseNo} / ${c.year}\n`;
                body += `📅 Hearing Date: ${formatDate(c.current_date)}\n`;
                body += `📝 Purpose: ${c.dateFixedFor}\n`;
                
                if(c.nextDate) {
                    body += `⏭️ Next Hearing: ${formatDate(c.nextDate)}\n`;
                }
                
                body += `\nPlease contact us for further details.\n\nRegards,\nAdvocate`;
                
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; 
            } catch(err) { alert("Error opening email"); }
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