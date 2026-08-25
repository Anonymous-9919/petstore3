const separators = /[\s().-]/g;

function asciiDigits(value: string) {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  });
}

export function canonicalizeKuwaitPhone(value: string) {
  const compact = asciiDigits(value.trim()).replace(separators, "");
  const match = compact.match(/^(?:\+965|00965|965)?(\d{8})$/);
  return match ? `+965${match[1]}` : null;
}

export function kuwaitPhoneLookupValues(phone: string) {
  const canonical = canonicalizeKuwaitPhone(phone);
  if (!canonical) return [];
  const local = canonical.slice(4);
  return [canonical, canonical.slice(1), `00965${local}`, local];
}
