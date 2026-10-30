// Small, keyboard-accessible selects. The native controls remain the source of
// truth, so scene updates and automatic chapter changes share one state.
export function createQuietUI(onOpen = () => {}) {
 const controls = new Map();
 let opened = null;
 function closeAll() { opened?.close(); }
 for (const select of document.querySelectorAll('#chapter-select, #quality')) {
  const label = select.getAttribute('aria-label') || select.labels?.[0]?.textContent.replace(select.textContent, '').trim() || '選擇';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = `${select.id}-trigger`;
  trigger.className = 'sea-select';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span class="select-value"></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  // Keep the custom button outside the label: a label click must not activate
  // the visually hidden native select as well as the replacement button.
  if (select.parentElement.tagName === 'LABEL') {
   const wrapper = document.createElement('div');
   wrapper.className = 'quality-field';
   select.parentElement.before(wrapper);
   const caption = document.createElement('span');
   caption.className = 'field-label';
   caption.textContent = label;
   wrapper.append(caption, select, trigger);
   const oldLabel = document.querySelector(`label[for="${select.id}"]`);
   oldLabel?.remove();
  } else select.after(trigger);
  select.classList.add('native-select');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  const list = document.createElement('div');
  list.id = `${select.id}-options`;
  list.className = 'sea-options';
  list.hidden = true;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  trigger.setAttribute('aria-controls', list.id);
  document.body.append(list);
  let active = select.selectedIndex;
  const options = [...select.options].map((option, index) => {
   const item = document.createElement('div');
   item.id = `${select.id}-option-${index}`;
   item.className = 'sea-option';
   item.setAttribute('role', 'option');
   const parts = option.textContent.split(' · ');
   if (parts.length === 2) {
    const number = document.createElement('span');
    number.className = 'option-number'; number.textContent = parts[0];
    item.append(number, document.createTextNode(parts[1]));
   } else item.textContent = option.textContent;
   item.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') highlight(index);
   });
   item.addEventListener('click', () => choose(index));
   list.append(item);
   return item;
  });
  function sync() {
   const value = select.selectedOptions[0]?.textContent || '';
   trigger.querySelector('.select-value').textContent = value;
   trigger.setAttribute('aria-label', `${label}：${value}`);
   options.forEach((item, index) => item.setAttribute('aria-selected', String(index === select.selectedIndex)));
   if (list.hidden) active = select.selectedIndex;
  }
  function position() {
   const box = trigger.getBoundingClientRect();
   const viewport = window.visualViewport;
   const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
   const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
   const menuWidth = Math.min(Math.max(box.width, select.id === 'chapter-select' ? 218 : 150), width - 24);
   list.style.width = `${menuWidth}px`;
   const below = top + height - box.bottom - 20, above = box.top - top - 20;
   const useAbove = below < Math.min(list.scrollHeight, 240) && above > below;
   list.style.maxHeight = `${Math.max(60, useAbove ? above : below)}px`;
   list.style.left = `${Math.max(left + 12, Math.min(box.left, left + width - menuWidth - 12))}px`;
   list.style.top = `${useAbove ? box.top - list.offsetHeight - 8 : box.bottom + 8}px`;
  }
  function highlight(index) {
   active = Math.max(0, Math.min(options.length - 1, index));
   options.forEach((item, i) => item.classList.toggle('is-active', i === active));
   trigger.setAttribute('aria-activedescendant', options[active].id);
   options[active].scrollIntoView({block: 'nearest'});
  }
  function close() {
   list.hidden = true;
   trigger.setAttribute('aria-expanded', 'false');
   trigger.removeAttribute('aria-activedescendant');
   if (opened === control) opened = null;
  }
  function open() {
   closeAll(); onOpen(); sync(); opened = control;
   list.hidden = false;
   trigger.setAttribute('aria-expanded', 'true');
   position(); highlight(select.selectedIndex);
  }
  function choose(index) {
   select.selectedIndex = index;
   select.dispatchEvent(new Event('change', {bubbles: true}));
   sync(); close(); trigger.focus({preventScroll: true});
  }
  const control = {sync, close, trigger, list};
  controls.set(select.id, control);
  select.addEventListener('change', sync);
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
   const key = event.key;
   if (key === 'Tab') { close(); return; }
   if (key === 'Escape' && list.hidden) return;
   if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(key)) return;
   event.preventDefault(); event.stopPropagation();
   if (key === 'Escape') { close(); return; }
   if (list.hidden) { open(); if (key === 'Home') highlight(0); if (key === 'End') highlight(options.length - 1); return; }
   if (key === 'Enter' || key === ' ') choose(active);
   else highlight(key === 'Home' ? 0 : key === 'End' ? options.length - 1 : active + (key === 'ArrowDown' ? 1 : -1));
  });
  trigger.addEventListener('blur', close);
  window.addEventListener('resize', close);
  window.visualViewport?.addEventListener('resize', close);
  window.visualViewport?.addEventListener('scroll', close);
  sync();
 }
 document.addEventListener('pointerdown', event => {
  if (opened && !opened.trigger.contains(event.target) && !opened.list.contains(event.target)) closeAll();
 });
 // Options do not take focus away from their controlling combobox.
 document.addEventListener('pointerdown', event => {
  if (event.target.closest('.sea-options')) event.preventDefault();
 });
 document.querySelector('#settings-panel').addEventListener('scroll', closeAll);
 for (const slider of document.querySelectorAll('input[type="range"]')) {
  const paint = () => slider.style.setProperty('--range-fill', `${(slider.value - slider.min) / (slider.max - slider.min) * 100}%`);
  slider.addEventListener('input', paint); paint();
 }
 return {closeAll, sync: id => controls.get(id)?.sync()};
}
