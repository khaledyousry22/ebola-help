import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/messages/en.json' with { type: 'json' };
import {
  format,
  getMessages,
  LOCALE_CODES,
  LOCALES,
  localePath,
  stripLocale,
  suggestLocale,
} from '../../src/i18n';

type Tree = { [key: string]: string | Tree };

/** Flatten nested messages into { 'a.b.c': 'text' }. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const reference = flatten(en as Tree);

describe('translations', () => {
  for (const code of LOCALE_CODES) {
    const messages = flatten(getMessages(code) as unknown as Tree);

    it(`${code} has exactly the same keys as English`, () => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(reference).sort());
    });

    it(`${code} has no empty texts`, () => {
      const empty = Object.entries(messages).filter(([, v]) => v.trim() === '');
      expect(empty).toEqual([]);
    });

    it(`${code} keeps the same {placeholders} as English`, () => {
      for (const [key, text] of Object.entries(reference)) {
        expect(placeholders(messages[key] ?? ''), `${code}: ${key}`).toEqual(placeholders(text));
      }
    });

    it(`${code} footer states that the site is independent of WHO`, () => {
      // Every language must name WHO in its own words in the footer disclaimer.
      const who: Record<string, RegExp> = {
        ar: /منظمة الصحة العالمية/,
        zh: /世界卫生组织/,
        en: /World Health Organization/,
        fr: /Organisation mondiale de la Santé/,
        ru: /Всемирной организацией здравоохранения/,
        es: /Organización Mundial de la Salud/,
      };
      expect(messages['footer.disclaimer']).toMatch(who[code]!);
    });
  }

  it('every locale has a native name and direction', () => {
    for (const code of LOCALE_CODES) {
      expect(LOCALES[code].nativeName.length).toBeGreaterThan(1);
      expect(['ltr', 'rtl']).toContain(LOCALES[code].dir);
    }
    expect(LOCALES.ar.dir).toBe('rtl');
  });
});

describe('helpers', () => {
  it('formats placeholders', () => {
    expect(format('Write to {email}', { email: 'a@b.c' })).toBe('Write to a@b.c');
    expect(format('Keep {unknown}', {})).toBe('Keep {unknown}');
  });

  it('builds and strips locale paths', () => {
    expect(localePath('fr', '/about/')).toBe('/fr/about/');
    expect(localePath('ar')).toBe('/ar/');
    expect(stripLocale('/fr/about/')).toBe('/about/');
    expect(stripLocale('/zh/')).toBe('/');
    expect(stripLocale('/zh')).toBe('/');
    expect(stripLocale('/about/')).toBe('/about/');
  });

  it('suggests a locale from browser languages', () => {
    expect(suggestLocale(['fr-CD', 'en-US'])).toBe('fr');
    expect(suggestLocale(['sw-KE', 'en-GB'])).toBe('en');
    expect(suggestLocale(['zh-TW'])).toBe('zh');
    expect(suggestLocale(['AR-eg'])).toBe('ar');
    expect(suggestLocale(['ln', 'sw'])).toBeUndefined();
    expect(suggestLocale([])).toBeUndefined();
  });
});
