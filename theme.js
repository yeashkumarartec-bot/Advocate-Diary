/* === Universal Theme Manager === */
(function() {
    // 1. पेज लोड होने से पहले ही थीम चेक करो (ताकि झपकी न आए)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // 2. हर पेज के हेडर में बटन लगाओ
    const headerControls = document.querySelector('.header-controls');
    // Login Page पर header-controls नहीं होता, वहां auth-container होता है
    const authContainer = document.querySelector('.auth-container');
    
    // बटन बनाने का फंक्शन
    function createThemeBtn() {
        if (document.getElementById('themeToggle')) return; // अगर पहले से है तो मत बनाओ

        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'header-link';
        const isDark = localStorage.getItem('theme') === 'dark';
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.title = "Toggle Theme";
        btn.style.fontSize = "1.2em";
        btn.style.padding = "8px 12px";
        btn.style.marginRight = "10px";
        btn.style.cursor = "pointer";
        btn.style.background = "transparent";
        btn.style.border = "1px solid var(--border-color)";
        btn.style.color = "var(--primary)";
        btn.style.borderRadius = "5px";

        btn.onclick = (e) => {
            e.preventDefault(); // फॉर्म सबमिट होने से रोको
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
        return btn;
    }

    // बटन को सही जगह लगाओ
    if (headerControls) {
        headerControls.insertBefore(createThemeBtn(), headerControls.firstChild);
    } else if (authContainer) {
        // लॉगिन पेज के लिए स्पेशल जगह (टाइटल से पहले)
        const title = authContainer.querySelector('h1');
        if(title) authContainer.insertBefore(createThemeBtn(), title);
    }
});