/*!
 * painscales.js — ядро витрины «Шкалы боли» (без DOM).
 *
 * Две валидированные шкалы острой боли:
 *  1. CMPS-SF — краткая форма Глазго композитной шкалы боли, СОБАКИ
 *     (Reid et al. 2007; порог вмешательства 6/24 или 5/20 — WSAVA).
 *  2. FGS — Feline Grimace Scale, гримас-шкала, КОШКИ
 *     (Evangelista et al. 2019; порог спасательной анальгезии ≥4/10,
 *     ратио-нормализация ≥0.4/1.0 — ISFM-консенсус 2022).
 *
 * Данные — точные структуры шкал (дескрипторы переведены с бланка
 * «Reproduced with permission from Jacqueline Reid, University of Glasgow»
 * и тренировочного руководства FGS, супплементарий Evangelista 2019).
 * Числа порогов дублированы в tests/thresholds.reference.json
 * (паттерн tokens.json-verify): дрейф = красный CI.
 *
 * Экспорт: UMD — node (module.exports) и браузер (window.PainScales).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PainScales = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ======================================================================
   * 1. CMPS-SF (собаки): 6 категорий, ранговые баллы 0..N-1.
   *    Категории A(i–ii) — спонтанное поведение в боксе; B(iii) —
   *    мобильность (может быть пропущена, тогда итог /20); C(iv) —
   *    реакция на пальпацию (единственная шестидескрипторная, 0..5);
   *    D(v–vi) — общее состояние и поза, оцениваются последними.
   * ====================================================================== */
  var CMPS_SF = {
    id: 'cmps-sf',
    species: 'dog',
    scaleName: 'CMPS-SF (Глазго, краткая форма)',
    maxFull: 24,           /* 3+4+4+5+4+4 */
    maxNoMobility: 20,     /* без категории B(iii) */
    intervention: { full: 6, noMobility: 5 },   /* WSAVA: 6/24 или 5/20 */
    categories: [
      {
        key: 'vocalisation', section: 'A(i)', title: 'Вокализация',
        ask: 'Посмотрите на собаку в боксе, не подходя. Собака…',
        hint: 'спонтанное поведение — оценка издали, до любого взаимодействия',
        items: [
          { score: 0, text: 'тиха' },
          { score: 1, text: 'скулит или хнычет' },
          { score: 2, text: 'стонет' },
          { score: 3, text: 'кричит' }
        ]
      },
      {
        key: 'attention', section: 'A(ii)', title: 'Внимание к ране',
        ask: 'Игнорирует ли собака рану или болезненную область?',
        hint: 'тот же взгляд издали: смотрит, лижет, трёт, жуёт',
        items: [
          { score: 0, text: 'игнорирует рану или болезненную область' },
          { score: 1, text: 'смотрит на рану или болезненную область' },
          { score: 2, text: 'лижет рану или болезненную область' },
          { score: 3, text: 'трёт рану или болезненную область' },
          { score: 4, text: 'жует рану или болезненную область' }
        ]
      },
      {
        key: 'mobility', section: 'B(iii)', title: 'Мобильность',
        ask: 'Когда собака встаёт и идёт, она…',
        hint: 'оценивается при подъёме и ходьбе; переломы позвоночника/таза/конечностей — секция пропускается',
        omittable: true,
        omitReason: 'перелом позвоночника, таза или нескольких конечностей; либо передвижение требует помощи',
        items: [
          { score: 0, text: 'движется нормально' },
          { score: 1, text: 'хромает' },
          { score: 2, text: 'медленно встаёт или неохотно движется' },
          { score: 3, text: 'скована' },
          { score: 4, text: 'отказывается двигаться' }
        ]
      },
      {
        key: 'touch', section: 'C(iv)', title: 'Реакция на пальпацию',
        ask: 'Мягкое давление вокруг раны или болезненной области (включая живот). Собака…',
        hint: 'интерактивная проба: аккуратно, без причинения вреда',
        items: [
          { score: 0, text: 'никак не реагирует' },
          { score: 1, text: 'оглядывается' },
          { score: 2, text: 'вздрагивает' },
          { score: 3, text: 'рычит или охраняет область' },
          { score: 4, text: 'щёлкает зубами' },
          { score: 5, text: 'кричит' }
        ]
      },
      {
        key: 'demeanour', section: 'D(v)', title: 'Общее состояние',
        ask: 'В целом собака…',
        hint: 'общее впечатление наблюдателя — оценивается последним',
        items: [
          { score: 0, text: 'довольная и бодрая' },
          { score: 1, text: 'тихая' },
          { score: 2, text: 'безразлична к окружающему' },
          { score: 3, text: 'нервная, тревожная или испуганная' },
          { score: 4, text: 'подавленная, не отзывается на стимуляцию' }
        ]
      },
      {
        key: 'posture', section: 'D(vi)', title: 'Поза',
        ask: 'Поза собаки…',
        hint: 'финальная категория: как лежит и устраивается',
        items: [
          { score: 0, text: 'комфортна' },
          { score: 1, text: 'не устраивается, беспокойна' },
          { score: 2, text: 'мечется' },
          { score: 3, text: 'сгорблена или напряжена' },
          { score: 4, text: 'окоченела' }
        ]
      }
    ]
  };

  /* ======================================================================
   * 2. FGS (кошки): 5 юнитов действия по 0/1/2 + «оценить нельзя».
   *    Дескрипторы — дословно с тренировочного руководства FGS
   *    (Evangelista et al. 2019, Sci Rep, супплементарий).
   * ====================================================================== */
  var FGS = {
    id: 'fgs',
    species: 'cat',
    scaleName: 'FGS (гримас-шкала кошек)',
    max: 10,               /* 5 юнитов × 2 */
    cutOff: 4,             /* WSAVA: ≥4/10 — спасительная анальгезия */
    ratioCutOff: 0.4,      /* ISFM-2022: ≥0.4/1.0 при пропуске юнитов */
    notScorable: 'оценить нельзя',
    units: [
      {
        key: 'ears', title: 'Положение ушей',
        items: [
          { score: 0, text: 'уши направлены вперёд' },
          { score: 1, text: 'уши слегка расставлены в стороны' },
          { score: 2, text: 'уши развёрнуты в стороны и назад' }
        ]
      },
      {
        key: 'eyes', title: 'Сужение глазной щели',
        items: [
          { score: 0, text: 'глаза открыты' },
          { score: 1, text: 'глаза прикрыты частично' },
          { score: 2, text: 'глаза прищурены' }
        ]
      },
      {
        key: 'muzzle', title: 'Напряжение морды',
        items: [
          { score: 0, text: 'расслаблена, округлая форма' },
          { score: 1, text: 'лёгкое напряжение' },
          { score: 2, text: 'напряжена, вытянутая форма' }
        ]
      },
      {
        key: 'whiskers', title: 'Изменение вибрисс',
        items: [
          { score: 0, text: 'свободные и изогнутые' },
          { score: 1, text: 'слегка изогнуты или прямые, сближены' },
          { score: 2, text: 'прямые, направлены вперёд и отстоят от морды' }
        ]
      },
      {
        key: 'head', title: 'Положение головы',
        items: [
          { score: 0, text: 'выше линии плеч' },
          { score: 1, text: 'на одной линии с плечами' },
          { score: 2, text: 'ниже линии плеч или опущена, подбородок к груди' }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* Вердикты                                                            */
  var CMPS_VERDICTS = {
    below:     { code: 'below',     label: 'ниже порога вмешательства' },
    intervene: { code: 'intervene', label: 'порог вмешательства достигнут' }
  };
  var FGS_VERDICTS = {
    below:     { code: 'below',     label: 'ниже порога вмешательства' },
    intervene: { code: 'intervene', label: 'порог вмешательства достигнут' },
    unknown:   { code: 'unknown',   label: 'недостаточно оценённых юнитов' }
  };

  function pick(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* CMPS-SF: scoring.                                                   */
  /* answers: { vocalisation: 0..3, attention: 0..4, mobility: 0..4|null, */
  /*            touch: 0..5, demeanour: 0..4, posture: 0..4 }            */
  /* mobility === null означает «секция B не проводилась» (итог /20).     */
  function cmpsScore(answers) {
    var a = answers || {};
    var mobilityOmitted = (a.mobility === null || a.mobility === undefined);
    var denom = mobilityOmitted ? CMPS_SF.maxNoMobility : CMPS_SF.maxFull;
    var threshold = mobilityOmitted
      ? CMPS_SF.intervention.noMobility : CMPS_SF.intervention.full;
    var total = 0, missing = [];
    for (var i = 0; i < CMPS_SF.categories.length; i++) {
      var c = CMPS_SF.categories[i];
      if (c.key === 'mobility' && mobilityOmitted) continue;
      var v = a[c.key];
      if (typeof v !== 'number' || isNaN(v)) { missing.push(c.section); continue; }
      var maxRank = c.items.length - 1;
      var clamped = Math.max(0, Math.min(maxRank, Math.round(v)));
      total += clamped;
    }
    if (missing.length) {
      return { ok: false, error: 'not_answered', missing: missing };
    }
    var code = total >= threshold ? 'intervene' : 'below';
    return {
      ok: true,
      total: total,
      denom: denom,
      threshold: threshold,
      mobilityOmitted: mobilityOmitted,
      verdict: CMPS_VERDICTS[code]
    };
  }

  /* ------------------------------------------------------------------ */
  /* FGS: scoring. answers: { ears: 0..2|null, eyes: …, muzzle: …,        */
  /* whiskers: …, head: … }, null = «оценить нельзя» (юнит пропускается,  */
  /* итог нормализуется: ратио = сумма / (2 × число оценённых юнитов)).   */
  function fgsScore(answers) {
    var a = answers || {};
    var scored = 0, sum = 0, missing = [];
    for (var i = 0; i < FGS.units.length; i++) {
      var u = FGS.units[i];
      var v = a[u.key];
      if (v === null || v === undefined) continue;      /* сознательный пропуск */
      if (typeof v !== 'number' || isNaN(v)) { missing.push(u.key); continue; }
      var clamped = Math.max(0, Math.min(2, Math.round(v)));
      sum += clamped;
      scored++;
    }
    if (missing.length) return { ok: false, error: 'not_answered', missing: missing };
    if (scored === 0) {
      return { ok: true, sum: 0, scored: 0, ratio: null, total: null,
               verdict: FGS_VERDICTS.unknown };
    }
    var ratio = sum / (2 * scored);
    var total = (scored === FGS.units.length) ? sum : null;
    var code = ratio >= FGS.ratioCutOff ? 'intervene' : 'below';
    return {
      ok: true,
      sum: sum,
      scored: scored,
      ratio: ratio,
      total: total,
      cutOff: FGS.cutOff,
      ratioCutOff: FGS.ratioCutOff,
      verdict: FGS_VERDICTS[code]
    };
  }

  /* ------------------------------------------------------------------ */
  /* CJK-детектор артефактов (наследие Task 232/233: поймал артефакты     */
  /* харвеста в vetpredis). Сканирует все тексты данных обеих шкал.       */
  var CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uFF01-\uFF60]/;
  function cjkScan() {
    var hits = [];
    function walk(s, where) {
      if (typeof s === 'string' && CJK.test(s)) hits.push(where + ': «' + s + '»');
    }
    CMPS_SF.categories.forEach(function (c) {
      walk(c.title, c.key + '.title'); walk(c.ask, c.key + '.ask');
      walk(c.hint, c.key + '.hint'); walk(c.omitReason, c.key + '.omitReason');
      c.items.forEach(function (it, j) { walk(it.text, c.key + '[' + j + ']'); });
    });
    FGS.units.forEach(function (u) {
      walk(u.title, u.key + '.title');
      u.items.forEach(function (it, j) { walk(it.text, u.key + '[' + j + ']'); });
    });
    return { clean: hits.length === 0, hits: hits };
  }

  return {
    CMPS_SF: CMPS_SF,
    FGS: FGS,
    CMPS_VERDICTS: CMPS_VERDICTS,
    FGS_VERDICTS: FGS_VERDICTS,
    cmpsScore: cmpsScore,
    fgsScore: fgsScore,
    cjkScan: cjkScan
  };
});
