// predefined colors for the most common fuel types to keep them consistent
const CUSTOM_COLORS_MAP = new Map([
    ['Gas', '#f59e0b'],      // orange
    ['Coal', '#1f2937'],     // dark gray/black
    ['Hydro', '#3b82f6'],    // blue 
    ['Solar', '#fcd34d'],    // yellow
    ['Wind', '#10b981'],     // green
    ['Nuclear', '#ef4444'],  // red
    ['Oil', '#78716c'],      // brown
    ['Biomass', '#84cc16'],  // lime green
    ['Unknown', '#9ca3af']   // gray for missing data
]);

// create a d3 color scale that handles all fuel types in the dataset
export function getFuelColorScale(fuelTypes) {
    const customKeys = Array.from(CUSTOM_COLORS_MAP.keys());
    const customColors = Array.from(CUSTOM_COLORS_MAP.values());

    // figure out which fuel types don't have a custom color yet
    const remainingFuels = fuelTypes.filter(f => !customKeys.includes(f));
    
    // combine multiple d3 color schemes to get enough distinct colors
    const d3Schemes = [
        d3.schemeSet1, d3.schemeSet2, d3.schemeSet3, 
        d3.schemePaired, d3.schemeDark2, d3.schemeAccent, 
        d3.schemeCategory10
    ].flat().filter((c, i, self) => self.indexOf(c) === i);  // flatten and remove duplicates
    
    // filter out colors we're already using for custom assignments
    let genericColors = d3Schemes.filter(c => !customColors.includes(c));
    
    // build domain (fuel names) and range (colors) arrays
    const colorDomain = [...customKeys, ...remainingFuels];
    const colorRange = [...customColors, ...genericColors.slice(0, remainingFuels.length)];
    
    // return an ordinal scale that maps fuel type
    return d3.scaleOrdinal(colorRange).domain(colorDomain);
}

// convert string to number, returning null if it's not a valid number
export const toNum = v => { 
    const n = +v; 
    return isNaN(n) ? null : n;
};

// normalize strings by removing special chars and converting to lowercase
// helps with matching country names that might have different formatting
export const norm = s => 
    s ? String(s).replace(/[^\w\s]/g,'').trim().toLowerCase() : '';

// format large numbers with commas (e.g., 1,234,567)
export const formatNumber = d3.format(',.0f');

// format capacity values with SI suffixes (e.g., 1.2M for 1,200,000)
export const formatCapacity = d3.format('.1s');