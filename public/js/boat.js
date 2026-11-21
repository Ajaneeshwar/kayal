import { api, esc, entryCard, days, LEVELS } from './common.js';

const $ = (id) => document.getElementById(id);
const boatId = location.pathname.split('/').pop();

function heroText({ state, lastSewage, overdueDays }) {
  if (state === 'verified') {
    return {
      tone: 'ok',
      title: 'Sewage pump-out verified',
      detail: `${days(lastSewage.daysAgo)} at ${lastSewage.facilityName}. ${LEVELS[lastSewage.level].label}.`,
    };
  }
  if (state === 'declared') {
    return {
      tone: 'warn',
      title: 'Pump-out self-declared only',
      detail: `The crew logged a pump-out ${days(lastSewage.daysAgo)}, but the phone was not at a collection point.`,
    };
  }
  return {
    tone: 'bad',
    title: `No pump-out logged in the last ${overdueDays} days`,
    detail: lastSewage ? `The last one was ${days(lastSewage.daysAgo)}.` : 'This boat has no pump-out on record.',
  };
}

async function load() {
  try {
    const { boat, entries } = await api(`/api/boats/${encodeURIComponent(boatId)}`);
    const hero = heroText(boat.status);
    const solid = boat.status.lastSolid;
    document.title = `Kayal Log: ${boat.name}`;
    $('hero').className = `hero ${hero.tone}`;
    $('hero').innerHTML = `
      <p class="small">${esc(boat.name)} · ${esc(boat.registration)}</p>
      <h1>${esc(hero.title)}</h1>
      <p>${esc(hero.detail)}</p>
      <p class="small">${solid ? `Solid waste last handed over ${esc(days(solid.daysAgo))}.` : 'No solid waste handover on record.'}</p>`;
    $('hero').hidden = false;
    $('entries').innerHTML = entries.length
      ? entries.map((e) => entryCard(e)).join('')
      : '<p class="muted">Nothing logged yet.</p>';
    $('log').hidden = false;
    $('error').hidden = true;
  } catch (err) {
    $('error').textContent = err.message;
    $('error').hidden = false;
  }
}

load();
setInterval(load, 15_000);
