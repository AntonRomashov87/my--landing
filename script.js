document.addEventListener('DOMContentLoaded', () => {
    const orderForm = document.getElementById('orderForm');
    const totalEl = document.getElementById('total');
    const dateInput = document.getElementById('order-date');
    const phoneInput = document.getElementById('phone');

    // 1. АВТОМАТИЧНА ДАТА
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.min = today;
    }

    // 2. МАСКА ТЕЛЕФОНУ (+380)
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            if (!phoneInput.value.startsWith('+380')) phoneInput.value = '+380';
            let numbers = phoneInput.value.substring(4).replace(/\D/g, '');
            phoneInput.value = '+380' + numbers.substring(0, 9);
        });
    }

    // 3. РОЗРАХУНОК СУМИ
    function calculateTotal() {
        if (!orderForm || !totalEl) return;
        let total = 0;
        const checkboxes = orderForm.querySelectorAll('.item-chk');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const qtyInput = cb.closest('.item-row')?.querySelector('.item-qty');
                const qty = parseInt(qtyInput?.value) || 1;
                total += (parseInt(cb.dataset.price) || 0) * qty;
            }
        });
        totalEl.textContent = total;
    }

    if (orderForm) {
        orderForm.addEventListener('input', calculateTotal);

        // 4. ВІДПРАВКА ЗАМОВЛЕННЯ
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const BOT_TOKEN = "8488773081:AAGZOt8IBYEzO4Q5iL63agF5PvuJVxVSwvY";
            const CHAT_ID = "598331739";
            const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/m293d891ub2qrulb5fdt7qp5b1h7flib";

            const name = document.getElementById('name').value.trim();
            const phone = phoneInput.value;
            const date = dateInput.value;
            const details = document.getElementById('details')?.value.trim() || "—";
            const total = totalEl.textContent;

            // Збираємо товари
            const chosenForManager = [];
            const chosenForClient = [];
            const itemsForMake = [];

            orderForm.querySelectorAll('.item-chk:checked').forEach(cb => {
                const qty = cb.closest('.item-row')?.querySelector('.item-qty')?.value || 1;
                const itemName = cb.dataset.name || "Товар";
                const price = cb.dataset.price;
                
                chosenForManager.push(`🔹 ${itemName} (${qty} шт. × ${price} грн)`);
                chosenForClient.push(`• ${itemName} — ${qty} шт.`);
                itemsForMake.push(`${itemName} (${qty} шт.)`);
            });

            if (chosenForManager.length === 0) {
                alert('Виберіть хоча б один товар!');
                return;
            }

            const btn = orderForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Надсилаємо...";

            // Готуємо дані для Make
            const dataToMake = {
                name: name,
                phone: phone,
                date: date,
                items: itemsForMake.join(', '),
                total: total,
                details: details
            };

            // ВІДПРАВКА
            const textManager = `🆕 <b>Нове замовлення!</b>\n\n👤 <b>Ім’я:</b> ${name}\n📞 <b>Телефон:</b> ${phone}\n📅 <b>Дата:</b> ${date}\n-----------------------\n${chosenForManager.join('\n')}\n-----------------------\n💰 <b>Сума: ${total} грн</b>\n✍ <b>Деталі:</b> ${details}`;

            Promise.all([
                // 1. У Телеграм
                fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: CHAT_ID, text: textManager, parse_mode: "HTML" })
                }),
                // 2. У Make (Google Таблиці)
                fetch(MAKE_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToMake)
                })
            ])
            .then(async ([resTg, resMake]) => {
                if (resTg.ok) {
                    alert("✅ Замовлення прийнято! Дані збережено в таблицю.");
                    
                    if (confirm("Бажаєте зберегти копію замовлення у свій Telegram?")) {
                        const textClient = `Мій список оренди в RepreZentbiz:\n${chosenForClient.join('\n')}\n\nЗагальна сума: ${total} грн\nДата: ${date}`;
                        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent('https://reprezentbiz.onrender.com/')} &text=${encodeURIComponent(textClient)}`;
                        window.open(tgUrl, '_blank');
                    }

                    orderForm.reset();
                    calculateTotal();
                    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                    if (phoneInput) phoneInput.value = "+380";
                }
            })
            .catch(err => {
                alert("❌ Помилка мережі. Спробуйте ще раз.");
            })
            .finally(() => {
                btn.disabled = false;
                btn.textContent = "Забронювати";
            });
        });
    }
});
