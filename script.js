// 1. Supabase Initialization
// REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'https://zwboslsunhrynvgrqtav.supabase.co'; // e.g., https://your-project-ref.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Ym9zbHN1bmhyeW52Z3JxdGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTE4NTEsImV4cCI6MjA2NDc4Nzg1MX0.0UopuPQCkHxE-uQArN78lcV1ead4pc1sTIe5lkWyD4w'; // e.g., eyJhbGciOiJIUzI1Ni...

// THIS LINE IS WHERE Supabase.createClient IS CALLED
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

// --- New Function to Handle Name Dropdown Change ---
/**
 * Shows/hides the "other name" input field based on the selected name.
 */
function handleNameChange() {
    const nameInput = document.getElementById('nameInput');
    const otherNameContainer = document.getElementById('otherNameContainer');
    const otherNameInput = document.getElementById('otherNameInput');

    if (nameInput.value === 'OTHERS') {
        otherNameContainer.style.display = 'block'; // Show the text field
        otherNameInput.focus(); // Focus on it for immediate typing
    } else {
        otherNameContainer.style.display = 'none'; // Hide the text field
        otherNameInput.value = ''; // Clear its value when hidden
    }
}

// --- Supabase Data Operations ---

/**
 * Fetches all movies from Supabase and updates the timeline.
 */
async function fetchMovies() {
    console.log('Fetching movies from Supabase...');
    const { data, error } = await supabase
        .from('movies')
        .select('*') // Select all columns (including the new 'review')
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
    console.log('addMovie function called.');
    const nameInputSelect = document.getElementById('nameInput'); // This is now the select element
    const otherNameInput = document.getElementById('otherNameInput'); // The input for "OTHERS"
    const movieInput = document.getElementById('movieInput');
    const ratingInput = document.getElementById('ratingInput');
    const reviewInput = document.getElementById('reviewInput'); // New review input

    let name = nameInputSelect.value;
    // If "OTHERS" is selected, use the text from the otherNameInput
    if (name === 'OTHERS') {
        name = otherNameInput.value.trim();
    }
    
    const movie_title = movieInput.value.trim(); // Match database column name
    const rating = parseInt(ratingInput.value); // Ensure rating is an integer
    const review = reviewInput.value.trim(); // Get the review text

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
    const { data, error } = await supabase // Accessing 'supabase' here
        .from('movies')
        .insert([
            { name, movie_title, rating, review } // Include the new 'review' field
        ]);

    if (error) {
        console.error('Error adding movie to Supabase:', error.message, error.details, error.hint, error.code);
        alert(`Failed to add movie: ${error.message}. Please check your Supabase rules and console for details.`);
        return;
    }

    console.log('Movie added successfully to Supabase:', data);
    // Real-time listener will handle re-rendering, no need to call fetchMovies() here.

    // Clear input fields and reset dropdowns
    nameInputSelect.value = ''; // Reset name dropdown
    nameInputSelect.selectedIndex = 0; // Ensures "Select your name" is shown
    otherNameInput.value = ''; // Clear "OTHERS" input
    document.getElementById('otherNameContainer').style.display = 'none'; // Hide "OTHERS" input
    movieInput.value = '';
    ratingInput.value = ''; // Clears the value
    ratingInput.selectedIndex = 0; // Resets select to default option
    reviewInput.value = ''; // Clear review text
    console.log('Input fields cleared.');
}

/**
 * Sets up a real-time listener for changes in the 'movies' table.
 * Any insert, update, or delete will trigger a re-fetch.
 */
function setupRealtimeListener() {
    supabase // Accessing 'supabase' here
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

/**
 * Deletes a movie entry from the Supabase database.
 * @param {string} id - The unique ID of the movie to delete.
 */
async function deleteMovie(id) {
    // Use a custom modal for confirmation instead of alert/confirm
    showConfirmationModal('Are you sure you want to delete this movie entry?', async () => {
        console.log('Attempting to delete movie with ID:', id);
        const { error } = await supabase // Accessing 'supabase' here
            .from('movies')
            .delete()
            .eq('id', id); // Delete where the 'id' column matches the provided ID

        if (error) {
            console.error('Error deleting movie:', error.message);
            alert('Failed to delete movie. Please try again.'); // Using alert for simplicity here, but a custom modal is better
        } else {
            console.log('Movie deleted successfully:', id);
            // Real-time listener will handle re-rendering.
        }
    });
}

// --- Custom Modal for Confirmation (replaces confirm()) ---
// This is a basic implementation. For a more robust solution, you'd create
// dedicated HTML/CSS for the modal.
function showConfirmationModal(message, onConfirm) {
    // Check if a modal already exists to prevent duplicates
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
        const formattedDate = movie.created_at ? new Date(movie.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date';

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
 * Note: This filter shows names *from the data*, not the fixed input options.
 */
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

    // Re-apply the selection if it still exists
    nameFilterSelect.value = currentSelection;
}

function filterTimeline() {
    renderTimeline(); // Just re-render based on current filters and `allMovies`
}
