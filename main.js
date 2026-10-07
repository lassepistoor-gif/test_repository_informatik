const SAVE_KEY = 'hofglueck-save-v1';
const EGG_PRICE = 4;
const RETIREMENT_GOAL = 50;
const UPGRADE_PRICES = { basket: 30, conveyor: 90, nestBox: 45, feedAutomation: 55, waterPump: 50 };
const INITIAL_STATE = {
  money: 24,
  chickens: 1,
  eggs: 0,
  sold: 0,
  carriedEggs: 0,
  eggCapacity: 3,
  feed: 100,
  water: 100,
  conveyor: false,
  basketUpgrade: false,
  retired: false,
  nestBox: false,
  feedAutomation: false,
  waterPump: false,
  layProgress: 0,
};

const state = loadGame();
const elements = {
  money: document.querySelector('#money'),
  chickenCount: document.querySelector('#chicken-count'),
  eggCount: document.querySelector('#egg-count'),
  soldCount: document.querySelector('#sold-count'),
  eggTotal: document.querySelector('#egg-total'),
  chickenField: document.querySelector('#chicken-field'),
  eggField: document.querySelector('#egg-field'),
  carriedCount: document.querySelector('#carried-count'),
  farmDay: document.querySelector('#farm-day'),
  eggTray: document.querySelector('#egg-tray'),
  feedPercent: document.querySelector('#feed-percent'),
  feedMeter: document.querySelector('#feed-meter'),
  waterPercent: document.querySelector('#water-percent'),
  waterMeter: document.querySelector('#water-meter'),
  feedSceneFill: document.querySelector('#feed-scene-fill'),
  waterSceneFill: document.querySelector('#water-scene-fill'),
  feedSceneLevel: document.querySelector('#feed-scene-level'),
  waterSceneLevel: document.querySelector('#water-scene-level'),
  sceneFeedTrough: document.querySelector('#scene-feed-trough'),
  sceneWaterTrough: document.querySelector('#scene-water-trough'),
  refillFeed: document.querySelector('#refill-feed'),
  refillWater: document.querySelector('#refill-water'),
  buyChicken: document.querySelector('#buy-chicken'),
  chickenPriceLabel: document.querySelector('#chicken-price-label'),
  buyConveyor: document.querySelector('#buy-conveyor'),
  beltDetail: document.querySelector('#belt-detail'),
  buyBasket: document.querySelector('#buy-basket'),
  basketDetail: document.querySelector('#basket-detail'),
  buyNest: document.querySelector('#buy-nest'),
  nestDetail: document.querySelector('#nest-detail'),
  buyFeeder: document.querySelector('#buy-feeder'),
  feederDetail: document.querySelector('#feeder-detail'),
  buyPump: document.querySelector('#buy-pump'),
  pumpDetail: document.querySelector('#pump-detail'),
  conveyorNotice: document.querySelector('#conveyor-notice'),
  eggInstruction: document.querySelector('#egg-instruction'),
  farmMessage: document.querySelector('#farm-message'),
  layTimer: document.querySelector('#lay-timer'),
  stand: document.querySelector('#sell-stand'),
  dropHint: document.querySelector('#drop-hint'),
  toast: document.querySelector('#toast'),
  reset: document.querySelector('#reset-game'),
  retirementSold: document.querySelector('#retirement-sold'),
  retirementProgress: document.querySelector('#retirement-progress'),
  retireButton: document.querySelector('#retire-button'),
  retireDialog: document.querySelector('#retire-dialog'),
  closeRetire: document.querySelector('#close-retire'),
};

let selectedEgg = null;
let toastTimeout;
const chickenActors = [];

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

function createChickenMarkup() {
  return '<svg class="chicken-art" viewBox="0 0 80 64" role="img" aria-label="Huhn"><path class="chicken-tail" d="M20 34 8 25l3 13-7 7 16-2z"/><ellipse class="chicken-body" cx="38" cy="39" rx="25" ry="17"/><ellipse class="chicken-wing" cx="39" cy="40" rx="13" ry="9"/><path class="chicken-neck" d="M48 32c-4-10-1-21 8-23 9-2 15 4 14 12-1 7-7 11-16 11z"/><circle class="chicken-head" cx="60" cy="14" r="10"/><path class="chicken-comb" d="M54 5c-3-7 3-8 5-3 2-6 8-4 6 1 6-3 8 3 3 6z"/><path class="chicken-beak" d="m69 14 9 4-9 4z"/><circle class="chicken-eye" cx="63" cy="12" r="1.6"/><path class="chicken-wattle" d="M66 23c4 0 5 4 1 5-3 0-4-3-1-5"/><path class="chicken-leg" d="M31 53v6m15-6v6m-8-1-5 3m5-3 4 3m4-3-5 3m5-3 4 3"/></svg>';
}

function syncChickenActors() {
  while (chickenActors.length < state.chickens) {
    const element = document.createElement('div');
    element.className = 'chicken-actor';
    element.innerHTML = createChickenMarkup();
    const actor = {
      element,
      x: 30 + Math.random() * 13,
      y: 71 + Math.random() * 12,
      target: null,
      pauseUntil: 0,
      activity: 'roaming',
    };
    elements.chickenField.append(element);
    chickenActors.push(actor);
    chooseChickenDestination(actor);
    positionChicken(actor);
  }

  while (chickenActors.length > state.chickens) {
    chickenActors.pop().element.remove();
  }
}

function positionChicken(actor) {
  actor.element.style.left = `${actor.x}%`;
  actor.element.style.top = `${actor.y}%`;
}

function chooseChickenDestination(actor) {
  const visitFeed = state.feed > 0 && Math.random() < 0.42;
  const visitWater = !visitFeed && state.water > 0 && Math.random() < 0.72;

  if (visitFeed) {
    actor.target = { x: 50, y: 77, activity: 'feeding' };
  } else if (visitWater) {
    actor.target = { x: 67, y: 77, activity: 'drinking' };
  } else {
    actor.target = {
      x: 34 + Math.random() * 54,
      y: 68 + Math.random() * 20,
      activity: 'roaming',
    };
  }
}

function moveChickens() {
  const now = performance.now();
  const step = 0.18;

  for (const actor of chickenActors) {
    if (actor.pauseUntil > now) continue;
    if (!actor.target) chooseChickenDestination(actor);

    const deltaX = actor.target.x - actor.x;
    const deltaY = actor.target.y - actor.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < step) {
      actor.x = actor.target.x;
      actor.y = actor.target.y;
      actor.activity = actor.target.activity;
      actor.element.classList.toggle('facing-left', deltaX < 0);
      actor.element.classList.toggle('feeding', actor.activity === 'feeding');
      actor.element.classList.toggle('drinking', actor.activity === 'drinking');
      actor.pauseUntil = now + (actor.activity === 'roaming' ? 700 : 1800);
      actor.target = null;
    } else {
      actor.x += (deltaX / distance) * step;
      actor.y += (deltaY / distance) * step;
      actor.element.classList.toggle('facing-left', deltaX < 0);
      actor.element.classList.remove('feeding', 'drinking');
    }

    positionChicken(actor);
  }
}

function render(updateEggTray = true) {
  elements.money.textContent = state.money;
  elements.chickenCount.textContent = state.chickens;
  elements.eggCount.textContent = state.eggs;
  elements.eggTotal.textContent = state.eggs;
  elements.soldCount.textContent = state.sold;
  elements.carriedCount.textContent = `${state.carriedEggs}/${state.eggCapacity}`;
  elements.eggTotal.textContent = state.carriedEggs;
  elements.farmDay.textContent = String(Math.floor(state.sold / 5) + 1).padStart(2, '0');
  elements.feedPercent.textContent = `${Math.ceil(state.feed)}%`;
  elements.waterPercent.textContent = `${Math.ceil(state.water)}%`;
  elements.feedMeter.style.width = `${state.feed}%`;
  elements.waterMeter.style.width = `${state.water}%`;
  elements.feedSceneFill.style.width = `${state.feed}%`;
  elements.waterSceneFill.style.width = `${state.water}%`;
  elements.feedSceneLevel.textContent = `${Math.ceil(state.feed)}%`;
  elements.waterSceneLevel.textContent = `${Math.ceil(state.water)}%`;
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

  syncChickenActors();

  if (updateEggTray) renderEggTray();

  elements.conveyorNotice.classList.toggle('hidden', !state.conveyor);
  elements.eggInstruction.textContent = state.conveyor
    ? 'Deine Eier reisen jetzt ganz von allein.'
    : 'Zieh ein Ei zum Stand oder tippe es an.';
  elements.dropHint.textContent = state.conveyor ? 'Automatischer Verkauf' : 'Eier hier ablegen';
  elements.buyConveyor.disabled = state.conveyor || state.money < UPGRADE_PRICES.conveyor;
  elements.buyConveyor.innerHTML = state.conveyor ? 'Gekauft <span aria-hidden="true">✓</span>' : `${UPGRADE_PRICES.conveyor} € <span aria-hidden="true">↗</span>`;
  elements.buyConveyor.setAttribute('aria-label', state.conveyor ? 'Förderband gekauft' : `Förderband für ${UPGRADE_PRICES.conveyor} Euro kaufen`);
  elements.beltDetail.textContent = state.conveyor ? 'Ist bereits im Einsatz.' : 'Nie wieder selbst tragen.';
  elements.buyBasket.disabled = state.basketUpgrade || state.money < UPGRADE_PRICES.basket;
  elements.buyBasket.innerHTML = state.basketUpgrade ? 'Gekauft <span aria-hidden="true">✓</span>' : `${UPGRADE_PRICES.basket} € <span aria-hidden="true">↗</span>`;
  elements.buyBasket.setAttribute('aria-label', state.basketUpgrade ? 'Großer Eierkorb gekauft' : `Großen Eierkorb für ${UPGRADE_PRICES.basket} Euro kaufen`);
  elements.basketDetail.textContent = state.basketUpgrade ? 'Der Korb fasst jetzt 8 Eier.' : 'Mehr Eier pro Marktgang.';
  elements.retirementSold.textContent = Math.min(state.sold, RETIREMENT_GOAL);
  elements.retirementProgress.style.width = `${Math.min(100, state.sold / RETIREMENT_GOAL * 100)}%`;
  elements.retireButton.disabled = state.sold < RETIREMENT_GOAL || state.retired;
  updateUpgrade(elements.buyNest, elements.nestDetail, 'nestBox', 'Nistkasten', 'Mehr Eier in kürzerer Zeit.');
  updateUpgrade(elements.buyFeeder, elements.feederDetail, 'feedAutomation', 'Futterautomat', 'Der Vorrat reicht länger.');
  updateUpgrade(elements.buyPump, elements.pumpDetail, 'waterPump', 'Wasserpumpe', 'Frisches Wasser für länger.');
  elements.farmMessage.textContent = getFarmMessage();

  const secondsPerEgg = eggInterval();
  const secondsLeft = Math.ceil(secondsPerEgg * (1 - state.layProgress));
  elements.layTimer.textContent = state.feed > 0 && state.water > 0
    ? `Nächstes Ei in ${secondsLeft} s`
    : 'Ohne Futter und Wasser keine Eier';
}

function eggInterval() {
  const flockInterval = Math.max(3, 8 - Math.floor((state.chickens - 1) / 2));
  return state.nestBox ? flockInterval * 0.75 : flockInterval;
}

function updateUpgrade(button, detail, key, name, hint) {
  const price = UPGRADE_PRICES[key];
  button.disabled = state[key] || state.money < price;
  button.innerHTML = state[key] ? 'Gekauft <span aria-hidden="true">✓</span>' : `${price} € <span aria-hidden="true">↗</span>`;
  button.setAttribute('aria-label', state[key] ? `${name} gekauft` : `${name} für ${price} Euro kaufen`);
  detail.textContent = state[key] ? 'Ist bereits im Einsatz.' : hint;
}

function renderEggTray() {
  const fieldFragment = document.createDocumentFragment();
  const visibleEggs = Math.min(state.eggs, 24);
  for (let index = 0; index < visibleEggs; index += 1) {
    const egg = document.createElement('button');
    egg.className = 'field-egg';
    egg.type = 'button';
    egg.draggable = !state.conveyor;
    egg.style.left = `${28 + ((index * 31) % 66)}%`;
    egg.style.top = `${57 + ((index * 19) % 34)}%`;
    egg.innerHTML = '<i aria-hidden="true"></i>';
    egg.setAttribute('aria-label', `Ei ${index + 1} einsammeln`);
    egg.addEventListener('click', collectEgg);
    egg.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', 'egg');
      event.dataTransfer.effectAllowed = 'move';
    });
    fieldFragment.append(egg);
  }
  if (state.eggs > visibleEggs) {
    const more = document.createElement('span');
    more.className = 'egg-overflow';
    more.textContent = `+${state.eggs - visibleEggs}`;
    fieldFragment.append(more);
  }
  elements.eggField.replaceChildren(fieldFragment);

  const eggFragment = document.createDocumentFragment();
  for (let index = 0; index < state.carriedEggs; index += 1) {
    const egg = document.createElement('span');
    egg.className = 'egg-token';
    egg.textContent = '🥚';
    eggFragment.append(egg);
  }
  if (state.carriedEggs === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-eggs';
    empty.innerHTML = '<span aria-hidden="true">🧺</span> Dein Korb ist noch leer.';
    eggFragment.append(empty);
  }
  elements.eggTray.replaceChildren(eggFragment);
}

function collectEgg() {
  if (state.conveyor || state.eggs < 1) return;
  if (state.carriedEggs >= state.eggCapacity) {
    showToast('Dein Korb ist voll. Bring die Eier zum Markt!');
    return;
  }
  state.eggs -= 1;
  state.carriedEggs += 1;
  selectedEgg = null;
  saveGame();
  render();
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
  if (state.carriedEggs === 0) {
    showToast('Sammle erst Eier auf dem Feld ein.');
    return;
  }
  const soldNow = Math.min(amount, state.carriedEggs);
  state.carriedEggs -= soldNow;
  state.sold += soldNow;
  state.money += soldNow * EGG_PRICE;
  selectedEgg = null;
  saveGame();
  render();
  showToast(`${soldNow === 1 ? 'Ein Ei' : `${soldNow} Eier`} verkauft: +${soldNow * EGG_PRICE} €`);
}

function refillFeed() {
  if (state.money < 2 || state.feed >= 100) return;
  state.money -= 2;
  state.feed = Math.min(100, state.feed + 40);
  saveGame();
  render();
  showToast('Der Futtertrog ist wieder gut gefüllt.');
}

function refillWater() {
  if (state.money < 1 || state.water >= 100) return;
  state.money -= 1;
  state.water = Math.min(100, state.water + 50);
  saveGame();
  render();
  showToast('Frisches Wasser ist aufgefüllt.');
}

elements.refillFeed.addEventListener('click', refillFeed);
elements.sceneFeedTrough.addEventListener('click', refillFeed);
elements.refillWater.addEventListener('click', refillWater);
elements.sceneWaterTrough.addEventListener('click', refillWater);

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
  if (state.money < UPGRADE_PRICES.conveyor) return showToast(`Das Förderband kostet ${UPGRADE_PRICES.conveyor} €. Sammle noch ein paar Eier.`);
  state.money -= UPGRADE_PRICES.conveyor;
  state.conveyor = true;
  const storedEggs = state.eggs + state.carriedEggs;
  state.eggs = 0;
  state.carriedEggs = 0;
  state.sold += storedEggs;
  state.money += storedEggs * EGG_PRICE;
  saveGame();
  render();
  showToast('Das Förderband läuft. Eier werden automatisch verkauft!');
});

elements.buyBasket.addEventListener('click', () => {
  if (state.basketUpgrade) return;
  if (state.money < UPGRADE_PRICES.basket) return showToast(`Der große Korb kostet ${UPGRADE_PRICES.basket} €.`);
  state.money -= UPGRADE_PRICES.basket;
  state.eggCapacity = 8;
  state.basketUpgrade = true;
  saveGame();
  render();
  showToast('Dein Korb fasst jetzt 8 Eier!');
});

for (const [button, key, name] of [
  [elements.buyNest, 'nestBox', 'Nistkasten'],
  [elements.buyFeeder, 'feedAutomation', 'Futterautomat'],
  [elements.buyPump, 'waterPump', 'Wasserpumpe'],
]) {
  button.addEventListener('click', () => {
    const price = UPGRADE_PRICES[key];
    if (state[key]) return;
    if (state.money < price) return showToast(`Der ${name} kostet ${price} €. Sammle noch ein paar Eier.`);
    state.money -= price;
    state[key] = true;
    saveGame();
    render();
    showToast(`${name} ist jetzt auf deinem Hof im Einsatz.`);
  });
}

elements.stand.addEventListener('click', () => {
  if (state.conveyor) return showToast('Das Förderband kümmert sich schon um deine Eier.');
  sellEggs(state.carriedEggs);
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
  if (!state.conveyor && state.eggs > 0 && state.carriedEggs < state.eggCapacity) {
    collectEgg();
    sellEggs(state.carriedEggs);
  }
});

elements.retireButton.addEventListener('click', () => {
  if (state.sold < RETIREMENT_GOAL) return;
  state.retired = true;
  saveGame();
  render();
  elements.retireDialog.showModal();
});
elements.closeRetire.addEventListener('click', () => elements.retireDialog.close());

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
  const feedUse = state.feedAutomation ? 0.168 : 0.28;
  const waterUse = state.waterPump ? 0.228 : 0.38;
  state.feed = Math.max(0, state.feed - state.chickens * feedUse);
  state.water = Math.max(0, state.water - state.chickens * waterUse);

  if (state.feed > 0 && state.water > 0) {
    state.layProgress += 1 / eggInterval();
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

setInterval(moveChickens, 50);
render();