const CAT_MAP = {
    "Drama": "មនោសញ្ចេតនា",
    "Action": "វាយប្រហារ",
    "Sci-Fi": "វិទ្យាសាស្ត្រ",
    "Animation": "គំនូរជីវចល",
    "Khmer": "ភាពយន្តខ្មែរ",
    "Ancient": "ភាពយន្តបុរាណ",
    "Horror": "ភាពយន្តភ័យរន្ធត់"
};

let MOVIES_DATA = [];

const CATEGORIES = [
    { id: 'All', labelKm: 'ទាំងអស់', labelEn: 'All' },
    { id: 'Action', labelKm: 'វាយប្រហារ', labelEn: 'Action' },
    { id: 'Sci-Fi', labelKm: 'វិទ្យាសាស្ត្រ', labelEn: 'Sci-Fi' },
    { id: 'Animation', labelKm: 'គំនូរជីវចល', labelEn: 'Animation' },
    { id: 'Drama', labelKm: 'មនោសញ្ចេតនា', labelEn: 'Drama' },
    { id: 'Khmer', labelKm: 'ភាពយន្តខ្មែរ', labelEn: 'Khmer' },
    { id: 'Ancient', labelKm: 'ភាពយន្តបុរាណ', labelEn: 'Ancient' },
    { id: 'Horror', labelKm: 'ភាពយន្តភ័យរន្ធត់', labelEn: 'Horror' }
];

let state = {
    selectedCategory: 'All',
    searchQuery: '',
    sortBy: 'featured',
    showFavoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem('aiMovieFavorites') || '[]'),
    activeMovie: null,
    currentPage: 1,
    itemsPerPage: 8
};

// មុខងារបំប្លែង Link Google Drive, YouTube និង Ok.ru ដោយស្វ័យប្រវត្តិ
function extractGoogleDriveId(url) {
    if (!url || !url.includes('drive.google.com')) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function formatPosterUrl(url) {
    const driveId = extractGoogleDriveId(url);
    if (driveId) {
        return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
    return url;
}

function formatVideoEmbedUrl(url) {
    if (!url) return '';
    // បំប្លែង Link Google Drive ទៅជា /preview
    const driveId = extractGoogleDriveId(url);
    if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/preview`; } // បំប្លែង Link YouTube ធម្មតា ទៅជា /embed/ if (url.includes('youtube.com/watch')) { const vid = new URL(url).searchParams.get('v'); if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
        const vid = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
        if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`; } else if (url.includes('youtube.com/embed/')) { return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`; } // បំប្លែង Link Ok.ru ទៅជា /videoembed/ if (url.includes('ok.ru/video/')) { const vid = url.split('ok.ru/video/')[1]?.split(/[?&/]/)[0]; if (vid) return `https://ok.ru/videoembed/${vid}?autoplay=1`;
    } else if (url.includes('ok.ru/videoembed/')) {
        return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }
    return url;
}

document.addEventListener('DOMContentLoaded', async () => {
    renderCategories();
    updateFavoriteBadge();
    setupEventListeners();
    await loadMoviesFromBackend();
});

async function loadMoviesFromBackend() {
    try {
        const res = await fetch('/api/movies');
        const data = await res.json();
        MOVIES_DATA = data.map(m => ({
            ...m,
            poster: formatPosterUrl(m.poster),
            backdrop: formatPosterUrl(m.backdrop || m.poster),
            categoryKm: CAT_MAP[m.category] || m.category
        }));
        applyFilters();
    } catch (err) {
        console.error('Failed to load movies:', err);
        showToast('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ!');
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        state.currentPage = 1;
        clearBtn.classList.toggle('hidden', state.searchQuery.length === 0);
        applyFilters();
    });

    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 40) {
            navbar.classList.add('bg-cinema-950/95', 'shadow-lg');
            navbar.classList.remove('from-cinema-950/90', 'to-transparent');
        } else {
            navbar.classList.remove('bg-cinema-950/95', 'shadow-lg');
            navbar.classList.add('from-cinema-950/90', 'to-transparent');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('movieModal').classList.contains('hidden')) {
            closeMovieModal();
        }
    });

    document.getElementById('movieModal').addEventListener('click', (e) => {
        if (e.target.id === 'movieModal') closeMovieModal();
    });
}

function openFeaturedMovie(autoPlay = false) {
    if (MOVIES_DATA.length === 0) return;
    const featuredMovie = MOVIES_DATA.find(m => m.featured) || MOVIES_DATA[0];
    openMovieModal(featuredMovie.id, autoPlay);
}

function renderCategories() {
    const container = document.getElementById('categoryContainer');
    container.innerHTML = CATEGORIES.map(cat => {
        const isActive = state.selectedCategory === cat.id && !state.showFavoritesOnly;
        return `
            <button 
                onclick="selectCategory('${cat.id}')"
                class="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all border ${
                    isActive 
                    ? 'bg-cinema-accent border-cinema-accent text-white shadow-lg shadow-cinema-accent/30' 
                    : 'bg-cinema-800/80 border-white/10 text-slate-300 hover:bg-cinema-700 hover:text-white'
                }"
            >
                ${cat.labelKm}
            </button>
        `;
    }).join('');
}

function selectCategory(categoryId) {
    state.selectedCategory = categoryId;
    state.showFavoritesOnly = false;
    state.currentPage = 1;
    updateFavButtonStyle();
    renderCategories();
    applyFilters();
}

function toggleFavoritesFilter() {
    state.showFavoritesOnly = !state.showFavoritesOnly;
    state.currentPage = 1;
    updateFavButtonStyle();
    renderCategories();
    applyFilters();
}

function updateFavButtonStyle() {
    const btn = document.getElementById('navFavBtn');
    if (state.showFavoritesOnly) {
        btn.classList.add('ring-2', 'ring-cinema-accent', 'bg-cinema-700');
    } else {
        btn.classList.remove('ring-2', 'ring-cinema-accent', 'bg-cinema-700');
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    state.searchQuery = '';
    state.currentPage = 1;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    applyFilters();
}

function resetFilters(event) {
    if (event) event.preventDefault();
    state.selectedCategory = 'All';
    state.searchQuery = '';
    state.sortBy = 'featured';
    state.showFavoritesOnly = false;
    state.currentPage = 1;
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('sortSelect').value = 'featured';
    updateFavButtonStyle();
    renderCategories();
    applyFilters();
}

function applyFilters() {
    state.sortBy = document.getElementById('sortSelect').value;
    
    let filtered = MOVIES_DATA.filter(movie => {
        if (state.showFavoritesOnly && !state.favorites.includes(movie.id)) return false;
        if (!state.showFavoritesOnly && state.selectedCategory !== 'All' && movie.category !== state.selectedCategory) return false;
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            return movie.titleKm.toLowerCase().includes(q) || 
                   movie.titleEn.toLowerCase().includes(q) || 
                   movie.category.toLowerCase().includes(q) || 
                   movie.categoryKm.includes(q);
        }
        return true;
    });

    if (state.sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    } else if (state.sortBy === 'newest') {
        filtered.sort((a, b) => b.year - a.year || b.id - a.id);
    }

    renderMoviesGrid(filtered);
}

function renderMoviesGrid(movies) {
    const grid = document.getElementById('moviesGrid');
    const emptyState = document.getElementById('emptyState');
    const countText = document.getElementById('movieCountText');
    const paginationContainer = document.getElementById('paginationContainer');

    countText.textContent = state.showFavoritesOnly 
        ? `បញ្ជីទុកមើល៖ ${movies.length} ភាពយន្ត` : `បង្ហាញ ${movies.length} ភាពយន្ត`;

    if (movies.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        if (paginationContainer) paginationContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    grid.classList.remove('hidden');

    const totalPages = Math.ceil(movies.length / state.itemsPerPage);
    if (state.currentPage > totalPages) state.currentPage = 1;
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedMovies = movies.slice(startIndex, startIndex + state.itemsPerPage);

    grid.innerHTML = paginatedMovies.map(movie => {
        const isFav = state.favorites.includes(movie.id);
        return `
            <article 
                onclick="openMovieModal(${movie.id}, false)"
                class="group relative bg-cinema-900 rounded-2xl overflow-hidden border border-white/10 hover:border-cinema-accent/60 shadow-lg hover:shadow-2xl hover:shadow-cinema-accent/15 transition-all duration-300 cursor-pointer flex flex-col"
            >
                <div class="relative aspect-[2/3] w-full overflow-hidden bg-cinema-800">
                    <img 
                        src="${movie.poster}" 
                        alt="${movie.titleEn}" 
                        loading="lazy"
                        onerror="this.onerror=null; this.src='https://placehold.co/400x600/161d2c/e11d48?text=${encodeURIComponent(movie.titleEn)}';"
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    >
                    <div class="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity"></div>

                    <div class="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-cinema-gold text-xs font-bold border border-white/10">
                            <i class="fa-solid fa-star text-[10px]"></i> ${Number(movie.rating).toFixed(1)}
                        </span>

                        <button 
                            onclick="toggleFavorite(event, ${movie.id})"
                            aria-label="Bookmark movie"
                            class="w-8 h-8 rounded-full bg-black/60 hover:bg-cinema-accent backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-colors"
                        >
