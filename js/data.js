class DataService {
    constructor() {
        this.cache = {};
        this.pending = {};
        this.appRoot = '';
    }

    setAppRoot(appRoot) {
        this.appRoot = String(appRoot || '').replace(/\/+$/, '');
    }

    resolveSheetKey(sheetName) {
        return {
            videos: 'videos',
            games: 'games',
            skills: 'skills',
            Activities: 'Activities',
            Achievements: 'Achievements',
            School: 'School',
            Schools: 'School',
            'Video Projects': 'videos',
            'Game Projects': 'games'
        }[sheetName] || sheetName;
    }

    resolveDataFile(key) {
        const fileMap = {
            videos: 'videos.json',
            games: 'games.json',
            skills: 'skills.json',
            Activities: 'activities.json',
            Achievements: 'achievements.json',
            School: 'school.json'
        };
        return fileMap[key] || `${String(key).toLowerCase()}.json`;
    }

    resolveDataUrl(key) {
        const base = this.appRoot || '';
        return `${base}/data/${this.resolveDataFile(key)}`;
    }

    buildFilmFestivalAwards(videosData) {
        const awards = {};
        if (!Array.isArray(videosData)) return awards;
        videosData.forEach((video) => {
            if (video && video.name && Array.isArray(video.awards) && video.awards.length > 0) {
                awards[video.name] = video.awards;
            }
        });
        return awards;
    }

    async loadSheet(sheetName) {
        const key = this.resolveSheetKey(sheetName);
        if (this.cache[key]) {
            return { data: [...this.cache[key]], fromCache: true };
        }

        if (!this.pending[key]) {
            const url = this.resolveDataUrl(key);
            this.pending[key] = fetch(url)
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${url}: ${response.status}`);
                    }
                    const parsed = await response.json();
                    return Array.isArray(parsed) ? parsed : [];
                })
                .then((data) => {
                    this.cache[key] = data;
                    return data;
                })
                .finally(() => {
                    delete this.pending[key];
                });
        }

        const data = await this.pending[key];
        return { data: [...data], fromCache: false };
    }

    async loadAllData() {
        const sheets = ['videos', 'games', 'skills', 'Achievements', 'School', 'Activities'];
        const data = {};
        let allCached = true;
        for (const sheet of sheets) {
            const result = await this.loadSheet(sheet);
            data[sheet] = result.data;
            if (!result.fromCache) allCached = false;
        }
        return { data, allCached };
    }
}
