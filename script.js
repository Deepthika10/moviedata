document.addEventListener('DOMContentLoaded', () => {
    loadMovies();
    renderTimeline();
    updateNameFilter();
});

function getMovies() {
    // Get movies from localStorage or return an empty array
    const moviesJSON = localStorage.getItem('familyMovies');
    return moviesJSON ? JSON.parse(moviesJSON) : [];
}

function saveMovies(movies) {
    // Save movies to localStorage
    localStorage.setItem('familyMovies', JSON.stringify(movies));
}

function addMovie() {
    const nameInput = document.getElementById('nameInput');
    const movieInput = document.getElementById('movieInput');
    const ratingInput = document.getElementById('ratingInput');

    const name = nameInput.value.trim();
    const movie = movieInput.value.trim();
    const rating = ratingInput.value;

    if (name && movie && rating) {
        const movies = getMovies();
        const movieData = {
            name,
            movie,
            rating,
            timestamp: new Date().toISOString()
        };
        movies.unshift(movieData); // Add new movie to the top
        saveMovies(movies);

        renderTimeline();
        updateNameFilter();

        // Clear input fields
        nameInput.value = '';
        movieInput.value = '';
        ratingInput.value = '';

    } else {
        alert('Please fill out all fields!');
    }
}

function renderTimeline() {
    const timelineContainer = document.getElementById('timeline');
    const movies = getMovies();
    
    const nameFilter = document.getElementById('nameFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;

    let filteredMovies = movies;

    if (nameFilter !== 'all') {
        filteredMovies = filteredMovies.filter(movie => movie.name === nameFilter);
    }

    if (ratingFilter !== 'all') {
        filteredMovies = filteredMovies.filter(movie => movie.rating === ratingFilter);
    }

    if (filteredMovies.length === 0) {
        timelineContainer.innerHTML = '<p>No movies match your filters. Try something else!</p>';
        return;
    }

    timelineContainer.innerHTML = ''; // Clear the timeline

    filteredMovies.forEach(movie => {
        const timelineItem = document.createElement('article');
        timelineItem.classList.add('timeline-item');

        const ratingStars = '★'.repeat(parseInt(movie.rating)) + '☆'.repeat(5 - parseInt(movie.rating));
        const formattedDate = new Date(movie.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        timelineItem.innerHTML = `
            <h4>${movie.movie}</h4>
            <p>${ratingStars}</p>
            <small class="meta">Rated by <strong>${movie.name}</strong> on ${formattedDate}</small>
        `;
        timelineContainer.appendChild(timelineItem);
    });
}

function updateNameFilter() {
    const nameFilterSelect = document.getElementById('nameFilter');
    const movies = getMovies();
    const names = [...new Set(movies.map(movie => movie.name))]; // Get unique names

    // Remember the current selection
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
    renderTimeline();
}

// Initial setup call
function loadMovies() {
    const movies = getMovies();
    if (movies.length === 0) {
        // You can add some example data for the first time
        const exampleMovies = [
            { name: 'Dad', movie: 'The Godfather', rating: '5', timestamp: new Date().toISOString() },
            { name: 'Mom', movie: 'The Sound of Music', rating: '4', timestamp: new Date(Date.now() - 86400000).toISOString() } // 1 day ago
        ];
        saveMovies(exampleMovies);
    }
}
