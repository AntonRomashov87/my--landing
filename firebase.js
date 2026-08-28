/* =========================================================
   RepreZentbiz — міст до Firebase.
   Підключається як модуль ДО script.js і дає йому одну
   функцію: window.saveBooking(payload).

   Заявка лягає у колекцію bookings зі статусом "draft".
   Підтверджуєш її вже в пульті.

   Цей ключ публічний за задумом — його видно кожному, хто
   відкриє код сайту. Захист дають правила Firestore:
   з сайту можна лише СТВОРИТИ заявку, а читати й змінювати
   може тільки той, хто увійшов у пульт.
   ========================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCo1vw3M59qJfcIArMeNxp0qIQiXdEmgxU",
  authDomain: "reprezent-biz.firebaseapp.com",
  projectId: "reprezent-biz",
  storageBucket: "reprezent-biz.firebasestorage.app",
  messagingSenderId: "981829800437",
  appId: "1:981829800437:web:d5c596bb7cedc17dcb50bc"
};

/* Назва позиції у формі -> ідентифікатор на складі.
   Має збігатися з ключами в пульті, інакше зайнятість
   рахуватиметься не за тією позицією. */
const ITEM_IDS = {
  "Проектор":              "proektor",
  "Акустична колонка":     "kolonka",
  "Фліпчарт":              "flipchart",
  "Мікрофон":              "mikrofon",
  "Ресівер":               "resiver",
  "Каркас для банерів":    "karkas",
  "Екран для проектора":   "ekran",
  "Папір для фліпчарту":   "papir"
};

let db = null;
try {
  db = getFirestore(initializeApp(firebaseConfig));
} catch (e) {
  console.warn('Firebase не піднявся:', e);
}

/* script.js викликає це після відправки в Make.
   Ніколи не кидає помилку далі — якщо Firebase лежить,
   замовлення все одно вважається прийнятим. */
window.saveBooking = async function (payload) {
  if (!db) return false;
  try {
    const items = (payload.itemList || []).map(it => ({
      id:  ITEM_IDS[it.name] || it.name,
      qty: it.qty
    }));
    await addDoc(collection(db, 'bookings'), {
      client:    payload.name    || '',
      phone:     payload.phone   || '',
      note:      payload.details === '—' ? '' : (payload.details || ''),
      from:      payload.date,
      to:        payload.date_to,
      days:      payload.days,
      pack:      payload.pack === '—' ? '' : payload.pack,
      items:     items,
      total:     Number(payload.total) || 0,
      status:    'draft',
      source:    'site',
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.warn('Не вдалося записати заявку у Firebase:', e);
    return false;
  }
};
