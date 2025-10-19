export async function detectCountryFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Failed to detect country');
    const data = await response.json();
    return data.country_code || 'US'; // Return ISO 2-letter country code
  } catch (error) {
    console.warn('Could not detect country from IP:', error);
    return 'US'; // Default fallback
  }
}

// Country code to name mapping for common countries
export const COUNTRY_CODE_TO_NAME = {
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'AU': 'Australia',
  'IN': 'India',
  'FR': 'France',
  'DE': 'Germany',
  'ES': 'Spain',
  'IT': 'Italy',
  'JP': 'Japan',
  'CN': 'China',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'NZ': 'New Zealand',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'PH': 'Philippines',
  'TH': 'Thailand',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'VN': 'Vietnam',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'PL': 'Poland',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PT': 'Portugal',
  'GR': 'Greece',
  'TR': 'Turkey',
  'IL': 'Israel',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
};

export function getCountryName(code) {
  return COUNTRY_CODE_TO_NAME[code?.toUpperCase()] || 'United States';
}
