// Cartographie de la feuille FT = le BON DE TRAVAIL d'atelier.
//
// Périmètre : lignes 1-48, colonnes A-AB (exactement la fiche papier fournie).
// Les blocs SOUS-CONTRAT / livraison-facturation (lignes 49-58) sont hors périmètre v1.
//
// Deux familles de cellules :
//   BLEU  (FT_OUT) — porte une formule dans le classeur → calculée par le moteur, lecture seule.
//   JAUNE (FT_IN)  — vide dans le classeur → saisie atelier, persistée dans `Donnees_BT`.
//
// Les cellules jaunes sont de VRAIES cellules d'entrée de la feuille FT : les écrire dans le
// moteur alimente les formules FT en cascade. Ex. E38 (Qté Commandé) → E39 (Protection) →
// E40 (Qté Produite) ; E43 (Nbre mrcx feuille) → E44 (Nbre de Feuilles) → P47 (MX À IMPR.).

import type { CellValue, Moteur } from "@/lib/moteur";
import type { ChampsPlatsBT, StatutBT } from "@/services/bonTravailService";
import { d4, ent, dateCreator, nbOuNull } from "@/services/bonTravailService";

// ── cellules JAUNES (saisie atelier) ────────────────────────────────────────
export const FT_IN = {
  // entête
  commandeLe: "FT!P2",
  codeM: "FT!C3",
  codeR: "FT!G3",
  codeE: "FT!Y3",
  po: "FT!C9",
  code: "FT!C11", // constante 4010 dans le master, donc saisissable
  noPresse: "FT!L4", // pré-rempli par la presse choisie sur la soumission
  noCadre: "FT!N6",
  surplus: "FT!Z4", // 1 → AA4 = « Oui »
  verif1: "FT!B12",
  date1: "FT!F12",
  dateRequise: "FT!Y5", // alimente P21 « Date requise »
  // infographie
  epreuve: "FT!B14",
  courriel: "FT!B15",
  films: "FT!J15",
  verif2: "FT!B20",
  date2: "FT!F20",
  // bas de page
  qteCommandee: "FT!E38",
  protectionPct: "FT!C39", // fraction (0,1 = 10 %)
  maximumPct: "FT!A41", // fraction
  nbreMrcxFeuille: "FT!E43",
  feuillesCorr: "FT!E45",
  setupX: "FT!J46",
  setupY: "FT!M46",
  divR43: "FT!R43", // valeur 24 dans le master — libellé non identifié dans le classeur
  divW48: "FT!W48", // valeur 48 dans le master — libellé non identifié dans le classeur
  verif3: "FT!B48",
  date3: "FT!F48",
  // textes libres
  instructions: "FT!B34",
  procedure: "FT!T37",
} as const;

/** QTÉ.1-7 / EXP.1-7 de l'entête droite (livraisons partielles). */
export const FT_QTE = Array.from({ length: 7 }, (_, i) => ({
  rang: i + 1,
  qte: `FT!T${5 + i}`,
  exp: `FT!X${5 + i}`,
}));

/** Grille COULEURS du bloc IMPRESSION : 10 lignes (23-32), colonnes M / COULEURS / FILM. */
export const FT_COULEURS = Array.from({ length: 10 }, (_, i) => ({
  ligne: 23 + i,
  m: `FT!H${23 + i}`,
  couleur: `FT!J${23 + i}`,
  film: `FT!R${23 + i}`,
}));

/** Lignes de couleur AU-DELÀ des 10 de la fiche papier (28 sept. §11b : la grille devient une
 *  liste dynamique). Même patron que les quantités de la soumission : des pseudo-cellules
 *  `X!…`, sérialisées dans `Donnees_BT` comme le reste, invisibles pour le classeur.
 *  Les 10 premières restent les vraies cellules FT, pour que les bons existants se rouvrent
 *  sans conversion. */
export const MAX_COULEURS = 30;
export const ligneCouleurSupp = (n: number) => ({
  ligne: 32 + n,
  rang: n,
  m: `X!COULM${n}`,
  couleur: `X!COUL${n}`,
  film: `X!COULF${n}`,
});
/** true pour toute pseudo-cellule d'une ligne de couleur ajoutée */
export const estCelluleCouleurSupp = (cell: string) => /^X!COUL[MF]?\d+$/.test(cell);

/** Table PLATINE : 4 lignes (31-34) × 2 colonnes « Matrice No / UP ».
 *  La colonne UP de gauche (X) est calculée (S!E33…E36) ; le reste est saisi. */
export const FT_PLATINE = Array.from({ length: 4 }, (_, i) => ({
  ligne: 31 + i,
  procede: `FT!S${31 + i}`, // bleu : Adhésif / Coupe / Kiss-Cut / Embossage
  matrice1: `FT!V${31 + i}`, // jaune
  up1: `FT!X${31 + i}`, // bleu
  matrice2: `FT!Y${31 + i}`, // jaune
  up2: `FT!AA${31 + i}`, // jaune
}));

/** Toutes les cellules jaunes, pour valider/filtrer le JSON `Donnees_BT`. */
export const CELLULES_SAISIE: string[] = [
  ...Object.values(FT_IN),
  ...FT_QTE.flatMap((q) => [q.qte, q.exp]),
  ...FT_COULEURS.flatMap((c) => [c.m, c.couleur, c.film]),
  ...FT_PLATINE.flatMap((p) => [p.matrice1, p.matrice2, p.up2]),
];

const SAISIE_SET = new Set(CELLULES_SAISIE);

// ── cellules BLEUES (calculées) ─────────────────────────────────────────────
export const FT_OUT = {
  noClient: "FT!C4",
  client: "FT!C5",
  modele: "FT!C6",
  noPce: "FT!C7",
  autre: "FT!C8",
  noSoum: "FT!C10",
  initiales: "FT!F10",
  surplusOuiNon: "FT!AA4",
  nbUp: "FT!F14",
  formatX: "FT!K14",
  formatY: "FT!N14",
  multiprint: "FT!K20",
  numeriqueMultiup: "FT!N20",
  dateRequiseCalc: "FT!P21",
  nbFilms: "FT!R33",
  protection: "FT!E39",
  qteProduite: "FT!E40",
  qteMaximum: "FT!E41",
  nombreUp: "FT!E42",
  nbreFeuilles: "FT!E44",
  mrxX: "FT!J47",
  mrxY: "FT!M47",
  mxAImpr: "FT!P47",
} as const;

/** Matériaux : 11 lignes (23-33). La colonne INV. n'existe que sur les 7 premières. */
export const FT_MATERIAUX = Array.from({ length: 11 }, (_, i) => ({
  ligne: 23 + i,
  nom: `FT!A${23 + i}`,
  inv: i < 7 ? `FT!F${23 + i}` : null,
}));

/** Temps (hrs / min) du bloc IMPRESSION + le temps numérique de l'entête. */
export const FT_TEMPS = [
  { cle: "numerique", libelle: "Temps Numérique Multi-up", h: "FT!X20", m: "FT!Z20" },
  { cle: "zund", libelle: "Temps Zund", h: "FT!N33", m: "FT!P33" },
  { cle: "soies", libelle: "Temps Dépt. Soies", h: "FT!N34", m: "FT!P34" },
  { cle: "impression", libelle: "Temps Impression", h: "FT!N35", m: "FT!P35" },
  { cle: "decoupe", libelle: "Temps Découpe", h: "FT!N36", m: "FT!P36" },
] as const;

/** Cases de PRODUCTION DÉCOUPE qui s'allument seules (cellule → libellé de repli). */
export const FT_DECOUPE_GAUCHE = [
  "FT!S22",
  "FT!S23",
  "FT!S24",
  "FT!S25",
  "FT!S26",
  "FT!V26",
  "FT!S27",
  "FT!S28",
  "FT!S29",
  "FT!V29",
  "FT!S30",
  "FT!U30",
  "FT!S35",
  "FT!S36",
  "FT!V36",
  "FT!W36",
  "FT!X36",
];
export const FT_DECOUPE_DROITE = [
  "FT!W23",
  "FT!Z23",
  "FT!AA23",
  "FT!W24",
  "FT!W25",
  "FT!W26",
  "FT!W27",
  "FT!W28",
  "FT!W29",
  "FT!Y29",
  "FT!W35",
];

// ── helpers ─────────────────────────────────────────────────────────────────

/** Ne garde du JSON `Donnees_BT` que des cellules de saisie connues et des valeurs scalaires. */
export function lireSaisiesBT(json: string): Record<string, CellValue> {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Record<string, CellValue> = {};
    for (const [cell, v] of Object.entries(obj)) {
      // les lignes de couleur ajoutées sont des pseudo-cellules : leur nom n'est pas dans la
      // liste statique, on les reconnaît au motif (§11b)
      if (!SAISIE_SET.has(cell) && !estCelluleCouleurSupp(cell)) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[cell] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** hrs + min → minutes décimales (format stocké dans Creator, plus simple à totaliser). */
export function minutesTotales(m: Moteur, h: string, min: string): number {
  return m.num(h) * 60 + m.num(min);
}

const s = (v: CellValue): string => (v === undefined || v === null ? "" : String(v).trim());

/** `FT!L4` porte le LIBELLÉ « No. Presse » dans le classeur ; `machines.ts` l'écrase par le
 *  nom de la presse choisie. Tant qu'aucune presse n'est choisie, la cellule renvoie donc le
 *  libellé — à ne jamais enregistrer comme s'il s'agissait d'une presse. */
export const LIBELLE_L4 = "No. Presse";
export function presseFT(m: Moteur, saisies: Record<string, CellValue> = {}): string {
  const saisie = s(saisies[FT_IN.noPresse]);
  if (saisie && saisie !== LIBELLE_L4) return saisie;
  const v = s(m.val(FT_IN.noPresse));
  return v === LIBELLE_L4 ? "" : v;
}

/** Construit les colonnes plates du formulaire Bon_Travail à partir du moteur recalculé. */
export function champsPlatsBT(
  m: Moteur,
  saisies: Record<string, CellValue>,
  soumissionId: string,
  statut: StatutBT,
): ChampsPlatsBT {
  // saisie atelier si présente, sinon le défaut du classeur (C11=4010, Z4=1, R43=24…) —
  // même règle d'affichage que la fiche, pour que le rapport montre ce que l'atelier voit.
  const sa = (cell: string) => s(saisies[cell]) || s(m.val(cell));
  return {
    Soumission_ID: soumissionId,
    Statut: statut,
    Commande_Le: dateCreator(sa(FT_IN.commandeLe)),
    Date_Requise: dateCreator(sa(FT_IN.dateRequise)),
    No_Client: s(m.val(FT_OUT.noClient)),
    Client: s(m.val(FT_OUT.client)),
    Modele: s(m.val(FT_OUT.modele)),
    No_Piece: s(m.val(FT_OUT.noPce)),
    Autre: s(m.val(FT_OUT.autre)),
    No_Soum: s(m.val(FT_OUT.noSoum)),
    Code_RB: s(m.val(FT_OUT.initiales)),
    Code: nbOuNull(sa(FT_IN.code)),
    Code_M: sa(FT_IN.codeM),
    Code_R: sa(FT_IN.codeR),
    Code_E: sa(FT_IN.codeE),
    PO: sa(FT_IN.po),
    No_Presse: presseFT(m, saisies),
    No_Cadre: sa(FT_IN.noCadre),
    Surplus: s(m.val(FT_OUT.surplusOuiNon)),
    Nb_Up: ent(m.num(FT_OUT.nbUp)),
    Format_X: d4(m.num(FT_OUT.formatX)),
    Format_Y: d4(m.num(FT_OUT.formatY)),
    Dim_Mrx_X: d4(m.num(FT_OUT.mrxX)),
    Dim_Mrx_Y: d4(m.num(FT_OUT.mrxY)),
    Qte_Commandee: ent(m.num(FT_IN.qteCommandee)),
    Protection_Pct: d4(m.num(FT_IN.protectionPct) * 100),
    Qte_Produite: ent(m.num(FT_OUT.qteProduite)),
    Qte_Maximum: ent(m.num(FT_OUT.qteMaximum)),
    Nbre_Mrcx_Feuille: ent(m.num(FT_IN.nbreMrcxFeuille)),
    Nbre_Feuilles: d4(m.num(FT_OUT.nbreFeuilles)),
    Feuilles_Corr: ent(m.num(FT_IN.feuillesCorr)),
    Mx_A_Impr: ent(m.num(FT_OUT.mxAImpr)),
    Temps_Numerique_Min: d4(minutesTotales(m, "FT!X20", "FT!Z20")),
    Temps_Zund_Min: d4(minutesTotales(m, "FT!N33", "FT!P33")),
    Temps_Soies_Min: d4(minutesTotales(m, "FT!N34", "FT!P34")),
    Temps_Impression_Min: d4(minutesTotales(m, "FT!N35", "FT!P35")),
    Temps_Decoupe_Min: d4(minutesTotales(m, "FT!N36", "FT!P36")),
    Instructions: sa(FT_IN.instructions),
    Procedure: sa(FT_IN.procedure),
  };
}
