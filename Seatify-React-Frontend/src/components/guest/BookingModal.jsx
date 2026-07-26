import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { confirmBooking, createPaymentIntent } from "../../services/apiService";
import { hasStripeKey, stripePromise } from "../../lib/stripe";
import { useBookingsStore } from "../../store/useBookingsStore";
import { GlassCard } from "../shared/GlassCard";

const PHONE_PATTERN = /^[+\d][\d\s-]{6,}$/;

export function BookingModal({ table, reservation, date, timeSlot, defaultGuests, specialRequests, venueId, restaurantName, onClose, onExpired }) {
  const { t } = useTranslation();
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({ name: "", phone: "", guests: defaultGuests });
  const [errors, setErrors] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [clientSecret, setClientSecret] = useState(null);
  const [outcome, setOutcome] = useState(null); // 'success' | 'failure'

  useEffect(() => {
    if (!reservation?.holdExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((reservation.holdExpiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) onExpired?.();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation, onExpired]);

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = t("bookingModal.nameRequired");
    if (!PHONE_PATTERN.test(form.phone.trim())) next.phone = t("bookingModal.phoneRequired");
    if (form.guests > table.capacity) next.guests = t("bookingModal.guestsExceedCapacity", { capacity: table.capacity });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const intent = await createPaymentIntent({ reservationId: reservation.reservationId, amount: table.minDeposit * 100 });
    setClientSecret(intent.clientSecret);
    setStep("payment");
  }

  async function finalizeBooking() {
    try {
      const result = await confirmBooking({
        venueId,
        restaurantName,
        reservationId: reservation.reservationId,
        holdToken: reservation.holdToken,
        tableId: table.id,
        tableLabel: table.label,
        zone: table.zone,
        minDeposit: table.minDeposit,
        date,
        timeSlot,
        name: form.name,
        phone: form.phone,
        guests: form.guests,
        specialRequests,
      });
      if (result?.booking) useBookingsStore.getState().addLocal(result.booking);
      setOutcome("success");
      setTimeout(onClose, 1800);
    } catch {
      setOutcome("failure");
    }
  }

  const elementsOptions = useMemo(
    () => (clientSecret ? { mode: "payment", amount: Math.max(50, Math.round(table.minDeposit * 100)), currency: "azn" } : undefined),
    [clientSecret, table.minDeposit],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <GlassCard className="w-[min(440px,92vw)] p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t("bookingModal.title", { label: table.label })}</h2>
              <p className="text-xs text-slate-400">
                {date} · {timeSlot}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>

          {reservation && secondsLeft > 0 && outcome !== "success" && (
            <div className="mb-5 rounded-lg border border-status-held/30 bg-status-held/10 px-3 py-2 text-xs font-medium text-amber-300">
              {t("guest.holdCountdown", { seconds: secondsLeft })}
            </div>
          )}

          <AnimatePresence mode="wait">
            {outcome === "success" ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-status-free/20 text-3xl text-status-free">
                  ✓
                </div>
                <p className="font-semibold text-slate-100">{t("bookingModal.success")}</p>
              </motion.div>
            ) : step === "details" ? (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={handleDetailsSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="label-text">{t("bookingModal.name")}</label>
                  <input className="glass-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </div>
                <div>
                  <label className="label-text">{t("bookingModal.phone")}</label>
                  <input
                    className="glass-input w-full"
                    placeholder="+994 50 123 45 67"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-text">{t("bookingModal.date")}</label>
                    <input className="glass-input w-full opacity-70" value={date} disabled />
                  </div>
                  <div>
                    <label className="label-text">{t("bookingModal.guestsCount")}</label>
                    <input
                      type="number"
                      min={1}
                      max={table.capacity}
                      className="glass-input w-full"
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                    />
                    {errors.guests && <p className="mt-1 text-xs text-red-400">{errors.guests}</p>}
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full">
                  {t("bookingModal.continueToPayment")}
                </button>
              </motion.form>
            ) : (
              <motion.div key="payment" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-slate-400">{t("bookingModal.depositDue")}</span>
                  <span className="font-semibold text-slate-100">{table.minDeposit} {t("common.azn")}</span>
                </div>

                <p className="mb-4 rounded-lg border border-brand-400/20 bg-brand-500/10 px-3 py-2 text-xs text-slate-300">
                  {t("bookingModal.mockNotice")}
                </p>

                {hasStripeKey && clientSecret ? (
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <StripePaymentFields onPay={finalizeBooking} outcome={outcome} />
                  </Elements>
                ) : (
                  <MockPaymentFields onPay={finalizeBooking} outcome={outcome} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function StripePaymentFields({ onPay }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    // Real flow: await stripe.confirmPayment({ elements, clientSecret: <real secret from
    // your C# API>, redirect: "if_required" }). There is no real backend yet, so we only
    // validate the on-screen card details are complete, then simulate success.
    const { error } = await elements.submit();
    setSubmitting(false);
    if (!error) onPay();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting ? t("bookingModal.paying") : t("bookingModal.payNow")}
      </button>
    </form>
  );
}

const CARD_NUMBER_PATTERN = /^(\d{4} ){3}\d{4}$/;
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVC_PATTERN = /^\d{3,4}$/;

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function MockPaymentFields({ onPay }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [showCvc, setShowCvc] = useState(false);

  const isValid = CARD_NUMBER_PATTERN.test(card.number) && EXPIRY_PATTERN.test(card.expiry) && CVC_PATTERN.test(card.cvc);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmitting(false);
    onPay();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label-text">{t("bookingModal.cardDetails")}</label>
        <input
          className="glass-input w-full"
          placeholder="4242 4242 4242 4242"
          value={card.number}
          maxLength={19}
          inputMode="numeric"
          onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          className="glass-input"
          placeholder="MM/YY"
          value={card.expiry}
          maxLength={5}
          inputMode="numeric"
          onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
        />
        <div className="relative">
          <input
            className="glass-input w-full pr-9"
            placeholder="CVC"
            type={showCvc ? "text" : "password"}
            value={card.cvc}
            maxLength={4}
            inputMode="numeric"
            onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
          <button
            type="button"
            onClick={() => setShowCvc((v) => !v)}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
          >
            {showCvc ? "🙈" : "👁"}
          </button>
        </div>
      </div>
      <button type="submit" disabled={submitting || !isValid} className="btn-primary w-full">
        {submitting ? t("bookingModal.paying") : t("bookingModal.payNow")}
      </button>
    </form>
  );
}
