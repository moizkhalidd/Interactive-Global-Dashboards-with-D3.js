import { state } from './data.js';
import { MIN_YEAR, MAX_YEAR, ANIMATION_INTERVAL } from './config.js';
import { updateVisualization } from './main.js';

// set up play button and slider controls
export function setupControls() {
    const playBtn = d3.select('#play-btn');
    const handle = d3.select('#slider-handle');
    const sliderContainer = d3.select('#slider-container');
    
    // toggle play/pause on button click
    playBtn.on('click', togglePlay);
    
    // draggable slider handle
    const drag = d3.drag()
        .on('start', () => stopAnimation())
        .on('drag', function(event) {
            const rect = sliderContainer.node().getBoundingClientRect();
            const sliderWidth = rect.width;
            // clamp x position within slider bounds
            const x = Math.max(0, Math.min(sliderWidth, event.sourceEvent.clientX - rect.left));
            const ratio = x / sliderWidth;
            state.currentYear = Math.round(MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR));
            updateVisualization(state.currentYear);
        });
    
    handle.call(drag);
    
    // clicking on slider track moves handle to that position
    d3.select('#year-slider').on('click', function(event) {
        const rect = sliderContainer.node().getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const ratio = x / rect.width;
        state.currentYear = Math.round(MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR));
        updateVisualization(state.currentYear);
    });
}

// toggle between play and pause states
function togglePlay() {
    if (state.isPlaying) stopAnimation();
    else startAnimation();
}

// start the year animation
function startAnimation() {
    state.isPlaying = true;
    d3.select('#play-btn').text('Pause');
    
    // stop existing animation if any
    if (state.animationTimer) state.animationTimer.stop();
    
    // advance one year at each interval
    state.animationTimer = d3.interval(() => {
        state.currentYear++;
        // loop back to start when reaching end
        if (state.currentYear > MAX_YEAR) state.currentYear = MIN_YEAR;
        updateVisualization(state.currentYear);
    }, ANIMATION_INTERVAL);
}

// stop the year animation
function stopAnimation() {
    state.isPlaying = false;
    d3.select('#play-btn').text('Play');
    if (state.animationTimer) {
        state.animationTimer.stop();
        state.animationTimer = null;
    }
}

export { startAnimation, stopAnimation };