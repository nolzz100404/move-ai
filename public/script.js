const FIREBASE_PROJECT_ID = "piphop-ai-movie";

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
    // Google Drive
    const driveId = extractGoogleDriveId(url);
    if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/preview`;
    }
    // YouTube
    if (url.includes('youtube.com/watch')) {
        const vid = new URL(url).searchParams.get('v');
        if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
        const vid = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
        if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    } else if (url.includes('youtube.com/embed/')) {
        return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }
    // Ok.ru (គាំទ្រទាំង ok.ru និង m.ok.ru)
    if (url.includes('ok.ru/video/')) {
        const vid = url.split('ok.ru/video/')[1]?.split(/[?&/]/)[0];
        if (vid) return `https://ok.ru/videoembed/${vid}?autoplay=1`;
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
        // ១. ទាញរឿងថ្មីៗពី Firebase Firestore (piphop-ai-movie)
        let firebaseMovies = [];
        try {
            const fbUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/movies?pageSize=100`;
            const fbRes = await fetch(fbUrl);
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                if (fbData.documents) {
                    firebaseMovies = fbData.documents.map((doc, idx) => {
                        const f = doc.fields;
                        return {
                            id: 1000 + idx,
                            titleKm: f.titleKm?.stringValue || '',
                            titleEn: f.titleEn?.stringValue || '',
                            category: f.category?.stringValue || 'Drama',
                            year: Number(f.year?.integerValue || 2026),
                            rating: Number(f.rating?.doubleValue || f.rating?.integerValue || 9.0),
                            duration: f.duration?.stringValue || '1h 30m',
                            poster: f.poster?.stringValue || '',
                            backdrop: f.backdrop?.stringValue || f.poster?.stringValue || '',
                            video: f.video?.stringValue || '',
                            director: f.director?.stringValue || 'Nolzz',
                            cast: f.cast?.stringValue || 'Nolzz',
                            synopsis: f.synopsis?.stringValue || '',
                            featured: Boolean(f.featured?.booleanValue),
                            createdAt: f.createdAt?.timestampValue || ''
                        };
                    });
                    // តម្រៀបរឿងដែលទើប Upload ថ្មីបំផុតឱ្យនៅខាងលើគេ
                    firebaseMovies.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
                }
            }
        } catch (e) {
            console.warn('Firebase fetch skipped:', e);
        }

        // ២. ទាញរឿងចាស់ៗពី API ឬ public/movies.json
        let localMovies = [];
        try {
            const res = await fetch('/api/movies');
            if (res.ok) localMovies = await res.json();
        } catch (e) {}

        if (!localMovies || !Array.isArray(localMovies) || localMovies.length === 0) {
            try {
                const fallbackRes = await fetch('/movies.json?v=' + Date.now());
                if (fallbackRes.ok) localMovies = await fallbackRes.json();
            } catch (e) {}
        }

        const combined = [...firebaseMovies, ...(Array.isArray(localMovies) ? localMovies : [])];

        MOVIES_DATA = combined.map(m => ({
            ...m,
            poster: formatPosterUrl(m.poster),
            backdrop: formatPosterUrl(m.backdrop || m.poster),
            categoryKm: CAT_MAP[m.category] || m.category
        }));
        applyFilters();
    } catch (err) {
        console.error('Failed to load movies:', err);
        showToast('មិនអាចផ្ទុកទិន្នន័យភាពយន្តបានទេ!');
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim();
            state.currentPage = 1;
            if (clearBtn) clearBtn.classList.toggle('hidden', state.searchQuery.length === 0);
            applyFilters();
        });
    }

    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;
        if (window.scrollY > 40) {
            navbar.classList.add('bg-cinema-950/95', 'shadow-lg');
            navbar.classList.remove('from-cinema-950/90', 'to-transparent');
        } else {
            navbar.classList.remove('bg-cinema-950/95', 'shadow-lg');
            navbar.classList.add('from-cinema-950/90', 'to-transparent');
        }
    });

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('movieModal');
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closeMovieModal();
        }
    });

    const movieModal = document.getElementById('movieModal');
    if (movieModal) {
        movieModal.addEventListener('click', (e) => {
            if (e.target.id === 'movieModal') closeMovieModal();
        });
    }
}

function openFeaturedMovie(autoPlay = false) {
    if (MOVIES_DATA.length === 0) return;
    const featuredMovie = MOVIES_DATA.find(m => m.featured) || MOVIES_DATA[0];
    openMovieModal(featuredMovie.id, autoPlay);
}

function renderCategories() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
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
    if (!btn) return;
    if (state.showFavoritesOnly) {
        btn.classList.add('ring-2', 'ring-cinema-accent', 'bg-cinema-700');
    } else {
        btn.classList.remove('ring-2', 'ring-cinema-accent', 'bg-cinema-700');
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    state.currentPage = 1;
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyFilters();
}

function resetFilters(event) {
    if (event) event.preventDefault();
    state.selectedCategory = 'All';
    state.searchQuery = '';
    state.sortBy = 'featured';
    state.showFavoritesOnly = false;
    state.currentPage = 1;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'featured';
    updateFavButtonStyle();
    renderCategories();
    applyFilters();
}

function applyFilters() {
    const sortSelect = document.getElementById('sortSelect');
    state.sortBy = sortSelect ? sortSelect.value : 'featured';
    
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

    if (countText) {
        countText.textContent = state.showFavoritesOnly 
            ? `បញ្ជីទុកមើល៖ ${movies.length} ភាពយន្ត`
            : `បង្ហាញ ${movies.length} ភាពយន្ត`;
    }

    if (!grid) return;

    if (movies.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        if (paginationContainer) paginationContainer.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
    }
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
                            <i class="${isFav ? 'fa-solid text-cinema-accent hover:text-white' : 'fa-regular'} fa-bookmark text-xs"></i>
                        </button>
                    </div>

                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div class="w-12 h-12 rounded-full bg-cinema-accent text-white flex items-center justify-center shadow-xl shadow-cinema-accent/50 transform scale-75 group-hover:scale-100 transition-transform">
                            <i class="fa-solid fa-play ml-0.5"></i>
                        </div>
                    </div>

                    <div class="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px]">
                        <span class="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-white font-medium">
                            ${movie.categoryKm}
                        </span>
                        <span class="text-slate-300 font-medium bg-black/50 px-1.5 py-0.5 rounded">
                            ${movie.year}
                        </span>
                    </div>
                </div>

                <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-bold text-sm sm:text-base text-white group-hover:text-cinema-accent transition-colors line-clamp-1">
                            ${movie.titleKm}
                        </h3>
                        <p class="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            ${movie.titleEn}
                        </p>
                    </div>
                    <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                        <span><i class="fa-regular fa-clock mr-1"></i>${movie.duration}</span>
                        <span class="text-cinema-accent font-medium group-hover:underline">មើលលម្អិត &rarr;</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button 
            onclick="changePage(${state.currentPage - 1})" 
            ${state.currentPage === 1 ? 'disabled' : ''}
            class="px-4 py-2 rounded-xl bg-cinema-800 border border-white/10 text-sm font-medium text-white hover:bg-cinema-accent disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
            &laquo; មុន (Prev)
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === state.currentPage;
        html += `
            <button 
                onclick="changePage(${i})"
                class="w-10 h-10 rounded-xl text-sm font-bold border transition-all ${
                    isActive 
                    ? 'bg-cinema-accent border-cinema-accent text-white shadow-lg shadow-cinema-accent/30' 
                    : 'bg-cinema-800 border-white/10 text-slate-300 hover:bg-cinema-700'
                }"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button 
            onclick="changePage(${state.currentPage + 1})" 
            ${state.currentPage === totalPages ? 'disabled' : ''}
            class="px-4 py-2 rounded-xl bg-cinema-800 border border-white/10 text-sm font-medium text-white hover:bg-cinema-accent disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
            បន្ទាប់ (Next) &raquo;
        </button>
    `;

    container.innerHTML = html;
}

function changePage(page) {
    state.currentPage = page;
    applyFilters();
    const grid = document.getElementById('moviesGrid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleFavorite(event, movieId) {
    if (event) event.stopPropagation();
    const index = state.favorites.indexOf(movieId);
    if (index === -1) {
        state.favorites.push(movieId);
        showToast('បានបន្ថែមទៅក្នុងបញ្ជីទុកមើល');
    } else {
        state.favorites.splice(index, 1);
        showToast('បានដកចេញពីបញ្ជីទុកមើល');
    }
    localStorage.setItem('aiMovieFavorites', JSON.stringify(state.favorites));
    updateFavoriteBadge();
    applyFilters();
    if (state.activeMovie && state.activeMovie.id === movieId) {
        updateModalFavButton(movieId);
    }
}

function toggleCurrentModalFavorite() {
    if (state.activeMovie) toggleFavorite(null, state.activeMovie.id);
}

function updateFavoriteBadge() {
    const badge = document.getElementById('favCountBadge');
    if (badge) badge.textContent = state.favorites.length;
}

function updateModalFavButton(movieId) {
    const btn = document.getElementById('modalFavBtn');
    if (!btn) return;
    const isFav = state.favorites.includes(movieId);
    btn.innerHTML = isFav 
        ? `<i class="fa-solid fa-bookmark text-cinema-accent"></i><span>បានរក្សាទុក</span>`
        : `<i class="fa-regular fa-bookmark"></i><span>រក្សាទុក</span>`;
}

function openMovieModal(movieId, autoPlay = false) {
    const movie = MOVIES_DATA.find(m => m.id === movieId);
    if (!movie) return;

    state.activeMovie = movie;
    stopRealPlayer();

    const backdropImg = document.getElementById('modalBackdropImg');
    if (backdropImg) {
        backdropImg.src = movie.backdrop;
        backdropImg.onerror = function() {
            this.onerror = null;
            this.src = `https://placehold.co/1280x720/0d111a/e11d48?text=${encodeURIComponent(movie.titleEn)}`;
        };
    }

    document.getElementById('modalCategoryBadge').textContent = `${movie.category} • ${movie.categoryKm}`;
    document.getElementById('modalYearBadge').textContent = movie.year;
    document.getElementById('modalDurationBadge').textContent = movie.duration;
    document.getElementById('modalRatingBadge').textContent = Number(movie.rating).toFixed(1);
    document.getElementById('modalTitleKm').textContent = movie.titleKm;
    document.getElementById('modalTitleEn').textContent = movie.titleEn;
    document.getElementById('modalSynopsis').textContent = movie.synopsis;
    document.getElementById('modalDirector').textContent = movie.director;
    document.getElementById('modalCast').textContent = movie.cast || 'មិនមានទិន្នន័យ';
    updateModalFavButton(movie.id);

    const modal = document.getElementById('movieModal');
    const modalContent = document.getElementById('modalContent');
    if (modal && modalContent) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        });
    }

    if (autoPlay) startRealPlayer();
}

function closeMovieModal() {
    stopRealPlayer();
    const modal = document.getElementById('movieModal');
    const modalContent = document.getElementById('modalContent');

    if (modal && modalContent) {
        modal.classList.add('opacity-0');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            state.activeMovie = null;
        }, 300);
    }
}

function startRealPlayer() {
    if (!state.activeMovie) return;
    const rawVideoUrl = state.activeMovie.video;
    if (!rawVideoUrl) {
        showToast('មិនទាន់មានវីដេអូសម្រាប់រឿងនេះទេ!');
        return;
    }

    const backdropView = document.getElementById('modalBackdropView');
    if (backdropView) backdropView.classList.add('hidden');

    const playerView = document.getElementById('modalPlayerView');
    if (playerView) {
        playerView.classList.remove('hidden');
        playerView.classList.add('flex');
    }

    const videoEl = document.getElementById('realVideoPlayer');
    const ytEl = document.getElementById('youtubePlayer');

    const isIframeEmbed = rawVideoUrl.includes('youtube.com') || 
                          rawVideoUrl.includes('youtu.be') || 
                          rawVideoUrl.includes('drive.google.com') ||
                          rawVideoUrl.includes('ok.ru');

    if (isIframeEmbed) {
        if (videoEl) {
            videoEl.classList.add('hidden');
            videoEl.pause();
            videoEl.src = '';
        }
        if (ytEl) {
            ytEl.classList.remove('hidden');
            ytEl.setAttribute('allowfullscreen', 'true');
            ytEl.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');

            const embedUrl = formatVideoEmbedUrl(rawVideoUrl);
            ytEl.src = embedUrl;

            let extBtn = document.getElementById('externalDriveBtn');
            if (!extBtn && playerView) {
                extBtn = document.createElement('a');
                extBtn.id = 'externalDriveBtn';
                extBtn.target = '_blank';
                extBtn.className = 'mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cinema-accent hover:bg-rose-700 text-white text-xs font-bold shadow-lg transition-all';
                playerView.appendChild(extBtn);
            }
            if (extBtn) {
                extBtn.href = embedUrl;
                extBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> បើកមើលពេញអេក្រង់ (បើវីដេអូអត់ចេញលើទូរស័ព្ទ)';
                extBtn.classList.toggle('hidden', !(rawVideoUrl.includes('drive.google.com') || rawVideoUrl.includes('ok.ru')));
            }
        }
    } else {
        if (ytEl) {
            ytEl.classList.add('hidden');
            ytEl.src = '';
        }
        const extBtn = document.getElementById('externalDriveBtn');
        if (extBtn) extBtn.classList.add('hidden');
        if (videoEl) {
            videoEl.classList.remove('hidden');
            videoEl.src = rawVideoUrl;
            videoEl.play();
        }
    }
}

function stopRealPlayer() {
    const videoEl = document.getElementById('realVideoPlayer');
    const ytEl = document.getElementById('youtubePlayer');
    const extBtn = document.getElementById('externalDriveBtn');
    if (videoEl) { videoEl.pause(); videoEl.src = ''; }
    if (ytEl) { ytEl.src = ''; }
    if (extBtn) { extBtn.classList.add('hidden'); }
    const playerView = document.getElementById('modalPlayerView');
    if (playerView) { playerView.classList.add('hidden'); playerView.classList.remove('flex'); }
    const backdropView = document.getElementById('modalBackdropView');
    if (backdropView) { backdropView.classList.remove('hidden'); }
}

function shareMovie() {
    if (!state.activeMovie) return;
    const shareText = `ទស្សនារឿង "${state.activeMovie.titleKm} (${state.activeMovie.titleEn})" នៅលើ ពិភព AI Movie!`;
    navigator.clipboard?.writeText(shareText);
    showToast('បានចម្លងតំណភ្ជាប់ភាពយន្តរួចរាល់!');
}

let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
