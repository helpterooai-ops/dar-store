// ============================================================
// CMS - قراءة محتوى المتجر من data/content.json
// ============================================================

const CONFIG = {
    DATA_URL: './data/content.json',
    DEFAULT_APP_ID: 'dar-net',
};

export class CMS {
    static _cache = null;

    static async load() {
        if (this._cache) return this._cache;
        try {
            const res = await fetch(`${CONFIG.DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this._cache = await res.json();
            return this._cache;
        } catch (err) {
            console.error('[CMS] فشل تحميل البيانات:', err);
            return null;
        }
    }

    static async getApp(id = CONFIG.DEFAULT_APP_ID) {
        const data = await this.load();
        if (!data) return null;
        const app = (data.apps || []).find(a => a.id === id) || data.apps?.[0];
        return app || null;
    }

    static async getStore() {
        const data = await this.load();
        return data?.store || {};
    }
}
