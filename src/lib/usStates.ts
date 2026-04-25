// 50 US states + DC. Per-state plate styling + major cities.
// Plate style fields use HSL semantic-friendly hex/CSS colors that render on light backgrounds.

export interface StatePlateStyle {
  bg: string;        // background gradient or color (CSS)
  text: string;      // primary text color (state name + number)
  accent: string;    // slogan / accent color
  slogan: string;
  font?: "serif" | "sans" | "mono";
}

export interface USState {
  code: string;      // 2-letter
  name: string;
  cities: string[];  // major cities
  plate: StatePlateStyle;
}

export const US_STATES: USState[] = [
  { code: "AL", name: "Alabama", cities: ["Birmingham","Montgomery","Mobile","Huntsville","Tuscaloosa"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#7c2d12", accent: "#b91c1c", slogan: "STARS FELL ON" } },
  { code: "AK", name: "Alaska", cities: ["Anchorage","Fairbanks","Juneau","Wasilla","Sitka"],
    plate: { bg: "linear-gradient(180deg,#fffbe6,#fef3c7)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "THE LAST FRONTIER" } },
  { code: "AZ", name: "Arizona", cities: ["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Glendale"],
    plate: { bg: "linear-gradient(180deg,#fff7ed,#fed7aa)", text: "#7c2d12", accent: "#b91c1c", slogan: "GRAND CANYON STATE" } },
  { code: "AR", name: "Arkansas", cities: ["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#14532d", accent: "#b91c1c", slogan: "THE NATURAL STATE" } },
  { code: "CA", name: "California", cities: ["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland"],
    plate: { bg: "linear-gradient(180deg,#fff,#f8fafc)", text: "#1e3a8a", accent: "#dc2626", slogan: "CALIFORNIA" } },
  { code: "CO", name: "Colorado", cities: ["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Boulder"],
    plate: { bg: "linear-gradient(180deg,#bbf7d0,#86efac)", text: "#fff", accent: "#fff", slogan: "COLORFUL COLORADO" } },
  { code: "CT", name: "Connecticut", cities: ["Bridgeport","New Haven","Hartford","Stamford","Waterbury"],
    plate: { bg: "linear-gradient(180deg,#dbeafe,#bfdbfe)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "CONSTITUTION STATE" } },
  { code: "DE", name: "Delaware", cities: ["Wilmington","Dover","Newark","Middletown"],
    plate: { bg: "#1e3a8a", text: "#fde047", accent: "#fde047", slogan: "THE FIRST STATE" } },
  { code: "DC", name: "District of Columbia", cities: ["Washington"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#7f1d1d", accent: "#1e3a8a", slogan: "TAXATION WITHOUT REPRESENTATION" } },
  { code: "FL", name: "Florida", cities: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Tallahassee"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#0f172a", accent: "#16a34a", slogan: "SUNSHINE STATE" } },
  { code: "GA", name: "Georgia", cities: ["Atlanta","Augusta","Columbus","Macon","Savannah","Athens"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#0f172a", accent: "#b91c1c", slogan: "GEORGIA ON MY MIND" } },
  { code: "HI", name: "Hawaii", cities: ["Honolulu","Hilo","Kailua","Kaneohe","Waipahu"],
    plate: { bg: "linear-gradient(180deg,#bae6fd,#7dd3fc)", text: "#0c4a6e", accent: "#0c4a6e", slogan: "ALOHA STATE" } },
  { code: "ID", name: "Idaho", cities: ["Boise","Meridian","Nampa","Idaho Falls","Pocatello","Caldwell"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#14532d", accent: "#b91c1c", slogan: "FAMOUS POTATOES" } },
  { code: "IL", name: "Illinois", cities: ["Chicago","Aurora","Rockford","Joliet","Naperville","Springfield"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "LAND OF LINCOLN" } },
  { code: "IN", name: "Indiana", cities: ["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "CROSSROADS OF AMERICA" } },
  { code: "IA", name: "Iowa", cities: ["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#14532d", accent: "#14532d", slogan: "THE HAWKEYE STATE" } },
  { code: "KS", name: "Kansas", cities: ["Wichita","Overland Park","Kansas City","Olathe","Topeka"],
    plate: { bg: "linear-gradient(180deg,#fff7ed,#fed7aa)", text: "#7c2d12", accent: "#b91c1c", slogan: "AD ASTRA PER ASPERA" } },
  { code: "KY", name: "Kentucky", cities: ["Louisville","Lexington","Bowling Green","Owensboro","Covington"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "BLUEGRASS STATE" } },
  { code: "LA", name: "Louisiana", cities: ["New Orleans","Baton Rouge","Shreveport","Lafayette","Lake Charles"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#581c87", accent: "#facc15", slogan: "SPORTSMAN'S PARADISE" } },
  { code: "ME", name: "Maine", cities: ["Portland","Lewiston","Bangor","South Portland","Auburn"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#7c2d12", accent: "#dc2626", slogan: "VACATIONLAND" } },
  { code: "MD", name: "Maryland", cities: ["Baltimore","Frederick","Rockville","Gaithersburg","Annapolis"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#0f172a", accent: "#b91c1c", slogan: "MARYLAND" } },
  { code: "MA", name: "Massachusetts", cities: ["Boston","Worcester","Springfield","Cambridge","Lowell","Brockton"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#7f1d1d", accent: "#7f1d1d", slogan: "THE SPIRIT OF AMERICA" } },
  { code: "MI", name: "Michigan", cities: ["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "PURE MICHIGAN" } },
  { code: "MN", name: "Minnesota", cities: ["Minneapolis","Saint Paul","Rochester","Duluth","Bloomington"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#1e3a8a", accent: "#b91c1c", slogan: "10,000 LAKES" } },
  { code: "MS", name: "Mississippi", cities: ["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#7c2d12", accent: "#b91c1c", slogan: "THE MAGNOLIA STATE" } },
  { code: "MO", name: "Missouri", cities: ["Kansas City","Saint Louis","Springfield","Columbia","Independence"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#7f1d1d", accent: "#1e3a8a", slogan: "SHOW-ME STATE" } },
  { code: "MT", name: "Montana", cities: ["Billings","Missoula","Great Falls","Bozeman","Butte"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#1e3a8a", accent: "#b91c1c", slogan: "BIG SKY COUNTRY" } },
  { code: "NE", name: "Nebraska", cities: ["Omaha","Lincoln","Bellevue","Grand Island","Kearney"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#b91c1c", accent: "#b91c1c", slogan: "GOOD LIFE. GREAT WATER." } },
  { code: "NV", name: "Nevada", cities: ["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City"],
    plate: { bg: "linear-gradient(180deg,#bae6fd,#fef3c7)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "HOME MEANS NEVADA" } },
  { code: "NH", name: "New Hampshire", cities: ["Manchester","Nashua","Concord","Dover","Rochester"],
    plate: { bg: "linear-gradient(180deg,#fff,#bbf7d0)", text: "#14532d", accent: "#14532d", slogan: "LIVE FREE OR DIE" } },
  { code: "NJ", name: "New Jersey", cities: ["Newark","Jersey City","Paterson","Elizabeth","Edison","Trenton"],
    plate: { bg: "linear-gradient(180deg,#fef3c7,#fde68a)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "GARDEN STATE" } },
  { code: "NM", name: "New Mexico", cities: ["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell"],
    plate: { bg: "linear-gradient(180deg,#fef3c7,#fde68a)", text: "#b91c1c", accent: "#b91c1c", slogan: "LAND OF ENCHANTMENT" } },
  { code: "NY", name: "New York", cities: ["New York","Buffalo","Rochester","Yonkers","Syracuse","Albany"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef9c3)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "EMPIRE STATE" } },
  { code: "NC", name: "North Carolina", cities: ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "FIRST IN FLIGHT" } },
  { code: "ND", name: "North Dakota", cities: ["Fargo","Bismarck","Grand Forks","Minot","West Fargo"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "PEACE GARDEN STATE" } },
  { code: "OH", name: "Ohio", cities: ["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton"],
    plate: { bg: "linear-gradient(180deg,#dbeafe,#fff)", text: "#b91c1c", accent: "#1e3a8a", slogan: "BIRTHPLACE OF AVIATION" } },
  { code: "OK", name: "Oklahoma", cities: ["Oklahoma City","Tulsa","Norman","Broken Arrow","Edmond"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#7c2d12", accent: "#b91c1c", slogan: "NATIVE AMERICA" } },
  { code: "OR", name: "Oregon", cities: ["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton"],
    plate: { bg: "linear-gradient(180deg,#bbf7d0,#fff)", text: "#14532d", accent: "#14532d", slogan: "PACIFIC WONDERLAND" } },
  { code: "PA", name: "Pennsylvania", cities: ["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Harrisburg"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef9c3)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "PURSUE YOUR HAPPINESS" } },
  { code: "RI", name: "Rhode Island", cities: ["Providence","Warwick","Cranston","Pawtucket","East Providence"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#1e3a8a", accent: "#1e3a8a", slogan: "OCEAN STATE" } },
  { code: "SC", name: "South Carolina", cities: ["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#1e3a8a", accent: "#b91c1c", slogan: "WHILE I BREATHE, I HOPE" } },
  { code: "SD", name: "South Dakota", cities: ["Sioux Falls","Rapid City","Aberdeen","Brookings","Watertown"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#7c2d12", accent: "#b91c1c", slogan: "GREAT FACES. GREAT PLACES." } },
  { code: "TN", name: "Tennessee", cities: ["Nashville","Memphis","Knoxville","Chattanooga","Clarksville"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "VOLUNTEER STATE" } },
  { code: "TX", name: "Texas", cities: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#0f172a", accent: "#b91c1c", slogan: "THE LONE STAR STATE" } },
  { code: "UT", name: "Utah", cities: ["Salt Lake City","West Valley City","Provo","West Jordan","Orem"],
    plate: { bg: "linear-gradient(180deg,#fff7ed,#fed7aa)", text: "#7c2d12", accent: "#b91c1c", slogan: "LIFE ELEVATED" } },
  { code: "VT", name: "Vermont", cities: ["Burlington","South Burlington","Rutland","Barre","Montpelier"],
    plate: { bg: "linear-gradient(180deg,#86efac,#bbf7d0)", text: "#fff", accent: "#fff", slogan: "GREEN MOUNTAIN STATE" } },
  { code: "VA", name: "Virginia", cities: ["Virginia Beach","Norfolk","Chesapeake","Richmond","Newport News","Alexandria"],
    plate: { bg: "linear-gradient(180deg,#fff,#f3f4f6)", text: "#1e3a8a", accent: "#b91c1c", slogan: "VIRGINIA IS FOR LOVERS" } },
  { code: "WA", name: "Washington", cities: ["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Olympia"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#14532d", accent: "#14532d", slogan: "EVERGREEN STATE" } },
  { code: "WV", name: "West Virginia", cities: ["Charleston","Huntington","Morgantown","Parkersburg","Wheeling"],
    plate: { bg: "linear-gradient(180deg,#fff,#dbeafe)", text: "#1e3a8a", accent: "#b91c1c", slogan: "WILD AND WONDERFUL" } },
  { code: "WI", name: "Wisconsin", cities: ["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha","Oshkosh","Eau Claire","Janesville","La Crosse","Sheboygan","Wauwatosa","Fond du Lac"],
    plate: { bg: "linear-gradient(180deg,#f5f3eb,#f0ede4)", text: "#1a2744", accent: "#c41e3a", slogan: "AMERICA'S DAIRYLAND" } },
  { code: "WY", name: "Wyoming", cities: ["Cheyenne","Casper","Laramie","Gillette","Rock Springs"],
    plate: { bg: "linear-gradient(180deg,#fff,#fef3c7)", text: "#7c2d12", accent: "#b91c1c", slogan: "FOREVER WEST" } },
];

export const STATE_BY_CODE: Record<string, USState> = Object.fromEntries(
  US_STATES.map(s => [s.code, s])
);

export function getStateByCode(code?: string | null): USState {
  if (!code) return STATE_BY_CODE.WI;
  return STATE_BY_CODE[code.toUpperCase()] || STATE_BY_CODE.WI;
}

// Map full state name (case-insensitive) to 2-letter code (for reverse-geocoding)
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  US_STATES.map(s => [s.name.toLowerCase(), s.code])
);
export function stateNameToCode(name?: string | null): string | null {
  if (!name) return null;
  return NAME_TO_CODE[name.toLowerCase()] || null;
}

// All cities flattened with state code (for filters / search)
export const ALL_CITIES: { city: string; state: string; label: string }[] =
  US_STATES.flatMap(s => s.cities.map(c => ({ city: c, state: s.code, label: `${c}, ${s.code}` })));
