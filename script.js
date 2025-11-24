// BURGER MENU
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger?.addEventListener('click', () => nav.classList.toggle('show'));

// SCROLL UP BUTTON
const upBtn = document.getElementById('upBtn');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) upBtn.classList.add('show');
  else upBtn.classList.remove('show');
});
upBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ORDER TOTAL CALCULATION
const orderForm = document.getElementById('orderForm');
const totalEl = document.getElementById('total');

function calculateTotal() {
  let total = 0;
  const checkboxes = orderForm.querySelectorAll('.item-chk');
  checkboxes.forEach(cb => {
    const price = parseInt(cb.dataset.price) || 0;
    const qtyInput = cb.closest('.item-row')?.querySelector('.item-qty');
    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    if (cb.checked) total += price * qty;
  });
  totalEl.textContent = total;
}

orderForm.addEventListener('input', calculateTotal);
orderForm.addEventListener('change', calculateTotal);
calculateTotal();

// SEND ORDER TO TELEGRAM
const BOT_TOKEN = "8488773081:AAGZOt8IBYEzO4Q5iL63agF5PvuJVxVSwvY";
const CHAT_ID = "598331739";

orderForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const name = orderForm.name.value.trim();
  const phone = orderForm.phone.value.trim();
  const date = orderForm.rentalDate.value; // ✅ виправлено
  const details = orderForm.details.value.trim();

  if (!name || !phone || !date) {
    alert('Будь ласка, заповніть ім’я, телефон та дату оренди.');
    return;
  }

  const chosen = Array.from(orderForm.querySelectorAll('.item-chk'))
    .filter(cb => cb.checked)
    .map(cb => {
      const qtyInput = cb.closest('.item-row')?.querySelector('.item-qty');
      const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      const type = cb.dataset.type || "rental";
      const unit = type === "sale" ? "грн/пачка" : "грн/доба";
      return `${cb.dataset.name} (${qty} × ${cb.dataset.price} ${unit})`;
    });

  const total = totalEl.textContent || '0';

  const text = `
🆕 Нове замовлення!
👤 Ім’я: ${name}
📞 Телефон: ${phone}
📅 Дата оренди: ${date}
📦 Обладнання: ${chosen.join(', ') || '—'}
💰 Сума: ${total} грн
✍ Деталі: ${details || '—'}
  `;

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: text })
  })
  .then(r => r.json())
  .then(res => {
    if (res.ok) {
      alert("✅ Замовлення надіслано! Дякуємо.");
      orderForm.reset();
      calculateTotal();
    } else alert("❌ Помилка: " + (res.description || "невідома"));
  })
  .catch(err => { console.error(err); alert("❌ Проблема з мережею."); });
});
