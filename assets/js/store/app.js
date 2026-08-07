// ============================================================
// الدار نت | المتجر الرسمي — app.js
// نقطة الدخول الرئيسية: يربط كل الوحدات معاً
// ============================================================

import { CMS } from './cms.js';
import { ThemeManager } from './theme.js';
import { Renderer } from './render.js';

// ===== Lightbox (عارض الصور بملء الشاشة) =====
class Lightbox {
    static el = document.getElementById('lightbox');
    static img = document.getElementById('lightbox-img');

    static init() {
        if (!this.el) return;
        document.getElementById('shots-track')?.addEventListener('click', (e) => {
            const item = e.target.closest('.shot-item');
            if (item) {
                const src = item.querySelector('img')?.src;
                if (src) this.open(src);
            }
        });
        this.el.querySelector('.lightbox-close')?.addEventListener('click', () => this.close());
        this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    }

    static open(src) {
        this.img.src = src;
        this.el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    static close() {
        this.el.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ===== Router (صفحات الخصوصية والشروط) =====
class Router {
    static init() {
        this.apply();
        window.addEventListener('hashchange', () => this.apply());
    }

    static apply() {
        const hash = location.hash.replace('#/', '');
        const isPrivacy = hash === 'privacy';
        const isTerms = hash === 'terms';
        const showPage = isPrivacy || isTerms;

        document.getElementById('page-privacy')?.classList.toggle('hidden', !isPrivacy);
        document.getElementById('page-terms')?.classList.toggle('hidden', !isTerms);

        const main = document.querySelector('main');
        const header = document.querySelector('.site-header');
        const announcement = document.getElementById('announcement-bar');
        const footer = document.querySelector('.site-footer');

        [main, header, footer].forEach(el => el?.classList.toggle('hidden', showPage));
        announcement?.classList.toggle('hidden', showPage || !announcement.dataset.enabled);

        if (showPage) window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

// ===== أنيميشن الظهور عند التمرير =====
class RevealObserver {
    static init() {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        setTimeout(() => {
            document.querySelectorAll('.reveal').forEach(el => io.observe(el));
        }, 100);
    }
}

// ===== التشغيل =====
async function boot() {
    ThemeManager.init();
    Lightbox.init();
    Router.init();

    const app = await CMS.getApp();
    const store = await CMS.getStore();

    if (app && store) {
        Renderer.renderStore(app, store);
        // إعادة تفعيل الراوتر بعد الرسم (في حال كان المستخدم في صفحة داخلية)
        Router.apply();
        // تشغيل أنيميشن الظهور بعد أن ترسم كل العناصر
        RevealObserver.init();
    } else {
        document.body.innerHTML = '<div style="padding:60px;text-align:center;color:#fff">فشل تحميل بيانات المتجر. تحقق من اتصالك.</div>';
    }
}

boot();
