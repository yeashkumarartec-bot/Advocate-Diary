document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const adminEmailDisplay = document.getElementById('adminEmail');
    const btnLogout = document.getElementById('btnLogout');
    const adminSearch = document.getElementById('adminSearch');
    
    // Modal Elements
    const userModal = document.getElementById('userModal');
    const closeUserModal = document.getElementById('closeUserModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const userDetailsContent = document.getElementById('userDetailsContent');
    const userCasesTableBody = document.getElementById('userCasesTableBody');

    // 🔒 ADMIN EMAILS (सब छोटे अक्षरों में लिखें)
    // अपनी ईमेल यहाँ चेक कर लो, अगर स्पेलिंग गलत है तो सही कर लेना!
    const ADMIN_EMAILS = [
        "contact.advocatediary@gmail.com"
    ]; 

    // --- 1. AUTH CHECK (SMART FIX) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // ईमेल को छोटा (lowercase) करके चेक करेंगे
            const currentEmail = user.email.toLowerCase();

            if (ADMIN_EMAILS.includes(currentEmail)) {
                adminEmailDisplay.textContent = `Admin: ${user.email}`;
                loadAllUsers();
            } else {
                // अगर अब भी फेल हुआ, तो अलर्ट में दिखेगा कि आप किस ईमेल से आए हो
                alert(`Access Denied!\n\nYou are logged in as: ${user.email}\n\nThis email is not in the Admin List.`);
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- 2. LOAD USERS ---
    async function loadAllUsers() {
        usersTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
        try {
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            
            if (snapshot.empty) {
                usersTableBody.innerHTML = '<tr><td colspan="4">No registered users found.</td></tr>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const created = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
                const status = data.isVerified ? '<span style="color:var(--success);">Verified</span>' : '<span style="color:var(--warning);">Pending</span>';
                
                html += `
                    <tr>
                        <td style="font-weight:600;">${data.email}</td>
                        <td>${created}</td>
                        <td>${status}</td>
                        <td>
                            <button class="action-btn view-btn" onclick="viewUser('${doc.id}', '${data.email}')">👁️</button>
                        </td>
                    </tr>
                `;
            });
            usersTableBody.innerHTML = html;

        } catch (error) {
            console.error("Error loading users:", error);
            usersTableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
        }
    }

    // --- 3. VIEW USER DETAILS (MODAL) ---
    window.viewUser = async function(userId, email) {
        userModal.style.display = 'block';
        userDetailsContent.innerHTML = `<p><strong>Email:</strong> ${email}</p><p>Loading cases...</p>`;
        userCasesTableBody.innerHTML = '';

        try {
            const casesSnap = await db.collection('users').doc(userId).collection('cases')
                                      .orderBy('current_date', 'desc').limit(20).get();

            let casesHtml = '';
            if (casesSnap.empty) {
                casesHtml = '<tr><td colspan="3">No cases found for this user.</td></tr>';
            } else {
                casesSnap.forEach(doc => {
                    const c = doc.data();
                    casesHtml += `
                        <tr>
                            <td>${c.caseNo}</td>
                            <td>${c.partyName}</td>
                            <td>${c.nextDate || c.current_date}</td>
                        </tr>
                    `;
                });
            }
            
            userDetailsContent.innerHTML = `<p style="font-size:1.1em;"><strong>User:</strong> ${email}</p>`;
            userCasesTableBody.innerHTML = casesHtml;

        } catch (error) {
            console.error("Error fetching cases:", error);
            userDetailsContent.innerHTML += `<p style="color:red;">Error loading cases.</p>`;
        }
    };

    // --- 4. SEARCH LOGIC ---
    if(adminSearch) {
        adminSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = usersTableBody.getElementsByTagName('tr');
            Array.from(rows).forEach(row => {
                const emailCell = row.getElementsByTagName('td')[0];
                if (emailCell) {
                    const email = emailCell.textContent.toLowerCase();
                    row.style.display = email.includes(term) ? '' : 'none';
                }
            });
        });
    }

    // --- 5. MODAL CLOSE LOGIC ---
    closeUserModal.onclick = () => userModal.style.display = 'none';
    closeModalBtn.onclick = () => userModal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target == userModal) userModal.style.display = 'none';
    }

    // Logout
    btnLogout.addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'login.html');
    });
});