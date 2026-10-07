const SAVE_KEY = 'hofglueck-save-v1';
const EGG_PRICE = 4;
const INITIAL_STATE = {
  money: 24,
  chickens: 1,
  eggs: 0,
  sold: 0,
  feed: 100,
  water: 100,
  conveyor: false,
  layProgress: 0,
};

const state = loadGame();
const elements = {
  money: document.querySelector('#money'),
  chickenCount: document.querySelector('#chicken-count'),
  eggCount: document.querySelector('#egg-count'),
  soldCount: document.querySelector('#sold-count'),
  eggTotal: document.querySelector('#egg-total'),
  chickenRoost: document.querySelector('#chicken-roost'),
  eggTray: document.querySelector('#egg-tray'),
  feedPercent: document.querySelector('#feed-percent'),
  feedMeter: document.querySelector('#feed-meter'),
  waterPercent: document.querySelector('#water-percent'),
  waterMeter: document.querySelector('#water-meter'),
  refillFeed: document.querySelector('#refill-feed'),
  refillWater: document.querySelector('#refill-water'),
  buyChicken: document.querySelector('#buy-chicken'),
  chickenPriceLabel: document.querySelector('#chicken-price-label'),
  buyConveyor: document.querySelector('#buy-conveyor'),
  beltDetail: document.querySelector('#belt-detail'),
  conveyorNotice: document.querySelector('#conveyor-notice'),
  eggInstruction: document.querySelector('#egg-instruction'),
  farmMessage: document.querySelector('#farm-message'),
  layTimer: document.querySelector('#lay-timer'),
  stand: document.querySelector('#sell-stand'),
  dropHint: document.querySelector('#drop-hint'),
  toast: document.querySelector('#toast'),
  reset: document.querySelector('#reset-game'),
};

let selectedEgg = null;
let toastTimeout;

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved === 'object') return { ...INITIAL_STATE, ...saved };
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
  return { ...INITIAL_STATE };
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function chickenPrice() {
  return 12 + Math.max(0, state.chickens - 1) * 8;
}

function render(updateEggTray = true) {
  elements.money.textContent = state.money;
  elements.chickenCount.textContent = state.chickens;
  elements.eggCount.textContent = state.eggs;
  elements.eggTotal.textContent = state.eggs;
  elements.soldCount.textContent = state.sold;
  elements.feedPercent.textContent = `${Math.ceil(state.feed)}%`;
  elements.waterPercent.textContent = `${Math.ceil(state.water)}%`;
  elements.feedMeter.style.width = `${state.feed}%`;
  elements.waterMeter.style.width = `${state.water}%`;
  elements.feedMeter.style.background = state.feed < 25 ? '#cd7855' : '';
  elements.waterMeter.style.background = state.water < 25 ? '#cd7855' : '';
  elements.chickenPriceLabel.textContent = `${chickenPrice()} €`;
  elements.buyChicken.innerHTML = `${chickenPrice()} € <span aria-hidden="true">↗</span>`;
  elements.buyChicken.setAttribute('aria-label', `Ein Huhn für ${chickenPrice()} Euro kaufen`);
  elements.buyChicken.disabled = state.money < chickenPrice();
  elements.refillFeed.disabled = state.money < 2 || state.feed >= 100;
  elements.refillWater.disabled = state.money < 1 || state.water >= 100;
  elements.refillFeed.setAttribute('aria-label', state.feed >= 100 ? 'Futter ist aufgefüllt' : 'Futter nachfüllen, kostet 2 Euro');
  elements.refillWater.setAttribute('aria-label', state.water >= 100 ? 'Wasser ist aufgefüllt' : 'Wasser nachfüllen, kostet 1 Euro');

  const chickenFragment = document.createDocumentFragment();
  for (let index = 0; index < Math.min(state.chickens, 5); index += 1) {
    const chicken = document.createElement('span');
    chicken.className = 'chicken-sprite';
    chicken.textContent = index % 3 === 2 ? '🐓' : '🐔';
    chicken.setAttribute('aria-hidden', 'true');
    chickenFragment.append(chicken);
  }
  if (state.chickens > 5) {
    const extra = document.createElement('span');
    extra.className = 'chicken-sprite';
    extra.textContent = `+${state.chickens - 5}`;
    extra.setAttribute('aria-label', `${state.chickens - 5} weitere Hühner`);
    chickenFragment.append(extra);
  }
  elements.chickenRoost.replaceChildren(chickenFragment);

  if (updateEggTray) renderEggTray();

  elements.conveyorNotice.classList.toggle('hidden', !state.conveyor);
  elements.eggInstruction.textContent = state.conveyor
    ? 'Deine Eier reisen jetzt ganz von allein.'
    : 'Zieh ein Ei zum Stand oder tippe es an.';
  elements.dropHint.textContent = state.conveyor ? 'Automatischer Verkauf' : 'Eier hier ablegen';
  elements.buyConveyor.disabled = state.conveyor || state.money < 35;
  elements.buyConveyor.innerHTML = state.conveyor ? 'Gekauft <span aria-hidden="true">✓</span>' : '35 € <span aria-hidden="true">↗</span>';
  elements.buyConveyor.setAttribute('aria-label', state.conveyor ? 'Förderband gekauft' : 'Förderband für 35 Euro kaufen');
  elements.beltDetail.textContent = state.conveyor ? 'Ist bereits im Einsatz.' : 'Nie wieder selbst tragen.';
  elements.farmMessage.textContent = getFarmMessage();

  const secondsPerEgg = Math.max(3, 8 - Math.floor((state.chickens - 1) / 2));
  const secondsLeft = Math.ceil(secondsPerEgg * (1 - state.layProgress));
  elements.layTimer.textContent = state.feed > 0 && state.water > 0
    ? `Nächstes Ei in ${secondsLeft} s`
    : 'Ohne Futter und Wasser keine Eier';
}

function renderEggTray() {
  const eggFragment = document.createDocumentFragment();
  const visibleEggs = Math.min(state.eggs, 36);
  for (let index = 0; index < visibleEggs; index += 1) {
    const egg = document.createElement('button');
    egg.className = `egg-token${selectedEgg === index ? ' selected' : ''}`;
    egg.type = 'button';
    egg.draggable = !state.conveyor;
    egg.textContent = '🥚';
    egg.setAttribute('aria-label', `Ei ${index + 1} zum Verkaufsstand bringen`);
    egg.addEventListener('click', () => {
      if (state.conveyor) return;
      selectedEgg = selectedEgg === index ? null : index;
      renderEggs();
    });
    egg.addEventListener('dragstart', (event) => {
      selectedEgg = index;
      event.dataTransfer.setData('text/plain', String(index));
      event.dataTransfer.effectAllowed = 'move';
      egg.classList.add('selected');
    });
    egg.addEventListener('dragend', () => egg.classList.remove('selected'));
    eggFragment.append(egg);
  }
  if (state.eggs > visibleEggs) {
    const more = document.createElement('span');
    more.className = 'egg-token';
    more.textContent = `+${state.eggs - visibleEggs}`;
    more.setAttribute('aria-label', `${state.eggs - visibleEggs} weitere Eier`);
    eggFragment.append(more);
  }
  if (state.eggs === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-eggs';
    empty.innerHTML = '<span aria-hidden="true">🥚</span> Hier warten bald frische Eier.';
    eggFragment.append(empty);
  }
  elements.eggTray.replaceChildren(eggFragment);
}

function renderEggs() {
  const eggs = [...elements.eggTray.querySelectorAll('.egg-token')];
  eggs.forEach((egg, index) => egg.classList.toggle('selected', selectedEgg === index));
}

function getFarmMessage() {
  if (state.feed <= 0 || state.water <= 0) return 'Deine Hühner brauchen Futter und Wasser.';
  if (state.feed < 25 || state.water < 25) return 'Die Vorräte werden knapp. Zeit zum Nachfüllen!';
  if (state.eggs > 0) return 'Frische Eier warten auf den Weg zum Verkaufsstand.';
  return 'Dein Hof ist versorgt. Das nächste Ei kommt bald.';
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimeout = setTimeout(() => elements.toast.classList.remove('visible'), 2200);
}

function sellEggs(amount = 1) {
  if (state.eggs === 0) {
    showToast('Im Stall wartet gerade kein Ei.');
    return;
  }
  const soldNow = Math.min(amount, state.eggs);
  state.eggs -= soldNow;
  state.sold += soldNow;
  state.money += soldNow * EGG_PRICE;
  selectedEgg = null;
  saveGame();
  render();
  showToast(`${soldNow === 1 ? 'Ein Ei' : `${soldNow} Eier`} verkauft: +${soldNow * EGG_PRICE} €`);
}

elements.refillFeed.addEventListener('click', () => {
  if (state.money < 2 || state.feed >= 100) return;
  state.money -= 2;
  state.feed = Math.min(100, state.feed + 40);
  saveGame();
  render();
  showToast('Der Futtertrog ist wieder gut gefüllt.');
});

elements.refillWater.addEventListener('click', () => {
  if (state.money < 1 || state.water >= 100) return;
  state.money -= 1;
  state.water = Math.min(100, state.water + 50);
  saveGame();
  render();
  showToast('Frisches Wasser ist aufgefüllt.');
});

elements.buyChicken.addEventListener('click', () => {
  const price = chickenPrice();
  if (state.money < price) return showToast('Dafür fehlt noch ein bisschen Kleingeld.');
  state.money -= price;
  state.chickens += 1;
  saveGame();
  render();
  showToast('Willkommen auf dem Hof, kleines Huhn!');
});

elements.buyConveyor.addEventListener('click', () => {
  if (state.conveyor) return;
  if (state.money < 35) return showToast('Das Förderband kostet 35 €. Sammle noch ein paar Eier.');
  state.money -= 35;
  state.conveyor = true;
  saveGame();
  render();
  showToast('Das Förderband läuft. Eier werden automatisch verkauft!');
});

elements.stand.addEventListener('click', () => {
  if (state.conveyor) return showToast('Das Förderband kümmert sich schon um deine Eier.');
  if (selectedEgg !== null) sellEggs(1);
  else sellEggs(state.eggs);
});

elements.stand.addEventListener('dragover', (event) => {
  if (state.conveyor) return;
  event.preventDefault();
  elements.stand.classList.add('drag-over');
});

elements.stand.addEventListener('dragleave', (event) => {
  if (!elements.stand.contains(event.relatedTarget)) elements.stand.classList.remove('drag-over');
});

elements.stand.addEventListener('drop', (event) => {
  event.preventDefault();
  elements.stand.classList.remove('drag-over');
  if (!state.conveyor) sellEggs(1);
});

elements.reset.addEventListener('click', () => {
  if (!window.confirm('Möchtest du wirklich einen neuen Hof beginnen? Dein aktueller Spielstand geht verloren.')) return;
  Object.assign(state, INITIAL_STATE);
  selectedEgg = null;
  saveGame();
  render();
  showToast('Dein neuer Hof ist bereit!');
});

setInterval(() => {
  let changed = false;
  state.feed = Math.max(0, state.feed - state.chickens * 0.28);
  state.water = Math.max(0, state.water - state.chickens * 0.38);

  if (state.feed > 0 && state.water > 0) {
    state.layProgress += 1 / Math.max(3, 8 - Math.floor((state.chickens - 1) / 2));
    if (state.layProgress >= 1) {
      state.layProgress -= 1;
      state.eggs += 1;
      changed = true;
      if (state.conveyor) {
        state.eggs -= 1;
        state.sold += 1;
        state.money += EGG_PRICE;
        showToast('Ein Ei ist am Stand angekommen: +4 €');
      }
    }
  }

  if (changed || state.conveyor) saveGame();
  render(changed);
}, 1000);

render();