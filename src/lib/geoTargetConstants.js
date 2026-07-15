// Google Ads `geographic_view.country_criterion_id` values follow a fixed,
// documented pattern: criterion ID = "2" + ISO 3166-1 numeric country code
// (zero-padded to 3 digits). E.g. 2840 -> "840" -> United States,
// 2826 -> "826" -> United Kingdom, 2036 -> "036" -> Australia.
//
// This is a static mapping (ISO codes don't change), so no API call is
// needed to resolve these client-side.

const ISO_NUMERIC_TO_COUNTRY = {
  "004": "Afghanistan", "008": "Albania", "012": "Algeria", "020": "Andorra",
  "024": "Angola", "031": "Azerbaijan", "032": "Argentina", "036": "Australia",
  "040": "Austria", "044": "Bahamas", "048": "Bahrain", "050": "Bangladesh",
  "051": "Armenia", "052": "Barbados", "056": "Belgium", "064": "Bhutan",
  "068": "Bolivia", "070": "Bosnia and Herzegovina", "072": "Botswana",
  "076": "Brazil", "084": "Belize", "090": "Solomon Islands", "096": "Brunei",
  "100": "Bulgaria", "104": "Myanmar (Burma)", "108": "Burundi", "112": "Belarus",
  "116": "Cambodia", "120": "Cameroon", "124": "Canada", "132": "Cabo Verde",
  "140": "Central African Republic", "144": "Sri Lanka", "148": "Chad",
  "152": "Chile", "156": "China", "158": "Taiwan", "162": "Christmas Island",
  "170": "Colombia", "174": "Comoros", "178": "Congo (Brazzaville)",
  "180": "Congo (Kinshasa)", "184": "Cook Islands", "188": "Costa Rica",
  "191": "Croatia", "192": "Cuba", "196": "Cyprus", "203": "Czechia",
  "204": "Benin", "208": "Denmark", "212": "Dominica",
  "214": "Dominican Republic", "218": "Ecuador", "222": "El Salvador",
  "226": "Equatorial Guinea", "231": "Ethiopia", "232": "Eritrea",
  "233": "Estonia", "242": "Fiji", "246": "Finland", "250": "France",
  "254": "French Guiana", "258": "French Polynesia", "266": "Gabon",
  "268": "Georgia", "270": "Gambia", "275": "Palestine", "276": "Germany",
  "288": "Ghana", "300": "Greece", "308": "Grenada", "320": "Guatemala",
  "324": "Guinea", "328": "Guyana", "332": "Haiti", "336": "Vatican City",
  "340": "Honduras", "344": "Hong Kong", "348": "Hungary", "352": "Iceland",
  "356": "India", "360": "Indonesia", "364": "Iran", "368": "Iraq",
  "372": "Ireland", "376": "Israel", "380": "Italy", "384": "Cote d'Ivoire",
  "388": "Jamaica", "392": "Japan", "398": "Kazakhstan", "400": "Jordan",
  "404": "Kenya", "408": "North Korea", "410": "South Korea", "414": "Kuwait",
  "417": "Kyrgyzstan", "418": "Laos", "422": "Lebanon", "426": "Lesotho",
  "428": "Latvia", "430": "Liberia", "434": "Libya", "440": "Lithuania",
  "442": "Luxembourg", "446": "Macao", "450": "Madagascar", "454": "Malawi",
  "458": "Malaysia", "462": "Maldives", "466": "Mali", "470": "Malta",
  "478": "Mauritania", "480": "Mauritius", "484": "Mexico", "492": "Monaco",
  "496": "Mongolia", "498": "Moldova", "499": "Montenegro", "504": "Morocco",
  "508": "Mozambique", "512": "Oman", "516": "Namibia", "524": "Nepal",
  "528": "Netherlands", "540": "New Caledonia", "554": "New Zealand",
  "558": "Nicaragua", "562": "Niger", "566": "Nigeria", "578": "Norway",
  "586": "Pakistan", "591": "Panama", "598": "Papua New Guinea",
  "600": "Paraguay", "604": "Peru", "608": "Philippines", "616": "Poland",
  "620": "Portugal", "624": "Guinea-Bissau", "626": "Timor-Leste",
  "630": "Puerto Rico", "634": "Qatar", "642": "Romania", "643": "Russia",
  "646": "Rwanda", "659": "Saint Kitts and Nevis", "662": "Saint Lucia",
  "670": "Saint Vincent and the Grenadines", "674": "San Marino",
  "678": "Sao Tome and Principe", "682": "Saudi Arabia", "686": "Senegal",
  "688": "Serbia", "690": "Seychelles", "694": "Sierra Leone",
  "702": "Singapore", "703": "Slovakia", "704": "Vietnam", "705": "Slovenia",
  "706": "Somalia", "710": "South Africa", "716": "Zimbabwe", "724": "Spain",
  "728": "South Sudan", "729": "Sudan", "740": "Suriname", "748": "Eswatini",
  "752": "Sweden", "756": "Switzerland", "760": "Syria", "762": "Tajikistan",
  "764": "Thailand", "768": "Togo", "776": "Tonga",
  "780": "Trinidad and Tobago", "784": "United Arab Emirates",
  "788": "Tunisia", "792": "Turkey", "795": "Turkmenistan", "798": "Tuvalu",
  "800": "Uganda", "804": "Ukraine", "807": "North Macedonia", "818": "Egypt",
  "826": "United Kingdom", "834": "Tanzania", "840": "United States",
  "854": "Burkina Faso", "858": "Uruguay", "860": "Uzbekistan",
  "862": "Venezuela", "882": "Samoa", "887": "Yemen", "894": "Zambia",
};

/**
 * Resolves a Google Ads geographic_view.country_criterion_id (as string or
 * number) to a readable country name. Falls back to the raw ID if unknown.
 */
export function resolveCountryName(criterionId) {
  if (criterionId === null || criterionId === undefined) return "Unknown";
  const raw = String(criterionId).trim();
  if (!raw) return "Unknown";

  // Criterion ID = "2" + 3-digit ISO numeric code
  const isoCode = raw.length === 4 && raw.startsWith("2") ? raw.slice(1) : null;
  if (isoCode && ISO_NUMERIC_TO_COUNTRY[isoCode]) {
    return ISO_NUMERIC_TO_COUNTRY[isoCode];
  }

  // Unknown/unmapped ID — show raw value so it's still visible, not hidden
  return `Unknown (${raw})`;
}
