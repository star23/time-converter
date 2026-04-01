/**
 * Timezone abbreviation to IANA timezone mapping.
 * Maps both generic (ET, CT) and specific (EST, EDT) abbreviations
 * to IANA zones. The Intl API then handles DST automatically based on the date.
 *
 * For ambiguous abbreviations like "EST", we treat them as colloquial usage
 * meaning "Eastern Time" (America/New_York), and let the actual date determine
 * whether DST is in effect. This matches how most people use these abbreviations.
 */
const TIMEZONE_MAP = {
  // US Eastern
  'ET': 'America/New_York',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'EASTERN': 'America/New_York',
  'EASTERN TIME': 'America/New_York',

  // US Central
  'CT': 'America/Chicago',
  'CST': 'America/Chicago',
  'CDT': 'America/Chicago',
  'CENTRAL': 'America/Chicago',
  'CENTRAL TIME': 'America/Chicago',

  // US Mountain
  'MT': 'America/Denver',
  'MST': 'America/Denver',
  'MDT': 'America/Denver',
  'MOUNTAIN': 'America/Denver',
  'MOUNTAIN TIME': 'America/Denver',

  // US Pacific
  'PT': 'America/Los_Angeles',
  'PST': 'America/Los_Angeles',
  'PDT': 'America/Los_Angeles',
  'PACIFIC': 'America/Los_Angeles',
  'PACIFIC TIME': 'America/Los_Angeles',

  // US Alaska
  'AKT': 'America/Anchorage',
  'AKST': 'America/Anchorage',
  'AKDT': 'America/Anchorage',
  'ALASKA': 'America/Anchorage',

  // US Hawaii
  'HST': 'Pacific/Honolulu',
  'HAST': 'Pacific/Honolulu',
  'HT': 'Pacific/Honolulu',
  'HAWAII': 'Pacific/Honolulu',

  // UTC / GMT
  'UTC': 'UTC',
  'GMT': 'Europe/London',
  'Z': 'UTC',

  // UK / Ireland
  'BST': 'Europe/London',
  'IST': 'Europe/Dublin',

  // Western Europe
  'WET': 'Europe/Lisbon',
  'WEST': 'Europe/Lisbon',

  // Central Europe
  'CET': 'Europe/Berlin',
  'CEST': 'Europe/Berlin',
  'MET': 'Europe/Berlin',
  'MEST': 'Europe/Berlin',

  // Eastern Europe
  'EET': 'Europe/Helsinki',
  'EEST': 'Europe/Helsinki',

  // Moscow
  'MSK': 'Europe/Moscow',

  // China
  'CST CHINA': 'Asia/Shanghai',
  'HKT': 'Asia/Hong_Kong',
  'BJT': 'Asia/Shanghai',
  'SGT': 'Asia/Singapore',
  'MYT': 'Asia/Kuala_Lumpur',

  // Japan / Korea
  'JST': 'Asia/Tokyo',
  'KST': 'Asia/Seoul',

  // India
  'IST INDIA': 'Asia/Kolkata',

  // Australia
  'AEST': 'Australia/Sydney',
  'AEDT': 'Australia/Sydney',
  'ACST': 'Australia/Adelaide',
  'ACDT': 'Australia/Adelaide',
  'AWST': 'Australia/Perth',

  // New Zealand
  'NZST': 'Pacific/Auckland',
  'NZDT': 'Pacific/Auckland',

  // Brazil
  'BRT': 'America/Sao_Paulo',
  'BRST': 'America/Sao_Paulo',

  // Atlantic
  'AST': 'America/Halifax',
  'ADT': 'America/Halifax',

  // Newfoundland
  'NST': 'America/St_Johns',
  'NDT': 'America/St_Johns',

  // Middle East
  'GST': 'Asia/Dubai',
  'IRST': 'Asia/Tehran',

  // Thailand / Indochina
  'ICT': 'Asia/Bangkok',

  // Philippines
  'PHT': 'Asia/Manila',

  // Taiwan
  'TWT': 'Asia/Taipei',
};

/**
 * Common city/region names mapped to IANA timezones.
 * Used to detect patterns like "9PM London time" or "Beijing time".
 */
const CITY_TIMEZONE_MAP = {
  'NEW YORK': 'America/New_York',
  'LOS ANGELES': 'America/Los_Angeles',
  'CHICAGO': 'America/Chicago',
  'DENVER': 'America/Denver',
  'PHOENIX': 'America/Phoenix',
  'ANCHORAGE': 'America/Anchorage',
  'HONOLULU': 'Pacific/Honolulu',
  'TORONTO': 'America/Toronto',
  'VANCOUVER': 'America/Vancouver',
  'LONDON': 'Europe/London',
  'PARIS': 'Europe/Paris',
  'BERLIN': 'Europe/Berlin',
  'MADRID': 'Europe/Madrid',
  'ROME': 'Europe/Rome',
  'AMSTERDAM': 'Europe/Amsterdam',
  'MOSCOW': 'Europe/Moscow',
  'DUBAI': 'Asia/Dubai',
  'MUMBAI': 'Asia/Kolkata',
  'DELHI': 'Asia/Kolkata',
  'KOLKATA': 'Asia/Kolkata',
  'BANGALORE': 'Asia/Kolkata',
  'SHANGHAI': 'Asia/Shanghai',
  'BEIJING': 'Asia/Shanghai',
  'HONG KONG': 'Asia/Hong_Kong',
  'TAIPEI': 'Asia/Taipei',
  'TOKYO': 'Asia/Tokyo',
  'SEOUL': 'Asia/Seoul',
  'SINGAPORE': 'Asia/Singapore',
  'KUALA LUMPUR': 'Asia/Kuala_Lumpur',
  'BANGKOK': 'Asia/Bangkok',
  'SYDNEY': 'Australia/Sydney',
  'MELBOURNE': 'Australia/Melbourne',
  'AUCKLAND': 'Pacific/Auckland',
  'SAO PAULO': 'America/Sao_Paulo',
  'BUENOS AIRES': 'America/Argentina/Buenos_Aires',
  'CAIRO': 'Africa/Cairo',
  'ISTANBUL': 'Europe/Istanbul',
  'JAKARTA': 'Asia/Jakarta',
  'MANILA': 'Asia/Manila',
  'HAWAII': 'Pacific/Honolulu',
};
