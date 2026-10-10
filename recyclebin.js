document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); 
    const db = firebase.firestore();
    
    let userCasesCollection = null; 
    let userClientsCollection = null; 
    let currentUserId = null;

    const els = { 
        name: document.getElementById('userEmail'), 
        clientTable: document.getElementById('clientRecycleBin'), 
        caseTable: document.getElementById('caseRecycleBin') 
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0]; 
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if (els.name) els.name.innerHTML = `👋 ${name}`;

            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients");
            loadData();
        } else { 
            window.location.href = 'login.html'; 
        }
    });

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = window.glassConfirm 
                ? await window.glassConfirm("Sign Out", "Are you sure you want to log out?", "Logout", true)
                : confirm("Are you sure you want to log out?");

            if (confirmed) {
                auth.signOut().then(() => window.location.href = 'login.html');
            }
        });
    }

    async function loadData() {
        if (!userClientsCollection || !userCasesCollection) return;

        try {
            // LOAD DELETED CLIENTS
            const cSnap = await userClientsCollection.where("isDeleted", "==", true).get();
            if (cSnap.empty) {
                els.clientTable.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:28px; color:#94a3b8; font-weight:500;">No deleted clients in Recycle Bin.</td></tr>`;
            } else {
                let cHtml = '';
                let cIndex = 0;
                cSnap.forEach(d => {
                    const c = d.data();
                    const delay = (cIndex * 0.04).toFixed(2);
                    cHtml += `
                        <tr class="animate-row" style="animation: fadeInUp 0.35s ease-out forwards; animation-delay: ${delay}s;">
                            <td><strong style="color:#ffffff; font-size:0.95rem;">${c.name || 'Unnamed Client'}</strong></td>
                            <td style="color:#cbd5e1;"><a href="tel:${c.mobile}" style="color:#818cf8; text-decoration:none;">${c.mobile || '—'}</a></td>
                            <td style="color:#94a3b8;">${c.email || '—'}</td>
                            <td class="action-cell">
                                <button type="button" class="action-btn restore-btn" onclick="restore('client','${d.id}')" title="Restore Client">♻️ Restore</button>
                                <button type="button" class="action-btn permanent-delete-btn" onclick="delForever('client','${d.id}')" title="Delete Permanently">❌ Delete</button>
                            </td>
                        </tr>
                    `;
                    cIndex++;
                });
                els.clientTable.innerHTML = cHtml;
            }

            // LOAD DELETED CASES
            const caseSnap = await userCasesCollection.where("isDeleted", "==", true).get();
            if (caseSnap.empty) {
                els.caseTable.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:28px; color:#94a3b8; font-weight:500;">No deleted cases in Recycle Bin.</td></tr>`;
            } else {
                let caseHtml = '';
                let caseIndex = 0;
                caseSnap.forEach(d => {
                    const c = d.data();
                    const delay = (caseIndex * 0.04).toFixed(2);
                    caseHtml += `
                        <tr class="animate-row" style="animation: fadeInUp 0.35s ease-out forwards; animation-delay: ${delay}s;">
                            <td>
                                <strong style="color:#ffffff; font-size:0.95rem;">${c.caseNo || '—'}</strong> 
                                <span style="color:#94a3b8; font-size:0.85rem;">(${c.year || '—'})</span>
                            </td>
                            <td style="color:#f1f5f9; font-weight:500;">${c.partyName || '—'}</td>
                            <td style="color:#cbd5e1;">${c.dateFixedFor || '—'}</td>
                            <td class="action-cell">
                                <button type="button" class="action-btn restore-btn" onclick="restore('case','${d.id}')" title="Restore Case">♻️ Restore</button>
                                <button type="button" class="action-btn permanent-delete-btn" onclick="delForever('case','${d.id}')" title="Delete Permanently">❌ Delete</button>
                            </td>
                        </tr>
                    `;
                    caseIndex++;
                });
                els.caseTable.innerHTML = caseHtml;
            }
        } catch (err) {
            console.error("Error loading recycle bin:", err);
        }
    }

    // CUSTOM LIQUID GLASS RESTORE
    window.restore = async (type, id) => {
        const itemType = type === 'client' ? 'Client' : 'Case';
        const confirmed = window.glassConfirm 
            ? await window.glassConfirm(`Restore ${itemType}?`, `It will reappear in your active records.`, "Restore", false)
            : confirm(`Restore this ${type}? It will reappear in your active records.`);

        if (!confirmed) return;

        try {
            const col = type === 'client' ? userClientsCollection : userCasesCollection;
            await col.doc(id).update({ isDeleted: false }); 
            loadData();

            if (window.showGlassToast) {
                window.showGlassToast(`${itemType} restored successfully!`, "success");
            }
        } catch (err) {
            if (window.showGlassToast) window.showGlassToast("Error restoring: " + err.message, "error");
        }
    };

    // CUSTOM LIQUID GLASS PERMANENT DELETE
    window.delForever = async (type, id) => {
        const itemType = type === 'client' ? 'Client' : 'Case';
        const confirmed = window.glassConfirm 
            ? await window.glassConfirm("Permanently Delete?", `This ${itemType} will be erased forever. This action cannot be undone.`, "Delete Forever", true)
            : confirm(`⚠️ PERMANENTLY DELETE this ${type}?\nThis action cannot be undone.`);

        if (!confirmed) return;

        try {
            const col = type === 'client' ? userClientsCollection : userCasesCollection;
            await col.doc(id).delete(); 
            loadData();

            if (window.showGlassToast) {
                window.showGlassToast(`${itemType} deleted permanently.`, "warning");
            }
        } catch (err) {
            if (window.showGlassToast) window.showGlassToast("Error deleting: " + err.message, "error");
        }
    };
});