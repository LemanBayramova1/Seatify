import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isSlotPast, TIME_SLOTS, todayIso } from "../../lib/timeSlots";
import { ZONES } from "../../lib/zones";
import { DateField } from "../shared/DateField";
import { GlassCard } from "../shared/GlassCard";

export function FilterBar({ filters, onChange, availableZones }) {
  const { t } = useTranslation();
  const zoneOptions = availableZones?.length ? ZONES.filter((z) => availableZones.includes(z.id)) : ZONES;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <GlassCard className="space-y-5 px-5 py-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr_auto]">
          <Field label={t("guest.filters.date")}>
            <DateField min={todayIso()} value={filters.date} onChange={(date) => onChange({ ...filters, date })} />
          </Field>

          <Field label={t("guest.filters.timeSlot")}>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const past = isSlotPast(filters.date, slot);
                const active = filters.timeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={past}
                    onClick={() => onChange({ ...filters, timeSlot: slot })}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      active
                        ? "border-brand-400/60 bg-brand-500 text-white shadow-glow"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t("guest.filters.guests")}>
            <GuestStepper value={filters.partySize} onChange={(partySize) => onChange({ ...filters, partySize })} />
          </Field>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
          <Field label={t("guest.filters.zone")}>
            <div className="flex flex-wrap gap-2">
              <ZoneChip active={!filters.zone} label={t("guest.filters.allZones")} onClick={() => onChange({ ...filters, zone: "" })} />
              {zoneOptions.map((zone) => (
                <ZoneChip
                  key={zone.id}
                  active={filters.zone === zone.id}
                  label={t(`builder.zones.${zone.id}`)}
                  color={zone.color}
                  onClick={() => onChange({ ...filters, zone: zone.id })}
                />
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <Legend color="bg-status-free" label={t("guest.status.FREE")} />
            <Legend color="bg-status-held" label={t("guest.status.HELD")} />
            <Legend color="bg-status-booked" label={t("guest.status.BOOKED")} />
            <Legend color="bg-brand-500" label={t("guest.status.SELECTED")} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function GuestStepper({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="-"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold text-slate-100">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="+"
      >
        +
      </button>
    </div>
  );
}

function ZoneChip({ active, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-400/60 bg-brand-500/15 text-slate-100"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {children}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
