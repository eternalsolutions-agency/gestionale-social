import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWebsiteUrl} from '../lib/website-url.mjs';

test('accepts stored website addresses without a protocol', () => {
  for (const [input, expected] of [
    ['www.rpdigital.it', 'https://www.rpdigital.it/'],
    [' rpdigital.it ', 'https://rpdigital.it/'],
    ['//www.rpdigital.it/servizi', 'https://www.rpdigital.it/servizi'],
    ['https://rpdigital.it/?a=1', 'https://rpdigital.it/?a=1'],
    ['http://example.com', 'http://example.com/'],
    ['example.com:8080/path', 'https://example.com:8080/path']
  ]) assert.equal(normalizeWebsiteUrl(input), expected);
});
test('rejects malformed URLs, credentials and non-web protocols before fetching', () => {
  for (const input of ['', null, {}, 'not a website', 'https://', 'javascript:alert(1)', 'file:///etc/passwd', 'ftp://example.com', 'https://user:password@example.com']) {
    assert.throws(() => normalizeWebsiteUrl(input));
  }
});
