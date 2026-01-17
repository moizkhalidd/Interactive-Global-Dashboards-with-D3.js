import { MIN_YEAR, MAX_YEAR } from './config.js';

// format utilities for cleaner display of numbers
export const formatPop = d3.format('.2s');      // format population (e.g., 1.5B)
export const formatGDP = d3.format('$,.0f');    // format gdp (e.g., $10,000)
export const formatLife = d3.format('.1f');     // format life expectancy (e.g., 75.2)
export const formatDecimal = d3.format('.1f');  // general 1 decimal place format

// try to extract a 3-letter country code from various possible csv column names
export function getAlpha3FromRow(row) {
    // list of common column names that contain alpha3 codes
    const possible = ['alpha-3','alpha3','iso_a3','ISO_A3','iso3','ISO3','iso','country-code','Country Code','Code','ADM0_A3','iso_a3_eh','iso_a3_us'];
    
    // check each possible column name
    for (const k of possible) {
        if (k in row && row[k] != null && String(row[k]).trim() !== '') {
            return String(row[k]).trim().toUpperCase();
        }
    }
    
    // fallback: look for any 3-letter value that looks like a code
    for (const k of Object.keys(row)) {
        const val = row[k];
        if (val && String(val).trim().length === 3 && /^[A-Za-z]{3}$/.test(String(val).trim())) {
            return String(val).trim().toUpperCase();
        }
    }
    
    return null;
}

// find columns in csv that look like years (numeric 4-digit values in range)
export function detectYearColumns(row) {
    return Object.keys(row)
        .map(k => k.trim())
        .filter(k => /^\d{4}$/.test(k) && +k >= MIN_YEAR && +k <= MAX_YEAR)
        .map(k => +k)
        .sort((a,b) => a-b);
}

// process wide-format csv tables where each year is a column
export function processWideTable(table, targetMap) {
    table.forEach(row => {
        const alpha3 = getAlpha3FromRow(row);
        if (!alpha3) return;
        
        const years = detectYearColumns(row);
        if (!years || years.length === 0) return;
        
        const values = new Map();
        years.forEach(y => {
            const raw = row[String(y)];
            const v = raw === '' || raw == null ? NaN : +raw;
            if (Number.isFinite(v)) values.set(y, v);
        });
        
        if (values.size > 0) targetMap.set(alpha3, values);
    });
}