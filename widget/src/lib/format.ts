// Formatage fr-CA des valeurs affichées.
import type { CellValue } from "./moteur";

const fmt2 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt3 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function toNum(v: CellValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function argent(v: CellValue): string {
  return fmt2.format(toNum(v)) + " $";
}
export function nombre2(v: CellValue): string {
  return fmt2.format(toNum(v));
}
export function nombre3(v: CellValue): string {
  return fmt3.format(toNum(v));
}
export function entier(v: CellValue): string {
  return String(Math.round(toNum(v)));
}
export function pctAffiche(v: CellValue): string {
  return Math.round(toNum(v) * 100) + " %";
}
/** minutes affichées comme Excel (arrondi entier) */
export function minutes(v: CellValue): string {
  return String(Math.round(toNum(v)));
}

// ── dates ───────────────────────────────────────────────────────────────────
// Le classeur range les dates en numéro de série Excel (jours depuis le 30/12/1899) et fait
// de l'arithmétique dessus. Une cellule calculée comme « Date requise (calc.) » ressort donc
// un nombre : sans conversion, l'écran affichait « 46308 ».
const MOIS_COURT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/** Numéro de série Excel → « 15-Oct-2026 ». Rend "" hors plage plausible. */
export function dateSerie(v: CellValue): string {
  const n = Math.trunc(toNum(v));
  if (!(n > 0) || n > 2958465) return ""; // 2958465 = 31/12/9999
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MOIS_COURT[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/** Valeur d'une cellule de date : formatée si c'est un numéro de série, telle quelle sinon
 *  (le classeur y met aussi des messages comme « Date Exp.Erreur »). */
export function dateOuTexte(v: CellValue): string {
  const t = String(v ?? "").trim();
  if (t === "") return "";
  const formatee = dateSerie(v);
  return formatee || t;
}
