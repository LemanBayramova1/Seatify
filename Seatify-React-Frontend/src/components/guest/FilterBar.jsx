import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isSlotPast, TIME_SLOTS, todayIso } from "../../lib/timeSlots";
import { ZONES } from "../../lib/zones";
import { GlassCard } from "../shared/GlassCard";

export function FilterBar({ filters, onChange, availableZones }) {
  const { t } = useTranslation();
  const zoneOptions = availableZones?.length ? ZONES.filter((z) => availableZones.includes(z.id)) : ZONES;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <GlassCard className="flex flex-wrap items-end gap-4 px-5 py-4">
        <Field label={t("guest.filters.date")}>
          <input
            type="date"
            min={todayIso()}
            className="glass-input"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
          />
        </Field>

        <Field label={t("guest.filters.timeSlot")}>
          <select className="glass-input" value={filters.timeSlot} onChange={(e) => onChange({ ...filters, timeSlot: e.target.value })}>
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot} disabled={isSlotPast(filters.date, slot)}>
                {slot}
                {isSlotPast(filters.date, slot) ? ` (${t("guest.filters.slotPast")})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("guest.filters.guests")}>
          <input
            type="number"
            min={1}
            className="glass-input w-24"
            value={filters.partySize}
            onChange={(e) => onChange({ ...filters, partySize: Number(e.target.value) })}
          />
        </Field>

        <Field label={t("guest.filters.zone")}>
          <select className="glass-input" value={filters.zone} onChange={(e) => onChange({ ...filters, zone: e.target.value })}>
            <option value="">{t("guest.filters.allZones")}</option>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {t(`builder.zones.${zone.id}`)}
              </option>
            ))}
          </select>
        </Field>

        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <Legend color="bg-status-free" label={t("guest.status.FREE")} />
          <Legend color="bg-status-held" label={t("guest.status.HELD")} />
          <Legend color="bg-status-booked" label={t("guest.status.BOOKED")} />
          <Legend color="bg-brand-500" label={t("guest.status.SELECTED")} />
        </div>
      </GlassCard>
    </motion.div>
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
