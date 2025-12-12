document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth(); const db = firebase.firestore();
    let userCasesCollection = null; let userClientsCollection = null; let currentUserId = null;
    const els = { name: document.getElementById('userEmail'), clientTable: document.getElementById('clientRecycleBin'), caseTable: document.getElementById('caseRecycleBin') };

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            let name = user.displayName || user.email.split('@')[0]; name = name.charAt(0).toUpperCase() + name.slice(1);
            if(els.name) els.name.innerHTML = `👋 ${name}`;
            userCasesCollection = db.collection("users").doc(currentUserId).collection("cases");
            userClientsCollection = db.collection("users").doc(currentUserId).collection("clients");
            loadData();
        } else { window.location.href = 'login.html'; }
    });

    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut().then(() => window.location.href = 'login.html'));

    async function loadData() {
        if(!userClientsCollection) return;
        const cSnap = await userClientsCollection.where("isDeleted", "==", true).get();
        let cHtml = ''; cSnap.forEach(d => { const c = d.data(); cHtml += `<tr><td>${c.name}</td><td>${c.mobile}</td><td>${c.email}</td><td class="action-cell"><button class="action-btn print-btn" onclick="restore('client','${d.id}')">♻️</button><button class="action-btn delete-btn" onclick="delForever('client','${d.id}')">❌</button></td></tr>`; });
        els.clientTable.innerHTML = cHtml || '<tr><td colspan="4">Empty</td></tr>';

        const caseSnap = await userCasesCollection.where("isDeleted", "==", true).get();
        let caseHtml = ''; caseSnap.forEach(d => { const c = d.data(); caseHtml += `<tr><td>${c.caseNo}</td><td>${c.partyName}</td><td>${c.dateFixedFor}</td><td class="action-cell"><button class="action-btn print-btn" onclick="restore('case','${d.id}')">♻️</button><button class="action-btn delete-btn" onclick="delForever('case','${d.id}')">❌</button></td></tr>`; });
        els.caseTable.innerHTML = caseHtml || '<tr><td colspan="4">Empty</td></tr>';
    }

    window.restore = async (type, id) => {
        if(!confirm("Restore?")) return;
        const col = type === 'client' ? userClientsCollection : userCasesCollection;
        await col.doc(id).update({ isDeleted: false }); loadData();
    };

    window.delForever = async (type, id) => {
        if(!confirm("DELETE FOREVER? Cannot undo.")) return;
        const col = type === 'client' ? userClientsCollection : userCasesCollection;
        await col.doc(id).delete(); loadData();
    };
});