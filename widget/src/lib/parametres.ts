// Transforme les enregistrements Creator (Materiaux, Taux_Calcul) en surcharges du moteur :
//   - matériau connu du classeur → écrase INV!BV<ligne> (coût pi²)
//   - taux INV_<ligne>          → écrase INV!CF/CH/CI<ligne>
//   - paramètre S_<cellule>     → valeur par défaut de la cellule S (formulaire vierge)
// Un matériau AJOUTÉ par le client (absent du classeur) reste utilisable : son prix
// est appliqué directement sur la cellule Coût pi² de la ligne où il est choisi.
import { NOM_VERS_INV } from "@/data/nomVersInv";
import type { CellValue } from "./moteur";
import type { ParametresCreator } from "@/services/zohoService";

export interface ParamsAppliques {
  /** surcharges de cellules (INV!BVn, INV!CFn…) appliquées avant chaque calcul */
  surcharges: Record<string, CellValue>;
  /** valeurs par défaut des cellules S pour « Nouvelle soumission » (codes S_*) */
  defauts: Record<string, CellValue>;
  /** réglages applicatifs (codes `APP_<NOM>` de Taux_Calcul) — pas des cellules du classeur :
   *  ils pilotent le comportement du widget, pas le calcul. Ex. APP_SEUIL_DOUBLE_CHECK. */
  app: Record<string, number>;
  /** nom (minuscules) → dernier achat (Product.Last_Cost / Last_Purchase). Informatif :
   *  affiché dans la soumission pour juger de la fraîcheur du prix, jamais utilisé
   *  dans le calcul — un prix d'achat est au format d'achat, pas au pi². */
  achatParNom: Record<string, { cout: number; date: string }>;
  /** nom (minuscules) → coût pi² — tous les matériaux Creator, y compris les nouveaux */
  prixParNom: Record<string, number>;
  /** catégorie → noms de matériaux actifs (pour les listes déroulantes) */
  categories: Record<string, string[]>;
  nbMateriaux: number;
  nbTaux: number;
}

export function construireParams(p: ParametresCreator): ParamsAppliques {
  const surcharges: Record<string, CellValue> = {};
  const defauts: Record<string, CellValue> = {};
  const app: Record<string, number> = {};
  const prixParNom: Record<string, number> = {};
  const achatParNom: Record<string, { cout: number; date: string }> = {};
  const categories: Record<string, string[]> = {};

  for (const m of p.materiaux) {
    if (!m.actif) continue;
    const cle = m.nom.toLowerCase();
    if (m.coutPi2 > 0) prixParNom[cle] = m.coutPi2;
    if (m.dernierCout !== null && m.dernierCout > 0)
      achatParNom[cle] = { cout: m.dernierCout, date: m.dernierAchat };
    (categories[m.categorie] ??= []).push(m.nom);
    const ligne = NOM_VERS_INV[cle];
    if (ligne && m.coutPi2 > 0) surcharges["INV!BV" + ligne] = m.coutPi2;
  }

  for (const t of p.taux) {
    if (!t.actif) continue;
    const mInv = t.code.match(/^INV_(\d+)$/);
    if (mInv) {
      const l = mInv[1];
      if (t.valeur !== null) surcharges["INV!CF" + l] = t.valeur;
      if (t.cadence !== null) surcharges["INV!CH" + l] = t.cadence;
      if (t.temps !== null) surcharges["INV!CI" + l] = t.temps;
      continue;
    }
    const mS = t.code.match(/^S_([A-Z]+\d+)$/);
    if (mS && t.valeur !== null) defauts["S!" + mS[1]] = t.valeur;
    const mApp = t.code.match(/^APP_([A-Z0-9_]+)$/);
    if (mApp && t.valeur !== null) app[mApp[1]] = t.valeur;
  }

  return { surcharges, defauts, app, prixParNom, achatParNom, categories, nbMateriaux: p.materiaux.length, nbTaux: p.taux.length };
}

/** Cellules Coût pi² des 7 lignes matériaux fixes (nom choisi → cellule de prix). */
export const LIGNES_PRIX: [string, string][] = [
  ["S!M24", "S!U24"],
  ["S!M25", "S!U25"],
  ["S!M26", "S!U26"],
  ["S!M27", "S!U27"],
  ["S!M28", "S!U28"],
  ["S!M29", "S!U29"],
  ["S!M30", "S!U30"],
];

/** Prix directs pour les matériaux hors classeur choisis dans le formulaire. */
export function surchargesPrixDirect(
  entrees: Record<string, CellValue>,
  params: ParamsAppliques | null,
): Record<string, CellValue> {
  if (!params) return {};
  const out: Record<string, CellValue> = {};
  for (const [cellNom, cellPrix] of LIGNES_PRIX) {
    const nom = String(entrees[cellNom] ?? "").trim().toLowerCase();
    if (!nom) continue;
    if (NOM_VERS_INV[nom]) continue; // matériau du classeur → passe par INV!BV
    const prix = params.prixParNom[nom];
    if (prix !== undefined) out[cellPrix] = prix;
  }
  return out;
}

/** catégorie Creator → ligne matériau du formulaire */
export const CATEGORIE_VERS_CHAMP: Record<string, string> = {
  POLYCARBONATE: "matLexan",
  VINYLE: "matVinyle",
  POLYESTER: "matPolyester",
  FOIL: "matAluFoil",
  "ABS-STYRENE-COROPLAST": "matDivers",
  "ADHESIF-SPACER": "matAdhesif",
  "PREMASK-PROTECTEUR": "matOverlam",
};
