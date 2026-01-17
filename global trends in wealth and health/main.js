import { state } from './data.js';
import { loadData } from './dataloader.js';
import { getDataForYear, updateKPIs } from './kpi.js';
import { setupMotionChart, updateMotionChart } from './motionChart.js';
import { setupMap, updateMap } from './mapChart.js';
import { setupHierarchy, updateHierarchy } from './hierarchyChart.js';
import { setupControls } from './controls.js';

// initialize all visualizations after data is loaded
async function initializeVisualization() {
    // load all csv and geojson files
    await loadData();
    
    // set up each chart's svg and scales
    setupMotionChart();
    setupMap();
    setupHierarchy();
    setupControls();
    
    // render initial state
    updateVisualization(state.currentYear);
    
    // re-setup charts on window resize for responsiveness
    window.addEventListener('resize', () => {
        setupMotionChart();
        setupMap();
        setupHierarchy();
        updateVisualization(state.currentYear);
    });
}

// main update loop called whenever year changes
export function updateVisualization(year) {
    state.currentYear = year;
    
    // update year display
    d3.select('#year-display').text(year);
    
    // update slider handle position
    const sliderContainer = d3.select('#slider-container').node();
    const sliderWidth = sliderContainer.clientWidth || sliderContainer.getBoundingClientRect().width;
    const ratio = (year - 1800) / (2100 - 1800); // using MIN_YEAR and MAX_YEAR values
    d3.select('#slider-handle')
        .style('left', `${ratio * sliderWidth}px`);
    
    // get filtered data for this year
    const points = getDataForYear(year);
    
    // update all charts and kpis
    updateKPIs(points);
    updateMotionChart(year);
    updateMap(year);
    updateHierarchy(year);
}

// start the application
initializeVisualization();