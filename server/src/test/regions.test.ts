import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchesWant, readWant, regionOf } from '../regions';
import { isLang } from '../config';
import { FACTS } from '../facts';
import { plain } from '../backup';
import { Timestamp } from 'firebase-admin/firestore';

const countries = JSON.parse(readFileSync(join(__dirname, '../../../app/assets/countries.json'), 'utf8')) as { c: string }[];

test('every country the app offers has a region and a fact', () => {
  for (const { c } of countries) {
    assert.ok(regionOf(c), `no region for ${c}`);
    assert.ok(FACTS[c], `no fact for ${c}`);
  }
});

test('regions', () => {
  assert.equal(regionOf('IQ'), 'AS');
  assert.equal(regionOf('DE'), 'EU');
  assert.equal(regionOf('BR'), 'SA');
  assert.equal(regionOf('EG'), 'AF');
  assert.equal(regionOf('XX'), null);
});

test('filters match only what was chosen', () => {
  const y = 2026;
  const iraqi = { country: 'IQ', lang: 'ar', birthYear: 1996 };
  assert.ok(matchesWant(iraqi, {}, y));
  assert.ok(matchesWant(iraqi, { region: 'AS', lang: 'ar', ageMin: 25, ageMax: 35 }, y));
  assert.ok(!matchesWant(iraqi, { region: 'EU' }, y));
  assert.ok(!matchesWant(iraqi, { lang: 'en' }, y));
  assert.ok(!matchesWant(iraqi, { ageMin: 31 }, y));
  assert.ok(!matchesWant({ country: 'IQ', lang: 'ar' }, { ageMax: 40 }, y), 'unknown age never matches an age filter');
  // Gender only matches people who opted in to share it.
  assert.ok(!matchesWant({ ...iraqi, gender: 'f' }, { gender: 'f' }, y));
  assert.ok(matchesWant({ ...iraqi, gender: 'f', genderMatch: true }, { gender: 'f' }, y));
});

test('readWant drops bad values and orders the age range', () => {
  assert.deepEqual(readWant({ region: 'XX', lang: 'zz', ageMin: 10, gender: 'x' }, isLang), {});
  assert.deepEqual(readWant({ region: 'EU', lang: 'de', ageMin: 40, ageMax: 20, gender: 'm' }, isLang), { region: 'EU', lang: 'de', ageMin: 20, ageMax: 40, gender: 'm' });
});

test('backup turns timestamps into plain JSON', () => {
  assert.deepEqual(plain({ a: Timestamp.fromMillis(5), b: [Timestamp.fromMillis(6)], c: 'x' }), { a: { _ts: 5 }, b: [{ _ts: 6 }], c: 'x' });
});
