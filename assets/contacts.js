(() => {
  'use strict';

  const widget = document.getElementById('contact-widget');
  if (!widget) return;
  const toggle = document.getElementById('contact-toggle');
  const chooser = document.getElementById('contact-chooser');
  const close = chooser.querySelector('.contact-close');

  function setOpen(open, restoreFocus = false) {
    chooser.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) chooser.querySelector('[data-contact]').focus();
    else if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(chooser.hidden));
  close.addEventListener('click', () => setOpen(false, true));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !chooser.hidden) {
      setOpen(false, true);
    }
  });
  document.addEventListener('click', (event) => {
    if (!widget.contains(event.target)) setOpen(false);
  });
  widget.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !widget.contains(event.relatedTarget)) setOpen(false);
  });
  chooser.querySelectorAll('[data-contact]').forEach((link) => {
    link.addEventListener('click', () => setOpen(false, true));
  });
})();
