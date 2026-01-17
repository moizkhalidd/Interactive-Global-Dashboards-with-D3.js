import { data, alpha3ByName, isoNumericToAlpha3 } from './data.js';
import { showMapTooltip, hideTooltip } from './tooltip.js';

// store map chart components for updates
let mapChart = {};

// find the alpha3 code for a geojson feature using multiple fallback strategies
export function resolveFeatureAlpha3(feature) {
    const p = feature.properties || {};
    
    // 1. check common property names that hold alpha3 codes
    const candidates = [
        p['iso_a3'], p['ISO_A3'], p['ADM0_A3'], p['adm0_a3'], 
        p['alpha-3'], p['abbrev'], p['A3'], p['ISO3']
    ];
    
    for (const c of candidates) {
        if (c && String(c).trim().length === 3) {
            return String(c).trim().toUpperCase();
        }
    }
    
    // 2. use country name to look up alpha3 from our metadata
    let geoName = (p['name'] || p['NAME'] || '').trim().toUpperCase();
    
    // handle known abbreviations in geojson that don't match csv names
    if (geoName === "BOSNIA AND HERZ.") {
        geoName = "BOSNIA AND HERZEGOVINA";
    } else if (geoName === "SOLOMON IS.") {
        geoName = "SOLOMON ISLANDS";
    } else if (geoName === "BRUNEI") {
        geoName = "BRUNEI DARUSSALAM";
    } else if (geoName === "BOLIVIA") {
        geoName = "BOLIVIA (PLURINATIONAL STATE OF)";
    }
    
    if (geoName && alpha3ByName.has(geoName)) {
        return alpha3ByName.get(geoName);
    }
    
    // 3. critical fallback: use numeric feature id with hardcoded map
    const featureId = String(feature.id || '').trim();
    if (featureId && /^\d+$/.test(featureId)) {
        const alpha3 = isoNumericToAlpha3.get(featureId);
        if (alpha3) return alpha3;
    }
    
    // 4. last resort: use feature.id if it's already a 3-letter code
    if (feature.id && String(feature.id).trim().length === 3) {
        return String(feature.id).trim().toUpperCase();
    }
    
    return null;
}

// set up the world map with projection and country paths
export function setupMap() {
    d3.select('#map-chart').select('g').remove(); // clear previous drawing
    
    const svg = d3.select('#map-chart');
    const container = svg.node().parentElement;
    
    const fullWidth = container.clientWidth;
    const fullHeight = svg.node().clientHeight;
    
    svg.attr('width', fullWidth)
        .attr('height', fullHeight)
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    const g = svg.append('g');
    
    // natural earth projection looks nice for world maps
    const projection = d3.geoNaturalEarth1();
    
    if (data.geoData) {
        // fit projection to container size
        projection.fitSize([fullWidth, fullHeight], data.geoData);
        g.attr('transform', `translate(0, 0)`);
    }
    
    const path = d3.geoPath().projection(projection);
    
    // color scale for life expectancy (viridis looks good for sequential data)
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([30, 85]);
    // render legend once
    renderMapLegend(colorScale);
    // draw country paths
    const countries = g.selectAll('.country')
        .data(data.geoData ? data.geoData.features : [])
        .enter().append('path')
        .attr('class', 'country')
        .attr('d', path)
        .attr('fill', '#ccc') // default gray for countries without data
        .on('mouseover', showMapTooltip)
        .on('mousemove', showMapTooltip)
        .on('mouseout', hideTooltip);
    
    // store everything for updates
    mapChart = { svg, g, countries, colorScale, path, projection };
}

// update map colors based on life expectancy for the current year
export function updateMap(year) {
    if (!mapChart || !mapChart.countries) return;
    const { countries, colorScale } = mapChart;
    
    countries.transition().duration(150)
        .attr('fill', function(d) {
            const alpha3 = resolveFeatureAlpha3(d);
            const lifeExp = alpha3 ? data.lifeExp.get(alpha3)?.get(year) : undefined;
            
            // color by life expectancy if available, otherwise gray
            return (Number.isFinite(lifeExp) ? colorScale(lifeExp) : '#ccc');
        });
}


function renderMapLegend(colorScale) {
    const legend = d3.select('#map-legend');
    legend.html("");

    // get domain range and create 5 automatic ticks
    const min = 25;
    const max = 95;
    const ticks = d3.range(0, 1.01, 0.25).map(t => min + t * (max - min));

    // gradient bar
    legend.append("div")
        .attr("class", "legend-bar")
        .style("background", `linear-gradient(to right,
            ${ticks.map(t => colorScale(t)).join(",")}
        )`);

    // labels row
    const labels = legend.append("div")
        .attr("class", "legend-labels");

    ticks.forEach(v => {
        labels.append("span")
            .text(Math.round(v));
    });
}



export { mapChart };