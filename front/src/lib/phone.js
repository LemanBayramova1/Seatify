// Mirrors RegisterRequestDto's server-side phone regex on the C# side — keep in sync.
export const AZ_PHONE_PATTERN = /^\+994\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

/** Formats-as-you-type into "+994 XX XXX XX XX", tolerating partial input while typing. */
export function formatAzPhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("994")) digits = digits.slice(3);
  digits = digits.slice(0, 9);

  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return groups.length ? `+994 ${groups.join(" ")}` : "";
}
