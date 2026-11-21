const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nolzz2026'; // Change this password!

// Directories & Database File
const PUBLIC_DIR = path.join(__dirname, 'public');
const MEDIA_DIR = path.join(__dirname, 'Video and Img');
const DB_FILE = path.join(__dirname, 'movies.json');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Initial seed data (migrated from your frontend)
const INITIAL_MOVIES = [
    { id: 1, titleKm: "គេសង្ស័យខ្ញុំទាក់ទងជាមួយគ្រូបន្ទុកថ្នាក់ តាមពិតគាត់ជាឪពុករបស់ខ្ញុំសោះ", titleEn: "Dad's Teacher", category: "Drama", year: 2026, rating: 9.1, duration: "1h 08m", featured: true, poster: "/media/Img1.jpg", backdrop: "/media/Img1.jpg", video: "/media/V1.mp4", director: "Nolzz", cast: "ស៊ីវ៉ាន , លោកគ្រូចូវ", synopsis: "សាច់រឿងសង្ខេបនៃរឿង Dad's Teacher..." },
    { id: 2, titleKm: "អ្នកជិតខាងចិញ្ចឹមជ្រូក40ក្បាល ធ្វើអោយអ្នកភូមិស្អុយលាមក", titleEn: "The Bad Neighbor", category: "Drama", year: 2026, rating: 9.3, duration: "0h 50m", featured: false, poster: "/media/Img2.jpg", backdrop: "/media/Img2.jpg", video: "/media/V2.mp4", director: "Nolzz", cast: "តួរអង្គប្រុសក្មេង , អុីអ្នកជិតខាងអាក្រក់", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Bad Neighbor..." },
    { id: 3, titleKm: "អ្នកជិតខាង ចិត្តអាក្រក់ទាំងគ្រួសារ", titleEn: "The Bad Family Neighbor", category: "Drama", year: 2026, rating: 9.0, duration: "0h 58m", featured: false, poster: "/media/Img3.jpg", backdrop: "/media/Img3.jpg", video: "/media/V3.mp4", director: "Nolzz", cast: "តួរអង្គក្មេងស្រី , គ្រួសារអ្នកជិតខាងអាក្រក់", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Bad Family Neighbor..." },
    { id: 4, titleKm: "កំពូលកូនស្រីនាំសំណាង", titleEn: "The Lucky daughter", category: "Ancient", year: 2026, rating: 9.3, duration: "2h 14m", featured: false, poster: "/media/Img4.png", backdrop: "/media/Img4.png", video: "/media/V4.mp4", director: "Nolzz", cast: "តួរអង្គលីន សៀវប៉ាវ", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Lucky daughter..." },
    { id: 5, titleKm: "សន្យាស្នេហ៍ហួសពេល", titleEn: "An Overdue Promise of Love", category: "Drama", year: 2026, rating: 9.4, duration: "1h 18m", featured: false, poster: "/media/Img5.jpg", backdrop: "/media/Img5.jpg", video: "/media/V5.mp4", director: "Nolzz", cast: "តួរអង្គប្រុសស្អាត ស្រីស្អាត", synopsis: "សាច់រឿងសង្ខេបនៃរឿង An Overdue Promise of Love..." },
    { id: 6, titleKm: "មហាសេដ្ឋីធ្វើពុតជាក្រត្រឡប់មកល្បងចិត្តកូនប្រុសទាំងពីរ", titleEn: "The Disguised Father", category: "Drama", year: 2026, rating: 8.8, duration: "0h 50m", featured: false, poster: "/media/Img6.jpg", backdrop: "/media/Img6.jpg", video: "/media/V6.mp4", director: "Nolzz", cast: "តួរអង្គឪពុក កូនប្រុសទាំងពិរ", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Disguised Father..." },
    { id: 7, titleKm: "កើតក្នុងឆ្នាំ80ការពារបងថ្លៃស្រី5នាក់", titleEn: "The Reborn in the 80s Protect 5 sisters-in-law", category: "Ancient", year: 2026, rating: 8.7, duration: "1h 16m", featured: false, poster: "/media/Img7.jpg", backdrop: "/media/Img7.jpg", video: "/media/V7.mp4", director: "Nolzz", cast: "តួរអង្គបុរសប្អូនថ្លៃ បងស្រីថ្លៃទាំង5", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Reborn in the 80s..." },
    { id: 8, titleKm: "កំពូលជាងផ្សាដែកតែថៅកែមើលងាយ", titleEn: "The Top Steel Dealer", category: "Ancient", year: 2026, rating: 8.9, duration: "0h 47m", featured: false, poster: "/media/Img8.jpg", backdrop: "/media/Img8.jpg", video: "/media/V8.mp4", director: "Nolzz", cast: "តួរអង្គបុរសផ្សាដែក ថៅកែអាក្រក់", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Top Steel Dealer..." },
    { id: 9, titleKm: "រៀបការច្រឡំ", titleEn: "The Confus Wedding", category: "Ancient", year: 2026, rating: 9.0, duration: "2h 19m", featured: false, poster: "/media/Img9.jpg", backdrop: "/media/Img9.jpg", video: "/media/V9.mp4", director: "Nolzz", cast: "តួរអង្គកូនកំលោះ តួស្រី", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Confus Wedding..." },
    { id: 10, titleKm: "នៅលើកោះដាច់ស្រយ៉ាល តែខ្ញុំអាចបង្កើតអ្វីគ្រប់យ៉ាង", titleEn: "The Stranded on a remote island", category: "Ancient", year: 2026, rating: 8.5, duration: "2h 18m", featured: false, poster: "/media/Img10.jpg", backdrop: "/media/Img10.jpg", video: "/media/V10.mp4", director: "Nolzz", cast: "តួរអង្គបុរស តួស្រី", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Stranded on a remote island..." },
    { id: 11, titleKm: "អាថ៌កំបាំងនាគទេពនៅភ្នំក្រោយផ្ទះ", titleEn: "The Dragon", category: "Ancient", year: 2026, rating: 9.1, duration: "2h 06m", featured: false, poster: "/media/Img11.webp", backdrop: "/media/Img11.webp", video: "/media/V11.mp4", director: "Nolzz", cast: "តួរអង្គបុរស នាគទេព", synopsis: "សាច់រឿងសង្ខេបនៃរឿង The Dragon..." }
];

// Helper functions to read/write JSON database
function readMovies() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_MOVIES, null, 2), 'utf8');
        return INITIAL_MOVIES;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeMovies(movies) {
    fs.writeFileSync(DB_FILE, JSON.stringify(movies, null, 2), 'utf8');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/media', express.static(MEDIA_DIR));
app.use('/Video and Img', express.static(MEDIA_DIR)); // Keeps backward compatibility with your old paths

// Multer setup for uploading posters and videos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MEDIA_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const prefix = file.fieldname === 'poster' ? 'Img_' : 'V_';
        cb(null, `${prefix}${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Simple Admin Auth Middleware
function requireAdmin(req, res, next) {
    const authHeader = req.headers['x-admin-password'];
    if (authHeader !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'លេខសម្ងាត់មិនត្រឹមត្រូវ (Invalid Admin Password)' });
    }
    next();
}

// ==================== API ROUTES ====================

// 1. GET all movies (with optional search, category, sort)
app.get('/api/movies', (req, res) => {
    let movies = readMovies();
    const { category, search, sort } = req.query;

    if (category && category !== 'All') {
        movies = movies.filter(m => m.category === category);
    }

    if (search) {
        const q = search.toLowerCase();
        movies = movies.filter(m =>
            m.titleKm.toLowerCase().includes(q) ||
            m.titleEn.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q)
        );
    }

    if (sort === 'rating') {
        movies.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'newest') {
        movies.sort((a, b) => b.year - a.year || b.id - a.id);
    }

    res.json(movies);
});

// 2. GET single movie by ID
app.get('/api/movies/:id', (req, res) => {
    const movies = readMovies();
    const movie = movies.find(m => m.id === Number(req.params.id));
    if (!movie) return res.status(404).json({ error: 'រកមិនឃើញភាពយន្តនេះទេ' });
    res.json(movie);
});

// 3. POST new movie (Admin Upload: supports file upload OR YouTube/external URL)
app.post(
    '/api/movies',
    requireAdmin,
    upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
    (req, res) => {
        const movies = readMovies();
        const nextId = movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1;

        const posterPath = req.files?.poster?.[0]
            ? `/media/${req.files.poster[0].filename}`
            : (req.body.posterUrl || `https://placehold.co/400x600/161d2c/e11d48?text=Movie+${nextId}`);

        const videoPath = req.files?.video?.[0]
            ? `/media/${req.files.video[0].filename}`
            : (req.body.videoUrl || '');

        const isFeatured = req.body.featured === 'true' || req.body.featured === true;
        if (isFeatured) {
            movies.forEach(m => (m.featured = false));
        }

        const newMovie = {
            id: nextId,
            titleKm: req.body.titleKm || 'គ្មានចំណងជើង',
            titleEn: req.body.titleEn || 'Untitled Movie',
            category: req.body.category || 'Drama',
            year: Number(req.body.year) || 2026,
            rating: parseFloat(req.body.rating) || 9.0,
            duration: req.body.duration || '1h 30m',
            featured: isFeatured,
            poster: posterPath,
            backdrop: posterPath,
            video: videoPath,
            director: req.body.director || 'Nolzz',
            cast: req.body.cast || 'Nolzz',
            synopsis: req.body.synopsis || `សាច់រឿងសង្ខេបនៃរឿង ${req.body.titleEn || ''}...`
        };

        movies.unshift(newMovie); // Add newest movie to the top
        writeMovies(movies);
        res.status(201).json(newMovie);
    }
);

// 4. DELETE a movie (Admin)
app.delete('/api/movies/:id', requireAdmin, (req, res) => {
    let movies = readMovies();
    const index = movies.findIndex(m => m.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'រកមិនឃើញភាពយន្តនេះទេ' });

    const [deleted] = movies.splice(index, 1);
    writeMovies(movies);
    res.json({ message: 'បានលុបភាពយន្តដោយជោគជ័យ', deleted });
});

// Start Server
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🎬 ពិភព AI Movie Server is running!`);
    console.log(`🌐 Website:     http://localhost:${PORT}`);
    console.log(`🛠️  Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`🔑 Admin Pass:  ${ADMIN_PASSWORD}`);
    console.log(`=================================================`);
});