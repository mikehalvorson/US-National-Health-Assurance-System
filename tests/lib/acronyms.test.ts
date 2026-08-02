import { describe, expect, test } from 'vitest';
import { ACRONYMS, acronymPattern } from '../../src/lib/acronyms';

const matches = (text: string): string[] =>
  [...text.matchAll(acronymPattern())].map((m) => m[1]);

describe('ACRONYMS glossary', () => {
  test('keys are acronym tokens (uppercase-led, no whitespace, length >= 2)', () => {
    for (const key of Object.keys(ACRONYMS)) {
      expect(key.length, key).toBeGreaterThanOrEqual(2);
      expect(key, key).toMatch(/^[A-Z][A-Za-z0-9&./-]*$/);
      expect(key, key).not.toMatch(/\s/);
    }
  });

  test('every value is a non-empty, trimmed expansion', () => {
    for (const [key, value] of Object.entries(ACRONYMS)) {
      expect(value.length, key).toBeGreaterThan(0);
      expect(value, key).toBe(value.trim());
    }
  });

  test('no expansion uses an em dash (site rule)', () => {
    for (const [key, value] of Object.entries(ACRONYMS)) {
      expect(value.includes('—'), key).toBe(false);
    }
  });

  test('external bodies expand to their real names', () => {
    expect(ACRONYMS.CBO).toBe('Congressional Budget Office');
    expect(ACRONYMS.CMS).toBe('Centers for Medicare & Medicaid Services');
    expect(ACRONYMS.IRS).toBe('Internal Revenue Service');
    expect(ACRONYMS.JCT).toBe('Joint Committee on Taxation');
    expect(ACRONYMS.OECD).toBe('Organisation for Economic Co-operation and Development');
  });

  test('the parameter-class codes are present (they carry hovers on the quality tab)', () => {
    expect(ACRONYMS.CP).toBeTruthy();
    expect(ACRONYMS.KPP).toBeTruthy();
    expect(ACRONYMS.TPP).toBeTruthy();
  });

  test('IV is excluded so it never shadows a legislative Title IV', () => {
    expect(ACRONYMS.IV).toBeUndefined();
  });
});

describe('acronymPattern', () => {
  test('decorates a standalone acronym in prose and in parentheses', () => {
    expect(matches('the CBO scored it')).toEqual(['CBO']);
    expect(matches('run through CMS (and HHS).')).toEqual(['CMS', 'HHS']);
  });

  test('decorates an acronym at the end of a sentence', () => {
    expect(matches('the price was set by CMS.')).toEqual(['CMS']);
  });

  test('never fragments a longer code', () => {
    expect(matches('CP-POP-004')).toEqual([]);
    expect(matches('target KPP-C7 applies')).toEqual([]);
    expect(matches('SR-DRUG-002 is the floor')).toEqual([]);
  });

  test('prefers the longest key when codes overlap', () => {
    expect(matches('see SR-DATA for detail')).toEqual(['SR-DATA']);
  });

  test('is case sensitive so lowercase words are left alone', () => {
    expect(matches('who pays for it and who does not')).toEqual([]);
  });

  test('leaves hyphenated compounds alone rather than half-wrapping them', () => {
    // "CBO-scored" is skipped on purpose: matching here would re-open the
    // door to fragmenting real codes like CP-POP-004.
    expect(matches('a CBO-scored estimate')).toEqual([]);
  });
});
