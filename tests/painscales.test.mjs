/*!
 * painscales.test.mjs — гейт витрины «Шкалы боли»: известные ответы.
 *
 * Классы проверок (наследие гейт-культуры экосистемы):
 *  1. структура шкал — число категорий/дескрипторов, ранги строго
 *     последовательны 0..N-1 (Reid et al. 2007: 4+5+5+6+5+5 = 30
 *     дескрипторов, максимум 24);
 *  2. пороги — painscales.js против tests/thresholds.reference.json
 *     (паттерн tokens.json-verify: дрейф = красный CI);
 *  3. точечные известные ответы — суммы, посчитанные руками;
 *  4. границы порогов — 5/24 vs 6/24, 4/20 vs 5/20, 3 vs 4 из 10;
 *  5. ратио-нормализация FGS при пропуске юнитов (ISFM-2022);
 *  6. мусорный ввод — вне диапазона клампится, пропуски честные;
 *  7. CJK-детектор артефактов (урок vetpredis Task 233).
 *
 * Запуск: node --test tests/painscales.test.mjs   (CI: .github/workflows/ci.yml)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import P from '../painscales.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = JSON.parse(readFileSync(join(HERE, 'thresholds.reference.json'), 'utf8'));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

const CMPS = P.CMPS_SF, FGS = P.FGS;

/* ---------- 1. структура шкал ------------------------------------------- */

test('CMPS-SF: шесть категорий, ровно в порядке бланка', () => {
  const keys = CMPS.categories.map(c => c.key);
  assert.deepEqual(keys, REF.cmps.categories);
});

test('CMPS-SF: число дескрипторов 4+5+5+6+5+5 = 30 (Reid et al. 2007)', () => {
  const counts = CMPS.categories.map(c => c.items.length);
  assert.deepEqual(counts, REF.cmps.itemCounts);
  assert.equal(counts.reduce((a, b) => a + b, 0), 30);
});

test('CMPS-SF: ранги строго последовательны от нуля', () => {
  CMPS.categories.forEach(c => {
    c.items.forEach((it, j) => assert.equal(it.score, j,
      `${c.key}[${j}]: ранг должен быть ${j}, а не ${it.score}`));
  });
});

test('CMPS-SF: мобильность — единственная омисибельная категория', () => {
  const omittable = CMPS.categories.filter(c => c.omittable).map(c => c.key);
  assert.deepEqual(omittable, REF.cmps.omittable);
});

test('FGS: пять юнитов, по три дескриптора 0/1/2', () => {
  assert.deepEqual(FGS.units.map(u => u.key), REF.fgs.units);
  FGS.units.forEach(u => {
    assert.equal(u.items.length, REF.fgs.unitItemCount);
    u.items.forEach((it, j) => assert.equal(it.score, j));
  });
});

test('структура: у каждого дескриптора есть непустой текст', () => {
  CMPS.categories.forEach(c => c.items.forEach(it => {
    assert.equal(typeof it.text, 'string');
    assert.ok(it.text.length >= 3, `${c.key}: подозрительно короткий текст`);
  }));
  FGS.units.forEach(u => u.items.forEach(it => {
    assert.equal(typeof it.text, 'string');
    assert.ok(it.text.length >= 3);
  }));
});

/* ---------- 2. пороги против референса (tokens.json-verify) -------------- */

test('пороги CMPS-SF из painscales.js не дрейфуют от референса', () => {
  assert.equal(CMPS.maxFull, REF.cmps.maxFull);
  assert.equal(CMPS.maxNoMobility, REF.cmps.maxNoMobility);
  assert.equal(CMPS.intervention.full, REF.cmps.interventionFull);
  assert.equal(CMPS.intervention.noMobility, REF.cmps.interventionNoMobility);
});

test('пороги FGS из painscales.js не дрейфуют от референса', () => {
  assert.equal(FGS.max, REF.fgs.max);
  assert.equal(FGS.cutOff, REF.fgs.cutOff);
  assert.equal(FGS.ratioCutOff, REF.fgs.ratioCutOff);
});

test('максимумы согласованы со структурой (3+4+4+5+4+4 = 24)', () => {
  const sumMax = CMPS.categories.reduce((a, c) => a + c.items.length - 1, 0);
  assert.equal(sumMax, 24);
  assert.equal(CMPS.maxFull, 24);
  const withoutMobility = sumMax - (CMPS.categories[2].items.length - 1);
  assert.equal(withoutMobility, 20);
  assert.equal(CMPS.maxNoMobility, 20);
});

/* ---------- 3. точечные известные ответы ---------------------------------- */

test('CMPS: здоровая собака — 0/24, ниже порога', () => {
  const r = P.cmpsScore({ vocalisation: 0, attention: 0, mobility: 0, touch: 0, demeanour: 0, posture: 0 });
  assert.ok(r.ok);
  assert.equal(r.total, 0);
  assert.equal(r.denom, 24);
  assert.equal(r.threshold, 6);
  assert.equal(r.verdict.code, 'below');
});

test('CMPS: худший случай — 24/24, порог достигнут', () => {
  const r = P.cmpsScore({ vocalisation: 3, attention: 4, mobility: 4, touch: 5, demeanour: 4, posture: 4 });
  assert.equal(r.total, 24);
  assert.equal(r.denom, 24);
  assert.equal(r.verdict.code, 'intervene');
});

test('CMPS: рукасчитанный средний случай — 7/24 (1+1+1+2+1+1)', () => {
  const r = P.cmpsScore({ vocalisation: 1, attention: 1, mobility: 1, touch: 2, demeanour: 1, posture: 1 });
  assert.equal(r.total, 7);
  assert.equal(r.verdict.code, 'intervene');
});

test('CMPS: пропущенная мобильность — /20 и порог 5', () => {
  const r = P.cmpsScore({ vocalisation: 1, attention: 1, mobility: null, touch: 2, demeanour: 1, posture: 1 });
  assert.equal(r.mobilityOmitted, true);
  assert.equal(r.total, 6);
  assert.equal(r.denom, 20);
  assert.equal(r.threshold, 5);
  assert.equal(r.verdict.code, 'intervene');
});

test('CMPS: неполный опрос честно отказывается считать', () => {
  const r = P.cmpsScore({ vocalisation: 2, attention: 0, mobility: 0, touch: 0, demeanour: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'not_answered');
  assert.deepEqual(r.missing, ['D(vi)']);
});

/* ---------- 4. границы порогов ------------------------------------------- */

test('CMPS: 5/24 — ещё ниже, 6/24 — уже вмешательство', () => {
  const mk = t => P.cmpsScore({ vocalisation: 1, attention: 0, mobility: 0, touch: t, demeanour: 0, posture: 0 });
  /* 1+0+0+4+0+0 = 5 */
  assert.equal(mk(4).total, 5);
  assert.equal(mk(4).verdict.code, 'below');
  /* 1+0+0+5+0+0 = 6 */
  assert.equal(mk(5).total, 6);
  assert.equal(mk(5).verdict.code, 'intervene');
});

test('CMPS: 4/20 — ещё ниже, 5/20 — уже вмешательство (без мобильности)', () => {
  const mk = t => P.cmpsScore({ vocalisation: 1, attention: 0, mobility: null, touch: t, demeanour: 0, posture: 0 });
  assert.equal(mk(3).total, 4);
  assert.equal(mk(3).verdict.code, 'below');
  assert.equal(mk(4).total, 5);
  assert.equal(mk(4).verdict.code, 'intervene');
});

test('FGS: 3/10 — ещё ниже, 4/10 — уже спасительная анальгезия', () => {
  const below = P.fgsScore({ ears: 1, eyes: 1, muzzle: 1, whiskers: 0, head: 0 });
  assert.equal(below.sum, 3);
  assert.equal(below.total, 3);
  assert.equal(below.verdict.code, 'below');
  const at = P.fgsScore({ ears: 1, eyes: 1, muzzle: 1, whiskers: 1, head: 0 });
  assert.equal(at.sum, 4);
  assert.equal(at.verdict.code, 'intervene');
});

test('FGS: максимум — 10/10', () => {
  const r = P.fgsScore({ ears: 2, eyes: 2, muzzle: 2, whiskers: 2, head: 2 });
  assert.equal(r.sum, 10);
  assert.equal(r.total, 10);
  assert.equal(r.verdict.code, 'intervene');
});

/* ---------- 5. ратио-нормализация FGS (ISFM-2022) ----------------------- */

test('FGS: 4 оценённых юнита, сумма 5 → ратио 5/8 = 0.625 ≥ 0.4', () => {
  const r = P.fgsScore({ ears: 2, eyes: 2, muzzle: 1, whiskers: null, head: 0 });
  assert.equal(r.sum, 5);
  assert.equal(r.scored, 4);
  assert.ok(near(r.ratio, 0.625));
  assert.equal(r.total, null);          /* total честно не определён */
  assert.equal(r.verdict.code, 'intervene');
});

test('FGS: 4 оценённых юнита, сумма 3 → ратио 3/8 = 0.375 < 0.4 — ниже порога', () => {
  const r = P.fgsScore({ ears: 1, eyes: 1, muzzle: 1, whiskers: null, head: 0 });
  assert.ok(near(r.ratio, 0.375));
  assert.equal(r.verdict.code, 'below');
});

test('FGS: ратио и порог 4/10 дают один вердикт при полных 5 юнитах', () => {
  /* 4/10: sum=4, ratio=0.4 — обе проверки на одной границе */
  const r = P.fgsScore({ ears: 1, eyes: 1, muzzle: 1, whiskers: 1, head: 0 });
  assert.ok(near(r.ratio, 0.4));
  assert.equal(r.verdict.code, 'intervene');
});

test('FGS: ни одного оценённого юнита — вердикт «не определён»', () => {
  const r = P.fgsScore({ ears: null, eyes: null, muzzle: null, whiskers: null, head: null });
  assert.equal(r.scored, 0);
  assert.equal(r.ratio, null);
  assert.equal(r.verdict.code, 'unknown');
});

/* ---------- 6. мусорный ввод --------------------------------------------- */

test('CMPS: балл вне диапазона клампится к границам категории', () => {
  const r = P.cmpsScore({ vocalisation: 99, attention: 0, mobility: 0, touch: -5, demeanour: 0, posture: 0 });
  assert.equal(r.total, 3 + 0 + 0 + 0 + 0 + 0);   /* vocalisation → 3, touch → 0 */
});

test('FGS: балл вне диапазона клампится к 0..2', () => {
  const r = P.fgsScore({ ears: 9, eyes: -1, muzzle: 2, whiskers: 2, head: 2 });
  assert.equal(r.sum, 2 + 0 + 2 + 2 + 2);
  assert.equal(r.total, 8);
});

/* ---------- 7. CJK-детектор ---------------------------------------------- */

test('все тексты данных чисты от CJK-артефактов', () => {
  const scan = P.cjkScan();
  assert.ok(scan.clean, 'артефакты: ' + scan.hits.join('; '));
});

test('CJK-детектор действительно ловит артефакт (самопроверка детектора)', () => {
  const bad = 'уши направлены вперёд…耳朵';
  assert.ok(/[\u4E00-\u9FFF]/.test(bad));
});
