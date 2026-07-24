const SUPABASE_URL = 'https://noexqgtatuafpcytkout.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M-7Rz3leG_KBW96bAkfjoQ_RIatteZu';
const ORDERS_ENDPOINT = `${SUPABASE_URL}/rest/v1/orders`;

const newOrdersElement = document.querySelector('#newOrders');
const completedOrdersElement = document.querySelector('#completedOrders');
const newEmptyElement = document.querySelector('#newEmpty');
const completedEmptyElement = document.querySelector('#completedEmpty');
const newCountElement = document.querySelector('#newCount');
const completedCountElement = document.querySelector('#completedCount');
const connectionStatusElement = document.querySelector('#connectionStatus');
const newOrderTemplate = document.querySelector('#newOrderTemplate');
const completedOrderTemplate = document.querySelector('#completedOrderTemplate');

let refreshTimer = null;
let requestInProgress = false;

function getHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
}

function formatDateTime(value) {
  if (!value) return 'Время не указано';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Время не указано';

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDeadline(value) {
  if (!value) return 'не указан';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не указан';

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function setConnectionStatus(message, isError = false) {
  connectionStatusElement.textContent = message;
  connectionStatusElement.classList.toggle('is-error', isError);
}

function createOrderCard(order, completed) {
  const template = completed ? completedOrderTemplate : newOrderTemplate;
  const card = template.content.firstElementChild.cloneNode(true);

  const numberElement = card.querySelector('.order-number');
  const titleElement = card.querySelector('.order-title');
  const dimensionsElement = card.querySelector('.order-dimensions');
  const deadlineElement = card.querySelector('.order-deadline');
  const timeElement = card.querySelector('.order-time');

  numberElement.textContent = `№${order.order_number || '—'}`;
  titleElement.textContent = order.title || 'Без названия';

  if (dimensionsElement) {
    dimensionsElement.textContent = `Размер: ${order.dimensions || 'не указан'}`;
  }

  if (deadlineElement) {
    deadlineElement.textContent = `Срок сдачи: ${formatDeadline(order.deadline)}`;
  }

  const shown = completed
    ? (order.completed_at || order.created_at)
    : order.created_at;

  timeElement.textContent = completed
    ? `Завершён: ${formatDateTime(shown)}`
    : `Создан: ${formatDateTime(shown)}`;

  if (!completed) {
    const button = card.querySelector('.complete-button');
    button.addEventListener('click', () => {
      completeOrder(order.order_number, button);
    });
  }

  return card;
}

function renderOrders(orders) {
  const newOrders = orders.filter((order) => order.status === 'new');
  const completedOrders = orders.filter((order) => order.status === 'completed');

  newOrdersElement.replaceChildren();
  completedOrdersElement.replaceChildren();

  newOrders.forEach((order) => {
    newOrdersElement.appendChild(createOrderCard(order, false));
  });

  completedOrders.forEach((order) => {
    completedOrdersElement.appendChild(createOrderCard(order, true));
  });

  newCountElement.textContent = String(newOrders.length);
  completedCountElement.textContent = String(completedOrders.length);
  newEmptyElement.hidden = newOrders.length > 0;
  completedEmptyElement.hidden = completedOrders.length > 0;
}

async function loadOrders() {
  if (requestInProgress) return;
  requestInProgress = true;

  try {
    const query = new URLSearchParams({
      select: 'order_number,title,status,created_at,completed_at,dimensions,deadline',
      order: 'created_at.desc'
    });

    const response = await fetch(`${ORDERS_ENDPOINT}?${query}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Supabase ${response.status}: ${message || response.statusText}`);
    }

    const orders = await response.json();
    renderOrders(orders);
    setConnectionStatus(`Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`);
  } catch (error) {
    console.error(error);
    setConnectionStatus('Ошибка подключения к Supabase', true);
  } finally {
    requestInProgress = false;
  }
}

async function completeOrder(orderNumber, button) {
  if (!orderNumber) return;

  const confirmed = window.confirm(
    `Перенести заказ №${orderNumber} в завершённые?`
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = 'Сохраняю…';

  try {
    const response = await fetch(
      `${ORDERS_ENDPOINT}?order_number=eq.${encodeURIComponent(orderNumber)}`,
      {
        method: 'PATCH',
        headers: getHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Supabase ${response.status}: ${message || response.statusText}`);
    }

    await loadOrders();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.textContent = 'Готово';
    setConnectionStatus('Не удалось завершить заказ', true);
  }
}

function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadOrders, 10000);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(refreshTimer);
  } else {
    loadOrders();
    startAutoRefresh();
  }
});

loadOrders();
startAutoRefresh();
