class Utils {
    static debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static formatFullDate(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString.replace(/-/g, '\/'));
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    static getProficiencyValue(level) {
        const normalizedLevel = String(level || '').trim().toLowerCase();
        const scores = { advanced: 3, intermediate: 2, beginner: 1 };
        return scores[normalizedLevel] || 0;
    }

    static parseMonthYearToTime(input) {
        const raw = String(input || '').trim();
        if (!raw || raw === '-') return 0;
        const normalized = raw.replace(/\s+/g, ' ').trim();
        const yearOnly = normalized.match(/^(\d{4})$/);
        if (yearOnly) return new Date(Number.parseInt(yearOnly[1], 10), 0, 1).getTime() || 0;

        const monthMap = {
            jan: 0, january: 0,
            feb: 1, february: 1,
            mar: 2, march: 2,
            apr: 3, april: 3,
            may: 4,
            jun: 5, june: 5,
            jul: 6, july: 6,
            aug: 7, august: 7,
            sep: 8, sept: 8, september: 8,
            oct: 9, october: 9,
            nov: 10, november: 10,
            dec: 11, december: 11
        };

        const parts = normalized.toLowerCase().split(' ');
        if (parts.length >= 2) {
            const m = monthMap[parts[0]];
            const y = Number.parseInt(parts[1], 10);
            if (Number.isFinite(m) && Number.isFinite(y) && y >= 1970) return new Date(y, m, 1).getTime() || 0;
        }

        const fallback = Date.parse(normalized);
        return Number.isFinite(fallback) ? fallback : 0;
    }

    static parseMonthRangeYearEndMs(input) {
        const str = String(input || '');
        const match = str.match(/\b([A-Za-z]{3,9})\s*-\s*([A-Za-z]{3,9})\s+(\d{4})\b/);
        if (!match) return 0;
        const y = Number.parseInt(match[3], 10);
        const endTok = String(match[2] || '').toLowerCase().replace(/\./g, '').trim();
        const head = endTok.slice(0, 3);
        const monthEnd = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }[head];
        if (!Number.isFinite(y) || y < 1970 || y > 2100 || monthEnd === undefined) return 0;
        const lastDay = new Date(y, monthEnd + 1, 0, 23, 59, 59, 999).getTime();
        return Number.isFinite(lastDay) ? lastDay : 0;
    }

    static parseAcademicTermEndMs(input) {
        const s = String(input || '');
        const m = s.match(/\b(fall|autumn|spring|summer|winter)\s+(\d{4})\b/i);
        if (!m) return 0;
        const term = m[1].toLowerCase();
        const y = Number.parseInt(m[2], 10);
        if (!Number.isFinite(y) || y < 1970 || y > 2100) return 0;
        if (term === 'fall' || term === 'autumn') return new Date(y, 11, 31, 23, 59, 59, 999).getTime();
        if (term === 'spring') return new Date(y, 4, 31, 23, 59, 59, 999).getTime();
        if (term === 'summer') return new Date(y, 7, 31, 23, 59, 59, 999).getTime();
        if (term === 'winter') return new Date(y, 0, 31, 23, 59, 59, 999).getTime();
        return 0;
    }

    static parseFlexibleDateStringMs(raw) {
        if (raw == null || raw === '') return 0;
        const s = String(raw).trim();
        if (!s) return 0;
        const my = Utils.parseMonthYearToTime(s);
        if (my) return my;
        const termEnd = Utils.parseAcademicTermEndMs(s);
        if (termEnd) return termEnd;
        const rangeEnd = Utils.parseMonthRangeYearEndMs(s);
        if (rangeEnd) return rangeEnd;
        const t = new Date(s.replace(/-/g, '/')).getTime();
        return Number.isFinite(t) ? t : 0;
    }

    static parseAchievementRecencyMs(name, date) {
        let t = Utils.parseFlexibleDateStringMs(date);
        if (!t && name) t = Utils.parseFlexibleDateStringMs(name);
        return t;
    }

    static extractYouTubeID(input) {
        if (!input) return '';
        
        if (!/[:/\.]/.test(input)) return input.trim();
        
        const patterns = [
            /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match && match[1]) return match[1];
        }
        
        return input.trim();
    }

    static lucideTrophySvg(options = {}) {
        const size = Number(options.size) || 18;
        const cls = String(options.className || 'lucide lucide-trophy').replace(/"/g, '');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
    }

    static lucideChevronRightSvg(options = {}) {
        const size = Number(options.size) || 16;
        const cls = String(options.className || 'lucide lucide-chevron-right').replace(/"/g, '');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="m9 18 6-6-6-6"/></svg>`;
    }

    static getScrollbarWidth() {
        const html = document.documentElement;
        if (!html) return 0;
        return Math.max(0, window.innerWidth - html.clientWidth);
    }

    static getScrollLockOffsetTargets() {
        const targets = [];
        document.querySelectorAll('[data-scroll-lock-offset]').forEach(el => {
            if (!targets.includes(el)) targets.push(el);
        });
        return targets;
    }

    static applyScrollLockCompensation() {
        const body = document.body;
        const html = document.documentElement;
        if (!body || !html) return;
        const width = `${Utils.getScrollbarWidth()}px`;
        html.style.setProperty('--scrollbar-width', width);
        Utils.getScrollLockOffsetTargets().forEach(el => {
            el.style.setProperty('padding-right', width, 'important');
        });
    }

    static clearScrollLockCompensation() {
        const body = document.body;
        const html = document.documentElement;
        if (!body || !html) return;
        Utils.getScrollLockOffsetTargets().forEach(el => {
            el.style.removeProperty('padding-right');
        });
        html.style.removeProperty('--scrollbar-width');
    }

    static freezeHeaderForScrollLock() {
        const header = document.querySelector('body > header');
        if (!header || header.dataset.scrollLockFrozen === '1') return;
        const rect = header.getBoundingClientRect();
        const computed = window.getComputedStyle(header);
        const marginBottom = Number.parseFloat(computed.marginBottom || '0') || 0;
        const spacer = document.createElement('div');
        spacer.setAttribute('data-scroll-lock-header-spacer', '1');
        spacer.style.height = `${Math.ceil(header.offsetHeight + marginBottom)}px`;
        spacer.style.width = '100%';
        spacer.style.pointerEvents = 'none';
        header.parentNode?.insertBefore(spacer, header);

        header.dataset.scrollLockFrozen = '1';
        header.style.setProperty('position', 'fixed', 'important');
        header.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
        header.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
        header.style.setProperty('width', `${Math.round(rect.width)}px`, 'important');
        header.style.setProperty('margin', '0', 'important');
        header.style.setProperty('z-index', '1100', 'important');
    }

    static unfreezeHeaderForScrollLock() {
        const header = document.querySelector('body > header');
        if (!header || header.dataset.scrollLockFrozen !== '1') return;
        delete header.dataset.scrollLockFrozen;
        header.style.removeProperty('position');
        header.style.removeProperty('top');
        header.style.removeProperty('left');
        header.style.removeProperty('width');
        header.style.removeProperty('margin');
        header.style.removeProperty('z-index');

        const spacer = document.querySelector('[data-scroll-lock-header-spacer="1"]');
        if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
    }

    static syncPageScrollLock(locked) {
        const body = document.body;
        const html = document.documentElement;
        if (!body || !html) return;

        if (locked) {
            Utils.freezeHeaderForScrollLock();
            Utils.applyScrollLockCompensation();
            body.style.setProperty('overflow', 'hidden', 'important');
            html.style.setProperty('overflow', 'hidden', 'important');
            body.classList.add('scroll-lock');
            html.classList.add('scroll-lock');
            return;
        }

        const modals = [
            { id: 'global-search-modal', check: (el) => el.classList.contains('active') },
            { id: 'infoModal', check: (el) => el.style.display === 'flex' },
            { id: 'secondaryModal', check: (el) => el.style.display === 'flex' },
            { id: 'external-link-modal', check: (el) => el.classList.contains('active') || el.style.display === 'flex' }
        ];

        const anyModalOpen = modals.some(m => {
            const el = document.getElementById(m.id);
            return el && m.check(el);
        });
        const anyDropdownOpen = !!document.querySelector('.custom-select-container.open, .multi-select-container.open, .column-filter-menu.open');

        if (anyModalOpen || anyDropdownOpen) {
            Utils.freezeHeaderForScrollLock();
            Utils.applyScrollLockCompensation();
            return;
        }

        Utils.unfreezeHeaderForScrollLock();
        body.style.removeProperty('overflow');
        html.style.removeProperty('overflow');
        Utils.clearScrollLockCompensation();
        body.classList.remove('scroll-lock');
        html.classList.remove('scroll-lock');
    }

    static initOverlayScrollbar() {
        const html = document.documentElement;
        const body = document.body;
        if (!html || !body) return;

        const track = document.createElement('div');
        track.className = 'page-overlay-scrollbar';
        track.setAttribute('aria-hidden', 'true');

        const thumb = document.createElement('div');
        thumb.className = 'page-overlay-scrollbar__thumb';
        track.appendChild(thumb);
        body.appendChild(track);

        let rafPending = false;
        let dragging = false;
        let dragStartY = 0;
        let dragStartScroll = 0;

        const getScrollTop = () => window.scrollY || html.scrollTop || body.scrollTop || 0;

        const setScrollTop = (value) => {
            window.scrollTo(0, value);
        };

        const getMetrics = () => {
            const scrollHeight = Math.max(html.scrollHeight, body.scrollHeight);
            const clientHeight = html.clientHeight;
            const scrollTop = getScrollTop();
            const maxScroll = Math.max(0, scrollHeight - clientHeight);
            const thumbHeight = maxScroll > 0
                ? Math.max(40, (clientHeight / scrollHeight) * clientHeight)
                : 0;
            const maxThumbTop = Math.max(0, clientHeight - thumbHeight);
            const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
            return { scrollHeight, clientHeight, maxScroll, thumbHeight, thumbTop };
        };

        const update = () => {
            if (html.classList.contains('scroll-lock') || body.classList.contains('scroll-lock')) {
                track.classList.remove('is-visible');
                track.style.display = 'none';
                return;
            }

            const { scrollHeight, clientHeight, maxScroll, thumbHeight, thumbTop } = getMetrics();
            const isScrollable = maxScroll > 1;

            track.style.display = isScrollable ? 'block' : 'none';
            track.classList.toggle('is-visible', isScrollable);
            if (!isScrollable) return;

            thumb.style.height = `${thumbHeight}px`;
            thumb.style.transform = `translateY(${thumbTop}px)`;
        };

        const scheduleUpdate = () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                update();
            });
        };

        const stopDrag = () => {
            dragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        const onDrag = (event) => {
            if (!dragging) return;
            const { maxScroll, thumbHeight, clientHeight } = getMetrics();
            const maxThumbTop = Math.max(1, clientHeight - thumbHeight);
            const deltaY = event.clientY - dragStartY;
            const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
            setScrollTop(dragStartScroll + scrollDelta);
        };

        thumb.addEventListener('mousedown', (event) => {
            event.preventDefault();
            dragging = true;
            dragStartY = event.clientY;
            dragStartScroll = getScrollTop();
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        });

        track.addEventListener('mousedown', (event) => {
            if (event.target !== track) return;
            const { maxScroll, thumbHeight, clientHeight } = getMetrics();
            if (maxScroll <= 0) return;
            const maxThumbTop = Math.max(1, clientHeight - thumbHeight);
            const clickRatio = Math.min(1, Math.max(0, (event.clientY - thumbHeight / 2) / maxThumbTop));
            setScrollTop(clickRatio * maxScroll);
        });

        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        if (typeof ResizeObserver === 'function') {
            const resizeObserver = new ResizeObserver(scheduleUpdate);
            resizeObserver.observe(html);
            resizeObserver.observe(body);
            const pageRoot = document.getElementById('page-root');
            if (pageRoot) resizeObserver.observe(pageRoot);
        }

        const lockObserver = new MutationObserver(scheduleUpdate);
        lockObserver.observe(html, { attributes: true, attributeFilter: ['class'] });
        lockObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

        scheduleUpdate();
    }
}
