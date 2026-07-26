import { useEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cancelHold, getAvailability, holdTable } from "../../services/apiService";
import { joinVenue, leaveVenue, subscribe } from "../../services/realtimeBus";
import { todayIso, TIME_SLOTS } from "../../lib/timeSlots";
import { TableElement } from "../admin/TableElement";
import { Tooltip } from "../shared/Tooltip";
import { FilterBar } from "./FilterBar";
import { BookingModal } from "./BookingModal";
import { TableDetailsDrawer } from "./TableDetailsDrawer";

const STAGE_WIDTH = 860;
const STAGE_HEIGHT = 560;

export function BookingMap({ venueId, restaurant }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ date: todayIso(), timeSlot: TIME_SLOTS[2], partySize: 2, zone: "" });
  const [tables, setTables] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [hovered, setHovered] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const prevSlotRef = useRef({ date: filters.date, timeSlot: filters.timeSlot });

  useEffect(() => {
    let cancelled = false;

    // Changing the date or time slot invalidates any in-progress hold/selection for the OLD
    // slot — release it server-side (best-effort) and reset local UI so a stale modal/highlight
    // never survives a date change. partySize/zone changes alone don't touch a hold.
    const prevSlot = prevSlotRef.current;
    const slotChanged = prevSlot.date !== filters.date || prevSlot.timeSlot !== filters.timeSlot;
    if (slotChanged) {
      if (activeBooking) {
        cancelHold({
          venueId,
          reservationId: activeBooking.reservation.reservationId,
          tableId: activeBooking.table.id,
          date: prevSlot.date,
          timeSlot: prevSlot.timeSlot,
        }).catch(() => {
          // Best-effort — the hold may have already auto-expired server-side.
        });
      }
      setSelectedTableId(null);
      setActiveBooking(null);
    }
    prevSlotRef.current = { date: filters.date, timeSlot: filters.timeSlot };

    getAvailability({ venueId, ...filters }).then((data) => {
      if (!cancelled) {
        setTables(data.tables);
        setOverrides({});
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, filters]);

  useEffect(() => {
    joinVenue(venueId);
    return () => leaveVenue(venueId);
  }, [venueId]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type !== "TableStatusChanged") return;
      if (event.venueId !== venueId) return;
      // Mock-mode events carry date/timeSlot (per-slot simulation); real hub events don't
      // (the API models one live status per table, regardless of date/time — see the
      // backend README) so only filter on them when they're actually present.
      if (event.date !== undefined && (event.date !== filters.date || event.timeSlot !== filters.timeSlot)) return;
      setOverrides((prev) => ({ ...prev, [event.tableId]: event.status }));
    });
  }, [venueId, filters.date, filters.timeSlot]);

  const visibleTables = tables.map((table) => ({ ...table, status: overrides[table.id] ?? table.status }));
  const drawerTable = selectedTableId && !activeBooking ? visibleTables.find((t) => t.id === selectedTableId) : null;

  function handleTableClick(table) {
    const status = overrides[table.id] ?? table.status;
    if (status !== "FREE") return;
    setSelectedTableId(table.id);
  }

  async function handleReserve(specialRequests) {
    const table = visibleTables.find((t) => t.id === selectedTableId);
    if (!table) return;
    try {
      const reservation = await holdTable({
        venueId,
        tableId: table.id,
        date: filters.date,
        timeSlot: filters.timeSlot,
        partySize: filters.partySize,
      });
      setHovered(null);
      setActiveBooking({ table, reservation, specialRequests });
    } catch (err) {
      setErrorMessage(err.message ?? t("guest.tableTaken"));
      setTimeout(() => setErrorMessage(null), 4000);
    }
  }

  function closeBookingFlow() {
    setActiveBooking(null);
    setSelectedTableId(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/restaurants" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200">
          ← {t("restaurants.backToCatalog")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">{restaurant?.name ?? t("guest.heroTitle")}</h1>
            <p className="text-sm text-slate-400">
              {restaurant ? `${restaurant.address} · ★ ${restaurant.rating}` : t("guest.heroSubtitle")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} availableZones={restaurant?.zonesOffered} />
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {visibleTables.length === 0 && <p className="text-center text-sm text-slate-400">{t("guest.noResults")}</p>}

      <div className="relative mx-auto" style={{ width: STAGE_WIDTH }}>
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 shadow-glass"
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            backgroundColor: "#0e1220",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
            <Layer>
              {visibleTables.map((table) => (
                <TableElement
                  key={table.id}
                  element={table}
                  mode="viewer"
                  status={table.status}
                  isSelected={table.id === selectedTableId}
                  onClick={() => handleTableClick(table)}
                  onHover={() => setHovered(table)}
                  onHoverEnd={() => setHovered(null)}
                />
              ))}
            </Layer>
          </Stage>

          <Tooltip visible={Boolean(hovered)} x={hovered?.x ?? 0} y={(hovered?.y ?? 0) - (hovered?.height ?? 0) / 2}>
            {hovered && (
              <div className="space-y-0.5">
                <p className="font-semibold">{hovered.label}</p>
                <p>{t("guest.tooltip.capacity", { count: hovered.capacity })}</p>
                <p>{t("guest.tooltip.minSpend", { amount: hovered.minDeposit })}</p>
                <p className="text-slate-400">{t("guest.tooltip.zone", { zone: t(`builder.zones.${hovered.zone}`) })}</p>
              </div>
            )}
          </Tooltip>
        </div>
      </div>

      <AnimatePresence>
        {drawerTable && (
          <TableDetailsDrawer table={drawerTable} onClose={() => setSelectedTableId(null)} onReserve={handleReserve} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeBooking && (
          <BookingModal
            table={activeBooking.table}
            reservation={activeBooking.reservation}
            date={filters.date}
            timeSlot={filters.timeSlot}
            defaultGuests={filters.partySize}
            specialRequests={activeBooking.specialRequests}
            venueId={venueId}
            restaurantName={restaurant?.name}
            onClose={closeBookingFlow}
            onExpired={closeBookingFlow}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
