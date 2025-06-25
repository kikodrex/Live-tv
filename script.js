document.addEventListener('DOMContentLoaded', () => {
    const m3uUrlInput = document.getElementById('m3uUrl');
    const loadUrlBtn = document.getElementById('loadUrlBtn');
    const m3uContentTextarea = document.getElementById('m3uContent');
    const loadContentBtn = document.getElementById('loadContentBtn');

    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentTrackTitle = document.getElementById('currentTrackTitle');
    const playlistUl = document.getElementById('playlist');

    let playlist = [];
    let currentTrackIndex = -1;
    let isPlaying = false;

    // --- M3U Parsing Function ---
    function parseM3U(m3uData, baseUrl = '') {
        const lines = m3uData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const newPlaylist = [];
        let currentTitle = 'Unknown Track';

        for (const line of lines) {
            if (line.startsWith('#EXTINF:')) {
                // Parse track title from #EXTINF line
                const match = line.match(/#EXTINF:[-?\d]+,(.*)/);
                if (match && match[1]) {
                    currentTitle = match[1];
                }
            } else if (!line.startsWith('#')) {
                // This is a media file path
                // Resolve relative paths if a baseUrl is provided
                let trackUrl = line;
                if (baseUrl && !/^https?:\/\//i.test(line) && !line.startsWith('/')) {
                    // If it's a relative path and not starting with a slash (absolute path on server)
                    // We need to resolve it relative to the base URL's directory
                    const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
                    trackUrl = baseDir + line;
                } else if (baseUrl && line.startsWith('/')) {
                     // If it's an absolute path on the server, combine with base domain
                     const url = new URL(baseUrl);
                     trackUrl = url.protocol + '//' + url.host + line;
                }

                newPlaylist.push({
                    title: currentTitle,
                    url: trackUrl
                });
                currentTitle = 'Unknown Track'; // Reset for next track
            }
        }
        return newPlaylist;
    }

    // --- Playlist Rendering ---
    function renderPlaylist() {
        playlistUl.innerHTML = ''; // Clear existing list
        if (playlist.length === 0) {
            playlistUl.innerHTML = '<li>No playlist loaded</li>';
            return;
        }

        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.textContent = track.title;
            li.dataset.index = index;
            if (index === currentTrackIndex) {
                li.classList.add('active');
            }
            li.addEventListener('click', () => playTrack(index));
            playlistUl.appendChild(li);
        });
        // Scroll active track into view
        const activeItem = playlistUl.querySelector('.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // --- Playback Functions ---
    function playTrack(index) {
        if (index < 0 || index >= playlist.length) {
            console.warn('Invalid track index.');
            return;
        }

        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];

        if (track) {
            audioPlayer.src = track.url;
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    playPauseBtn.textContent = 'Pause';
                    currentTrackTitle.textContent = track.title;
                    renderPlaylist(); // Update active class
                })
                .catch(error => {
                    console.error('Error playing track:', track.url, error);
                    alert(`Could not play: ${track.title}\nError: ${error.message}. Make sure the file exists and is accessible.`);
                    isPlaying = false;
                    playPauseBtn.textContent = 'Play';
                });
        }
    }

    function togglePlayPause() {
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playPauseBtn.textContent = 'Play';
        } else {
            if (audioPlayer.src) { // If there's already a source loaded
                audioPlayer.play();
                isPlaying = true;
                playPauseBtn.textContent = 'Pause';
            } else if (playlist.length > 0) { // If no source, but playlist exists, play first track
                playTrack(0);
            } else {
                alert("No track loaded. Load an M3U first.");
            }
        }
    }

    function stopPlayback() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0; // Reset to beginning
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        currentTrackTitle.textContent = 'No track loaded';
        // Remove active class from playlist
        const activeItem = playlistUl.querySelector('.active');
        if (activeItem) {
            activeItem.classList.remove('active');
        }
    }

    function playNext() {
        if (playlist.length === 0) return;
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= playlist.length) {
            nextIndex = 0; // Loop back to start
        }
        playTrack(nextIndex);
    }

    function playPrev() {
        if (playlist.length === 0) return;
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = playlist.length - 1; // Loop to end
        }
        playTrack(prevIndex);
    }

    // --- Event Listeners ---

    // Load M3U from URL
    loadUrlBtn.addEventListener('click', async () => {
        const url = m3uUrlInput.value.trim();
        if (!url) {
            alert('Please enter an M3U URL.');
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const m3uData = await response.text();
            playlist = parseM3U(m3uData, url); // Pass the URL to help resolve relative paths
            if (playlist.length > 0) {
                renderPlaylist();
                playTrack(0); // Start playing first track automatically
            } else {
                alert('No valid tracks found in the M3U file.');
                playlist = [];
                renderPlaylist();
                stopPlayback();
            }
        } catch (error) {
            console.error('Error loading M3U from URL:', error);
            alert(`Failed to load M3U from URL: ${error.message}. Check URL or CORS settings on the server.`);
            playlist = [];
            renderPlaylist();
            stopPlayback();
        }
    });

    // Load M3U from content
    loadContentBtn.addEventListener('click', () => {
        const content = m3uContentTextarea.value.trim();
        if (!content) {
            alert('Please paste M3U content.');
            return;
        }
        // For pasted content, we don't have a base URL, so relative paths might not work as expected
        playlist = parseM3U(content);
        if (playlist.length > 0) {
            renderPlaylist();
            playTrack(0); // Start playing first track automatically
        } else {
            alert('No valid tracks found in the M3U content.');
            playlist = [];
            renderPlaylist();
            stopPlayback();
        }
    });


    playPauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopPlayback);
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);

    // Auto-play next track when current one ends
    audioPlayer.addEventListener('ended', () => {
        if (playlist.length > 0) {
            playNext();
        } else {
            stopPlayback();
        }
    });

    // Initial render
    renderPlaylist();
});
