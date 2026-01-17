// global data storage for all country statistics and geographic data
export const data = {
    countriesMap: new Map(), // alpha3 -> { name, region, ... }
    gdp: new Map(),          // alpha3 -> Map(year -> value)
    lifeExp: new Map(),      // alpha3 -> Map(year -> value)
    pop: new Map(),          // alpha3 -> Map(year -> value)
    geoData: null            // geojson features for map drawing
};

// lookup map to find alpha3 code by country name
export const alpha3ByName = new Map();

// hardcoded mapping of iso numeric ids to alpha3 codes
// needed because world-110m.json often uses numeric ids instead of alpha3
export const isoNumericToAlpha3 = new Map([
    ["4","AFG"],["8","ALB"],["12","DZA"],["24","AGO"],["32","ARG"],["36","AUS"],["40","AUT"],["51","ARM"],["50","BGD"],
    ["56","BEL"],["68","BOL"],["76","BRA"],["124","CAN"],["152","CHL"],["156","CHN"],["170","COL"],["180","COD"],
    ["188","CRI"],["191","HRV"],["196","CYP"],["208","DNK"],["262","DJI"],["276","DEU"],["300","GRC"],["344","HKG"],
    ["356","IND"],["360","IDN"],["376","ISR"],["392","JPN"],["398","KAZ"],["404","KEN"],["484","MEX"],["528","NLD"],
    ["554","NZL"],["586","PAK"],["643","RUS"],["764","THA"],["784","ARE"],["840","USA"],["858","URY"],["860","UZB"],
    ["862","VEN"],["894","ZMB"],["710","ZAF"],["250","FRA"],["826","GBR"],["380","ITA"],["400","JOR"],["504","MAR"],
    ["792","TUR"],["804","UKR"],["608","PHL"],["372","IRL"],["226","GNQ"],["140","CAF"],["728","SSD"],["834","TZA"],
    ["807","MKD"],["498","MDA"],["275","PSE"],["760","SYR"],["238","FLK"],["540","NCL"],["364","IRN"],["418","LAO"],
    ["704","VNM"],["408","PRK"],["410","KOR"],["732","ESH"],["96","BRN"],["214","DOM"],["90","SLB"],["70","BIH"],
    ["212","DMA"]
]);

// state tracking for animation and current year
export const state = {
    currentYear: 1800,      // currently displayed year
    isPlaying: false,       // whether animation is running
    animationTimer: null    // d3 interval timer for animation
};