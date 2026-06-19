window.handlePortraitImageLoad = async (img) => {
    const media = img && img.closest ? img.closest('.portrait-media') : null;
    if (!media || !img) return;

    try {
        if (typeof img.decode === 'function') {
            await img.decode();
        }
    } catch (_) {
    }

    if (img.complete) {
        media.classList.add('is-loaded');
    }
};

window.handlePortraitImageError = (img) => {
    const media = img && img.closest ? img.closest('.portrait-media') : null;
    if (!media) return;
    media.classList.add('is-loaded');
};

document.addEventListener('DOMContentLoaded', async () => {
    Utils.initOverlayScrollbar();

    let initialRouteHydrated = false;
    let portfolioGridResizeObserver = null;
    const routes = {
        '/': { fragment: 'html/pages/home.html', title: 'HOME' },
        '/bio': { fragment: 'html/pages/home.html', title: 'HOME' },
        '/activities': { fragment: 'html/pages/activities.html', title: 'ACTIVITIES' },
        '/achievements': { fragment: 'html/pages/achievements.html', title: 'ACHIEVEMENTS' },
        '/skills': { fragment: 'html/pages/skills.html', title: 'SKILLS' },
        '/videos': { fragment: 'html/pages/videos.html', title: 'VIDEOS' },
        '/games': { fragment: 'html/pages/games.html', title: 'GAMES' }
    };

    const state = {
        modal: null,
        closeBtn: null,
        videoFrame: null,
        mediaContainer: null,
        prevBtn: null,
        nextBtn: null,
        secModal: null,
        secCloseBtn: null,
        secPrevBtn: null,
        secNextBtn: null,
        externalLinkModal: null,
        externalLinkTitleEl: null,
        externalLinkCategoryEl: null,
        externalLinkInfoEl: null,
        externalLinkUrlEl: null,
        externalLinkResolve: null,
        skillsList: null,
        achievementsList: null,
        activitiesList: null,
        coursesTableBody: null,
        portfolioGrid: null,
        noResults: null,
        toolSelectContainer: null,
        typeSelectContainer: null,
        sortSelectContainer: null,
        orderSelectContainer: null,
        searchContainer: null,
        searchInput: null,
        coursesSearchInput: null,
        coursesFilterButton: null,
        coursesFilterMenu: null,
        skillsFilterButton: null,
        skillsFilterMenu: null,
        portfolioFilterGroup: null,
        portfolioFilterButton: null,
        portfolioFilterMenu: null,
        selectedCategories: ['all'],
        selectedTools: ['all'],
        selectedSort: null,
        selectedOrder: 'desc',
        selectedCourseSort: 'status',
        selectedCourseOrder: 'asc',
        searchQuery: '',
        courseSearchQuery: '',
        selectedCourseColumnValues: {},
        selectedSkillColumnValues: {},
        selectedPortfolioColumnValues: {},
        hiddenCourseColumns: {},
        hiddenSkillColumns: {},
        filteredCourses: [],
        currentItemCard: null,
        currentGalleryIndex: 0,
        currentToolsContext: [],
        currentToolIndex: -1,
        achievementVideos: [],
        currentAchievementVideoIndex: -1,
        showModalNavArrows: false,
        allData: null,
        dataPromise: null,
        filmFestivalAwards: {},

        openModalForItem: null,
        filterCards: null,
        filterSkills: null,
        sortCards: null,
        sortSkills: null,
        updateTypeFilter: null,
        updateToolFilter: null,
        runFiltering: null,
        syncSkillSortIndicators: null,
        syncCourseSortIndicators: null,

        modalManager: null,
        filterManager: null,
        controlsManager: null,
        renderer: null,

        currentRoute: '/',
        isSkillsPage: false,
        isAchievementsPage: false,
        isPortfolioPage: false,
        routeToken: 0,
        routeTransitionInFlight: false,

        didPrimeSkeletons: false,
        primedSkeletonCount: 0,
        primedSkeletonTarget: null,
        skeletonKey: null,
        coursesProgrammingLanguageIconsPreloaded: false,
        coursesLanguageIconsPreloadPromise: null
    };

    const dataService = new DataService();

    window.dataService = dataService;

    window.state = state;

    const routePaths = Object.keys(routes).sort((a, b) => b.length - a.length);

    const applyRedirectPath = () => {
        const redirectPath = sessionStorage.getItem('spa-redirect');
        if (redirectPath) {
            sessionStorage.removeItem('spa-redirect');
            window.history.replaceState(null, '', redirectPath);
        }
    };

    const resolveLegacyRoute = (pathname) => {
        const lower = pathname.toLowerCase();
        if (lower.endsWith('/html/videos.html') || lower.endsWith('/videos.html')) return '/videos';
        if (lower.endsWith('/html/games.html') || lower.endsWith('/games.html')) return '/games';
        if (lower.endsWith('/html/skills.html') || lower.endsWith('/skills.html')) return '/skills';
        if (lower.endsWith('/html/activities.html') || lower.endsWith('/activities.html')) return '/activities';
        if (lower.endsWith('/html/achievements.html') || lower.endsWith('/achievements.html')) return '/achievements';
        if (lower.endsWith('/index.html')) return '/';
        return null;
    };

    const resolveAppRoot = (pathname) => {
        const legacyMatch = pathname.match(/^(.*)\/html\/[^/]+\.html$/i);
        if (legacyMatch) return legacyMatch[1];
        const normalized = pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '');
        const match = routePaths.find(route => route !== '/' && normalized.endsWith(route));
        if (match) return normalized.slice(0, -match.length);
        return normalized;
    };

    applyRedirectPath();
    const appRoot = resolveAppRoot(window.location.pathname);
    state.appRoot = appRoot;
    dataService.setAppRoot(appRoot);

    const stripAppRoot = (pathname) => {
        if (appRoot && pathname.startsWith(appRoot)) {
            const stripped = pathname.slice(appRoot.length);
            return stripped || '/';
        }
        return pathname || '/';
    };

    const resolveRoute = (pathname) => {
        const legacy = resolveLegacyRoute(pathname);
        if (legacy) return legacy;
        const stripped = stripAppRoot(pathname);
        if (!stripped || stripped === '/') return '/';
        const normalized = stripped.endsWith('/') ? stripped.slice(0, -1) : stripped;
        return routes[normalized] ? normalized : '/';
    };

    const buildUrl = (route, search) => {
        const suffix = route === '/' ? '/' : route;
        const base = appRoot || '';
        const path = `${base}${suffix}`;
        return search ? `${path}${search}` : path;
    };

    const normalizeCanonicalUrl = () => {
        const currentRoute = resolveRoute(window.location.pathname);
        const currentSearch = window.location.search || '';
        const canonicalUrl = buildUrl(currentRoute, currentSearch);
        const currentUrl = `${window.location.pathname}${currentSearch}`;
        if (currentUrl !== canonicalUrl) {
            window.history.replaceState(null, '', canonicalUrl);
        }
    };

    normalizeCanonicalUrl();

    const getExternalLinkTarget = (url) => {
        const raw = String(url || '').trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch (err) {
        }
        return '';
    };



    const closeExternalLinkModal = (confirmed) => {
        if (!state.externalLinkModal) return;
        if (state.externalLinkModal._fadeTimer) {
            clearTimeout(state.externalLinkModal._fadeTimer);
            state.externalLinkModal._fadeTimer = null;
        }

        const resolver = state.externalLinkResolve;
        state.externalLinkResolve = null;
        const contentEl = state.externalLinkModal.querySelector('.external-link-modal-content');
        state.externalLinkModal.style.transition = 'opacity 160ms ease';
        state.externalLinkModal.style.opacity = '0';
        if (contentEl) {
            contentEl.style.transition = 'transform 160ms ease';
            contentEl.style.transform = 'translateY(8px)';
        }
        state.externalLinkModal._fadeTimer = setTimeout(() => {
            state.externalLinkModal.classList.remove('active');
            state.externalLinkModal.style.display = 'none';
            state.externalLinkModal.style.opacity = '';
            if (contentEl) contentEl.style.transform = '';
            state.externalLinkModal._fadeTimer = null;
            Utils.syncPageScrollLock(false);
            if (resolver) resolver(!!confirmed);
        }, 170);
    };

    const showExternalLinkModal = (url, title, category, info) => {
        if (!state.externalLinkModal) return Promise.resolve(false);
        if (state.externalLinkModal._fadeTimer) {
            clearTimeout(state.externalLinkModal._fadeTimer);
            state.externalLinkModal._fadeTimer = null;
        }
        if (state.externalLinkResolve) {
            state.externalLinkResolve(false);
            state.externalLinkResolve = null;
        }

        const isEmail = String(url).toLowerCase().startsWith('mailto:');

        if (state.externalLinkTitleEl) {
            if (isEmail) {
                state.externalLinkTitleEl.style.display = 'none';
            } else {
                const safeTitle = String(title || '').trim();
                const safeTitleText = safeTitle || 'External Link';
                state.externalLinkTitleEl.style.display = 'block';
                state.externalLinkTitleEl.innerHTML = `<strong style="color:#8b949e; text-transform:uppercase; font-size:0.7rem;">Title</strong><br>${safeTitleText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
            }
        }

        if (state.externalLinkCategoryEl) {
            if (isEmail) {
                state.externalLinkCategoryEl.style.display = 'none';
            } else {
                const safeCategory = String(category || '').trim();
                state.externalLinkCategoryEl.innerHTML = safeCategory ? `<strong style="color:#8b949e; text-transform:uppercase; font-size:0.7rem;">Category</strong><br>${safeCategory.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}` : '';
                state.externalLinkCategoryEl.style.display = safeCategory ? 'block' : 'none';
            }
        }

        if (state.externalLinkInfoEl) {
            if (isEmail) {
                state.externalLinkInfoEl.style.display = 'none';
            } else {
                const safeInfo = String(info || '').trim();
                const safeInfoText = safeInfo
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
                state.externalLinkInfoEl.innerHTML = safeInfo ? `<strong style="color:#8b949e; text-transform:uppercase; font-size:0.7rem;">Info</strong><br>${safeInfoText}` : '';
                state.externalLinkInfoEl.style.display = safeInfo ? 'block' : 'none';
            }
        }

        if (state.externalLinkUrlEl) {
            if (isEmail) {
                const emailStr = String(url).substring(7).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                state.externalLinkUrlEl.style.display = 'block';
                state.externalLinkUrlEl.innerHTML = `<strong style="color:#8b949e; text-transform:uppercase; font-size:0.7rem;">Email</strong><br><span style="color:#58a6ff;">${emailStr}</span>`;
            } else {
                const safeUrl = String(url || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                state.externalLinkUrlEl.style.display = 'block';
                state.externalLinkUrlEl.innerHTML = `<strong style="color:#8b949e; text-transform:uppercase; font-size:0.7rem;">Link</strong><br><span style="color:#58a6ff;">${safeUrl}</span>`;
            }
        }

        const messageEl = state.externalLinkModal.querySelector('.external-link-message') || document.getElementById('external-link-message');
        if (messageEl) {
            messageEl.textContent = isEmail ? 'Are you sure you want to send an email to this address?' : 'You are about to open an external website in a new tab.';
        }

        state.externalLinkModal.style.display = 'flex';
        state.externalLinkModal.classList.add('active');
        state.externalLinkModal.style.transition = 'opacity 160ms ease';
        state.externalLinkModal.style.opacity = '0';
        const contentEl = state.externalLinkModal.querySelector('.external-link-modal-content');
        if (contentEl) {
            contentEl.style.transition = 'transform 160ms ease';
            contentEl.style.transform = 'translateY(8px)';
        }
        requestAnimationFrame(() => {
            state.externalLinkModal.style.opacity = '1';
            if (contentEl) contentEl.style.transform = 'translateY(0)';
        });
        Utils.syncPageScrollLock(true);

        return new Promise(resolve => {
            state.externalLinkResolve = resolve;
        });
    };

    const openExternalLinkWithPrompt = async (url, title, category, info) => {
        const target = getExternalLinkTarget(url);
        if (!target) return false;
        const confirmed = await showExternalLinkModal(target, title, category, info);
        if (!confirmed) return false;
        window.open(target, '_blank', 'noopener,noreferrer');
        return true;
    };

    window.resolveExternalLinkTarget = getExternalLinkTarget;
    window.openExternalLinkWithPrompt = openExternalLinkWithPrompt;

    const fragmentCache = new Map();

    const updateNavLinks = () => {
        document.querySelectorAll('.nav-links a[data-route]').forEach(link => {
            const route = link.getAttribute('data-route') || '/';
            link.setAttribute('href', buildUrl(route, ''));
        });
    };

    const setupExternalLinkTriggers = () => {
        document.querySelectorAll('.external-link-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const url = el.getAttribute('data-url') || el.getAttribute('href');
                if (url && typeof window.openExternalLinkWithPrompt === 'function') {
                    window.openExternalLinkWithPrompt(url, el.textContent || 'External Link');
                }
            });
        });
    };

    const getFragmentHtml = async (path) => {
        if (fragmentCache.has(path)) return fragmentCache.get(path);
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);
        const html = await response.text();
        fragmentCache.set(path, html);
        return html;
    };

    const injectFragments = async (root, route) => {
        const nodes = Array.from(root.querySelectorAll('[data-fragment]'));
        if (nodes.length === 0) return;
        for (const node of nodes) {
            const type = node.getAttribute('data-fragment');
            if (!type) continue;
            let path = null;
            if (type === 'controls') {
                const variant = node.getAttribute('data-variant') || (route === '/videos' || route === '/games' ? 'portfolio' : 'skills');
                path = `html/fragments/controls-${variant}.html`;
            } else if (type === 'modals') {
                node.remove();
                continue;
            } else if (type === 'no-results') {
                const variant = node.getAttribute('data-variant') || (route === '/videos' || route === '/games' ? 'portfolio' : 'skills');
                path = `html/fragments/no-results-${variant}.html`;
            }
            if (!path) continue;
            const html = await getFragmentHtml(path);
            node.insertAdjacentHTML('beforebegin', html);
            node.remove();
        }
    };

    const updateNavActive = (route, options = {}) => {
        const { animate = true } = options;
        const links = Array.from(document.querySelectorAll('.nav-links a'));
        if (!links.length) return;

        let targetLink = null;
        links.forEach((link) => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute && linkRoute === route) targetLink = link;
        });

        const currentActive = links.find(link => link.classList.contains('active')) || null;

        if (!animate || !currentActive || currentActive === targetLink) {
            links.forEach((link) => {
                const linkRoute = link.getAttribute('data-route');
                link.classList.remove('active-fade-in', 'active-fade-out');
                if (!linkRoute) {
                    link.classList.remove('active');
                    return;
                }
                if (linkRoute === route) link.classList.add('active');
                else link.classList.remove('active');
            });
            return;
        }

        links.forEach((link) => {
            if (link !== currentActive && link !== targetLink) {
                link.classList.remove('active', 'active-fade-in', 'active-fade-out');
            }
        });

        currentActive.classList.remove('active-fade-in');
        currentActive.classList.add('active-fade-out');
        currentActive.classList.remove('active');

        if (currentActive._navActiveFadeTimer) {
            clearTimeout(currentActive._navActiveFadeTimer);
        }
        currentActive._navActiveFadeTimer = setTimeout(() => {
            currentActive.classList.remove('active-fade-out');
            currentActive._navActiveFadeTimer = null;
        }, 300);

        if (targetLink) {
            targetLink.classList.remove('active-fade-out');
            targetLink.classList.add('active-fade-in');
            targetLink.classList.add('active');

            if (targetLink._navActiveFadeTimer) {
                clearTimeout(targetLink._navActiveFadeTimer);
            }
            targetLink._navActiveFadeTimer = setTimeout(() => {
                targetLink.classList.remove('active-fade-in');
                targetLink._navActiveFadeTimer = null;
            }, 300);
        }
    };

    const resetPageState = () => {
        state.selectedCategories = ['all'];
        state.selectedTools = ['all'];
        state.selectedOrder = 'desc';
        state.selectedCourseSort = 'status';
        state.selectedCourseOrder = 'asc';
        state.selectedCourseColumnValues = {};
        state.selectedSkillColumnValues = {};
        state.selectedPortfolioColumnValues = {};
        state.hiddenCourseColumns = {};
        state.hiddenSkillColumns = {};
        state.filteredCourses = [];
        state.searchQuery = '';
        state.courseSearchQuery = '';
        state.currentItemCard = null;
        state.currentGalleryIndex = 0;
        state.currentToolsContext = [];
        state.currentToolIndex = -1;
        state.achievementVideos = [];
        state.currentAchievementVideoIndex = -1;
        state.didPrimeSkeletons = false;
        state.primedSkeletonCount = 0;
        state.primedSkeletonTarget = null;
        state.skeletonKey = null;
        const shell = state.coursesTableBody?.closest('.courses-table-shell');
        if (shell) shell.style.minHeight = '';
        state.coursesProgrammingLanguageIconsPreloaded = false;
        state.coursesLanguageIconsPreloadPromise = null;
        const skillsShell = document.querySelector('.courses-table-shell.skills-table-shell');
        if (skillsShell) skillsShell.style.minHeight = '';
        if (portfolioGridResizeObserver) {
            portfolioGridResizeObserver.disconnect();
            portfolioGridResizeObserver = null;
        }
        if (state.portfolioGrid) state.portfolioGrid.style.minHeight = '';
    };

    const lockTableShellHeight = (shell) => {
        if (!shell) return;
        const currentHeight = shell.getBoundingClientRect().height;
        if (!Number.isFinite(currentHeight) || currentHeight <= 0) return;
        const currentMin = Number.parseFloat(shell.style.minHeight || '0');
        const nextMin = Math.ceil(currentHeight);
        if (!Number.isFinite(currentMin) || nextMin > currentMin) shell.style.minHeight = `${nextMin}px`;
    };

    const ensurePortfolioGridResizeObserver = () => {
        if (portfolioGridResizeObserver) {
            portfolioGridResizeObserver.disconnect();
            portfolioGridResizeObserver = null;
        }
        const grid = state.portfolioGrid;
        if (!grid || !state.isPortfolioPage) return;
        portfolioGridResizeObserver = new ResizeObserver(() => {
            if (state.lockPortfolioGridHeight) state.lockPortfolioGridHeight();
        });
        portfolioGridResizeObserver.observe(grid);
    };

    const syncDomReferences = () => {
        state.modal = document.getElementById("infoModal");
        state.closeBtn = document.querySelector("#infoModal .close-button");
        state.videoFrame = document.getElementById("modal-video");
        state.mediaContainer = document.getElementById("media-container");
        state.prevBtn = document.getElementById("modal-prev");
        state.nextBtn = document.getElementById("modal-next");
        state.secModal = document.getElementById("secondaryModal");
        state.secCloseBtn = document.querySelector(".sec-close-button");
        state.secPrevBtn = document.getElementById("sec-modal-prev");
        state.secNextBtn = document.getElementById("sec-modal-next");
        state.externalLinkModal = document.getElementById('external-link-modal');
        state.externalLinkTitleEl = document.getElementById('external-link-title');
        state.externalLinkCategoryEl = document.getElementById('external-link-category');
        state.externalLinkInfoEl = document.getElementById('external-link-info');
        state.externalLinkUrlEl = document.getElementById('external-link-url');
        state.skillsList = document.getElementById('skills-list');
        state.achievementsList = document.getElementById('achievements-list');
        state.activitiesList = document.getElementById('activities-list');
        state.coursesTableBody = document.getElementById('courses-table-body');
        state.portfolioGrid = document.getElementById("portfolio-grid");
        state.noResults = document.getElementById("no-results");
        state.toolSelectContainer = document.getElementById('tool-select');
        state.typeSelectContainer = document.getElementById('type-select');
        state.sortSelectContainer = document.getElementById('sort-select');
        state.orderSelectContainer = document.getElementById('order-select');
        state.searchContainer = document.querySelector('.search-box');
        state.searchInput = document.getElementById("portfolio-search");
        state.coursesSearchInput = document.getElementById('courses-search-input');
        state.globalSearchInput = document.getElementById('global-search-input');
        state.coursesFilterButton = document.getElementById('courses-filter-button');
        state.coursesFilterMenu = document.getElementById('courses-filter-menu');
        state.skillsFilterButton = document.getElementById('skills-filter-button');
        state.skillsFilterMenu = document.getElementById('skills-filter-menu');
        state.portfolioFilterGroup = document.getElementById('portfolio-filter-group');
        state.portfolioFilterButton = document.getElementById('portfolio-filter-button');
        state.portfolioFilterMenu = document.getElementById('portfolio-filter-menu');
    };


    const getSkeletonKey = () => {
        if (state.portfolioGrid) return `portfolio:${state.currentRoute}`;
        if (state.skillsList) return `skills:${state.currentRoute}`;
        if (state.coursesTableBody) return `courses:${state.currentRoute}`;
        return null;
    };

    const getStoredCount = (key) => {
        if (!key) return 0;
        try {
            const raw = localStorage.getItem(key);
            const val = Number.parseInt(raw, 10);
            return Number.isFinite(val) && val > 0 ? val : 0;
        } catch (err) {
            return 0;
        }
    };

    const setStoredCount = (key, count) => {
        if (!key) return;
        try {
            const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
            localStorage.setItem(key, String(next));
        } catch (err) {
        }
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const ROUTE_FADE_MS = 180;

    const prefersReducedMotion = () => {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (err) {
            return false;
        }
    };

    const ensureRouteTransitionSetup = (root) => {
        if (!root || root.dataset.routeTransitionReady === 'true') return;
        root.style.viewTransitionName = 'page-root';

        if (!document.getElementById('route-transition-style')) {
            const style = document.createElement('style');
            style.id = 'route-transition-style';
            style.textContent = `
                ::view-transition {
                    background: #000000;
                }

                ::view-transition-old(page-root) {
                    display: none !important;
                }

                ::view-transition-group(page-root),
                ::view-transition-image-pair(page-root) {
                    animation: none !important;
                }

                .nav-container,
                .nav-links,
                .mobile-menu-toggle {
                    view-transition-name: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        root.dataset.routeTransitionReady = 'true';
    };

    const runRouteCrossfade = async (root, updateDom) => {
        updateDom();
    };

    const isSameRouteNavigation = (route, search) => {
        const currentRoute = state.currentRoute || resolveRoute(window.location.pathname);
        const currentSearch = window.location.search || '';
        const nextSearch = search || '';

        if (route === currentRoute && !nextSearch) {
            return true;
        }

        return route === currentRoute && nextSearch === currentSearch;
    };

    const shouldSkipRouteLoad = (route, search, root) => {
        if (!isSameRouteNavigation(route, search)) return false;
        if (state.routeToken <= 0) return false;
        if (state.currentRoute !== route) return false;
        if (!root) return false;
        const hasRenderedContent = root.children.length > 0 || (root.textContent || '').trim().length > 0;
        return hasRenderedContent;
    };

    const preloadImage = (src, timeoutMs) => new Promise(resolve => {
        if (!src) {
            resolve({ ok: false, src: '', cached: false });
            return;
        }
        const img = new Image();
        const startTime = Date.now();
        let settled = false;
        const finish = (ok, finalSrc) => {
            if (settled) return;
            settled = true;
            clearTimeout(timerId);
            const loadTime = Date.now() - startTime;
            const cached = ok && loadTime < 50;
            resolve({ ok, src: finalSrc || src, cached });
        };
        const timerId = setTimeout(() => finish(false, src), timeoutMs || 3500);
        img.onload = () => {
            const isPlaceholder = src.includes('/vi/') &&
                img.naturalWidth === 120 &&
                img.naturalHeight === 90;
            finish(!isPlaceholder, src);
        };
        img.onerror = () => finish(false, src);
        img.src = src;
    });

    const resolveProjectThumb = async (project) => {
        const youtubeID = Utils.extractYouTubeID(project.youtube || '');
        const hasValidYoutube = youtubeID && youtubeID.trim() !== "" && youtubeID !== "YOUTUBE_ID_HERE";
        if (hasValidYoutube) {
            const thumbnailQualities = [
                'hqdefault',
                'mqdefault',
                'default'
            ];

            for (const quality of thumbnailQualities) {
                const thumbSrc = `https://i.ytimg.com/vi/${youtubeID}/${quality}.jpg`;
                const result = await preloadImage(thumbSrc, 3500);
                if (result.ok) return { src: thumbSrc, cached: result.cached };
            }

            return { src: `https://i.ytimg.com/vi/${youtubeID}/default.jpg`, cached: false };
        }
        const raw = state.renderer.fixImagePath(project.gallery?.[0] || '');
        if (!raw) return { src: '', cached: false };
        const result = await preloadImage(raw, 3500);
        return { src: raw, cached: result.cached };
    };

    const preloadProjectThumbs = async (projects) => {
        let allCached = true;
        const tasks = projects.map(async project => {
            const result = await resolveProjectThumb(project);
            project.resolvedThumb = result.src;
            if (!result.cached) allCached = false;
        });
        await Promise.all(tasks);
        return allCached;
    };

    const preloadSkillIcons = async (skills) => {
        let allCached = true;
        const tasks = skills.map(async skill => {
            const iconSrc = state.renderer.fixImagePath(skill.icon);
            skill.resolvedIcon = iconSrc || '';
            if (iconSrc) {
                const result = await preloadImage(iconSrc, 2500);
                if (!result.cached) allCached = false;
            }
        });
        await Promise.all(tasks);
        return allCached;
    };

    const setupAchievementVideoLinks = (projects) => {
        if (!projects || !projects.length) return;
        const anchors = Array.from(document.querySelectorAll('.achievement-card a'));
        const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const isVideoSearchLink = (href) => {
            const lower = (href || '').toLowerCase();
            return lower.includes('search=') && (lower.includes('videos.html') || lower.includes('/videos'));
        };

        const linkedVideoNames = new Set();
        anchors.forEach(a => {
            const projectNameAttr = a.getAttribute('data-project');
            if (projectNameAttr && projectNameAttr.trim()) {
                linkedVideoNames.add(normalize(projectNameAttr.trim()));
            }
        });

        const achievementVideos = [];
        const addedNames = new Set();
        anchors.forEach(a => {
            const projectNameAttr = a.getAttribute('data-project');
            if (projectNameAttr && projectNameAttr.trim()) {
                const nName = normalize(projectNameAttr.trim());
                if (!addedNames.has(nName)) {
                    const match = projects.find(p => normalize(p.name) === nName)
                        || projects.find(p => normalize(p.name).includes(nName))
                        || projects.find(p => nName.includes(normalize(p.name)));
                    if (match) {
                        achievementVideos.push(match);
                        addedNames.add(nName);
                    }
                }
            }
        });
        state.achievementVideos = achievementVideos;

        anchors.forEach(a => {
            try {
                const projectNameAttr = a.getAttribute('data-project');
                const href = a.getAttribute('href') || '';
                if (!projectNameAttr && !isVideoSearchLink(href)) return;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const lookup = (projectNameAttr && projectNameAttr.trim()) ? projectNameAttr.trim() : null;
                    let decoded = lookup;
                    if (!decoded) {
                        const url = new URL(href, window.location.origin);
                        const searchVal = url.searchParams.get('search') || '';
                        decoded = decodeURIComponent(searchVal).trim();
                    }
                    const nDecoded = normalize(decoded);
                    const match = projects.find(p => normalize(p.name) === nDecoded)
                        || projects.find(p => normalize(p.name).includes(nDecoded))
                        || projects.find(p => nDecoded.includes(normalize(p.name)));
                    if (match) {
                        const videoIndex = state.achievementVideos.findIndex(v => v.name === match.name);
                        state.currentAchievementVideoIndex = videoIndex;
                        if (state.openModalForItem) state.openModalForItem(match);
                    } else {
                        if (href && href !== '#') {
                            const targetUrl = new URL(href, window.location.origin);
                            const route = resolveRoute(targetUrl.pathname);
                            if (routes[route]) navigate(route, targetUrl.search);
                            else openExternalLinkWithPrompt(targetUrl.href, decoded || projectNameAttr || 'External Link');
                        }
                    }
                });
                a.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        a.click();
                    }
                });
            } catch (err) {
            }
        });
    };

    const ACHIEVEMENT_AWARDS_SKELETON_KEY = 'portfolio:/achievements:awards';

    const renderAchievementAwards = () => {
        const container = document.getElementById('festival-awards-container');
        if (!container) return;

        const esc = (v) => String(v ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const awards = state.filmFestivalAwards;
        if (!awards || Object.keys(awards).length === 0) {
            container.innerHTML = '<p style="color: #8b949e;">No awards found.</p>';
            return;
        }

        const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const videos = state.allData?.videos || [];

        const entries = Object.entries(awards)
            .map(([projectName, projectAwards]) => {
                if (!Array.isArray(projectAwards) || !projectAwards.length) return null;
                const nName = normalize(projectName);
                const project = videos.find(v => normalize(v.name) === nName)
                    || videos.find(v => normalize(v.name).includes(nName))
                    || videos.find(v => nName.includes(normalize(v.name)));
                if (!project) return null;
                return { project, projectAwards };
            })
            .filter(Boolean);

        if (!entries.length) {
            container.innerHTML = '<p style="color: #8b949e;">No awards found.</p>';
            return;
        }

        setStoredCount(ACHIEVEMENT_AWARDS_SKELETON_KEY, entries.length);

        const awardTime = (a) => Utils.parseMonthYearToTime((a && a.date) || '');
        entries.forEach((e) => {
            e.projectAwards = [...e.projectAwards].sort((x, y) => awardTime(y) - awardTime(x));
        });
        entries.sort((a, b) => {
            const am = Math.max(0, ...a.projectAwards.map(awardTime));
            const bm = Math.max(0, ...b.projectAwards.map(awardTime));
            return bm - am;
        });

        const awardVideos = entries.map((e) => e.project);
        const fixPath = (p) => (state.renderer && typeof state.renderer.fixImagePath === 'function')
            ? state.renderer.fixImagePath(p)
            : p;

        container.innerHTML = '';

        entries.forEach(({ project, projectAwards }) => {
            let thumbSrc = project.resolvedThumb || (project.gallery && project.gallery[0]) || '';
            const youtubeID = Utils.extractYouTubeID(project.youtube || '');
            const hasValidYoutube = youtubeID && youtubeID.trim() !== '' && youtubeID !== 'YOUTUBE_ID_HERE';
            if (hasValidYoutube) {
                thumbSrc = project.resolvedThumb || `https://i.ytimg.com/vi/${youtubeID}/hqdefault.jpg`;
            } else {
                thumbSrc = project.resolvedThumb || fixPath(thumbSrc);
            }

            const awardLines = projectAwards.map((a) => {
                const locationParts = String(a.location || '').split('|').map((part) => part.trim());
                const school = locationParts[0] || '';
                const festival = locationParts[1] || '';
                let locHtml = '';
                if (festival || school) {
                    locHtml = '<div class="modal-award-loc">';
                    if (festival) locHtml += `<span class="modal-award-loc-festival">${esc(festival)}</span>`;
                    if (school) locHtml += `<span class="modal-award-loc-school">${esc(school)}</span>`;
                    locHtml += '</div>';
                }
                return `<li class="festival-award-line"><div class="festival-award-line-body"><span class="festival-award-prize">${esc(a.award)}</span>${locHtml}</div><span class="festival-award-date">${esc(a.date)}</span></li>`;
            }).join('');

            const card = document.createElement('div');
            card.className = 'portfolio-card festival-award-card';
            card.setAttribute('data-name', project.name || '');
            card.setAttribute('data-date', project.date || '');
            card.setAttribute('data-info', project.info || '');
            card.setAttribute('data-tools', project.tools || '');
            card.setAttribute('data-youtube', project.youtube || '');
            card.setAttribute('data-type', project.badge || '');
            card.setAttribute('data-badge', project.badge || '');
            card.setAttribute('data-gallery', project.gallery ? project.gallery.join(', ') : '');

            card.innerHTML = `
                <div class="card-thumb">
                    <img alt="${esc(project.name || '')}" loading="lazy">
                </div>
                <div class="card-content">
                    <div class="card-info">
                        <h3>${esc(project.name || '')}</h3>
                        <ul class="festival-award-list">${awardLines}</ul>
                    </div>
                </div>`;

            const imgElement = card.querySelector('img');
            if (imgElement) {
                imgElement.src = thumbSrc;
                if (hasValidYoutube) {
                    imgElement.onload = function () {
                        if (this.naturalWidth === 120 && this.naturalHeight === 90) {
                            this.style.opacity = '0.3';
                            this.style.filter = 'blur(2px)';
                        }
                    };
                    imgElement.onerror = function () {
                        this.style.opacity = '0.3';
                    };
                }
            }

            card.addEventListener('click', () => {
                state.achievementVideos = awardVideos;
                state.currentAchievementVideoIndex = awardVideos.indexOf(project);
                state.showModalNavArrows = awardVideos.length > 1;
                if (state.modalManager) {
                    state.modalManager.openModalForItem(project, 'videos');
                }
            });

            container.appendChild(card);
        });
    };

    const setupPortraitMediaLoadState = () => {
        document.querySelectorAll('.portrait-media').forEach((media) => {
            const img = media.querySelector('.portrait-image');
            if (!img) return;
            const markLoaded = () => media.classList.add('is-loaded');
            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', markLoaded, { once: true });
            if (img.complete && img.naturalWidth > 0) markLoaded();
        });
    };

    const renderRecentWork = () => {
        const gridContainer = document.getElementById('recent-work-grid');
        const listContainer = document.getElementById('recent-course-projects-list');
        if (!gridContainer || !state.renderer) return;

        const allGamesVideos = [
            ...(state.allData?.games || []),
            ...(state.allData?.videos || [])
        ].filter(item => item && item.name);

        allGamesVideos.sort((a, b) => {
            const timeA = Utils.parseFlexibleDateStringMs(a.date) || 0;
            const timeB = Utils.parseFlexibleDateStringMs(b.date) || 0;
            return timeB - timeA;
        });

        const recentGamesVideos = allGamesVideos.slice(0, 3);
        if (!recentGamesVideos.length) {
            gridContainer.innerHTML = '<p style="color: #8b949e; grid-column: 1/-1; text-align: center; padding: 20px;">No recent work available.</p>';
        } else {
            state.renderer.showSkeletons(gridContainer, recentGamesVideos.length);
            try {
                state.renderer.renderProjects(recentGamesVideos, gridContainer, true);
            } catch (e) {
                gridContainer.innerHTML = '<p style="color: #8b949e; grid-column: 1/-1; text-align: center; padding: 20px;">Unable to display recent work. Please refresh the page.</p>';
            }
        }
    };

    const renderActivities = () => {
        const container = state.activitiesList;
        if (!container) return;

        const rows = Array.isArray(state.allData?.Activities) ? state.allData.Activities : [];
        if (!rows.length) {
            container.innerHTML = '<p style="color: #8b949e; text-align: center; padding: 20px;">No activities added yet.</p>';
            return;
        }

        const toText = (value) => (value ?? '').toString().trim();
        const toDateRange = (startRaw, endRaw) => {
            const start = toText(startRaw);
            const end = toText(endRaw);
            if (start && end) return `${start} - ${end}`;
            if (start) return `${start} - Present`;
            if (end) return end;
            return '';
        };
        const isHttp = (url) => /^https?:\/\//i.test(toText(url));
        const escapeHtml = (value) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        container.innerHTML = rows.map((row, index) => {
            const name = toText(row.name) || 'Untitled Activity';
            const school = toText(row.school);
            const type = toText(row.type) || 'Activity';
            const description = toText(row.description || row.info);
            const link = toText(row.link);
            const role = toText(row.role);
            const status = toText(row.status);
            const dateRange = toDateRange(row.startdate || row.started, row.enddate || row.ended);
            const hasLink = isHttp(link);
            const marginTop = index === 0 ? '0' : '14px';

            const metaParts = [dateRange, role, status].filter(Boolean);
            const metaLine = metaParts.length
                ? `<p style="font-size: 0.85rem; color: #8b949e; margin: 10px 0 0 0;">${escapeHtml(metaParts.join(' • '))}</p>`
                : '';
            const safeDescription = escapeHtml(description || 'Description coming soon.').replace(/\n/g, '<br>');

            return `
                <div class="achievement-card activity-card" data-activity-name="${escapeHtml(name)}" style="margin-top: ${marginTop};">
                    <div class="achievement-info">
                        <span class="software-tag">${escapeHtml(type.toUpperCase())}</span>
                        <h3>${escapeHtml(name)}</h3>
                        <p style="font-size: 0.92rem; color: #8b949e; margin: 6px 0 0 0;">${escapeHtml(school || 'Organization not specified')}</p>
                        ${metaLine}
                        <p style="margin-top: 12px; line-height: 1.55; color: #e1e4e8; white-space: pre-line;">${safeDescription}</p>
                        ${hasLink ? `<a class="activity-external-link inline-action-button" href="${escapeHtml(link)}" data-title="${escapeHtml(name)}" data-category="${escapeHtml(type || 'Activity')}" style="margin-top: 12px;">View Activity ${Utils.lucideChevronRightSvg({ size: 16 })}</a>` : ''}
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.activity-external-link').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const url = anchor.getAttribute('href') || '';
                const title = anchor.getAttribute('data-title') || 'External Link';
                const category = anchor.getAttribute('data-category') || 'Activity';
                openExternalLinkWithPrompt(url, title, category);
            });
        });
    };

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const toText = (value) => (value ?? '').toString().trim();

    const closeAllColumnFilterMenus = () => {
        document.querySelectorAll('.column-filter-menu.open').forEach(menu => {
            menu.classList.remove('open');
        });
        document.querySelectorAll('.column-filter-header-flyout').forEach(el => {
            el.innerHTML = '';
            el.removeAttribute('data-header-filter-scope');
            el.removeAttribute('data-header-filter-key');
        });
        document.querySelectorAll('.column-header-filter-indicator.is-flyout-open').forEach(el => {
            el.classList.remove('is-flyout-open');
        });
        document.querySelectorAll('.column-filter-item.active').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.filter-icon-button[aria-expanded="true"]').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
        });
        Utils.syncPageScrollLock(false);
        document.querySelectorAll('.custom-select-container.open, .multi-select-container.open').forEach(el => el.classList.remove('open'));
        if (typeof window.syncDropdownScrollLock === 'function') window.syncDropdownScrollLock();
    };

    window.closeAllColumnFilterMenus = closeAllColumnFilterMenus;

    const positionColumnFilterMenuAtButton = (button, menu) => {
        if (!button || !menu || !menu.classList.contains('open')) return;
        const buttonRect = button.getBoundingClientRect();
        const viewportPad = 12;
        const viewportTop = viewportPad;
        const viewportBottom = window.innerHeight - viewportPad;
        const viewportLeft = viewportPad;
        const viewportRight = window.innerWidth - viewportPad;

        const gap = 6;
        const spaceBelow = Math.max(0, viewportBottom - buttonRect.bottom - gap);
        const spaceAbove = Math.max(0, buttonRect.top - viewportTop - gap);
        const naturalHeight = Math.ceil(menu.scrollHeight);
        const openUpward = naturalHeight > spaceBelow && spaceAbove > spaceBelow;

        menu.style.top = openUpward ? 'auto' : `calc(100% + ${gap}px)`;
        menu.style.bottom = openUpward ? `calc(100% + ${gap}px)` : 'auto';
        menu.style.maxHeight = '';
        menu.style.overflow = 'visible';

        menu.style.right = '0px';
        menu.style.left = 'auto';
        let rect = menu.getBoundingClientRect();
        if (rect.left < viewportLeft) {
            const shiftRight = viewportLeft - rect.left;
            menu.style.right = `${-(shiftRight)}px`;
            rect = menu.getBoundingClientRect();
        } else if (rect.right > viewportRight) {
            const shiftLeft = rect.right - viewportRight;
            const currentRight = Number.parseFloat((menu.style.right || '0').replace('px', '')) || 0;
            menu.style.right = `${currentRight + shiftLeft}px`;
            rect = menu.getBoundingClientRect();
        }

        let deltaY = 0;
        if (rect.bottom > viewportBottom) deltaY = rect.bottom - viewportBottom;
        if (rect.top - deltaY < viewportTop) deltaY = rect.top - viewportTop;
        if (deltaY) window.scrollBy({ top: deltaY, behavior: 'auto' });
    };

    const syncColumnVisibilityToggles = (button, menu) => {
        const scope = getColumnFilterScope(button);
        if (!scope) return;
        const table = getTableForScope(scope);
        if (!table) return;
        menu.querySelectorAll('.column-filter-item').forEach(item => {
            const toggle = item.querySelector('.column-visibility-toggle');
            if (!toggle) return;
            const key = item.dataset.filterKey || '';
            if (!key) return;
            const columnIndex = getColumnIndexForScopeKey(scope, key);
            if (columnIndex <= 0) return;
            let isCssHidden = false;
            const th = table.querySelector(`thead th:nth-child(${columnIndex})`);
            if (th) {
                const originalDisplay = th.style.display;
                th.style.display = '';
                if (window.getComputedStyle(th).display === 'none') {
                    isCssHidden = true;
                }
                th.style.display = originalDisplay;
            }
            const hidden = isCssHidden || isColumnHidden(scope, key);
            const allowHide = isCssHidden ? false : canHideColumn(scope, key);
            toggle.classList.toggle('is-hidden', hidden);
            toggle.classList.toggle('is-locked', !allowHide);
            toggle.disabled = !allowHide;
            toggle.setAttribute('aria-label', hidden ? 'Show column' : 'Hide column');
            toggle.setAttribute('aria-pressed', hidden ? 'false' : 'true');
        });
    };

    const runColumnFilterMenuOpen = (button, menu, options = {}) => {
        const resetActiveColumn = options.resetActiveColumn !== false;
        document.querySelectorAll('.custom-select-container, .multi-select-container').forEach(container => {
            container.classList.remove('open');
        });
        closeAllColumnFilterMenus();
        syncDropdownScrollLock();
        syncColumnVisibilityToggles(button, menu);
        menu.classList.remove('skip-animation');
        menu.classList.remove('skip-submenu-animation');
        menu.classList.add('open');
        menu.dataset.ignoreSubmenuHover = 'true';
        menu.dataset.submenuHovered = 'false';
        button.setAttribute('aria-expanded', 'true');
        if (resetActiveColumn) {
            menu.querySelectorAll('.column-filter-item').forEach(node => {
                node.classList.remove('active');
            });
        }
        requestAnimationFrame(() => {
            menu.dataset.ignoreSubmenuHover = 'false';
        });
        Utils.syncPageScrollLock(true);
        syncDropdownScrollLock();
        requestAnimationFrame(() => positionColumnFilterMenuAtButton(button, menu));
    };

    const NONE_FILTER_VALUE = '__NONE__';

    const formatFilterValueLabel = (value) => {
        const text = toText(value);
        if (!text) return '';
        if (/^[A-Z0-9]{2,}$/.test(text)) return text;
        return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    };

    const normalizeColumnFilterDefinitionList = (definitions) => {
        return (definitions || []).map(definition => {
            let filterable = definition.filterable !== false;
            const rawValues = (definition.values || []).map(value => toText(value));
            const hasMissing = rawValues.some(value => !value);
            const normalizedValues = Array.from(new Set(rawValues.filter(Boolean))).sort((a, b) => a.localeCompare(b));
            let values = hasMissing ? [NONE_FILTER_VALUE, ...normalizedValues] : normalizedValues;
            if (filterable && values.length <= 1) {
                filterable = false;
                values = [];
            }
            return { ...definition, filterable, values };
        });
    };

    const getSkillsRowsForColumnFilter = () => {
        const skills = Array.isArray(state.allData?.skills) ? state.allData.skills : [];
        return skills;
    };

    const columnFilterHasDiscriminatoryPower = (key, filterValues, ctx) => {
        if (!ctx || !filterValues.length) return true;
        if (ctx.kind === 'portfolio') {
            const projects = ctx.projects || [];
            const n = projects.length;
            if (n === 0) return false;
            if (key === 'type') {
                for (const v of filterValues) {
                    const sel = [v];
                    let cnt = 0;
                    for (const p of projects) {
                        const cardType = toText(p.badge);
                        const normalizedCardType = cardType || NONE_FILTER_VALUE;
                        const matches = sel.includes('all') || sel.includes(cardType) || sel.includes(normalizedCardType);
                        if (matches) cnt++;
                    }
                    if (cnt < n) return true;
                }
                return false;
            }
            if (key === 'tools') {
                const noneLower = NONE_FILTER_VALUE.toLowerCase();
                for (const v of filterValues) {
                    const sel = [String(v).toLowerCase()];
                    let cnt = 0;
                    for (const p of projects) {
                        const cardTools = toText(p.tools).toLowerCase();
                        const toolsList = cardTools.split(',').map(t => t.trim()).filter(Boolean);
                        const hasNoTools = toolsList.length === 0;
                        const matches = sel.includes('all')
                            || toolsList.some(t => sel.includes(t))
                            || (hasNoTools && sel.includes(noneLower));
                        if (matches) cnt++;
                    }
                    if (cnt < n) return true;
                }
                return false;
            }
            return true;
        }
        if (ctx.kind === 'skills') {
            const skills = ctx.skills || [];
            const n = skills.length;
            if (n === 0) return false;
            if (key === 'type') {
                for (const v of filterValues) {
                    const sel = [String(v).toLowerCase()];
                    let cnt = 0;
                    for (const sk of skills) {
                        const itemType = toText(sk.badge).trim();
                        const normalizedType = itemType ? itemType.toLowerCase() : '__none__';
                        const matches = sel.includes('all') || sel.includes(normalizedType);
                        if (matches) cnt++;
                    }
                    if (cnt < n) return true;
                }
                return false;
            }
            if (key === 'level') {
                for (const v of filterValues) {
                    const sel = [String(v).toLowerCase()];
                    let cnt = 0;
                    for (const sk of skills) {
                        const itemLevel = (toText(sk.level).trim() || '-').trim();
                        const normalizedLevel = itemLevel ? itemLevel.toLowerCase() : '__none__';
                        const matches = sel.includes('all') || sel.includes(normalizedLevel);
                        if (matches) cnt++;
                    }
                    if (cnt < n) return true;
                }
                return false;
            }
            return true;
        }
        if (ctx.kind === 'courses') {
            const courses = ctx.courses || [];
            const n = courses.length;
            if (n === 0) return false;
            const fieldMap = {
                school: c => c.school,
                type: c => c.type,
                status: c => c.status,
                completionYear: c => c.completionYear,
                grade: c => c.grade
            };
            const getter = fieldMap[key];
            if (!getter) return true;
            for (const v of filterValues) {
                let cnt = 0;
                for (const c of courses) {
                    const normalizedValue = toText(getter(c)) || NONE_FILTER_VALUE;
                    if ([v].includes(normalizedValue)) cnt++;
                }
                if (cnt < n) return true;
            }
            return false;
        }
        return true;
    };

    const stripNonDiscriminatoryColumnFilters = (definitions, ctx) => {
        if (!ctx) return definitions;
        return definitions.map(def => {
            if (def.filterable === false || !def.values.length) return def;
            if (columnFilterHasDiscriminatoryPower(def.key, def.values, ctx)) return def;
            return { ...def, filterable: false, values: [] };
        });
    };

    let headerColumnFilterFlyoutEl = null;
    const getHeaderColumnFilterFlyout = () => {
        if (!headerColumnFilterFlyoutEl) {
            headerColumnFilterFlyoutEl = document.createElement('div');
            headerColumnFilterFlyoutEl.className = 'column-filter-menu column-filter-header-flyout';
            headerColumnFilterFlyoutEl.setAttribute('role', 'menu');
            headerColumnFilterFlyoutEl.setAttribute('aria-label', 'Column filter');
            headerColumnFilterFlyoutEl.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            document.body.appendChild(headerColumnFilterFlyoutEl);
        }
        return headerColumnFilterFlyoutEl;
    };

    const positionHeaderColumnFilterFlyout = (anchorEl, flyoutEl) => {
        if (!anchorEl || !flyoutEl) return;
        const run = () => {
            const anchorRect = anchorEl.getBoundingClientRect();
            const gap = 6;
            const pad = 12;
            flyoutEl.style.position = 'fixed';
            if (window.matchMedia('(max-width: 600px)').matches) {
                flyoutEl.style.left = '';
                flyoutEl.style.right = '';
                flyoutEl.style.top = '';
                flyoutEl.style.bottom = '';
                flyoutEl.style.width = '';
                flyoutEl.style.transform = '';
                return;
            }
            flyoutEl.style.right = 'auto';
            const fw = flyoutEl.getBoundingClientRect();
            let left = anchorRect.right - fw.width;
            let top = anchorRect.bottom + gap;
            if (left < pad) left = pad;
            if (left + fw.width > window.innerWidth - pad) left = window.innerWidth - pad - fw.width;
            if (top + fw.height > window.innerHeight - pad) {
                top = anchorRect.top - gap - fw.height;
            }
            if (top < pad) top = pad;
            flyoutEl.style.left = `${left}px`;
            flyoutEl.style.top = `${top}px`;
        };
        requestAnimationFrame(() => {
            requestAnimationFrame(run);
        });
    };

    const fillHeaderColumnFilterFlyout = (parentEl, definition, selectedMap, onPipelineChange, rerender) => {
        const prevHadClearWrap = !!parentEl.querySelector('.column-filter-clear-wrap');
        const wasFlyoutOpen = parentEl.classList.contains('open');
        parentEl.innerHTML = '';
        const selected = selectedMap || {};
        const subMenu = document.createElement('div');
        subMenu.className = 'column-filter-submenu';
        const keySelected = selected[definition.key];
        const isAllMode = keySelected === undefined || (Array.isArray(keySelected) && keySelected.includes('all'));
        const individualValues = definition.values;

        const allRow = document.createElement('label');
        allRow.className = 'column-filter-value-row';
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.checked = isAllMode;
        const allText = document.createElement('span');
        allText.className = 'column-filter-value-text';
        allText.textContent = 'All';
        allRow.appendChild(allCheckbox);
        allRow.appendChild(allText);
        allRow.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            selected[definition.key] = ['all'];
            onPipelineChange();
            rerender();
        });
        subMenu.appendChild(allRow);

        individualValues.forEach(value => {
            const row = document.createElement('label');
            row.className = 'column-filter-value-row';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isAllMode || (Array.isArray(keySelected) && keySelected.includes(value));

            const text = document.createElement('span');
            text.className = 'column-filter-value-text';
            text.textContent = value === NONE_FILTER_VALUE ? 'None' : formatFilterValueLabel(value);

            row.appendChild(checkbox);
            row.appendChild(text);

            row.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                let currentValues;
                if (isAllMode) {
                    currentValues = [value];
                } else {
                    currentValues = Array.from(Array.isArray(keySelected) ? keySelected : []);
                    const idx = currentValues.indexOf(value);
                    if (idx >= 0) currentValues.splice(idx, 1);
                    else currentValues.push(value);
                }
                if (currentValues.length === 0) {
                    selected[definition.key] = ['all'];
                } else if (currentValues.length === individualValues.length) {
                    selected[definition.key] = ['all'];
                } else {
                    selected[definition.key] = currentValues;
                }
                onPipelineChange();
                rerender();
            });

            subMenu.appendChild(row);
        });

        const definitionIsActive = isActiveColumnFilterSelection(selected, definition.key);
        if (definitionIsActive) {
            const clearWrap = document.createElement('div');
            clearWrap.className = 'column-filter-clear-wrap';
            if (!wasFlyoutOpen) {
                clearWrap.classList.add('is-pending-reveal');
            } else if (!prevHadClearWrap) {
                clearWrap.classList.add('is-revealing');
            }

            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'column-filter-clear-button';
            clearButton.style.display = 'flex';
            clearButton.style.alignItems = 'center';
            clearButton.style.justifyContent = 'flex-start';
            clearButton.style.gap = '8px';
            clearButton.style.paddingLeft = '8px';
            clearButton.style.paddingRight = '8px';
            clearButton.style.textAlign = 'left';

            const textSpan = document.createElement('span');
            textSpan.className = 'column-filter-clear-text';
            textSpan.textContent = 'Clear Column Filter';

            const iconWrap = document.createElement('span');
            iconWrap.className = 'tool-icon-wrap';
            iconWrap.style.width = '18px';
            iconWrap.style.height = '18px';
            iconWrap.style.minWidth = '18px';
            iconWrap.style.marginLeft = 'auto';
            iconWrap.style.display = 'flex';
            iconWrap.style.alignItems = 'center';
            iconWrap.style.justifyContent = 'center';
            iconWrap.innerHTML = `
            <svg class="tool-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M18 6 6 18 M6 6 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>`;

            clearButton.appendChild(textSpan);
            clearButton.appendChild(iconWrap);

            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                delete selected[definition.key];
                onPipelineChange();
                closeAllColumnFilterMenus();
            });
            clearWrap.appendChild(clearButton);
            subMenu.appendChild(clearWrap);
        }

        parentEl.appendChild(subMenu);
        subMenu.addEventListener('mouseleave', (ev) => {
            if (!isActiveColumnFilterSelection(selected, definition.key)) return;
            const next = ev.relatedTarget;
            if (next && parentEl.contains(next)) return;
            closeAllColumnFilterMenus();
            syncDropdownScrollLock();
        });
    };

    const getColumnFilterScope = (button) => {
        const id = button?.id || '';
        if (id.startsWith('courses-')) return 'courses';
        if (id.startsWith('skills-')) return 'skills';
        if (id.startsWith('portfolio-')) return 'portfolio';
        return '';
    };

    const getColumnIndexForScopeKey = (scope, key) => {
        if (scope === 'skills') {
            if (key === 'name') return 1;
            if (key === 'type') return 2;
            if (key === 'level') return 3;
            if (key === 'lastUsed') return 4;
            return 0;
        }
        if (scope === 'courses') {
            if (key === 'id') return 1;
            if (key === 'name') return 2;
            if (key === 'school') return 3;
            if (key === 'type') return 4;
            if (key === 'status') return 5;
            if (key === 'credits') return 6;
            if (key === 'completionYear') return 7;
            if (key === 'grade') return 8;
            return 0;
        }
        return 0;
    };

    const getHiddenColumnMap = (scope) => {
        if (scope === 'skills') return state.hiddenSkillColumns;
        if (scope === 'courses') return state.hiddenCourseColumns;
        return null;
    };

    const getColumnCountForScope = (scope) => {
        if (scope === 'skills') return 4;
        if (scope === 'courses') return 8;
        return 0;
    };

    const canHideColumn = (scope, key) => {
        if ((scope === 'skills' || scope === 'courses') && key === 'name') return false;
        return true;
    };

    const isColumnHidden = (scope, key) => {
        const hiddenMap = getHiddenColumnMap(scope);
        return !!(hiddenMap && hiddenMap[key]);
    };

    const setColumnHidden = (scope, key, hidden) => {
        const hiddenMap = getHiddenColumnMap(scope);
        if (!hiddenMap || !key) return;
        if (hidden) {
            if (!canHideColumn(scope, key)) return;
            const totalColumns = getColumnCountForScope(scope);
            const hiddenCount = Object.keys(hiddenMap).filter(mapKey => hiddenMap[mapKey]).length + (hiddenMap[key] ? 0 : 1);
            const visibleAfter = totalColumns - hiddenCount;
            if (visibleAfter < 1) return;
            hiddenMap[key] = true;
            return;
        }
        delete hiddenMap[key];
    };

    const getTableForScope = (scope) => {
        if (scope === 'skills') return state.skillsList?.querySelector('.skills-table') || document.querySelector('.skills-table');
        if (scope === 'courses') return document.getElementById('courses-table');
        return null;
    };

    const applyHiddenColumnsToTable = (scope) => {
        const table = getTableForScope(scope);
        const hiddenMap = getHiddenColumnMap(scope);
        if (!table || !hiddenMap) return;

        const hiddenIndexes = new Set(
            Object.keys(hiddenMap)
                .filter(key => hiddenMap[key])
                .map(key => getColumnIndexForScopeKey(scope, key))
                .filter(index => index > 0)
        );

        table.querySelectorAll('thead tr').forEach(row => {
            Array.from(row.children).forEach((cell, idx) => {
                const colIndex = idx + 1;
                cell.style.display = hiddenIndexes.has(colIndex) ? 'none' : '';
            });
        });

        table.querySelectorAll('tbody tr').forEach(row => {
            Array.from(row.children).forEach((cell, idx) => {
                const colIndex = idx + 1;
                cell.style.display = hiddenIndexes.has(colIndex) ? 'none' : '';
            });
        });
    };

    const isActiveColumnFilterSelection = (selectedMap, key) => {
        const values = selectedMap?.[key];
        return Array.isArray(values) && values.length > 0 && !values.includes('all');
    };

    const hasActiveColumnFilters = (definitions, selectedMap) => {
        return (definitions || []).some(definition => {
            if (definition.filterable === false || !definition.values.length) return false;
            return isActiveColumnFilterSelection(selectedMap, definition.key);
        });
    };

    const resetColumnFilterSelections = (definitions, selectedMap) => {
        (definitions || []).forEach(definition => {
            delete selectedMap[definition.key];
        });
    };

    const syncColumnFilterVisualState = (button, menu, definitions, selectedMap, onChange) => {
        if (!button || !menu) return;

        const hasActiveFilters = hasActiveColumnFilters(definitions, selectedMap);
        button.classList.toggle('has-active-filters', hasActiveFilters);

        const scope = getColumnFilterScope(button);
        if (scope) {
            const defs = definitions || [];
            document.querySelectorAll(`.column-header-filter-indicator[data-filter-scope="${scope}"]`).forEach(indicator => {
                const key = indicator.dataset.filterKey || '';
                const def = defs.find(d => d.key === key);
                const canFilterCol = !!(def && def.filterable !== false && def.values.length > 0);
                indicator.classList.toggle('is-disabled', !canFilterCol);
                if (!canFilterCol) {
                    indicator.classList.remove('is-active', 'is-flyout-open');
                } else {
                    const isActive = isActiveColumnFilterSelection(selectedMap, key);
                    indicator.classList.toggle('is-active', isActive);
                }
            });
        }
    };

    const renderColumnFilterMenu = (button, menu, definitions, selectedMap, onChange, activeKey, discriminationContext) => {
        if (!button || !menu) return;

        const selected = selectedMap || {};
        const scope = getColumnFilterScope(button);
        const wasOpen = menu.classList.contains('open');
        const prevHasClearWrap = Array.from(menu.children).some(el => el.classList && el.classList.contains('column-filter-clear-wrap'));
        let usableDefinitions = normalizeColumnFilterDefinitionList(definitions);
        if (discriminationContext) {
            usableDefinitions = stripNonDiscriminatoryColumnFilters(usableDefinitions, discriminationContext);
        }

        let prunedSelection = false;
        usableDefinitions.forEach(d => {
            const canCol = d.filterable !== false && d.values.length > 0;
            if (canCol) return;
            const cur = selected[d.key];
            if (cur === undefined) return;
            const isAll = Array.isArray(cur) && cur.includes('all');
            if (isAll) return;
            selected[d.key] = ['all'];
            prunedSelection = true;
        });
        if (scope) applyHiddenColumnsToTable(scope);

        syncColumnFilterVisualState(button, menu, usableDefinitions, selected, onChange);

        menu.classList.toggle('skip-animation', wasOpen);
        menu.classList.toggle('skip-submenu-animation', wasOpen);

        if (!menu._hasResizeListener) {
            window.addEventListener('resize', () => {
                if (menu.classList.contains('open') && typeof menu._reRender === 'function') {
                    menu._reRender();
                }
            });
            menu._hasResizeListener = true;
        }
        menu._reRender = () => {
            renderColumnFilterMenu(button, menu, definitions, selectedMap, onChange, activeKey, discriminationContext);
        };

        const closeMenu = () => {
            closeOpenSelectDropdowns();
            menu.classList.remove('open');
            menu.classList.remove('skip-animation');
            menu.classList.remove('skip-submenu-animation');
            menu.querySelectorAll('.column-filter-item').forEach(node => node.classList.remove('active'));
            button.setAttribute('aria-expanded', 'false');
            Utils.syncPageScrollLock(false);
            syncColumnFilterVisualState(button, menu, usableDefinitions, selected, onChange);
            if (typeof window.syncDropdownScrollLock === 'function') window.syncDropdownScrollLock();
        };

        const prevSubmenuClearByKey = new Map();
        menu.querySelectorAll('.column-filter-item').forEach(itemNode => {
            const k = itemNode.dataset.filterKey;
            if (k && itemNode.querySelector('.column-filter-submenu .column-filter-clear-wrap')) {
                prevSubmenuClearByKey.set(k, true);
            }
        });

        menu.innerHTML = '';

        const activateDefinition = (definitionKey) => {
            if (menu.dataset.ignoreSubmenuHover === 'true') return;
            const definition = usableDefinitions.find(def => def.key === definitionKey);
            const canFilter = !!(definition && definition.filterable !== false && definition.values.length > 0);
            if (!canFilter) {
                menu.querySelectorAll('.column-filter-item').forEach(node => node.classList.remove('active'));
                return;
            }
            const currentActiveKey = menu.querySelector('.column-filter-item.active')?.dataset.filterKey;
            if (definitionKey !== currentActiveKey) menu.classList.remove('skip-submenu-animation');
            menu.querySelectorAll('.column-filter-item').forEach(node => {
                if (node.dataset.filterKey === definitionKey) node.classList.add('active');
                else node.classList.remove('active');
            });
        };

        const closeAllColumnFilterSubmenus = () => {
            if (menu.dataset.ignoreSubmenuHover === 'true') return;
            menu.querySelectorAll('.column-filter-item').forEach(node => node.classList.remove('active'));
        };

        const isInteractableColumnFilterControlTarget = target => {
            if (!target || typeof target.closest !== 'function') return false;
            const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
            if (!el) return false;
            if (el.closest('.column-filter-label-actions')) return true;
            const ind = el.closest('.column-filter-menu-indicator');
            if (ind && !ind.classList.contains('is-disabled')) return true;
            const vis = el.closest('.column-visibility-toggle');
            if (vis && !vis.disabled) return true;
            return false;
        };

        const isColumnFilterLabelKeyboardSubmenuTarget = target => {
            if (!target || typeof target.closest !== 'function') return false;
            const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
            if (!el) return false;
            if (el.classList && el.classList.contains('column-filter-column-label')) return true;
            return !!(el.closest && el.closest('.column-filter-label-text'));
        };

        usableDefinitions.forEach(definition => {
            const item = document.createElement('div');
            item.className = 'column-filter-item';
            item.dataset.filterKey = definition.key;
            const canFilter = definition.filterable !== false && definition.values.length > 0;
            if (activeKey && definition.key === activeKey && canFilter) item.classList.add('active');
            const definitionIsActive = isActiveColumnFilterSelection(selected, definition.key);

            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'column-filter-column-label';
            label.classList.toggle('has-active-filter', definitionIsActive);
            label.classList.toggle('is-non-filterable', !canFilter);

            const labelText = document.createElement('span');
            labelText.className = 'column-filter-label-text';
            labelText.textContent = definition.label;

            const labelIndicator = document.createElement('span');
            labelIndicator.className = `column-filter-menu-indicator${definitionIsActive ? ' is-active' : ''}`;
            labelIndicator.classList.toggle('is-disabled', !canFilter);
            labelIndicator.setAttribute('aria-hidden', 'true');

            labelIndicator.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                if (!canFilter) return;
                if (!labelIndicator.classList.contains('is-active')) return;

                delete selected[definition.key];
                onChange();
                renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, undefined, discriminationContext);
            });
            if (canFilter) {
                labelIndicator.addEventListener('mouseenter', closeAllColumnFilterSubmenus);
            }

            const labelActions = document.createElement('span');
            labelActions.className = 'column-filter-label-actions';
            if (canFilter) labelActions.appendChild(labelIndicator);

            const columnIndex = getColumnIndexForScopeKey(scope, definition.key);
            if (columnIndex > 0) {
                let isCssHidden = false;
                const table = getTableForScope(scope);
                if (table) {
                    const th = table.querySelector(`thead th:nth-child(${columnIndex})`);
                    if (th) {
                        const originalDisplay = th.style.display;
                        th.style.display = '';
                        if (window.getComputedStyle(th).display === 'none') {
                            isCssHidden = true;
                        }
                        th.style.display = originalDisplay;
                    }
                }

                const hidden = isCssHidden || isColumnHidden(scope, definition.key);
                const allowHide = isCssHidden ? false : canHideColumn(scope, definition.key);
                const toggleButton = document.createElement('button');
                toggleButton.type = 'button';
                toggleButton.className = `column-visibility-toggle${hidden ? ' is-hidden' : ''}`;
                toggleButton.setAttribute('aria-label', hidden ? 'Show column' : 'Hide column');
                toggleButton.setAttribute('aria-pressed', hidden ? 'false' : 'true');
                toggleButton.classList.toggle('is-locked', !allowHide);
                if (!allowHide) toggleButton.disabled = true;
                toggleButton.innerHTML = `<span class="column-visibility-icon icon-eye" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" focusable="false"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg></span><span class="column-visibility-icon icon-eye-off" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" focusable="false"><path d="M10.733 5.076A10.744 10.744 0 0 1 12 5c4.3 0 7.93 2.75 9.338 6.594a1 1 0 0 1 0 .812 10.75 10.75 0 0 1-1.433 2.497"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499A10.75 10.75 0 0 1 12 19c-4.3 0-7.93-2.75-9.338-6.594a1 1 0 0 1 0-.812 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg></span>`;
                toggleButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (!allowHide) return;
                    setColumnHidden(scope, definition.key, !isColumnHidden(scope, definition.key));
                    applyHiddenColumnsToTable(scope);
                    renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, definition.key, discriminationContext);
                });
                if (allowHide) {
                    toggleButton.addEventListener('mouseenter', closeAllColumnFilterSubmenus);
                    toggleButton.addEventListener('focusin', closeAllColumnFilterSubmenus);
                }
                labelActions.appendChild(toggleButton);
            }

            const handleColumnFilterLabelPointerForSubmenu = (ev) => {
                if (isInteractableColumnFilterControlTarget(ev.target)) return;
                const actions = label.querySelector('.column-filter-label-actions');
                if (actions) {
                    const split = actions.getBoundingClientRect().left - 2;
                    if (ev.clientX >= split) {
                        closeAllColumnFilterSubmenus();
                        return;
                    }
                }
                activateDefinition(definition.key);
            };

            label.addEventListener('mouseenter', handleColumnFilterLabelPointerForSubmenu);
            label.addEventListener('mousemove', handleColumnFilterLabelPointerForSubmenu);

            label.appendChild(labelText);
            label.appendChild(labelActions);
            item.appendChild(label);

            const subMenu = document.createElement('div');
            subMenu.className = 'column-filter-submenu';

            const keySelected = selected[definition.key];
            const isAllMode = keySelected === undefined || (Array.isArray(keySelected) && keySelected.includes('all'));
            const individualValues = definition.values;

            const allRow = document.createElement('label');
            allRow.className = 'column-filter-value-row';
            const allCheckbox = document.createElement('input');
            allCheckbox.type = 'checkbox';
            allCheckbox.checked = isAllMode;
            const allText = document.createElement('span');
            allText.className = 'column-filter-value-text';
            allText.textContent = 'All';
            allRow.appendChild(allCheckbox);
            allRow.appendChild(allText);
            allRow.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                setTimeout(() => {
                    selected[definition.key] = ['all'];
                    onChange();
                    renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, definition.key, discriminationContext);
                }, 0);
            });
            subMenu.appendChild(allRow);

            individualValues.forEach(value => {
                const row = document.createElement('label');
                row.className = 'column-filter-value-row';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isAllMode || (Array.isArray(keySelected) && keySelected.includes(value));

                const text = document.createElement('span');
                text.className = 'column-filter-value-text';
                text.textContent = value === NONE_FILTER_VALUE ? 'None' : formatFilterValueLabel(value);

                row.appendChild(checkbox);
                row.appendChild(text);

                row.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    setTimeout(() => {
                        let currentValues;
                        if (isAllMode) {
                            currentValues = [value];
                        } else {
                            currentValues = Array.from(Array.isArray(keySelected) ? keySelected : []);
                            const idx = currentValues.indexOf(value);
                            if (idx >= 0) currentValues.splice(idx, 1);
                            else currentValues.push(value);
                        }
                        if (currentValues.length === 0) {
                            selected[definition.key] = ['all'];
                        } else if (currentValues.length === individualValues.length) {
                            selected[definition.key] = ['all'];
                        } else {
                            selected[definition.key] = currentValues;
                        }
                        onChange();
                        renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, definition.key, discriminationContext);
                    }, 0);
                });

                subMenu.appendChild(row);
            });

            if (isActiveColumnFilterSelection(selected, definition.key)) {
                const clearWrap = document.createElement('div');
                clearWrap.className = 'column-filter-clear-wrap';
                const prevHadSubmenuClear = prevSubmenuClearByKey.get(definition.key);
                if (!wasOpen) {
                    clearWrap.classList.add('is-pending-reveal');
                } else if (!prevHadSubmenuClear) {
                    clearWrap.classList.add('is-revealing');
                }

                const clearButton = document.createElement('button');
                clearButton.type = 'button';
                clearButton.className = 'column-filter-clear-button';
                clearButton.style.display = 'flex';
                clearButton.style.alignItems = 'center';
                clearButton.style.justifyContent = 'flex-start';
                clearButton.style.gap = '8px';
                clearButton.style.paddingLeft = '8px';
                clearButton.style.paddingRight = '8px';
                clearButton.style.textAlign = 'left';

                const textSpan = document.createElement('span');
                textSpan.className = 'column-filter-clear-text';
                textSpan.textContent = 'Clear Column Filter';

                const iconWrap = document.createElement('span');
                iconWrap.className = 'tool-icon-wrap';
                iconWrap.style.width = '18px';
                iconWrap.style.height = '18px';
                iconWrap.style.minWidth = '18px';
                iconWrap.style.marginLeft = 'auto';
                iconWrap.style.display = 'flex';
                iconWrap.style.alignItems = 'center';
                iconWrap.style.justifyContent = 'center';
                iconWrap.innerHTML = `
            <svg class="tool-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M18 6 6 18 M6 6 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>`;

                clearButton.appendChild(textSpan);
                clearButton.appendChild(iconWrap);

                clearButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    setTimeout(() => {
                        delete selected[definition.key];
                        onChange();
                        renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, undefined, discriminationContext);
                        closeMenu();
                    }, 0);
                });

                clearWrap.appendChild(clearButton);
                subMenu.appendChild(clearWrap);
            }

            item.appendChild(subMenu);
            subMenu.addEventListener('mouseleave', (ev) => {
                if (menu.dataset.ignoreSubmenuHover === 'true') return;
                if (!isActiveColumnFilterSelection(selected, definition.key)) return;
                const next = ev.relatedTarget;
                if (next && menu.contains(next)) return;
                closeMenu();
                if (typeof window.syncDropdownScrollLock === 'function') window.syncDropdownScrollLock();
            });
            item.addEventListener('mouseenter', (ev) => {
                if (ev.target.closest?.('.column-filter-submenu')) return;
                if (ev.target !== label && !label.contains(ev.target)) return;
                handleColumnFilterLabelPointerForSubmenu(ev);
            });
            item.addEventListener('mousemove', (ev) => {
                if (ev.target.closest?.('.column-filter-submenu')) return;
                if (ev.target !== label && !label.contains(ev.target)) return;
                handleColumnFilterLabelPointerForSubmenu(ev);
            });
            item.addEventListener('focusin', (ev) => {
                if (isInteractableColumnFilterControlTarget(ev.target)) {
                    closeAllColumnFilterSubmenus();
                    return;
                }
                if (!isColumnFilterLabelKeyboardSubmenuTarget(ev.target)) return;
                activateDefinition(definition.key);
            });
            menu.appendChild(item);
        });

        const hasAnyActive = hasActiveColumnFilters(usableDefinitions, selected);
        if (hasAnyActive) {
            const clearWrap = document.createElement('div');
            clearWrap.className = 'column-filter-clear-wrap';
            if (!wasOpen) clearWrap.classList.add('is-pending-reveal');
            else if (!prevHasClearWrap) clearWrap.classList.add('is-revealing');

            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'column-filter-clear-button';
            clearButton.style.display = 'flex';
            clearButton.style.alignItems = 'center';
            clearButton.style.justifyContent = 'flex-start';
            clearButton.style.gap = '8px';
            clearButton.style.paddingLeft = '8px';
            clearButton.style.paddingRight = '8px';
            clearButton.style.textAlign = 'left';

            const iconWrap = document.createElement('span');
            iconWrap.className = 'tool-icon-wrap';
            iconWrap.style.width = '18px';
            iconWrap.style.height = '18px';
            iconWrap.style.minWidth = '18px';
            iconWrap.style.marginLeft = 'auto';
            iconWrap.style.display = 'flex';
            iconWrap.style.alignItems = 'center';
            iconWrap.style.justifyContent = 'center';
            iconWrap.innerHTML = `
            <svg class="tool-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M18 6 6 18 M6 6 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>`;

            const textSpan = document.createElement('span');
            textSpan.className = 'column-filter-clear-text';
            textSpan.textContent = 'Clear All Filters';

            clearButton.appendChild(textSpan);
            clearButton.appendChild(iconWrap);

            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                resetColumnFilterSelections(usableDefinitions, selected);
                onChange();
                renderColumnFilterMenu(button, menu, usableDefinitions, selected, onChange, undefined, discriminationContext);
                closeMenu();
            });

            clearWrap.appendChild(clearButton);
            menu.appendChild(clearWrap);
        }

        if (!menu.dataset.boundColumnFilterMenu) {
            menu.dataset.boundColumnFilterMenu = 'true';
            menu.dataset.submenuHovered = 'false';
            menu.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            menu.addEventListener('mouseover', (event) => {
                if (event.target && event.target.closest('.column-filter-submenu')) {
                    menu.dataset.submenuHovered = 'true';
                }
            });
            menu.addEventListener('mouseleave', () => {
                closeMenu();
                if (typeof window.syncDropdownScrollLock === 'function') window.syncDropdownScrollLock();
            });
        }

        if (!button.dataset.boundColumnFilter) {
            button.dataset.boundColumnFilter = 'true';
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = menu.classList.contains('open');
                document.querySelectorAll('.custom-select-container, .multi-select-container').forEach(container => {
                    container.classList.remove('open');
                });
                closeAllColumnFilterMenus();
                syncDropdownScrollLock();
                if (usableDefinitions.length === 0) return;
                if (isOpen) return;
                runColumnFilterMenuOpen(button, menu, { resetActiveColumn: true });
            });
        }

        if (prunedSelection && typeof onChange === 'function') {
            onChange();
        }
    };

    const getSkillsColumnFilterDefinitions = () => {
        const certifiedSkills = getSkillsRowsForColumnFilter();
        return [
            {
                key: 'name',
                label: 'Name',
                filterable: false,
                values: []
            },
            {
                key: 'type',
                label: 'Category',
                filterable: true,
                values: certifiedSkills.map(skill => toText(skill.badge))
            }
        ];
    };

    const renderSkillColumnFilter = () => {
        if (!state.isSkillsPage || !state.skillsFilterButton || !state.skillsFilterMenu) return;
        const definitions = getSkillsColumnFilterDefinitions();
        const discriminationContext = { kind: 'skills', skills: getSkillsRowsForColumnFilter() };
        renderColumnFilterMenu(
            state.skillsFilterButton,
            state.skillsFilterMenu,
            definitions,
            state.selectedSkillColumnValues,
            () => state.filterSkills && state.filterSkills(),
            undefined,
            discriminationContext
        );
    };

    const renderPortfolioColumnFilter = (projects) => {
        if (!state.isPortfolioPage || !state.portfolioFilterButton || !state.portfolioFilterMenu) return;
        if (!(state.currentRoute === '/videos' || state.currentRoute === '/games')) return;

        const list = Array.isArray(projects) ? projects : [];
        const definitions = [
            {
                key: 'type',
                label: 'Category',
                values: list.map(project => toText(project.badge))
            },
            {
                key: 'tools',
                label: 'Tools',
                values: list.flatMap(project => {
                    const rawTools = toText(project.tools);
                    if (!rawTools) return [''];
                    return rawTools.split(',').map(value => toText(value));
                })
            }
        ];

        if (!('type' in state.selectedPortfolioColumnValues)) state.selectedPortfolioColumnValues.type = ['all'];
        if (!('tools' in state.selectedPortfolioColumnValues)) state.selectedPortfolioColumnValues.tools = ['all'];

        const discriminationContext = { kind: 'portfolio', projects: list };
        renderColumnFilterMenu(
            state.portfolioFilterButton,
            state.portfolioFilterMenu,
            definitions,
            state.selectedPortfolioColumnValues,
            () => {
                const selectedByColumn = state.selectedPortfolioColumnValues || {};
                state.selectedCategories = Array.isArray(selectedByColumn.type) ? [...selectedByColumn.type] : ['all'];
                state.selectedTools = Array.isArray(selectedByColumn.tools) ? [...selectedByColumn.tools] : ['all'];
                if (!('type' in selectedByColumn)) state.selectedCategories = ['all'];
                if (!('tools' in selectedByColumn)) state.selectedTools = ['all'];
                if (state.filterCards) state.filterCards();
            },
            undefined,
            discriminationContext
        );
    };

    const syncTableSortButtons = (scope, sortKey, sortOrder) => {
        document.querySelectorAll(`.table-sort-header[data-sort-scope="${scope}"]`).forEach(header => {
            const isColumnActive = header.dataset.sortKey === sortKey && !!sortOrder;
            header.classList.toggle('is-active', isColumnActive);
            header.dataset.activeOrder = isColumnActive ? sortOrder : '';
            header.setAttribute('aria-pressed', isColumnActive ? 'true' : 'false');
            header.querySelectorAll('.table-sort-button').forEach(indicator => {
                const indicatorOrder = indicator.dataset.sortOrder || '';
                indicator.classList.toggle('is-active', isColumnActive && indicatorOrder === sortOrder);
            });
        });
    };

    const getDefaultSortState = (scope) => {
        if (scope === 'courses') return { sortKey: 'status', sortOrder: 'asc' };
        if (scope === 'skills') return { sortKey: 'name', sortOrder: 'asc' };
        return { sortKey: null, sortOrder: null };
    };

    const isDefaultSortState = (scope, sortKey, sortOrder) => {
        const defaultState = getDefaultSortState(scope);
        return defaultState.sortKey === sortKey && defaultState.sortOrder === sortOrder;
    };

    const getNextSortState = (scope, currentKey, currentOrder, targetKey) => {
        const defaultState = getDefaultSortState(scope);
        if (!targetKey) return defaultState;
        if (currentKey !== targetKey || !currentOrder) {
            return { sortKey: targetKey, sortOrder: 'asc' };
        }
        if (targetKey === defaultState.sortKey) {
            return {
                sortKey: targetKey,
                sortOrder: currentOrder === 'asc' ? 'desc' : 'asc'
            };
        }
        if (currentOrder === 'asc') {
            return { sortKey: targetKey, sortOrder: 'desc' };
        }
        return {
            sortKey: defaultState.sortKey,
            sortOrder: defaultState.sortOrder
        };
    };

    const bindSkillTableSortButtons = () => {
        document.querySelectorAll('.table-sort-header[data-sort-scope="skills"]').forEach(header => {
            if (header.dataset.boundSortClick === 'true') return;
            header.dataset.boundSortClick = 'true';
            const toggleSort = () => {
                const nextState = getNextSortState('skills', state.selectedSort, state.selectedOrder, header.dataset.sortKey || '');
                state.selectedSort = nextState.sortKey;
                state.selectedOrder = nextState.sortOrder;
                if (state.sortSkills) state.sortSkills();
                if (state.syncSkillSortIndicators) state.syncSkillSortIndicators();
            };
            header.addEventListener('click', () => {
                toggleSort();
            });
            header.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleSort();
            });
        });
    };

    const bindCourseTableSortButtons = () => {
        document.querySelectorAll('.table-sort-header[data-sort-scope="courses"]').forEach(header => {
            if (header.dataset.boundSortClick === 'true') return;
            header.dataset.boundSortClick = 'true';
            const toggleSort = () => {
                const nextState = getNextSortState('courses', state.selectedCourseSort, state.selectedCourseOrder, header.dataset.sortKey || '');
                state.selectedCourseSort = nextState.sortKey;
                state.selectedCourseOrder = nextState.sortOrder;
                applyCoursesFilterAndSort();
                if (state.syncCourseSortIndicators) state.syncCourseSortIndicators();
            };
            header.addEventListener('click', () => {
                toggleSort();
            });
            header.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleSort();
            });
        });
    };

    const parseCourseLanguagesUsedRaw = raw => {
        const s = toText(raw);
        if (!s) return [];
        return s
            .split(/[\n,;|]+/g)
            .map(part => toText(part).replace(/^[-*]\s*/, '').trim())
            .filter(Boolean)
            .reduce(
                (acc, lang) => {
                    const key = lang.toLowerCase();
                    if (!acc.seen.has(key)) {
                        acc.seen.add(key);
                        acc.items.push(lang);
                    }
                    return acc;
                },
                { seen: new Set(), items: [] }
            ).items;
    };

    const appendSoftwareLanguageTagsToContainer = (container, langStrings, skillToolsContext, options) => {
        if (!container) return;
        container.innerHTML = '';
        const list = Array.isArray(langStrings) ? langStrings : [];
        if (!list.length) return;
        const opts = options && typeof options === 'object' ? options : {};
        const nonInteractiveSkillName = String(opts.nonInteractiveSkillName || '').trim().toLowerCase();
        const disableSkillModalLinks = opts.disableSkillModalLinks === true;
        const skills = state.allData && state.allData.skills ? state.allData.skills : [];
        const modalManager = state.modalManager;
        const toolsCtx = Array.isArray(skillToolsContext) && skillToolsContext.length ? skillToolsContext : list;

        const languageEntries = list.map((lang) => {
            const langLower = lang.toLowerCase();
            const skillMatch = skills.find(sk => String(sk.name || '').toLowerCase() === langLower)
                || skills.find(sk => String(sk.name || '').toLowerCase().includes(langLower))
                || skills.find(sk => langLower.includes(String(sk.name || '').toLowerCase()));
            const fixedSrc = (skillMatch && skillMatch.icon)
                ? (modalManager && typeof modalManager.fixImagePath === 'function'
                    ? modalManager.fixImagePath(skillMatch.icon)
                    : skillMatch.icon)
                : '';
            return { lang, skillMatch, fixedSrc };
        });

        languageEntries.forEach(({ lang, skillMatch, fixedSrc }) => {
            const tag = document.createElement('span');
            tag.className = 'software-tag';

            const isSelf = !!(nonInteractiveSkillName && skillMatch
                && String(skillMatch.name || '').trim().toLowerCase() === nonInteractiveSkillName);
            if (isSelf) {
                tag.classList.add('software-tag-current-skill');
            }

            if (skillMatch && !isSelf && !disableSkillModalLinks) {
                tag.classList.add('clickable-tool');
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!state.openModalForItem) return;
                    state.openModalForItem(skillMatch, 'skill', toolsCtx);
                });
            }

            if (fixedSrc) {
                const iconWrap = document.createElement('span');
                iconWrap.className = 'tool-icon-wrap';
                const icon = document.createElement('img');
                icon.className = 'tool-icon';
                icon.alt = lang.toUpperCase();
                icon.style.opacity = '0';
                let revealed = false;
                const revealIcon = () => {
                    if (revealed) return;
                    revealed = true;
                    if (typeof icon.decode === 'function') {
                        icon.decode().then(() => {
                            icon.style.opacity = '1';
                        }).catch(() => {
                            icon.style.opacity = '1';
                        });
                    } else {
                        requestAnimationFrame(() => {
                            icon.style.opacity = '1';
                        });
                    }
                };
                icon.onload = revealIcon;
                icon.onerror = () => {
                    icon.style.opacity = '0.5';
                };
                icon.src = fixedSrc;
                if (icon.complete && icon.naturalWidth > 0) {
                    revealIcon();
                }
                iconWrap.appendChild(icon);
                tag.appendChild(iconWrap);
            }

            const text = document.createElement('span');
            text.innerText = lang.toUpperCase();
            tag.appendChild(text);

            container.appendChild(tag);
        });
    };

    const languageStringRefersToSkill = (langStr, skillName) => {
        const skills = state.allData && state.allData.skills ? state.allData.skills : [];
        const sn = String(skillName || '').trim().toLowerCase();
        if (!sn) return false;
        const langLower = String(langStr || '').trim().toLowerCase();
        if (!langLower) return false;
        const skillMatch = skills.find(sk => String(sk.name || '').toLowerCase() === langLower)
            || skills.find(sk => String(sk.name || '').toLowerCase().includes(langLower))
            || skills.find(sk => langLower.includes(String(sk.name || '').toLowerCase()));
        return !!(skillMatch && String(skillMatch.name || '').trim().toLowerCase() === sn);
    };

    const getCourseProjectRowsForSkill = (skillName) => {
        const projects = Array.isArray(state.allData?.['Course Projects']) ? state.allData['Course Projects'] : [];
        const sn = String(skillName || '').trim().toLowerCase();
        if (!sn) return [];
        return projects.filter(row => {
            const list = parseCourseLanguagesUsedRaw(row.languagesUsed || row.languagesused);
            return list.some(lang => languageStringRefersToSkill(lang, sn));
        });
    };

    const getAggregatedCourseProjectLanguagesForSkill = (skillName) => {
        const rows = getCourseProjectRowsForSkill(skillName);
        const aggregated = [];
        const seen = new Set();
        rows.forEach(row => {
            parseCourseLanguagesUsedRaw(row.languagesUsed || row.languagesused).forEach(lang => {
                const key = String(lang).trim().toLowerCase();
                if (!key || seen.has(key)) return;
                seen.add(key);
                aggregated.push(String(lang).trim());
            });
        });
        return aggregated;
    };

    const normalizeCourses = (rows) => {
        return (Array.isArray(rows) ? rows : []).map((row, index) => {
            const id = toText(row.id || row.courseid);
            const name = toText(row.name);
            const school = toText(row.school);
            const type = toText(row.type);
            const info = toText(row.info);
            const status = toText(row.status);
            const grade = toText(row.grade);
            const credits = toText(row.creditsearned || row.credits || row.creditsEarned);
            const completionYear = toText(row.completionyear || row.completionYear || row.year || row.completion);
            const languagesUsed = toText(row.languagesUsed || row.languagesused);
            return { id, name, school, type, info, status, completionYear, grade, credits, languagesUsed, originalIndex: index };
        }).filter(course => course.id || course.name || course.school || course.type || course.status || course.grade || course.credits || course.info || course.languagesUsed);
    };

    const sortCourses = (courses) => {
        const sortKey = state.selectedCourseSort || 'id';
        const sortOrder = state.selectedCourseOrder || 'asc';
        const sorted = [...courses];
        if (!state.selectedCourseSort || !state.selectedCourseOrder) {
            sorted.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
            return sorted;
        }
        const statusOrder = {
            completed: 0,
            'in progress': 1,
            upcoming: 2
        };

        const valueFor = (course, key) => {
            if (key === 'status') {
                const normalized = toText(course.status).toLowerCase();
                return normalized in statusOrder ? statusOrder[normalized] : Number.MAX_SAFE_INTEGER;
            }
            if (key === 'credits') {
                const numeric = Number.parseFloat(toText(course.credits || ''));
                return Number.isFinite(numeric) ? numeric : null;
            }
            if (key === 'completionyear' || key === 'completionYear') {
                const numeric = Number.parseInt(toText(course.completionYear || course.completionyear || ''), 10);
                return Number.isFinite(numeric) ? numeric : null;
            }
            return toText(course[key]).toLowerCase();
        };

        sorted.sort((a, b) => {
            const aValue = valueFor(a, sortKey);
            const bValue = valueFor(b, sortKey);

            const isMissing = (v) => v === null || v === undefined || (typeof v === 'string' && String(v).trim() === '');

            if (isMissing(aValue) && isMissing(bValue)) return (a.name || '').localeCompare(b.name || '');
            if (isMissing(aValue)) return 1;
            if (isMissing(bValue)) return -1;

            if (aValue === bValue) return (a.name || '').localeCompare(b.name || '');

            if (sortOrder === 'desc') return aValue > bValue ? -1 : 1;
            return aValue < bValue ? -1 : 1;
        });

        return sorted;
    };

    const getCourseStatusBadgeClass = (status) => {
        const value = toText(status).toLowerCase();
        if (value === 'completed') return 'proficiency-beginner';
        if (value === 'in progress') return 'proficiency-intermediate';
        if (value === 'upcoming') return 'proficiency-advanced';
        return 'proficiency-unknown';
    };

    const getCourseGradeBadgeClass = (grade) => {
        const value = toText(grade).toUpperCase();
        if (!value) return 'proficiency-unknown';
        if (value.startsWith('A') || value === 'P' || value === 'CR') return 'proficiency-beginner';
        if (value.startsWith('B') || value.startsWith('C') || value === 'IP') return 'proficiency-intermediate';
        return 'proficiency-advanced';
    };

    const buildCourseBadge = (value, badgeClass) => {
        const label = toText(value) || '-';
        if (label === '-') return `<span style="color:#8b949e;">-</span>`;
        return `<span class="proficiency-badge ${badgeClass}">${escapeHtml(label)}</span>`;
    };

    const normalizeCourseIdForProjectMatch = (v) => String(v ?? '').trim().toLowerCase();

    const findCourseProjectRowForCourse = (course) => {
        const rows = Array.isArray(state.allData?.['Course Projects']) ? state.allData['Course Projects'] : [];
        const key = normalizeCourseIdForProjectMatch(course?.id);
        if (!key) return null;
        return rows.find(r => {
            const rid = normalizeCourseIdForProjectMatch(r?.id ?? r?.courseid ?? r?.courseId);
            return rid && rid === key;
        }) || null;
    };

    const getCourseNameByCourseId = (courseId) => {
        const key = normalizeCourseIdForProjectMatch(courseId);
        if (!key) return '';
        const rows = normalizeCourses(state.allData?.Courses || []);
        const match = rows.find(c => normalizeCourseIdForProjectMatch(c.id) === key);
        const n = match && String(match.name || '').trim();
        return n || '';
    };

    const coursesLink2IconSvg = `<svg class="courses-link2-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path d="M9 17H7A5 5 0 0 1 7 7h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h2a5 5 0 1 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 12h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const buildCourseNameCellHtml = (course) => {
        const rawName = course?.name;
        const safeName = escapeHtml(rawName && String(rawName).trim() ? rawName : '-');
        const projectRow = findCourseProjectRowForCourse(course);
        const linkRaw = projectRow ? toText(projectRow.link).trim() : '';
        const hasLink = /^https?:\/\//i.test(linkRaw);
        if (!projectRow || !hasLink) {
            return `<span class="courses-name-cell-inner"><span class="courses-name-text">${safeName}</span></span>`;
        }
        const suffix = `<span class="courses-name-featured-suffix"><span class="courses-name-featured-icon">${coursesLink2IconSvg}</span><span class="courses-name-featured-label">Featured project</span></span>`;
        return `<span class="courses-name-cell-inner"><span class="courses-name-text">${safeName}</span>${suffix}</span>`;
    };

    const getLanguageIconUrlsForCourse = (course) => {
        if (!course || !state.modalManager) return [];
        const skills = Array.isArray(state.allData?.skills) ? state.allData.skills : [];
        if (!skills.length) return [];
        const skillsByLowerName = new Map();
        skills.forEach((sk) => {
            const n = sk && String(sk.name || '').trim().toLowerCase();
            if (n && !skillsByLowerName.has(n)) skillsByLowerName.set(n, sk);
        });
        const languageRegex = /Programming Languages Used\s*:\s*([\s\S]*)$/i;
        const langs = new Set();
        parseCourseLanguagesUsedRaw(course.languagesUsed || course.languagesused).forEach((l) => langs.add(l));
        const rawInfo = toText(course.info);
        const match = rawInfo.match(languageRegex);
        if (match) parseCourseLanguagesUsedRaw(match[1]).forEach((l) => langs.add(l));
        const projectRow = findCourseProjectRowForCourse(course);
        if (projectRow) {
            parseCourseLanguagesUsedRaw(projectRow.languagesUsed || projectRow.languagesused).forEach((l) => langs.add(l));
        }
        const urls = new Set();
        langs.forEach((lang) => {
            const langLower = lang.toLowerCase();
            let skill = skillsByLowerName.get(langLower);
            if (!skill) {
                skill = skills.find((sk) => String(sk.name || '').toLowerCase().includes(langLower))
                    || skills.find((sk) => langLower.includes(String(sk.name || '').toLowerCase()));
            }
            if (!skill || !skill.icon) return;
            const fixedSrc = state.modalManager.fixImagePath(skill.icon);
            if (fixedSrc) urls.add(fixedSrc);
        });
        return [...urls];
    };

    const primeCourseRowLanguageIcons = (course) => {
        if (!state.modalManager || !course) return;
        getLanguageIconUrlsForCourse(course).forEach((src) => {
            state.modalManager.preloadImage(src, 4000);
        });
    };

    const preloadProgrammingLanguageIconsForCourses = (coursesRows, projectRows) => {
        if (state.coursesProgrammingLanguageIconsPreloaded) return Promise.resolve();
        if (state.coursesLanguageIconsPreloadPromise) return state.coursesLanguageIconsPreloadPromise;
        if (!state.modalManager) return Promise.resolve();
        const skills = state.allData && Array.isArray(state.allData.skills) ? state.allData.skills : [];
        if (!skills.length) return Promise.resolve();

        const skillsByLowerName = new Map();
        skills.forEach(sk => {
            const n = sk && typeof sk.name !== 'undefined' ? String(sk.name).trim().toLowerCase() : '';
            if (!n) return;
            if (!skillsByLowerName.has(n)) skillsByLowerName.set(n, sk);
        });

        const languageRegex = /Programming Languages Used\s*:\s*([\s\S]*)$/i;
        const languages = new Set();
        (Array.isArray(coursesRows) ? coursesRows : []).forEach(row => {
            parseCourseLanguagesUsedRaw(row && (row.languagesUsed || row.languagesused)).forEach(lang => languages.add(lang));
            const rawInfo = toText(row && row.info);
            const match = rawInfo.match(languageRegex);
            if (match) {
                parseCourseLanguagesUsedRaw(match[1]).forEach(lang => languages.add(lang));
            }
        });
        (Array.isArray(projectRows) ? projectRows : []).forEach(row => {
            parseCourseLanguagesUsedRaw(row && (row.languagesUsed || row.languagesused)).forEach(lang => languages.add(lang));
        });
        if (!languages.size) {
            state.coursesProgrammingLanguageIconsPreloaded = true;
            return Promise.resolve();
        }

        const iconUrls = new Set();
        languages.forEach(lang => {
            const langLower = lang.toLowerCase();
            let skill = skillsByLowerName.get(langLower);
            if (!skill) {
                skill = skills.find(sk => String(sk.name || '').toLowerCase().includes(langLower))
                    || skills.find(sk => langLower.includes(String(sk.name || '').toLowerCase()));
            }
            if (!skill || !skill.icon) return;
            const fixedSrc = state.modalManager && typeof state.modalManager.fixImagePath === 'function'
                ? state.modalManager.fixImagePath(skill.icon)
                : skill.icon;
            if (fixedSrc) iconUrls.add(fixedSrc);
        });

        if (!iconUrls.size) {
            state.coursesProgrammingLanguageIconsPreloaded = true;
            return Promise.resolve();
        }

        const urls = [...iconUrls];
        const timeoutMs = 4000;
        state.coursesLanguageIconsPreloadPromise = Promise.all(
            urls.map(src => state.modalManager.preloadImage(src, timeoutMs))
        ).then(() => {
            state.coursesProgrammingLanguageIconsPreloaded = true;
        }).finally(() => {
            state.coursesLanguageIconsPreloadPromise = null;
        });
        return state.coursesLanguageIconsPreloadPromise;
    };

    const renderCoursesTable = () => {
        if (!state.coursesTableBody) return;
        const coursesShell = state.coursesTableBody.closest('.courses-table-shell');
        lockTableShellHeight(coursesShell);
        applyHiddenColumnsToTable('courses');
        const coursesTableEl = document.getElementById('courses-table');
        if (coursesTableEl) {
            coursesTableEl.querySelector('colgroup')?.remove();
            coursesTableEl.classList.remove('table-fit', 'table-fit-nowrap');
            coursesTableEl.style.width = '';
            coursesTableEl.style.minWidth = '';
            coursesTableEl.style.tableLayout = '';
        }
        const courses = state.filteredCourses;
        const coursesTotalAll = normalizeCourses(state.allData?.Courses || []).length;
        if (state.filterManager) {
            state.filterManager.updateFilterResultsLine('courses-filter-results-count', courses.length, coursesTotalAll, 'courses', 'course');
        }

        if (!courses.length) {
            const emptyMsg = 'No courses match the current filters.';
            const statusEl = document.getElementById('courses-search-status');
            state.coursesTableBody.innerHTML = `<tr><td colspan="8" class="courses-loading-row">${emptyMsg}</td></tr>`;
            if (statusEl) {
                statusEl.classList.add('visible');
                const rawQuery = state.courseSearchQuery ? state.courseSearchQuery.trim() : '';
                if (rawQuery) {
                    const safe = rawQuery.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    statusEl.innerHTML = `Showing results for "<span style="color:#58a6ff;">${safe}</span>"`;
                } else {
                    statusEl.innerHTML = emptyMsg;
                }
            }
            lockTableShellHeight(coursesShell);
            applyHiddenColumnsToTable('courses');
            return;
        }

        state.coursesTableBody.innerHTML = courses.map((course, index) => {
            const statusBadge = buildCourseBadge(course.status || '-', getCourseStatusBadgeClass(course.status));
            const gradeBadge = buildCourseBadge(course.grade || '-', getCourseGradeBadgeClass(course.grade));
            const rowClasses = ['course-row'];
            if (index === courses.length - 1 && courses.length === coursesTotalAll) rowClasses.push('last-visible-row');
            return `
                <tr class="${rowClasses.join(' ')}" data-course-index="${index}">
                    <td>${escapeHtml(course.id || '-')}</td>
                    <td class="courses-name-cell">${buildCourseNameCellHtml(course)}</td>
                    <td>${escapeHtml(course.school || '-')}</td>
                    <td>${escapeHtml(course.type || '-')}</td>
                    <td>${statusBadge}</td>
                    <td>${course.credits ? escapeHtml(course.credits) : '<span style="color:#8b949e;">-</span>'}</td>
                    <td>${course.completionYear ? escapeHtml(course.completionYear) : '<span style="color:#8b949e;">-</span>'}</td>
                    <td>${gradeBadge}</td>
                </tr>`;
        }).join('');

        state.coursesTableBody.querySelectorAll('.course-row').forEach(row => {
            const primeRowIcons = () => {
                const index = Number.parseInt(row.getAttribute('data-course-index') || '-1', 10);
                const course = Number.isFinite(index) && index >= 0 ? courses[index] : null;
                if (course) primeCourseRowLanguageIcons(course);
            };
            row.addEventListener('pointerenter', primeRowIcons);
            row.addEventListener('pointerdown', primeRowIcons);
        });

        const statusEl = document.getElementById('courses-search-status');
        if (statusEl) {
            const rawQuery = state.courseSearchQuery ? state.courseSearchQuery.trim() : '';
            if (rawQuery) {
                const safe = rawQuery.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                statusEl.classList.add('visible');
                statusEl.innerHTML = `Showing results for "<span style="color:#58a6ff;">${safe}</span>"`;
            } else {
                statusEl.classList.remove('visible');
                statusEl.innerHTML = '';
            }
        }
        lockTableShellHeight(coursesShell);
        applyHiddenColumnsToTable('courses');

    };

    const applyCoursesFilterAndSort = () => {
        const courses = normalizeCourses(state.allData?.Courses || []);
        const selectedByColumn = state.selectedCourseColumnValues || {};
        const query = toText(state.courseSearchQuery).toLowerCase();

        const filtered = courses.filter(course => {
            const matchesColumn = (key, courseValue) => {
                const values = selectedByColumn[key];
                if (values === undefined) return true;
                if (Array.isArray(values) && values.includes('all')) return true;
                if (!Array.isArray(values) || values.length === 0) return false;
                const normalizedValue = toText(courseValue) || NONE_FILTER_VALUE;
                return values.includes(normalizedValue);
            };
            if (!matchesColumn('school', course.school)) return false;
            if (!matchesColumn('type', course.type)) return false;
            if (!matchesColumn('status', course.status)) return false;
            if (!matchesColumn('completionYear', course.completionYear)) return false;
            if (!matchesColumn('grade', course.grade)) return false;

            if (!query) return true;
            const proj = findCourseProjectRowForCourse(course);
            const projBlob = proj
                ? `${toText(proj.name)} ${toText(proj.info)} ${toText(proj.link)} featured project`.toLowerCase()
                : '';
            const searchBlob = `${course.id} ${course.name} ${course.school} ${course.type} ${course.info} ${course.languagesUsed || ''} ${course.status} ${course.completionYear || ''} ${course.grade} ${course.credits} ${projBlob}`.toLowerCase();
            return searchBlob.includes(query);
        });

        state.filteredCourses = sortCourses(filtered);
        renderCoursesTable();
    };

    state.applyCoursesFilterAndSort = applyCoursesFilterAndSort;

    const renderCoursesColumnFilter = (activeKey) => {
        if (!state.coursesFilterButton || !state.coursesFilterMenu) return;
        const onChange = state.applyCoursesFilterAndSort;
        if (!onChange) return;
        const courses = normalizeCourses(state.allData?.Courses || []);
        const definitions = [
            { key: 'id', label: 'ID', filterable: false, values: [] },
            { key: 'name', label: 'Name', filterable: false, values: [] },
            { key: 'school', label: 'School', values: courses.map(course => course.school) },
            { key: 'type', label: 'Type', values: courses.map(course => course.type) },
            { key: 'status', label: 'Status', values: courses.map(course => course.status) },
            { key: 'credits', label: 'Credits', filterable: false, values: [] },
            { key: 'completionYear', label: 'Year', values: courses.map(course => course.completionYear) },
            { key: 'grade', label: 'Grade', values: courses.map(course => course.grade) }
        ];
        const discriminationContext = { kind: 'courses', courses };
        renderColumnFilterMenu(
            state.coursesFilterButton,
            state.coursesFilterMenu,
            definitions,
            state.selectedCourseColumnValues,
            onChange,
            activeKey,
            discriminationContext
        );
    };

    const openHeaderColumnFilterFlyout = (scope, filterKey, anchorEl) => {
        if (!filterKey || !anchorEl) return;

        let getDefinitions;
        let selectedMap;
        let finalize;
        let discriminationCtx = null;

        if (scope === 'skills') {
            getDefinitions = getSkillsColumnFilterDefinitions;
            selectedMap = state.selectedSkillColumnValues;
            discriminationCtx = { kind: 'skills', skills: getSkillsRowsForColumnFilter() };
            finalize = () => {
                if (state.filterSkills) state.filterSkills();
                renderSkillColumnFilter();
            };
        } else if (scope === 'courses') {
            getDefinitions = () => {
                const courses = normalizeCourses(state.allData?.Courses || []);
                return [
                    { key: 'id', label: 'ID', filterable: false, values: [] },
                    { key: 'name', label: 'Name', filterable: false, values: [] },
                    { key: 'school', label: 'School', values: courses.map(course => course.school) },
                    { key: 'type', label: 'Type', values: courses.map(course => course.type) },
                    { key: 'status', label: 'Status', values: courses.map(course => course.status) },
                    { key: 'credits', label: 'Credits', filterable: false, values: [] },
                    { key: 'completionYear', label: 'Year', values: courses.map(course => course.completionYear) },
                    { key: 'grade', label: 'Grade', values: courses.map(course => course.grade) }
                ];
            };
            selectedMap = state.selectedCourseColumnValues;
            discriminationCtx = { kind: 'courses', courses: normalizeCourses(state.allData?.Courses || []) };
            finalize = () => {
                if (state.applyCoursesFilterAndSort) state.applyCoursesFilterAndSort();
                renderCoursesColumnFilter();
            };
        } else if (scope === 'portfolio') {
            if (!(state.currentRoute === '/videos' || state.currentRoute === '/games')) return;
            const pageType = state.currentRoute === '/games' ? 'games' : 'videos';
            discriminationCtx = {
                kind: 'portfolio',
                projects: Array.isArray(state.allData?.[pageType]) ? state.allData[pageType] : []
            };
            getDefinitions = () => {
                const list = Array.isArray(state.allData?.[pageType]) ? state.allData[pageType] : [];
                return [
                    {
                        key: 'type',
                        label: 'Category',
                        values: list.map(project => toText(project.badge))
                    },
                    {
                        key: 'tools',
                        label: 'Tools',
                        values: list.flatMap(project => {
                            const rawTools = toText(project.tools);
                            if (!rawTools) return [''];
                            return rawTools.split(',').map(value => toText(value));
                        })
                    }
                ];
            };
            selectedMap = state.selectedPortfolioColumnValues;
            if (!('type' in state.selectedPortfolioColumnValues)) state.selectedPortfolioColumnValues.type = ['all'];
            if (!('tools' in state.selectedPortfolioColumnValues)) state.selectedPortfolioColumnValues.tools = ['all'];
            finalize = () => {
                const selectedByColumn = state.selectedPortfolioColumnValues || {};
                state.selectedCategories = Array.isArray(selectedByColumn.type) ? [...selectedByColumn.type] : ['all'];
                state.selectedTools = Array.isArray(selectedByColumn.tools) ? [...selectedByColumn.tools] : ['all'];
                if (!('type' in selectedByColumn)) state.selectedCategories = ['all'];
                if (!('tools' in selectedByColumn)) state.selectedTools = ['all'];
                if (state.filterCards) state.filterCards();
                const list = Array.isArray(state.allData?.[pageType]) ? state.allData[pageType] : [];
                renderPortfolioColumnFilter(list);
            };
        } else {
            return;
        }

        const usable = stripNonDiscriminatoryColumnFilters(normalizeColumnFilterDefinitionList(getDefinitions()), discriminationCtx);
        const definition = usable.find(d => d.key === filterKey);
        if (!definition) return;
        if (definition.filterable === false || definition.values.length === 0) return;

        closeAllColumnFilterMenus();

        const flyout = getHeaderColumnFilterFlyout();
        const rerender = () => {
            flyout.classList.toggle('skip-submenu-animation', flyout.classList.contains('open'));
            const u = stripNonDiscriminatoryColumnFilters(normalizeColumnFilterDefinitionList(getDefinitions()), discriminationCtx);
            const def = u.find(d => d.key === filterKey);
            if (!def || def.filterable === false || def.values.length === 0) {
                closeAllColumnFilterMenus();
                syncDropdownScrollLock();
                return;
            }
            fillHeaderColumnFilterFlyout(flyout, def, selectedMap, finalize, rerender);
            positionHeaderColumnFilterFlyout(anchorEl, flyout);
        };

        flyout.classList.remove('skip-submenu-animation');
        fillHeaderColumnFilterFlyout(flyout, definition, selectedMap, finalize, rerender);
        flyout.dataset.headerFilterScope = scope;
        flyout.dataset.headerFilterKey = filterKey;
        flyout.classList.add('open');
        if (anchorEl && anchorEl.classList.contains('column-header-filter-indicator')) {
            anchorEl.classList.add('is-flyout-open');
        }
        positionHeaderColumnFilterFlyout(anchorEl, flyout);
        Utils.syncPageScrollLock(true);
        syncDropdownScrollLock();
    };

    const setupCoursesControls = () => {
        if (!state.coursesTableBody) return;

        bindCourseTableSortButtons();
        if (state.syncCourseSortIndicators) state.syncCourseSortIndicators();

        if (state.coursesSearchInput && !state.coursesSearchInput.dataset.boundCoursesSearch) {
            state.coursesSearchInput.dataset.boundCoursesSearch = 'true';
            const coursesClearBtn = document.getElementById('courses-search-clear');
            const updateClearButton = () => {
                if (!coursesClearBtn) return;
                coursesClearBtn.classList.toggle('visible', Boolean(state.coursesSearchInput.value && String(state.coursesSearchInput.value).trim().length));
            };
            state.coursesSearchInput.addEventListener('input', () => {
                updateClearButton();
                state.courseSearchQuery = state.coursesSearchInput.value || '';
                if (state.coursesSearchInput._courseSearchDebounce) {
                    clearTimeout(state.coursesSearchInput._courseSearchDebounce);
                }
                state.coursesSearchInput._courseSearchDebounce = setTimeout(() => {
                    applyCoursesFilterAndSort();
                }, 150);
            });
            state.coursesSearchInput.value = state.courseSearchQuery || '';
            if (coursesClearBtn) {
                coursesClearBtn.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                });
                coursesClearBtn.addEventListener('click', () => {
                    state.coursesSearchInput.value = '';
                    state.courseSearchQuery = '';
                    updateClearButton();
                    applyCoursesFilterAndSort();
                    if (document.activeElement !== state.coursesSearchInput) state.coursesSearchInput.focus();
                });
            }
            updateClearButton();
        }

        if (state.coursesFilterButton && state.coursesFilterMenu) {
            renderCoursesColumnFilter();
        }
    };

    const renderCourses = () => {
        if (!state.coursesTableBody) return;
        renderCoursesDashboard();
        setupCoursesControls();
        applyCoursesFilterAndSort();
    };



    const bindModalButtons = () => {
        if (state.closeBtn) state.closeBtn.onclick = () => state.modalManager?.resetModal();
        if (state.secCloseBtn) state.secCloseBtn.onclick = () => state.modalManager?.resetSecModal();
        if (state.secPrevBtn) state.secPrevBtn.onclick = (e) => { e.stopPropagation(); state.modalManager?.navigateTool(-1); };
        if (state.secNextBtn) state.secNextBtn.onclick = (e) => { e.stopPropagation(); state.modalManager?.navigateTool(1); };

        const externalCancelBtn = document.getElementById('external-link-cancel');
        const externalStayBtn = document.getElementById('external-link-stay');
        const externalContinueBtn = document.getElementById('external-link-continue');

        if (externalCancelBtn) externalCancelBtn.onclick = () => closeExternalLinkModal(false);
        if (externalStayBtn) externalStayBtn.onclick = () => closeExternalLinkModal(false);
        if (externalContinueBtn) externalContinueBtn.onclick = () => closeExternalLinkModal(true);

        if (state.prevBtn) {
            state.prevBtn.onclick = (e) => {
                e.stopPropagation();
                state.modalManager?.navigateItem(-1);
            };
        }
        if (state.nextBtn) {
            state.nextBtn.onclick = (e) => {
                e.stopPropagation();
                state.modalManager?.navigateItem(1);
            };
        }
    };

    const syncDropdownScrollLock = () => {
        const hasOpenDropdown = !!document.querySelector('.custom-select-container.open, .multi-select-container.open, .column-filter-menu.open');
        if (hasOpenDropdown) {
            Utils.freezeHeaderForScrollLock();
            document.body.classList.add('dropdown-scroll-lock');
            document.documentElement.classList.add('dropdown-scroll-lock');
            Utils.applyScrollLockCompensation();
        } else {
            document.body.classList.remove('dropdown-scroll-lock');
            document.documentElement.classList.remove('dropdown-scroll-lock');
            if (document.body.classList.contains('scroll-lock') || document.documentElement.classList.contains('scroll-lock')) {
                Utils.applyScrollLockCompensation();
            } else {
                Utils.unfreezeHeaderForScrollLock();
                Utils.clearScrollLockCompensation();
            }
        }
    };

    window.syncDropdownScrollLock = syncDropdownScrollLock;

    const closeOpenSelectDropdowns = () => {
        document.querySelectorAll('.custom-select-container.open, .multi-select-container.open').forEach(el => el.classList.remove('open'));
        syncDropdownScrollLock();
    };

    const syncNavBlurState = () => {
        const isAwayFromTop = (window.scrollY || window.pageYOffset || 0) > 1;
        document.querySelectorAll('header, #shared-header, header[data-include="nav.html"], header[data-include="html/nav.html"]').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.classList.toggle('nav-blur-active', isAwayFromTop);
        });
    };

    const positionalAccentSelector = [
        'header',
        'header[data-include="nav.html"]',
        'header[data-include="html/nav.html"]',
        'footer.page-footer',
        'footer[data-include="footer.html"]',
        'footer[data-include="html/footer.html"]',
        '.nav-brand',
        '.nav-brand img',
        '.nav-brand span',
        '.nav-links a',
        '.search-trigger-btn',
        '.modal-nav-btn',
        '.sec-modal-nav-btn',
        '.custom-input',
        '.custom-select-trigger',
        '.multi-select-trigger',
        '.custom-select-dropdown',
        '.multi-select-dropdown',
        '.gallery-toggle',
        '.gallery-container-wrapper',
        '.gallery-nav-btn',
        '.external-link-btn',
        '.search-close-btn',
        '.input-clear-button',
        '.search-result-item',
        '.search-result-media',
        '.filter-icon-button',
        '.column-filter-menu',
        '.column-filter-submenu',
        '.column-filter-clear-button',
        '.table-sort-button',
        '.inline-action-button',
        '#modal-tools .software-tag',
        '.courses-modal-featured-languages .software-tag',
        '.search-type-filters',
        '.modal-header',
        '.modal-media-pane',
        '.search-header',
        '.screenshot-gallery img.selected',
        '.video-thumb-btn.selected',
        '.software-tag',
        '.search-result-match',
        '.multi-select-item input[type="checkbox"]',
        '.column-filter-value-row input[type="checkbox"]',
        '.search-type-filter-item input[type="checkbox"]'
    ].join(', ');

    const clamp01 = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const getAccentRgbAt = (t) => {
        const ratio = clamp01(t);
        return {
            r: Math.round(lerp(255, 0, ratio)),
            g: Math.round(lerp(31, 102, ratio)),
            b: Math.round(lerp(31, 255, ratio))
        };
    };

    const brightenColor = (r, g, b, amount) => {
        const t = clamp01(amount);
        return {
            r: Math.round(lerp(r, 255, t)),
            g: Math.round(lerp(g, 255, t)),
            b: Math.round(lerp(b, 255, t))
        };
    };

    const updateElementPositionalAccent = (el) => {
        if (!(el instanceof HTMLElement)) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const leftX = rect.left;
        const rightX = rect.right;

        const localScope = el.closest('.modal-content, .search-modal-content, .external-link-modal-content');
        let rangeLeft = 0;
        let rangeWidth = Math.max(window.innerWidth || 0, 1);
        if (localScope instanceof HTMLElement) {
            const scopeRect = localScope.getBoundingClientRect();
            rangeLeft = scopeRect.left;
            rangeWidth = Math.max(scopeRect.width, 1);
        }

        const tStart = clamp01((leftX - rangeLeft) / rangeWidth);
        const tEnd = clamp01((rightX - rangeLeft) / rangeWidth);
        const tCenter = clamp01((centerX - rangeLeft) / rangeWidth);

        const start = getAccentRgbAt(tStart);
        const end = getAccentRgbAt(tEnd);
        const center = getAccentRgbAt(tCenter);

        const hoverStart = brightenColor(start.r, start.g, start.b, 0.18);
        const hoverEnd = brightenColor(end.r, end.g, end.b, 0.18);
        const hoverCenter = brightenColor(center.r, center.g, center.b, 0.18);

        el.style.setProperty('--pos-accent-start', `rgb(${start.r}, ${start.g}, ${start.b})`);
        el.style.setProperty('--pos-accent-end', `rgb(${end.r}, ${end.g}, ${end.b})`);
        el.style.setProperty('--pos-accent-soft-start', `rgba(${start.r}, ${start.g}, ${start.b}, 0.42)`);
        el.style.setProperty('--pos-accent-soft-end', `rgba(${end.r}, ${end.g}, ${end.b}, 0.42)`);
        el.style.setProperty('--pos-accent-bg-start', `rgba(${start.r}, ${start.g}, ${start.b}, 0.12)`);
        el.style.setProperty('--pos-accent-bg-end', `rgba(${end.r}, ${end.g}, ${end.b}, 0.12)`);

        el.style.setProperty('--pos-accent', `rgb(${center.r}, ${center.g}, ${center.b})`);
        el.style.setProperty('--pos-accent-soft', `rgba(${center.r}, ${center.g}, ${center.b}, 0.42)`);
        el.style.setProperty('--pos-accent-bg', `rgba(${center.r}, ${center.g}, ${center.b}, 0.14)`);

        el.style.setProperty('--pos-accent-hover-start', `rgb(${hoverStart.r}, ${hoverStart.g}, ${hoverStart.b})`);
        el.style.setProperty('--pos-accent-hover-end', `rgb(${hoverEnd.r}, ${hoverEnd.g}, ${hoverEnd.b})`);
        el.style.setProperty('--pos-accent-hover-soft-start', `rgba(${hoverStart.r}, ${hoverStart.g}, ${hoverStart.b}, 0.48)`);
        el.style.setProperty('--pos-accent-hover-soft-end', `rgba(${hoverEnd.r}, ${hoverEnd.g}, ${hoverEnd.b}, 0.48)`);

        el.style.setProperty('--pos-accent-hover', `rgb(${hoverCenter.r}, ${hoverCenter.g}, ${hoverCenter.b})`);
        el.style.setProperty('--pos-accent-hover-soft', `rgba(${hoverCenter.r}, ${hoverCenter.g}, ${hoverCenter.b}, 0.48)`);
    };

    let positionalAccentRaf = 0;
    let positionalAccentObserver = null;

    const applyPositionalAccents = () => {
        document.querySelectorAll(positionalAccentSelector).forEach(updateElementPositionalAccent);
    };

    const requestPositionalAccentUpdate = () => {
        if (positionalAccentRaf) return;
        positionalAccentRaf = window.requestAnimationFrame(() => {
            positionalAccentRaf = 0;
            applyPositionalAccents();
        });
    };

    const initializePositionalAccents = () => {
        requestPositionalAccentUpdate();
        window.addEventListener('resize', requestPositionalAccentUpdate);
        window.addEventListener('scroll', requestPositionalAccentUpdate, { passive: true });
        if (typeof MutationObserver === 'function' && document.body) {
            positionalAccentObserver = new MutationObserver(() => requestPositionalAccentUpdate());
            positionalAccentObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        }
    };


    const animateIconHover = (element, directionClass) => {
        if (!element) return;
        element.classList.add(directionClass);
        setTimeout(() => {
            element.classList.remove(directionClass);
        }, 200);
    };

    const ensureGlobalEvents = (() => {
        let bound = false;
        return () => {
            if (bound) return;
            bound = true;

            document.addEventListener('keydown', (e) => {
                if (state.externalLinkModal && state.externalLinkModal.classList.contains('active')) {
                    if (e.key === 'Escape') closeExternalLinkModal(false);
                } else if (document.querySelector('.column-filter-header-flyout.open')) {
                    if (e.key === 'Escape') closeAllColumnFilterMenus();
                } else if (state.secModal && state.secModal.style.display === 'flex') {
                    if (state.currentToolsContext.length > 1) {
                        if (e.key === 'ArrowLeft') {
                            state.modalManager?.navigateTool(-1);
                            animateIconHover(state.secPrevBtn, 'icon-hover-effect-prev');
                        }
                        if (e.key === 'ArrowRight') {
                            state.modalManager?.navigateTool(1);
                            animateIconHover(state.secNextBtn, 'icon-hover-effect-next');
                        }
                    }
                    if (e.key === 'Escape') state.modalManager?.resetSecModal();
                } else if (state.modal && state.modal.style.display === 'flex') {
                    if (state.showModalNavArrows) {
                        if (e.key === 'ArrowLeft') {
                            state.modalManager?.navigateItem(-1);
                            animateIconHover(state.prevBtn, 'icon-hover-effect-prev');
                        }
                        if (e.key === 'ArrowRight') {
                            state.modalManager?.navigateItem(1);
                            animateIconHover(state.nextBtn, 'icon-hover-effect-next');
                        }
                    }
                    if (e.key === 'Escape') state.modalManager?.resetModal();
                }
            });

            document.addEventListener('click', (e) => {
                const clickedSelect = !!e.target.closest('.custom-select-container, .multi-select-container');
                const clickedColumnFilter = !!e.target.closest('.column-filter-menu, .column-filter-header-flyout, .filter-icon-button, .column-header-filter-indicator');
                if (!clickedSelect) {
                    document.querySelectorAll('.custom-select-container, .multi-select-container').forEach(c => c.classList.remove('open'));
                }
                if (!clickedColumnFilter) {
                    closeAllColumnFilterMenus();
                }
                syncDropdownScrollLock();

                const link = e.target.closest('a[data-route]');
                if (!link) return;
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                const route = link.getAttribute('data-route') || '/';
                if (isSameRouteNavigation(route, '')) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                navigate(route, '');
            });

            let modalMousedownTarget = null;

            window.addEventListener('mousedown', (event) => {
                modalMousedownTarget = event.target;
            });

            window.onclick = function (event) {
                if (event.target === state.modal && modalMousedownTarget === state.modal) {
                    state.modalManager?.resetModal();
                } else if (event.target === state.secModal && modalMousedownTarget === state.secModal) {
                    state.modalManager?.resetSecModal();
                } else if (event.target === state.externalLinkModal && modalMousedownTarget === state.externalLinkModal) {
                    closeExternalLinkModal(false);
                }
                modalMousedownTarget = null;
            };
        };
    })();

    const loadDataOnce = () => {
        if (!state.allData) state.allData = {};
        const route = state.currentRoute;
        const sheetsNeeded = [];

        if (route === '/videos') {
            if (!state.allData.videos) sheetsNeeded.push('videos');
            if (!state.allData.skills) sheetsNeeded.push('skills');
        }
        if (route === '/games') {
            if (!state.allData.games) sheetsNeeded.push('games');
            if (!state.allData.skills) sheetsNeeded.push('skills');
        }
        if (route === '/skills') {
            if (!state.allData.skills) sheetsNeeded.push('skills');
        }
        if (route === '/' || route === '/bio') {
            if (!state.allData.games) sheetsNeeded.push('games');
            if (!state.allData.videos) sheetsNeeded.push('videos');
            if (!state.allData.skills) sheetsNeeded.push('skills');
        }
        if (route === '/achievements') {
            if (!state.allData.videos) sheetsNeeded.push('videos');
        }
        if (route === '/activities' && !state.allData.Activities) sheetsNeeded.push('Activities');

        if (sheetsNeeded.length === 0) {
            return Promise.resolve({ data: state.allData, allCached: true });
        }

        let allCached = true;
        return Promise.all(sheetsNeeded.map(sheet =>
            dataService.loadSheet(sheet).then(result => {
                state.allData[sheet] = result.data;
                if (!result.fromCache) allCached = false;
                if (sheet === 'videos') {
                    state.filmFestivalAwards = dataService.buildFilmFestivalAwards(result.data || []);
                }
                return result.data;
            })
        )).then(() => ({ data: state.allData, allCached })).catch(err => {
            const container = state.portfolioGrid || state.skillsList;
            if (container) {
                container.innerHTML = '<p style="color: #ff6b6b; grid-column: 1/-1; text-align: center; padding: 40px;">Unable to load data. Please check your connection and refresh the page.</p>';
            }
            throw err;
        });
    };

    const applyDataForRoute = (token) => {
        if (!state.renderer) return;
        const dataPromise = loadDataOnce();

        if (state.currentRoute === '/achievements') {
            const awardsContainer = document.getElementById('festival-awards-container');
            if (awardsContainer && !state.didPrimeSkeletons) {
                const skeletonCount = getStoredCount(ACHIEVEMENT_AWARDS_SKELETON_KEY) || 3;
                state.renderer.showSkeletons(awardsContainer, skeletonCount);
                state.didPrimeSkeletons = true;
                state.primedSkeletonTarget = 'achievement-awards';
                state.primedSkeletonCount = skeletonCount;
            }
        }

        dataPromise.then(result => {
            const data = result.data;
            const isCached = result.allCached;
            if (state.routeToken !== token) return;

            if (state.currentRoute === '/achievements') {
                const renderAchievementsNow = () => {
                    if (state.routeToken !== token) return;
                    setupAchievementVideoLinks(data.videos || []);
                    renderAchievementAwards();
                };
                renderAchievementsNow();
            }

            if (state.currentRoute === '/' || state.currentRoute === '/bio') {
                setupPortraitMediaLoadState();
                renderRecentWork();
            }

            if (state.currentRoute === '/activities') {
                renderActivities();
            }

            if (state.portfolioGrid) {
                const pageType = state.currentRoute === '/games' ? 'games' : 'videos';
                const projectData = data[pageType] || [];
                setStoredCount(state.skeletonKey, projectData.length);

                if (!state.didPrimeSkeletons || state.primedSkeletonTarget !== 'portfolio' || state.primedSkeletonCount !== projectData.length) {
                    state.renderer.showSkeletons(state.portfolioGrid, projectData.length);
                }
                if (projectData.length > 0 && state.filterCards) {
                    state.filterCards();
                }

                if (projectData.length === 0) {
                    if (portfolioGridResizeObserver) {
                        portfolioGridResizeObserver.disconnect();
                        portfolioGridResizeObserver = null;
                    }
                    state.portfolioGrid.style.minHeight = '';
                    const emptyMsg = pageType === 'games'
                        ? 'No games match the current filters.'
                        : 'No videos match the current filters.';
                    state.portfolioGrid.innerHTML = `<p style="color: #8b949e; grid-column: 1/-1; text-align: center; padding: 40px;">${emptyMsg}</p>`;
                    if (state.filterCards) state.filterCards();
                }
                if (projectData.length > 0) {
                    const startTime = Date.now();
                    preloadProjectThumbs(projectData).then(imagesCached => {
                        const loadTime = Date.now() - startTime;
                        const smoothingDelay = imagesCached ? 0 : Math.max(0, 150 - loadTime);
                        return delay(smoothingDelay);
                    }).then(() => {
                        if (state.routeToken !== token) return;
                        try {
                            state.renderer.renderProjects(projectData);
                            renderPortfolioColumnFilter(projectData);
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    if (state.routeToken !== token) return;
                                    if (state.lockPortfolioGridHeight) state.lockPortfolioGridHeight();
                                    ensurePortfolioGridResizeObserver();
                                });
                            });
                        } catch (e) {
                            if (state.portfolioGrid) {
                                if (portfolioGridResizeObserver) {
                                    portfolioGridResizeObserver.disconnect();
                                    portfolioGridResizeObserver = null;
                                }
                                state.portfolioGrid.style.minHeight = '';
                                state.portfolioGrid.innerHTML = '<p style="color: #8b949e; grid-column: 1/-1; text-align: center; padding: 40px;">Unable to display projects. Please refresh the page.</p>';
                            }
                        }
                    });
                }
            }

            if (state.skillsList) {
                const skillData = data.skills || [];
                const dynamicCount = skillData.length;
                setStoredCount(state.skeletonKey, dynamicCount);

                if (!isCached && (!state.didPrimeSkeletons || state.primedSkeletonTarget !== 'skills' || state.primedSkeletonCount !== dynamicCount)) {
                    state.renderer.showSkeletons(state.skillsList, dynamicCount);
                }

                const startTime = Date.now();
                preloadSkillIcons(skillData).then(iconsCached => {
                    const loadTime = Date.now() - startTime;
                    const smoothingDelay = iconsCached ? 0 : Math.max(0, 150 - loadTime);
                    return delay(smoothingDelay);
                }).then(() => {
                    if (state.routeToken !== token) return;
                    state.renderer.renderSkills(skillData);
                    applyHiddenColumnsToTable('skills');
                    if (state.lockSkillsTableHeight) state.lockSkillsTableHeight();
                    bindSkillTableSortButtons();
                    if (state.syncSkillSortIndicators) state.syncSkillSortIndicators();
                    renderSkillColumnFilter();
                    if (state.filterSkills) state.filterSkills();
                });
            }

            if (state.currentRoute === '/skills' && data['Course Projects']) {
                preloadProgrammingLanguageIconsForCourses([], data['Course Projects']).catch(() => { });
            }
        })
            .catch(() => {
            });
    };

    const initializePage = (route) => {
        resetPageState();
        syncDomReferences();
        state.currentRoute = route;
        state.isSkillsPage = !!state.skillsList;
        state.isAchievementsPage = route === '/achievements';
        state.isPortfolioPage = !!state.portfolioGrid;
        const isGamesOrVideosPage = route === '/videos' || route === '/games';
        if (state.portfolioFilterGroup) state.portfolioFilterGroup.style.display = isGamesOrVideosPage ? 'flex' : 'none';
        if (state.typeSelectContainer && state.typeSelectContainer.parentElement) state.typeSelectContainer.parentElement.style.display = isGamesOrVideosPage ? 'none' : 'flex';
        if (state.toolSelectContainer && state.toolSelectContainer.parentElement) state.toolSelectContainer.parentElement.style.display = isGamesOrVideosPage ? 'none' : 'flex';
        if (state.isSkillsPage) {
            state.selectedSort = 'name';
            state.selectedOrder = 'asc';
        }
        else if (state.isPortfolioPage) state.selectedSort = 'date';

        state.modalManager = new ModalManager(state);
        state.filterManager = new FilterManager(state);
        state.controlsManager = new ControlsManager(state);
        state.renderer = new Renderer(state);

        state.openModalForItem = (...args) => state.modalManager.openModalForItem(...args);
        state.appendSoftwareLanguageTagsToContainer = appendSoftwareLanguageTagsToContainer;
        state.parseCourseLanguagesUsedRaw = parseCourseLanguagesUsedRaw;
        state.getAggregatedCourseProjectLanguagesForSkill = getAggregatedCourseProjectLanguagesForSkill;
        state.getCourseProjectRowsForSkill = getCourseProjectRowsForSkill;
        state.getCourseNameByCourseId = getCourseNameByCourseId;
        state.filterCards = () => state.filterManager.filterCards();
        state.filterSkills = () => state.filterManager.filterSkills();
        state.sortCards = () => state.filterManager.sortCards();
        state.sortSkills = () => state.filterManager.sortSkills();
        state.lockSkillsTableHeight = () => {
            const skillsShell = state.skillsList?.querySelector('.skills-table-shell') || document.querySelector('.courses-table-shell.skills-table-shell');
            lockTableShellHeight(skillsShell);
        };
        state.lockPortfolioGridHeight = () => lockTableShellHeight(state.portfolioGrid);
        state.lockCoursesTableHeight = () => {
            const coursesShell = state.coursesTableBody?.closest('.courses-table-shell');
            lockTableShellHeight(coursesShell);
        };
        state.updateTypeFilter = (cats) => state.controlsManager.updateTypeFilter(cats);
        state.updateToolFilter = (tools) => state.controlsManager.updateToolFilter(tools);
        state.runFiltering = () => state.filterManager.runFiltering();
        state.syncSkillSortIndicators = () => syncTableSortButtons('skills', state.selectedSort, state.selectedOrder);
        state.syncCourseSortIndicators = () => syncTableSortButtons('courses', state.selectedCourseSort, state.selectedCourseOrder);

        if (state.isSkillsPage || state.isPortfolioPage) {
            state.controlsManager.renderStaticControls();
        }
        bindModalButtons();

        if (!document.body.dataset.boundColumnHeaderFilterClick) {
            document.body.dataset.boundColumnHeaderFilterClick = 'true';
            document.addEventListener('click', (e) => {
                const indicator = e.target.closest('.column-header-filter-indicator');
                if (!indicator) return;
                if (indicator.classList.contains('is-disabled')) return;
                e.preventDefault();
                e.stopPropagation();

                const scope = indicator.dataset.filterScope || '';
                const key = indicator.dataset.filterKey || '';
                if (!scope || !key) return;

                const flyout = headerColumnFilterFlyoutEl;
                if (flyout && flyout.classList.contains('open')
                    && flyout.dataset.headerFilterScope === scope
                    && flyout.dataset.headerFilterKey === key) {
                    closeAllColumnFilterMenus();
                    syncDropdownScrollLock();
                    return;
                }

                if (indicator.classList.contains('is-active')) {
                    const selectedMap = scope === 'skills'
                        ? state.selectedSkillColumnValues
                        : scope === 'courses'
                            ? state.selectedCourseColumnValues
                            : scope === 'portfolio'
                                ? state.selectedPortfolioColumnValues
                                : null;
                    if (!selectedMap) return;
                    delete selectedMap[key];
                    if (scope === 'skills') {
                        if (state.filterSkills) state.filterSkills();
                        renderSkillColumnFilter();
                    } else if (scope === 'courses') {
                        if (state.applyCoursesFilterAndSort) state.applyCoursesFilterAndSort();
                        renderCoursesColumnFilter();
                    } else if (scope === 'portfolio') {
                        const selectedByColumn = state.selectedPortfolioColumnValues || {};
                        state.selectedCategories = Array.isArray(selectedByColumn.type) ? [...selectedByColumn.type] : ['all'];
                        state.selectedTools = Array.isArray(selectedByColumn.tools) ? [...selectedByColumn.tools] : ['all'];
                        if (!('type' in selectedByColumn)) state.selectedCategories = ['all'];
                        if (!('tools' in selectedByColumn)) state.selectedTools = ['all'];
                        if (state.filterCards) state.filterCards();
                        const pageType = state.currentRoute === '/games' ? 'games' : 'videos';
                        const list = Array.isArray(state.allData?.[pageType]) ? state.allData[pageType] : [];
                        renderPortfolioColumnFilter(list);
                    }
                    closeAllColumnFilterMenus();
                    return;
                }

                openHeaderColumnFilterFlyout(scope, key, indicator);
            }, true);
        }

        const token = ++state.routeToken;
        applyDataForRoute(token);
    };

    const loadRoute = async (route, search = '', options = {}) => {
        const {
            push = true,
            scroll = true,
            historyUrl = null
        } = options;
        const routeInfo = routes[route] || routes['/'];
        const root = document.getElementById('page-root');
        if (!root) return;

        document.querySelectorAll('.custom-select-container, .multi-select-container').forEach(c => c.classList.remove('open'));
        document.body.classList.remove('dropdown-scroll-lock');
        document.documentElement.classList.remove('dropdown-scroll-lock');

        if (shouldSkipRouteLoad(route, search, root)) return;

        const finalHistoryUrl = historyUrl !== null ? historyUrl : buildUrl(route, search);

        if (push) {
            window.history.pushState({ route, search }, '', finalHistoryUrl);
        } else {
            window.history.replaceState({ route, search }, '', finalHistoryUrl);
        }

        updateNavActive(route);
        document.title = `${routeInfo.title} - Devious Duo Productions`;

        const token = ++state.routeToken;
        try {
            const response = await fetch(routeInfo.fragment);
            if (!response.ok) throw new Error(`Failed to load ${routeInfo.fragment}`);
            const html = await response.text();
            if (state.routeToken !== token) return;
            const nextRoot = document.createElement('div');
            nextRoot.innerHTML = html;
            await injectFragments(nextRoot, route);
            if (state.routeToken !== token) return;
            const updateDOM = () => {
                root.innerHTML = '';
                root.replaceChildren(...nextRoot.childNodes);
                initializePage(route);
                if (scroll) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                syncNavBlurState();
            };

            if (!initialRouteHydrated) {
                updateDOM();
                initialRouteHydrated = true;
            } else {
                await runRouteCrossfade(root, updateDOM);
            }
        } catch (err) {
            if (state.routeToken !== token) return;
            const applyErrorDOM = () => {
                root.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'page-intro';
                errorDiv.innerHTML = '<h2>Page not found</h2><p>The page could not be loaded.</p>';
                root.appendChild(errorDiv);
                initializePage('/');
                if (scroll) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                syncNavBlurState();
            };

            if (!initialRouteHydrated) {
                applyErrorDOM();
                initialRouteHydrated = true;
            } else {
                await runRouteCrossfade(root, applyErrorDOM);
            }
        }
    };

    const navigate = (route, search) => loadRoute(route, search, { push: true });

    window.navigateTo = navigate;

    const injectSharedHeaderFooter = async () => {
        const headerEl = document.getElementById('shared-header');
        const footerEl = document.getElementById('shared-footer');

        const tasks = [];
        if (headerEl && !headerEl.hasChildNodes()) {
            tasks.push(getFragmentHtml('html/nav.html').then(html => {
                headerEl.innerHTML = html;
            }).catch(() => { }));
        }
        if (footerEl && !footerEl.hasChildNodes()) {
            tasks.push(getFragmentHtml('html/footer.html').then(html => {
                footerEl.innerHTML = html;
            }).catch(() => { }));
        }

        let sharedModals = document.getElementById('shared-modals-container');
        if (!sharedModals) {
            sharedModals = document.createElement('div');
            sharedModals.id = 'shared-modals-container';
            document.body.appendChild(sharedModals);
            tasks.push(getFragmentHtml('html/fragments/modals.html').then(html => {
                sharedModals.innerHTML = html;
            }).catch(() => { }));
        }

        await Promise.all(tasks);
    };

    await injectSharedHeaderFooter();

    syncNavBlurState();
    window.addEventListener('scroll', syncNavBlurState, { passive: true });
    window.addEventListener('resize', syncNavBlurState);

    updateNavLinks();

    setupExternalLinkTriggers();

    const setupMobileNav = () => {
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        const navContainer = document.querySelector('.nav-container');
        const contactLink = document.getElementById('contact-link');

        if (toggleBtn && navLinks) {
            const closeMenu = () => {
                toggleBtn.classList.remove('open');
                navLinks.classList.remove('mobile-menu-open');
                document.body.classList.remove('mobile-nav-locked');
                document.documentElement.classList.remove('scroll-lock');
            };

            const openMenu = () => {
                toggleBtn.classList.add('open');
                navLinks.classList.add('mobile-menu-open');
                document.body.classList.add('mobile-nav-locked');
                document.documentElement.classList.add('scroll-lock');
            };

            const shouldForceMobileNav = () => {
                if (window.matchMedia('(min-width: 1200px)').matches) return false;
                if (window.matchMedia('(max-width: 900px)').matches) return true;
                const hadForcedClass = navContainer?.classList.contains('nav-force-mobile');
                if (hadForcedClass) navContainer.classList.remove('nav-force-mobile');
                const hardOverflow = !!navContainer && navContainer.scrollWidth > (navContainer.clientWidth + 2);
                const linksOverflow = navLinks.scrollWidth > (navLinks.clientWidth + 2);
                const navItems = Array.from(navLinks.querySelectorAll('a, button')).filter(item => item.offsetParent !== null);
                if (navItems.length < 2) {
                    if (hadForcedClass) navContainer.classList.add('nav-force-mobile');
                    return hardOverflow || linksOverflow;
                }
                const navBrand = navContainer?.querySelector('.nav-brand');
                const firstTop = navItems[0].offsetTop;
                const isWrapped = navItems.some(item => Math.abs(item.offsetTop - firstTop) > 2);
                const brandRect = navBrand?.getBoundingClientRect();
                const firstItemLeft = navItems.reduce((min, item) => Math.min(min, item.getBoundingClientRect().left), Number.POSITIVE_INFINITY);
                const crowdingThresholdPx = 14;
                const isCramped = !!brandRect && Number.isFinite(firstItemLeft)
                    && (firstItemLeft - brandRect.right) < crowdingThresholdPx;
                if (hadForcedClass) navContainer.classList.add('nav-force-mobile');
                return isWrapped || hardOverflow || linksOverflow || isCramped;
            };

            const syncNavMode = () => {
                if (!navContainer) return;
                const forceMobile = shouldForceMobileNav();
                navContainer.classList.toggle('nav-force-mobile', forceMobile);
                if (!forceMobile) closeMenu();
            };

            toggleBtn.addEventListener('click', () => {
                const willOpen = !navLinks.classList.contains('mobile-menu-open');
                if (willOpen) openMenu();
                else closeMenu();
            });

            navLinks.querySelectorAll('a, button').forEach(link => {
                link.addEventListener('click', () => {
                    closeMenu();
                });
            });

            document.addEventListener('click', (e) => {
                if (!navLinks.classList.contains('mobile-menu-open')) return;
                const target = e.target;
                if (toggleBtn.contains(target)) return;
                if (navLinks.contains(target)) return;
                closeMenu();
            }, { capture: true });

            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                if (!navLinks.classList.contains('mobile-menu-open')) return;
                closeMenu();
            });

            const onViewportChange = () => {
                syncNavMode();
            };

            window.addEventListener('resize', onViewportChange);
            window.addEventListener('orientationchange', onViewportChange);
            if (document.fonts?.ready) {
                document.fonts.ready.then(syncNavMode).catch(() => { });
            }
            requestAnimationFrame(syncNavMode);
        }

        if (contactLink) {
            contactLink.addEventListener('click', (e) => {
                e.preventDefault();
                const footer = document.querySelector('.page-footer');
                if (footer) footer.scrollIntoView({ behavior: 'smooth' });
                if (toggleBtn && navLinks) {
                    toggleBtn.classList.remove('open');
                    navLinks.classList.remove('mobile-menu-open');
                    document.body.classList.remove('mobile-nav-locked');
                    document.documentElement.classList.remove('scroll-lock');
                }
            });
        }
    };
    setupMobileNav();
    initializePositionalAccents();

    updateNavActive(resolveRoute(window.location.pathname));
    ensureGlobalEvents();

    document.addEventListener('click', async (e) => {
        const mailtoLink = e.target.closest('a[href^="mailto:"]');
        if (mailtoLink) {
            e.preventDefault();
            const href = mailtoLink.getAttribute('href');
            const confirmed = await showExternalLinkModal(href, 'Email Me', 'Contact', 'Are you sure you want to send an email?');
            if (confirmed) {
                window.location.href = href;
            }
        }
    });

    if (typeof initializeGlobalSearch === 'function') {
        initializeGlobalSearch();
    }

    const initialUrl = new URL(window.location.href);
    const initialRoute = resolveRoute(initialUrl.pathname);
    loadRoute(initialRoute, initialUrl.search, { push: false });
    requestPositionalAccentUpdate();

    window.addEventListener('popstate', () => {
        const url = new URL(window.location.href);
        loadRoute(resolveRoute(url.pathname), url.search, { push: false });
        requestPositionalAccentUpdate();
    });
});
