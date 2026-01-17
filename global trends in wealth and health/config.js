// configuration constants for the visualization

// year range for the dataset
export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;

// minimum gdp value to avoid log(0) issues on the motion chart
export const GDP_FLOOR = 100;

// how fast the animation moves (milliseconds per year)
export const ANIMATION_INTERVAL = 200;