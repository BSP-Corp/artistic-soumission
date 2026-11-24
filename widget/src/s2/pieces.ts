// Pièces multiples (spec §4-02 et §4-04), sans React.
//
// HYPOTHÈSE de la première version (24 nov. 2026, le client n'a pas encore répondu) : chaque
// pièce s'imprime SÉPARÉMENT, avec les réglages et les matériaux communs des sections 05 à 07,
// sur le format de feuille suggéré pour ses propres dimensions. Le montage mixte sur une même
// feuille n'existe pas.
//
// La pièce 1 reste celle du classeur (S!V7, S!Y7…) : une soumission d'une seule pièce garde
// exactement le prix de l'écran actuel.
import type { CellValue } from "@/lib/moteur";
import { IN } from "@/lib/modele";
import { toNum } from "@/lib/format";
import { CELL_MONTAGE_FORMAT, CELL_MONTAGE_TOURNEE, CELL_MONTAGE_UP } from "@/lib/montage";

type Entrees = Record<string, CellValue>;

export const MAX_PIECES = 5;
export const champPiece = (k: number, champ: string) => `X!P${k}_${champ}`;
const CHAMPS = ["NO", "MOD", "DESC", "L", "H", "ENS", "QU", "OFF"];

/** Numéros des pièces présentes, 1 toujours comprise. */
export function piecesPresentes(e: Entrees): number[] {
  const out = [1];
  for (let k = 2; k <= MAX_PIECES; k++) if (toNum(e[`X!P${k}`] ?? "") >= 1) out.push(k);
  return out;
}

export function prochainePiece(e: Entrees): number | null {
  const pris = piecesPresentes(e);
  for (let k = 2; k <= MAX_PIECES; k++) if (!pris.includes(k)) return k;
  return null;
}

/** Toutes les cellules d'une pièce, prix vendus compris : à retirer avec elle. */
export function cellulesPiece(e: Entrees, k: number): string[] {
  return [`X!P${k}`, ...CHAMPS.map((c) => champPiece(k, c)), ...Object.keys(e).filter((c) => c.startsWith(`X!P${k}_V_`))];
}

export const cellVenduPiece = (k: number, palier: string) => champPiece(k, "V_" + palier.replace("!", "-"));

export interface InfosPiece {
  no: string;
  modele: string;
  desc: string;
  l: number;
  h: number;
}

export function infosPiece(e: Entrees, k: number): InfosPiece {
  const t = (c: string) => String(e[c] ?? "").trim();
  const n = (c: string) => toNum(e[c] ?? "");
  return k === 1
    ? { no: t(IN.noPce), modele: t(IN.modele), desc: t(champPiece(1, "DESC")), l: n(IN.dimPceX), h: n(IN.dimPceY) }
    : {
        no: t(champPiece(k, "NO")),
        modele: t(champPiece(k, "MOD")),
        desc: t(champPiece(k, "DESC")),
        l: n(champPiece(k, "L")),
        h: n(champPiece(k, "H")),
      };
}

export function paliersExclus(e: Entrees, k: number): string[] {
  return String(e[champPiece(k, "OFF")] ?? "").split(";").filter(Boolean);
}

/** Quantité réelle d'une pièce pour un palier (spec §4-04). La pièce 1 EST le palier : c'est
 *  elle que le moteur chiffre, elle ne peut donc ni se multiplier ni s'exclure. */
export function quantitePiece(e: Entrees, k: number, palier: string): number {
  const q = toNum(e[palier] ?? "");
  if (k === 1) return q;
  if (!(q > 0)) return 0;
  const unique = toNum(e[champPiece(k, "QU")] ?? "");
  if (unique > 0) return unique;
  if (paliersExclus(e, k).includes(palier)) return 0;
  const ens = toNum(e[champPiece(k, "ENS")] ?? "");
  return q * (ens > 0 ? ens : 1);
}

/** Cellules du classeur à remplacer pour chiffrer une pièce. Les traces du montage de la
 *  pièce 1 sont effacées : elles décrivent une autre feuille. */
export function modifsPiece(e: Entrees, k: number, qte: number, feuille: { up: number; l: number; h: number } | null): Entrees {
  const out: Entrees = { [IN.quantite]: qte };
  if (k === 1) return out;
  const p = infosPiece(e, k);
  out[IN.noPce] = p.no;
  out[IN.modele] = p.modele || p.desc;
  out[IN.dimPceX] = p.l;
  out[IN.dimPceY] = p.h;
  out[IN.transport] = 0; // une seule expédition, déjà comptée avec la pièce 1
  if (feuille) {
    out[IN.nbUp] = feuille.up;
    out[IN.dimMrxX] = feuille.l;
    out[IN.dimMrxY] = feuille.h;
  }
  for (const c of [CELL_MONTAGE_FORMAT, CELL_MONTAGE_UP, CELL_MONTAGE_TOURNEE]) if (c in e) out[c] = "";
  return out;
}
