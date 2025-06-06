// 1. Supabase Initialization
// REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'https://zwboslsunhrynvgrqtav.supabase.co'; // e.g., https://your-project-ref.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Ym9zbHN1bmhyeW52Z3JxdGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTE4NTEsImV4cCI6MjA2NDc4Nzg1MX0.0UopuPQCkHxE-uQArN78lcV1ead4pc1sTIe5lkWyD4w'; // e.g., eyJhbGciOiJIUzI1Ni...

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variable to hold movies once fetched and for filtering
let allMovies = [];

// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Start listening for real-time changes on page load
    setupRealtimeListener();
    // Also fetch movies once initially to populate the timeline and filters
    fetchMovies();
});

// --- Supabase Data Operations ---

/**
 * Fetches all movies from Supabase and updates the timeline.
 */
async function fetchMovies() {
    console.log('Fetching movies from Supabase...');
    const { data, error } = await supabase
        .from('movies')
        .select('*') // Select all columns
        .order('created_at', { ascending: false }); // Order by newest first

    if (error) {
        console.error('Error fetching movies:', error.message);
        document.getElementById('timeline').innerHTML = '<p style="color: red;">Error loading movies. Please try again.</p>';
        return;
    }

    allMovies = data || []; // Store fetched movies
    console.log('Movies fetched:', allMovies);
    renderTimeline(); // Re-render the timeline with fetched data
    updateNameFilter(); // Update name filter based on fetched data
}

/**
 * Adds a new movie entry to the Supabase database.
 */
async function addMovie() {
    const nameInput = document.getElementById('nameInput');
    const movieInput = document.getElementById('movieInput');
    const ratingInput = document.getElementById('ratingInput');

    const name = nameInput.value.trim();
    const movie_title = movieInput.value.trim(); // Match database column name
    const rating = parseInt(ratingInput.value); // Ensure rating is an integer

    if (name && movie_title && !isNaN(rating) && rating >= 1 && rating <= 5) {
        console.log('Adding movie:', { name, movie_title, rating });
        const { data, error } = await supabase
            .from('movies')
            .insert([
                { name, movie_title, rating } // created_at will be automatically set by DB
            ]);

        if (error) {
            console.error('Error adding movie:', error.message);
            alert('Failed to add movie. Please try again.');
            return;
        }

        console.log('Movie added successfully:', data);
        // No need to manually call renderTimeline() or fetchMovies() here,
        // as the real-time listener will pick up the change and re-render.

        // Clear input fields
        nameInput.value = '';
        movieInput.value = '';
        ratingInput.value = ''; // Clears the value
        ratingInput.selectedIndex = 0; // Resets select to default option
    } else {
        alert('Please fill in all fields correctly (Your Name, Movie Title, and select a Rating from 1-5).');
    }
}

/**
 * Sets up a real-time listener for changes in the 'movies' table.
 * Any insert, update, or delete will trigger a re-fetch.
 */
function setupRealtimeListener() {
    supabase
        .channel('public:movies') // Listen to changes in the 'movies' table
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'movies' },
            (payload) => {
                console.log('Realtime change detected:', payload);
                // When a change occurs (insert, update, delete), re-fetch all movies
                // This keeps `allMovies` array and the UI in sync.
                fetchMovies();
            }
        )
        .subscribe(); // Don't forget to subscribe!
    console.log('Supabase real-time listener set up.');
}


// --- Rendering and Filtering Functions (Mostly unchanged, but uses allMovies) ---

function renderTimeline() {
    const timelineContainer = document.getElementById('timeline');
    
    const nameFilter = document.getElementById('nameFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;

    let filteredMovies = allMovies; // Use the globally stored movies

    if (nameFilter !== 'all') {
        filteredMovies = filteredMovies.filter(movie => movie.name === nameFilter);
    }

    if (ratingFilter !== 'all') {
        filteredMovies = filteredMovies.filter(movie => movie.rating.toString() === ratingFilter);
    }

    if (filteredMovies.length === 0) {
        timelineContainer.innerHTML = '<p>No movies match your filters. Try something else!</p>';
        return;
    }

    timelineContainer.innerHTML = ''; // Clear the timeline

    filteredMovies.forEach(movie => {
        const timelineItem = document.createElement('article');
        timelineItem.classList.add('timeline-item');

        const ratingStars = '★'.repeat(movie.rating) + '☆'.repeat(5 - movie.rating);
        // Check if created_at exists before formatting (for older entries if any)
        const formattedDate = movie.created_at ? new Date(movie.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date';


        timelineItem.innerHTML = `
            <h4>${movie.movie_title}</h4>
            <p>${ratingStars}</p>
            <small class="meta">Rated by <strong>${movie.name}</strong> on ${formattedDate}</small>
        `;
        timelineContainer.appendChild(timelineItem);
    });
}

function updateNameFilter() {
    const nameFilterSelect = document.getElementById('nameFilter');
    // Get unique names from the *current* list of allMovies
    const names = [...new Set(allMovies.map(movie => movie.name))]; 

    const currentSelection = nameFilterSelect.value;
    
    nameFilterSelect.innerHTML = '<option value="all">All</option>'; // Reset
    
    names.sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameFilterSelect.appendChild(option);
    });

    nameFilterSelect.value = currentSelection;
}

function filterTimeline() {
    renderTimeline(); // Just re-render based on current filters and `allMovies`
}
