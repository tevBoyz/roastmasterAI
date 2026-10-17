import { calculateRoast, parseTime, formatTime, csvEscape, formatChatMarkdown } from './lib.js';

const KEY = 'roastmaster-pilot-v1';
const LESSONS = [
  {
    id: 'foundations', number: '01', icon: '◎', duration: '7 min', title: 'The roasting journey',
    summary: 'Understand what changes when green coffee becomes roasted coffee.',
    paragraphs: [
      'Roasting is a controlled transformation of green coffee using heat. It drives off water, expands the bean, changes its structure and creates hundreds of aroma and flavor compounds.',
      'A useful roast record begins with green-coffee observations and ends with tasting. Temperature readings, bean color, smell and cracking sounds all offer information, but each can be affected by your machine and measuring method.',
      'The stages often called drying, Maillard and development are useful teaching tools. Their physical and chemical processes overlap rather than switching on and off at exact temperatures.'
    ],
    points: ['Roasting transforms bean chemistry and structure.', 'Record what you observe, not only the temperature.', 'Use cupping to assess the roast outcome.'],
    quiz: { q: 'Which is the best way to judge whether a roast achieved its flavor goal?', options: ['Only the final bean temperature', 'The cup evaluation together with consistent roast data', 'Only the number of minutes in the roast'], answer: 1, explain: 'A roast curve is a tool. Sensory evaluation checks whether the flavor target was reached.' }
  },
  {
    id: 'green', number: '02', icon: '◈', duration: '8 min', title: 'Understand green coffee',
    summary: 'Learn how moisture, density, processing and bean size affect behavior.',
    paragraphs: [
      'Green coffee moisture, density, screen size, age and processing method influence heat absorption and roast consistency. Moisture loss and heat movement do not happen at exactly the same speed in every coffee.',
      'Denser coffees can behave differently from lower-density coffees, but there is no single roast profile that applies to every lot based on density alone. Processing influences flavor potential and physical behavior without providing a deterministic recipe.',
      'Measure and record what you can. Follow the actual instrument instructions for moisture testing, sampling quantities and calibration. Do not assume an identical gram count works for every meter.'
    ],
    points: ['Check green-bean condition before every batch.', 'Measure moisture using the instrument manual.', 'Compare similar coffees while changing one factor at a time.'],
    quiz: { q: 'Is processing method alone enough to calculate ideal gas settings?', options: ['Yes, it sets the gas automatically', 'No, the coffee and machine must be observed together', 'Yes, for natural coffee only'], answer: 1, explain: 'Machine behavior, batch, moisture and desired flavor all influence the roast.' }
  },
  {
    id: 'drying', number: '03', icon: '☀', duration: '8 min', title: 'The drying phase',
    summary: 'Moisture evaporation, bean warming and the approach to yellowing.',
    paragraphs: [
      'The initial phase begins after charging the drum. Heat transfers into the beans, moisture is driven off, and the beans gradually lose their green appearance. Many roasters use visible yellowing as a practical milestone.',
      'The temperature displayed on your probe depends on probe placement, bean contact, airflow and other conditions. Therefore a yellowing temperature from another machine is not necessarily a transferable setpoint.',
      'Record the time and observed appearance of yellowing, along with gas and airflow changes. Compare batches of the same coffee to learn whether your initial conditions are repeatable.'
    ],
    points: ['Track charge and turning point without forcing target numbers.', 'Yellowing is an observable milestone, not a universal temperature.', 'Keep initial conditions repeatable.'],
    quiz: { q: 'What is a useful observable milestone near the end of early drying?', options: ['Visible bean yellowing', 'The roasted coffee resting overnight', 'Cupping score'], answer: 0, explain: 'Yellowing is a common operational marker; its precise time varies.' }
  },
  {
    id: 'maillard', number: '04', icon: '✶', duration: '9 min', title: 'Maillard and browning',
    summary: 'How heat helps create the flavors and aromas we associate with coffee.',
    paragraphs: [
      'Maillard reactions occur between amino compounds and reducing sugars and contribute strongly to browning, aroma and flavor. These reactions overlap with caramelization, pyrolysis and other thermal processes.',
      'Roasters often describe a middle phase between yellowing and first crack. The time spent in this region can affect perceived sweetness, aroma and balance, but it is not a magic percentage to hit for every coffee.',
      'Keep notes on color, smell, progression and heat adjustments. If flavor is dull or harsh, compare complete profiles and cupping results before blaming one stage alone.'
    ],
    points: ['Maillard is a group of reactions, not a switch.', 'Browning and aroma provide practical clues.', 'Avoid treating any stage duration as a universal target.'],
    quiz: { q: 'Which ingredients participate directly in Maillard reactions?', options: ['Amino compounds and reducing sugars', 'Only moisture and air', 'Only caffeine'], answer: 0, explain: 'Maillard chemistry involves amino compounds and reducing sugars.' }
  },
  {
    id: 'crack', number: '05', icon: '✷', duration: '10 min', title: 'First crack and development',
    summary: 'Interpret the sounds, development time and DTR without myths.',
    paragraphs: [
      'First crack is a set of popping or cracking sounds that occurs as internal stresses and pressure change the coffee bean structure. It is one practical transition marker, not an identical temperature for all machines.',
      'Development time is the interval from first crack start to the end of roasting. Development time ratio (DTR) equals development time divided by total time, multiplied by 100.',
      'Example: with first crack at 08:30 and drop at 10:00, development is 01:30 and DTR is 15%. DTR describes a timing relationship; it does not by itself determine cup quality or roast level.'
    ],
    points: ['Listen for the onset of first crack and note when it begins.', 'Compute DTR from observed times.', 'Judge development with taste, not one fixed percentage.'],
    quiz: { q: 'First crack at 8:30 and drop at 10:00 gives what DTR?', options: ['8.5%', '15%', '20%'], answer: 1, explain: '1:30 (90 seconds) divided by 10:00 (600 seconds) equals 15%.' }
  },
  {
    id: 'transfer', number: '06', icon: '♨', duration: '11 min', title: 'Heat transfer and RoR',
    summary: 'Conduction, convection, radiation, airflow and rate of rise.',
    paragraphs: [
      'Heat reaches beans through contact with hot surfaces (conduction), moving heated air (convection), and radiation. The mixture depends on the drum, burner, air path, batch size and equipment design.',
      'Rate of rise (RoR) describes how quickly a measured temperature changes with time, typically degrees per minute. RoR readings reflect probe lag, filtering, sampling interval and other instrument behavior.',
      'Gas, airflow and drum speed interact. More gas or more airflow does not always cause a simple predictable effect on the bean-temperature curve. Make modest, deliberate changes and log what happened.'
    ],
    points: ['Understand all three heat-transfer pathways.', 'RoR is a derivative of a measured curve, not bean chemistry itself.', 'Small measured changes beat guessing.'],
    quiz: { q: 'What does RoR describe?', options: ['How fast the measured temperature changes over time', 'How fast roasted beans lose caffeine', 'The weight of the batch'], answer: 0, explain: 'RoR is the temperature change rate, often reported as degrees per minute.' }
  },
  {
    id: 'defects', number: '07', icon: '⚑', duration: '10 min', title: 'Roast defects and diagnosis',
    summary: 'Recognize signs of scorching, tipping, unevenness and flat cups.',
    paragraphs: [
      'Scorching and tipping can appear as localized dark marks or damaged tips. They may be associated with intense local heating, surface contact and other variables. Visual evidence should be combined with a roast record.',
      'A flat, papery or dull cup is sometimes called baked, but the flavor alone cannot prove a specific curve problem. Investigate airflow, heat management, stalls, batch consistency and green-coffee quality.',
      'For reliable diagnosis, roast a control batch, change one variable at a time, record milestones and cup blind if practical. If an unsafe equipment fault is suspected, stop and use a qualified technician.'
    ],
    points: ['Separate symptoms from confirmed causes.', 'Compare repeatable control roasts.', 'Safety faults are not opportunities for experimental repairs.'],
    quiz: { q: 'What is the strongest approach to diagnosing a roast defect?', options: ['Change gas, airflow and drum speed all at once', 'Compare a control batch and change one factor', 'Assume every dark tip means the same error'], answer: 1, explain: 'Controlled comparisons help you identify likely causes.' }
  },
  {
    id: 'cupping', number: '08', icon: '♧', duration: '9 min', title: 'Cupping and improvement',
    summary: 'Use sensory notes and your logbook to learn from each batch.',
    paragraphs: [
      'A roast profile is useful when it helps you repeat or improve a specific flavor result. Coffee should be evaluated after appropriate rest and with a consistent tasting or cupping procedure.',
      'Track perceived acidity, sweetness, body, bitterness, aroma, aftertaste and defect notes. Use consistent dose, grind, water, temperature and tasting order so the roast is not confused with changes in brewing.',
      'Record one improvement hypothesis for the next batch. A meaningful experiment starts with a clear question, a baseline and a measurable outcome.'
    ],
    points: ['Use consistent cupping conditions.', 'Record both what worked and what did not.', 'Write one specific hypothesis for the next roast.'],
    quiz: { q: 'Why use a consistent cupping method?', options: ['To remove all flavor differences between coffees', 'To reduce unrelated variables when comparing roasts', 'To make all coffees taste darker'], answer: 1, explain: 'Controlled tasting makes comparisons more informative.' }
  }
];

const ISSUES = [
  { title: 'Burner will not ignite', category: 'GAS & SAFETY', content: 'Do not make repeated ignition attempts. If you smell gas, avoid sparks and switches, leave the area as needed and contact qualified help. When there is no emergency, record any alarm lights or messages and consult the Kuban manual for approved operator checks. Do not bypass flame sensors, valves or other interlocks.' },
  { title: 'Drum does not rotate', category: 'MECHANICAL', content: 'Stop roasting safely. Do not touch a hot or moving drum. After complete safe shutdown, check for visible obstructions only if permitted by the manual. A drive motor, electrical or mechanical fault needs a qualified technician. Do not open energized panels.' },
  { title: 'Unexpected temperature decline', category: 'ROAST PROCESS', content: 'Note exactly when the change started. Compare batch weight, charging conditions, probe contact, airflow, burner behavior and changes made during the roast. Some temperature drops are expected immediately after charge, but sudden unexplained behavior can signal a fault. Avoid aggressive compensating gas changes.' },
  { title: 'Excessive smoke or weak exhaust', category: 'VENTILATION', content: 'If smoke is abnormal or a fire is suspected, stop if safe, evacuate or move to fresh air and get qualified assistance. Make sure carbon-monoxide detection and ventilation are appropriate. Inspect chaff and exhaust only after safe shutdown and cooling, using approved maintenance procedures.' },
  { title: 'Beans look scorched or tipped', category: 'QUALITY', content: 'Review initial heat, batch size, green-bean consistency, possible surface contact, air movement and drum mixing. Compare the complete curve and a control batch. Tipping and scorching have multiple potential causes; change one setting at a time.' },
  { title: 'The roast tastes flat or baked', category: 'CUP QUALITY', content: 'Compare cupping with a control and review long stalls, major RoR changes, total progression, gas and airflow adjustments and green coffee condition. A flavor descriptor alone cannot prove one exact cause.' },
  { title: 'Cooling is too slow', category: 'COOLING', content: 'Follow the manufacturer cooling sequence. Check for obvious obstruction without touching moving or hot components. If the fan or cooling mechanism appears faulty, shut down safely and have the system inspected.' },
  { title: 'The controller beeps or shows an error', category: 'CONTROLS', content: 'Record the exact text/code, lights and whether the problem began on startup, ignition or roasting. Only a matching official model manual or trained technician can reliably interpret model-specific alarm codes. Avoid repeated resets or bypassing the alarm.' }
];

const DEFAULT_SUGGESTIONS = [
  'Why did my roast stall after first crack?',
  'Explain Maillard reactions to a beginner.',
  'What is development time ratio?',
  'How should I compare two 2 kg test batches?'
];

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const readLocal = (name, fallback) => { try { return JSON.parse(localStorage.getItem(`${KEY}-${name}`)) ?? fallback; } catch { return fallback; } };
const saveLocal = (name, value) => { try { localStorage.setItem(`${KEY}-${name}`, JSON.stringify(value)); } catch { /* Private browsing can disable storage */ } };
const readCode = () => { try { return sessionStorage.getItem(`${KEY}-code`) || ''; } catch { return ''; } };
const saveCode = code => { try { sessionStorage.setItem(`${KEY}-code`, code); } catch {} };

const storedLogs = readLocal('logs', []);
const storedChat = readLocal('chat', []);
const state = {
  view: 'dashboard',
  role: readLocal('role', 'roaster') === 'student' ? 'student' : 'roaster',
  completed: readLocal('completed', {}),
  logs: Array.isArray(storedLogs) ? storedLogs.slice(0, 300) : [],
  chat: Array.isArray(storedChat) ? storedChat.slice(-32).filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string') : [],
  aiEnabled: false,
  aiModel: null,
  pending: false,
  code: readCode()
};
const routes = ['dashboard', 'assistant', 'academy', 'profiles', 'kuban', 'logbook', 'settings'];
const names = { dashboard: 'OVERVIEW', assistant: 'AI ASSISTANT', academy: 'ROASTING ACADEMY', profiles: 'PROFILE PLANNER', kuban: 'KUBAN 5KG GUIDE', logbook: 'ROAST LOGBOOK', settings: 'SETTINGS & HELP' };

function showView(view) {
  if (!routes.includes(view)) return;
  state.view = view;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('selected', el.dataset.nav === view));
  $('page-crumb').textContent = names[view];
  $('mobile-more-menu').classList.add('hidden');
  $('mobile-more').setAttribute('aria-expanded', 'false');
  if (view === 'academy') renderLessons();
  if (view === 'logbook') renderLogs();
  if (view === 'assistant') renderChat();
  window.scrollTo({top: 0, behavior: 'instant'});
}
function updateDashboard() {
  const completedCount = LESSONS.filter(lesson => state.completed?.[lesson.id]).length;
  const logLosses = state.logs.map(log => Number(log.weightLossPct)).filter(Number.isFinite);
  $('metric-roasts').textContent = state.logs.length;
  $('metric-lessons').innerHTML = `${completedCount}<span class="metric-denominator"> / ${LESSONS.length}</span>`;
  $('metric-loss').textContent = logLosses.length ? (logLosses.reduce((a, b) => a + b, 0) / logLosses.length).toFixed(1) + '%' : '—';
  $('progress-count').textContent = completedCount;
  $('progress-fill').style.width = `${completedCount / LESSONS.length * 100}%`;
  $('top-role-name').textContent = state.role === 'student' ? 'Student' : 'Roaster';
  $('role-welcome').textContent = state.role === 'student'
    ? 'Build your knowledge, practice quizzes and explore the science behind every roast.'
    : 'Your knowledge, profiles and roasting records in one place.';
  $('role-setting').value = state.role;
}
function renderChat() {
  const root = $('chat-history');
  root.innerHTML = '';
  if (!state.chat.length) {
    root.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">✦</div><h3>Hello, fellow roaster.</h3><p>Ask me about roasting science, green coffee, defects or your Kuban Base 5KG. ${state.aiEnabled ? 'The live AI service is configured.' : 'Until the AI service is configured, a limited offline guide can answer common topics.'}</p></div>`;
    return;
  }
  for (const msg of state.chat) {
    const wrap = document.createElement('div');
    wrap.className = `chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`;
    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.textContent = msg.role === 'user' ? 'R' : '✦';
    const body = document.createElement('div');
    body.className = 'chat-msg-body';
    const role = document.createElement('div');
    role.className = 'chat-msg-role';
    role.textContent = msg.role === 'user' ? 'YOU' : (msg.source === 'offline' ? 'OFFLINE REFERENCE' : 'ROASTMASTER AI');
    const text = document.createElement('div');
    text.className = 'chat-msg-text';
    if (msg.role === 'assistant') {
      text.classList.add('rich');
      text.innerHTML = formatChatMarkdown(msg.content);
    } else {
      text.textContent = msg.content;
    }
    body.append(role, text);
    wrap.append(avatar, body);
    root.appendChild(wrap);
  }
  requestAnimationFrame(() => { root.scrollTop = root.scrollHeight; });
}
function addChat(role, content, source = 'ai') {
  state.chat.push({ role, content, source });
  state.chat = state.chat.slice(-32);
  saveLocal('chat', state.chat);
  renderChat();
}
function offlineAnswer(question) {
  const q = question.toLowerCase();
  if (/first crack|dtr|development time/.test(q)) return 'First crack is an audible bean-structure event used as a roast milestone. Development time is the interval from first crack start until drop. DTR (%) = development seconds / total roast seconds × 100. It is a descriptive metric, not a universal quality target.\n\nFor example, 08:30 first crack and 10:00 drop gives 90/600 × 100 = 15% DTR.';
  if (/maillard|browning/.test(q)) return 'Maillard reactions involve reducing sugars and amino compounds and contribute to brown color and aroma. Other chemical changes happen at the same time. Observe the bean, track the curve and cup the result rather than treating the middle stage as a fixed duration.';
  if (/moisture|green coffee|density|processing/.test(q)) return 'Green moisture, density, storage and processing affect how a bean receives heat. Moisture meters differ: use the sample quantity and calibration specified by the manufacturer. Begin with a documented baseline and compare only one changed variable at a time.';
  if (/stall|baked|baking|flat|flick|crash|scorch|tipping|defect/.test(q)) return 'Compare the roast curve, probe response, gas and airflow changes, batch mass, first-crack timing and cup notes. A flat cup or a visible mark does not prove one exact cause. Roast a control batch and adjust one variable at a time.';
  if (/kuban|gas|airflow|drum|2 kg|batch|roast profile|temperature/.test(q)) return 'For a Kuban Base 5KG, capture coffee and batch mass, charge conditions, measured temperature trend, gas/exhaust/drum settings, first crack, drop and cup notes. Do not copy unverified numeric setpoints from another machine. Use your specific model manual and adjust from a safe, repeatable baseline.\n\nFor gas, ignition or electrical faults, shut down if safe and use a qualified technician.';
  if (/weight loss|yield|roasted weight/.test(q)) return 'Roast weight loss (%) = (green mass − roasted mass) / green mass × 100. A batch that starts at 2.00 kg and finishes at 1.70 kg has 15% weight loss. This helps track consistency but does not alone determine quality.';
  return 'This question needs the live AI service for a full answer. The offline reference covers common topics such as first crack, development time, heat, Maillard, green coffee, defects and Kuban roasting basics. Configure GROQ_API_KEY and APP_ACCESS_CODE on the server to enable open-ended answers.';
}
async function sendChat(question) {
  if (state.pending) return;
  const q = question.trim();
  if (!q || q.length > 2300) return;
  addChat('user', q);
  if (!state.aiEnabled) { addChat('assistant', offlineAnswer(q), 'offline'); return; }
  if (!state.code) {
    addChat('assistant', 'Live AI is available, but you need the pilot access code. Ask the app owner for the code, enter it under AI CONNECTION, then try your question again.', 'offline');
    $('pilot-code').focus();
    return;
  }
  state.pending = true;
  $('chat-send').disabled = true;
  $('chat-send').textContent = 'Thinking…';
  try {
    const latest = state.chat.filter(m => m.source !== 'offline' || m.role === 'user').slice(-10).map(m => ({ role: m.role, content: m.content }));
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': state.code },
      body: JSON.stringify({ messages: latest })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status})`);
    addChat('assistant', String(data.answer || 'The service returned an empty answer.'));
  } catch (error) {
    addChat('assistant', `I couldn't get a live answer: ${error.message}. Your question is still saved in this chat.`, 'offline');
  } finally {
    state.pending = false;
    $('chat-send').disabled = false;
    $('chat-send').textContent = 'Send ↗';
  }
}
async function checkAI() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Status request failed');
    const data = await response.json();
    state.aiEnabled = Boolean(data.aiEnabled);
    state.aiModel = data.model;
    $('ai-dot').className = 'status-dot ' + (state.aiEnabled ? 'ready' : 'off');
    $('top-ai-status').textContent = state.aiEnabled ? 'AI connected' : 'Offline guide';
    $('chat-availability').textContent = state.aiEnabled ? 'Live AI configured · pilot access code required' : 'Built-in offline reference · API key not configured';
    $('settings-ai-status').textContent = state.aiEnabled ? `Server AI is configured (${state.aiModel}). Enter the pilot code in Ask AI.` : 'The live AI service is not yet configured. Add GROQ_API_KEY and APP_ACCESS_CODE on the server to enable it.';
  } catch {
    state.aiEnabled = false;
    $('top-ai-status').textContent = 'Offline guide';
    $('chat-availability').textContent = 'Server unavailable · offline reference only';
    $('settings-ai-status').textContent = 'Could not reach the AI status endpoint.';
  }
  renderChat();
}
function renderLessons() {
  const grid = $('lesson-grid');
  grid.innerHTML = LESSONS.map(l => `
    <button type="button" class="lesson-card" data-lesson="${l.id}">
      <span class="lesson-header"><span class="lesson-number">MODULE ${l.number}</span><span class="lesson-icon">${l.icon}</span></span>
      <h3>${escapeHtml(l.title)}</h3><p>${escapeHtml(l.summary)}</p>
      <span class="lesson-foot"><span>${l.duration} · Quick quiz</span><span class="${state.completed[l.id] ? 'completed-mark' : ''}">${state.completed[l.id] ? '✓ Completed' : 'Start →'}</span></span>
    </button>
  `).join('');
  grid.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => openLesson(button.dataset.lesson)));
}
function openLesson(id) {
  const lesson = LESSONS.find(item => item.id === id);
  if (!lesson) return;
  $('lesson-grid').classList.add('hidden');
  const detail = $('lesson-detail');
  detail.classList.remove('hidden');
  detail.innerHTML = `<button class="btn btn-quiet btn-small" id="back-to-lessons" type="button">← All modules</button>
    <p class="eyebrow" style="margin-top:27px">MODULE ${lesson.number} · ${lesson.duration.toUpperCase()}</p>
    <h2>${escapeHtml(lesson.title)}</h2>
    ${lesson.paragraphs.map(p => `<p class="lesson-paragraph">${escapeHtml(p)}</p>`).join('')}
    <div class="keypoints"><h3>Remember these three ideas</h3><ul>${lesson.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
    <div class="quiz"><p class="eyebrow">CHECK YOUR KNOWLEDGE</p><h3>${escapeHtml(lesson.quiz.q)}</h3>
      <div id="quiz-answers">${lesson.quiz.options.map((option, i) => `<button class="quiz-option" data-answer="${i}" type="button">${String.fromCharCode(65+i)}. ${escapeHtml(option)}</button>`).join('')}</div>
      <div id="quiz-feedback" aria-live="polite"></div>
    </div>`;
  $('back-to-lessons').addEventListener('click', () => {
    detail.classList.add('hidden');
    $('lesson-grid').classList.remove('hidden');
    renderLessons();
  });
  detail.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.answer);
    const correct = selected === lesson.quiz.answer;
    detail.querySelectorAll('[data-answer]').forEach(btn => {
      const index = Number(btn.dataset.answer);
      btn.classList.remove('correct', 'incorrect');
      if (index === lesson.quiz.answer) btn.classList.add('correct');
      else if (index === selected) btn.classList.add('incorrect');
    });
    const feedback = $('quiz-feedback');
    feedback.className = `quiz-feedback ${correct ? '' : 'mistake'}`;
    feedback.textContent = (correct ? '✓ Correct. ' : 'Not quite. ') + lesson.quiz.explain;
    if (correct) {
      state.completed[id] = true;
      saveLocal('completed', state.completed);
      updateDashboard();
    }
  }));
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function buildProfile(event) {
  event.preventDefault();
  const coffee = $('profile-coffee').value.trim();
  const batch = Number($('profile-batch').value);
  const process = $('profile-process').value;
  const level = $('profile-level').value;
  const goal = $('profile-goal').value.trim();
  if (!coffee || !(batch > 0 && batch <= 5)) return;
  const levelGuidance = {
    Light: 'Prioritize clarity and your target origin character. Check that the cup is neither grassy nor underdeveloped; cup rather than relying on color alone.',
    Medium: 'Explore the balance between perceived acidity, sweetness, aroma and body. Use your tasting notes to guide the next adjustment.',
    Dark: 'Monitor roast-derived flavors and avoid harshness or smoke taint. Follow manufacturer safety and ventilation procedures at every stage.'
  };
  const phases = [
    ['Prepare', 'Inspect green coffee and note moisture and density if measured. Verify ventilation, chaff collection and machine readiness.'],
    ['Charge & start', 'Use a safe, previously documented baseline suitable for your batch and equipment. Log your actual start conditions, gas, exhaust and drum settings.'],
    ['Drying / yellowing', 'Observe bean color and note the first clear yellowing. Record the measured temperatures and times rather than chasing a universal number.'],
    ['Browning / Maillard', 'Track aroma, color, rate of rise and adjustments. Make modest, controlled changes and record what changed.'],
    ['First crack', 'Record the start of audible first crack. Continue watching the trend and how development supports the desired cup.'],
    ['Drop, cool & cup', levelGuidance[level] + ' Record total time, development time, weight loss and your final sensory assessment.']
  ];
  $('profile-output').innerHTML = `
    <div class="plan-kicker">YOUR ROASTING WORKSHEET</div><h2>${escapeHtml(coffee)}</h2>
    <p class="plan-meta">${escapeHtml(level)} roast · ${escapeHtml(process)} · ${batch.toFixed(1)} kg green</p>
    ${goal ? `<p class="plan-meta"><b>Flavor goal:</b> ${escapeHtml(goal)}</p>` : ''}
    ${phases.map((entry, index) => `<div class="plan-phase"><span class="plan-phase-num">0${index+1}</span><div><h3>${escapeHtml(entry[0])}</h3><p>${escapeHtml(entry[1])}</p></div></div>`).join('')}
    <p class="fine" style="margin-top:13px;line-height:1.7">This is a planning guide, not a programmed recipe or manufacturer-verified setpoint sheet.</p>
    <button type="button" id="profile-to-log" class="btn btn-primary btn-wide plan-cta">Record this coffee in my logbook ↗</button>`;
  $('profile-to-log').addEventListener('click', () => {
    $('log-coffee').value = coffee;
    $('log-green').value = batch;
    $('log-level').value = level;
    showView('logbook');
  });
}
function renderIssues() {
  const list = $('machine-issues');
  list.innerHTML = ISSUES.map((issue, i) => `<div class="issue"><button class="issue-button" data-issue="${i}" type="button" aria-expanded="false"><span>${escapeHtml(issue.title)}</span><span class="issue-arrow">＋</span></button><div class="issue-content hidden" id="issue-content-${i}"><p><b>${escapeHtml(issue.category)}:</b> ${escapeHtml(issue.content)}</p></div></div>`).join('');
  list.querySelectorAll('[data-issue]').forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.querySelector('.issue-arrow').textContent = open ? '＋' : '−';
    $(`issue-content-${btn.dataset.issue}`).classList.toggle('hidden', open);
  }));
}
function renderLogs() {
  const logs = state.logs;
  $('log-total').textContent = logs.length;
  const validLoss = logs.map(l => Number(l.weightLossPct)).filter(Number.isFinite);
  const validDtr = logs.map(l => Number(l.dtrPct)).filter(Number.isFinite);
  $('log-loss').textContent = validLoss.length ? (validLoss.reduce((a,b)=>a+b,0)/validLoss.length).toFixed(1) + '%' : '—';
  $('log-dtr').textContent = validDtr.length ? (validDtr.reduce((a,b)=>a+b,0)/validDtr.length).toFixed(1) + '%' : '—';
  $('export-logs').disabled = logs.length === 0;
  updateDashboard();
  const container = $('log-entries');
  if (!logs.length) {
    container.innerHTML = '<div class="log-empty"><div class="illustration">◷</div><h3>No roasts logged yet</h3><p>Your next batch can become your first reference roast. Start with the form on the left.</p></div>';
    return;
  }
  container.innerHTML = logs.map((log, index) => {
    const preCrack = Math.max(0, Number(log.firstCrack) / Number(log.drop) * 100);
    const dev = 100 - preCrack;
    const hasYellow = Number.isFinite(Number(log.yellow)) && log.yellow !== null;
    const drying = hasYellow ? Math.max(0, Number(log.yellow) / Number(log.drop) * 100) : preCrack;
    const maillard = hasYellow ? Math.max(0, preCrack - drying) : 0;
    return `<article class="log-card">
      <div class="log-card-head"><div><h3>${escapeHtml(log.coffee)}</h3><div class="meta">${escapeHtml(log.date)} · ${escapeHtml(log.level)} · ${Number(log.green).toFixed(2)} kg green</div></div><button type="button" class="log-delete" data-delete-log="${index}" aria-label="Delete roast ${escapeHtml(log.coffee)}">✕</button></div>
      <div class="log-card-metrics"><div><span>WEIGHT LOSS</span><strong>${Number(log.weightLossPct).toFixed(1)}%</strong></div><div><span>DEVELOPMENT</span><strong>${formatTime(Number(log.dev))}</strong></div><div><span>DTR</span><strong>${Number(log.dtrPct).toFixed(1)}%</strong></div></div>
      <div class="timeline"><span class="dry" style="width:${drying}%"></span>${hasYellow ? `<span class="maillard" style="width:${maillard}%"></span>` : ''}<span class="dev" style="width:${dev}%"></span></div>
      <div class="timeline-labels"><span>${hasYellow ? `Yellow ${formatTime(Number(log.yellow))}` : 'Charge 00:00'}</span><span>First crack ${formatTime(Number(log.firstCrack))}</span><span>Drop ${formatTime(Number(log.drop))}</span></div>
      ${log.notes ? `<div class="log-notes">${escapeHtml(log.notes)}</div>` : ''}
    </article>`;
  }).join('');
  container.querySelectorAll('[data-delete-log]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.deleteLog);
    if (!Number.isInteger(index) || !state.logs[index]) return;
    if (!confirm('Delete this roast record from this device?')) return;
    state.logs.splice(index, 1);
    saveLocal('logs', state.logs);
    renderLogs();
  }));
}
function saveRoast(event) {
  event.preventDefault();
  $('log-error').textContent = '';
  const coffee = $('log-coffee').value.trim();
  const green = Number($('log-green').value);
  const roasted = Number($('log-roasted').value);
  const yellowRaw = $('log-yellow').value.trim();
  const yellow = yellowRaw ? parseTime(yellowRaw) : null;
  const firstCrack = parseTime($('log-first').value);
  const drop = parseTime($('log-drop').value);
  if (!coffee || !(green > 0 && green <= 5)) { $('log-error').textContent = 'Enter a coffee name and a green batch size greater than zero and no more than 5 kg.'; return; }
  if (firstCrack === null || drop === null || (yellowRaw && yellow === null)) { $('log-error').textContent = 'Enter valid times as mm:ss (for example 08:30).'; return; }
  if (yellow !== null && yellow >= firstCrack) { $('log-error').textContent = 'Yellowing must occur before first crack.'; return; }
  try {
    const summary = calculateRoast({green, roasted, firstCrack, drop});
    state.logs.unshift({
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      date: new Date().toLocaleDateString('en-GB', {year:'numeric',month:'short',day:'numeric'}),
      coffee, green, roasted, yellow, firstCrack, drop,
      level: $('log-level').value,
      notes: $('log-notes').value.trim(),
      dev: summary.developmentSeconds,
      weightLossPct: summary.weightLossPct,
      dtrPct: summary.dtrPct
    });
    state.logs = state.logs.slice(0, 300);
    saveLocal('logs', state.logs);
    $('log-form').reset();
    $('log-green').value = '2';
    renderLogs();
  } catch (error) { $('log-error').textContent = error.message; }
}
function downloadCSV() {
  if (!state.logs.length) return;
  const fields = ['date','coffee','level','green','roasted','yellow','firstCrack','drop','dev','weightLossPct','dtrPct','notes'];
  const rows = [fields, ...state.logs.map(log => fields.map(key => log[key] ?? ''))];
  const text = '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([text], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roastmaster-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function initialize() {
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => showView(button.dataset.nav)));
  document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => showView(button.dataset.goto)));
  $('mobile-more').addEventListener('click', () => {
    const menu = $('mobile-more-menu');
    menu.classList.toggle('hidden');
    $('mobile-more').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
  });
  $('chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('chat-input').value.trim();
    if (!text) return;
    $('chat-input').value = '';
    sendChat(text);
  });
  $('chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      $('chat-form').requestSubmit();
    }
  });
  $('suggested-questions').innerHTML = DEFAULT_SUGGESTIONS.map((q, index) => `<button type="button" class="suggestion" data-suggest="${index}">${escapeHtml(q)} ↗</button>`).join('');
  $('suggested-questions').querySelectorAll('[data-suggest]').forEach(button => button.addEventListener('click', () => {
    $('chat-input').value = DEFAULT_SUGGESTIONS[Number(button.dataset.suggest)];
    $('chat-input').focus();
  }));
  $('clear-chat').addEventListener('click', () => { if (!state.chat.length || confirm('Clear this device’s chat history?')) { state.chat = []; saveLocal('chat', state.chat); renderChat(); } });
  $('clear-history').addEventListener('click', () => { if (confirm('Clear your local chat history?')) { state.chat = []; saveLocal('chat', state.chat); renderChat(); } });
  $('pilot-code').value = state.code;
  $('save-pilot-code').addEventListener('click', () => {
    const code = $('pilot-code').value.trim();
    state.code = code;
    saveCode(code);
    $('pilot-code-feedback').textContent = code ? 'Code saved for this browser session. Ask a question to test it.' : 'Code cleared.';
  });
  $('save-role').addEventListener('click', () => { state.role = $('role-setting').value === 'student' ? 'student' : 'roaster'; saveLocal('role', state.role); updateDashboard(); });
  $('profile-form').addEventListener('submit', buildProfile);
  $('log-form').addEventListener('submit', saveRoast);
  $('export-logs').addEventListener('click', downloadCSV);
  renderLessons();
  renderIssues();
  renderLogs();
  updateDashboard();
  checkAI();
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
initialize();
