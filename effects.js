/* RepreZentbiz — візуальні ефекти.
   Поява блоків при прокрутці та нахил карток за курсором.
   Логіки замовлення тут немає — вона в script.js. */

/* Поява при прокрутці */
(function(){
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
