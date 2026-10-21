/**
 * The editing page (.pages.yml) must offer exactly the fields and choices
 * the site accepts, otherwise a save could drop data or be rejected.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SOURCES } from '../../src/data/sources';
import { outbreakSchema } from '../../src/data/outbreak';
import { facilityEntrySchema, helpFileSchema, officeEntrySchema, phoneEntrySchema } from '../../src/data/help-schema';

interface Field {
  name: string;
  type?: string;
  component?: string;
  fields?: Field[];
  blocks?: Field[];
  blockKey?: string;
  options?: { values?: (string | { name: string })[] };
}

const config = parse(readFileSync('.pages.yml', 'utf8')) as {
  components: Record<string, Omit<Field, 'name'>>;
  content: (Field & { path: string })[];
};

const entry = (name: string) => config.content.find((c) => c.name === name)!;
const resolve = (field: Field): Field => (field.component ? { ...config.components[field.component], ...field } : field);
const names = (fields: Field[] = []) => fields.map((f) => f.name).sort();
const values = (field: Field) => (resolve(field).options?.values ?? []).map((v) => (typeof v === 'string' ? v : v.name)).sort();
const field = (fields: Field[] = [], name: string) => resolve(fields.find((f) => f.name === name)!);
const keys = (shape: object, except: string[] = []) => Object.keys(shape).filter((k) => !except.includes(k)).sort();
const options = (schema: unknown) => [...(schema as { options: string[] }).options].sort();

describe('editing page', () => {
  it('offers every official source, and only those', () => {
    expect(values({ name: 'source', component: 'source' })).toEqual(Object.keys(SOURCES).sort());
  });

  it('edits the files the site reads', () => {
    expect(entry('outbreak').path).toBe('src/data/outbreak.json');
    expect(entry('help').path).toBe('src/data/help');
    expect(entry('news').path).toBe('src/data/news/overrides.json');
  });

  it('shows every outbreak field', () => {
    const fields = entry('outbreak').fields!;
    expect(names(fields)).toEqual(keys(outbreakSchema.shape));
    expect(names(field(fields, 'headline').fields)).toEqual(keys(outbreakSchema.shape.headline.shape));
    const country = outbreakSchema.shape.countries.element.shape;
    const countries = field(fields, 'countries').fields!;
    expect(names(countries)).toEqual(keys(country));
    expect(values(field(countries, 'status'))).toEqual(options(country.status));
    expect(names(field(countries, 'figures').fields)).toEqual(['asOf', 'confirmedCases', 'confirmedDeaths', 'source']);
    expect(values(field(fields, 'virus'))).toEqual(options(outbreakSchema.shape.virus));
  });

  it('shows every helpline, office and treatment centre field', () => {
    const fields = entry('help').fields!;
    expect(names(fields)).toEqual(keys(helpFileSchema.shape));
    const entries = field(fields, 'entries');
    expect(entries.blockKey).toBe('kind');
    const schemas = { phone: phoneEntrySchema, office: officeEntrySchema, facility: facilityEntrySchema };
    expect(names(entries.blocks)).toEqual(Object.keys(schemas).sort());
    for (const [kind, schema] of Object.entries(schemas)) {
      const block = field(entries.blocks, kind).fields!;
      expect(names(block), kind).toEqual(keys(schema.shape, ['kind']));
      for (const f of block) {
        const choices = (schema.shape as Record<string, unknown>)[f.name] as { options?: string[] };
        if (resolve(f).type === 'select') expect(values(f), `${kind}.${f.name}`).toEqual(options(choices));
      }
    }
  });

  it('keeps a verification date empty unless one is entered', () => {
    expect(config.components.verifiedAt).toMatchObject({ default: '' });
  });
});
