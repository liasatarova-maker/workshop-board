importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_QxansNQmXsi3_S-1vhzh7Q_EH9_1fQE",
  authDomain: "tablo-1ad7f.firebaseapp.com",
  projectId: "tablo-1ad7f",
  storageBucket: "tablo-1ad7f.firebasestorage.app",
  messagingSenderId: "1063984512841",
  appId: "1:1063984512841:web:d629d87538560cbb77a498"
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage((payload)=>{
  console.log('[firebase-messaging-sw.js] Background message received',payload);
  // Notification payloads are displayed by FCM automatically in the background.
  // For data-only payloads, display the notification ourselves.
  if(payload.notification) return;
  const title=payload.data?.title || 'LuxPrint — новый заказ';
  const options={
    body:payload.data?.body || 'На табло появился новый заказ',
    icon:payload.data?.icon || undefined,
    data:{url:payload.data?.url || './'}
  };
  self.registration.showNotification(title,options);
});

self.addEventListener('notificationclick',(event)=>{
  const url=event.notification?.data?.url;
  if(!url) return;
  event.notification.close();
  event.waitUntil(clients.openWindow(url));
});
