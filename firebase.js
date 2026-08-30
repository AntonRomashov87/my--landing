/* =========================================================
   RepreZentbiz — міст до Firebase.
   Дає сайту дві речі:
     window.saveBooking(payload)  — записує заявку
     window.availability          — перевірка вільного

   ПРО ПРИВАТНІСТЬ. Заявки (колекція bookings) містять
   телефони клієнтів і закриті правилами: сайт може лише
   створювати, читати не може. Для перевірки зайнятості є
   окрема публічна колекція holds — у ній лише дати й
   позиції, жодних імен і номерів. Навіть якщо хтось
   вичитає її повністю, він побачить тільки те, що вже
   видно на календарі: коли обладнання зайняте.
   ========================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCo1vw3M59qJfcIArMeNxp0qIQiXdEmgxU",
  authDomain: "reprezent-biz.firebaseapp.com",
  projectId: "reprezent-biz",
  storageBucket: "reprezent-biz.firebasestorage.app",
  messagingSenderId: "981829800437",
  appId: "1:981829800437:web:d5c596bb7cedc17dcb50bc"
};

const ITEM_IDS = {
  "Проектор":            "proektor",
  "Акустична колонка":   "kolonka",
  "Фліпчарт":            "flipchart",
  "Мікрофон":            "mikrofon",
  "Ресівер":             "resiver",
  "Каркас для банерів":  "karkas",
  "Екран для проектора": "ekran",
  "Папір для фліпчарту": "papir"
};

/* Запас на випадок, якщо Firebase не відповість:
   тоді сайт рахує за цими числами і нічого не блокує. */
const FALLBACK_QTY = {
  proektor:2, kolonka:1, flipchart:5, mikrofon:1,
  resiver:3, karkas:1, ekran:1, papir:0
};

let db = null;
let stock = { ...FALLBACK_QTY };
let holds = [];
let ready = false;

try {
  db = getFirestore(initializeApp(firebaseConfig));
} catch (e) {
  console.warn('Firebase не піднявся:', e);
}

/* ---------- завантаження складу й зайнятості ---------- */
async function boot(){
  if(!db) return;
  try{
    const inv = await getDocs(collection(db,'inventory'));
    inv.forEach(d=>{
      const v=d.data();
      if(typeof v.qty === 'number' && !v.consumable) stock[d.id]=v.qty;
    });
  }catch(e){ console.warn('Склад:',e); }

  try{
    // Слухаємо далі: якщо хтось забронює, поки сторінка відкрита,
    // цифри оновляться без перезавантаження.
    onSnapshot(collection(db,'holds'), snap=>{
      holds = snap.docs.map(d=>d.data()).filter(h=>h && h.active !== false);
      ready = true;
      document.dispatchEvent(new CustomEvent('availability-updated'));
    }, e=>{ console.warn('Зайнятість:',e); ready=false; });
  }catch(e){ console.warn('Зайнятість:',e); }
}
boot();

/* ---------- рахунок вільного ---------- */
const addDay=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
function eachDay(a,b){const o=[];let c=a;for(let i=0;i<400&&c<=b;i++){o.push(c);c=addDay(c,1);}return o;}

function usedOn(id, day){
  let n=0;
  for(const h of holds){
    if(!h.from||!h.to) continue;
    if(day < h.from || day > h.to) continue;
    const li=(h.items||[]).find(x=>x.id===id);
    if(li) n += Number(li.qty)||0;
  }
  return n;
}

window.availability = {
  /* Чи взагалі є на що спиратися. Якщо ні — сайт нічого
     не блокує, щоб не втратити замовлення через збій. */
  get ready(){ return ready; },

  /* Скільки одиниць позиції вільно у весь проміжок дат */
  free(itemName, from, to){
    const id = ITEM_IDS[itemName];
    if(!ready || !id || !(id in stock)) return null;   // null = «не знаю»
    const total = stock[id];
    let min = total;
    for(const d of eachDay(from,to)) min = Math.min(min, total - usedOn(id,d));
    return Math.max(0, min);
  }
};

/* ---------- запис заявки ---------- */
window.saveBooking = async function (payload) {
  if(!db) return false;
  try{
    const items=(payload.itemList||[]).map(it=>({
      id: ITEM_IDS[it.name] || it.name,
      qty: it.qty
    }));

    const ref = await addDoc(collection(db,'bookings'), {
      client:    payload.name    || '',
      phone:     payload.phone   || '',
      note:      payload.details === '—' ? '' : (payload.details || ''),
      from:      payload.date,
      to:        payload.date_to,
      days:      payload.days,
      pack:      payload.pack === '—' ? '' : payload.pack,
      items, total: Number(payload.total)||0,
      status:   'draft', source:'site',
      createdAt: new Date().toISOString()
    });

    /* Публічний слід тієї ж броні — без імені й телефону.
       Ідентифікатор той самий, щоб пульт міг ним керувати. */
    try{
      await setDoc(doc(db,'holds',ref.id), {
        from: payload.date, to: payload.date_to,
        items, active: true, source:'site',
        createdAt: new Date().toISOString()
      });
    }catch(e){ console.warn('Не вдалося позначити зайнятість:',e); }

    return true;
  }catch(e){
    console.warn('Не вдалося записати заявку у Firebase:', e);
    return false;
  }
};
