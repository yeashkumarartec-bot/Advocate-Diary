document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); const db = firebase.firestore();
    let userClientsCollection = null; let currentUserId = null;
    const els = { name: document.getElementById('userEmail'), form: document.getElementById('addClientForm'), table: document.getElementById('clientTableBody'), success: document.getElementById('clientFormSuccess') };

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0]; name = name.charAt(0).toUpperCase() + name.slice(1);
            if(els.name) els.name.innerHTML = `👋 ${name}`;
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients"); 
            loadClients();
        } else { window.location.href = 'login.html'; }
    });

    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut().then(() => window.location.href = 'login.html'));

    if(els.form) {
        els.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await userClientsCollection.add({
                    name: document.getElementById('clientName').value,
                    mobile: document.getElementById('clientMobile').value,
                    email: document.getElementById('clientEmail').value,
                    address: document.getElementById('clientAddress').value,
                    isDeleted: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                els.success.style.display = 'block'; els.form.reset(); loadClients(); setTimeout(() => els.success.style.display = 'none', 3000);
            } catch (e) { alert("Error adding"); }
        });
    }

    async function loadClients() {
        if (!userClientsCollection) return;
        els.table.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
        const snap = await userClientsCollection.where("isDeleted", "==", false).orderBy("name").get();
        if (snap.empty) { els.table.innerHTML = '<tr><td colspan="5">No clients found.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => {
            const c = doc.data();
            html += `<tr><td>${c.name}</td><td>${c.mobile}</td><td>${c.email||'-'}</td><td>${c.address||'-'}</td>
            <td class="action-cell"><button class="action-btn edit-btn" onclick="openEdit('${doc.id}')">✏️</button><button class="action-btn delete-btn" onclick="delClient('${doc.id}')">🗑️</button></td></tr>`;
        });
        els.table.innerHTML = html;
    }

    window.delClient = async (id) => { if(confirm('Recycle Bin?')) { await userClientsCollection.doc(id).update({isDeleted:true}); loadClients(); } };
    
    window.openEdit = async (id) => {
        const d = (await userClientsCollection.doc(id).get()).data();
        document.getElementById('editClientId').value = id;
        document.getElementById('editClientName').value = d.name;
        document.getElementById('editClientMobile').value = d.mobile;
        document.getElementById('editClientEmail').value = d.email;
        document.getElementById('editClientAddress').value = d.address;
        document.getElementById('editClientModal').style.display = 'block';
    };
    
    document.getElementById('closeEditClientModal').onclick = () => document.getElementById('editClientModal').style.display = 'none';
    document.getElementById('editClientForm').onsubmit = async (e) => {
        e.preventDefault();
        await userClientsCollection.doc(document.getElementById('editClientId').value).update({
            name: document.getElementById('editClientName').value, mobile: document.getElementById('editClientMobile').value, email: document.getElementById('editClientEmail').value, address: document.getElementById('editClientAddress').value,
        });
        document.getElementById('editClientModal').style.display = 'none'; loadClients();
    };
});