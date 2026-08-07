// ============================================================
// Renderer - رسم جميع أقسام المتجر
// ============================================================

export class Renderer {
    static setText(id, value) {
        const el = document.getElementById(id);
        if (el && value != null) el.textContent = value;
    }

    static formatDate(iso) {
        if (!iso) return '--';
        try {
            return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return iso; }
    }

    static renderStore(app, store) {
        // الإعدادات العامة
        if (store.title) document.title = `${app.name} | ${store.title}`;
        if (store.brand) this.setText('store-title', store.brand);
        this.setText('footer-note', store.footerNote || `© ${new Date().getFullYear()} ${store.brand || ''}`);

        // بيانات التطبيق
        this.setText('app-name', app.name);
        this.setText('app-short', app.shortDescription);
        this.setText('app-version', app.version);
        this.setText('app-date', this.formatDate(app.releaseDate));

        // زر التحميل
        const dl = document.getElementById('btn-download');
        if (dl && app.apkUrl) { dl.href = app.apkUrl; dl.setAttribute('download', ''); }

        // الأيقونة والبانر
        if (app.iconUrl) {
            const img = document.getElementById('app-icon');
            img.src = app.iconUrl; img.hidden = false;
            img.nextElementSibling && (img.nextElementSibling.style.display = 'none');
        }
        if (app.bannerUrl) {
            const img = document.getElementById('app-banner');
            img.src = app.bannerUrl; img.hidden = false;
        }

        // الإعلان
        if (app.announcement?.enabled && app.announcement.text) {
            this.setText('announcement-text', app.announcement.text);
            const bar = document.getElementById('announcement-bar'); if (bar) { bar.classList.remove('hidden'); bar.dataset.enabled = '1'; }
        }

        // What's New
        this.setText('whatsnew-body', app.whatsNew || '');
        this.toggleSection('whatsnew', app.sections?.whatsnew);

        // About
        this.setText('about-body', app.about || '');
        this.toggleSection('about', app.sections?.about);

        // Brand
        this.setText('brand-body', app.aboutBrand || '');
        this.toggleSection('brand', app.sections?.brand);

        // Privacy / Terms
        this.setText('privacy-body', app.privacy || '');
        this.setText('terms-body', app.terms || '');

        // Features
        this.renderFeatures(app.features || [], app.sections?.features);

        // Screenshots
        this.renderScreenshots(app.screenshots || [], app.sections?.screenshots);

        // Versions
        this.renderVersions(app.versions || [], app.sections?.versions);

        // Contact
        this.renderContact(app.contact || {}, app.sections?.contact);
    }

    static toggleSection(id, visible) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', visible === false);
    }

    static renderFeatures(features, visible) {
        this.toggleSection('features', visible);
        const grid = document.getElementById('features-grid');
        if (!grid) return;
        grid.innerHTML = features.map(f => `
            <div class="feature-card glass-card reveal">
                <div class="feature-icon"><span class="ms">${f.icon || 'star'}</span></div>
                <h3>${this.escape(f.title)}</h3>
                <p>${this.escape(f.text)}</p>
            </div>
        `).join('');
    }

    static renderScreenshots(shots, visible) {
        this.toggleSection('screenshots', visible);
        const track = document.getElementById('shots-track');
        if (!track) return;
        if (!shots.length) { track.parentElement?.classList.add('hidden'); return; }
        track.innerHTML = shots.map((s, i) => `
            <div class="shot-item" data-index="${i}">
                <img src="${this.escape(s.url)}" alt="لقطة ${i + 1}" loading="lazy">
            </div>
        `).join('');
    }

    static renderVersions(versions, visible) {
        this.toggleSection('versions', visible);
        const list = document.getElementById('versions-list');
        if (!list) return;
        if (!versions.length) { list.parentElement?.classList.add('hidden'); return; }
        list.innerHTML = versions.map(v => `
            <article class="version-card glass-card reveal">
                <div class="version-head">
                    <span class="version-tag">الإصدار ${this.escape(v.version)}</span>
                    <span class="version-date">${this.formatDate(v.date)}</span>
                </div>
                <p class="version-notes">${this.escape(v.notes)}</p>
            </article>
        `).join('');
    }

    static renderContact(c, visible) {
        this.toggleSection('contact', visible);
        const grid = document.getElementById('contact-grid');
        if (!grid) return;
        const items = [];
        if (c.phone) items.push({ icon: 'call', label: 'اتصال', value: c.phone, href: `tel:${c.phone}` });
        if (c.whatsapp) items.push({ icon: 'chat', label: 'واتساب', value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/\D/g, '')}` });
        if (c.email) items.push({ icon: 'mail', label: 'البريد', value: c.email, href: `mailto:${c.email}` });
        if (c.telegram) items.push({ icon: 'send', label: 'تيليجرام', value: c.telegram, href: `https://t.me/${c.telegram}` });
        grid.innerHTML = items.map(i => `
            <a href="${this.escape(i.href)}" target="_blank" rel="noopener" class="contact-item glass-card reveal">
                <div class="contact-icon"><span class="ms">${i.icon}</span></div>
                <div class="contact-info"><strong>${i.label}</strong><span>${this.escape(i.value)}</span></div>
            </a>
        `).join('');
    }

    static escape(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
}
