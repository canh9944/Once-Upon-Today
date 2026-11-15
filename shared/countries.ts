export const englishMarket='US-UK';
const englishMembers=['US-UK','US','GB','GB-ENG'];
export function normalizeCountry(code:string){return englishMembers.includes(code)?englishMarket:code;}
export function countryMembers(code:string){return normalizeCountry(code)===englishMarket?englishMembers:[code];}
export function matchesCountry(actual:string,selected?:string){return !selected||selected==='all'||normalizeCountry(actual)===normalizeCountry(selected);}
const flag=(code:string)=>String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0)));
// Editorial priority by language reach; keep countries using the same language adjacent.
// All European selections precede the remaining Asian markets.
export const europeanCountryOrder=[
  'IE','ES','FR','BE','MC','DE','AT','CH','LI','PT','RU','IT','SM','VA','TR','PL','UA','RO','MD','NL','GR','CY',
  'CZ','SE','HU','BG','RS','ME','DK','FI','NO','HR','BA','SK','AL','LT','SI','LV','EE','AD','BY','MK','IS','LU','MT',
] as const;
export const countries=[
  {code:englishMarket,name:'US-UK United States United Kingdom England USA Britain English',flag:`${flag('US')} ${flag('GB')}`},
  ...europeanCountryOrder.map(code=>({code,name:code,flag:flag(code)})),
  ...['VN','JP','KR','TH'].map(code=>({code,name:code,flag:flag(code)})),
];
export function isCountryCode(code:string){return countries.some(c=>c.code===normalizeCountry(code));}
