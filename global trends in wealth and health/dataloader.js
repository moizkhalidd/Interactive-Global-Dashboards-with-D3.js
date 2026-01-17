import { data, alpha3ByName } from './data.js';
import { getAlpha3FromRow, processWideTable } from './utils.js';

// load all csv and geojson files needed for the visualization
export async function loadData() {
    try {
        const [allData, gdpData, lexData, popData, geoData] = await Promise.all([
            d3.csv('ISO-3166-Countries-with-Regional-Codes.csv'),
            d3.csv('gdp_pcap.csv'),
            d3.csv('lex.csv'),
            d3.csv('pop.csv'),
            d3.json('world-110m.json')
        ]);
        
        const topo = geoData;
        
        // convert topojson to geojson for easier rendering
        const geojson = topojson.feature(topo, topo.objects.countries);
        data.geoData = geojson;
        
        // build countries metadata map from the iso csv file
        allData.forEach(row => {
            const alpha3 = getAlpha3FromRow(row);
            if (!alpha3) return;
            
            const name = row['name'] || 'Unknown';
            // store name -> alpha3 mapping for geojson feature matching
            alpha3ByName.set(name.trim().toUpperCase(), alpha3);
            
            // get region and subregion for classification
            let region = row['region'] || 'Other';
            const subRegion = row['sub-region'] || '';
            
            // separate north and south america for better visualization
            if (subRegion.includes('Northern America')) {
                region = 'North America';
            } else if (subRegion.includes('Latin America') || subRegion.includes('Caribbean')) {
                region = 'South/Latin America';
            } else if (region.includes('Oceania')) {
                region = 'Oceania';
            } else if (region === 'Americas') {
                // fallback if subregion didn't classify it
                region = 'Americas (Unspecified)';
            }
            
            data.countriesMap.set(alpha3, { alpha3, name: name, region: region });
        });
        
        // process the wide-format time series tables
        processWideTable(gdpData, data.gdp);
        processWideTable(lexData, data.lifeExp);
        processWideTable(popData, data.pop);
        
        // fallback: build countries map from geojson if csv metadata is missing
        if (data.countriesMap.size === 0 && data.geoData) {
            data.geoData.features.forEach(f => {
                const alpha3 = (f.id || (f.properties || {}).iso_a3);
                if (alpha3) {
                    const name = (f.properties || {}).name || 'Unknown';
                    const region = (f.properties || {}).region || 'Other';
                    data.countriesMap.set(String(alpha3).trim().toUpperCase(), { 
                        alpha3: String(alpha3).trim().toUpperCase(), 
                        name, 
                        region 
                    });
                    alpha3ByName.set(name.trim().toUpperCase(), String(alpha3).trim().toUpperCase());
                }
            });
        }
        
        return true;
    } catch (err) {
        console.error('Error loading data:', err);
        // show error to user
        d3.select('#year-display').text('Error');
        alert('Failed to load one or more data files (e.g., all.csv, gdp_pcap.csv, lex.csv, pop.csv, world-110m.json).');
        throw err;
    }
}