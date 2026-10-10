document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); 
    const db = firebase.firestore();

    let userClientsCollection = null; 
    let userCasesCollection = null;
    let currentUserId = null;
    let allClientsCache = [];
    let caseCountsMap = {};

    const els = { 
        name: document.getElementById('userEmail'), 
        form: document.getElementById('addClientForm'), 
        table: document.getElementById('clientTableBody'), 
        success: document.getElementById('clientFormSuccess'),
        search: document.getElementById('clientSearchInput')
    };

    // 1. AUTHENTICATION & INITIALIZATION
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0]; 
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if (els.name) els.name.innerHTML = `👋 ${name}`;

            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients"); 
            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");

            await calculateCaseCounts();
            loadClients();
        } else { 
            window.location.href = 'login.html'; 
        }
    });

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });
    }

    // 2. CALCULATE ACTIVE CASES PER CLIENT
    async function calculateCaseCounts() {
        if (!userCasesCollection) return;
        try {
            const snap = await userCasesCollection.where('isDeleted', '==', false).get();
            caseCountsMap = {};
            snap.forEach(doc => {
                const c = doc.data();
                if (c.partyName) {
                    const key = c.partyName.trim().toLowerCase();
                    if (!caseCountsMap[key]) caseCountsMap[key] = 0;
                    if (!c.isClosed) caseCountsMap[key]++;
                }
            });
        } catch (err) {
            console.error("Case count calculation error:", err);
        }
    }

    // 3. ADD NEW CLIENT
    if (els.form) {
        els.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = els.form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Save Client';
            if (submitBtn) {
                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;
            }

            try {
                await userClientsCollection.add({
                    name: document.getElementById('clientName').value.trim(),
                    mobile: document.getElementById('clientMobile').value.trim(),
                    email: document.getElementById('clientEmail').value.trim(),
                    address: document.getElementById('clientAddress').value.trim(),
                    isDeleted: false, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (els.success) {
                    els.success.style.display = 'block';
                    setTimeout(() => els.success.style.display = 'none', 3000);
                }
                els.form.reset();
                await calculateCaseCounts();
                loadClients();
            } catch (err) { 
                alert("Error adding client: " + err.message); 
            } finally {
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // 4. LOAD & RENDER CLIENTS
    async function loadClients() {
        if (!userClientsCollection || !els.table) return;
        els.table.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:28px; color:#94a3b8;">Loading clients...</td></tr>';
        
        try {
            const snap = await userClientsCollection.where("isDeleted", "==", false).orderBy("name").get();
            allClientsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable(allClientsCache);
        } catch (err) {
            els.table.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#ef4444;">Error: ${err.message}</td></tr>`;
        }
    }

    function renderTable(clientsList) {
        if (!els.table) return;
        if (!clientsList.length) { 
            els.table.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:#94a3b8; font-weight:500;">No clients found. Add one above.</td></tr>'; 
            return; 
        }

        let html = '';
        clientsList.forEach((c, index) => {
            const delay = (index * 0.04).toFixed(2);
            const key = (c.name || '').trim().toLowerCase();
            const count = caseCountsMap[key] || 0;
            
            const badgeClass = count > 0 ? 'case-badge' : 'case-badge zero-cases';
            const badgeText = count > 0 ? `${count} Active Cases 📂` : 'No Active Cases';
            const badgeAction = count > 0 ? `onclick="window.location.href='index.html?search=${encodeURIComponent(c.name)}'"` : '';
            const badgeTitle = count > 0 ? "Click to view listed cases" : "No active cases registered";

            html += `
                <tr class="animate-row" style="animation: fadeInUp 0.35s ease-out forwards; animation-delay: ${delay}s;">
                    <td>
                        <strong style="color:#ffffff; font-size:0.96rem;">${c.name || 'Unnamed'}</strong>
                        <div style="color:#94a3b8; font-size:0.82rem; margin-top:2px;">${c.email || ''}</div>
                    </td>
                    <td>
                        <div class="${badgeClass}" ${badgeAction} title="${badgeTitle}">
                            ${badgeText}
                        </div>
                    </td>
                    <td>
                        <a href="tel:${c.mobile}" style="color:#818cf8; text-decoration:none; font-weight:500; font-size:0.92rem;">${c.mobile || '—'}</a>
                    </td>
                    <td>
                        <div class="action-row" style="display:flex; gap:8px; align-items:center;">
                            <button type="button" class="action-btn edit-btn" onclick="openEdit('${c.id}')" title="Edit Client">✏️</button>
                            <button type="button" class="action-btn delete-btn" onclick="delClient('${c.id}')" title="Move to Recycle Bin">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        els.table.innerHTML = html;
    }

    // 5. LIVE INSTANT SEARCH FILTER
    if (els.search) {
        els.search.addEventListener('input', (e) => {
            const term = e.target.value.trim().toLowerCase();
            if (!term) {
                renderTable(allClientsCache);
                return;
            }
            const filtered = allClientsCache.filter(c => 
                (c.name || '').toLowerCase().includes(term) || 
                (c.mobile || '').includes(term) ||
                (c.email || '').toLowerCase().includes(term) ||
                (c.address || '').toLowerCase().includes(term)
            );
            renderTable(filtered);
        });
    }

    // 6. SOFT DELETE (RECYCLE BIN)
    window.delClient = async (id) => { 
        if (confirm('Move this client to Recycle Bin?')) { 
            try {
                await userClientsCollection.doc(id).update({ isDeleted: true }); 
                await calculateCaseCounts();
                loadClients(); 
            } catch (err) {
                alert("Error deleting client: " + err.message);
            }
        } 
    };
    
    // 7. EDIT MODAL LOGIC
    const editModal = document.getElementById('editClientModal');
    window.openEdit = async (id) => {
        try {
            const doc = await userClientsCollection.doc(id).get();
            const d = doc.data();
            document.getElementById('editClientId').value = id;
            document.getElementById('editClientName').value = d.name || '';
            document.getElementById('editClientMobile').value = d.mobile || '';
            document.getElementById('editClientEmail').value = d.email || '';
            document.getElementById('editClientAddress').value = d.address || '';
            if (editModal) editModal.style.display = 'block';
        } catch (err) {
            alert("Error loading client data: " + err.message);
        }
    };
    
    const closeBtn = document.getElementById('closeEditClientModal');
    if (closeBtn && editModal) {
        closeBtn.onclick = () => editModal.style.display = 'none';
        window.onclick = (e) => { if (e.target === editModal) editModal.style.display = 'none'; };
    }

    const editForm = document.getElementById('editClientForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editClientId').value;
            try {
                await userClientsCollection.doc(id).update({
                    name: document.getElementById('editClientName').value.trim(), 
                    mobile: document.getElementById('editClientMobile').value.trim(), 
                    email: document.getElementById('editClientEmail').value.trim(), 
                    address: document.getElementById('editClientAddress').value.trim()
                });
                if (editModal) editModal.style.display = 'none'; 
                await calculateCaseCounts();
                loadClients();
            } catch (err) {
                alert("Error updating client: " + err.message);
            }
        };
    }
});