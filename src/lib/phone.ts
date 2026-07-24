import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'IN';

export interface NormalizedPhone {
    e164: string;
    country: CountryCode;
    nationalNumber: string;
}

export function normalizePhone(
    input: unknown,
    defaultCountry: string = DEFAULT_PHONE_COUNTRY,
): NormalizedPhone | null {
    if (typeof input !== 'string' || !input.trim()) return null;
    const country = defaultCountry.trim().toUpperCase() as CountryCode;
    try {
        const parsed = parsePhoneNumberFromString(input.trim(), country);
        if (!parsed?.isValid()) return null;
        return {
            e164: parsed.number,
            country: parsed.country || country,
            nationalNumber: parsed.nationalNumber,
        };
    } catch {
        return null;
    }
}

export function requirePhone(input: unknown, defaultCountry?: string): NormalizedPhone {
    const phone = normalizePhone(input, defaultCountry);
    if (!phone) throw new Error('Enter a valid international phone number');
    return phone;
}
