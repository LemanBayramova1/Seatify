import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FloorPlanCanvas } from "../components/admin/FloorPlanCanvas";
import { Toolbox } from "../components/admin/Toolbox";
import { Toolbar } from "../components/admin/Toolbar";
import { PropertiesModal } from "../components/admin/PropertiesModal";

export default function AdminBuilderPage() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[1200px] px-4 py-8"
    >
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-50">{t("nav.builder")}</h1>
      <p className="mb-6 text-sm text-slate-400">{t("builder.selectHint")}</p>

      <div className="mb-4">
        <Toolbar />
      </div>

      <div className="flex items-start gap-4">
        <div className="w-56 shrink-0">
          <Toolbox />
        </div>
        <FloorPlanCanvas />
        <div className="w-72 shrink-0">
          <PropertiesModal />
        </div>
      </div>
    </motion.div>
  );
}
