/* =========================================================
   RepreZentbiz — логіка замовлення
   ---------------------------------------------------------
   ВАЖЛИВО: тут більше НЕМАЄ токена Telegram.
   Раніше BOT_TOKEN лежав прямо в цьому файлі, а файл
   віддається кожному відвідувачу — будь-хто міг заволодіти
   ботом. Тепер заявка йде тільки на Make, а Make сам шле
   тобі повідомлення в Telegram (токен зберігається там).

   Що зробити в Make після заміни файлів:
   1. Відкрити наявний сценарій із твоїм вебхуком.
   2. Після модуля Webhooks додати модуль Telegram Bot →
      Send a Text Message.
   3. Chat ID: 598331739. Текст — з полів вебхука.
   4. Старий токен у BotFather → /revoke, отримати новий,
      і саме новий вписати в Make.
   ========================================================= */

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/sce7duz8lqxv4yink90d5am4d4ntaj3k";

/* Твій ОСОБИСТИЙ нік у Telegram, без @ — наприклад "anton_lviv".
   Поки тут порожньо, кнопки ведуть на телефон.

   Чому не на @RepreZentbiz_bot: бот нікого не слухає. У нього
   немає ні коду, ні polling, ні webhook — він лише адреса, куди
   сайт слав повідомлення. Клієнт напише боту і не отримає нічого,
   а ти цих повідомлень навіть не побачиш. Поверни сюди бота
   тоді, коли він справді запрацює. */
const CONTACT_TG = "";

/* Комплекти: фіксована ціна за день замість суми позицій */
const PACKS = {
  "Тренінг":    { price: 850,  items: ["Проектор", "Екран для проектора", "Фліпчарт"] },
  "Корпоратив": { price: 1600, items: ["Проектор", "Екран для проектора", "Акустична колонка", "Мікрофон", "Ресівер"] },
  "Виступ":     { price: 1250, items: ["Акустична колонка", "Мікрофон", "Ресівер", "Каркас для банерів"] }
};

document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('orderForm');
  const totalEl  = document.getElementById('total');
  const daysLine = document.getElementById('daysLine');
  const dateHint = document.getElementById('dateHint');
  const fromEl   = document.getElementById('date-from');
  const toEl     = document.getElementById('date-to');
  const phoneEl  = document.getElementById('phone');
  const packLine = document.getElementById('packLine');

  if (!form) return;

  let activePack = null;   // назва обраного комплекту або null

  /* ---------- дати ---------- */
  const todayStr = new Date().toISOString().split('T')[0];
  fromEl.value = todayStr; fromEl.min = todayStr;
  toEl.value   = todayStr; toEl.min   = todayStr;

  function rentalDays() {
    const a = new Date(fromEl.value + 'T12:00:00');
    const b = new Date(toEl.value   + 'T12:00:00');
    if (isNaN(a) || isNaN(b)) return 1;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }

  function syncDates() {
    toEl.min = fromEl.value;
    if (toEl.value < fromEl.value) toEl.value = fromEl.value;
    const d = rentalDays();
    dateHint.textContent = d === 1
      ? 'Оренда на 1 день'
      : `Оренда на ${d} ${d < 5 ? 'дні' : 'днів'} — ціна множиться на кількість днів`;
  }

  /* ---------- телефон ---------- */
  phoneEl.addEventListener('input', () => {
    if (!phoneEl.value.startsWith('+380')) phoneEl.value = '+380';
    const digits = phoneEl.value.substring(4).replace(/\D/g, '');
    phoneEl.value = '+380' + digits.substring(0, 9);
  });

  /* ---------- наявність на обрані дати ---------- */
  /* Дані беруться з Firebase (firebase.js). Якщо він мовчить,
     функція повертає null — тоді нічого не показуємо і нічого
     не блокуємо: краще прийняти заявку й передзвонити, ніж
     відмовити через технічний збій. */
  function freeFor(chk){
    if(!window.availability || !window.availability.ready) return null;
    const [from,to] = [fromEl.value, toEl.value];
    if(!from || !to) return null;
    return window.availability.free(chk.dataset.name, from, to);
  }

  function paintStock(){
    allChk().forEach(chk=>{
      const row = chk.closest('.item-row');
      let tag = row.querySelector('.stock-tag');
      const free = freeFor(chk);
      if(free === null){ if(tag) tag.remove(); row.classList.remove('taken'); return; }
      if(!tag){
        tag = document.createElement('span');
        tag.className = 'stock-tag';
        row.querySelector('label').append(tag);
      }
      if(free <= 0){
        tag.textContent = 'зайнято на ці дати';
        tag.dataset.state = 'full';
        row.classList.add('taken');
        if(chk.checked){ chk.checked = false; }
      }else{
        tag.textContent = `вільно ${free}`;
        tag.dataset.state = free === 1 ? 'low' : 'ok';
        row.classList.remove('taken');
        const qty = row.querySelector('.item-qty');
        if(qty && Number(qty.value) > free) qty.value = free;
        if(qty) qty.max = free;
      }
    });
  }

  /* ---------- допоміжне ---------- */
  const allChk = () => Array.from(form.querySelectorAll('.item-chk'));
  const chkByName = name => allChk().find(c => c.dataset.name === name);
  const qtyOf = chk => parseInt(chk.closest('.item-row').querySelector('.item-qty').value) || 1;

  function checkedNames() {
    return allChk().filter(c => c.checked).map(c => c.dataset.name).sort();
  }

  /* Комплект дійсний, лише поки набір позицій точно збігається,
     а кількість кожної — одна штука. */
  function packStillValid() {
    if (!activePack) return false;
    const need = [...PACKS[activePack].items].sort();
    const have = checkedNames();
    if (need.length !== have.length) return false;
    if (!need.every((n, i) => n === have[i])) return false;
    return allChk().filter(c => c.checked).every(c => qtyOf(c) === 1);
  }

  /* ---------- підрахунок ---------- */
  /* Не даємо ввести більше, ніж є на складі:
     інакше браузер мовчки блокує відправку форми через max. */
  function clampQty() {
    form.querySelectorAll('.item-qty').forEach(q => {
      const max = parseInt(q.max) || 99;
      const v = parseInt(q.value);
      if (isNaN(v) || v < 1) q.value = 1;
      else if (v > max) q.value = max;
    });
  }

  function calculateTotal() {
    paintStock();
    clampQty();
    const days = rentalDays();
    if (activePack && !packStillValid()) activePack = null;

    let total = 0;
    if (activePack) {
      total = PACKS[activePack].price * days;
      packLine.textContent = `Комплект «${activePack}» — ${PACKS[activePack].price} грн/день замість поштучної ціни`;
      packLine.classList.add('show');
    } else {
      packLine.classList.remove('show');
      allChk().forEach(chk => {
        if (!chk.checked) return;
        const price = parseInt(chk.dataset.price) || 0;
        const qty   = qtyOf(chk);
        // Папір — витратний матеріал, за пачку, не за день
        total += chk.dataset.once ? price * qty : price * qty * days;
      });
    }

    allChk().forEach(chk => chk.closest('.item-row').classList.toggle('on', chk.checked));

    daysLine.textContent = days === 1 ? 'За 1 день' : `За ${days} ${days < 5 ? 'дні' : 'днів'}`;
    totalEl.textContent = total;
    return total;
  }

  /* ---------- комплекти ---------- */
  document.querySelectorAll('.pack .go').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.pack;
      allChk().forEach(c => {
        c.checked = false;
        c.closest('.item-row').querySelector('.item-qty').value = 1;
      });
      PACKS[name].items.forEach(itemName => {
        const c = chkByName(itemName);
        if (c) c.checked = true;
      });
      activePack = name;
      calculateTotal();
      document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- події форми ---------- */
  form.addEventListener('input', e => {
    if (e.target === fromEl || e.target === toEl) syncDates();
    calculateTotal();
  });
  form.addEventListener('change', calculateTotal);

  /* ---------- відправка ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const chosen = allChk().filter(c => c.checked);
    if (!chosen.length) {
      alert('Оберіть хоча б одну позицію або готовий комплект.');
      return;
    }

    const days  = rentalDays();
    const total = calculateTotal();
    const items = chosen.map(c => {
      const q = qtyOf(c);
      return q > 1 ? `${c.dataset.name} ×${q}` : c.dataset.name;
    });
    // Той самий перелік, але структуровано — для Firebase
    const itemList = chosen.map(c => ({ name: c.dataset.name, qty: qtyOf(c) }));

    const payload = {
      name:    document.getElementById('name').value.trim(),
      phone:   phoneEl.value,
      date:    fromEl.value,                 // сумісно зі старою таблицею
      date_to: toEl.value,
      days:    days,
      pack:    activePack || '—',
      items:   items.join(', '),
      total:   String(total),
      details: document.getElementById('details').value.trim() || '—'
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Надсилаємо…';

    try {
      // Заявка йде двома шляхами одразу: у Make (таблиця + Telegram)
      // і у Firebase (пульт із календарем зайнятості).
      // Firebase — найкраще зусилля: якщо він мовчить, замовлення
      // все одно прийняте, бо Make спрацював.
      const [res] = await Promise.all([
        fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }),
        (window.saveBooking ? window.saveBooking({ ...payload, itemList }) : Promise.resolve(false))
      ]);
      if (!res.ok) throw new Error('bad response');

      // Далі — окрема сторінка подяки. Вона дає нормальну адресу
      // /thanks/, за якою можна рахувати конверсію в аналітиці.
      try{
        sessionStorage.setItem('rz_order', JSON.stringify({
          items, total, days, pack: activePack || '',
          from: payload.date, to: payload.date_to
        }));
      }catch(_){}
      window.location.href = '/thanks/';

    } catch (err) {
      alert('Не вдалося надіслати. Перевірте зв’язок або зателефонуйте: +38 093 130 78 83');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Забронювати';
    }
  });

  /* ---------- швидкий контакт ---------- */
  const ask = document.getElementById('askTg');
  const floatLink = document.getElementById('tgFloatLink');
  if (CONTACT_TG) {
    const url = 'https://t.me/' + CONTACT_TG + '?text=' +
      encodeURIComponent('Вітаю! Хочу дізнатись, чи вільне обладнання на дату ');
    ask.href = url; ask.target = '_blank'; ask.rel = 'noopener';
    ask.textContent = 'Написати у Telegram';
    floatLink.href = 'https://t.me/' + CONTACT_TG;
    floatLink.target = '_blank'; floatLink.rel = 'noopener';
  }

  document.addEventListener('availability-updated', calculateTotal);

  syncDates();
  calculateTotal();
});
