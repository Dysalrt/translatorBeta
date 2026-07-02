/* =========================================================================
   1. СЛОВАРЬ
   Ключ — английская лемма (базовая форма). pos используется debug-панелью
   и для отдельных генераторов (noun / pronoun / verb / modal / adjective).
   ========================================================================= */
let DICTIONARY = {
  // местоимения
  'i':      { root:'Vi',  pos:'pronoun' },
  'you':    { root:'Vus', pos:'pronoun' },
  'he':     { root:'Il',  pos:'pronoun' },
  'she':    { root:'El',  pos:'pronoun' },
  'it':     { root:'De',  pos:'pronoun' },
  'we':     { root:'Nus', pos:'pronoun' },
  'they':   { root:'Vos', pos:'pronoun' },
  // существительные
  'house':     { root:'vous',  pos:'noun' },
  'cafe':      { root:'cafe',  pos:'noun' },
  'cafeteria': { root:'cafe',  pos:'noun' },
  'pizza':     { root:'pizza', pos:'noun' },
  'morning':   { root:'dar',   pos:'noun' },
  'daytime':   { root:'dur',   pos:'noun' },
  'evening':   { root:'nev',   pos:'noun' },
  'night':     { root:'nuv',   pos:'noun' },
  'day':       { root:'qan',   pos:'noun' },
  'week':      { root:'teqen', pos:'noun' },
  'teacher':   { root:'pare',  pos:'noun' },
  'father':    { root:'pate',  pos:'noun' },
  'mother':    { root:'mate',  pos:'noun' },
  // союзы
  'and': { root:'it', pos:'conjunction' },
  'or':  { root:'pū', pos:'conjunction' },
  'but': { root:'cū', pos:'conjunction' },
  // вопросительные слова
  'what': { root:'qu',   pos:'question' },
  'who':  { root:'qa',   pos:'question' },
  'how':  { root:'qo',   pos:'question' },
  'why':  { root:'qi',   pos:'question' },
  'when': { root:'qanq', pos:'question' },
  // глаголы (леммы; спряжённые формы распознаются VERB_FORMS ниже)
  'be':    { root:'e',   pos:'verb' },
  'do':    { root:'an',  pos:'verb' },
  'learn': { root:'oca', pos:'verb' },
  'study': { root:'oca', pos:'verb' },
  'have':  { root:'jū',  pos:'verb' },
  'can':   { root:'col', pos:'modal' },
  'want':  { root:'dul', pos:'verb' },   // синтаксически ведёт себя как модальный: want + инфинитив
  'must':  { root:'den', pos:'modal' },
  // междометия
  'hello':   { root:'Qite',  pos:'interjection' },
  'hi':      { root:'Venite',pos:'interjection' },
  'bye':     { root:'qami',  pos:'interjection' },
  'goodbye': { root:'vinita',pos:'interjection' },
};

/* Закрытый список спряжённых английских форм для глаголов, которые есть
   в словаре. Так как словарь маленький и фиксированный, надёжнее вручную
   перечислить формы, чем полагаться на автоматический тэггер времени. */
const VERB_FORMS = {
  'be':{present:['am','is','are','be'], past:['was','were'], gerund:'being'},
  'do':{present:['do','does'], past:['did'], gerund:'doing'},
  'learn':{present:['learn','learns'], past:['learned','learnt'], gerund:'learning'},
  'study':{present:['study','studies'], past:['studied'], gerund:'studying'},
  'have':{present:['have','has'], past:['had'], gerund:'having'},
  'want':{present:['want','wants'], past:['wanted'], gerund:'wanting'},
};
const MODAL_FORMS = { 'can':{present:'can', past:'could'}, 'must':{present:'must', past:'must'} };

const ARTICLES = new Set(['a','an','the']);
const PREPOSITIONS = new Set(['in','on','at','for','from','of','with','by','into','onto','near','under','over','about','through','between','to']);
const POSSESSIVE_DET = { 'my':'i','your':'you',"your's":'you','his':'he','her':'she','its':'it','our':'we','their':'they' };
const QUESTION_WORDS = new Set(['what','who','how','why','when']);
const NEGATIONS = new Set(['not',"n't",'nt']);
const FUTURE_MARKERS = new Set(['will','shall']);
const CONJ_WORDS = { 'and':'and','or':'or','but':'but' };

/* =========================================================================
   2. МОРФОЛОГИЧЕСКИЙ ДВИЖОК  (проверено против примеров пользователя)
   ========================================================================= */
function endsVowel(w){ return 'aeiouāēīōū'.includes(w[w.length-1].toLowerCase()); }
function applyPossessive(root){ return endsVowel(root) ? root+'s' : root+'i'; }
function applyPlural(word){ return endsVowel(word) ? word+'n' : word+'in'; }

function generateNoun(root, {poss=false, plural=false}={}){
  let w = root;
  if (poss)   w = applyPossessive(w);
  if (plural) w = applyPlural(w);
  return w;
}
function generatePronoun(root, {poss=false}={}){
  return poss ? applyPossessive(root) : root;
}
const TENSE_SUFFIX = { 1:{past:'da',present:'de',future:'do'}, 2:{past:'a',present:'e',future:'o'} };
function verbType(root){ return endsVowel(root) ? 1 : 2; }
function generateVerb(root, {tense='present', aspect='simple'}={}){
  const type = verbType(root);
  const suf = TENSE_SUFFIX[type][tense] || TENSE_SUFFIX[type].present;
  let form = root + suf;
  if (aspect==='continuous') form = 'ca' + form;
  return form;
}

/* =========================================================================
   3. РАЗБОР ПРЕДЛОЖЕНИЯ
   Стратегия: compromise используется только для токенизации/деления на
   предложения и для распознавания прилагательных вне словаря. Всё, что
   касается наших 38 слов (местоимения/глаголы/существительные), находится
   собственным сканером по спискам выше — это надёжнее для маленького
   фиксированного словаря, чем общий английский тэггер.
   ========================================================================= */

function tokenize(text){
  // простая токенизация с сохранением апострофов внутри слов (don't, teacher's)
  return text
    .replace(/[.,!;:]+/g,' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function lemmaOfVerbForm(tok){
  const t = tok.toLowerCase();
  for (const lemma in VERB_FORMS){
    const f = VERB_FORMS[lemma];
    if (f.present.includes(t)) return {lemma, tense:'present', gerund:false};
    if (f.past.includes(t)) return {lemma, tense:'past', gerund:false};
    if (f.gerund === t) return {lemma, tense:null, gerund:true};
    if (lemma === t) return {lemma, tense:'present', gerund:false}; // база = present/инфинитив
  }
  return null;
}
function modalInfo(tok){
  const t = tok.toLowerCase();
  for (const lemma in MODAL_FORMS){
    if (MODAL_FORMS[lemma].present === t) return {lemma, tense:'present'};
    if (MODAL_FORMS[lemma].past === t) return {lemma, tense:'past'};
  }
  return null;
}

function isNounLemma(word){
  const d = DICTIONARY[word.toLowerCase()];
  return d && d.pos === 'noun' ? d : null;
}
function isPronounLemma(word){
  const d = DICTIONARY[word.toLowerCase()];
  return d && d.pos === 'pronoun' ? d : null;
}
// возвращает {singular, dictEntry} если слово — известное существительное во мн.ч. или ед.ч.
function matchNoun(word){
  const w = word.toLowerCase();
  if (isNounLemma(w)) return { singular:w, plural:false };
  if (w.endsWith('es') && isNounLemma(w.slice(0,-2))) return { singular:w.slice(0,-2), plural:true };
  if (w.endsWith('s') && isNounLemma(w.slice(0,-1))) return { singular:w.slice(0,-1), plural:true };
  return null;
}

/* --- деление на слова-с-тегами для отладочной панели и генерации --- */
function classifyToken(tok, nextTok){
  const w = tok.toLowerCase().replace(/^'|'$/g,'');
  return w;
}

/* -------------------------------------------------------------------------
   Разбор одной "клаузы/фразы" (после разбиения по союзам верхнего уровня).
   Возвращает { translationWords: [...], missing: [...], debug: {...} }
------------------------------------------------------------------------- */
function translateClauseOrPhrase(rawText){
  const isQuestion = /\?\s*$/.test(rawText.trim());
  let tokens = tokenize(rawText).map(t => t.replace(/[?!]$/,''));
  const missing = [];
  const debugChips = [];

  // --- 1. Убираем/распознаём "'s" притяжательное: "teacher's" -> ["teacher","'s"]
  let expanded = [];
  tokens.forEach(t=>{
    const m = t.match(/^(.+)'s$/i);
    if (m && !['it'].includes(m[1].toLowerCase())){
      expanded.push(m[1]); expanded.push("__POSS__");
    } else {
      expanded.push(t);
    }
  });
  tokens = expanded;

  // --- 2. negation flag + удаление частиц отрицания из потока ---
  let negation = false;
  tokens = tokens.filter(t=>{
    const lw = t.toLowerCase();
    if (NEGATIONS.has(lw)) { negation = true; return false; }
    if (lw.endsWith("n't")) { negation = true; return false; }
    return true;
  });

  // --- 3. вопросительное слово (если стоит первым) ---
  let questionWord = null;
  if (tokens.length && QUESTION_WORDS.has(tokens[0].toLowerCase())){
    questionWord = tokens[0].toLowerCase();
    tokens = tokens.slice(1);
  }

  // --- 4. ищем модальный/будущий маркер и главный глагол ---
  let modal = null;         // {lemma, tense}
  let futureMarker = false;
  let verb = null;          // {lemma, tense, aspect}
  let verbIndex = -1;
  const verbTokenIndices = new Set(); // все индексы токенов, "съеденные" глагольным блоком

  for (let i=0;i<tokens.length;i++){
    const lw = tokens[i].toLowerCase();
    if (FUTURE_MARKERS.has(lw)) { futureMarker = true; verbTokenIndices.add(i); continue; }
    if (!modal){
      const mi = modalInfo(lw);
      if (mi){ modal = mi; verbTokenIndices.add(i); continue; }
    }
    if (verb) continue; // основной глагол уже нашли — дальше не переопределяем

    // continuous: be-форма + ...ing глагол чуть дальше
    const vf = lemmaOfVerbForm(lw);
    if (vf && vf.lemma==='be' && !vf.gerund){
      // смотрим вперёд на ...ing
      for (let j=i+1;j<Math.min(i+4,tokens.length);j++){
        const gf = lemmaOfVerbForm(tokens[j].toLowerCase());
        if (gf && gf.gerund){
          verb = { lemma:gf.lemma, tense: futureMarker?'future':vf.tense, aspect:'continuous' };
          verbIndex = j;
          verbTokenIndices.add(i); verbTokenIndices.add(j);
          break;
        }
      }
      if (verb) continue;
    }
    if (vf && vf.lemma==='do' && !vf.gerund){
      // может быть "dummy do" перед другим глаголом (вопрос/отрицание) —
      // проверим, есть ли дальше ещё один известный глагол в базовой форме
      const rest = tokens.slice(i+1).map(x=>x.toLowerCase());
      const hasOtherVerb = rest.some(r => lemmaOfVerbForm(r) || modalInfo(r));
      if (hasOtherVerb){ verbTokenIndices.add(i); continue; }
      verb = { lemma:'do', tense: futureMarker?'future':vf.tense, aspect:'simple' };
      verbIndex = i; verbTokenIndices.add(i); continue;
    }
    if (vf && !vf.gerund){
      verb = { lemma:vf.lemma, tense: futureMarker?'future':vf.tense, aspect:'simple' };
      verbIndex = i; verbTokenIndices.add(i); continue;
    }
  }
  if (modal && futureMarker) modal.tense='future'; // редкий кейс "will can" — на всякий случай не ломаем

  // --- если это не клауза (глагола нет) — трактуем как именную фразу ---
  const isClause = !!(verb || modal);

  // --- 5. собираем слова, которые остались НЕ глагольной частью,
  //        в подлежащее / дополнение, разделённые по verbIndex ---
  function isVerbToken(i){
    return verbTokenIndices.has(i);
  }

  function buildPhrase(tokSlice){
    // возвращает {words:[{lemma,type,plural,poss}], missingLocal:[]}
    let out = [];
    let localMissing = [];
    let pendingPoss = null; // {isPronoun, lemma}
    for (let i=0;i<tokSlice.length;i++){
      const raw = tokSlice[i];
      const lw = raw.toLowerCase();
      if (ARTICLES.has(lw)) continue;
      if (PREPOSITIONS.has(lw)) continue; // предлоги пока сознательно опущены
      if (raw === '__POSS__') { continue; } // маркер уже обработан ниже
      if (POSSESSIVE_DET[lw]){
        pendingPoss = { isPronoun:true, lemma:POSSESSIVE_DET[lw] };
        continue;
      }
      const nm = matchNoun(raw);
      if (nm){
        let isPoss = false;
        if (tokSlice[i+1] === '__POSS__'){ isPoss = true; i++; }
        out.push({ kind:'noun', lemma:nm.singular, plural:nm.plural, poss:isPoss, possessor: pendingPoss });
        pendingPoss = null;
        continue;
      }
      const pr = isPronounLemma(lw);
      if (pr){
        out.push({ kind:'pronoun', lemma:lw, possessor: pendingPoss });
        pendingPoss = null;
        continue;
      }
      // прилагательное? проверим словарь напрямую (могут быть добавлены пользователем)
      const d = DICTIONARY[lw];
      if (d && d.pos==='adjective'){
        out.push({ kind:'adjective', lemma:lw });
        continue;
      }
      if (d){ out.push({ kind:d.pos, lemma:lw }); continue; }
      // неизвестное содержательное слово — используем compromise как последнюю
      // попытку понять часть речи (для более понятного сообщения об ошибке),
      // и добавляем в список пропущенных.
      localMissing.push(raw);
    }
    return { words: out, missingLocal: localMissing };
  }

  const beforeVerb = [];
  const afterVerb = [];
  let seenVerbZone = false;
  for (let i=0;i<tokens.length;i++){
    if (isVerbToken(i)){ seenVerbZone = true; continue; }
    if (!seenVerbZone) beforeVerb.push(tokens[i]); else afterVerb.push(tokens[i]);
  }

  const subjPhrase = buildPhrase(beforeVerb);
  const objPhrase = isClause ? buildPhrase(afterVerb) : buildPhrase(tokens.filter((_,i)=>true));
  // если это не клауза — вся фраза уже разобрана как subjPhrase (afterVerb пуст),
  // поэтому objPhrase выше для не-клаузы дублирует; берём только subjPhrase.

  missing.push(...subjPhrase.missingLocal);
  if (isClause) missing.push(...objPhrase.missingLocal);

  /* =======================================================================
     6. ГЕНЕРАЦИЯ СЛОВ НА VUS
     ======================================================================= */
  function renderWordList(list){
    const words = [];
    list.forEach(item=>{
      if (item.kind==='noun'){
        const entry = DICTIONARY[item.lemma];
        if (!entry) return;
        if (item.possessor){
          const pEntry = DICTIONARY[item.possessor.lemma];
          if (pEntry){
            const pWord = generatePronoun(pEntry.root, {poss:true});
            words.push(pWord);
            debugChips.push({type:'pronoun', label:item.possessor.lemma+' (poss)', out:pWord});
          }
        }
        const w = generateNoun(entry.root, {poss:item.poss, plural:item.plural});
        words.push(w);
        debugChips.push({type:'noun', label:item.lemma+(item.plural?' (pl)':'')+(item.poss?' (poss)':''), out:w});
      } else if (item.kind==='pronoun'){
        const entry = DICTIONARY[item.lemma];
        if (!entry) return;
        if (item.possessor){
          const pEntry = DICTIONARY[item.possessor.lemma];
          if (pEntry){
            const pWord = generatePronoun(pEntry.root, {poss:true});
            words.push(pWord);
            debugChips.push({type:'pronoun', label:item.possessor.lemma+' (poss)', out:pWord});
          }
        }
        const w = generatePronoun(entry.root, {});
        words.push(w);
        debugChips.push({type:'pronoun', label:item.lemma, out:w});
      } else if (item.kind==='adjective'){
        const entry = DICTIONARY[item.lemma];
        if (!entry) return;
        words.push(entry.root);
        debugChips.push({type:'particle', label:item.lemma+' (adj)', out:entry.root});
      } else if (item.kind==='interjection' || item.kind==='conjunction' || item.kind==='question'){
        const entry = DICTIONARY[item.lemma];
        if (!entry) return;
        words.push(entry.root);
        debugChips.push({type:'particle', label:item.lemma, out:entry.root});
      }
    });
    return words;
  }

  let outWords = [];

  if (!isClause){
    // именная фраза без глагола
    outWords = renderWordList(subjPhrase.words);
  } else {
    const subjWords = renderWordList(subjPhrase.words);
    const objWords  = renderWordList(objPhrase.words);

    // глагольный блок
    let verbBlock = [];
    if (negation){ verbBlock.push('nor'); debugChips.push({type:'particle', label:'negation', out:'nor'}); }

    if (modal){
      const mEntry = DICTIONARY[modal.lemma];
      if (mEntry){
        const mv = generateVerb(mEntry.root, { tense: modal.tense, aspect:'simple' });
        verbBlock.push(mv);
        debugChips.push({type:'verb', label:modal.lemma+' (modal, '+modal.tense+')', out:mv});
      } else missing.push(modal.lemma);
      if (verb){
        const vEntry = DICTIONARY[verb.lemma];
        if (vEntry){
          verbBlock.push(vEntry.root); // после модального — голый инфинитив
          debugChips.push({type:'verb', label:verb.lemma+' (infinitive)', out:vEntry.root});
        } else missing.push(verb.lemma);
      }
    } else if (verb){
      const vEntry = DICTIONARY[verb.lemma];
      if (vEntry){
        const vv = generateVerb(vEntry.root, { tense:verb.tense, aspect:verb.aspect });
        verbBlock.push(vv);
        debugChips.push({type:'verb', label:verb.lemma+' ('+verb.tense+', '+verb.aspect+')', out:vv});
      } else missing.push(verb.lemma);
    }

    if (isQuestion || questionWord){
      // VSO, вопросительное слово — в начало
      outWords = [...verbBlock, ...subjWords, ...objWords];
      if (questionWord){
        const qEntry = DICTIONARY[questionWord];
        if (qEntry){ outWords = [qEntry.root, ...outWords]; debugChips.unshift({type:'particle', label:questionWord+' (question)', out:qEntry.root}); }
        else missing.push(questionWord);
      }
    } else {
      // SVO
      outWords = [...subjWords, ...verbBlock, ...objWords];
    }
  }

  return {
    words: outWords,
    missing,
    debugChips,
    flags: { isClause, isQuestion: !!(isQuestion||questionWord), questionWord, negation,
             tense: verb ? verb.tense : (modal ? modal.tense : null),
             aspect: verb ? verb.aspect : null, modal: modal ? modal.lemma : null }
  };
}

/* -------------------------------------------------------------------------
   Верхний уровень: делим по союзам and/or/but, переводим части отдельно,
   склеиваем через conlang-союз.
------------------------------------------------------------------------- */
function splitTopLevelConjunctions(text){
  const re = /\s+(and|or|but)\s+/gi;
  const parts = text.split(re);
  // parts чередует: [текст, союз, текст, союз, текст...]
  const chunks = [];
  chunks.push({ text: parts[0], conjBefore: null });
  for (let i=1;i<parts.length;i+=2){
    chunks.push({ text: parts[i+1], conjBefore: parts[i].toLowerCase() });
  }
  return chunks;
}

function translateSentence(sentenceText){
  const endsWithQ = /\?\s*$/.test(sentenceText.trim());
  const chunks = splitTopLevelConjunctions(sentenceText);
  const allMissing = [];
  const allDebug = [];
  const finalWords = [];

  chunks.forEach((chunk, idx)=>{
    const res = translateClauseOrPhrase(chunk.text);
    allMissing.push(...res.missing);
    allDebug.push({ text:chunk.text.trim(), chips:res.debugChips, flags:res.flags });
    if (idx>0 && chunk.conjBefore){
      const cEntry = DICTIONARY[chunk.conjBefore];
      finalWords.push(cEntry ? cEntry.root : chunk.conjBefore);
    }
    finalWords.push(...res.words);
  });

  let translation;
  if (allMissing.length){
    translation = { type:'missing', words: [...new Set(allMissing)] };
  } else {
    let s = finalWords.join(' ');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (endsWithQ) s += ' ?'; else s += '.';
    translation = { type:'ok', text:s };
  }
  return { translation, debug: allDebug };
}

function translateText(fullText){
  if (!fullText.trim()) return null;
  // делим на предложения простым способом (по . ! ?), сохраняя ?
  const rawSentences = fullText.match(/[^.!?]+[.!?]?/g) || [fullText];
  const results = rawSentences.map(s=>s.trim()).filter(Boolean).map(translateSentence);
  return results;
}

/* =========================================================================
   4. UI
   ========================================================================= */
const btnTranslate = document.getElementById('translateBtn');
const inputEl = document.getElementById('englishInput');
const outputEl = document.getElementById('outputArea');
const debugPanel = document.getElementById('debugPanel');
const debugContent = document.getElementById('debugContent');
const toggleDebugBtn = document.getElementById('toggleDebug');
const dictPanel = document.getElementById('dictPanel');
const toggleDictBtn = document.getElementById('toggleDict');

function renderOutput(results){
  outputEl.innerHTML = '';
  let anyMissing = false;
  const lines = [];
  results.forEach(r=>{
    if (r.translation.type==='missing'){
      anyMissing = true;
      lines.push(`<div class="missing">Missing words: <b>${r.translation.words.join(', ')}</b></div>`);
    } else {
      lines.push(`<div>${escapeHtml(r.translation.text)}</div>`);
    }
  });
  outputEl.innerHTML = lines.join('');
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderDebug(results){
  debugContent.innerHTML = '';
  results.forEach(r=>{
    r.debug.forEach(clause=>{
      const block = document.createElement('div');
      block.className = 'clause-block';
      const chipRow = document.createElement('div');
      chipRow.className = 'chip-row';
      clause.chips.forEach(c=>{
        const chip = document.createElement('span');
        chip.className = 'chip ' + c.type;
        chip.innerHTML = `<span class="k">${c.label}</span> → ${c.out}`;
        chipRow.appendChild(chip);
      });
      if (!clause.chips.length){
        const chip = document.createElement('span');
        chip.className='chip miss';
        chip.textContent = 'нет распознанных слов';
        chipRow.appendChild(chip);
      }
      const flags = document.createElement('div');
      flags.className='flags';
      const f = clause.flags;
      const parts = [`"${clause.text}"`];
      if (f.isClause){
        parts.push(f.isQuestion ? 'вопрос'+(f.questionWord?` (${f.questionWord})`:'') : 'утверждение');
        if (f.negation) parts.push('отрицание');
        if (f.tense) parts.push('время: '+f.tense);
        if (f.aspect) parts.push('аспект: '+f.aspect);
        if (f.modal) parts.push('модальный: '+f.modal);
      } else {
        parts.push('именная фраза (без глагола)');
      }
      flags.textContent = parts.join(' · ');
      block.appendChild(flags);
      block.appendChild(chipRow);
      debugContent.appendChild(block);
    });
  });
}

function runTranslate(){
  const text = inputEl.value;
  const results = translateText(text);
  if (!results){ outputEl.innerHTML = '<span class="placeholder">Перевод появится здесь</span>'; return; }
  renderOutput(results);
  renderDebug(results);
}

btnTranslate.addEventListener('click', runTranslate);
inputEl.addEventListener('keydown', e=>{
  if (e.key==='Enter' && (e.metaKey||e.ctrlKey)) runTranslate();
});

toggleDebugBtn.addEventListener('click', ()=>{
  debugPanel.classList.toggle('show');
  toggleDebugBtn.classList.toggle('active');
});
toggleDictBtn.addEventListener('click', ()=>{
  dictPanel.classList.toggle('show');
  toggleDictBtn.classList.toggle('active');
});

document.querySelectorAll('.ex-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    inputEl.value = chip.textContent;
    runTranslate();
  });
});

/* ---------- словарь: таблица + добавление + импорт/экспорт ---------- */
const dictBody = document.getElementById('dictBody');
function renderDict(){
  dictBody.innerHTML = '';
  Object.keys(DICTIONARY).sort().forEach(key=>{
    const entry = DICTIONARY[key];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${key}</td><td>${entry.root}</td><td class="pos">${entry.pos}</td><td><span class="del-x" data-key="${key}">✕</span></td>`;
    dictBody.appendChild(tr);
  });
  dictBody.querySelectorAll('.del-x').forEach(el=>{
    el.addEventListener('click', ()=>{
      delete DICTIONARY[el.dataset.key];
      renderDict();
    });
  });
}
document.getElementById('dictAdd').addEventListener('click', ()=>{
  const en = document.getElementById('dictEn').value.trim().toLowerCase();
  const root = document.getElementById('dictRoot').value.trim();
  const pos = document.getElementById('dictPos').value;
  if (!en || !root) return;
  DICTIONARY[en] = { root, pos };
  document.getElementById('dictEn').value='';
  document.getElementById('dictRoot').value='';
  renderDict();
});
document.getElementById('dictExport').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(DICTIONARY, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vus-dictionary.json';
  a.click();
});
document.getElementById('dictImportBtn').addEventListener('click', ()=>{
  document.getElementById('dictImportFile').click();
});
document.getElementById('dictImportFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      DICTIONARY = { ...DICTIONARY, ...parsed };
      renderDict();
    } catch(err){ alert('Не удалось прочитать файл: '+err.message); }
  };
  reader.readAsText(file);
});

renderDict();
runTranslate();
