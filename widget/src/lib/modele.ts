// Cartographie formulaire ↔ cellules du classeur (feuille S = la soumission visible).
// Décodée depuis le xlsm : chaque champ du widget écrit dans la cellule d'entrée
// que les formules du classeur lisent.

import type { Classeur, CellValue } from "./moteur";

// ── cellules d'entrée (celles que l'utilisateur remplit) ──
export const IN = {
  // identification
  noClient: "S!V2",
  client: "S!V3",
  modele: "S!V4",
  noPce: "S!V5",
  autre: "S!V6",
  dimPceX: "S!V7",
  dimPceY: "S!Y7",
  codeM: "FT!C3",
  codeR: "FT!G3",
  codeE: "FT!Y3",
  codeS: "S!Y9",
  codeRB: "S!AA9",
  date: "FT!Y5",
  // paramètres
  quantite: "S!E2",
  perte: "S!I2", // fraction (0.1 = 10 %)
  couleursVisibles: "S!E3",
  fs1: "S!B4",
  fs2: "S!D4",
  fs3: "S!F4",
  nbUp: "S!E5",
  dimMrxX: "S!E6",
  dimMrxY: "S!H6",
  multiprint: "S!O5", // 1 = oui
  numeriqueMultiUp: "S!O6", // 1 = oui
  // table QTÉ
  qte1: "S!J9",
  qte2: "S!J10",
  // sérigraphie
  separateur1: "S!D9",
  separateur2: "S!E9",
  passeAdd1: "S!D10",
  passeAdd2: "S!E10",
  ajustAdd: "S!E11",
  nettoyage1: "S!D12",
  nettoyage2: "S!E12",
  rectoVerso1: "S!D13",
  rectoVerso2: "S!E13",
  encres: "S!D14", // 1 = 100 %
  sansUv: "S!H15", // 1 = sans UV
  hppl: "S!E17",
  texture: "S!A18", // 1 = 100 %
  ajustImpr: "S!H18", // fraction
  argentClavier: "S!E19",
  // sans (exclusions)
  sansAdhesif: "S!I11",
  sansMateriau: "S!I12",
  sansCoupe: "S!I13",
  sansEncre: "S!I14",
  // découpe
  adhesifLamine: "S!E22",
  adhesifRegistre: "S!E23",
  overLaminating: "S!E24",
  overLaminatingB: "S!F24",
  premaskStd: "S!E25",
  protecteur: "S!E26",
  protecteurFenetre: "S!E27",
  protecteurFenetreB: "S!F27",
  slit: "S!E28",
  guillotineQte: "S!E29",
  guillotineTaux: "S!F29",
  assemblageQte: "S!E30",
  assemblageTaux: "S!F30",
  autresDecoupeQte: "S!E31",
  autresDecoupeTaux: "S!F31",
  // platine (die / up)
  platAdhesifDie: "S!D33",
  platAdhesifUp: "S!E33",
  platCoupeDie: "S!D34",
  platCoupeUp: "S!E34",
  platKisscutDie: "S!D35",
  platKisscutUp: "S!E35",
  platEmbossageDie: "S!D36",
  platEmbossageUp: "S!E36",
  ajustPlatine: "S!D37", // fraction
  // zund (cont. / cut-out)
  zundAdhesifC: "S!D39",
  zundAdhesifO: "S!E39",
  zundCoupeC: "S!D40",
  zundCoupeO: "S!E40",
  zundKisscutC: "S!D41",
  zundKisscutO: "S!E41",
  ajustZund: "S!D42", // fraction
  // finition
  decorticageTaux: "S!F43",
  decorticageQte: "S!E43",
  coinsRondsQte: "S!E44",
  coinsRondsTaux: "S!F44",
  laserQte: "S!E45",
  laserAjust: "S!G45",
  autres1Label: "S!A46",
  autres1Qte: "S!E46",
  autres1A: "S!F46",
  autres1B: "S!G46",
  autres2Label: "S!A47",
  autres2Qte: "S!E47",
  autres2A: "S!F47",
  autres2B: "S!G47",
  verifQte: "S!E48",
  verifTaux: "S!F48",
  emballageQte: "S!E49",
  emballageTaux: "S!F49",
  // matériaux (nom choisi par ligne — la formule retrouve le prix par le nom)
  matLexan: "S!M24",
  matVinyle: "S!M25",
  matPolyester: "S!M26",
  matAluFoil: "S!M27",
  matDivers: "S!M28",
  matAdhesif: "S!M29",
  matOverlam: "S!M30",
  matXtra1: "S!M31",
  matXtra2: "S!M32",
  matXtra3: "S!M33",
  matXtra4: "S!M34",
  // Xtra : coût pi² manuel + perte par ligne
  xtra1Cout: "S!W31",
  xtra1Perte: "S!V31",
  xtra2Cout: "S!W32",
  xtra2Perte: "S!V32",
  xtra3Cout: "S!W33",
  xtra3Perte: "S!V33",
  xtra4Cout: "S!W34",
  xtra4Perte: "S!V34",
  // matériaux : pertes globales + divers
  diffDec: "S!W21", // fraction
  perteMat: "S!Y22", // fraction
  perteAdh: "S!Z22", // fraction
  brillant: "S!U35", // 1 = brillant
  mat_: "S!W35", // 1 = mat
  // sous-contrat
  fourn1: "S!K38",
  fourn2: "S!K39",
  fourn3: "S!K40",
  fourn4: "S!K41",
  sc1Cout: "S!R38",
  sc2Cout: "S!R39",
  sc3Cout: "S!R40",
  sc4Cout: "S!R41",
  sc1Taux: "S!T38",
  sc2Taux: "S!T39",
  sc3Taux: "S!T40",
  sc4Taux: "S!T41",
  // frais
  transport: "S!E51",
  autresFrais: "S!E52",
  // résultats (entrées du bloc prix)
  facteur: "S!W13", // fraction (0.25 = 25 %)
  tauxUs: "S!Z16",
} as const;

// ── cellules de sortie (calculées) ──
export const OUT = {
  nbMrxExact: "S!G9", // 13,75 — le formulaire affiche l'arrondi C!G10
  nbMrx: "C!G10", // ATTENTION : surface de la matrice en po² (E6×H6), PAS un nombre de matrices — nom historique
  montant: "S!W12", // coût de revient
  total: "S!W14", // prix vendant
  prixUnitaire: "S!W15",
  prixUnitaireUs: "S!W16",
  tempsImprHrs: "S!F17",
  tempsImprMin: "S!H17",
  tempsTotalHrs: "S!U18",
  tempsTotalMin: "S!W18",
  // matériaux : coût pi² / montant / minutes par ligne (rangées 24-35)
  coutLexan: "S!U24",
  montLexan: "S!Y24",
  minLexan: "S!AA24",
  coutVinyle: "S!U25",
  montVinyle: "S!Y25",
  minVinyle: "S!AA25",
  coutPolyester: "S!U26",
  montPolyester: "S!Y26",
  minPolyester: "S!AA26",
  coutAluFoil: "S!U27",
  montAluFoil: "S!Y27",
  minAluFoil: "S!AA27",
  coutDivers: "S!U28",
  montDivers: "S!Y28",
  minDivers: "S!AA28",
  coutAdhesif: "S!U29",
  montAdhesif: "S!Y29",
  minAdhesif: "S!AA29",
  coutOverlam: "S!U30",
  montOverlam: "S!Y30",
  minOverlam: "S!AA30",
  montXtra1: "S!Y31",
  minXtra1: "S!AA31",
  montXtra2: "S!Y32",
  minXtra2: "S!AA32",
  montXtra3: "S!Y33",
  montXtra4: "S!Y34",
  montPremask: "S!Y35",
  // découpe : hrs/min par opération (col H/I)
  // résumé bas (rangée 61)
  cat1Mat: "S!A61",
  cat2Soies: "S!C61",
  cat2Hrs: "S!E61",
  cat2Min: "S!F61",
  cat3Setup: "S!G61",
  cat3Hrs: "S!I61",
  cat3Min: "S!J61",
  cat4Seri: "S!K61",
  cat4Hrs: "S!M61",
  cat4Min: "S!N61",
  cat5Dec: "S!O61",
  cat5Hrs: "S!Q61",
  cat5Min: "S!R61",
  cat6Divers: "S!S61",
  cat6Hrs: "S!U61",
  cat6Min: "S!V61",
  cat7SousContrat: "S!W61",
  // sous-contrat montants par ligne
  sc1Mont: "S!V38",
  sc2Mont: "S!V39",
  sc3Mont: "S!V40",
  sc4Mont: "S!V41",
} as const;

// hrs/min découpe par opération (affichage colonne hrs|min)
export const DECOUPE_HM: Record<string, [string, string]> = {
  adhesifLamine: ["S!H22", "S!I22"],
  adhesifRegistre: ["S!H23", "S!I23"],
  overLaminating: ["S!H24", "S!I24"],
  premaskStd: ["S!H25", "S!I25"],
  protecteur: ["S!H26", "S!I26"],
  protecteurFenetre: ["S!H27", "S!I27"],
  slit: ["S!H28", "S!I28"],
  guillotine: ["S!H29", "S!I29"],
  assemblage: ["S!H30", "S!I30"],
  autresDecoupe: ["S!H31", "S!I31"],
  platAdhesif: ["S!H33", "S!I33"],
  platCoupe: ["S!H34", "S!I34"],
  platKisscut: ["S!H35", "S!I35"],
  platEmbossage: ["S!H36", "S!I36"],
  platTotal: ["S!H37", "S!I37"],
  zundAdhesif: ["S!H39", "S!I39"],
  zundCoupe: ["S!H40", "S!I40"],
  zundKisscut: ["S!H41", "S!I41"],
  zundTotal: ["S!H42", "S!I42"],
  decorticage: ["S!H43", "S!I43"],
  coinsRonds: ["S!H44", "S!I44"],
  laser: ["S!H45", "S!I45"],
  autres1: ["S!H46", "S!I46"],
  autres2: ["S!H47", "S!I47"],
  verif: ["S!H48", "S!I48"],
  emballage: ["S!H49", "S!I49"],
};

// ── catalogues de matériaux (colonnes de la feuille S) ──
// chaque ligne matériau a son catalogue ; la sélection se fait par le NOM
export const CATALOGUES: Record<string, string> = {
  matLexan: "AE",
  matVinyle: "AQ",
  matPolyester: "BP",
  matAluFoil: "BJ",
  matDivers: "AK",
  matAdhesif: "BD",
  matOverlam: "AW",
};

export function listeCatalogue(classeur: Classeur, col: string): string[] {
  const out: string[] = [];
  for (let r = 5; r <= 75; r++) {
    const v = classeur.S.values[col + r];
    if (typeof v === "string" && v.trim() !== "") out.push(v);
  }
  return out;
}

// libellés « aucun choix » des lignes Xtra
export const XTRA_PLACEHOLDER = ["Choisir matériau avec débitage", "Choisir matériau sans débitage"];

// ── interrupteurs de découpe ────────────────────────────────────────────────
// Ces cellules sont des drapeaux 0/1 dans le classeur, PAS des quantités :
//   · Zund « Cont. » D39-41 : C!Q10 multiplie la mise en train par D39+D40+D41 et le
//     roulement X33-35 exige « = 1 » → une valeur 4 gonfle le setup ET annule le roulement ;
//   · Platine kiss-cut D35 : C!Q8/J9 exigent « = 1 », sinon coût nul.
// Les autres « Die » platine (D33/D34/D36) restent des quantités (N matrices = N passes) et
// « Cut O » (E39-41) est un nombre de découpes intérieures par feuille (C!V30 le multiplie).
export const DRAPEAUX_DECOUPE: readonly string[] = [IN.zundAdhesifC, IN.zundCoupeC, IN.zundKisscutC, IN.platKisscutDie];

// Finition (28 sept. §5) : décorticage, vérification/comptage et emballage sont des
// interrupteurs dans le classeur (C!Q77/Q81/Q82 : « = 1 », et C!T84 met le prix unitaire à
// zéro au-delà). Le tarif reste la colonne de droite.
export const DRAPEAUX_FINITION: readonly string[] = [IN.decorticageQte, IN.verifQte, IN.emballageQte];

// ── drapeaux « SANS » (S!I11-14) ────────────────────────────────────────────
// Ils lèvent les verrous C!R60-63 qui, avec Q60-63, conditionnent le prix unitaire (S!W15).
// Depuis la v1.1 ils ne sont plus cliquables : c'est la boîte de confirmation à la
// validation qui les pose (« Vous acceptez de ne pas mettre d'adhésif ? » → Oui).
export const VERROUS_MATERIAUX = [
  { cle: "adhesif", drapeau: IN.sansAdhesif, verrou: "C!Q60", libelle: "adhésif", question: "Aucun adhésif n'est prévu (ni adhésif F/R, ni vinyle, ni overlaminating). Vous acceptez de ne pas mettre d'adhésif ?", conseil: "Ajoutez un adhésif (ligne « Adhésif F/R » des matériaux)." },
  { cle: "materiau", drapeau: IN.sansMateriau, verrou: "C!Q62", libelle: "matériau", question: "Aucun matériau d'impression n'est choisi. Vous acceptez de ne pas mettre de matériau ?", conseil: "Choisissez un matériau (Lexan, vinyle, polyester…)." },
  { cle: "coupe", drapeau: IN.sansCoupe, verrou: "C!Q61", libelle: "coupe", question: "Aucune coupe n'est prévue (platine, Zund ou guillotine). Vous acceptez de ne pas mettre de coupe ?", conseil: "Cochez une opération de découpe (platine, Zund) ou une guillotine." },
  { cle: "encre", drapeau: IN.sansEncre, verrou: "C!Q63", libelle: "encre", question: "Aucune encre n'est comptée (pas de couleur visible). Vous acceptez de ne pas mettre d'encre ?", conseil: "Renseignez les couleurs visibles ou une encre HPPL / texture." },
] as const;

/** Prix vendu manuel (v1.1) : décidé par le chargé de projet, jamais recalculé.
 *  Une pseudo-cellule par quantité : `X!VENDU` pour la quantité principale (S!E2),
 *  `X!VENDU1` / `X!VENDU2` pour S!J9 / S!J10, `X!VENDUn` pour la ligne ajoutée X!QTEn. */
export const CELL_VENDU = "X!VENDU";
export function cellVendu(qteCell: string): string {
  if (qteCell === IN.qte1) return "X!VENDU1";
  if (qteCell === IN.qte2) return "X!VENDU2";
  if (qteCell.startsWith("X!QTE")) return "X!VENDU" + qteCell.slice(5);
  return CELL_VENDU;
}

/** Case « taux de l'inventaire » de la ligne Prix Unit.Us (Artistic, 26 oct. 2026).
 *  Cochée, le taux de change vient du formulaire Taux_Change (cascade jour → semaine →
 *  mois → standard) au lieu d'être saisi à la main. Pseudo-cellule : elle est sauvegardée
 *  avec la soumission, donc une soumission rouverte garde le mode choisi. */
export const CELL_TAUX_INV = "X!TAUXINV";

/** Référence de contrat saisie par le chargé de compte, une par ligne de quantité
 *  (Artistic, 26 oct. 2026). Texte libre : aucune formule ne la lit, elle voyage avec la
 *  soumission comme les autres pseudo-cellules X!. Même découpage que `cellVendu`. */
export const CELL_CONTRAT = "X!CONTRAT";
export function cellContrat(qteCell: string): string {
  if (qteCell === IN.qte1) return "X!CONTRAT1";
  if (qteCell === IN.qte2) return "X!CONTRAT2";
  if (qteCell.startsWith("X!QTE")) return "X!CONTRAT" + qteCell.slice(5);
  return CELL_CONTRAT;
}

/** Lignes du gabarit de proposition Artistic (S-26635) qui n'ont aucune source dans la fiche
 *  de soumission : le contact du client, le nombre de lots, les épreuves, la finition, la
 *  livraison et les notes. Texte libre, saisi directement dans l'aperçu du document ; ce sont
 *  des pseudo-cellules X!, donc elles voyagent et se sauvegardent avec la soumission comme
 *  `X!CONTRAT` ou `X!VENDU`, et aucune formule ne les lit. */
export const CELL_PROP = {
  contact: "X!PROPCONTACT",
  lots: "X!PROPLOTS",
  epreuves: "X!PROPEPREUVES",
  finition: "X!PROPFINITION",
  livraison: "X!PROPLIVRAISON",
  notes: "X!PROPNOTES",
} as const;

/** Matériaux d'impression, dans l'ordre du bloc matériaux : sert à écrire la ligne
 *  « MATÉRIEL / MATERIAL » de la proposition à partir de ce qui est réellement choisi. */
export const CELLS_MATERIAU_IMPR = [
  IN.matLexan,
  IN.matVinyle,
  IN.matPolyester,
  IN.matAluFoil,
  IN.matDivers,
  IN.matXtra1,
  IN.matXtra2,
  IN.matXtra3,
  IN.matXtra4,
] as const;

/** Remet les entrées dans un état que les formules acceptent, sans toucher au moteur :
 *  · F/S (S!B4/D4/F4) = 1/1/1, toujours : les champs ne servent plus (réunion du 13 août) et
 *    sont retirés de l'interface ; S!W14 exige B4+D4+F4 ≥ 3 sinon prix unitaire = 0, et toute
 *    valeur > 1 ajouterait des passes (C!C9/D9/C11/C12) que personne ne verrait ;
 *  · drapeaux de découpe > 0 → 1 (anciennes soumissions saisies « 4 » dans Cont.). */
export function normaliserEntrees(m: Record<string, CellValue>): Record<string, CellValue> {
  for (const cell of [IN.fs1, IN.fs2, IN.fs3]) m[cell] = 1;
  // Coins ronds retiré de l'écran le 28 sept. (« plus utilisé ») : la cellule n'est plus
  // saisissable, on la vide pour qu'aucune valeur héritée ne continue de coûter.
  m[IN.coinsRondsQte] = "";
  for (const cell of [...DRAPEAUX_DECOUPE, ...DRAPEAUX_FINITION]) {
    const n = Number(m[cell]);
    if (Number.isFinite(n) && n > 0) m[cell] = 1;
  }
  return m;
}

/** État initial « nouvelle soumission » : vide toutes les entrées (comme un formulaire vierge).
 *  `defauts` (codes S_* venant de Creator/Taux_Calcul) écrase les valeurs par défaut embarquées. */
export function entreesVierges(defauts?: Record<string, CellValue>): Record<string, CellValue> {
  const m: Record<string, CellValue> = {};
  for (const cell of Object.values(IN)) m[cell] = "";
  // valeurs par défaut du métier (celles pré-remplies dans le classeur)
  m[IN.guillotineTaux] = 0.05;
  m[IN.assemblageTaux] = 0.5;
  m[IN.autresDecoupeTaux] = 0.25;
  m[IN.decorticageTaux] = 0.2;
  m[IN.coinsRondsTaux] = 0.015;
  m[IN.verifQte] = 1;
  m[IN.verifTaux] = 0.02;
  m[IN.emballageQte] = 1;
  m[IN.emballageTaux] = 0.01;
  m[IN.sc1Taux] = 0.35;
  m[IN.sc2Taux] = 0.35;
  m[IN.sc3Taux] = 0.35;
  m[IN.sc4Taux] = 0.35;
  // Défauts demandés par Artistic le 26 oct. 2026 : encres 150 %, transport 30 $,
  // facteur 40 %. Ils restent modifiables — ce sont des valeurs de départ, pas des verrous.
  // `encres` et `facteur` sont stockés en FRACTION (1,5 = 150 %), pas en pourcentage.
  m[IN.encres] = 1.5;
  m[IN.transport] = 30;
  m[IN.facteur] = 0.4;
  m[IN.perte] = 0.1;
  m[IN.matXtra1] = XTRA_PLACEHOLDER[0];
  m[IN.matXtra2] = XTRA_PLACEHOLDER[0];
  m[IN.matXtra3] = XTRA_PLACEHOLDER[1];
  m[IN.matXtra4] = XTRA_PLACEHOLDER[1];
  m[IN.ajustPlatine] = 0;
  m[IN.ajustZund] = 0;
  m[IN.ajustImpr] = 0;
  m[IN.diffDec] = 0;
  m[IN.perteMat] = 0;
  m[IN.perteAdh] = 0;
  if (defauts) for (const [cell, v] of Object.entries(defauts)) if (cell in m || Object.values(IN).includes(cell as never)) m[cell] = v;
  return normaliserEntrees(m);
}

/** État initial « exemple du classeur » : reprend le job d'exemple (Quantité 50 → 640,15 $). */
export function entreesExemple(classeur: Classeur): Record<string, CellValue> {
  const m: Record<string, CellValue> = {};
  for (const cell of Object.values(IN)) {
    const [sh, ref] = cell.split("!") as ["S" | "FT", string];
    const v = classeur[sh].values[ref];
    m[cell] = v === undefined ? "" : v;
  }
  return m;
}
