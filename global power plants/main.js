import { DATA } from './data.js';
import { toNum, norm, getFuelColorScale } from './utils.js';
import { updateKPIs, getFilteredPlants } from './kpi.js';
import { initMap, updateMap } from './map.js';
import { initFuelChart, updateFuelChart, initTimeline, updateTimeline } from './charts.js';

// central function that refreshes all visualizations when filters change
function updateAll(){
  const filteredPlants = getFilteredPlants();
  updateKPIs(filteredPlants);
  // only call update functions if they've been initialized
  if (DATA.updateTimeline) DATA.updateTimeline(filteredPlants);
  if (DATA.updateFuelChart) DATA.updateFuelChart(filteredPlants, updateAll);
  if (DATA.updateMap) DATA.updateMap(filteredPlants);
}

// load both data files in parallel
Promise.all([
  d3.csv('global_power_plant_database.csv'),
  d3.json('world-110m.json')
]).then(([plantsCsv, worldTopo]) => {
  // parse and clean the plant data, keeping only valid records
  DATA.plants = plantsCsv.map(d => ({
    lat: toNum(d.latitude),
    lon: toNum(d.longitude),
    capacity: toNum(d.capacity_mw) || 0,
    fuel: (d.primary_fuel || d.primary_fuel_type || d.fuel || 'Unknown').trim(),
    year: toNum(d.commissioning_year) || null,
    country: (d.country || d.country_short || '').trim(),
    country_long: (d.country_long || d.country_long_name || '').trim(),
    name: (d.name || '').trim()
  })).filter(d => d.lat !== null && d.lon !== null && d.capacity > 0); // only keep plants with valid location and capacity

  // extract all unique fuel types and create consistent color scheme
  const allFuelTypes = Array.from(new Set(DATA.plants.map(d => d.fuel || 'Unknown')));
  DATA.fuelColorScale = getFuelColorScale(allFuelTypes);
  
  // store the topology data for map rendering
  DATA.worldTopo = worldTopo;
  const features = topojson.feature(worldTopo, worldTopo.objects.countries).features;

  // build a lookup index to match plants to countries by various identifiers
  const idx = new Map();
  features.forEach(f => {
    const p = f.properties || {};
    const keys = new Set();
    // collect all possible identifiers for this country
    if (f.id) keys.add(String(f.id));
    if (p.iso_a3) keys.add(String(p.iso_a3));
    if (p.iso_a2) keys.add(String(p.iso_a2));
    if (p.name) keys.add(String(p.name));
    if (p.name_long) keys.add(String(p.name_long));
    if (p.admin) keys.add(String(p.admin));
    // index by both lowercase and normalized versions for flexible matching
    Array.from(keys).forEach(k => {
      idx.set(String(k).toLowerCase(), f);
      idx.set(norm(k), f);
    });
  });
  DATA.countryIndex = idx;

  // pre-calculate geographic center of each country for bubble positioning
  const centroids = new Map();
  features.forEach(f => {
    const c = d3.geoCentroid(f);
    if (f.id) centroids.set(f.id, c);
    if (f.properties && f.properties.name) centroids.set(f.properties.name, c);
  });
  DATA.countryCentroids = centroids;

  // set initial year range to span all available data
  const yrs = DATA.plants.filter(d => d.year).map(d => d.year);
  DATA.yearRange = [d3.min(yrs) || 1900, d3.max(yrs) || new Date().getFullYear()];

  // initialize all visualizations
  initMap(updateAll);
  initFuelChart();
  initTimeline(updateAll);
  // render everything for the first time
  updateAll();
}).catch(err => {
  // show friendly error message if data files are missing
  d3.select('#info').text('Error loading files. Ensure global_power_plant_database.csv and world-110m.json are available. Error: ' + err.message);
  console.error(err);
});