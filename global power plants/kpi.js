import { DATA } from './data.js';
import { formatCapacity, formatNumber } from './utils.js';

// update the three KPI cards at the top of the dashboard
export function updateKPIs(plants){
    // calculate the summary stats from filtered plants
    const totalCapacity = d3.sum(plants, d => d.capacity);
    const plantCount = plants.length;
    const fuelText = DATA.selectedFuel || 'ALL';

    // update each KPI display with formatted values
    d3.select('#kpi-capacity-value').text(formatCapacity(totalCapacity));
    d3.select('#kpi-plants-value').text(formatNumber(plantCount));
    d3.select('#kpi-fuel-value').text(fuelText.toUpperCase());
    
    // also update the info banner to show current filter status
    const minYear = Math.round(DATA.yearRange[0]);
    const maxYear = Math.round(DATA.yearRange[1]);
    
    d3.select('#info').text(`Filtering: ${formatNumber(plantCount)} plants from ${minYear} to ${maxYear}.`);
}

// get plants that match current filters (fuel type and year range)
export function getFilteredPlants(){
  return DATA.plants.filter(d => {
    // if a fuel type is selected, only keep matching plants
    if (DATA.selectedFuel && (d.fuel || 'Unknown') !== DATA.selectedFuel) return false;

    // check if plant's commissioning year falls within selected range
    if (d.year) {
      const minY = DATA.yearRange[0] || -Infinity;
      const maxY = DATA.yearRange[1] || Infinity;
      if (d.year < minY || d.year > maxY) return false;
    }
    return true;
  });
}