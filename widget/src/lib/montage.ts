// Optimisation du montage (imposition) : à partir de la dimension d'une pièce et de la
// quantité, choisir parmi les formats de feuille permis celui qui met le plus de « up » par
// feuille — donc le moins de feuilles imprimées.
//
// ── D'OÙ VIENT LA FORMULE ────────────────────────────────────────────────────
// C'est l'inversion de la grille FT!AC35:AJ45 du classeur, qui va dans l'autre sens (combien
// mesure un montage de N up) :
//
//   FT!AF39 = (AF41*AF36) + ((AF36*AH43) - AH43) + (2*AH44)
//              pièce × N  +  espace × (N − 1)    +  2 × pourtour
//
// avec AF41 = S!V7 (largeur pièce), AI41 = S!Y7 (hauteur pièce), AH43 = espace entre up,
// AH44 = pourtour de la feuille. Vérifié sur les valeurs mises en cache par Excel :
// pièce 7 × 1,4 avec 1 up horizontal et 4 verticaux → 8 × 7,35 po.
//
// On cherche le N maximum qui tient dans une dimension de feuille donnée. En résolvant
// `dim ≥ pièce×N + espace×(N−1) + 2×pourtour` pour N :
//
//   N = partie_entière( (dim_feuille − 2×pourtour + espace) ÷ (dim_pièce + espace) )
//
// Le `+ espace` au numérateur n'est pas cosmétique : il traduit le fait qu'il y a N−1
// espaces entre N up, pas N. L'oublier sous-estime le nombre de up d'une unité dès que la
// pièce est petite devant la feuille (cas 7 × 1,4 sur 12 × 24 : 14 up, et non 13).
//
// ── CE QUE CE MODULE NE FAIT PAS ─────────────────────────────────────────────
// Il ne touche à aucune formule du classeur : il calcule une SUGGESTION, à côté. La
// disponibilité des machines est hors périmètre (V1) : la seule contrainte machine retenue
// est « au moins une presse sait rouler ce format ».
import type { CellValue } from "./moteur";

/** Un format de feuille permis (table Formats_Feuille de Creator, ou snapshot de repli). */
export interface FormatFeuille {
  nom: string;
  largeurPo: number;
  hauteurPo: number;
  actif: boolean;
}

/** Ce que le montage a besoin de savoir d'une presse : son format maximum. */
export interface PresseFormat {
  nom: string;
  largeurMaxPo: number | null;
  hauteurMaxPo: number | null;
}

/** Réglages du montage. espace/pourtour viennent du classeur (FT!AH43 / FT!AH44) ; les
 *  trois autres sont des paramètres applicatifs `APP_*` de Taux_Calcul. */
export interface ReglesMontage {
  /** espace entre deux up, en pouces — FT!AH43 */
  espace: number;
  /** pourtour de la feuille, en pouces PAR CÔTÉ — FT!AH44 */
  pourtour: number;
  /** aucun côté de feuille sous cette dimension — APP_MONTAGE_DIM_MIN */
  dimMin: number;
  /** grain figé : une seule orientation, pas de rotation 90° — APP_MONTAGE_GRAIN_FIGE */
  grainFige: boolean;
  /** au-delà de ce nombre de feuilles, on propose un autre format — APP_MONTAGE_SEUIL_FEUILLES */
  seuilFeuilles: number;
}

/** Valeurs par défaut. espace/pourtour sont celles du classeur ; les trois autres sont les
 *  valeurs fournies par le client le 2 novembre 2026. Toutes surchargeables (voir
 *  `reglesMontage`), aucune n'est en dur dans le calcul. */
export const REGLES_MONTAGE_DEFAUT: ReglesMontage = {
  espace: 0.25,
  pourtour: 0.5,
  dimMin: 8,
  grainFige: true,
  seuilFeuilles: 350,
};

/** Un format évalué pour une pièce donnée. */
export interface MontageCandidat {
  format: FormatFeuille;
  /** up sur la largeur de la feuille */
  upHorizontal: number;
  /** up sur la hauteur de la feuille */
  upVertical: number;
  /** up par feuille = upHorizontal × upVertical */
  upParFeuille: number;
  /** feuilles nécessaires pour la quantité demandée (arrondi au supérieur) */
  nbFeuilles: number;
  /** la pièce a été tournée de 90° pour obtenir ce résultat (impossible si grain figé) */
  pieceTournee: boolean;
  /** presses capables de rouler ce format */
  presses: string[];
}

/** Résultat complet : le meilleur format, les autres candidats, et de quoi décider. */
export interface ResultatMontage {
  /** le meilleur candidat, ou null si aucun format ne peut recevoir la pièce */
  meilleur: MontageCandidat | null;
  /** tous les candidats retenus, du meilleur au moins bon */
  candidats: MontageCandidat[];
  /** formats écartés et pourquoi — affiché dans l'explication, pas dans le calcul */
  ecartes: { format: FormatFeuille; raison: string }[];
  /** feuilles du format courant, si on le connaît (sinon null) */
  feuillesBase: number | null;
  /** feuilles économisées face à feuillesBase (null si pas de base de comparaison) */
  gainFeuilles: number | null;
  /** true si le job est assez gros pour qu'on propose quelque chose */
  seuilAtteint: boolean;
}

/** Nombre de up qui tiennent sur une dimension de feuille. Inversion de FT!AF39.
 *  Renvoie 0 — jamais un négatif — quand la pièce ne tient pas une seule fois. */
export function upParAxe(dimFeuille: number, dimPiece: number, espace: number, pourtour: number): number {
  if (!(dimFeuille > 0) || !(dimPiece > 0)) return 0;
  const utile = dimFeuille - 2 * pourtour + espace;
  const pas = dimPiece + espace;
  if (!(pas > 0)) return 0;
  const n = Math.floor(utile / pas);
  return n > 0 ? n : 0;
}

/** Dimension occupée par N up — la formule du classeur, dans le sens direct (FT!AF39).
 *  Sert de contre-vérification : `dimensionMontage(upParAxe(d,…),…) <= d` doit toujours tenir. */
export function dimensionMontage(n: number, dimPiece: number, espace: number, pourtour: number): number {
  if (n <= 0) return 0;
  return dimPiece * n + espace * (n - 1) + 2 * pourtour;
}

/** true si la presse peut rouler cette feuille. Une presse sans format maximum renseigné
 *  n'est PAS supposée tout pouvoir : elle est écartée, pour ne pas valider un format sur une
 *  donnée absente. */
function presseAccepte(p: PresseFormat, largeur: number, hauteur: number): boolean {
  const l = Number(p.largeurMaxPo);
  const h = Number(p.hauteurMaxPo);
  if (!Number.isFinite(l) || !Number.isFinite(h) || l <= 0 || h <= 0) return false;
  return largeur <= l && hauteur <= h;
}

/** Évalue un format pour une pièce. null si la pièce n'y tient pas. */
export function evaluerFormat(
  format: FormatFeuille,
  pieceL: number,
  pieceH: number,
  qte: number,
  regles: ReglesMontage,
  presses: PresseFormat[],
): MontageCandidat | null {
  const { espace, pourtour, grainFige } = regles;

  // orientation telle que saisie
  const h0 = upParAxe(format.largeurPo, pieceL, espace, pourtour);
  const v0 = upParAxe(format.hauteurPo, pieceH, espace, pourtour);
  let upH = h0;
  let upV = v0;
  let tournee = false;

  // grain libre : la pièce peut aussi être posée à 90°
  if (!grainFige) {
    const h1 = upParAxe(format.largeurPo, pieceH, espace, pourtour);
    const v1 = upParAxe(format.hauteurPo, pieceL, espace, pourtour);
    if (h1 * v1 > h0 * v0) {
      upH = h1;
      upV = v1;
      tournee = true;
    }
  }

  const upParFeuille = upH * upV;
  if (upParFeuille <= 0) return null;

  return {
    format,
    upHorizontal: upH,
    upVertical: upV,
    upParFeuille,
    nbFeuilles: Math.ceil(qte / upParFeuille),
    pieceTournee: tournee,
    presses: presses.filter((p) => presseAccepte(p, format.largeurPo, format.hauteurPo)).map((p) => p.nom),
  };
}

/** Surface d'un format — sert uniquement à départager deux formats à égalité de feuilles :
 *  à nombre de feuilles égal, le plus petit format gaspille moins de matière. */
function surface(f: FormatFeuille): number {
  return f.largeurPo * f.hauteurPo;
}

/** Choisit le montage. Ordre de préférence : le moins de feuilles, puis le plus petit
 *  format, puis le plus de up (départage stable), puis le nom (pour que deux exécutions
 *  donnent le même résultat). */
export function choisirMontage(
  formats: FormatFeuille[],
  presses: PresseFormat[],
  pieceL: number,
  pieceH: number,
  qte: number,
  regles: ReglesMontage = REGLES_MONTAGE_DEFAUT,
  feuillesBase: number | null = null,
): ResultatMontage {
  const ecartes: { format: FormatFeuille; raison: string }[] = [];
  const candidats: MontageCandidat[] = [];

  const quantite = Number.isFinite(qte) && qte > 0 ? Math.ceil(qte) : 0;

  for (const f of formats) {
    if (!f.actif) {
      ecartes.push({ format: f, raison: "format désactivé" });
      continue;
    }
    if (f.largeurPo < regles.dimMin || f.hauteurPo < regles.dimMin) {
      ecartes.push({ format: f, raison: `côté sous la dimension minimale (${regles.dimMin} po)` });
      continue;
    }
    const roulables = presses.filter((p) => presseAccepte(p, f.largeurPo, f.hauteurPo));
    if (roulables.length === 0) {
      ecartes.push({ format: f, raison: "aucune presse ne peut rouler ce format" });
      continue;
    }
    const c = quantite > 0 ? evaluerFormat(f, pieceL, pieceH, quantite, regles, presses) : null;
    if (!c) {
      ecartes.push({ format: f, raison: quantite > 0 ? "la pièce n'y tient pas" : "quantité manquante" });
      continue;
    }
    candidats.push(c);
  }

  candidats.sort(
    (a, b) =>
      a.nbFeuilles - b.nbFeuilles ||
      surface(a.format) - surface(b.format) ||
      b.upParFeuille - a.upParFeuille ||
      a.format.nom.localeCompare(b.format.nom),
  );

  const meilleur = candidats[0] ?? null;
  const base = feuillesBase !== null && Number.isFinite(feuillesBase) && feuillesBase > 0 ? Math.ceil(feuillesBase) : null;

  // Le seuil se mesure sur la taille du job en feuilles. Quand le format courant est connu,
  // c'est lui qui compte (c'est le travail qu'on cherche à alléger). Tant que la soumission
  // n'a pas de champ « format de feuille », on retombe sur le nombre de feuilles du meilleur
  // format : faute de base, c'est la seule mesure de la taille du job dont on dispose.
  const mesure = base ?? meilleur?.nbFeuilles ?? 0;

  return {
    meilleur,
    candidats,
    ecartes,
    feuillesBase: base,
    gainFeuilles: base !== null && meilleur ? base - meilleur.nbFeuilles : null,
    seuilAtteint: mesure > regles.seuilFeuilles,
  };
}

/** Construit les règles : le classeur pour l'espace et le pourtour, Taux_Calcul (`APP_*`)
 *  pour les trois autres. Une valeur absente ou aberrante retombe sur le défaut — jamais
 *  sur 0, qui ferait exploser la division. */
export function reglesMontage(
  cellules: { espace?: CellValue; pourtour?: CellValue } = {},
  app: Record<string, number> | undefined = undefined,
): ReglesMontage {
  const pos = (v: unknown, repli: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : repli;
  };
  const posOuZero = (v: unknown, repli: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : repli;
  };
  return {
    espace: posOuZero(cellules.espace, REGLES_MONTAGE_DEFAUT.espace),
    pourtour: posOuZero(cellules.pourtour, REGLES_MONTAGE_DEFAUT.pourtour),
    dimMin: posOuZero(app?.MONTAGE_DIM_MIN, REGLES_MONTAGE_DEFAUT.dimMin),
    grainFige: app?.MONTAGE_GRAIN_FIGE === undefined ? REGLES_MONTAGE_DEFAUT.grainFige : app.MONTAGE_GRAIN_FIGE !== 0,
    seuilFeuilles: pos(app?.MONTAGE_SEUIL_FEUILLES, REGLES_MONTAGE_DEFAUT.seuilFeuilles),
  };
}

/** Cellules du classeur qui portent l'espace et le pourtour. */
export const CELL_ESPACE_UP = "FT!AH43";
export const CELL_POURTOUR = "FT!AH44";

/** Pseudo-cellule où est rangé le format de montage retenu (« Accepter » dans l'écran).
 *  Comme toutes les pseudo-cellules X!, elle voyage et se sauvegarde avec la soumission et
 *  aucune formule du classeur ne la lit. */
export const CELL_MONTAGE_FORMAT = "X!MONTAGEFORMAT";
/** Pseudo-cellule du nombre de up par feuille retenu (information de production). */
export const CELL_MONTAGE_UP = "X!MONTAGEUP";

/** Libellé court d'un format, tel qu'affiché et tel que rangé dans X!MONTAGEFORMAT. */
export function libelleFormat(f: FormatFeuille): string {
  return `${f.largeurPo} × ${f.hauteurPo}`;
}
