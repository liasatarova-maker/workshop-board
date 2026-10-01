(()=>{
  const enableButton=document.querySelector('#notificationEnable');
  if(!enableButton) return;

  const STORAGE_KEY='luxprint-known-order-keys-v1';
  let initialized=false;
  let knownKeys=new Set();

  function orderKey(order){return String(order?.order_number||'')+'|'+String(order?.created_at||'');}

  function playSignal(){
    try{
      const audio=new Audio('notification.mp3');
      audio.volume=0.85;
      audio.play().catch((error)=>console.warn('Notification sound blocked',error));
    }catch(error){console.warn('Notification sound error',error);}
  }

  function notifyOrder(order){
    // FCM already provides the visual notification. While the dashboard is
    // open we only play LuxPrint's custom sound, avoiding a duplicate popup.
    if(Notification.permission!=='granted') return;
    playSignal();
  }

  function saveKnown(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...knownKeys].slice(-1000)));}catch(_){}}
  function processOrders(orders){
    const currentNew=(orders||[]).filter((order)=>order.status==='new');
    if(!initialized){
      try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');knownKeys=new Set(Array.isArray(saved)?saved:[]);}catch(_){knownKeys=new Set();}
      currentNew.forEach((order)=>knownKeys.add(orderKey(order))); initialized=true; saveKnown(); return;
    }
    const fresh=currentNew.filter((order)=>!knownKeys.has(orderKey(order)));
    currentNew.forEach((order)=>knownKeys.add(orderKey(order))); saveKnown(); fresh.slice().reverse().forEach(notifyOrder);
  }

  const originalRenderOrders=window.renderOrders;
  window.renderOrders=function(orders){originalRenderOrders(orders);processOrders(orders);};
})();