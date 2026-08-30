/* RepreZentbiz — візуальні ефекти.
   Поява блоків при прокрутці та нахил карток за курсором.
   Логіки замовлення тут немає — вона в script.js. */

/* Поява при прокрутці */
(function(){
  /* ---------- тема ---------- */
  /* Спершу дивимось на збережений вибір, потім на системну
     тему пристрою. Обгортаємо в try, бо в деяких режимах
     приватного перегляду сховище кидає помилку. */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('rz_theme'); } catch(e){}
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (saved === 'light' || (saved === null && prefersLight)) root.classList.add('light');

  var tb = document.getElementById('themeBtn');
  function paintBtn(){
    if(!tb) return;
    var light = root.classList.contains('light');
    tb.textContent = light ? '☀' : '☾';
    tb.setAttribute('aria-label', light ? 'Увімкнути темну тему' : 'Увімкнути світлу тему');
  }
  paintBtn();
  if (tb) tb.addEventListener('click', function(){
    root.classList.toggle('light');
    try { localStorage.setItem('rz_theme', root.classList.contains('light') ? 'light' : 'dark'); } catch(e){}
    paintBtn();
  });

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.rise');
  if (motion || !('IntersectionObserver' in window)) {
    els.forEach(function(e){ e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(list){
      list.forEach(function(en, i){
        if (en.isIntersecting) {
          setTimeout(function(){ en.target.classList.add('in'); }, i * 55);
          io.unobserve(en.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    els.forEach(function(e){ io.observe(e); });
  }

  /* Нахил карток за курсором — тільки на пристроях з мишею */
  if (!motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.unit, .pack').forEach(function(card){
      card.addEventListener('pointermove', function(ev){
        var r = card.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width - .5;
        var y = (ev.clientY - r.top) / r.height - .5;
        card.style.transform =
          'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' +
          (-y * 7).toFixed(2) + 'deg) translateY(-5px)';
      });
      card.addEventListener('pointerleave', function(){ card.style.transform = ''; });
    });
  }
})();
