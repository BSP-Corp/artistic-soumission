// Logique propre au 2e widget (refonte de la soumission), sans React : testable seule.
// Aucun calcul de prix ici — tout passe par le moteur, comme l'écran actuel.
import type { CellValue } from "@/lib/moteur";
import { IN } from "@/lib/modele";
import { toNum } from "@/lib/format";

/** Marque une soumission née dans ce widget. Sert à une seule chose : savoir si
 *  « Enregistrer » peut mettre à jour l'enregistrement ouvert. Une soumission venue de
 *  l'écran actuel peut être VALIDÉE et porter un bon de travail, et l'enregistrement écrit
 *  toujours « Brouillon » : la réécrire d'ici la déclasserait. Elle est donc copiée. */
export const CELL_ORIGINE_S2 = "X!S2";

/** Paliers proposés par la spec (§4-04). Surchargeables par Taux_Calcul : APP_PALIER_1 … 5. */
export const PALIERS_DEFAUT = [100, 250, 500, 1000, 2500];

export function paliersDefaut(app?: Record<string, number>): number[] {
  return PALIERS_DEFAUT.map((v, i) => {
    const p = Number(app?.["PALIER_" + (i + 1)]);
    return Number.isFinite(p) && p > 0 ? p : v;
  });
}

const numero = (cell: string) => Number(cell.slice(5));

/** Cellules des paliers, dans l'ordre d'affichage : S!J9, S!J10, puis X!QTE3, X!QTE4…
 *  Les mêmes que la table QTÉ de l'écran actuel : une soumission s'ouvre dans les deux. */
export function cellulesPaliers(entrees: Record<string, CellValue>): string[] {
  const extras = Object.keys(entrees)
    .filter((k) => /^X!QTE\d+$/.test(k))
    .sort((a, b) => numero(a) - numero(b));
  return [IN.qte1, IN.qte2, ...extras];
}

/** Prochaine cellule de palier libre (X!QTEn, n ≥ 3). */
export function prochainPalier(entrees: Record<string, CellValue>): string {
  const pris = cellulesPaliers(entrees).filter((c) => c.startsWith("X!QTE")).map(numero);
  return "X!QTE" + (Math.max(2, ...pris) + 1);
}

/** Écritures qui posent les paliers de départ. Le premier palier devient la quantité retenue. */
export function ecrituresPaliers(paliers: number[]): [string, CellValue][] {
  const out: [string, CellValue][] = paliers.map((q, i) => [i === 0 ? IN.qte1 : i === 1 ? IN.qte2 : "X!QTE" + (i + 1), q]);
  out.push([IN.quantite, paliers[0]]);
  return out;
}

/** Quantité à produire, gâche comprise (spec §6). L'arrondi à 6 décimales absorbe l'erreur
 *  flottante : 25 000 × 1,1 vaut 27500,000000000004, et le `ceil` nu annonçait une de trop. */
export function avecGache(qte: number, gache: number): number {
  if (!(qte > 0)) return 0;
  return Math.ceil(Number((qte * (1 + Math.max(0, gache))).toFixed(6)));
}

/** Marge réelle (spec §6) : (prix − coût) ÷ prix. null tant qu'il n'y a pas de prix. */
export function margeReelle(prix: number, cout: number): number | null {
  return prix > 0 ? (prix - cout) / prix : null;
}

/** Lit un nombre tapé à la française. "" si vide, null si ce n'est pas (encore) un nombre. */
export function lireNombre(t: string): number | "" | null {
  const s = t.replace(/[\s  ]/g, "").replace(",", ".");
  if (s === "") return "";
  if (!/^-?\d*\.?\d*$/.test(s) || s === "-" || s === "." || s === "-.") return null;
  return Number(s);
}

/** La ligne active est le palier dont la quantité est la quantité retenue (S!E2). */
export function palierActif(entrees: Record<string, CellValue>): string | null {
  const q = toNum(entrees[IN.quantite] ?? "");
  if (!(q > 0)) return null;
  return cellulesPaliers(entrees).find((c) => toNum(entrees[c] ?? "") === q) ?? null;
}

/** « 4 h 00 » : arrondit sur le total des minutes, sinon 3 h 59,7 s'affiche « 3 h 60 ». */
export function dureeTexte(heures: number, min: number): string {
  const total = Math.round(heures * 60 + min);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}
