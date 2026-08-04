import { useEffect, useRef, useState } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

// Accepts "DD/MM/YYYY" (also "-" or "." separators) or 6/8 raw digits ("DDMMYY"/"DDMMYYYY").
// Returns an ISO "YYYY-MM-DD" string, or null if the text isn't a valid calendar date.
function parseDisplayToIso(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/) || trimmed.match(/^(\d{2})(\d{2})(\d{2,4})$/);
  if (!match) return null;

  let [, day, month, year] = match;
  day = Number(day);
  month = Number(month);
  year = Number(year);
  if (year < 100) year += 2000;

  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// Free-text date input: typing is never reformatted mid-stream — only parsed and
// normalized to DD/MM/YYYY on blur (or Enter). A transparent native `type="date"`
// input is overlaid on the calendar icon so the OS/browser date picker still works.
export function DateField({ value, onChange, min, max, className = "", placeholder = "DD/MM/YYYY" }) {
  const [text, setText] = useState(isoToDisplay(value));
  const nativeRef = useRef(null);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  function handleTextChange(e) {
    // Strip characters that can never belong to a date, but otherwise leave the
    // string exactly as typed — no auto-inserted separators, no reformatting.
    setText(e.target.value.replace(/[^0-9/.\-]/g, ""));
  }

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) {
      setText("");
      if (value) onChange("");
      return;
    }

    const iso = parseDisplayToIso(trimmed);
    if (!iso || (min && iso < min) || (max && iso > max)) {
      setText(isoToDisplay(value));
      return;
    }

    setText(isoToDisplay(iso));
    if (iso !== value) onChange(iso);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  function handleNativeChange(e) {
    const iso = e.target.value;
    if (!iso) return;
    setText(isoToDisplay(iso));
    if (iso !== value) onChange(iso);
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className="glass-input w-full pr-9"
        value={text}
        onChange={handleTextChange}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <span className="pointer-events-none absolute right-2.5 text-sm text-slate-400">📅</span>
      <input
        ref={nativeRef}
        type="date"
        min={min}
        max={max}
        value={value || ""}
        onChange={handleNativeChange}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-1.5 h-7 w-7 cursor-pointer opacity-0"
      />
    </div>
  );
}
