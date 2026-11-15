export const adsenseClient=process.env.NEXT_PUBLIC_ADSENSE_CLIENT||'ca-pub-7681125837419532';
export const adsenseSlot=process.env.NEXT_PUBLIC_ADSENSE_SLOT||'9654708635';
// Enable only after editorial review and deployment of a certified consent solution.
export const adsenseEnabled=process.env.NEXT_PUBLIC_ADSENSE_ENABLED==='true'&&process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY==='true'&&/^ca-pub-\d{16}$/.test(adsenseClient)&&/^\d{1,20}$/.test(adsenseSlot);
