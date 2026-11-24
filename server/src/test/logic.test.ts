import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, flightMinutes, coarse, validLatLon } from '../geo';
import { checkText, normalize } from '../moderation';
import { fromGoogleLang, toGoogleLang, isLang, LANGS } from '../config';
import { fmt } from '../notify';
import { numericUid, playAccountId } from '../common';

test('distance Baghdad to Toronto is about 9,700 km', () => {
  const km = distanceKm({ lat: 33.31, lon: 44.36 }, { lat: 43.65, lon: -79.38 });
  assert.ok(km > 9500 && km < 9900, String(km));
});

test('flight time is clamped and fast pigeons take 30 minutes', () => {
  assert.equal(flightMinutes(10, false), 20);
  assert.equal(flightMinutes(9000, false), 360);
  assert.equal(flightMinutes(20000, false), 480);
  assert.equal(flightMinutes(9000, true), 30);
});

test('coordinates are stored at city precision', () => {
  assert.equal(coarse(33.31234), 33.3);
  assert.ok(validLatLon({ lat: 1, lon: 2 }));
  assert.ok(!validLatLon({ lat: 91, lon: 2 }));
  assert.ok(!validLatLon(null));
});

test('text checks block links and phone numbers only when strict', () => {
  assert.equal(checkText('', 400, true), 'empty');
  assert.equal(checkText('a'.repeat(401), 400, true), 'too_long');
  assert.equal(checkText('see t.me/abc', 400, true), 'link');
  assert.equal(checkText('call +964 770 123 4567', 400, true), 'phone');
  assert.equal(checkText('call +964 770 123 4567', 400, false), null);
  assert.equal(checkText('مرحباً من بغداد', 400, true), null);
  assert.equal(checkText('hello friend.com', 400, true), 'link');
  assert.equal(normalize('  a \n\n\n\n b  '), 'a \n\n b');
});

test('language codes', () => {
  assert.equal(LANGS.length, 12);
  assert.ok(isLang('ku') && !isLang('xx'));
  assert.equal(toGoogleLang('zh'), 'zh-CN');
  assert.equal(fromGoogleLang('zh-TW'), 'zh');
  assert.equal(fromGoogleLang('iw'), 'he');
  assert.equal(fromGoogleLang('pt-BR'), 'pt');
});

test('every push text exists in every language', () => {
  for (const l of LANGS) {
    for (const k of ['landed_t', 'landed_b', 'caught_t', 'caught_b', 'call_t', 'voice', 'video', 'expired_t', 'expired_b'] as const) {
      const s = fmt(l, k, { city: 'X', country: 'Y', name: 'Z' });
      assert.ok(s && !s.includes('{'), `${l}.${k}`);
    }
  }
});

test('ids are stable', () => {
  assert.equal(numericUid('abc'), numericUid('abc'));
  assert.ok(numericUid('abc') >= 1 && numericUid('abc') < 2 ** 31);
  assert.equal(playAccountId('u1').length, 64);
});

import { cleanName, imageExt, isChatMediaUrl, mediaExt } from '../media';

test('media: images are recognised by their bytes, not their name', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(20)]);
  const fake = Buffer.from('<?php echo 1; ?>  padding padding');
  assert.equal(imageExt(jpg), 'jpg');
  assert.equal(imageExt(png), 'png');
  assert.equal(imageExt(fake), null);
  assert.equal(mediaExt('image', fake, 'photo.jpg', 'image/jpeg'), null);
});

test('media: only harmless file types are stored', () => {
  const b = Buffer.alloc(32);
  assert.equal(mediaExt('file', b, 'report.PDF', ''), 'pdf');
  assert.equal(mediaExt('file', b, 'shell.php', ''), null);
  assert.equal(mediaExt('file', b, 'page.html', ''), null);
  assert.equal(mediaExt('file', b, 'image.svg', ''), null);
  assert.equal(mediaExt('file', b, 'app.apk', ''), null);
  assert.equal(mediaExt('file', b, 'noext', ''), null);
  assert.equal(mediaExt('audio', b, 'voice.m4a', ''), 'm4a');
  assert.equal(mediaExt('audio', b, 'voice', 'audio/mp4'), 'm4a');
  assert.equal(mediaExt('audio', b, 'x.php', 'text/html'), null);
});

test('media: links must point to this chat', () => {
  process.env.MEDIA_URL = 'https://example.com/media';
  const ok = 'https://example.com/media/chat/abc123/0123456789abcdef01234567.jpg';
  assert.equal(isChatMediaUrl('abc123', ok), true);
  assert.equal(isChatMediaUrl('other1', ok), false);
  assert.equal(isChatMediaUrl('abc123', 'https://evil.com/media/chat/abc123/0123456789abcdef01234567.jpg'), false);
  assert.equal(isChatMediaUrl('abc123', 'https://example.com/media/chat/abc123/../x.jpg'), false);
  assert.equal(cleanName('../../etc/passwd'), 'passwd');
  assert.equal(cleanName('my "report" <v2>.pdf'), 'my report v2.pdf');
});
