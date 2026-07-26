import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BookingMap } from "../components/guest/BookingMap";
import { getVenueById } from "../services/apiService";

export default function CustomerBookingPage() {
  const { t } = useTranslation();
  const { venueId } = useParams();
  const [restaurant, setRestaurant] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    setRestaurant(undefined);
    getVenueById(venueId)
      .then((data) => {
        if (!cancelled) setRestaurant(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setRestaurant(null);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (restaurant === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">{t("common.loading")}</p>;
  }

  if (restaurant === null) return <Navigate to="/restaurants" replace />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <BookingMap venueId={venueId} restaurant={restaurant} />
    </motion.div>
  );
}
