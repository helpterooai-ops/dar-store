// ============================================================
// Theme Manager - Dark/Light mode مع حفظ الاختيار
// ============================================================

export class ThemeManager {
    static KEY = 'aldar_theme';

    static init() {
        const saved = localStorage.getItem(this.KEY);
        const initial = saved || 'dark';
        this.apply(initial);

        const btn = document.getElementById('theme-toggle');
        if (btn) btn.addEventListener('click', () => this.toggle());
    }

    static toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
    }

    static apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.KEY, theme);
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const icon = btn.querySelector('.ms');
        if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}
