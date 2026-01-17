import { data } from './data.js';
import { getDataForYear } from './kpi.js';
import { showHierarchyTooltip, hideTooltip } from './tooltip.js';
import { highlightRegion, clearHighlight } from './motionChart.js';

// store hierarchy chart components for updates
let hierarchyChart = {};

// set up the sunburst chart showing population by region
export function setupHierarchy() {
    d3.select('#hierarchy-chart').select('g').remove(); // clear previous drawing
    
    const svg = d3.select('#hierarchy-chart');
    const container = svg.node().parentElement;
    
    const width = container.clientWidth - 40;
    const height = svg.node().clientHeight;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // radius based on smaller dimension to fit in container
    const radius = Math.min(width, height) / 2 - 10;
    const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`); // center the sunburst
    
    // region color scale (matches motion chart colors)
    const regionSet = new Set();
    for (const [, m] of data.countriesMap.entries()) regionSet.add(m.region || 'Other');
    const colorDomain = Array.from(regionSet);
    
    // filter out 'Other' for legend display only
    const legendRegions = colorDomain.filter(r => r !== 'Other');
    
    const colorScale = d3.scaleOrdinal()
        .domain(colorDomain)
        .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#66c2a5', '#fc8d62']);
    
    // store everything for updates
    hierarchyChart = { svg, g, radius, colorScale, width, height };
    
    // render the legend showing region colors
    renderHierarchyLegend(legendRegions, colorScale);
}

// update sunburst chart for the current year
export function updateHierarchy(year) {
    const { g, radius, colorScale } = hierarchyChart;
    
    // group countries by region
    const regionMap = d3.group(getDataForYear(year), d => d.region || 'Other');
    
    // build hierarchical data structure
    const hierarchyData = {
        name: 'World',
        children: Array.from(regionMap, ([region, countries]) => ({
            name: region,
            children: countries.map(c => ({ 
                name: c.name, 
                value: c.pop, 
                region: c.region 
            }))
        }))
    };
    
    // create d3 hierarchy from data
    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a,b) => b.value - a.value);
    
    // partition layout divides circle into segments
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    partition(root);
    
    // arc generator for sunburst segments
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
    
    // filter out root node (depth 0)
    const nodes = root.descendants().filter(d => d.depth > 0);
    
    // bind data with unique key
    const arcs = g.selectAll('.arc')
        .data(nodes, d => d.data.name + '__' + d.depth);
    
    arcs.exit().remove();
    
    // create new arcs
    const enter = arcs.enter()
        .append('path')
        .attr('class', 'arc')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            // highlight region in motion chart when hovering region arc
            if (d.depth === 1) highlightRegion(d.data.name);
            showHierarchyTooltip(event, d);
        })
        .on('mouseout', function() {
            clearHighlight();
            hideTooltip();
        })
        .on('mousemove', showHierarchyTooltip);
    
    // update existing and new arcs
    arcs.merge(enter)
        .transition().duration(100)
        .attr('d', arc)
        .attr('fill', d => {
            // color regions by their name, countries by parent region
            const regionName = d.depth === 1 ? d.data.name : d.parent ? d.parent.data.name : d.data.name;
            return colorScale(regionName);
        });
}

// render the legend showing region colors
function renderHierarchyLegend(regions, colorScale) {
    const legend = d3.select('#hierarchy-legend');
    
    // clear existing items
    legend.selectAll('.legend-item').remove();
    
    const items = legend.selectAll('.legend-item')
        .data(regions)
        .enter()
        .append('div')
        .attr('class', 'legend-item');
    
    // colored circle for each region
    items.append('div')
        .attr('class', 'legend-color')
        .style('background-color', d => colorScale(d));
    
    // region name label
    items.append('span')
        .text(d => d);
}