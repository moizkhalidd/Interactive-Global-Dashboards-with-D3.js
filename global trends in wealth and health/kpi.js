import { data } from './data.js';
import { GDP_FLOOR } from './config.js';
import { formatPop, formatLife, formatGDP } from './utils.js';

// get array of country data points for a specific year
export function getDataForYear(year) {
    const points = [];
    
    for (const [alpha3, meta] of data.countriesMap.entries()) {
        const gdpVal = data.gdp.get(alpha3)?.get(year);
        const lifeVal = data.lifeExp.get(alpha3)?.get(year);
        const popVal = data.pop.get(alpha3)?.get(year);
        
        // only include countries with complete data for this year
        if (Number.isFinite(gdpVal) && Number.isFinite(lifeVal) && Number.isFinite(popVal)) {
            points.push({
                alpha3,
                name: meta.name,
                region: meta.region || 'Other',
                gdp: Math.max(gdpVal, GDP_FLOOR), // apply floor for log scale
                lifeExp: lifeVal,
                pop: popVal
            });
        }
    }
    
    return points;
}

// update the three kpi cards with aggregated statistics
export function updateKPIs(points) {
    const totalPop = d3.sum(points, d => d.pop);
    const avgLife = d3.mean(points, d => d.lifeExp);
    // using median for gdp because the motion chart uses log scale
    const medianGDP = d3.median(points, d => d.gdp);
    
    d3.select('#kpi-pop-value').text(formatPop(totalPop));
    d3.select('#kpi-life-value').text(avgLife !== undefined ? formatLife(avgLife) : 'N/A');
    d3.select('#kpi-gdp-value').text(medianGDP !== undefined ? formatGDP(medianGDP) : 'N/A');
}