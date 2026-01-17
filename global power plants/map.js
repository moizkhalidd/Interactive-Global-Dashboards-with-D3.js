import { DATA, STATE } from './data.js';
import { formatCapacity } from './utils.js';
import { getFilteredPlants, updateKPIs } from './kpi.js';

// try to find the country feature that matches a plant's country field
function findFeatureForPlant(plant) {
  const tries = [];
  if (plant.country) tries.push(plant.country);
  if (plant.country_long) tries.push(plant.country_long);
  if (plant.country && plant.country.length === 3) tries.push(plant.country);
  for (const t of tries) {
    if (!t) continue;
    // try lowercase match first
    const L = String(t).toLowerCase();
    if (DATA.countryIndex.has(L)) return DATA.countryIndex.get(L);
    // then try normalized version (removes special characters)
    const n = String(t).replace(/[^\w\s]/g,'').trim().toLowerCase();
    if (DATA.countryIndex.has(n)) return DATA.countryIndex.get(n);
  }
  return null;
}

// filter plants to only those currently visible in the map viewport
function plantsInViewport(plants){
  const { projection, width, height } = DATA._map;
  try {
    const t = STATE.transform || d3.zoomIdentity;
    // get the four corners of the viewport in screen coordinates
    const topLeft = t.invert([0,0]);
    const topRight = t.invert([width,0]);
    const bottomLeft = t.invert([0,height]);
    const bottomRight = t.invert([width,height]);
    // convert screen coordinates to geographic coordinates
    const invProj = (p) => projection.invert(p);
    const corners = [topLeft, topRight, bottomLeft, bottomRight].map(invProj).filter(Boolean);
    if (!corners.length) return plants;
    // find the bounding box in lat/lon
    const lons = corners.map(c=>c[0]), lats = corners.map(c=>c[1]);
    const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    // add small buffer to catch plants near the edge
    const buffer = 0.5;
    return plants.filter(d => d.lon >= lonMin - buffer && d.lon <= lonMax + buffer && d.lat >= latMin - buffer && d.lat <= latMax + buffer);
  } catch(e) {
    // if viewport calculation fails, just return all plants
    return plants;
  }
}

// render the map visualization based on current zoom level and filters
export function updateMap(filtered){
  const { g, projection } = DATA._map;
  const countryGroup = g.select('.country-bubbles');
  const plantGroup = g.select('.plant-points');
  
  // cap the number of rendered points when zoomed in for performance
  const displayCap = STATE.zoomK < STATE.zoomThreshold ? Infinity : 8000;
  
  // show country-level aggregated bubbles when zoomed out
  if (STATE.zoomK < STATE.zoomThreshold){
    // aggregate capacity by country
    const byCountry = d3.rollup(filtered, v => d3.sum(v, d => d.capacity), d => (d.country || d.country_long || 'UNKNOWN'));
    const countryData = Array.from(byCountry, ([countryKey, capacity]) => {
      const dummy = { country: countryKey, country_long: countryKey };
      const feat = findFeatureForPlant(dummy);
      if (feat){
        // use the country's geographic center if we found the feature
        const cent = d3.geoCentroid(feat);
        return { countryKey, capacity, lon: cent[0], lat: cent[1] };
      } else {
        // fall back to averaging plant locations if country feature not found
        const plants = filtered.filter(p => (p.country || p.country_long || 'UNKNOWN') === countryKey);
        const avgLon = d3.mean(plants, p => p.lon);
        const avgLat = d3.mean(plants, p => p.lat);
        return { countryKey, capacity, lon: avgLon, lat: avgLat };
      }
    }).filter(d => d.lon !== undefined && d.lat !== undefined && !isNaN(d.lon));

    // bind data to circles using country as key
    const circles = countryGroup.selectAll('circle').data(countryData, d => d.countryKey);
    circles.exit().transition().duration(200).attr('r',0).remove();

    // create new bubbles with click-to-zoom interaction
    const enter = circles.enter().append('circle')
      .attr('class','country-bubble')
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', 0)
      .on('click', (e,d) => {
        // zoom into this country when clicked
        const [x,y] = projection([d.lon, d.lat]);
        const scale = Math.max(STATE.zoomThreshold, 4);
        const tx = DATA._map.width/2 - scale * x;
        const ty = DATA._map.height/2 - scale * y;
        DATA._map.svg.transition().duration(700).call(d3.zoom().transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      });

    // add tooltip for hover info
    enter.append('title');

    // update existing and new bubbles
    circles.merge(enter)
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .transition().duration(220)
      .attr('r', d => Math.max(3, Math.sqrt(d.capacity) * 0.035)); // size based on capacity

    // update tooltip text
    countryGroup.selectAll('circle').select('title')
      .text(d => `${d.countryKey}\nCapacity: ${formatCapacity(d.capacity)} MW`);

    // remove individual plant points when showing country bubbles
    plantGroup.selectAll('circle').transition().duration(150).attr('r',0).remove();
  } else {
    // show individual plant points when zoomed in
    let visible = plantsInViewport(filtered);
    if (visible.length > displayCap) {
      // limit number of points to render for performance
      visible = visible.slice(0, displayCap);
    }

    // remove country bubbles when showing individual plants
    countryGroup.selectAll('circle').transition().duration(150).attr('r',0).remove();

    // create unique key for each plant to track across updates
    const key = d => `${d.name || ''}_${d.lat}_${d.lon}_${Math.round(d.capacity)}`;
    const pts = plantGroup.selectAll('circle').data(visible, key);
    pts.exit().transition().duration(120).attr('r',0).remove();

    // create new plant points with hover interaction
    const enterPts = pts.enter().append('circle')
      .attr('class','plant')
      .attr('fill', d => DATA.fuelColorScale(d.fuel || 'Unknown'))
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', 0)
      .on('mouseenter', (e,d) => {
        // show plant details in info banner on hover
        d3.select('#info').text(`${d.name || 'Unnamed'} — ${d.fuel} — ${formatCapacity(d.capacity)} MW — ${Math.round(d.year) || '?'}`);
      })
      .on('mouseleave', () => {
        // restore filter status display when mouse leaves
        updateKPIs(getFilteredPlants());
      });

    // add tooltip
    enterPts.append('title');

    // update existing and new points
    pts.merge(enterPts)
      .attr('fill', d => DATA.fuelColorScale(d.fuel || 'Unknown')) 
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .transition().duration(140)
      .attr('r', d => Math.max(1.2, Math.sqrt(d.capacity) * 0.02)); // size based on capacity

    // update tooltip text
    plantGroup.selectAll('circle').select('title')
      .text(d => `${d.name || 'Unnamed'}\n${d.fuel}\n${formatCapacity(d.capacity)} MW`);
  }
}

// initialize the world map with zoom/pan controls
export function initMap(updateAll){
  const container = d3.select('#map');
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;

  // create responsive svg
  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio','xMidYMid meet');

  // main group for all map elements
  const g = svg.append('g').attr('class','map-g');

  // convert topojson to geojson and set up projection
  const countries = topojson.feature(DATA.worldTopo, DATA.worldTopo.objects.countries);
  const projection = d3.geoMercator().fitSize([width, height], countries);
  const path = d3.geoPath().projection(projection);

  // store references for later updates
  DATA._map = { svg, g, projection, path, width, height, countries };

  // draw country boundaries as base layer
  g.append('g').attr('class','countries')
    .selectAll('path')
    .data(countries.features)
    .join('path')
    .attr('class','country')
    .attr('d', path);

  // create groups for data layers
  g.append('g').attr('class', 'country-bubbles');
  g.append('g').attr('class', 'plant-points');

  // set up zoom and pan behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 40]) // zoom range from 1x to 40x
    .translateExtent([[0, 0], [width, height]]) // prevent panning beyond map bounds
    .on('zoom', (event) => {
      let transform = event.transform;

      // prevent panning when fully zoomed out
      if (transform.k === 1 && (transform.x !== 0 || transform.y !== 0)) {
        transform = d3.zoomIdentity;
        DATA._map.svg.call(zoom.transform, transform);
        return; 
      }

      // apply zoom transform and update state
      DATA._map.g.attr('transform', transform);
      STATE.transform = transform;
      STATE.zoomK = transform.k;
      // re-render map with current zoom level
      DATA.updateMap(getFilteredPlants());
    });

  svg.call(zoom);

  // wire up reset zoom button
  d3.select('#reset-zoom').on('click', () => {
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
  });

  // wire up clear filters button
  d3.select('#clear-filters').on('click', () => {
    DATA.selectedFuel = null;
    // reset year range to show all years
    const yrs = DATA.plants.filter(d=>d.year).map(d=>d.year);
    DATA.yearRange = [d3.min(yrs) || DATA.yearRange[0], d3.max(yrs) || DATA.yearRange[1]];
    updateAll();
  });

  // handle window resizing to keep map responsive
  window.addEventListener('resize', () => {
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    // refit projection to new dimensions
    projection.fitSize([w, h], countries);
    DATA._map.width = w; DATA._map.height = h;
    // redraw country paths with new projection
    g.selectAll('.country').attr('d', path);
    DATA.updateMap(getFilteredPlants());
  });

  // make update function available globally
  DATA.updateMap = updateMap;
}