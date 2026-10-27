// §7 — Adhésif laminé / régistre posés AUTOMATIQUEMENT selon la forme de l'adhésif choisi.
//
// Manque fonctionnel vu en réunion : les ~48 min d'adhésif laminé ne s'ajoutaient pas toutes
// seules sur un adhésif en rouleau (ex. 467), il fallait cocher la ligne à la main — et on
// l'oubliait. Règle du client :
//
//     adhésif en ROULEAU  → Adhésif Laminé    (S!E22 = 1 → mise en train INV!CI42 + roulement)
//     adhésif en FEUILLE  → Adhésif Régistre  (S!E23 = 1 → mise en train INV!CI43 + roulement)
//
// Aucune formule touchée : on pose la même cellule que l'utilisateur aurait cochée.
//
// D'OÙ VIENT LA FORME. Le catalogue Creator n'a pas (encore) de champ « Rouleaux / Feuilles » :
// `Categorie` décrit la FAMILLE (POLYCARBONATE, VINYLE, ADHESIF-SPACER…), pas le conditionnement.
// Deux sources, dans l'ordre :
//   1. un champ de forme sur la fiche matériau s'il existe un jour (`Forme`, `Conditionnement`,
//      `Type_adhesif`… → `formeDeclaree`) — c'est alors la vérité ;
//   2. sinon, le NOM, qui porte les dimensions (« Adhésif 467 ,002x24x6480 ») : la 3e dimension
//      est une longueur de rouleau quand elle dépasse le seuil ci-dessous. Un 24x48 est une
//      feuille, un 24x6480 est un rouleau.
// La ligne d'info sous le champ dit toujours laquelle des deux a servi, pour qu'un utilisateur
// puisse contredire une déduction en décochant.

import type { CellValue } from "./moteur";
import { IN } from "./modele";

export type FormeAdhesif = "rouleau" | "feuille";
export interface DeductionAdhesif {
  forme: FormeAdhesif;
  /** cellule à poser : Adhésif Laminé (rouleau) ou Adhésif Régistre (feuille) */
  cellule: string;
  libelle: string;
  /** « fiche » = champ Creator, « nom » = déduit des dimensions du nom */
  source: "fiche" | "nom";
  /** ce qui a permis de trancher, montré à l'utilisateur */
  indice: string;
}

/** Au-delà de cette longueur (pouces) la 3e dimension est un rouleau, pas une feuille.
 *  Les feuilles du catalogue plafonnent à 96 po ; les rouleaux commencent à 1800 po. */
export const SEUIL_ROULEAU_PO = 200;

const ROULEAU = /rouleau|roll/i;
const FEUILLE = /feuille|sheet/i;

/** Forme déclarée sur la fiche matériau (aucun champ de ce genre aujourd'hui — prêt pour le jour
 *  où BSP en ajoute un). Accepte n'importe lequel des noms de champ plausibles. */
export function formeDeclaree(fiche: Record<string, unknown> | null | undefined): FormeAdhesif | null {
  if (!fiche) return null;
  for (const champ of ["Forme", "Conditionnement", "Type_adhesif", "Forme_adhesif", "Format_type"]) {
    const v = String(fiche[champ] ?? "").trim();
    if (!v) continue;
    if (ROULEAU.test(v)) return "rouleau";
    if (FEUILLE.test(v)) return "feuille";
  }
  return null;
}

/** Forme déduite du nom : « … ,002x24x6480 » → 6480 po → rouleau. */
export function formeDepuisNom(nom: string): { forme: FormeAdhesif; indice: string } | null {
  const t = String(nom ?? "").trim();
  if (!t) return null;
  if (ROULEAU.test(t)) return { forme: "rouleau", indice: "le nom dit « rouleau »" };
  if (FEUILLE.test(t)) return { forme: "feuille", indice: "le nom dit « feuille »" };
  // dernière suite de dimensions du nom : 1 à 3 nombres séparés par x
  const dims = t.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*(\d+(?:[.,]\d+)?))?\s*$/i);
  if (!dims) return null;
  const nombres = dims.slice(1).filter(Boolean).map((d) => Number(d.replace(",", ".")));
  const longueur = Math.max(...nombres);
  if (!Number.isFinite(longueur)) return null;
  return longueur >= SEUIL_ROULEAU_PO
    ? { forme: "rouleau", indice: `${longueur} po de long (≥ ${SEUIL_ROULEAU_PO}) → rouleau` }
    : { forme: "feuille", indice: `${longueur} po de long (< ${SEUIL_ROULEAU_PO}) → feuille` };
}

/** Ce que l'adhésif choisi déclenche, ou null si rien n'est choisi / rien de concluant. */
export function deduireAdhesif(
  entrees: Record<string, CellValue>,
  ficheParNom?: (nom: string) => Record<string, unknown> | null,
): DeductionAdhesif | null {
  const nom = String(entrees[IN.matAdhesif] ?? "").trim();
  if (!nom) return null;

  const declaree = formeDeclaree(ficheParNom?.(nom));
  const trouve = declaree
    ? { forme: declaree, indice: "forme déclarée sur la fiche matériau", source: "fiche" as const }
    : (() => {
        const d = formeDepuisNom(nom);
        return d ? { ...d, source: "nom" as const } : null;
      })();
  if (!trouve) return null;

  return trouve.forme === "rouleau"
    ? { forme: "rouleau", cellule: IN.adhesifLamine, libelle: "Adhésif Laminé", source: trouve.source, indice: trouve.indice }
    : { forme: "feuille", cellule: IN.adhesifRegistre, libelle: "Adhésif Régistre", source: trouve.source, indice: trouve.indice };
}

/** Les deux cellules pilotées par la déduction — l'une est posée, l'autre remise à zéro. */
export const CELLULES_ADHESIF = [IN.adhesifLamine, IN.adhesifRegistre];
