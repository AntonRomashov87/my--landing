document.addEventListener('DOMContentLoaded', () => {
  // === 1. АВТОМАТИЧНА ДАТА (Сьогодні) ===
  const dateInput = document.getElementById('order-date');
  if (dateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    dateInput.min = formattedDate; 
  }

  // === 2. BURGER MENU ===
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger) {
    burger.addEventListener('click', () => nav.classList.toggle('show'));
  }

  // === 3. SCROLL UP BUTTON ===
  const upBtn = document.getElementById('upBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) upBtn?.classList.add('show');
    else upBtn?.classList.remove('show');
  });
  upBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // === 4. РОЗРАХУНОК ВАРТОСТІ (TOTAL) ===
  const orderForm = document.getElementById('orderForm');
  const totalEl = document.getElementById('total');

  function calculateTotal() {
    if (!orderForm || !totalEl) return;
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

  if (orderForm) {
    orderForm.addEventListener('input', calculateTotal);
    orderForm.addEventListener('change', calculateTotal);
    calculateTotal(); // Початковий розрахунок
  }

  // === 5. ВІДПРАВКА В ТЕЛЕГРАМ ===
  const BOT_TOKEN = "8488773081:AAGZOt8IBYEzO4Q5iL63agF5PvuJVxVSwvY";
  const CHAT_ID = "598331739";

  if (orderForm) {
    orderForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Отримуємо значення (використовуємо правильні ID з HTML)
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const date = document.getElementById('order-date').value; 
      const details = document.getElementById('details').value.trim();

      if (!name || !phone || !date) {
        alert('Будь ласка, заповніть ім’я, телефон та дату.');
        return;
      }

      // Збираємо список обраного
      const chosen = Array.from(orderForm.querySelectorAll('.item-chk'))
        .filter(cb => cb.checked)
        .map(cb => {
          const qtyInput = cb.closest('.item-row')?.querySelector('.item-qty');
          const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
          return `🔹 ${cb.dataset.name} (${qty} шт. × ${cb.dataset.price} грн)`;
        });

      if (chosen.length === 0) {
        alert('Виберіть хоча б одну позицію з каталогу.');
        return;
      }

      const total = totalEl.textContent || '0';

      const text = `
🆕 Нове замовлення!
👤 Ім’я: ${name}
📞 Телефон: ${phone}
📅 Дата: ${date}
-----------------------
${chosen.join('\n')}
-----------------------
💰 Сума: ${total} грн
✍ Деталі: ${details || '—'}
      `;

      // Блокуємо кнопку, щоб не тиснули двічі
      const btn = orderForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Надсилаємо...";

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: CHAT_ID, 
          text: text,
          parse_mode: "HTML" // Додав для кращого вигляду (жирний текст тощо)
        })
      })
      .then(r => r.json())
      .then(res => {
        if (res.ok) {
          alert("✅ Замовлення надіслано! Ми зателефонуємо вам.");
          orderForm.reset();
          calculateTotal();
          // Повертаємо сьогоднішню дату після очищення
          if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        } else {
          alert("❌ Помилка бота: " + (res.description || "невідома"));
        }
      })
      .catch(err => {
        console.error(err);
        alert("❌ Помилка мережі. Перевірте інтернет.");
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = "Замовити";
      });
    });
  }
});
