// Montage mixte : plusieurs pièces sur une même feuille (réponse de Roberto, 25 nov. 2026).
//
// Règle de Roberto : « Oui pour des solides, sauf si multiple fenêtre ». Une pièce pleine peut
// partager sa feuille ; une pièce à fenêtre (découpe intérieure, protecteur fenêtre) s'imprime
// sur ses propres feuilles.
//
// CE MODULE NE TOUCHE AUCUN PRIX. Il dit quelles pièces seraient éligibles et lit les deux
// réglages qui piloteront le chiffrage quand il existera. Le défaut « aucun » est le comportement
// d'aujourd'hui : chaque pièce sur ses propres feuilles.
//
// Les deux réglages sont INSCRITS sur la soumission à l'enregistrement (X!MIXTE_*) : changer le
// paramètre dans Taux_Calcul ne doit jamais rechiffrer en silence une soumission déjà envoyée.
import type { CellValue } from "@/lib/moteur";
import { IN } from "@/lib/modele";
import { toNum } from "@/lib/format";
import { champPiece, piecesPresentes } from "./pieces";

type Entrees = Record<string, CellValue>;

export const CELL_MIXTE_MODE = "X!MIXTE_MODE";
export const CELL_MIXTE_REPART = "X!MIXTE_REPART";
/** Case « fenêtre » propre à une pièce : ce que les réglages communs ne savent pas dire. */
export const cellFenetre = (k: number) => champPiece(k, "FEN");

/** Taux_Calcul ne stocke que des nombres : 0, 1, 2 dans l'ordre de ces listes. */
export const MODES_MIXTE = ["aucun", "bandes", "libre"] as const;
export const REPARTITIONS_MIXTE = ["surface", "poses", "principale"] as const;
export type ModeMixte = (typeof MODES_MIXTE)[number];
export type RepartitionMixte = (typeof REPARTITIONS_MIXTE)[number];

export const LIBELLE_MODE: Record<ModeMixte, string> = {
  aucun: "chaque pièce sur ses propres feuilles",
  bandes: "en bandes, une bande par pièce",
  libre: "placement libre",
};
export const LIBELLE_REPART: Record<RepartitionMixte, string> = {
  surface: "au prorata de la surface",
  poses: "au prorata du nombre de poses",
  principale: "à la pièce principale",
};

function choisir<T extends string>(liste: readonly T[], inscrit: CellValue, param: number | undefined): T {
  const t = String(inscrit ?? "").trim();
  if ((liste as readonly string[]).includes(t)) return t as T;
  const i = Math.trunc(param ?? 0);
  return liste[i >= 0 && i < liste.length ? i : 0];
}

/** Ce qui est inscrit sur la soumission l'emporte ; sinon le paramètre ; sinon le défaut. */
export function reglagesMixte(e: Entrees, app: Record<string, number> | undefined) {
  return {
    mode: choisir(MODES_MIXTE, e[CELL_MIXTE_MODE], app?.MONTAGE_MIXTE),
    repartition: choisir(REPARTITIONS_MIXTE, e[CELL_MIXTE_REPART], app?.REPARTITION_MIXTE),
  };
}

/** Les deux cellules à écrire à l'enregistrement. */
export function inscrireMixte(e: Entrees, app: Record<string, number> | undefined): Entrees {
  const r = reglagesMixte(e, app);
  return { [CELL_MIXTE_MODE]: r.mode, [CELL_MIXTE_REPART]: r.repartition };
}

export interface Eligibilite {
  k: number;
  possible: boolean;
  /** vide si possible */
  raison: string;
}

/** Les réglages des sections 05 à 07 valent pour toutes les pièces (pieces.ts) : une découpe
 *  intérieure ou un protecteur fenêtre y exclut donc chaque pièce. La case « fenêtre » d'une
 *  pièce l'exclut seule. */
export function eligibilites(e: Entrees): Eligibilite[] {
  const communes = [
    toNum(e[IN.zundAdhesifO] ?? "") > 0 || toNum(e[IN.zundCoupeO] ?? "") > 0 || toNum(e[IN.zundKisscutO] ?? "") > 0
      ? "découpe intérieure"
      : "",
    toNum(e[IN.protecteurFenetre] ?? "") > 0 ? "protecteur fenêtre" : "",
  ].filter(Boolean);
  return piecesPresentes(e).map((k) => {
    const raisons = [...(toNum(e[cellFenetre(k)] ?? "") >= 1 ? ["fenêtre"] : []), ...communes];
    return { k, possible: raisons.length === 0, raison: raisons.join(", ") };
  });
}
