// global data object to store all our plant and map information
export const DATA = {
  plants: [], // array of all power plant records after loading from csv
  worldTopo: null, // topojson data for drawing country boundaries
  countryIndex: null, // lookup map to find country features by various identifiers
  countryCentroids: null, // pre-calculated center points for each country
  selectedFuel: null, // currently selected fuel type for filtering (null means show all)
  yearRange: [0, 9999], // min and max years for timeline filter, starts wide open
  fuelColorScale: null // d3 color scale that maps fuel types to consistent colors
};

// state object tracks the current view and rendering settings
export const STATE = {
  zoomK: 1, // current zoom level (1 = default, higher = zoomed in)
  transform: d3.zoomIdentity, // d3 zoom transform object for pan and zoom
  zoomThreshold: 3, // zoom level where we switch from country bubbles to individual plants
  plantRenderCap: 12000 // max number of plant points to render at once for performance
};