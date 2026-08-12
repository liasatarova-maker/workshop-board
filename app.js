const SUPABASE_URL='https://noexqgtatuafpcytkout.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_M-7Rz3leG_KBW96bAkfjoQ_RIatteZu';
const ORDERS_ENDPOINT=`${SUPABASE_URL}/rest/v1/orders`;
const STORAGE_ENDPOINT=`${SUPABASE_URL}/storage/v1/object`;

const newOrdersElement=document.querySelector('#newOrders');
const completedOrdersElement=document.querySelector('#completedOrders');
const newEmptyElement=document.querySelector('#newEmpty');
const completedEmptyElement=document.querySelector('#completedEmpty');
const newCountElement=document.querySelector('#newCount');
const completedCountElement=document.querySelector('#completedCount');
const connectionStatusElement=document.querySelector('#connectionStatus');
const newOrderTemplate=document.querySelector('#newOrderTemplate');
const completedOrderTemplate=document.querySelector('#completedOrderTemplate');
const clearCompletedButton=document.querySelector('#clearCompletedButton');
const deadlineFilter=document.querySelector('#deadlineFilter');
const paginationElement=document.querySelector('#pagination');

const imageModal=document.querySelector('#imageModal');
const imageModalContent=document.querySelector('#imageModalContent');
const editModal=document.querySelector('#editModal');
const editForm=document.querySelector('#editForm');
const editOrderNumber=document.querySelector('#editOrderNumber');
const editOrderTitle=document.querySelector('#editOrderTitle');
const editCancelButton=document.querySelector('#editCancelButton');
const editError=document.querySelector('#editError');

let refreshTimer=null;
let requestInProgress=false;
let editedOrderNumber=null;
let allOrders=[];
let currentPage=1;
const ORDERS_PER_PAGE=6;

function getHeaders(extraHeaders={}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type':'application/json',
    ...extraHeaders
  };
}

function formatDateTime(value){
  if(!value) return 'Время не указано';
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return 'Время не указано';
  return new Intl.DateTimeFormat('ru-RU',{
    day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit'
  }).format(date);
}

function formatDeadline(value){
  if(!value) return 'не указана';
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return 'не указана';
  return new Intl.DateTimeFormat('ru-RU',{
    day:'2-digit',month:'2-digit',year:'2-digit'
  }).format(date);
}

function setConnectionStatus(message,isError=false){
  connectionStatusElement.textContent=message;
  connectionStatusElement.classList.toggle('is-error',isError);
}

function openImageModal(imageUrl){
  if(!imageUrl) return;
  imageModalContent.src=imageUrl;
  imageModal.hidden=false;
  document.body.classList.add('modal-open');
}

function closeImageModal(){
  imageModal.hidden=true;
  imageModalContent.removeAttribute('src');
  document.body.classList.remove('modal-open');
}

function openEditModal(order){
  editedOrderNumber=order.order_number;
  editOrderNumber.value=order.order_number||'';
  editOrderTitle.value=order.title||'';
  editError.hidden=true;
  editError.textContent='';
  editModal.hidden=false;
  document.body.classList.add('modal-open');
  editOrderNumber.focus();
}

function closeEditModal(){
  editModal.hidden=true;
  editedOrderNumber=null;
  editForm.reset();
  editError.hidden=true;
  document.body.classList.remove('modal-open');
}

function createOrderCard(order,completed){
  const template=completed?completedOrderTemplate:newOrderTemplate;
  const card=template.content.firstElementChild.cloneNode(true);

  card.querySelector('.order-number').textContent=`Заказ №${order.order_number||'—'}`;
  card.querySelector('.order-title').textContent=order.title||'Без названия';

  if(completed){
    const shown=order.completed_at||order.created_at;
    card.querySelector('.order-time').textContent=`Завершён: ${formatDateTime(shown)}`;
    card.querySelector('.order-customer').textContent=`Заказчик: ${order.customer||'не указан'}`;

    const thumbnail=card.querySelector('.completed-thumbnail');
    const thumbnailImage=card.querySelector('.completed-thumbnail__image');
    const placeholder=card.querySelector('.completed-thumbnail__placeholder');

    if(order.image_url){
      thumbnailImage.src=order.image_url;
      thumbnailImage.alt=`Изображение заказа №${order.order_number||''}`;
      thumbnail.classList.add('has-image');
      placeholder.hidden=true;
      thumbnail.addEventListener('click',()=>openImageModal(order.image_url));
    }else{
      thumbnail.disabled=true;
      thumbnail.setAttribute('aria-label','Изображение не добавлено');
    }
    return card;
  }

  card.querySelector('.order-created').textContent=`Создан: ${formatDateTime(order.created_at)}`;
  card.querySelector('.order-dimensions').textContent=`Размер: ${order.dimensions||'не указан'}`;
  card.querySelector('.order-customer').textContent=`Заказчик: ${order.customer||'не указан'}`;
  card.querySelector('.order-deadline').textContent=`Дата сдачи: ${formatDeadline(order.deadline)}`;

  const thumbnail=card.querySelector('.order-thumbnail');
  const thumbnailImage=card.querySelector('.order-thumbnail__image');
  const placeholder=card.querySelector('.order-thumbnail__placeholder');

  if(order.image_url){
    thumbnailImage.src=order.image_url;
    thumbnailImage.alt=`Изображение заказа №${order.order_number||''}`;
    thumbnail.classList.add('has-image');
    placeholder.hidden=true;
    thumbnail.addEventListener('click',()=>openImageModal(order.image_url));
  }else{
    thumbnail.disabled=true;
    thumbnail.setAttribute('aria-label','Изображение не добавлено');
  }

  const editButton=card.querySelector('.edit-button');
  editButton.addEventListener('click',()=>openEditModal(order));

  const deleteButton=card.querySelector('.delete-order-button');
  deleteButton.addEventListener('click',()=>deleteOrder(order,deleteButton));

  const completeButton=card.querySelector('.complete-button');
  completeButton.addEventListener('click',()=>completeOrder(order.order_number,completeButton));

  return card;
}

function isNearDeadline(order){
  if(!order.deadline) return false;
  const deadline=new Date(order.deadline);
  if(Number.isNaN(deadline.getTime())) return false;
  const now=new Date();
  const end=new Date(now);
  end.setDate(end.getDate()+2);
  end.setHours(23,59,59,999);
  return deadline<=end;
}

function renderPagination(pageCount){
  paginationElement.replaceChildren();
  if(pageCount<=1) return;
  for(let page=1;page<=pageCount;page+=1){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=String(page);
    button.classList.toggle('is-active',page===currentPage);
    button.setAttribute('aria-label',`Страница ${page}`);
    button.addEventListener('click',()=>{currentPage=page;renderOrders(allOrders);});
    paginationElement.appendChild(button);
  }
}

function renderOrders(orders){
  allOrders=orders;
  let newOrders=orders.filter((order)=>order.status==='new');
  const completedOrders=orders.filter((order)=>order.status==='completed');
  if(deadlineFilter.checked) newOrders=newOrders.filter(isNearDeadline);

  const pageCount=Math.max(1,Math.ceil(newOrders.length/ORDERS_PER_PAGE));
  currentPage=Math.min(currentPage,pageCount);
  const start=(currentPage-1)*ORDERS_PER_PAGE;
  const visibleNewOrders=newOrders.slice(start,start+ORDERS_PER_PAGE);

  newOrdersElement.replaceChildren();
  completedOrdersElement.replaceChildren();
  visibleNewOrders.forEach((order)=>newOrdersElement.appendChild(createOrderCard(order,false)));
  completedOrders.forEach((order)=>completedOrdersElement.appendChild(createOrderCard(order,true)));

  newCountElement.textContent=String(newOrders.length);
  completedCountElement.textContent=String(completedOrders.length);
  newEmptyElement.hidden=newOrders.length>0;
  completedEmptyElement.hidden=completedOrders.length>0;
  renderPagination(pageCount);
}

async function loadOrders(){
  if(requestInProgress) return;
  requestInProgress=true;

  try{
    const query=new URLSearchParams({
      select:'order_number,title,customer,status,created_at,completed_at,deadline,dimensions,image_url,image_path',
      order:'created_at.desc'
    });

    const response=await fetch(`${ORDERS_ENDPOINT}?${query}`,{
      headers:getHeaders(),
      cache:'no-store'
    });

    if(!response.ok){
      const message=await response.text();
      throw new Error(`Supabase ${response.status}: ${message||response.statusText}`);
    }

    renderOrders(await response.json());
    setConnectionStatus(`Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`);
  }catch(error){
    console.error(error);
    setConnectionStatus('Ошибка подключения к Supabase',true);
  }finally{
    requestInProgress=false;
  }
}

async function completeOrder(orderNumber,button){
  if(!orderNumber) return;

  const confirmed=window.confirm(
    `Перенести заказ №${orderNumber} в завершённые?`
  );
  if(!confirmed) return;

  button.disabled=true;
  button.textContent='Сохраняю…';

  try{
    const response=await fetch(
      `${ORDERS_ENDPOINT}?order_number=eq.${encodeURIComponent(orderNumber)}`,
      {
        method:'PATCH',
        headers:getHeaders({Prefer:'return=representation'}),
        body:JSON.stringify({
          status:'completed',
          completed_at:new Date().toISOString()
        })
      }
    );

    if(!response.ok){
      const message=await response.text();
      throw new Error(`Supabase ${response.status}: ${message||response.statusText}`);
    }

    await loadOrders();
  }catch(error){
    console.error(error);
    button.disabled=false;
    button.textContent='Готово';
    setConnectionStatus('Не удалось завершить заказ',true);
  }
}

async function saveEditedOrder(event){
  event.preventDefault();
  if(!editedOrderNumber) return;

  const newNumber=editOrderNumber.value.trim();
  const newTitle=editOrderTitle.value.trim();

  if(!newNumber||!newTitle){
    editError.textContent='Заполните номер заказа и название.';
    editError.hidden=false;
    return;
  }

  const saveButton=editForm.querySelector('.edit-save');
  saveButton.disabled=true;
  saveButton.textContent='Сохраняю…';

  try{
    const response=await fetch(
      `${ORDERS_ENDPOINT}?order_number=eq.${encodeURIComponent(editedOrderNumber)}`,
      {
        method:'PATCH',
        headers:getHeaders({Prefer:'return=representation'}),
        body:JSON.stringify({
          order_number:newNumber,
          title:newTitle
        })
      }
    );

    if(!response.ok){
      const message=await response.text();
      throw new Error(`Supabase ${response.status}: ${message||response.statusText}`);
    }

    closeEditModal();
    await loadOrders();
  }catch(error){
    console.error(error);
    editError.textContent=error.message.includes('duplicate')
      ? 'Заказ с таким номером уже существует.'
      : 'Не удалось сохранить изменения.';
    editError.hidden=false;
  }finally{
    saveButton.disabled=false;
    saveButton.textContent='Сохранить';
  }
}

async function deleteStorageObject(path){
  if(!path) return;

  const encodedPath=String(path)
    .split('/')
    .map((part)=>encodeURIComponent(part))
    .join('/');

  const response=await fetch(
    `${STORAGE_ENDPOINT}/order-images/${encodedPath}`,
    {
      method:'DELETE',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    }
  );

  if(!response.ok&&response.status!==404){
    const message=await response.text();
    throw new Error(`Storage ${response.status}: ${message||response.statusText}`);
  }
}

async function deleteOrder(order,button){
  if(!order?.order_number) return;

  const confirmed=window.confirm(
    `Удалить заказ №${order.order_number}? Это действие нельзя отменить.`
  );
  if(!confirmed) return;

  button.disabled=true;

  try{
    if(order.image_path){
      await deleteStorageObject(order.image_path);
    }

    const response=await fetch(
      `${ORDERS_ENDPOINT}?order_number=eq.${encodeURIComponent(order.order_number)}`,
      {
        method:'DELETE',
        headers:getHeaders({Prefer:'return=minimal'})
      }
    );

    if(!response.ok){
      const message=await response.text();
      throw new Error(`Supabase ${response.status}: ${message||response.statusText}`);
    }

    await loadOrders();
  }catch(error){
    console.error(error);
    button.disabled=false;
    setConnectionStatus('Не удалось удалить заказ',true);
  }
}

async function clearCompletedOrders(){
  const confirmed=window.confirm(
    'Удалить все завершённые заказы? Новые заказы останутся без изменений.'
  );
  if(!confirmed) return;

  clearCompletedButton.disabled=true;
  const originalText=clearCompletedButton.textContent;
  clearCompletedButton.textContent='Очищаю…';

  try{
    const selectQuery=new URLSearchParams({
      select:'image_path',
      status:'eq.completed'
    });

    const listResponse=await fetch(`${ORDERS_ENDPOINT}?${selectQuery}`,{
      headers:getHeaders(),
      cache:'no-store'
    });

    if(!listResponse.ok){
      const message=await listResponse.text();
      throw new Error(`Supabase ${listResponse.status}: ${message||listResponse.statusText}`);
    }

    const completedRows=await listResponse.json();
    await Promise.all(
      completedRows
        .map((row)=>row.image_path)
        .filter(Boolean)
        .map((path)=>deleteStorageObject(path))
    );

    const response=await fetch(
      `${ORDERS_ENDPOINT}?status=eq.completed`,
      {
        method:'DELETE',
        headers:getHeaders({Prefer:'return=minimal'})
      }
    );

    if(!response.ok){
      const message=await response.text();
      throw new Error(`Supabase ${response.status}: ${message||response.statusText}`);
    }

    await loadOrders();
  }catch(error){
    console.error(error);
    setConnectionStatus('Не удалось очистить завершённые заказы',true);
  }finally{
    clearCompletedButton.disabled=false;
    clearCompletedButton.textContent=originalText;
  }
}

function startAutoRefresh(){
  clearInterval(refreshTimer);
  refreshTimer=setInterval(loadOrders,10000);
}

imageModal.addEventListener('click',(event)=>{
  if(event.target===imageModal) closeImageModal();
});

editModal.addEventListener('click',(event)=>{
  if(event.target===editModal) closeEditModal();
});

editCancelButton.addEventListener('click',closeEditModal);
editForm.addEventListener('submit',saveEditedOrder);
clearCompletedButton.addEventListener('click',clearCompletedOrders);
deadlineFilter.addEventListener('change',()=>{currentPage=1;renderOrders(allOrders);});

document.addEventListener('keydown',(event)=>{
  if(event.key!=='Escape') return;
  if(!imageModal.hidden) closeImageModal();
  if(!editModal.hidden) closeEditModal();
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden) clearInterval(refreshTimer);
  else {
    loadOrders();
    startAutoRefresh();
  }
});

loadOrders();
startAutoRefresh();
