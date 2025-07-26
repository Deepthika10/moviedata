// 1. Supabase Initialization
// REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL =
// Global variable to hold the Supabase client
let supabase;

// Global variable to hold movies once fetched and for filtering
let allMovies = [];

// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for the Supabase library to be fully loaded
    setTimeout(() => {
        initializeSupabase();
    }, 100);
});

function initializeSupabase() {
    try {
        // Check if Supabase is available
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded. Trying alternative access...');
            
            // Try alternative ways to access Supabase
            if (typeof supabase !== 'undefined') {
                // Global supabase variable
                window.supabase = supabase;
            } else if (typeof window.Supabase !== 'undefined') {
                // Capital S Supabase
                window.supabase = window.Supabase;
            } else {
                throw new Error('Supabase library is not available');
            }
        }

        // Initialize Supabase client
        const { createClient } = window.supabase;
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        console.log('Supabase client initialized successfully.');

        // Start listening for real-time changes on page load
        setupRealtimeListener();
        // Also fetch movies once initially to populate the timeline and filters
        fetchMovies();
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        
        // Show user-friendly error message
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = `
            <div style="color: red; text-align: center; padding: 20px; border: 1px solid #ffcccb; border-radius: 8px; background-color: #ffe6e6;">
                <h4>⚠️ Connection Error</h4>
                <p>Unable to connect to the database. Please refresh the page and try again.</p>
                <p><small>Error: ${error.message}</small></p>
                <button onclick="location.reload()" style="margin-top: 10px;">Refresh Page</button>
            </div>
        `;
    }
}

// --- New Function to Handle Name Dropdown Change ---
/**
 * Shows/hides the "other name" input field based on the selected name.
 */
function handleNameChange() {
    const nameInput = document.getElementById('nameInput');
    const otherNameContainer = document.getElementById('otherNameContainer');
    const otherNameInput = document.getElementById('otherNameInput');

    if (nameInput.value === 'OTHERS') {
        otherNameContainer.style.display = 'block';
        otherNameInput.focus();
    } else {
        otherNameContainer.style.display = 'none';
        otherNameInput.value = '';
    }
}

// --- Supabase Data Operations ---

/**
 * Fetches all movies from Supabase and updates the timeline.
 */
async function fetchMovies() {
    if (!supabase) {
        console.error('Supabase client not initialized');
        return;
    }

    console.log('Fetching movies from Supabase...');
    
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        allMovies = data || [];
        console.log('Movies fetched:', allMovies);
        renderTimeline();
        updateNameFilter();
        
    } catch (error) {
        console.error('Error fetching movies:', error.message);
        document.getElementById('timeline').innerHTML = `
            <p style="color: red;">Error loading movies: ${error.message}</p>
            <button onclick="fetchMovies()">Try Again</button>
        `;
    }
}

/**
 * Adds a new movie entry to the Supabase database.
 */
async function addMovie() {
    if (!supabase) {
        alert('Database connection not available. Please refresh the page.');
        return;
    }

    console.log('addMovie function called.');
    const nameInputSelect = document.getElementById('nameInput');
    const otherNameInput = document.getElementById('otherNameInput');
    const movieInput = document.getElementById('movieInput');
    const ratingInput = document.getElementById('ratingInput');
    const reviewInput = document.getElementById('reviewInput');

    let name = nameInputSelect.value;
    if (name === 'OTHERS') {
        name = otherNameInput.value.trim();
    }

    const movie_title = movieInput.value.trim();
    const rating = parseInt(ratingInput.value);
    const review = reviewInput.value.trim();

    console.log('Input values:', { name, movie_title, rating, review });

    // Basic validation
    if (!name || !movie_title || isNaN(rating) || rating < 1 || rating > 5) {
        let errorMessage = 'Please ensure:';
        if (!name) errorMessage += '\n- Your name is selected or entered.';
        if (!movie_title) errorMessage += '\n- A movie title is provided.';
        if (isNaN(rating) || rating < 1 || rating > 5) errorMessage += '\n- A valid rating is selected (1-5).';
        alert(errorMessage);
        console.warn('Validation failed:', errorMessage);
        return;
    }

    console.log('Validation passed. Attempting to insert into Supabase...');
    
    try {
        const { data, error } = await supabase
            .from('movies')
            .insert([
                { name, movie_title, rating, review }
            ]);

        if (error) {
            throw error;
        }

        console.log('Movie added successfully to Supabase:', data);

        // Clear input fields and reset dropdowns
        nameInputSelect.value = '';
        nameInputSelect.selectedIndex = 0;
        otherNameInput.value = '';
        document.getElementById('otherNameContainer').style.display = 'none';
        movieInput.value = '';
        ratingInput.value = '';
        ratingInput.selectedIndex = 0;
        reviewInput.value = '';
        console.log('Input fields cleared.');
        
    } catch (error) {
        console.error('Error adding movie to Supabase:', error.message);
        alert(`Failed to add movie: ${error.message}. Please try again.`);
    }
}

/**
 * Sets up a real-time listener for changes in the 'movies' table.
 */
function setupRealtimeListener() {
    if (!supabase) {
        console.error('Cannot setup realtime listener: Supabase client not initialized');
        return;
    }

    try {
        supabase
            .channel('public:movies')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'movies' },
                (payload) => {
                    console.log('Realtime change detected:', payload);
                    fetchMovies();
                }
            )
            .subscribe();
        console.log('Supabase real-time listener set up.');
    } catch (error) {
        console.error('Error setting up realtime listener:', error);
    }
}

/**
 * Deletes a movie entry from the Supabase database.
 */
async function deleteMovie(id) {
    if (!supabase) {
        alert('Database connection not available. Please refresh the page.');
        return;
    }

    showConfirmationModal('Are you sure you want to delete this movie entry?', async () => {
        console.log('Attempting to delete movie with ID:', id);
        
        try {
            const { error } = await supabase
                .from('movies')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            console.log('Movie deleted successfully:', id);
        } catch (error) {
            console.error('Error deleting movie:', error.message);
            alert(`Failed to delete movie: ${error.message}`);
        }
    });
}

// --- Custom Modal for Confirmation ---
function showConfirmationModal(message, onConfirm) {
    if (document.getElementById('customConfirmationModal')) {
        return;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'customConfirmationModal';
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.6); display: flex;
        justify-content: center; align-items: center; z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white; padding: 25px; border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3); text-align: center;
        max-width: 400px; width: 90%;
    `;

    const messagePara = document.createElement('p');
    messagePara.textContent = message;
    messagePara.style.marginBottom = '20px';
    messagePara.style.fontSize = '1.1rem';
    messagePara.style.color = '#333';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-around';
    buttonContainer.style.gap = '10px';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Yes, Delete';
    confirmButton.style.cssText = `
        background-color: #e74c3c; color: white; border: none;
        padding: 10px 15px; border-radius: 5px; cursor: pointer;
        font-size: 0.95rem; flex-grow: 1;
    `;
    confirmButton.onmouseover = () => confirmButton.style.backgroundColor = '#c0392b';
    confirmButton.onmouseout = () => confirmButton.style.backgroundColor = '#e74c3c';
    confirmButton.onclick = () => {
        onConfirm();
        document.body.removeChild(modalOverlay);
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
        background-color: #7f8c8d; color: white; border: none;
        padding: 10px 15px; border-radius: 5px; cursor: pointer;
        font-size: 0.95rem; flex-grow: 1;
    `;
    cancelButton.onmouseover = () => cancelButton.style.backgroundColor = '#6c7a89';
    cancelButton.onmouseout = () => cancelButton.style.backgroundColor = '#7f8c8d';
    cancelButton.onclick = () => {
        document.body.removeChild(modalOverlay);
    };

    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);
    modalContent.appendChild(messagePara);
    modalContent.appendChild(buttonContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
}

// --- Rendering and Filtering Functions ---

function renderTimeline() {
    const timelineContainer = document.getElementById('timeline');
    const nameFilter = document.getElementById('nameFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;

    let filteredMovies = allMovies;

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

    timelineContainer.innerHTML = '';

    filteredMovies.forEach(movie => {
        const timelineItem = document.createElement('article');
        timelineItem.classList.add('timeline-item');

        const ratingStars = '★'.repeat(movie.rating) + '☆'.repeat(5 - movie.rating);
        const formattedDate = movie.created_at 
            ? new Date(movie.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
            : 'Unknown Date';

        timelineItem.innerHTML = `
            <h4>${movie.movie_title}</h4>
            <p>${ratingStars}</p>
            ${movie.review ? `<p><em>Review:</em> ${movie.review}</p>` : ''}
            <small class="meta">Rated by <strong>${movie.name}</strong> on ${formattedDate}</small>
            <button class="delete-button" onclick="deleteMovie('${movie.id}')">Delete</button>
        `;
        timelineContainer.appendChild(timelineItem);
    });
}

/**
 * Populates the name filter dropdown with unique names from the database.
 */
function updateNameFilter() {
    const nameFilterSelect = document.getElementById('nameFilter');
    const names = [...new Set(allMovies.map(movie => movie.name))];
    const currentSelection = nameFilterSelect.value;

    nameFilterSelect.innerHTML = '<option value="all">All</option>';

    names.sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameFilterSelect.appendChild(option);
    });

    nameFilterSelect.value = currentSelection;
}

function filterTimeline() {
    renderTimeline();
}
