// ============================================================
// لوحة إدارة المتجر — نسخة موحدة مكتفية ذاتياً
// ============================================================

/* ================= الإعدادات ================= */
const CONFIG = {
    GH_OWNER: 'helpterooai-ops',
    GH_REPO: 'dar-store',
    GH_BRANCH: 'main',
    CONTENT_PATH: 'data/content.json',
    ADMIN_PASSWORD: 'aldar2025',
    KEYS: {
        TG_TOKEN: 'aldar_tg_token',
        TG_CHANNEL: 'aldar_tg_channel',
        GH_TOKEN: 'aldar_gh_token',
        SESSION: 'aldar_admin_session',
        BIO: 'aldar_admin_bio',
    },
};

/* ================= الثيم ================= */
const Theme = {
    init() {
        this.apply(localStorage.getItem('aldar_theme') || 'dark');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme') || 'dark';
            this.apply(cur === 'dark' ? 'light' : 'dark');
        });
    },
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('aldar_theme', theme);
        const icon = document.querySelector('#theme-toggle .ms');
        if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    },
};

/* ================= تيليجرام ================= */
const Telegram = {
    token() { return localStorage.getItem(CONFIG.KEYS.TG_TOKEN) || ''; },
    channel() { return localStorage.getItem(CONFIG.KEYS.TG_CHANNEL) || '-1004394473630'; },
    async api(method, payload) {
        const token = this.token();
        if (!token) throw new Error('أدخل توكن البوت أولاً من تبويب «الاتصالات»');
        const res = await fetch(`https://api.telegram.org/bot${token}/${method}`,
            payload ? { method: 'POST', body: payload } : undefined);
        const json = await res.json();
        if (!json.ok) throw new Error(json.description || 'خطأ في الاتصال بتيليجرام');
        return json.result;
    },
    async test() { const me = await this.api('getMe'); return me.username || me.first_name; },
    async uploadPhoto(file, caption) {
        const fd = new FormData();
        fd.append('chat_id', this.channel());
        fd.append('photo', file);
        if (caption) fd.append('caption', caption);
        const msg = await this.api('sendPhoto', fd);
        const sizes = msg.photo || [];
        if (!sizes.length) throw new Error('تعذر رفع الصورة');
        const best = sizes[sizes.length - 1];
        const fd2 = new FormData();
        fd2.append('file_id', best.file_id);
        const info = await this.api('getFile', fd2);
        return { url: `https://api.telegram.org/file/bot${this.token()}/${info.file_path}`, fileId: best.file_id };
    },
};

/* ================= GitHub ================= */
const GitHub = {
    token() { return localStorage.getItem(CONFIG.KEYS.GH_TOKEN) || ''; },
    headers() { return { Authorization: `Bearer ${this.token()}`, Accept: 'application/vnd.github+json' }; },
    async publish(json) {
        if (!this.token()) throw new Error('أدخل توكن GitHub من تبويب «الاتصالات» أولاً');
        const url = `https://api.github.com/repos/${CONFIG.GH_OWNER}/${CONFIG.GH_REPO}/contents/${CONFIG.CONTENT_PATH}`;
        const curRes = await fetch(url, { headers: this.headers() });
        const cur = curRes.ok ? await curRes.json() : null;
        const body = {
            message: 'تحديث محتوى المتجر من لوحة الإدارة',
            content: btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2)))),
            branch: CONFIG.GH_BRANCH,
        };
        if (cur && cur.sha) body.sha = cur.sha;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { ...this.headers(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'فشل النشر على GitHub');
        }
        return true;
    },
};

/* ================= أدوات ================= */
const $ = (id) => document.getElementById(id);
const toast = (msg, type = '') => {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `admin-toast ${type}`;
    t.classList.remove('hidden');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.add('hidden'), 3500);
};

let DATA = null;
let APP = null;

/* ================= الدخول والبصمة ================= */
async function enterDashboard() {
    sessionStorage.setItem(CONFIG.KEYS.SESSION, '1');
    $('login-view').classList.add('hidden');
    $('dash-view').classList.remove('hidden');
    await loadAndBind();
}

async function registerBio() {
    try {
        if (!window.PublicKeyCredential) return;
        const cred = await navigator.credentials.create({ publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'الدار نت', id: location.hostname },
            user: { id: new TextEncoder().encode('admin'), name: 'admin', displayName: 'مدير المتجر' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 60000,
        }});
        if (cred) {
            const b64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
            localStorage.setItem(CONFIG.KEYS.BIO, b64);
        }
    } catch (e) { /* البصمة اختيارية */ }
}

async function loginWithBio() {
    const b64 = localStorage.getItem(CONFIG.KEYS.BIO);
    if (!b64) return;
    try {
        await navigator.credentials.get({ publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer }],
            userVerification: 'required',
            timeout: 60000,
        }});
        await enterDashboard();
    } catch (e) { toast('لم تُقبل البصمة', 'err'); }
}

function initAuth() {
    if (sessionStorage.getItem(CONFIG.KEYS.SESSION)) { enterDashboard(); return; }
    if (localStorage.getItem(CONFIG.KEYS.BIO)) $('btn-bio').classList.remove('hidden');

    $('btn-login').addEventListener('click', async () => {
        if ($('admin-pass').value === CONFIG.ADMIN_PASSWORD) {
            if (!localStorage.getItem(CONFIG.KEYS.BIO)) registerBio();
            await enterDashboard();
        } else {
            $('login-error').classList.remove('hidden');
            toast('كلمة المرور غير صحيحة', 'err');
        }
    });
    $('admin-pass').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });
    $('btn-bio').addEventListener('click', loginWithBio);
    $('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem(CONFIG.KEYS.SESSION);
        location.reload();
    });
}

/* ================= تحميل البيانات ================= */
async function loadAndBind() {
    try {
        const res = await fetch(`../${CONFIG.CONTENT_PATH}?v=${Date.now()}`, { cache: 'no-store' });
        DATA = await res.json();
        APP = (DATA.apps || [])[0];
        if (!APP) throw new Error('لا يوجد تطبيق في content.json');
        bindAll();
    } catch (err) {
        toast('فشل تحميل البيانات: ' + err.message, 'err');
    }
}

function bindAll() {
    $('f-name').value = APP.name || '';
    $('f-version').value = APP.version || '';
    $('f-date').value = APP.releaseDate || '';
    $('f-apk').value = APP.apkUrl || '';
    $('f-short').value = APP.shortDescription || '';
    $('f-long').value = APP.longDescription || '';
    if (APP.iconUrl) $('prev-icon').src = APP.iconUrl;
    if (APP.bannerUrl) $('prev-banner').src = APP.bannerUrl;

    $('an-enabled').checked = !!(APP.announcement && APP.announcement.enabled);
    $('an-text').value = (APP.announcement && APP.announcement.text) || '';

    $('p-about').value = APP.about || '';
    $('p-brand').value = APP.aboutBrand || '';
    $('p-privacy').value = APP.privacy || '';
    $('p-terms').value = APP.terms || '';

    $('c-phone').value = (APP.contact && APP.contact.phone) || '';
    $('c-whatsapp').value = (APP.contact && APP.contact.whatsapp) || '';
    $('c-email').value = (APP.contact && APP.contact.email) || '';
    $('c-telegram').value = (APP.contact && APP.contact.telegram) || '';

    renderShots();
    renderVersions();
    renderFeatures();
    renderSections();

    $('tg-token').value = localStorage.getItem(CONFIG.KEYS.TG_TOKEN) || '';
    $('tg-channel').value = localStorage.getItem(CONFIG.KEYS.TG_CHANNEL) || '-1004394473630';
    $('gh-token').value = localStorage.getItem(CONFIG.KEYS.GH_TOKEN) || '';
}

/* ================= ربط الحقول ================= */
function bindInputs() {
    const map = [
        ['f-name', v => APP.name = v],
        ['f-version', v => APP.version = v],
        ['f-date', v => APP.releaseDate = v],
        ['f-apk', v => APP.apkUrl = v],
        ['f-short', v => APP.shortDescription = v],
        ['f-long', v => APP.longDescription = v],
        ['an-text', v => { APP.announcement = APP.announcement || {}; APP.announcement.text = v; }],
        ['p-about', v => APP.about = v],
        ['p-brand', v => APP.aboutBrand = v],
        ['p-privacy', v => APP.privacy = v],
        ['p-terms', v => APP.terms = v],
        ['c-phone', v => { APP.contact = APP.contact || {}; APP.contact.phone = v; }],
        ['c-whatsapp', v => { APP.contact = APP.contact || {}; APP.contact.whatsapp = v; }],
        ['c-email', v => { APP.contact = APP.contact || {}; APP.contact.email = v; }],
        ['c-telegram', v => { APP.contact = APP.contact || {}; APP.contact.telegram = v; }],
    ];
    map.forEach(([id, fn]) => {
        const el = $(id);
        if (el) el.addEventListener('input', e => { if (APP) fn(e.target.value); });
    });
    const an = $('an-enabled');
    if (an) an.addEventListener('change', e => {
        if (!APP) return;
        APP.announcement = APP.announcement || {};
        APP.announcement.enabled = e.target.checked;
    });
}

/* ================= اللقطات ================= */
function renderShots() {
    const shots = APP.screenshots || [];
    $('shots-list').innerHTML = shots.map((s, i) => `
        <div class="media-item">
            <img src="${s.url}" alt="لقطة ${i + 1}" loading="lazy">
            <div class="mi-actions">
                <button class="mi-btn" data-act="up" data-i="${i}"><span class="ms">arrow_upward</span></button>
                <button class="mi-btn" data-act="down" data-i="${i}"><span class="ms">arrow_downward</span></button>
                <button class="mi-btn" data-act="del" data-i="${i}"><span class="ms">delete</span></button>
            </div>
        </div>
    `).join('') || '<p class="hint">لا توجد لقطات بعد — أضف أول لقطة بالزر بالأسفل.</p>';
}

function initShots() {
    $('shots-list').addEventListener('click', e => {
        const btn = e.target.closest('.mi-btn');
        if (!btn || !APP) return;
        const i = +btn.dataset.i;
        const shots = APP.screenshots;
        if (btn.dataset.act === 'del') {
            if (confirm('حذف هذه اللقطة؟')) { shots.splice(i, 1); renderShots(); toast('تم الحذف — اضغط حفظ ونشر'); }
        } else if (btn.dataset.act === 'up' && i > 0) {
            [shots[i - 1], shots[i]] = [shots[i], shots[i - 1]]; renderShots();
        } else if (btn.dataset.act === 'down' && i < shots.length - 1) {
            [shots[i + 1], shots[i]] = [shots[i], shots[i + 1]]; renderShots();
        }
    });
}

/* ================= الإصدارات ================= */
function renderVersions() {
    $('versions-list').innerHTML = (APP.versions || []).map((v, i) => `
        <div class="row-item glass-card">
            <div>
                <div class="ri-title">الإصدار ${v.version}</div>
                <div class="ri-sub">${v.date || ''} — ${v.notes || ''}</div>
            </div>
            <div class="row-actions">
                <button class="mi-btn" data-act="latest" data-i="${i}"><span class="ms">publish</span></button>
                <button class="mi-btn" data-act="del" data-i="${i}"><span class="ms">delete</span></button>
            </div>
        </div>
    `).join('') || '<p class="hint">لا توجد إصدارات.</p>';
}

function initVersions() {
    $('btn-add-version').addEventListener('click', () => {
        if (!APP) return;
        const version = $('v-version').value.trim();
        const date = $('v-date').value;
        const notes = $('v-notes').value.trim();
        if (!version) { toast('أدخل رقم الإصدار', 'err'); return; }
        APP.versions = APP.versions || [];
        APP.versions.unshift({ version, date, notes, apkUrl: '' });
        APP.version = version;
        if (date) APP.releaseDate = date;
        if (notes) APP.whatsNew = notes;
        $('v-version').value = ''; $('v-notes').value = '';
        renderVersions(); bindAll();
        toast('أُضيف الإصدار وعُيّن كأحدث — احفظ ونشر', 'ok');
    });

    $('versions-list').addEventListener('click', e => {
        const btn = e.target.closest('.mi-btn');
        if (!btn || !APP) return;
        const i = +btn.dataset.i;
        if (btn.dataset.act === 'del') {
            if (confirm('حذف هذا الإصدار؟')) { APP.versions.splice(i, 1); renderVersions(); }
        } else if (btn.dataset.act === 'latest') {
            const v = APP.versions[i];
            APP.version = v.version;
            if (v.date) APP.releaseDate = v.date;
            if (v.notes) APP.whatsNew = v.notes;
            bindAll();
            toast('عُيّن كأحدث إصدار — احفظ ونشر', 'ok');
        }
    });
}

/* ================= المميزات ================= */
function renderFeatures() {
    $('features-list').innerHTML = (APP.features || []).map((f, i) => `
        <div class="row-item glass-card">
            <div>
                <div class="ri-title">${f.title}</div>
                <div class="ri-sub">${f.text || ''}</div>
            </div>
            <div class="row-actions">
                <button class="mi-btn" data-act="up" data-i="${i}"><span class="ms">arrow_upward</span></button>
                <button class="mi-btn" data-act="down" data-i="${i}"><span class="ms">arrow_downward</span></button>
                <button class="mi-btn" data-act="del" data-i="${i}"><span class="ms">delete</span></button>
            </div>
        </div>
    `).join('') || '<p class="hint">لا توجد مميزات.</p>';
}

function initFeatures() {
    $('btn-add-feature').addEventListener('click', () => {
        if (!APP) return;
        const title = $('ft-title').value.trim();
        const text = $('ft-text').value.trim();
        const icon = $('ft-icon').value.trim() || 'star';
        if (!title) { toast('أدخل عنوان الميزة', 'err'); return; }
        APP.features = APP.features || [];
        APP.features.push({ icon, title, text });
        $('ft-title').value = ''; $('ft-text').value = ''; $('ft-icon').value = '';
        renderFeatures();
        toast('أُضيفت الميزة — احفظ ونشر', 'ok');
    });

    $('features-list').addEventListener('click', e => {
        const btn = e.target.closest('.mi-btn');
        if (!btn || !APP) return;
        const i = +btn.dataset.i;
        const arr = APP.features;
        if (btn.dataset.act === 'del') { if (confirm('حذف الميزة؟')) { arr.splice(i, 1); renderFeatures(); } }
        else if (btn.dataset.act === 'up' && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; renderFeatures(); }
        else if (btn.dataset.act === 'down' && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; renderFeatures(); }
    });
}

/* ================= الأقسام ================= */
const SECTION_LABELS = {
    screenshots: 'لقطات الشاشة',
    features: 'المميزات',
    whatsnew: 'ماذا الجديد',
    versions: 'سجل الإصدارات',
    about: 'عن التطبيق',
    brand: 'عن أثير',
    contact: 'تواصل معنا',
};

function renderSections() {
    APP.sections = APP.sections || {};
    $('sections-box').innerHTML = Object.keys(SECTION_LABELS).map(key => `
        <label class="switch-item glass-card">
            <input type="checkbox" data-section="${key}" ${APP.sections[key] !== false ? 'checked' : ''}>
            <span>${SECTION_LABELS[key]}</span>
        </label>
    `).join('');
}

function initSections() {
    $('sections-box').addEventListener('change', e => {
        const key = e.target.dataset.section;
        if (key && APP) APP.sections[key] = e.target.checked;
    });
}

/* ================= رفع الصور ================= */
function initUploads() {
    document.querySelectorAll('[data-pick]').forEach(btn => {
        btn.addEventListener('click', () => { const t = $(btn.dataset.pick); if (t) t.click(); });
    });

    $('up-icon').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file || !APP) return;
        try {
            toast('جارٍ رفع الأيقونة إلى تيليجرام...');
            const r = await Telegram.uploadPhoto(file, 'أيقونة تطبيق الدار نت');
            APP.iconUrl = r.url;
            $('prev-icon').src = r.url;
            toast('تم رفع الأيقونة — احفظ ونشر', 'ok');
        } catch (err) { toast(err.message, 'err'); }
    });

    $('up-banner').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file || !APP) return;
        try {
            toast('جارٍ رفع البانر...');
            const r = await Telegram.uploadPhoto(file, 'بانر متجر الدار نت');
            APP.bannerUrl = r.url;
            $('prev-banner').src = r.url;
            toast('تم رفع البانر — احفظ ونشر', 'ok');
        } catch (err) { toast(err.message, 'err'); }
    });

    $('up-shot').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file || !APP) return;
        try {
            toast('جارٍ رفع اللقطة...');
            const r = await Telegram.uploadPhoto(file, 'لقطة من تطبيق الدار نت');
            APP.screenshots = APP.screenshots || [];
            APP.screenshots.push({ url: r.url });
            renderShots();
            toast('أُضيفت اللقطة — احفظ ونشر', 'ok');
        } catch (err) { toast(err.message, 'err'); }
    });
}

/* ================= الاتصالات ================= */
function initConnect() {
    $('btn-save-connect').addEventListener('click', () => {
        localStorage.setItem(CONFIG.KEYS.TG_TOKEN, $('tg-token').value.trim());
        localStorage.setItem(CONFIG.KEYS.TG_CHANNEL, $('tg-channel').value.trim());
        localStorage.setItem(CONFIG.KEYS.GH_TOKEN, $('gh-token').value.trim());
        toast('تم حفظ الاتصالات على جهازك', 'ok');
    });

    $('btn-test-tg').addEventListener('click', async () => {
        try {
            const name = await Telegram.test();
            toast('البوت متصل: @' + name, 'ok');
        } catch (err) { toast(err.message, 'err'); }
    });
}

/* ================= التبويبات ================= */
function initTabs() {
    $('admin-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab.dataset.tab));
    });
}

/* ================= الحفظ والنشر ================= */
function initSave() {
    $('btn-save').addEventListener('click', async () => {
        try {
            toast('جارٍ النشر على GitHub...');
            await GitHub.publish(DATA);
            toast('تم النشر — سيظهر التغيير في المتجر خلال دقيقة', 'ok');
        } catch (err) { toast(err.message, 'err'); }
    });

    $('btn-reload').addEventListener('click', async () => {
        toast('إعادة تحميل البيانات...');
        await loadAndBind();
    });
}

/* ================= التشغيل ================= */
Theme.init();
initAuth();
initTabs();
bindInputs();
initShots();
initVersions();
initFeatures();
initSections();
initUploads();
initConnect();
initSave();
