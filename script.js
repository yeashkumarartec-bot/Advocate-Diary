document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); 
    const db = firebase.firestore();
    let userCasesCollection = null; 
    let userClientsCollection = null; 
    let currentUserId = null;
    
    // Cache for search
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
            if(!document.title.includes("Login")) window.location.href = 'login.html'; 
        }
    });

    if(elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'login.html'));

    // --- PAGE INITIALIZATION ---
    function initializePage() {
        elements.currentDate.value = new Date().toISOString().split('T')[0];
        displayCases(elements.currentDate.value);
        loadClients();
        
        // Reset Search & Reload on Date Change
        elements.currentDate.addEventListener('change', () => { 
            elements.search.value = ''; 
            displayCases(elements.currentDate.value); 
        });

        elements.form.addEventListener('submit', addCase);
        
        // Color Picker Logic
        const colorInput = document.getElementById('caseColor');
        if(colorInput) colorInput.addEventListener('input', (e) => elements.form.querySelectorAll('input:not([type="color"]), select').forEach(i => { i.style.color = e.target.value; i.style.fontWeight='600'; }));

        // LIVE SEARCH (FIXED: Case Insensitive)
        let debounce;
        elements.search.addEventListener('input', (e) => { 
            clearTimeout(debounce); 
            debounce = setTimeout(() => smartSearch(e.target.value), 300); 
        });
        
        const printBtn = document.getElementById('btnPrint');
        if(printBtn) printBtn.addEventListener('click', () => window.print());
        
        elements.tableBody.addEventListener('click', handleActions);
        
        // Edit Modal Setup
        const modal = document.getElementById('editModal');
        document.getElementById('closeEditModal').onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };
        document.getElementById('editCaseForm').onsubmit = updateCase;
        const editColor = document.getElementById('editCaseColor');
        if(editColor) editColor.oninput = (e) => document.getElementById('editCaseForm').querySelectorAll('input:not([type="color"])').forEach(i => i.style.color = e.target.value);
    }

    // --- CORE DATA FUNCTIONS ---

    // 1. Load Clients for Auto-Suggest
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

    // 2. Add New Case
    async function addCase(e) {
        e.preventDefault();
        const data = {
            previousDate: null, 
            caseNo: document.getElementById('caseNo').value, 
            year: document.getElementById('year').value, 
            courtName: document.getElementById('courtName').value, 
            nature: document.getElementById('nature').value, 
            partyName: document.getElementById('partyName').value, 
            dateFixedFor: document.getElementById('addDateFixedFor').value, 
            current_date: document.getElementById('firstDate').value, 
            fontColor: document.getElementById('caseColor').value, 
            nextDate: null, 
            isClosed: false, 
            isDeleted: false, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try { 
            await userCasesCollection.add(data); 
            
            // Reset Cache because data changed
            allCasesCache = []; 
            
            elements.currentDate.value = data.current_date; 
            displayCases(data.current_date); 
            elements.form.reset(); 
            document.getElementById('caseColor').value='#000000'; 
            elements.form.querySelectorAll('input').forEach(i=>i.style.color='#333'); 
        } catch(e){ alert("Error Adding Case"); }
    }

    // 3. Display Cases (Standard View)
    async function displayCases(date) {
        elements.displayDate.textContent = `Cases for ${date.split('-').reverse().join('-')}`;
        elements.tableBody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
        
        const snap = await userCasesCollection.where("current_date", "==", date).where("isDeleted", "==", false).get();
        
        // Convert to Array
        const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(cases);
    }

    // 4. SMART SEARCH (The Fix)
    async function smartSearch(term) {
        term = term.trim().toLowerCase(); // Convert to lowercase
        
        if(!term) { 
            displayCases(elements.currentDate.value); 
            return; 
        }

        elements.displayDate.textContent = `Results: "${term}"`; 
        elements.tableBody.innerHTML = '<tr><td colspan="9">Searching...</td></tr>';

        // Fetch ALL active cases once and cache them (Memory Optimization)
        if (allCasesCache.length === 0) {
            try {
                const snap = await userCasesCollection.where('isDeleted', '==', false).orderBy('current_date', 'desc').get();
                allCasesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error("Search Error", e);
                elements.tableBody.innerHTML = '<tr><td colspan="9">Index required. Click link in console (F12).</td></tr>';
                return;
            }
        }

        // Filter in Memory (Case Insensitive)
        const results = allCasesCache.filter(c => {
            const caseNo = (c.caseNo || '').toLowerCase();
            const party = (c.partyName || '').toLowerCase();
            return caseNo.includes(term) || party.includes(term);
        });

        renderTable(results);
    }

    // 5. Universal Render Function
    function renderTable(dataArray) {
        if(!dataArray.length) { 
            elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No cases found.</td></tr>'; 
            return; 
        }
        
        let html = '';
        dataArray.forEach(c => {
            const id = c.id; 
            const safe = encodeURIComponent(JSON.stringify(c));
            
            // Buttons
            let btns = `<div class="action-cell">
                <button class="action-btn edit-btn" data-id="${id}">✏️</button>
                <button class="action-btn calendar-btn" data-id="${id}" data-case="${safe}">📅</button>
                <button class="action-btn email-btn" data-id="${id}" data-case="${safe}">📧</button>`;
            
            if(!c.isClosed && !c.nextDate) btns += `<button class="action-btn close-btn" data-id="${id}">✅</button>`;
            btns += `<button class="action-btn delete-btn" data-id="${id}">🗑️</button></div>`;
            
            if(c.nextDate) btns += `<span style="color:green;font-weight:bold;margin-left:5px;">Done</span>`;
            
            html += `<tr class="${c.isClosed?'case-closed':''}" style="color:${c.fontColor||'#333'}">
                <td>${formatDate(c.previousDate)}</td>
                <td>${c.caseNo}</td>
                <td>${c.year}</td>
                <td>${c.courtName}</td>
                <td>${c.nature}</td>
                <td>${c.partyName}</td>
                <td>${c.dateFixedFor}</td>
                <td>${formatDate(c.nextDate)}</td>
                <td>${btns}</td>
            </tr>`;
        });
        elements.tableBody.innerHTML = html;
    }

    // 6. Action Handlers
    function handleActions(e) {
        const btn = e.target.closest('button'); if(!btn) return;
        const id = btn.dataset.id;
        
        if(btn.classList.contains('delete-btn')) { 
            if(confirm('Move to Recycle Bin?')) {
                userCasesCollection.doc(id).update({isDeleted:true}).then(() => {
                    allCasesCache = []; // Clear cache
                    displayCases(elements.currentDate.value);
                });
            }
        }
        else if(btn.classList.contains('close-btn')) { 
            userCasesCollection.doc(id).update({isClosed:true}).then(() => displayCases(elements.currentDate.value)); 
        }
        else if(btn.classList.contains('edit-btn')) { 
            openEdit(id); 
        }
        else if(btn.classList.contains('calendar-btn')) { 
            const c = JSON.parse(decodeURIComponent(btn.dataset.case)); 
            const title = `Court: ${c.partyName} (Case: ${c.caseNo})`;
            const details = `Case: ${c.caseNo} | Court: ${c.courtName} | Purpose: ${c.dateFixedFor}`;
            const dates = `${c.current_date.replace(/-/g,'')}/${c.current_date.replace(/-/g,'')}`;
            window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dates}`, '_blank'); 
        }
        else if(btn.classList.contains('email-btn')) { 
            const c = JSON.parse(decodeURIComponent(btn.dataset.case));
            const subject = `Case Update: ${c.caseNo} - ${c.partyName}`;
            const body = `Dear Client,\n\nUpdate for Case No: ${c.caseNo} (${c.courtName}).\nNext Date: ${formatDate(c.nextDate || 'Not set')}\nPurpose: ${c.dateFixedFor}\n\nRegards,\nAdvocate`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; 
        }
    }

    async function openEdit(id) {
        const d = (await userCasesCollection.doc(id).get()).data();
        document.getElementById('editCaseId').value = id;
        document.getElementById('editCaseNo').value = d.caseNo;
        document.getElementById('editYear').value = d.year;
        document.getElementById('editCourtName').value = d.courtName;
        document.getElementById('editNature').value = d.nature;
        document.getElementById('editPartyName').value = d.partyName;
        document.getElementById('editPreviousDate').value = d.previousDate;
        document.getElementById('editDateFixedFor').value = d.dateFixedFor;
        document.getElementById('editNextDate').value = d.nextDate;
        document.getElementById('editCaseColor').value = d.fontColor || '#000000';
        document.getElementById('editModal').style.display = 'block';
    }

    async function updateCase(e) {
        e.preventDefault(); const id = document.getElementById('editCaseId').value;
        const u = { 
            caseNo: document.getElementById('editCaseNo').value, 
            year: document.getElementById('editYear').value, 
            courtName: document.getElementById('editCourtName').value, 
            nature: document.getElementById('editNature').value, 
            partyName: document.getElementById('editPartyName').value, 
            dateFixedFor: document.getElementById('editDateFixedFor').value, 
            fontColor: document.getElementById('editCaseColor').value, 
            nextDate: document.getElementById('editNextDate').value 
        };
        await userCasesCollection.doc(id).update(u);
        allCasesCache = []; // Clear cache on edit
        
        if(u.nextDate) { 
            const old = (await userCasesCollection.doc(id).get()).data(); 
            await userCasesCollection.add({
                ...u, previousDate:old.current_date, current_date:u.nextDate, nextDate:'', isClosed:false, isDeleted:false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }); 
        }
        document.getElementById('editModal').style.display = 'none'; 
        displayCases(elements.currentDate.value);
    }

    function formatDate(d) { return d ? d.split('-').reverse().join('-') : '—'; }
});