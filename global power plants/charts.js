import { DATA } from './data.js';
import { formatCapacity } from './utils.js';
import { getFilteredPlants, updateKPIs } from './kpi.js';

// keep track of the force simulation so we can stop it when updating
let fuelSim = null;

// set up the fuel bubble chart container and svg elements
export function initFuelChart(){
  const container = d3.select('#fuel-chart');
  const rect = container.node().getBoundingClientRect();
  const header = container.select('.chart-header').node();
  const headerHeight = header ? header.offsetHeight : 0;
  
  // subtract padding from width and height to leave some breathing room
  const width = rect.width; 
  const height = rect.height - headerHeight;

  // create responsive svg that scales with container
  const svg = container.append('svg')
    .style('width', '100%')
    .style('height', `calc(100% - ${headerHeight}px)`)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio','xMidYMid meet');

  // main group for all fuel chart elements
  const g = svg.append('g').attr('class','fuel-g');

  // store references for later updates
  DATA._fuel = { svg, g, width, height };
  DATA.updateFuelChart = updateFuelChart;
}

// render the fuel type bubbles with force simulation
export function updateFuelChart(filtered, updateAll){
  const { g, width, height } = DATA._fuel;
  
  // aggregate capacity by fuel type
  const byFuel = d3.rollup(filtered, v => d3.sum(v, d => d.capacity), d => d.fuel || 'Unknown');
  const fuelData = Array.from(byFuel, ([fuel, capacity]) => ({ fuel, capacity })).sort((a,b) => b.capacity - a.capacity);

  // stop any existing simulation before starting a new one
  if (fuelSim) { fuelSim.stop(); fuelSim = null; }

  // bubble size scales with capacity using square root for better perception
  const maxRadius = Math.min(width, height) * 0.18;
  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(fuelData, d=>d.capacity)||1])
    .range([25, maxRadius]);
  
  const color = DATA.fuelColorScale;

  // create force simulation to position bubbles nicely
  const sim = d3.forceSimulation(fuelData)
    .force('center', d3.forceCenter(width/2, height/2)) // pull everything toward center
    .force('charge', d3.forceManyBody().strength(-100)) // make bubbles repel each other
    .force('collision', d3.forceCollide().radius(d => rScale(d.capacity) + 5)) // prevent overlap
    .force('x', d3.forceX(width/2).strength(0.10)) // gentle horizontal centering
    .force('y', d3.forceY(height/2).strength(0.10)) // gentle vertical centering
    .alphaDecay(0.01); // slower decay for smoother settling

  fuelSim = sim;

  // bind data to nodes using fuel type as key
  const node = g.selectAll('g.node').data(fuelData, d => d.fuel);
  node.exit().remove();

  // create new node groups
  const nodeEnter = node.enter().append('g').attr('class','node');

  // merge new and existing nodes
  const all = nodeEnter.merge(node);

  // --- FIX: Apply drag behavior to the merged selection (all) ---
  // This ensures both new and existing elements are draggable.
  all.call(d3.drag()
    .on('start', (e,d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e,d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e,d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
  );

  // add circle and text to each new node (only on enter selection)
  nodeEnter.append('circle').attr('class','fuel-bubble');
  nodeEnter.append('text').attr('class','fuel-label').attr('dy', 4);

  // style circles and add interaction
  all.select('circle')
    .attr('r', d => rScale(d.capacity))
    .attr('fill', d => color(d.fuel))
    .classed('selected', d => d.fuel === DATA.selectedFuel)
    .on('mouseenter', (e,d) => {
      // show info about this fuel type
      d3.select('#info').text(`Click to Filter: ${d.fuel} — Total Capacity: ${formatCapacity(d.capacity)} MW`);
    })
    .on('mouseleave', () => {
      // restore the filter status display
      updateKPIs(getFilteredPlants());
    })
    .on('click', (e,d) => {
      // toggle fuel filter on click
      DATA.selectedFuel = DATA.selectedFuel === d.fuel ? null : d.fuel;
      updateAll();
    });

  // only show labels for bigger bubbles to avoid clutter
  all.select('text').text(d => {
    if (rScale(d.capacity) > 20) { 
        // truncate long names on smaller bubbles
        if (d.fuel.length > 10 && rScale(d.capacity) < 35) {
            return d.fuel.substring(0, 8) + '...';
        }
        return d.fuel;
    }
    return '';
  });

  // update positions on each tick of the simulation
  sim.on('tick', () => {
    all.attr('transform', d => {
      const r = rScale(d.capacity);
      // clamp positions to keep bubbles inside the container
      const x = Math.max(r, Math.min(width - r, d.x || width/2));
      const y = Math.max(r, Math.min(height - r, d.y || height/2));
      return `translate(${x},${y})`;
    });
  });
}

// initialize the timeline area chart
export function initTimeline(updateAll){
  const container = d3.select('#timeline');
  const rect = container.node().getBoundingClientRect();
  const header = container.select('.chart-header').node();
  const headerHeight = header ? header.offsetHeight : 0;
  
  const width = rect.width - 32;
  const height = rect.height - headerHeight - 32;
  
  // leave room for axis labels
  const margin = { top: 15, right: 15, bottom: 45, left: 50 }; 

  // create svg with proper sizing
  const svg = container.append('svg')
    .style('width', '100%')
    .style('height', `calc(100% - ${headerHeight}px)`)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio','xMidYMid meet');

  // offset main group by margins
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // scales for x (years) and y (capacity)
  const x = d3.scaleLinear().range([0, innerW]);
  const y = d3.scaleLinear().range([innerH, 0]);

  // create axis groups
  const xAxisG = g.append('g').attr('class','axis').attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class','axis');
  
  // group for all the bars
  const barG = g.append('g').attr('class', 'bars'); 

  // brush lets users select a year range
  const brush = d3.brushX()
    .extent([[0,0],[innerW,innerH]])
    .on('end', (event) => {
      if (!event.selection) {
        // no selection means reset to all years
        const yrs = DATA.plants.filter(d=>d.year).map(d=>d.year);
        DATA.yearRange = [d3.min(yrs) || DATA.yearRange[0], d3.max(yrs) || DATA.yearRange[1]];
      } else {
        // convert brush selection pixels to years
        const sel = event.selection;
        const yr0 = Math.round(x.invert(sel[0]));
        const yr1 = Math.round(x.invert(sel[1]));
        DATA.yearRange = [Math.min(yr0, yr1), Math.max(yr0, yr1)];
      }
      updateAll();
    });

  g.append('g').attr('class','brushG').call(brush);

  // save everything for updates
  DATA._timeline = { svg, g, x, y, xAxisG, yAxisG, barG, innerW, innerH, brush };
  DATA.updateTimeline = updateTimeline;
}

// render the stacked area chart showing capacity over time
export function updateTimeline(filtered){
 const { x, y, xAxisG, yAxisG, barG, innerW, innerH } = DATA._timeline;
 const color = DATA.fuelColorScale;
 
 // group data by year and fuel type
  const dataByYearAndFuel = d3.rollup(
  filtered.filter(d => d.year), 
  v => d3.sum(v, d => d.capacity),
  d => d.year, 
  d => d.fuel || 'Unknown' 
  );

  // get all years to maintain consistent global axis range
  const yrsAll = DATA.plants.filter(d=>d.year).map(d=>d.year);
  const globalMin = d3.min(yrsAll) || 1900;
  const globalMax = d3.max(yrsAll) || new Date().getFullYear();

  // Get years present in the filtered data for stacking
  const years = Array.from(d3.group(filtered.filter(d => d.year), d => d.year).keys()).sort(d3.ascending);
  const uniqueFuelTypes = Array.from(color.domain());

  // reshape data for d3 stack layout
  const dataForStacking = years.map(year => {
  const row = { year: year };
  const fuelMap = dataByYearAndFuel.get(year) || new Map();
  uniqueFuelTypes.forEach(fuel => {
    row[fuel] = fuelMap.get(fuel) || 0;
  });
  return row;
  });

  // create stacked layout
  const stack = d3.stack()
  .keys(uniqueFuelTypes)
  .order(d3.stackOrderNone)
  .offset(d3.stackOffsetNone);

  const stackedData = stack(dataForStacking);

  // find max capacity for y scale (Use only filtered data to dynamically scale Y axis)
  const maxCapacity = d3.max(dataForStacking, d => d3.sum(uniqueFuelTypes, fuel => d[fuel]));

  // If a brush selection is active, use the selected range for the x-axis domain.
  // Otherwise, use the full global range.
  if (DATA.isBrushed && DATA.yearRange[0] !== DATA.yearRange[1]) {
  // Use the selected years, plus a tiny buffer if possible, for zoom
  x.domain([DATA.yearRange[0] - 1, DATA.yearRange[1] + 1]); 
  } else {
  // Use the full range
  x.domain([globalMin, globalMax]);}
  // update scale domains
  y.domain([0, maxCapacity || 1]);

  // create and render axes
  const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format('d'));
  const yAxis = d3.axisLeft(y).ticks(4).tickFormat(d3.format('.2s'));

  xAxisG.call(xAxis);
  yAxisG.call(yAxis);

  // This replaces the need for barWidth calculation and rect logic.
  const area = d3.area()
  .x(d => x(d.data.year))
  .y0(d => y(d[0])) // lower bound of the stack layer
  .y1(d => y(d[1])) // upper bound of the stack layer
  .curve(d3.curveMonotoneX); // Optional: smooths the area edges

  // A version of the area generator for the initial transition state (flat at the bottom)
  const areaFlat = d3.area()
  .x(d => x(d.data.year))
  .y0(innerH) 
  .y1(innerH)
  .curve(d3.curveMonotoneX);

  // bind layers (one per fuel type)
  const layer = barG.selectAll('.layer')
  .data(stackedData, d => d.key); 

  layer.exit().remove();

  // create new layers with proper color
  const layerEnter = layer.enter().append('g')
  .attr('class', d => `layer ${d.key.replace(/\s/g, '-')}`)
  .attr('fill', d => color(d.key))

  const allLayers = layerEnter.merge(layer);
  
  //bind one data element (the entire layer) to one <path> element.
  const path = allLayers.selectAll('path')
  .data(d => [d], d => d.key); 

  path.exit().remove();

  // create and update areas with animation
  path.enter().append('path')
  .attr('fill', function(d) { return d3.select(this.parentNode).attr('fill'); }) 
  // Start path flat at the bottom for smooth transition
  .attr('d', areaFlat) 
  .merge(path)
  .transition().duration(800) // Animate to final position
  .attr('d', area)
}