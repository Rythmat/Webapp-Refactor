// Primary/dominant flag color for each country (keyed by ISO A3)
export const COUNTRY_FLAG_COLORS: Record<string, string> = {
  // === AMERICAS ===
  USA: '#3C3B6E', // Navy blue (union field)
  CAN: '#FF0000', // Red (maple leaf)
  MEX: '#006847', // Green (left stripe)
  GTM: '#4997D0', // Sky blue (stripes)
  BLZ: '#003F87', // Royal blue (field)
  SLV: '#0F47AF', // Cobalt blue (stripes)
  HND: '#0073CF', // Blue (stripes)
  NIC: '#0067C6', // Blue (stripes)
  CRI: '#EF0107', // Red (center stripe)
  PAN: '#DA121A', // Red (quarter)
  CUB: '#002590', // Blue (stripes)
  JAM: '#009B3A', // Green (diagonal cross)
  HTI: '#00209F', // Blue (top half)
  DOM: '#002D62', // Navy blue (quarter)
  PRI: '#3C3B6E', // Navy blue (triangle)
  TTO: '#CE1126', // Red (field)
  COL: '#FCD116', // Yellow (top half)
  VEN: '#FCE300', // Yellow (center stripe)
  GUY: '#009E49', // Green (field)
  SUR: '#377E3F', // Green (stripes)
  ECU: '#FFD100', // Yellow (top half)
  PER: '#D91023', // Red (stripes)
  BOL: '#D52B1E', // Red (center stripe)
  BRA: '#009C3B', // Green (field)
  PRY: '#DA121A', // Red (bottom stripe)
  URY: '#001489', // Blue (stripes)
  ARG: '#74ACDF', // Light blue (stripes)
  CHL: '#D52B1E', // Red (bottom half)

  // === EUROPE ===
  GBR: '#CF142B', // Red (crosses)
  IRL: '#169B62', // Green (left stripe)
  ISL: '#003897', // Blue (field)
  NOR: '#EF2B2D', // Red (field)
  DNK: '#C60C30', // Red (field)
  SWE: '#006AA7', // Blue (field)
  FIN: '#003580', // Blue (cross)
  EST: '#0072CE', // Blue (top stripe)
  LVA: '#9E3039', // Maroon (stripes)
  LTU: '#006A44', // Green (bottom stripe)
  POL: '#DC143C', // Crimson (bottom half)
  DEU: '#DD0000', // Red (center stripe)
  NLD: '#AE1C28', // Red (top stripe)
  BEL: '#FDDA24', // Yellow (center stripe)
  LUX: '#00A2E1', // Light blue (bottom stripe)
  FRA: '#002395', // Blue (left stripe)
  ESP: '#AA151B', // Red (top/bottom)
  PRT: '#006600', // Green (left portion)
  ITA: '#009246', // Green (left stripe)
  CHE: '#DA291C', // Red (field)
  AUT: '#ED2939', // Red (stripes)
  CZE: '#11457E', // Blue (triangle)
  SVK: '#0B4EA2', // Blue (stripe)
  HUN: '#CE2939', // Red (bottom stripe)
  SVN: '#003DA5', // Blue (stripe)
  HRV: '#171796', // Blue (stripe)
  BIH: '#002395', // Blue (triangle)
  SRB: '#C6363C', // Red (top stripe)
  MNE: '#C40308', // Red (field)
  MKD: '#CE2028', // Red (field)
  ALB: '#E41E20', // Red (field)
  GRC: '#004C98', // Blue (stripes)
  BGR: '#00966E', // Green (bottom stripe)
  ROU: '#002B7F', // Blue (left stripe)
  MDA: '#003DA5', // Blue (left stripe)
  UKR: '#005BBB', // Blue (top half)
  BLR: '#CF101A', // Red (top two-thirds)
  RUS: '#0039A6', // Blue (center stripe)

  // === AFRICA ===
  MAR: '#C1272D', // Red (field)
  DZA: '#006233', // Green (left half)
  TUN: '#E70013', // Red (field)
  LBY: '#E70013', // Red (center stripe)
  EGY: '#CE1126', // Red (bottom stripe)
  MRT: '#006233', // Green (field)
  MLI: '#14B53A', // Green (right stripe)
  NER: '#E05206', // Orange (top stripe)
  TCD: '#002664', // Blue (left stripe)
  SDN: '#D21034', // Red (middle stripe)
  SSD: '#078930', // Green (top stripe)
  ESH: '#007A3D', // Green (triangle)
  SEN: '#00853F', // Green (right stripe)
  GMB: '#CE1126', // Red (center stripe)
  GIN: '#CE1126', // Red (right stripe)
  GNB: '#CE1126', // Red (vertical stripe)
  SLE: '#1EB53A', // Green (top stripe)
  LBR: '#BF0A30', // Red (stripes)
  CIV: '#F77F00', // Orange (left stripe)
  GHA: '#EF3340', // Red (top stripe)
  TGO: '#006A4E', // Green (stripes)
  BEN: '#008751', // Green (vertical stripe)
  BFA: '#EF2B2D', // Red (bottom half)
  NGA: '#008751', // Green (stripes)
  CMR: '#007A5E', // Green (left stripe)
  GAB: '#009E60', // Green (top stripe)
  COG: '#009543', // Green (diagonal)
  COD: '#007FFF', // Sky blue (field)
  CAF: '#003082', // Blue (top stripe)
  GNQ: '#3E9A00', // Green (top stripe)
  RWA: '#00A1DE', // Sky blue (top half)
  BDI: '#CE1126', // Red (diagonal cross)
  UGA: '#D90000', // Red (stripes)
  KEN: '#BB0000', // Red (center stripe)
  TZA: '#1EB53A', // Green (corners)
  MOZ: '#007168', // Teal green (stripes)
  MWI: '#CE1126', // Red (top stripe)
  ZMB: '#198A00', // Green (field)
  ZWE: '#319208', // Green (stripes)
  BWA: '#75AADB', // Light blue (field)
  NAM: '#003580', // Blue (diagonal)
  ZAF: '#007749', // Green (Y-band)
  LSO: '#00209F', // Blue (field)
  SWZ: '#3D5EB3', // Blue (stripes)
  MDG: '#FC3D32', // Red (right top)
  SOM: '#4189DD', // Light blue (field)
  DJI: '#6AB2E7', // Light blue (top half)
  ERI: '#4189DD', // Blue (triangle)
  ETH: '#009A44', // Green (top stripe)
  AGO: '#CE1126', // Red (top half)

  // === MIDDLE EAST & CENTRAL ASIA ===
  TUR: '#E30A17', // Red (field)
  SYR: '#CE1126', // Red (center stripe)
  LBN: '#ED1C24', // Red (stripes)
  ISR: '#0038B8', // Blue (Star of David)
  PSE: '#007A3D', // Green (triangle)
  JOR: '#007A3D', // Green (triangle)
  IRQ: '#CE1126', // Red (center stripe)
  IRN: '#239F40', // Green (bottom stripe)
  KWT: '#007A3D', // Green (top stripe)
  SAU: '#006C35', // Green (field)
  QAT: '#8D1B3D', // Maroon (field)
  ARE: '#00732F', // Green (top stripe)
  OMN: '#DB161B', // Red (vertical stripe)
  YEM: '#CE1126', // Red (center stripe)
  AFG: '#000000', // Black (field)
  PAK: '#01411C', // Dark green (field)
  TKM: '#28AE66', // Green (field)
  UZB: '#1EB53A', // Green (bottom stripe)
  TJK: '#CC0000', // Red (top stripe)
  KGZ: '#E8112D', // Red (field)
  KAZ: '#00AFCA', // Sky blue (field)

  // === SOUTH & EAST ASIA ===
  IND: '#FF9933', // Saffron (top stripe)
  NPL: '#DC143C', // Crimson (field)
  LKA: '#8D153A', // Maroon (field)
  BGD: '#006A4E', // Green (field)
  BTN: '#FF4E12', // Orange (top diagonal)
  MMR: '#FECB00', // Yellow (top stripe)
  THA: '#241D4F', // Dark blue (center stripe)
  LAO: '#CE1126', // Red (stripes)
  KHM: '#032EA1', // Blue (stripes)
  VNM: '#DA251D', // Red (field)
  MYS: '#010066', // Dark blue (canton)
  IDN: '#CE1126', // Red (top half)
  PHL: '#0038A8', // Blue (top half)
  CHN: '#EE1C25', // Red (field)
  MNG: '#C4272F', // Red (outer stripes)
  PRK: '#ED1C27', // Red (center stripe)
  KOR: '#CD2E3A', // Red (yin-yang)
  JPN: '#BC002D', // Red (sun disc)
  TWN: '#FE0000', // Red (field)

  // === OCEANIA ===
  AUS: '#00008B', // Dark blue (field)
  NZL: '#00247D', // Blue (field)
  PNG: '#CE1126', // Red (diagonal)
  SLB: '#0051A5', // Blue (field)
  VUT: '#009543', // Green (field)
  FJI: '#68BFE5', // Light blue (field)
  NCL: '#009543', // Green (Kanak flag)

  // === CARIBBEAN & SMALL NATIONS ===
  BRB: '#00267F', // Blue (stripes)
  BHS: '#00778B', // Aquamarine (stripes)
  GRD: '#CE1126', // Red (border)
  LCA: '#65CFFF', // Light blue (field)
  VCT: '#009E60', // Green (right stripe)
  DMA: '#006B3F', // Green (field)
  ATG: '#CE1126', // Red (field)
  KNA: '#009E49', // Green (diagonal)
  CPV: '#003893', // Blue (field)
  STP: '#12AD2B', // Green (stripes)
  COM: '#003DA5', // Blue (stripes)
  MUS: '#00275E', // Blue (top stripe)
  SYC: '#003F87', // Blue (field)
  MDV: '#007E3A', // Green (rectangle)

  // === SMALL EUROPEAN STATES ===
  MCO: '#CE1126', // Red (bottom half)
  LIE: '#002B7F', // Blue (top half)
  AND: '#0032A0', // Blue (center stripe)
  SMR: '#5EB6E4', // Light blue (field)
  MLT: '#CF142B', // Red (right half)
  VAT: '#FFE000', // Gold (right half)

  // === CAUCASUS ===
  GEO: '#FF0000', // Red (crosses)
  ARM: '#0033A0', // Blue (center stripe)
  AZE: '#0092BC', // Blue (center stripe)

  // === SE ASIA & OCEANIA (SMALL) ===
  SGP: '#EF3340', // Red (top half)
  TLS: '#DC241F', // Red (field)
  BRN: '#F7E017', // Yellow (field)
  WSM: '#CE1126', // Red (field)
  TON: '#C10000', // Red (field)
  KIR: '#CE1126', // Red (top half)
  FSM: '#75B2DD', // Light blue (field)
  MHL: '#003893', // Blue (field)
  PLW: '#4AADD6', // Light blue (field)
  NRU: '#002B7F', // Blue (field)
  TUV: '#00247D', // Blue (field)

  // === OTHER ===
  FLK: '#00247D', // Blue (ensign)
  ATF: '#002395', // Blue (French tricolor)
  CYP: '#D57800', // Copper (map silhouette)
  BHR: '#CE1126', // Red (field)
};

// City country display name → ISO A3 code
export const CITY_COUNTRY_TO_ISO: Record<string, string> = {
  US: 'USA',
  UK: 'GBR',
  Germany: 'DEU',
  France: 'FRA',
  Jamaica: 'JAM',
  Cuba: 'CUB',
  Brazil: 'BRA',
  Nigeria: 'NGA',
  India: 'IND',
  Japan: 'JPN',
  Austria: 'AUT',
  Argentina: 'ARG',
  Ghana: 'GHA',
  'South Africa': 'ZAF',
  'South Korea': 'KOR',
  Portugal: 'PRT',
  Spain: 'ESP',
  Sweden: 'SWE',
  Morocco: 'MAR',
  'Puerto Rico': 'PRI',
  Colombia: 'COL',
  Senegal: 'SEN',
  Egypt: 'EGY',
  Mexico: 'MEX',
  Angola: 'AGO',
  China: 'CHN',
  Kenya: 'KEN',
  Lebanon: 'LBN',
  Hungary: 'HUN',
  Russia: 'RUS',
  Uzbekistan: 'UZB',
  Turkey: 'TUR',
  Ethiopia: 'ETH',
  Australia: 'AUS',
  Algeria: 'DZA',
  Tunisia: 'TUN',
  Libya: 'LBY',
  Sudan: 'SDN',
  Mali: 'MLI',
  'Burkina Faso': 'BFA',
  "Côte d'Ivoire": 'CIV',
  Guinea: 'GIN',
  'Guinea-Bissau': 'GNB',
  'Sierra Leone': 'SLE',
  Liberia: 'LBR',
  Togo: 'TGO',
  Benin: 'BEN',
  Niger: 'NER',
  Mauritania: 'MRT',
  Gambia: 'GMB',
  'Cape Verde': 'CPV',
  'DR Congo': 'COD',
  'Republic of Congo': 'COG',
  Cameroon: 'CMR',
  Gabon: 'GAB',
  'Equatorial Guinea': 'GNQ',
  'Central African Republic': 'CAF',
  Chad: 'TCD',
  'São Tomé and Príncipe': 'STP',
  Tanzania: 'TZA',
  Uganda: 'UGA',
  Rwanda: 'RWA',
  Burundi: 'BDI',
  Somalia: 'SOM',
  Eritrea: 'ERI',
  Djibouti: 'DJI',
  'South Sudan': 'SSD',
  Madagascar: 'MDG',
  Comoros: 'COM',
  Mauritius: 'MUS',
  Seychelles: 'SYC',
  Mozambique: 'MOZ',
  Zimbabwe: 'ZWE',
  Zambia: 'ZMB',
  Malawi: 'MWI',
  Botswana: 'BWA',
  Namibia: 'NAM',
  Eswatini: 'SWZ',
  Lesotho: 'LSO',
  Norway: 'NOR',
  Finland: 'FIN',
  Denmark: 'DNK',
  Iceland: 'ISL',
  Ireland: 'IRL',
  Netherlands: 'NLD',
  Belgium: 'BEL',
  Luxembourg: 'LUX',
  Switzerland: 'CHE',
  Italy: 'ITA',
  Monaco: 'MCO',
  Liechtenstein: 'LIE',
  Andorra: 'AND',
  'San Marino': 'SMR',
  Malta: 'MLT',
  'Vatican City': 'VAT',
  Poland: 'POL',
  Czechia: 'CZE',
  Slovakia: 'SVK',
  Romania: 'ROU',
  Bulgaria: 'BGR',
  Croatia: 'HRV',
  Serbia: 'SRB',
  'Bosnia and Herzegovina': 'BIH',
  Montenegro: 'MNE',
  'North Macedonia': 'MKD',
  Albania: 'ALB',
  Slovenia: 'SVN',
  Ukraine: 'UKR',
  Belarus: 'BLR',
  Moldova: 'MDA',
  Greece: 'GRC',
  Cyprus: 'CYP',
  Lithuania: 'LTU',
  Latvia: 'LVA',
  Estonia: 'EST',
  Iran: 'IRN',
  Iraq: 'IRQ',
  Syria: 'SYR',
  Jordan: 'JOR',
  Israel: 'ISR',
  Palestine: 'PSE',
  'Saudi Arabia': 'SAU',
  Yemen: 'YEM',
  Oman: 'OMN',
  UAE: 'ARE',
  Qatar: 'QAT',
  Bahrain: 'BHR',
  Kuwait: 'KWT',
  Georgia: 'GEO',
  Armenia: 'ARM',
  Azerbaijan: 'AZE',
  Kazakhstan: 'KAZ',
  Kyrgyzstan: 'KGZ',
  Tajikistan: 'TJK',
  Turkmenistan: 'TKM',
  Pakistan: 'PAK',
  Bangladesh: 'BGD',
  'Sri Lanka': 'LKA',
  Nepal: 'NPL',
  Bhutan: 'BTN',
  Maldives: 'MDV',
  Afghanistan: 'AFG',
  Mongolia: 'MNG',
  'North Korea': 'PRK',
  Taiwan: 'TWN',
  Myanmar: 'MMR',
  Thailand: 'THA',
  Vietnam: 'VNM',
  Laos: 'LAO',
  Cambodia: 'KHM',
  Malaysia: 'MYS',
  Singapore: 'SGP',
  Indonesia: 'IDN',
  Philippines: 'PHL',
  'Timor-Leste': 'TLS',
  Brunei: 'BRN',
  'New Zealand': 'NZL',
  'Papua New Guinea': 'PNG',
  Fiji: 'FJI',
  'Solomon Islands': 'SLB',
  Vanuatu: 'VUT',
  Samoa: 'WSM',
  Tonga: 'TON',
  Kiribati: 'KIR',
  Micronesia: 'FSM',
  'Marshall Islands': 'MHL',
  Palau: 'PLW',
  Nauru: 'NRU',
  Tuvalu: 'TUV',
  Canada: 'CAN',
  Haiti: 'HTI',
  'Dominican Republic': 'DOM',
  'Trinidad and Tobago': 'TTO',
  Barbados: 'BRB',
  Bahamas: 'BHS',
  Grenada: 'GRD',
  'Saint Lucia': 'LCA',
  'Saint Vincent and the Grenadines': 'VCT',
  Dominica: 'DMA',
  'Antigua and Barbuda': 'ATG',
  'Saint Kitts and Nevis': 'KNA',
  Belize: 'BLZ',
  Guatemala: 'GTM',
  Honduras: 'HND',
  'El Salvador': 'SLV',
  Nicaragua: 'NIC',
  'Costa Rica': 'CRI',
  Panama: 'PAN',
  Venezuela: 'VEN',
  Ecuador: 'ECU',
  Peru: 'PER',
  Bolivia: 'BOL',
  Chile: 'CHL',
  Paraguay: 'PRY',
  Uruguay: 'URY',
  Guyana: 'GUY',
  Suriname: 'SUR',
};

// US state flag primary color (keyed by GeoJSON name)
export const STATE_FLAG_COLORS: Record<string, string> = {
  Alabama: '#AD0C2B', // Crimson St Andrew's cross
  Alaska: '#002868', // Dark blue field with Big Dipper
  Arizona: '#BF0A30', // Red/yellow rays on copper star
  Arkansas: '#CE1126', // Red diamond on blue
  California: '#003DA5', // Blue bar with grizzly bear
  Colorado: '#002868', // Blue with red C and gold
  Connecticut: '#003DA5', // Royal blue with Charter Oak
  Delaware: '#003DA5', // Colonial blue with diamond
  'District of Columbia': '#E81B39', // Red with three stars
  Florida: '#CE1126', // Red St Andrew's cross
  Georgia: '#002868', // Blue canton on red/white
  Hawaii: '#003DA5', // Blue/red/white stripes
  Idaho: '#003DA5', // Blue field with state seal
  Illinois: '#FFFFFF', // White with state seal
  Indiana: '#003DA5', // Blue field with torch
  Iowa: '#CE1126', // Red/white/blue vertical
  Kansas: '#003DA5', // Blue with sunflower
  Kentucky: '#003DA5', // Blue with state seal
  Louisiana: '#003DA5', // Blue with pelican
  Maine: '#003DA5', // Blue with state coat of arms
  Maryland: '#E8B00F', // Gold/black Calvert cross
  Massachusetts: '#003DA5', // Blue with state emblem
  Michigan: '#003DA5', // Blue with state coat of arms
  Minnesota: '#003DA5', // Royal blue with state seal
  Mississippi: '#BF0A30', // Red/white/blue with magnolia
  Missouri: '#CE1126', // Red/white/blue tricolor
  Montana: '#003DA5', // Blue with state seal
  Nebraska: '#003DA5', // Blue with state seal
  Nevada: '#003DA5', // Cobalt blue with sagebrush
  'New Hampshire': '#003DA5', // Blue with state seal
  'New Jersey': '#E8B00F', // Buff/fawn with state coat of arms
  'New Mexico': '#FCD116', // Yellow with red Zia sun
  'New York': '#003DA5', // Blue with state coat of arms
  'North Carolina': '#CC0000', // Red/white with blue union
  'North Dakota': '#003DA5', // Blue with bald eagle
  Ohio: '#CE1126', // Red/white with blue triangle
  Oklahoma: '#0073CF', // Sky blue with Osage shield
  Oregon: '#002868', // Navy blue with gold beaver
  Pennsylvania: '#003DA5', // Blue with state coat of arms
  'Rhode Island': '#FFFFFF', // White with gold anchor
  'South Carolina': '#003DA5', // Blue with palmetto tree
  'South Dakota': '#0073CF', // Sky blue with state seal
  Tennessee: '#CE1126', // Red with blue circle and stars
  Texas: '#002868', // Blue with lone star
  Utah: '#003DA5', // Blue with beehive seal
  Vermont: '#003DA5', // Blue with state coat of arms
  Virginia: '#003DA5', // Blue with state seal
  Washington: '#006400', // Green with state seal
  'West Virginia': '#003DA5', // Blue with state coat of arms
  Wisconsin: '#003DA5', // Blue with state coat of arms
  Wyoming: '#003DA5', // Blue with white bison
};

// Canadian province/territory flag primary color (keyed by GeoJSON name)
export const PROVINCE_FLAG_COLORS: Record<string, string> = {
  Ontario: '#CC0000', // Red with Ontario shield
  Québec: '#003DA5', // Blue fleurdelisé
  'British Columbia': '#002868', // Blue with Union Jack/sun
  Alberta: '#002868', // Blue with shield
  Manitoba: '#CC0000', // Red ensign with bison
  Saskatchewan: '#006400', // Green (bottom half)
  'Nova Scotia': '#003DA5', // Blue with Scottish cross
  'New Brunswick': '#CC0000', // Red with golden lion
  'Newfoundland and Labrador': '#CC0000', // Red/gold/blue design
  'Prince Edward Island': '#CC0000', // Red with heraldic lions
  Yukon: '#003DA5', // Blue with coat of arms
  'Northwest Territories': '#003DA5', // Blue with NWT shield
  Nunavut: '#FCD116', // Gold with inuksuk
};
