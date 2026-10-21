/**
 * Contacts for the website: helplines, offices and facilities per country.
 * Only verified entries are exposed. Pending entries stay in the data files
 * and VERIFY_ME.md until the site owner confirms them.
 */
import {
  parseHelpFile,
  verifiedOnly,
  type FacilityEntry,
  type HelpFile,
  type OfficeEntry,
  type PhoneEntry,
} from './help-schema';

const modules = import.meta.glob<{ default: unknown }>('./help/*.json', { eager: true });

const FILES: Record<string, HelpFile> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => {
    const file = parseHelpFile(mod.default, path.split('/').pop()!);
    return [file.country, file];
  }),
);

export const HELP_COUNTRIES = Object.keys(FILES).sort();

export function verifiedPhones(iso: string): PhoneEntry[] {
  return verifiedOnly(FILES[iso]?.entries ?? []).filter((e): e is PhoneEntry => e.kind === 'phone');
}

export function verifiedOffices(iso: string): OfficeEntry[] {
  return verifiedOnly(FILES[iso]?.entries ?? []).filter((e): e is OfficeEntry => e.kind === 'office');
}

export function verifiedFacilities(iso: string): FacilityEntry[] {
  return verifiedOnly(FILES[iso]?.entries ?? []).filter((e): e is FacilityEntry => e.kind === 'facility');
}

/** Whether contacts for this country are still being checked (nothing about them is shown). */
export function hasPendingContacts(iso: string): boolean {
  return (FILES[iso]?.entries ?? []).some((e) => e.status === 'pending');
}

/** Link target for a phone entry: tel:, sms: or WhatsApp. */
export function phoneHref(entry: PhoneEntry): string {
  const digits = entry.number.replace(/[^0-9+*#]/g, '');
  switch (entry.channel) {
    case 'sms':
      return `sms:${digits}`;
    case 'whatsapp':
      return `https://wa.me/${digits.replace(/^\+/, '')}`;
    case 'ussd':
      return `tel:${digits.replace(/#/g, '%23')}`;
    default:
      return `tel:${digits}`;
  }
}
