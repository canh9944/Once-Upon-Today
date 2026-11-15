export const ACCOUNT='accounts/pub-7681125837419532';
export async function mockAdSense(input,init){
 const url=new URL(input instanceof Request?input.url:String(input));
 if(url.hostname==='oauth2.googleapis.com'&&url.pathname==='/token')return Response.json({access_token:'test-adsense-access',refresh_token:'test-refresh-token-private',expires_in:3600,scope:'https://www.googleapis.com/auth/adsense.readonly'});
 if(url.hostname!=='adsense.googleapis.com')return null;
 if(new Headers(init?.headers).get('Authorization')!=='Bearer test-adsense-access')return new Response('',{status:401});
 if(url.pathname==='/v2/'+ACCOUNT)return Response.json({name:ACCOUNT,displayName:'Test publisher',timeZone:{id:'Asia/Ho_Chi_Minh'}});
 if(url.pathname.endsWith('/customchannels'))return Response.json({customChannels:[{reportingDimensionId:'AFC:ca-pub-7681125837419532:111',displayName:'Fanpage A'},{reportingDimensionId:'AFC:ca-pub-7681125837419532:222',displayName:'Fanpage B'}]});
 if(url.pathname.endsWith('/reports:generate')){
  const dims=url.searchParams.getAll('dimensions'),dim=dims[1],date=[url.searchParams.get('startDate.year'),url.searchParams.get('startDate.month').padStart(2,'0'),url.searchParams.get('startDate.day').padStart(2,'0')].join('-');
  const metric=['PAGE_VIEWS','IMPRESSIONS','CLICKS','ESTIMATED_EARNINGS'],headers=[{name:'DATE'},{name:dim},...metric.map(name=>({name,currencyCode:name==='ESTIMATED_EARNINGS'?'USD':undefined}))];
  const rows=dim==='COUNTRY_CODE'?[['US',100,200,4,'5.50'],['GB',50,100,2,'2.25']]:dim==='PAGE_URL'?[['https://onceupontoday.site/en/posts/story-1',100,200,4,'5.50'],['https://onceupontoday.site/en/posts/story-2',50,100,2,'2.25']]:[['AFC:ca-pub-7681125837419532:111',80,120,3,'3.00'],['AFC:ca-pub-7681125837419532:222',20,30,1,'1.00']];
  return Response.json({headers,totalMatchedRows:String(rows.length),rows:rows.map(row=>({cells:[date,...row].map(value=>({value:String(value)}))})),totals:{cells:['','',150,300,6,'7.75'].map(value=>({value:String(value)}))}});
 }
 return new Response('',{status:404});
}
if(process.env.MOCK_ADSENSE==='true'){const previous=globalThis.fetch;globalThis.fetch=async(input,init)=>await mockAdSense(input,init)||previous(input,init);}
