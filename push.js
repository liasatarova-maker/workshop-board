(()=> {
  const button=document.querySelector('#notificationEnable');
  const DISABLED_KEY='luxprint-push-disabled';
  const SUPABASE_URL='https://noexqgtatuafpcytkout.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_M-7Rz3leG_KBW96bAkfjoQ_RIatteZu';
  if(!button || !('serviceWorker' in navigator)) return;

  async function saveToken(token){
    if(!token) return;
    const headers={'Content-Type':'application/json'};
    if(SUPABASE_ANON_KEY){
      headers.apikey=SUPABASE_ANON_KEY;
    }
    const response=await fetch(SUPABASE_URL+'/functions/v1/register-push-token',{
      method:'POST',
      headers,
      body:JSON.stringify({token,source:'test-tablo'})
    });
    if(!response.ok){ const details=await response.text(); throw new Error('Push token save failed: '+response.status+' '+details); }
    console.info('LuxPrint push token saved');
  }

  async function registerPush(){
    if(Notification.permission!=='granted') return null;
    const registration=await navigator.serviceWorker.register('./firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const { initializeApp }=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
    const { getMessaging, getToken }=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging.js');
    const app=initializeApp(LUXPRINT_FIREBASE_CONFIG);
    const messaging=getMessaging(app);
    const token=await getToken(messaging,{
      vapidKey:LUXPRINT_VAPID_KEY,
      serviceWorkerRegistration:registration
    });
    if(token){
      localStorage.setItem('luxprint-fcm-token',token);
      console.info('LuxPrint push token registered');
      await saveToken(token);
    }
    return token;
  }

  window.luxprintRegisterPush=registerPush;

  if(Notification.permission==='granted' && localStorage.getItem(DISABLED_KEY)!=='1'){
    registerPush().catch(error=>console.warn('Push registration failed',error));
  }

  button.addEventListener('click',async()=>{
    if(Notification.permission!=='granted') return;
    const disabled=localStorage.getItem(DISABLED_KEY)==='1';
    if(disabled){
      localStorage.removeItem(DISABLED_KEY);
      try{ await registerPush(); }catch(error){ console.warn('Push registration failed',error); }
      button.textContent='Уведомления включены';
      button.classList.add('is-enabled');
    }else{
      localStorage.setItem(DISABLED_KEY,'1');
      localStorage.removeItem('luxprint-fcm-token');
      button.textContent='Уведомления выключены';
      button.classList.remove('is-enabled');
    }
  });

  if(Notification.permission==='granted' && localStorage.getItem(DISABLED_KEY)==='1'){
    button.textContent='Уведомления выключены';
    button.classList.remove('is-enabled');
  }
})();