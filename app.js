
// Global state for filters and loaded data.
const state = {
  filters: { dining: new Set(), stay: new Set() },
  data: null,
};

// Inline fallback dataset (kept null on purpose to avoid masking fetch issues)
const fallbackData = null;


function qs(selector, el = document) {
  return el.querySelector(selector);
}


function qsa(selector, el = document) {
  return [...el.querySelectorAll(selector)];
}

/** Escape HTML special characters to prevent accidental HTML injection. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}


function bindMobileMenu() {
  const toggle = qs('#menuToggle');
  const nav = qs('#primaryNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Close menu when a nav link is clicked
  qsa('nav.primary a[data-link]').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }),
  );
}

function bindBookingModalControls() {
  const closeX = qs('#bk-close-x');
  const closeBtn = qs('#bk-close');
  const clearBtn = qs('#bk-clear');
  const submitBtn = qs('#bk-submit');
  if (closeX && !closeX.dataset.bound) { closeX.dataset.bound = '1'; closeX.addEventListener('click', closeBookingModal); }
  if (closeBtn && !closeBtn.dataset.bound) { closeBtn.dataset.bound = '1'; closeBtn.addEventListener('click', closeBookingModal); }
  if (clearBtn && !clearBtn.dataset.bound) { clearBtn.dataset.bound = '1'; clearBtn.addEventListener('click', clearBookingForm); }
  if (submitBtn && !submitBtn.dataset.bound) { submitBtn.dataset.bound = '1'; submitBtn.addEventListener('click', submitBooking); }
}

// Booking modal helpers
let _bkPrevFocus = null;
let _bkTrigger = null;
let _bkDefaultTitle = 'Start booking';

// Track the last clicked element to infer selected stay when opening the modal.
document.addEventListener('mousedown', e => { _bkTrigger = e.target; }, true);

function openBookingModal(arg) {
  const overlay = qs('#bookingModal');
  if (!overlay) return;

  // If called as an event handler, prevent default and ignore arg as a provided name
  let providedName = '';
  if (arg && typeof arg !== 'string') {
    if (typeof arg.preventDefault === 'function') arg.preventDefault();
  } else if (typeof arg === 'string') {
    providedName = arg;
  }

  // Bind one-time overlay click to close when clicking outside the dialog
  if (!overlay.dataset.bound) {
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeBookingModal();
    });
  }

  // Infer selected stay name from last clicked .js-book button if not provided
  const inferred = _bkTrigger && _bkTrigger.closest && _bkTrigger.closest('.card')?.querySelector('.title')?.textContent?.trim();
  const nm = providedName || inferred || '';
  const titleEl = qs('#bk-title');
  if (titleEl) {
    if (!overlay.dataset.defaultTitle) overlay.dataset.defaultTitle = titleEl.textContent || _bkDefaultTitle;
    titleEl.textContent = nm ? `${_bkDefaultTitle} — ${nm}` : overlay.dataset.defaultTitle;
  }
  if (nm) overlay.dataset.stay = nm; else delete overlay.dataset.stay;

  _bkPrevFocus = document.activeElement;
  overlay.removeAttribute('hidden');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  qs('#bk-name')?.focus();
  document.addEventListener('keydown', _bkEsc, true);
}

function closeBookingModal() {
  const overlay = qs('#bookingModal');
  if (!overlay) return;

  overlay.classList.remove('open');
  overlay.setAttribute('hidden', '');
  overlay.setAttribute('aria-hidden', 'true');

  // Restore default title and clear selected stay
  const titleEl = qs('#bk-title');
  if (titleEl) {
    titleEl.textContent = overlay.dataset.defaultTitle || _bkDefaultTitle;
  }
  delete overlay.dataset.stay;

  document.removeEventListener('keydown', _bkEsc, true);
  _bkPrevFocus?.focus();
}

function _bkEsc(e) {
  if (e.key === 'Escape') closeBookingModal();
}

function clearBookingForm() {
  ['bk-name', 'bk-email', 'bk-arr', 'bk-dep', 'bk-party', 'bk-type'].forEach(id => {
    const el = qs('#' + id);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.type === 'number') {
      el.value = '2';
    } else {
      el.value = '';
    }
  });
  qs('#bk-name')?.focus();
}

function submitBooking() {
  const name = qs('#bk-name')?.value.trim();
  const email = qs('#bk-email')?.value.trim();
  const stay = qs('#bookingModal')?.dataset.stay;
  if (!name || !email) {
    alert('Please enter your name and email.');
    return;
  }
  const stayNote = stay ? ` regarding ${stay}` : '';
  alert(`Thanks, ${name}! We'll follow up via ${email}${stayNote} with lodging options. (Demo)`);
  closeBookingModal();
}

// Reserve (Call/Reserve) modal helpers
let _rvPrevFocus = null;
let _rvDefaultTitle = 'Call/Reserve';

function bindReserveModalControls() {
  const closeX = qs('#rv-close-x');
  const closeBtn = qs('#rv-close');
  const clearBtn = qs('#rv-clear');
  const submitBtn = qs('#rv-submit');
  if (closeX && !closeX.dataset.bound) { closeX.dataset.bound = '1'; closeX.addEventListener('click', closeReserveModal); }
  if (closeBtn && !closeBtn.dataset.bound) { closeBtn.dataset.bound = '1'; closeBtn.addEventListener('click', closeReserveModal); }
  if (clearBtn && !clearBtn.dataset.bound) { clearBtn.dataset.bound = '1'; clearBtn.addEventListener('click', clearReserveForm); }
  if (submitBtn && !submitBtn.dataset.bound) { submitBtn.dataset.bound = '1'; submitBtn.addEventListener('click', submitReserve); }
}

function openReserveModal(arg) {
  const overlay = qs('#reserveModal');
  if (!overlay) return;
  // Prevent default if event
  if (arg && typeof arg.preventDefault === 'function') arg.preventDefault();

  // Infer venue name from the nearest card title
  const inferred = _bkTrigger && _bkTrigger.closest && _bkTrigger.closest('.card')?.querySelector('.title')?.textContent?.trim();
  const nm = typeof arg === 'string' && arg ? arg : (inferred || '');

  const titleEl = qs('#rv-title');
  if (titleEl) {
    if (!overlay.dataset.defaultTitle) overlay.dataset.defaultTitle = titleEl.textContent || _rvDefaultTitle;
    titleEl.textContent = nm ? `${_rvDefaultTitle} — ${nm}` : overlay.dataset.defaultTitle;
  }
  if (nm) overlay.dataset.venue = nm; else delete overlay.dataset.venue;

  _rvPrevFocus = document.activeElement;
  overlay.removeAttribute('hidden');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  qs('#rv-name')?.focus();
  document.addEventListener('keydown', _rvEsc, true);

  // Close when clicking on the overlay
  if (!overlay.dataset.bound) {
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeReserveModal(); });
  }
}

function closeReserveModal() {
  const overlay = qs('#reserveModal');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('hidden', '');
  overlay.setAttribute('aria-hidden', 'true');
  const titleEl = qs('#rv-title');
  if (titleEl) titleEl.textContent = overlay.dataset.defaultTitle || _rvDefaultTitle;
  delete overlay.dataset.venue;
  document.removeEventListener('keydown', _rvEsc, true);
  _rvPrevFocus?.focus();
}

function _rvEsc(e) { if (e.key === 'Escape') closeReserveModal(); }

function clearReserveForm() {
  ['rv-name','rv-phone','rv-time','rv-date','rv-party'].forEach(id => {
    const el = qs('#'+id);
    if (!el) return;
    if (el.type === 'number') el.value = '2';
    else el.value = '';
  });
  qs('#rv-name')?.focus();
}

function submitReserve() {
  const name = qs('#rv-name')?.value.trim();
  const phone = qs('#rv-phone')?.value.trim();
  const date = qs('#rv-date')?.value;
  const time = qs('#rv-time')?.value;
  const venue = qs('#reserveModal')?.dataset.venue;
  if (!name || !phone) {
    alert('Please enter your name and phone number.');
    return;
  }
  const when = (date || time) ? ` for ${[date, time].filter(Boolean).join(' ')}` : '';
  const vnote = venue ? ` at ${venue}` : '';
  alert(`Thanks, ${name}! We\'ll ask the venue to hold a table${vnote}${when}. We\'ll call ${phone} to confirm. (Demo)`);
  closeReserveModal();
}

function setActiveNav(hash) {
  // Mark current item in primary nav
  qsa('nav.primary a[data-link]').forEach(a => {
    a.setAttribute('aria-current', a.getAttribute('href') === hash ? 'page' : 'false');
  });

  // Brand click: reset filters and go home
  const brand = qs('.brand a');
  if (brand && !brand.dataset.bound) {
    brand.dataset.bound = '1';
    brand.addEventListener('click', e => {
      e.preventDefault();
      state.filters.dining.clear();
      state.filters.stay.clear();
      location.hash = '#/home';
      router();
    });
  }
}
function crumbs(items) {
  // Accessible breadcrumbs: only intermediate items are links; last item marks current page.
  // Accepts an array like: [[label, href], [label, href], [currentLabel, currentHref]]
  if (!Array.isArray(items)) return '';
  const parts = items.map((entry, idx) => {
    const isLast = idx === items.length - 1;
    const label = Array.isArray(entry) ? entry[0] : entry;
    const href = Array.isArray(entry) ? entry[1] : null;
    const safeLabel = escapeHtml(label);
    if (isLast) {
      return `<li aria-current="page"><span>${safeLabel}</span></li>`;
    }
    const link = href ? `<a href="${href}">${safeLabel}</a>` : `<span>${safeLabel}</span>`;
    return `<li>${link}</li>`;
  }).join('');
  return `<nav class="bread" aria-label="Breadcrumb"><ol>${parts}</ol></nav>`;
}
/** Render a page header (H1 + optional subtitle). */
function h1(title, subtitle) {
  const sub = subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : '';
  return `
    <div class="hero">
      <h1 class="h1">${escapeHtml(title)}</h1>
      ${sub}
    </div>
  `;
}

/** Small visual pill (used for tags/prices). */
function pill(text) {
  return `<span class="pill">${escapeHtml(text)}</span>`;
}

/** Simple card with optional body and footer content. */
function card(title, body, footer) {
  return `
    <div class="card">
      <div class="title">${escapeHtml(title)}</div>
      ${body || ''}
      ${footer || ''}
    </div>
  `;
}
const Pages={home(){const it=state.data.itineraries;return `<div class="hero"><div class="bread">Home</div><h1 class="h1">Welcome to Taniti</h1><p class="sub">Plan a 5‑day island escape with beaches, rainforest walks, and a volcano tour.</p><div class="imgph" role="img" aria-label="Hero image placeholder">Image placeholder</div><div class="cta-row"><button class="btn primary js-book">Book now</button></div></div><section class="section"><div class="row"><div class="kicker">Quick Itineraries</div></div><div class="grid cols-2">${it.map(i=>`<div class="card"><div class="title">${escapeHtml(i.name)}</div><p class="muted mini">Tap to view steps</p><div class="chips">${i.steps.slice(0,3).map(s=>pill(s)).join('')}</div><div class="cta-row"><a href="#/itinerary/${i.id}" class="btn">View details →</a></div></div>`).join('')}</div></section><section class="section"><div class="row"><div class="kicker">Fast Facts</div></div><div class="grid cols-3">${['Alcohol: No service 12:00 a.m.–9:00 a.m.','Buses: 5 a.m.–11 p.m. (Taniti City)','Currency: USD; many accept euros/yen; cards OK','Power: 120V outlets','Holidays: Some closures—plan ahead','Safety: Violent crime rare; watch for pickpocketing'].map(t=>card(t.split(':')[0],`<p class="muted">${escapeHtml(t.split(': ').slice(1).join(': '))}</p>`)).join('')}</div></section><section class="section"><div class="row"><div class="kicker">Explore Areas</div></div><div class="grid cols-2">${card('Taniti City','<p class="muted">Beaches around Yellow Leaf Bay; native architecture.</p>','<div class="cta-row"><a href="#/things" class="btn">Things to do →</a></div>')}${card('Merriton Landing','<p class="muted">Nightlife & culture: microbrewery, club, galleries, bowling, arcade.</p>','<div class="cta-row"><a href="#/things" class="btn">See activities →</a></div>')}</div></section>`},plan(){return `${crumbs([['Home','#/home'],['Plan','#/plan']])}${h1('Plan Your Trip','Everything you need before you book—timing, rules, transport, and tips.')}<section class="section"><div class="row"><div class="kicker">When to go</div></div><p>Taniti has many national holidays. Some attractions and restaurants close. Check ahead.</p></section><section class="section"><div class="row"><div class="kicker">Rules & tips</div></div><ul><li><b>Drinking age:</b> 18 (not strictly enforced).</li><li><b>Alcohol service:</b> No service 12:00 a.m.–9:00 a.m.</li><li><b>Bike helmets:</b> Required by law (rentals include helmets).</li><li><b>Health & safety:</b> One hospital, several clinics; multilingual staff.</li></ul></section><section class="section"><div class="row"><div class="kicker">Transport summary</div></div><ul><li><b>Buses (city):</b> 5 a.m.–11 p.m. daily.</li><li><b>Taxis:</b> Available in Taniti City.</li><li><b>Rental cars:</b> Local agency near the airport.</li><li><b>Bikes:</b> Vendors with helmets included.</li><li><b>Private buses:</b> Serve the rest of the island.</li><li><b>From the airport:</b> Bus/taxi to Taniti City; car rental next to terminal.</li></ul><a href="#/transport" class="btn">See full Getting Around →</a></section><section class="section"><div class="row"><div class="kicker">Money & power</div></div><ul><li><b>Currency:</b> USD; many accept euros/yen; major credit cards accepted.</li><li><b>Banks:</b> Currency exchange available.</li><li><b>Power outlets:</b> 120V (U.S. standard).</li></ul></section>`},things(){return `${crumbs([['Home','#/home'],['Things to Do','#/things']])}${h1('Things to Do','Pick an activity and go. Filters help narrow choices.')}<section class="section"><div class="row"><div class="kicker">Featured clusters</div></div><div class="grid cols-2">${activityCard('Beaches','White sands around Yellow Leaf Bay','Outdoor · Free','#/activity/beaches')}${activityCard('Rainforest Walks','Guided and self‑guided','Outdoor · Family‑friendly','#/activity/rainforest')}${activityCard('Volcano Tour','Safe viewpoints & guided trips','Outdoor · Half‑day','#/activity/volcano')}${activityCard('Merriton Landing','Nightlife & culture: microbrewery, club, galleries, bowling, arcade','Evening · Walkable','#/area/merriton')}</div></section><section class="section"><div class="row"><div class="kicker">Other activities</div></div><div class="grid cols-3">${['Snorkeling','#/activity/snorkeling','Chartered fishing','#/activity/fishing','Zip-lining','#/activity/zip','Helicopter rides','#/activity/heli','History museum','#/activity/museum','Art galleries','#/activity/galleries','Movie theater','#/activity/movies','Bowling & arcade','#/activity/bowling'].reduce((o,cur,i,a)=>i%2?o:o+smallCard(a[i],a[i+1]),'')}</div></section>`},stay(){const chips=`<div class="chips" role="toolbar" aria-label="Lodging filters">${chip('price-$','$')}${chip('price-$$','$$')}${chip('price-$$$','$$$')}${chip('family-owned','Family-owned')}${chip('walkable','Walkable')}${chip('beachfront','Beachfront')}${chip('families','Best for families')}</div>`;const list=renderStayList();return `${crumbs([['Home','#/home'],['Places to Stay','#/stay']])}${h1('Places to Stay','From family-owned hotels and B&Bs to a four-star resort.')}<section class="section"><div class="row"><div class="kicker">Filters</div></div>${chips}</section><section class="section"><div id="stayList">${list}</div></section>`},stayDetail(id){const d=state.data.stays.find(s=>s.id===id);if(!d)return notFound();return `${crumbs([['Home','#/home'],['Places to Stay','#/stay'],[escapeHtml(d.name),'#']])}${h1(d.name,`${escapeHtml(d.location)} · ${escapeHtml(d.best)}`)}<div class="cols"><div class="stack"><div class="imgph">Photo placeholder</div><section class="section"><div class="row"><div class="kicker">At a glance</div></div><ul><li><b>Type:</b> ${escapeHtml(d.type||'B&B / Hotel')}</li><li><b>Price band:</b> ${escapeHtml(d.price)}</li><li><b>Best for:</b> ${escapeHtml(d.best)}</li><li><b>Location:</b> ${escapeHtml(d.location)}</li></ul></section><section class="section"><div class="row"><div class="kicker">Overview</div></div><p>${escapeHtml(d.overview)}</p></section><section class="section"><div class="row"><div class="kicker">Amenities</div></div><ul>${d.amenities.map(a=>`<li>${escapeHtml(a)}</li>`).join('')}</ul></section><section class="section"><div class="row"><div class="kicker">Getting there</div></div><p>Taxi from airport; city buses 5–11 within Taniti City.</p></section><section class="section"><div class="row"><div class="kicker">Accessibility</div></div><ul>${(d.access||['Contact property for details.']).map(a=>`<li>${escapeHtml(a)}</li>`).join('')}</ul></section><section class="section"><div class="row"><div class="kicker">Nearby</div></div><ul>${(d.nearby||[]).map(a=>`<li>${escapeHtml(a)}</li>`).join('')}</ul></section></div><aside class="stack"><section class="section"><div class="row"><div class="kicker">Book now</div></div><button class="btn primary js-book">Book →</button></section><section class="section"><div class="row"><div class="kicker">Tags</div></div><div class="chips">${[d.price,...d.tags].map(t=>pill(t)).join('')}</div></section></aside></div>`},dining(){const chips=`<div class="chips" role="toolbar" aria-label="Dining filters">${dchip('diet-vegetarian','Vegetarian')}${dchip('diet-vegan','Vegan')}${dchip('diet-gluten-free','Gluten-free')}${dchip('cui-local','Local fish & rice')}${dchip('cui-american','American-style')}${dchip('cui-pan-asian','Pan-Asian')}</div>`;const list=renderDiningList();return `${crumbs([['Home','#/home'],['Food & Dining','#/dining']])}${h1('Food & Dining','Ten restaurants across the island; local fish & rice, American-style, and Pan-Asian options.')}<section class="section"><div class="row"><div class="kicker">Filters</div></div>${chips}</section><section class="section"><div id="diningList">${list}</div></section>`},transport(){return `${crumbs([['Home','#/home'],['Getting Around','#/transport']])}${h1('Getting Around Taniti','Choose the best way to explore—bus, taxi, bike, or car.')}<section class="section"><div class="grid cols-3">${tile('City Buses','5 a.m.–11 p.m. daily; frequent stops in Taniti City.','#/transport/city-bus')}${tile('Private Buses (island)','Routes outside the city.','#/transport/private-bus')}${tile('Taxis','Readily available in Taniti City.','#/transport/taxis')}${tile('Rental Cars','Local agency near the airport.','#/transport/cars')}${tile('Bikes','Rentals from several vendors; helmets required.','#/transport/bikes')}${tile('From the Airport','Bus/taxi into the city; car rental next to terminal.','#/transport/airport')}</div></section><section class="section"><div class="row"><div class="kicker">Cruise arrivals</div></div><p>A small cruise ship docks in Yellow Leaf Bay one night per week.</p></section><section class="section"><div class="row"><div class="kicker">Safety nudge</div></div><p>Keep belongings secure in busy areas.</p></section>`},about(){return `${crumbs([['Home','#/home'],['About','#/about']])}${h1('About Taniti','A small Pacific island (<500 sq mi) with sandy and rocky beaches, a safe harbor, lush rainforest, and a mountainous interior with a small, active volcano.')}<section class="section"><ul><li><b>Population:</b> ~20,000 (indigenous).</li><li><b>Economy:</b> Historically fishing & agriculture; tourism growing.</li><li><b>Taniti City:</b> Native architecture; beaches around Yellow Leaf Bay.</li><li><b>What’s next:</b> Nine‑hole golf course expected to open next year.</li></ul></section>`},faqs(){const f=state.data.faqs;return `${crumbs([['Home','#/home'],['FAQs','#/faqs']])}${h1('FAQs','Quick answers and practical info.')}<section class="section"><div class="row"><div class="kicker">Top FAQs</div></div>${f.map(x=>`<div class="card"><div class="title">${escapeHtml(x.q)}</div><p class="muted">${escapeHtml(x.a)}</p><a href="${x.link}" class="btn link">Learn more →</a></div>`).join('')}</section><section class="section"><div class="row"><div class="kicker">Policies & Rules</div></div><ul><li>Alcohol not served from 12:00 a.m. to 9:00 a.m.</li><li>Drinking age 18 (not strictly enforced).</li><li>Helmets required when biking.</li><li>Holiday closures may impact hours; check ahead.</li></ul></section>`},contact(){return `${crumbs([['Home','#/home'],['Contact','#/contact']])}${h1('Contact','We\'re here to help.')}<section class="section"><div class="row"><div class="kicker">General Inquiry</div></div><div class="card"><div class="stack"><label>Name</label><input type="text" style="padding:12px;border:1px solid var(--line);border-radius:12px" placeholder="Your name" /><label>Email</label><input type="email" style="padding:12px;border:1px solid var(--line);border-radius:12px" placeholder="you@example.com" /><label>Message</label><textarea rows="4" style="padding:12px;border:1px solid var(--line);border-radius:12px"></textarea><button class="btn primary" type="button" onclick="alert('Message submitted (demo)')">Send</button></div></div></section><section class="section"><div class="row"><div class="kicker">Tours & Booking</div></div><div class="card"><p class="muted">Prefer to start a booking now?</p><button class="btn primary js-book" type="button">Open booking form</button><p class="mini">Demo only — no backend.</p></div></section>`},itinerary(id){const it=state.data.itineraries.find(x=>x.id===id);return it?`${crumbs([['Home','#/home'],['Itinerary','#/home']])}${h1(it.name,'Sketch of steps; click through as needed.')}<section class="section"><ol>${it.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol></section>`:notFound()},activity(slug){const d=state.data.activities[slug];return d?activityDetail(d):genericDetail('Activity','Placeholder activity')},area(slug){return'string'==typeof slug&&'merriton'===slug?`${crumbs([['Home','#/home'],['Things to Do','#/things'],['Merriton Landing','#/area/merriton']])}${h1('Merriton Landing','Lively area on the north side of Yellow Leaf Bay with nightlife and culture.')}<section class="section"><div class="row"><div class="kicker">Highlights</div></div><ul><li>Microbrewery</li><li>New dance club</li><li>Art galleries</li><li>Bowling</li><li>Arcade</li></ul></section><section class="section"><div class="row"><div class="kicker">Getting there</div></div><p>Walkable from central hotels; taxis readily available.</p></section><section class="section"><div class="row"><div class="kicker">Safety</div></div><p>Busy at night—keep valuables secure.</p></section>`:notFound()},transportDetail(slug){const map={'city-bus':{title:'City Buses',lines:['Service hours: 5 a.m.–11 p.m. in Taniti City.','Frequent stops connecting major areas.'],tips:['Have small change; check holiday schedules.'],actions:[['See route overview →','#/map']],tags:['Budget‑friendly','Frequent']},'private-bus':{title:'Private Buses (Island routes)',lines:['Connects areas outside Taniti City.','Check operator schedules.'],tips:['Limited evening service; confirm return times.'],actions:[['Contact operators →','#/contact']],tags:['Island travel']},taxis:{title:'Taxis',lines:['Readily available in Taniti City.'],tips:['Ask for fare estimate before ride.'],actions:[['Call a taxi →','#/extern/call']],tags:['Door‑to‑door']},cars:{title:'Rental Cars',lines:['Local agency near the airport.','Good for flexible day trips.'],tips:['Book ahead in busy weeks.'],actions:[['Contact rental agency →','#/extern/rental']],tags:['Flexible','Family']},bikes:{title:'Bike Rentals',lines:['Helmets required by law; rentals include helmets.'],tips:['City is fairly flat and walkable; bikes ideal for short hops.'],actions:[['Find rental vendors →','#/extern/bikes']],tags:['Active','Budget']},airport:{title:'From the Airport',lines:['Bus/taxi into Taniti City; car rental adjacent to terminal.'],tips:['Choose based on bags, party size, and arrival time.'],actions:[['See city buses →','#/transport/city-bus'],['Call taxi →','#/transport/taxis'],['Find car rental →','#/transport/cars']],tags:['Arrival','Tips']}};const d=map[slug];return d?transportDetail(d):notFound()}};
function activityCard(t,b,tg,href){return `<div class="card"><div class="imgph" role="img" aria-label="Activity image placeholder">Photo</div><div class="title">${escapeHtml(t)}</div><p class="muted mini">${escapeHtml(b)}</p><div class="chips">${tg.split('·').map(s=>pill(s.trim())).join('')}</div><div class="cta-row"><a href="${href}" class="btn">View details →</a></div></div>`}function smallCard(t,href){return `<div class="card"><div class="title">${escapeHtml(t)}</div><a href="${href}" class="btn link">View details →</a></div>`}function tile(t,b,href){return `<div class="card"><div class="title">${escapeHtml(t)}</div><p class="muted mini">${escapeHtml(b)}</p><a href="${href}" class="btn">Open →</a></div>`}function notFound(){return `${h1('Not found','The page you’re looking for isn’t here.')}`}function genericDetail(k,t){return `${crumbs([['Home','#/home'],[k,'#/'+k.toLowerCase()],[t,'#']])}${h1(t,'Detail page template')}<section class="section"><p>This is a placeholder detail page for the low‑fi prototype.</p></section>`}function activityDetail(d){return `${crumbs([['Home','#/home'],['Things to Do','#/things'],[escapeHtml(d.title),'#']])}${h1(d.title,`${escapeHtml(d.type)} · ${escapeHtml(d.best||'')}`)}<div class="cols"><div class="stack"><div class="imgph">Photo placeholder</div><section class="section"><div class="row"><div class="kicker">Overview</div></div><p>${escapeHtml(d.overview||'')}</p></section><section class="section"><div class="row"><div class="kicker">What to know</div></div><ul>${(d.know||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="section"><div class="row"><div class="kicker">Getting there</div></div><p>${escapeHtml(d.transport||'')}</p></section><section class="section"><div class="row"><div class="kicker">Accessibility</div></div><ul>${(d.access||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section></div><aside class="stack"><section class="section"><div class="row"><div class="kicker">Actions</div></div>${(d.actions||[]).map(a=>`<a href="${a[1]}" class="btn">${escapeHtml(a[0])}</a>`).join('')}</section><section class="section"><div class="row"><div class="kicker">Tags</div></div><div class="chips">${(d.tags||[]).map(t=>pill(t)).join('')}</div></section></aside></div>`}
/** Filter chip button (role=checkbox). */
function chip(key, label) {
  return `<button class="chip" role="checkbox" aria-checked="false" data-key="${key}">${label || key}</button>`;
}

/** Alias for chip() kept for backward compatibility. */
function dchip(key, label) {
  return chip(key, label);
}
/** Render stays list based on current filters (price bands and tags). */
function renderStayList() {
  const stays = state.data.stays;
  const f = state.filters.stay;

  // Filter by selected price bands and tags
  const items = stays.filter(item => {
    const pf = ['price-$', 'price-$$', 'price-$$$'].filter(k => f.has(k));
    const priceOK = pf.length ? pf.some(k => k.replace('price-', '') === item.price) : true;
    const tf = [...f].filter(k => !k.startsWith('price-'));
    const tagOK = tf.length ? tf.every(t => item.tags.includes(t)) : true;
    return priceOK && tagOK;
  });

  if (!items.length) {
    return `<div class="alert">No stays found. Clear a filter or try a different price band.</div>`;
  }

  return items
    .map(d => `
      <div class="card">
        <div class="title">${escapeHtml(d.name)}</div>
        <p class="muted mini">${escapeHtml(d.location)} · Tags: ${escapeHtml(d.tags.join(', '))}</p>
        <div class="chips">${[d.price, ...d.tags].map(t => pill(t)).join('')}</div>
        <div class="cta-row">
          <a href="#/stay/${d.id}" class="btn">View details →</a>
          <button class="btn primary js-book">Book →</button>
        </div>
      </div>
    `)
    .join('');
}
/** Render dining venues list based on cuisine/diet filters. */
function renderDiningList() {
  const venues = state.data.dining;
  const f = state.filters.dining;

  const hasDiet = [...f].filter(k => k.startsWith('diet-'));
  const hasCui = [...f].filter(k => k.startsWith('cui-'));

  function toDiet(k) {
    return { 'diet-vegetarian': 'vegetarian', 'diet-vegan': 'vegan', 'diet-gluten-free': 'gluten-free' }[k];
  }
  function toCui(k) {
    return { 'cui-local': 'local', 'cui-american': 'american', 'cui-pan-asian': 'pan-asian' }[k];
  }

  const items = venues.filter(d => {
    const dietOK = hasDiet.length ? hasDiet.every(k => d.diet.includes(toDiet(k))) : true;
    const cuiOK = hasCui.length ? hasCui.some(k => d.cuisines.includes(toCui(k))) : true;
    return dietOK && cuiOK;
  });

  if (!items.length) {
    return `<div class=\"alert\">No venues match all filters. Try fewer dietary restrictions or a wider area.</div>`;
  }

  return items
    .map(v => `
      <div class=\"card\">
        <div class=\"title\">${escapeHtml(v.name)}</div>
        <p class=\"muted mini\">Area: ${escapeHtml(v.area)}</p>
        <div class=\"chips\">${[v.price, ...v.cuisines.map(labelCuisine), ...v.diet.map(labelDiet)].map(t => pill(t)).join('')}</div>
        <div class=\"cta-row\">
          <a href=\"#/dining/${v.id}\" class=\"btn\">View details →</a>
          <button class=\"btn primary js-reserve\" type=\"button\">Call/Reserve →</button>
        </div>
      </div>
    `)
    .join('');
}
/** Human-friendly cuisine label. */
function labelCuisine(key) {
  const map = {
    local: 'Local fish & rice',
    american: 'American-style',
    'pan-asian': 'Pan-Asian',
  };
  return map[key] || key;
}

/** Human-friendly dietary label. */
function labelDiet(key) {
  const map = {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    'gluten-free': 'Gluten-free',
  };
  return map[key] || key;
}

// Fallback view for unknown routes
function renderNotFound() {
  return [
    crumbs([['Home', '#/home'], 'Not found']),
    h1('Page not found', 'The page you requested does not exist.'),
    '<div class="alert">Use the navigation to find available pages.</div>'
  ].join('');
}
/** Router: renders content for current hash route and wires up page-specific handlers. */
function router() {
  const h = location.hash || '#/home';
  setActiveNav(h);

  const parts = h.split('/');
  const route = parts[1];
  const slug = parts[2];

  let out = '';
  switch (route) {
    case 'home': out = Pages.home(); break;
    case 'plan': out = Pages.plan(); break;
    case 'things': out = slug ? Pages.things(slug) : Pages.things(); break;
    case 'stay': out = slug ? Pages.stayDetail(slug) : Pages.stay(); break;
    case 'dining': out = slug ? Pages.diningDetail(slug) : Pages.dining(); break;
    case 'transport': out = slug ? Pages.transportDetail(slug) : Pages.transport(); break;
    case 'about': out = Pages.about(); break;
    case 'faqs': out = Pages.faqs(); break;
    case 'contact': out = Pages.contact(); break;
    case 'itinerary': out = slug ? Pages.itinerary(slug) : Pages.itinerary(); break;
    case 'activity': out = slug ? Pages.activity(slug) : Pages.activity(); break;
    case 'area': out = slug ? Pages.area(slug) : Pages.area(); break;
    default: out = renderNotFound();
  }

  const app = qs('#app');
  app.innerHTML = out;
  app.focus();

  // Home page: ensure Merriton Landing CTA links to the dedicated page
  if ((h === '#/home') || h === '#/home/') {
    const merrCard = qsa('.card', app).find(c => c.querySelector('.title')?.textContent?.toLowerCase().includes('merriton'));
    if (merrCard) {
      const link = merrCard.querySelector('a.btn, button.btn');
      if (link) {
        link.setAttribute('href', '#/things/merriton');
        // In case it's a button or to override existing behavior
        link.addEventListener('click', (e) => {
          e.preventDefault();
          location.hash = '#/things/merriton';
          router();
        }, { once: false });
      }
    }

    // Normalize the Home page "Things to Do" CTA(s) to go to the very top of the Things page
    // Strategy 1: any CTA whose label mentions "Things to Do"
    const thingsCtas = qsa('a.btn, button.btn', app).filter(el => /things\s*to\s*do/i.test(el.textContent || ''));
    thingsCtas.forEach(link => {
      if (link.tagName === 'A') link.setAttribute('href', '#/things');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        location.hash = '#/things';
        router();
      }, { once: false });
    });

    // Strategy 2: find a card titled exactly "Things to Do" and normalize its main CTA
    const thingsCard = qsa('.card', app).find(c => (c.querySelector('.title')?.textContent?.trim().toLowerCase() === 'things to do'));
    if (thingsCard) {
      const link = thingsCard.querySelector('a.btn, button.btn');
      if (link) {
        if (link.tagName === 'A') link.setAttribute('href', '#/things');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          location.hash = '#/things';
          router();
        }, { once: false });
      }
    }
  }

  // If landing on Things index, force scroll to the very top after render
  if (route === 'things' && (!slug || slug === '')) {
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  // Wire Booking buttons in stays list
  qsa('.js-book', app).forEach(b => b.addEventListener('click', openBookingModal));
  // Wire Reserve buttons for dining
  qsa('.js-reserve', app).forEach(b => b.addEventListener('click', openReserveModal));

  // Wire filter chips for Lodging and Dining
  qsa('section .chip', app).forEach(ch => {
    // Lodging filters
    if (ch.closest('[aria-label="Lodging filters"]')) {
      ch.addEventListener('click', () => {
        const key = ch.dataset.key;
        const sel = ch.getAttribute('aria-checked') === 'true';
        ch.setAttribute('aria-checked', String(!sel));
        sel ? state.filters.stay.delete(key) : state.filters.stay.add(key);
        qs('#stayList').innerHTML = renderStayList();
        qsa('.js-book', qs('#stayList')).forEach(b => b.addEventListener('click', openBookingModal));
      });
    }
    // Dining filters
    if (ch.closest('[aria-label="Dining filters"]')) {
      ch.addEventListener('click', () => {
        const key = ch.dataset.key;
        const sel = ch.getAttribute('aria-checked') === 'true';
        ch.setAttribute('aria-checked', String(!sel));
        sel ? state.filters.dining.delete(key) : state.filters.dining.add(key);
        qs('#diningList').innerHTML = renderDiningList();
        qsa('.js-reserve', qs('#diningList')).forEach(b => b.addEventListener('click', openReserveModal));
      });
    }
  });

  // FAQs accordion toggle wiring
  qsa('.accordion .acc-toggle', app).forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = btn.nextElementSibling;
      if (panel) {
        if (expanded) panel.setAttribute('hidden', '');
        else panel.removeAttribute('hidden');
      }
    });
  });

  // Contact form binding (no booking on contact page)
  const ctBtn = qs('#ct-submit', app);
  if (ctBtn && !ctBtn.dataset.bound) {
    ctBtn.dataset.bound = '1';
    ctBtn.addEventListener('click', () => {
      const name = qs('#ct-name')?.value.trim();
      const email = qs('#ct-email')?.value.trim();
      const subject = qs('#ct-subject')?.value.trim();
      const message = qs('#ct-message')?.value.trim();
      if (!name || !email || !message) {
        alert('Please fill in your name, email, and message.');
        return;
      }
      alert(`Thanks, ${name}! We received your message about "${subject || 'your trip'}". We'll reply to ${email}. (Demo)`);
      ['#ct-name', '#ct-email', '#ct-subject', '#ct-message'].forEach(sel => {
        const el = qs(sel);
        if (el) el.value = '';
      });
      qs('#ct-name')?.focus();
    });
  }
}
/** Load JSON data for the app with a minimal inline fallback on failure. */
async function loadData() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed');
    state.data = await res.json();
  } catch (e) {
    if (fallbackData) {
      state.data = fallbackData;
    } else {
      alert(
        'Failed to load data.json. If you opened index.html via file://, some browsers block local fetch. Consider serving locally or hosting. Using minimal inline data.'
      );
      state.data = { itineraries: [], dining: [], stays: [], faqs: [], activities: {} };
    }
  }
}
// App bootstrap and routing updates
window.addEventListener('DOMContentLoaded', async () => {
  bindMobileMenu();
  bindBookingModalControls();
  bindReserveModalControls();
  await loadData();
  router();
});

window.addEventListener('hashchange', router);


// Override Contact page to split into form and office info and remove booking ctas
Pages.contact = function contactPage() {
  return [
    crumbs([['Home', '#/home'], 'Contact']),
    h1('Contact Taniti Tourism', 'We\'re here to help plan your trip.'),
    `
    <div class="cols contact-form">
      <section class="section" aria-label="Contact form">
        <div class="card">
          <div class="title">Send us a message</div>
          <div class="stack">
            <div class="grid cols-2">
              <div class="stack">
                <label for="ct-name">Full name</label>
                <input id="ct-name" class="form-control" type="text" placeholder="e.g., Jamie Chen" />
              </div>
              <div class="stack">
                <label for="ct-email">Email</label>
                <input id="ct-email" class="form-control" type="email" placeholder="you@example.com" />
              </div>
            </div>

            <div class="stack">
              <label for="ct-subject">Subject</label>
              <input id="ct-subject" class="form-control" type="text" placeholder="Trip planning question" />
            </div>

            <div class="stack">
              <label for="ct-message">Message</label>
              <textarea id="ct-message" class="form-control" rows="8" placeholder="Tell us about your plans, dates, and interests..."></textarea>
              <p class="mini">Our team typically replies within one business day.</p>
            </div>

            <div class="cta-row" style="margin-top: 4px;">
              <button id="ct-submit" class="btn primary" type="button">Send message</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="section" aria-label="Travel office info">
        <div class="card">
          <div class="title">Travel Office</div>
          <p>Taniti Tourism Board</p>
          <p class="mini">Harborfront District, 22 Coral Way<br/>Taniti City, 96960</p>
          <p><strong>Phone:</strong> +1 (808) 555‑0149</p>
          <p><strong>Email:</strong> hello@visit-taniti.example</p>
          <p><strong>Hours:</strong> Mon–Fri 9:00–17:00 (TST)</p>
          <hr/>
          <div class="title">Visitor Support</div>
          <p><strong>On‑island assistance:</strong> +1 (808) 555‑0199 (24/7)</p>
          <p><strong>Media/press:</strong> press@visit-taniti.example</p>
          <p><strong>Social:</strong> <a href="#/extern/social">@VisitTaniti</a></p>
        </div>
      </aside>
    </div>
    `
  ].join('');
};


// Override Things to Do page to support dedicated category pages (e.g., Beaches)
Pages.things = function thingsPage(slug) {
  // Delegate old path compatibility: #/things/activity should show the Activity index
  if (slug === 'activity') {
    return Pages.activity();
  }

  // Index view (no slug): show available categories, including Beaches
  if (!slug) {
    const d = state.data || {};
    const acts = (d.activities) || {};
    const order = ['volcano', 'rainforest', 'museum'];
    const featured = order
      .map(k => acts[k] ? { id: k, ...acts[k] } : null)
      .filter(Boolean);
    const more = Array.isArray(d.otherActivities) ? d.otherActivities : [];

    const featuredHtml = featured.length ? `
      <section class="section">
        <div class="kicker">Featured activities</div>
        <div class="list">
          ${featured.map(a => card(
            a.title || 'Activity',
            `<p class="muted mini">${escapeHtml(a.type || '')}${a.best ? ' · ' + escapeHtml(a.best) : ''}</p>
             <p>${escapeHtml(a.overview || 'Learn more about this activity on Taniti.')}</p>
             <div class="chips">${Array.isArray(a.tags) ? a.tags.map(t => pill(t)).join('') : ''}</div>`,
            `<div class="cta-row"><a class="btn" href="#/activity/${escapeHtml(a.id)}">View details →</a></div>`
          )).join('')}
        </div>
      </section>
    ` : '';

    const moreHtml = more.length ? `
      <section class="section">
        <div class="kicker">More things to do</div>
        <div class="grid cols-3">
          ${more.map(m => card(m.title || 'Activity', '', `<div class="cta-row"><a class="btn" href="${escapeHtml(m.href || '#/activity')}">Explore →</a></div>`)).join('')}
        </div>
      </section>
    ` : '';

    return [
      crumbs([["Home", "#/home"], "Things to Do"]),
      h1("Things to Do", "Find ideas for your time on Taniti."),
      `
      <section class="section">
        <div class="list">
          ${card('Beaches', '<p class="muted">Sunbathe, swim, and watch sunsets on our best shores.</p>', '<div class="cta-row"><a href="#/things/beaches" class="btn">Explore beaches →</a></div>')}
          ${card('Merriton Landing (Nightlife District)', '<p class="muted">Pubs and a microbrewery, a late‑night club, small galleries, plus bowling and an arcade — all in one walkable waterfront area.</p>', '<div class="cta-row"><a href="#/things/merriton" class="btn">Explore Merriton Landing →</a></div>')}
        </div>
      </section>
      ${featuredHtml}
      ${moreHtml}
      `
    ].join('');
  }

  // Dedicated Beaches page
  if (slug === 'beaches') {
    return [
      crumbs([["Home", "#/home"], ["Things to Do", "#/things"], "Beaches"]),
      h1("Beaches", "Across calm lagoons and surf‑ready coasts, there’s a beach for everyone."),
      `
      <section class="section detail">
        <div class="grid cols-2">
          <div>
            ${card('North Cove', '<div class="imgph">Photo</div><p>Family‑friendly cove with gentle water and tide pools. Lifeguard on weekends.</p><p class="mini">Amenities: Restrooms · Shade · Snacks</p>')}
            ${card('Sunset Strand', '<div class="imgph">Photo</div><p>Long, west‑facing beach perfect for evening walks and golden‑hour views.</p><p class="mini">Best time: 5–7pm</p>')}
            ${card('Coral Point', '<div class="imgph">Photo</div><p>Clear water and snorkel spots near the reef. Check tides and wear reef‑safe sunscreen.</p><p class="mini">Skill: Beginner–Intermediate</p>')}
          </div>
          <aside>
            <div class="card">
              <div class="title">Tips for a great day</div>
              <ul class="mini">
                <li>Arrive early for parking on weekends.</li>
                <li>Reef‑safe sunscreen protects marine life.</li>
                <li>Observe flags and lifeguard guidance.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
      `
    ].join('');
  }

  // Merriton Landing page
  if (slug === 'merriton' || slug === 'merriton-landing') {
    return [
      crumbs([["Home", "#/home"], ["Things to Do", "#/things"], "Merriton Landing (Nightlife District)"]),
      h1("Merriton Landing (Nightlife District)", "Waterfront nightlife and entertainment in Taniti City."),
      `
      <section class="section detail">
        <div class="grid cols-2">
          <div>
            ${card('Overview', '<div class="imgph">Map/Photo</div><p>Merriton Landing is Taniti City\'s waterfront nightlife district with walkable choices for every mood: pubs and a microbrewery, a late‑night club, small galleries, plus bowling and an arcade.</p>')}
            ${card('What you\'ll find', '<ul class="mini"><li>Pubs & microbrewery</li><li>Late‑night club</li><li>Galleries</li><li>Bowling & arcade</li></ul>')}
          </div>
          <aside>
            <div class="card">
              <div class="title">Tips</div>
              <ul class="mini">
                <li>Most venues may be 18+ after certain hours — bring a valid ID.</li>
                <li>Quiet hours are 12:00 a.m.–9:00 a.m.; plan returns accordingly.</li>
                <li>Buses run 5 a.m.–11 p.m.; use taxis or rides after hours.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
      `
    ].join('');
  }
  
  // Unknown subcategory under Things to Do
  return [
    crumbs([["Home", "#/home"], ["Things to Do", "#/things"], 'Not found']),
    h1('Not found', 'That category is not available yet.'),
    '<div class="alert">Try Beaches or browse all Activities.</div>'
  ].join('');
};

// Override Activities to keep previous index but add dedicated pages for each slug
(function(){
  const originalActivity = Pages.activity;
  function humanizeSlug(s){
    return String(s || '')
      .replace(/\s+/g,'-')
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g,'')
      .split('-')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  Pages.activity = function activityOverride(slug){
    // No slug: keep the previous Activities index unchanged
    if (!slug) return originalActivity();

    const title = humanizeSlug(slug) || 'Activity';
    const subtitle = `Plan your ${title.toLowerCase()} on Taniti.`;

    // Simple dedicated page per activity slug (no back/browse buttons per request)
    return [
      crumbs([["Home", "#/home"], ["Things to Do", "#/things"], title]),
      h1(title, subtitle),
      `
      <section class="section detail">
        <div class="grid cols-2">
          <div>
            ${card(title + ' Overview', '<div class="imgph">Photo</div><p>Discover the best spots, tips, and local guidance for ' + escapeHtml(title.toLowerCase()) + '.</p>')}
            ${card('Getting Started', '<p>Recommended time: 2–4 hours.</p><p class="mini">Bring water, sun protection, and comfortable footwear.</p>')}
            ${card('Safety & Etiquette', '<ul class="mini"><li>Follow posted guidelines and respect local customs.</li><li>Pack out what you pack in.</li><li>Consider guided options if new to this activity.</li></ul>')}
          </div>
          <aside>
            <div class="card">
              <div class="title">Good to know</div>
              <ul class="mini">
                <li>Seasonality may affect availability.</li>
                <li>Weather can change quickly; check the forecast.</li>
                <li>Local operators can provide gear and lessons.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
      `
    ].join('');
  };
})();

// Override Quick Itineraries pages with richer content and booking
function linkifyItineraryStep(text) {
  const s = String(text || '');
  const lower = s.toLowerCase();
  // Map known patterns to routes; if matched, make the whole step a link.
  const map = [
    { re: /\bbeach(es)?\b/, href: '#/things/beaches' },
    { re: /\brainforest(\s*walk)?\b/, href: '#/activity/rainforest' },
    { re: /\bvolcano(\s*viewpoint)?\b/, href: '#/activity/volcano' },
    { re: /\bmerriton(\s*landing)?\b/, href: '#/things/merriton' },
    { re: /\bmuseum\b/, href: '#/activity/museum' },
    { re: /\bgalleries\b/, href: '#/activity/galleries' },
    { re: /\bmovie(s)?(\s*theater)?\b/, href: '#/activity/movies' },
    { re: /\bsnorkel(ing)?\b/, href: '#/activity/snorkeling' },
    { re: /\bfishing|chartered\s*fishing\b/, href: '#/activity/fishing' },
    { re: /\bzip(-|\s*)lining|zip\b/, href: '#/activity/zip' },
    { re: /\bhelicopter(\s*rides?)?\b/, href: '#/activity/heli' },
    { re: /\bbowling(\s*&\s*arcade)?|arcade\b/, href: '#/activity/bowling' },
    { re: /\blocal\s*fish\s*&\s*rice\b/, href: '#/dining' },
    { re: /\blocal\s*food\b/, href: '#/dining' },
    { re: /\b(food|dining|eat|restaurant[s]?)\b/, href: '#/dining' }
  ];
  const match = map.find(m => m.re.test(lower));
  const safe = escapeHtml(s);
  if (!match) return safe;
  return `<a href="${match.href}">${safe}</a>`;
}
Pages.itinerary = function itineraryPage(slug) {
  const d = state.data || { itineraries: [] };
  const list = Array.isArray(d.itineraries) ? d.itineraries : [];

  // Index view: list all quick itineraries
  if (!slug) {
    return [
      crumbs([["Home", "#/home"], "Quick Itineraries"]),
      h1("Quick Itineraries", "Jump-start your trip with ready-made mini plans."),
      `
      <section class="section">
        <div class="grid cols-3">
          ${list.map(it => card(
            it.name || 'Itinerary',
            `<p class="muted mini">${(it.steps || []).length} stops · 1–5 days</p>
             ${it.steps && it.steps.length ? `<ul class="mini">${it.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}`,
            `<div class="cta-row">
               <a class="btn" href="#/itinerary/${escapeHtml(it.id)}">View details →</a>
               <button class="btn primary js-book" type="button">Book →</button>
             </div>`
          )).join('')}
        </div>
      </section>
      `
    ].join('');
  }

  // Detail page for a specific itinerary
  const it = list.find(x => String(x.id) === String(slug));
  if (!it) {
    return [
      crumbs([["Home", "#/home"], ["Quick Itineraries", "#/itinerary"], 'Not found']),
      h1('Itinerary not found', 'Try another quick itinerary.'),
      '<div class="alert">Use the Quick Itineraries index to choose an available plan.</div>'
    ].join('');
  }

  const name = it.name || 'Itinerary';
  const steps = Array.isArray(it.steps) ? it.steps : [];
  const dayList = steps.map((s, i) => card(
    `Day ${i + 1}`,
    `<p>${linkifyItineraryStep(s)}</p>`
  )).join('');

  // As required: breadcrumb for each such page should be Home › Quick Itineraries
  return [
    crumbs([["Home", "#/home"], "Quick Itineraries"]),
    h1(name, 'A compact plan you can follow at your own pace.'),
    `
    <section class="section detail">
      <div class="grid cols-2">
        <div>
          ${card(name + ' Overview', '<div class="imgph">Photo</div><p>This quick itinerary highlights top experiences in a short timeframe. Great for first-time visitors who want a balanced mix.</p><p class="mini">You can reorder or swap stops as you like.</p>')}
          <div class="list">${dayList}</div>
        </div>
        <aside>
          ${card('What to expect', '<ul class="mini"><li>Easy logistics with walkable or short rides.</li><li>Popular stops suited to most travelers.</li><li>Options to add dining and relaxation time.</li></ul>')}
          ${card(name, '<p class="mini">Ready to reserve lodging that fits this plan?</p>', '<div class="cta-row"><button class="btn primary js-book" type="button">Book this itinerary →</button></div>')}
        </aside>
      </div>
    </section>
    `
  ].join('');
};

// Dining detail pages: dedicated view for each venue id
Pages.diningDetail = function diningDetailPage(slug) {
  const d = state.data || { dining: [] };
  const list = Array.isArray(d.dining) ? d.dining : [];
  const v = list.find(x => String(x.id) === String(slug));

  if (!v) {
    return [
      crumbs([["Home", "#/home"], ["Food & Dining", "#/dining"], 'Not found']),
      h1('Dining place not found', 'Try another Food & Dining option.'),
      '<div class="alert">Use the Food & Dining index to choose an available place.</div>'
    ].join('');
  }

  const title = v.name || 'Dining';
  const cuisines = Array.isArray(v.cuisines) ? v.cuisines.map(labelCuisine) : [];
  const diet = Array.isArray(v.diet) ? v.diet.map(labelDiet) : [];
  const price = v.price ? [v.price] : [];
  const chips = [...price, ...cuisines, ...diet].map(t => pill(t)).join('');
  const phone = '+1 (808) 555‑0123'; // demo number
  const area = v.area ? `Area: ${escapeHtml(v.area)}` : '';

  return [
    crumbs([["Home", "#/home"], ["Food & Dining", "#/dining"], title]),
    h1(title, 'Details, hours, and quick reservation options.'),
    `
    <section class="section detail">
      <div class="grid cols-2">
        <div>
          ${card('Overview', '<div class="imgph">Photo</div>' + `<p class="muted mini">${area}</p>` + `<p>Enjoy ${escapeHtml(title)} — a ${escapeHtml((cuisines[0] || '').toLowerCase() || 'local')} spot known for fresh flavors and friendly service.</p>` + `<div class="chips">${chips}</div>`)}
          ${card('Good to know', `<ul class="mini">${diet.length ? `<li>Dietary options: ${escapeHtml(diet.join(', '))}</li>` : ''}<li>Typical price: ${escapeHtml(v.price || '$$')}</li><li>Peak hours: 6–8 p.m.</li></ul>`)}
        </div>
        <aside>
          ${card('Make a reservation', `<p class="mini">Prefer to call? <a href="tel:+18085550123">${escapeHtml(phone)}</a></p>`, `<div class="cta-row"><button class="btn primary js-reserve" type="button">Reserve →</button></div>`)}
          ${card('Location & hours', `<ul class="mini"><li>${area || 'Taniti City'}</li><li>Open daily 11:00–22:00</li><li>Walkable and taxi‑friendly</li></ul>`)}
        </aside>
      </div>
    </section>
    `
  ].join('');
};


// Getting Around (Transport) pages: index and per-type details
Pages.transport = function transportPage() {
  const cards = [
    { id: 'bus', title: 'City Buses', desc: 'Affordable routes between the airport, Taniti City, and main districts (5 a.m.–11 p.m.).' },
    { id: 'taxi', title: 'Taxis', desc: 'Available day and night in the city; handy after bus hours or for direct rides.' },
    { id: 'rental', title: 'Rental Cars', desc: 'Best for exploring beyond the city and visiting remote beaches or viewpoints.' },
    { id: 'bike', title: 'Bicycles', desc: 'Flat seaside paths and short hops around town; several rental shops.' },
    { id: 'walk', title: 'Walking', desc: 'Walkable districts with waterfront promenades and shaded streets.' },
  ];
  return [
    crumbs([["Home", "#/home"], "Getting Around"]),
    h1("Getting Around", "Find the best way to travel across Taniti."),
    `
    <section class="section">
      <div class="grid cols-3">
        ${cards.map(c => card(c.title, `<p class="muted">${escapeHtml(c.desc)}</p>`, `<div class=\"cta-row\"><a class=\"btn\" href=\"#/transport/${c.id}\">Learn more →</a></div>`)).join('')}
      </div>
    </section>
    `
  ].join('');
};

Pages.transportDetail = function transportDetailPage(slug) {
  const map = {
    bus: {
      title: 'City Buses',
      body: '<p>Buses run 5 a.m.–11 p.m. with posted stops across Taniti City, Merriton Landing, and beach areas.</p><ul class="mini"><li>Buy tickets on board (cash/card)</li><li>Accessible low-floor buses on main lines</li><li>Service every 15–30 minutes</li></ul>'
    },
    taxi: {
      title: 'Taxis',
      body: '<p>Taxis are available throughout the day and night. Find stands near the harbor and popular districts.</p><ul class="mini"><li>Metered fares</li><li>Call-ahead recommended late at night</li><li>Great after bus hours</li></ul>'
    },
    rental: {
      title: 'Rental Cars',
      body: '<p>Car rentals are available at the airport and in Taniti City.</p><ul class="mini"><li>International driver\'s license may be required</li><li>Parking is limited in busy areas</li><li>Best freedom to reach remote beaches</li></ul>'
    },
    bike: {
      title: 'Bicycles',
      body: '<p>Rent a bike for short trips and scenic rides.</p><ul class="mini"><li>Helmets recommended</li><li>Stay alert for mixed traffic</li><li>Waterfront paths are family-friendly</li></ul>'
    },
    walk: {
      title: 'Walking',
      body: '<p>Many districts are compact and walkable.</p><ul class="mini"><li>Evening promenades by the waterfront</li><li>Use crosswalks and mind scooters</li><li>Carry water and sun protection</li></ul>'
    }
  };
  const info = map[slug];
  if (!info) {
    return [
      crumbs([["Home", "#/home"], ["Getting Around", "#/transport"], 'Not found']),
      h1('Not found', 'That transport option is not available yet.'),
      '<div class="alert">Try Buses, Taxis, Rental Cars, Bicycles, or Walking.</div>'
    ].join('');
  }
  return [
    crumbs([["Home", "#/home"], ["Getting Around", "#/transport"], info.title]),
    h1(info.title, 'How to use this option on Taniti.'),
    `
    <section class="section detail">
      <div class="grid cols-2">
        <div>
          ${card('Overview', '<div class="imgph">Map/Photo</div>' + info.body)}
        </div>
        <aside>
          ${card('Tips', '<ul class="mini"><li>Peak hours can affect travel times.</li><li>Keep small bills for fares and tips.</li><li>Plan return after quiet hours.</li></ul>')}
        </aside>
      </div>
    </section>
    `
  ].join('');
};

// FAQs: render as accordion and remove learn-more links
Pages.faqs = function faqsPage() {
  const list = (state.data && Array.isArray(state.data.faqs)) ? state.data.faqs : [];
  const items = list.map((f, i) => {
    const q = escapeHtml(f.q || 'Question');
    const a = escapeHtml(f.a || 'Answer');
    const id = `faq-${i}`;
    return `
      <div class="item">
        <button class="acc-toggle" aria-expanded="false" aria-controls="${id}">${q}</button>
        <div id="${id}" class="acc-panel" hidden>
          <p>${a}</p>
        </div>
      </div>
    `;
  }).join('');
  return [
    crumbs([["Home", "#/home"], 'FAQs']),
    h1('Frequently Asked Questions', 'Quick answers to common questions.'),
    `<section class="section"><div class="accordion">${items}</div></section>`
  ].join('');
};


// Override About page: expand with island overview, culture, climate, and practical info
Pages.about = function aboutPage() {
  return [
    crumbs([["Home", "#/home"], "About"]),
    h1("About Taniti", "Quick facts about the island, culture, and practical info."),
    `
    <section class="section detail">
      <div class="grid cols-2">
        <div>
          ${card('Island at a glance', '<div class="imgph">Map/Photo</div><p>Taniti is a small island nation with a lively harbor city, quiet beach towns, and a rainforest interior. Visitors come for beaches, culture, and easygoing island life.</p>')}
          ${card('Culture & language', '<ul class="mini"><li><strong>Language:</strong> Many younger Tanitians speak English, especially in the city; you may hear the Tanitian language in rural areas.</li><li><strong>Customs:</strong> Casual dress is common. Please respect posted guidance at cultural sites and nature areas.</li><li><strong>Quiet hours:</strong> 12:00 a.m.–9:00 a.m. (some venues observe reduced noise/service).</li><li><strong>Holidays:</strong> Some attractions and services may be limited on national holidays.</li></ul>')}
          ${card('Climate & seasons', '<p>Tropical climate with warm temperatures year‑round. Short rain showers are common; evenings are pleasant for waterfront walks.</p><ul class="mini"><li>Pack sun protection and light rain layers.</li><li>Reef‑safe sunscreen is encouraged.</li></ul>')}
        </div>
        <aside>
          ${card('Practical info', '<ul class="mini"><li><strong>Currency:</strong> USD; many places accept cards. Banks exchange major currencies.</li><li><strong>Power:</strong> 120V U.S.‑standard outlets; most North American plugs fit.</li><li><strong>Drinking age:</strong> 18. Alcohol typically not served 12:00 a.m.–9:00 a.m.</li><li><strong>Transport:</strong> Buses 5 a.m.–11 p.m.; taxis available late. See <a href="#/transport">Getting Around</a>.</li><li><strong>Connectivity:</strong> Wi‑Fi is common in hotels and cafes.</li></ul>')}
          ${card('Plan your visit', '<p class="mini">Ready to explore itineraries or pick activities?</p>', '<div class="cta-row"><a class="btn" href="#/plan">Start planning →</a><a class="btn" href="#/things">Browse Things to Do →</a></div>')}
        </aside>
      </div>
    </section>
    `
  ].join('');
};
