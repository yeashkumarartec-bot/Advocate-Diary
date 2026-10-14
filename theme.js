/* --- ADVOCATE DIARY LIQUID GLASS THEME, HIGH-CONTRAST & POPUP ENGINE --- */

(function () {
    // 1. Initial Theme Detection (Default: Dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 2. Inject Dynamic Global Stylesheet
    const styleEl = document.createElement('style');
    styleEl.id = 'liquid-glass-theme-styles';
    styleEl.innerHTML = `
        /* Smooth Transitions */
        body, .container, .auth-container, .modal-content, .stat-card, .table-container, header, footer, input, select, textarea {
            transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
        }

        /* ================= FLOATING CIRCULAR THEME BUTTON (FIXES MOBILE STRETCH) ================= */
        #themeToggle {
            position: fixed !important;
            top: 14px !important;
            right: 14px !important;
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            max-width: 44px !important;
            min-height: 44px !important;
            max-height: 44px !important;
            border-radius: 50% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            background: rgba(18, 24, 38, 0.85) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.35) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
            font-size: 1.25rem !important;
            cursor: pointer !important;
            user-select: none !important;
            outline: none !important;
            box-sizing: border-box !important;
        }
        #themeToggle:hover {
            transform: scale(1.08) !important;
            background: rgba(30, 41, 59, 0.95) !important;
        }
        #themeToggle:active {
            transform: scale(0.92) !important;
        }

        /* ================= LIGHT MODE HIGH-CONTRAST SYSTEM ================= */
        [data-theme="light"] body {
            background: #f1f5f9 !important;
            color: #0f172a !important;
        }
        [data-theme="light"] .liquid-orb {
            opacity: 0.16 !important;
            filter: blur(100px) !important;
        }

        /* Containers & Cards in Light Mode */
        [data-theme="light"] .container,
        [data-theme="light"] .auth-container,
        [data-theme="light"] .dashboard-container {
            background: rgba(255, 255, 255, 0.95) !important;
            border: 1px solid #cbd5e1 !important;
            border-top: 1px solid #ffffff !important;
            box-shadow: 0 20px 45px -10px rgba(100, 116, 139, 0.22) !important;
        }

        [data-theme="light"] .client-form-container,
        [data-theme="light"] .controls-wrapper,
        [data-theme="light"] .policy-content,
        [data-theme="light"] .stats-bar,
        [data-theme="light"] .update-card,
        [data-theme="light"] .dev-card,
        [data-theme="light"] .table-container,
        [data-theme="light"] .admin-table-container,
        [data-theme="light"] details,
        [data-theme="light"] .card {
            background: rgba(248, 250, 252, 0.95) !important;
            border: 1px solid #cbd5e1 !important;
            border-top: 1px solid #ffffff !important;
            box-shadow: 0 8px 24px -4px rgba(100, 116, 139, 0.1) !important;
        }

        /* Deep Ink Headings */
        [data-theme="light"] h1,
        [data-theme="light"] h2,
        [data-theme="light"] h3,
        [data-theme="light"] h4,
        [data-theme="light"] h5,
        [data-theme="light"] .brand-title,
        [data-theme="light"] header h1,
        [data-theme="light"] #formTitle,
        [data-theme="light"] .doc-title,
        [data-theme="light"] .page-title h2,
        [data-theme="light"] .section-header-title,
        [data-theme="light"] .section-heading,
        [data-theme="light"] strong,
        [data-theme="light"] b {
            color: #0f172a !important;
        }

        /* High-Contrast Body Text, Paragraphs & Labels */
        [data-theme="light"] p,
        [data-theme="light"] label,
        [data-theme="light"] li,
        [data-theme="light"] span:not(.badge):not(.case-badge):not(.toast-action-btn):not(#userEmail):not(.status-badge),
        [data-theme="light"] .intro-text,
        [data-theme="light"] .dev-bio,
        [data-theme="light"] .legacy-content p,
        [data-theme="light"] .date-selector label,
        [data-theme="light"] .search-container label,
        [data-theme="light"] footer label {
            color: #1e293b !important;
            font-weight: 600 !important;
        }

        /* Inputs & Form Controls */
        [data-theme="light"] input:not([type="color"]),
        [data-theme="light"] select,
        [data-theme="light"] textarea,
        [data-theme="light"] .client-search {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 1.5px solid #94a3b8 !important;
            font-weight: 600 !important;
        }
        [data-theme="light"] input::placeholder,
        [data-theme="light"] select::placeholder,
        [data-theme="light"] textarea::placeholder,
        [data-theme="light"] .client-search::placeholder {
            color: #64748b !important;
            opacity: 1 !important;
        }
        [data-theme="light"] input:focus,
        [data-theme="light"] select:focus,
        [data-theme="light"] textarea:focus,
        [data-theme="light"] .client-search:focus {
            background: #ffffff !important;
            border-color: #4f46e5 !important;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2) !important;
        }

        /* Tables & Data Cells */
        [data-theme="light"] th {
            background: #e2e8f0 !important;
            color: #0f172a !important;
            border-bottom: 2px solid #cbd5e1 !important;
            font-weight: 700 !important;
        }
        [data-theme="light"] td {
            color: #0f172a !important;
            border-bottom: 1px solid #e2e8f0 !important;
            font-weight: 500 !important;
        }
        [data-theme="light"] td strong {
            color: #0f172a !important;
        }
        [data-theme="light"] td small {
            color: #475569 !important;
            font-weight: 600 !important;
        }
        [data-theme="light"] td a {
            color: #4338ca !important;
            font-weight: 600 !important;
        }
        [data-theme="light"] tbody tr:hover {
            background: #f1f5f9 !important;
        }

        /* Navigation Links & Badges */
        [data-theme="light"] .header-link {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 1.5px solid #cbd5e1 !important;
            font-weight: 600 !important;
        }
        [data-theme="light"] .header-link:hover {
            background: #f8fafc !important;
            border-color: #4f46e5 !important;
            color: #4f46e5 !important;
        }
        [data-theme="light"] #userEmail {
            background: #eef2ff !important;
            color: #3730a3 !important;
            border: 1.5px solid #c7d2fe !important;
            font-weight: 700 !important;
        }
        [data-theme="light"] .action-btn {
            background: #ffffff !important;
            border: 1.5px solid #cbd5e1 !important;
            color: #0f172a !important;
        }

        /* Modals & Popups */
        [data-theme="light"] .modal-content,
        [data-theme="light"] .glass-confirm-box {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: 0 30px 60px -15px rgba(15, 23, 42, 0.25) !important;
            color: #0f172a !important;
        }

        /* Toggle Button in Light Mode */
        [data-theme="light"] #themeToggle {
            background: rgba(255, 255, 255, 0.94) !important;
            border: 1.5px solid #cbd5e1 !important;
            box-shadow: 0 8px 24px rgba(100, 116, 139, 0.25) !important;
            color: #0f172a !important;
        }
        [data-theme="light"] #themeToggle:hover {
            background: #ffffff !important;
            border-color: #94a3b8 !important;
        }

        /* Footer in Light Mode */
        [data-theme="light"] .global-footer,
        [data-theme="light"] .global-footer p {
            color: #475569 !important;
            font-weight: 500 !important;
        }
        [data-theme="light"] .global-footer a {
            color: #1e293b !important;
            font-weight: 600 !important;
        }
        [data-theme="light"] .global-footer a:hover {
            color: #4f46e5 !important;
        }

        /* ================= LIQUID GLASS TOAST NOTIFICATION STYLING ================= */
        #glassToastContainer {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 90%;
            max-width: 420px;
            pointer-events: none;
        }
        .glass-toast-item {
            position: relative;
            background: rgba(18, 24, 38, 0.88);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-top: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 16px;
            padding: 14px 18px;
            color: #ffffff;
            font-size: 0.92rem;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.65);
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
            transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            overflow: hidden;
        }
        [data-theme="light"] .glass-toast-item {
            background: rgba(255, 255, 255, 0.96) !important;
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            box-shadow: 0 16px 36px -6px rgba(100, 116, 139, 0.25) !important;
        }
        .toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
            line-height: 1.4;
            font-weight: 500;
        }
        .toast-action-btn {
            background: rgba(99, 102, 241, 0.25);
            border: 1px solid rgba(99, 102, 241, 0.5);
            color: #a5b4fc;
            padding: 5px 12px;
            border-radius: 8px;
            font-family: 'Outfit', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
        }
        .toast-action-btn:hover {
            background: #6366f1;
            color: #ffffff;
            transform: scale(1.05);
        }
        .toast-progress-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 100%;
            background: linear-gradient(90deg, #6366f1, #3b82f6);
            transform-origin: left;
        }

        /* ================= LIQUID GLASS CONFIRMATION MODAL ================= */
        #glassConfirmOverlay {
            position: fixed;
            inset: 0;
            z-index: 1000001;
            background: rgba(6, 8, 14, 0.75);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
            padding: 20px;
            box-sizing: border-box;
        }
        #glassConfirmOverlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .glass-confirm-box {
            background: rgba(18, 24, 38, 0.92);
            backdrop-filter: blur(32px) saturate(200%);
            -webkit-backdrop-filter: blur(32px) saturate(200%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 22px;
            padding: 28px 24px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8);
            transform: scale(0.92);
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            box-sizing: border-box;
        }
        #glassConfirmOverlay.active .glass-confirm-box {
            transform: scale(1);
        }
        .glass-confirm-icon {
            font-size: 2.4rem;
            margin-bottom: 12px;
            display: inline-block;
        }
        .glass-confirm-title {
            margin: 0 0 8px 0;
            font-family: 'Outfit', sans-serif;
            font-size: 1.35rem;
            font-weight: 700;
            color: #ffffff;
        }
        .glass-confirm-msg {
            color: #94a3b8;
            font-size: 0.92rem;
            line-height: 1.55;
            margin: 0 0 24px 0;
        }
        .glass-confirm-actions {
            display: flex;
            gap: 12px;
        }
        .glass-btn-cancel, .glass-btn-confirm {
            flex: 1;
            height: 44px;
            border-radius: 12px;
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            outline: none;
        }
        .glass-btn-cancel {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #cbd5e1;
        }
        [data-theme="light"] .glass-btn-cancel {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #1e293b;
        }
        .glass-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
        }
        .glass-btn-confirm {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border: none;
            color: #ffffff;
            box-shadow: 0 6px 18px rgba(239, 68, 68, 0.4);
        }
        .glass-btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 22px rgba(239, 68, 68, 0.6);
        }
    `;
    document.head.appendChild(styleEl);
})();

// GLOBAL TOAST NOTIFICATION API
window.showGlassToast = function (message, type = 'info', actionText = null, onAction = null, duration = 4000) {
    let container = document.getElementById('glassToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'glassToastContainer';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass-toast-item';

    let icon = 'ℹ️';
    let barColor = 'linear-gradient(90deg, #6366f1, #3b82f6)';
    if (type === 'error') {
        icon = '⚠️';
        barColor = 'linear-gradient(90deg, #ef4444, #f87171)';
    } else if (type === 'success') {
        icon = '✅';
        barColor = 'linear-gradient(90deg, #10b981, #34d399)';
    } else if (type === 'warning') {
        icon = '🔔';
        barColor = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    }

    let actionBtnHtml = '';
    if (actionText && typeof onAction === 'function') {
        actionBtnHtml = `<button class="toast-action-btn">${actionText}</button>`;
    }

    toast.innerHTML = `
        <div class="toast-content">
            <span style="font-size: 1.25rem;">${icon}</span>
            <span>${message}</span>
        </div>
        ${actionBtnHtml}
        <div class="toast-progress-bar" style="background: ${barColor};"></div>
    `;

    container.appendChild(toast);

    if (actionBtnHtml) {
        const btn = toast.querySelector('.toast-action-btn');
        btn.onclick = (e) => {
            e.stopPropagation();
            onAction();
            dismissToast();
        };
    }

    const progressBar = toast.querySelector('.toast-progress-bar');
    progressBar.style.transition = `transform ${duration}ms linear`;

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0) scale(1)';
        progressBar.style.transform = 'scaleX(0)';
    });

    let autoDismissTimer = setTimeout(dismissToast, duration);

    function dismissToast() {
        clearTimeout(autoDismissTimer);
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px) scale(0.95)';
        setTimeout(() => toast.remove(), 350);
    }
};

// GLOBAL NATIVE ALERT OVERRIDE
window.alert = function (message) {
    const text = String(message || '');
    let type = 'info';
    if (text.includes('❌') || text.includes('Error') || text.includes('Denied') || text.includes('Failed')) {
        type = 'error';
    } else if (text.includes('✅') || text.includes('Success') || text.includes('Granted') || text.includes('active')) {
        type = 'success';
    } else if (text.includes('🔔') || text.includes('Notice') || text.includes('Alert')) {
        type = 'warning';
    }
    window.showGlassToast(text, type);
};

// GLOBAL CONFIRMATION MODAL API
window.glassConfirm = function (title, message, confirmBtnText = 'Confirm', isDanger = true) {
    return new Promise((resolve) => {
        let overlay = document.getElementById('glassConfirmOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'glassConfirmOverlay';
            document.body.appendChild(overlay);
        }

        const icon = isDanger ? '⚠️' : '❓';
        const confirmBtnBg = isDanger 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';

        overlay.innerHTML = `
            <div class="glass-confirm-box">
                <div class="glass-confirm-icon">${icon}</div>
                <h3 class="glass-confirm-title">${title}</h3>
                <p class="glass-confirm-msg">${message}</p>
                <div class="glass-confirm-actions">
                    <button class="glass-btn-cancel" id="glassConfirmCancel">Cancel</button>
                    <button class="glass-btn-confirm" id="glassConfirmOk" style="background: ${confirmBtnBg};">${confirmBtnText}</button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => overlay.classList.add('active'));

        function close(result) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 250);
        }

        document.getElementById('glassConfirmCancel').onclick = () => close(false);
        document.getElementById('glassConfirmOk').onclick = () => close(true);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // Setup Floating Theme Toggle Button
    function setupFloatingThemeBtn() {
        let btn = document.getElementById('themeToggle');
        
        // Remove any old buttons sitting inside header or auth container
        if (btn && btn.parentElement !== document.body) {
            btn.remove();
            btn = null;
        }

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'themeToggle';
            btn.type = 'button';
            document.body.appendChild(btn);
        }

        const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        btn.innerHTML = activeTheme === 'dark' ? '☀️' : '🌙';
        btn.title = activeTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';

        btn.onclick = (e) => {
            e.preventDefault();
            const current = document.documentElement.getAttribute('data-theme');
            const target = current === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', target);
            localStorage.setItem('theme', target);
            btn.innerHTML = target === 'dark' ? '☀️' : '🌙';
            btn.title = target === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        };
    }

    setupFloatingThemeBtn();
});