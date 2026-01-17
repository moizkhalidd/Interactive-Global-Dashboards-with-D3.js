import { data } from './data.js';
import { GDP_FLOOR } from './config.js';
import { getDataForYear } from './kpi.js';
import { showTooltip, hideTooltip } from './tooltip.js';

// store motion chart components for updates
let motionChart = {};

// set up the bubble chart showing gdp vs life expectancy
export function setupMotionChart() {
    d3.select('#motion-chart').select('g').remove(); // clear previous drawing
    
    const svg = d3.select('#motion-chart');
    const container = svg.node().parentElement;
    
    // calculate dimensions from parent container
    const width = container.clientWidth - 40;
    const height = svg.node().clientHeight;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');
    
    const margin = {top: 20, right: 20, bottom: 60, left: 80};
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // log scale for gdp (better for wide range of values)
    const xScale = d3.scaleLog()
        .domain([GDP_FLOOR, 520000])
        .range([0, chartWidth]);
    
    // linear scale for life expectancy
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([chartHeight, 0]);
    
    // sqrt scale for population (better perception of area)
    const rScale = d3.scaleSqrt()
        .domain([0, 1.5e9])
        .range([3, 40]);
    
    // color scale based on regions
    const regionSet = new Set();
    for (const [, m] of data.countriesMap.entries()) regionSet.add(m.region || 'Other');
    const regions = Array.from(regionSet);
    const colorScale = d3.scaleOrdinal()
        .domain(regions)
        .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#66c2a5', '#fc8d62']);
    
    // draw axes
    g.append('g').attr('class', 'x-axis')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).ticks(6, ',.0s'));
    
    g.append('g').attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));
    
    // axis labels
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 50)
        .attr('text-anchor', 'middle')
        .text('GDP per Capita (log scale, USD)');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .text('Life Expectancy (years)');
    
    // store everything for updates
    motionChart = { svg, g, xScale, yScale, rScale, colorScale, width, height, margin };
}

// update bubble positions and sizes for the current year
export function updateMotionChart(year) {
    const points = getDataForYear(year);
    const { g, xScale, yScale, rScale, colorScale } = motionChart;
    
    // bind data using alpha3 as key for smooth transitions
    const bubbles = g.selectAll('.bubble')
        .data(points, d => d.alpha3);
    
    // remove bubbles for countries with no data
    bubbles.exit().transition().duration(150).attr('r', 0).remove();
    
    // create new bubbles
    const enter = bubbles.enter()
        .append('circle')
        .attr('class', 'bubble')
        .attr('cx', d => xScale(d.gdp))
        .attr('cy', d => yScale(d.lifeExp))
        .attr('r', 0) // start small for animation
        .attr('fill', d => colorScale(d.region))
        .on('mouseover', showTooltip)
        .on('mousemove', showTooltip)
        .on('mouseout', hideTooltip);
    
    // update existing and new bubbles
    bubbles.merge(enter)
        .transition().duration(150)
        .attr('cx', d => xScale(d.gdp))
        .attr('cy', d => yScale(d.lifeExp))
        .attr('r', d => rScale(d.pop))
        .attr('fill', d => colorScale(d.region));
}

// highlight bubbles by region (called from hierarchy chart interaction)
export function highlightRegion(region) {
    motionChart.g.selectAll('.bubble')
        .classed('dimmed', d => d.region !== region);
}

// remove highlighting
export function clearHighlight() {
    motionChart.g.selectAll('.bubble').classed('dimmed', false);
}