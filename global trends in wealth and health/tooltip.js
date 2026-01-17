import { data, state } from './data.js';
import { formatPop, formatGDP, formatDecimal } from './utils.js';
import { resolveFeatureAlpha3 } from './mapChart.js';

// show tooltip for motion chart bubbles
export function showTooltip(event, d) {
    if (!d) return;
    const tooltip = d3.select('#tooltip');
    tooltip.style('opacity', 1)
        .html(`
            <strong>${d.name} (${d.alpha3})</strong><br/>
            Region: ${d.region}<br/>
            GDP: ${formatGDP(d.gdp)}<br/>
            Life Exp: ${formatDecimal(d.lifeExp)} years<br/>
            Pop: ${formatPop(d.pop)}
        `)
        .style('left', `${(event.pageX || event.clientX) + 10}px`)
        .style('top', `${(event.pageY || event.clientY) - 10}px`);
}

// show tooltip for map countries
export function showMapTooltip(event, feature) {
    const alpha3 = resolveFeatureAlpha3(feature);
    
    // get name from geo feature properties
    let name = (feature.properties && (feature.properties.name || feature.properties.NAME)) || 'Unknown';
    
    // if name is missing but we found alpha3, use name from our metadata
    if (alpha3 && name === 'Unknown') {
        name = data.countriesMap.get(alpha3)?.name || 'Unknown';
    }
    
    const lifeExp = alpha3 ? data.lifeExp.get(alpha3)?.get(state.currentYear) : undefined;
    const tooltip = d3.select('#tooltip');
    
    if (Number.isFinite(lifeExp)) {
        // show tooltip with life expectancy data
        tooltip.style('opacity', 1)
            .html(`<strong>${name}</strong><br/>Life Exp: ${formatDecimal(lifeExp)} years`)
            .style('left', `${(event.pageX || event.clientX) + 10}px`)
            .style('top', `${(event.pageY || event.clientY) - 10}px`);
    } else {
        // show tooltip without data if country name exists
        if (name && name !== 'Unknown' && name !== 'No Data') {
            tooltip.style('opacity', 1)
                .html(`<strong>${name}</strong><br/>Life Exp: N/A`)
                .style('left', `${(event.pageX || event.clientX) + 10}px`)
                .style('top', `${(event.pageY || event.clientY) - 10}px`);
        } else {
            tooltip.style('opacity', 0);
        }
    }
}

// show tooltip for hierarchy chart arcs
export function showHierarchyTooltip(event, d) {
    const tooltip = d3.select('#tooltip');
    let label, value;
    
    if (d.depth === 1) { // region level
        label = d.data.name;
        value = d.value;
    } else if (d.depth === 2) { // country level
        label = d.data.name;
        value = d.value;
    } else {
        return hideTooltip();
    }
    
    tooltip.style('opacity', 1)
        .html(`<strong>${label}</strong><br/>Population: ${formatPop(value)}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`);
}

// hide the tooltip
export function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
}