/* Expanded order editor. Loaded after app.js so the existing board logic stays untouched. */
const editOrderCustomer=document.querySelector('#editOrderCustomer');
const editOrderDimensions=document.querySelector('#editOrderDimensions');
const editOrderDeadline=document.querySelector('#editOrderDeadline');
const editOrderUrgent=document.querySelector('#editOrderUrgent');

function editDeadlineInputValue(value){
  if(!value) return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function editDeadlineFromInput(value){
  if(!value) return null;
  const [y,m,d]=value.split('-').map(Number);
  return new Date(y,m-1,d,12,0,0,0).toISOString();
}

openEditModal=function(order){
  editedOrderNumber=order.order_number;
  editOrderNumber.value=order.order_number||'';
  editOrderTitle.value=order.title||'';
  editOrderCustomer.value=order.customer||'';
  editOrderDimensions.value=order.dimensions||'';
  editOrderDeadline.value=editDeadlineInputValue(order.deadline);
  editOrderUrgent.checked=order.urgent===true;
  editError.hidden=true;
  editError.textContent='';
  editModal.hidden=false;
  document.body.classList.add('modal-open');
  editOrderNumber.focus();
};

editForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  if(!editedOrderNumber) return;

  const newNumber=editOrderNumber.value.trim();
  const newTitle=editOrderTitle.value.trim();
  const newCustomer=editOrderCustomer.value.trim();
  const newDimensions=editOrderDimensions.value.trim();
  const newDeadline=editDeadlineFromInput(editOrderDeadline.value);
  const newUrgent=editOrderUrgent.checked;

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
          title:newTitle,
          customer:newCustomer||null,
          dimensions:newDimensions||null,
          deadline:newDeadline,
          urgent:newUrgent
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
},true);
