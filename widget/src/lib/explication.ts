// « Comment ce chiffre est calculé » : pour une cellule calculée, retrouve la formule
// Excel d'origine et ses composantes directes avec leurs valeurs courantes et un
// libellé français quand on le connaît.
import type { Classeur, CellValue } from "./moteur";

export interface Composante {
  cell: string;
  label: string;
  value: CellValue;
}
export interface Explication {
  cell: string;
  label: string;
  formule: string | null;
  value: CellValue;
  composantes: Composante[];
  estSaisie: boolean;
}

// libellés français des cellules les plus consultées
export const LIBELLES: Record<string, string> = {
  // paramètres & résultats
  "S!E2": "Quantité",
  "S!I2": "Perte (fraction)",
  "S!E3": "Couleurs visibles",
  "S!B4": "F/S recto",
  "S!D4": "F/S verso",
  "S!F4": "F/S total",
  "S!E5": "Nombre de Up",
  "S!E6": "Dim. matrice X (po.)",
  "S!H6": "Dim. matrice Y (po.)",
  "S!V7": "Dim. pièce X (po.)",
  "S!Y7": "Dim. pièce Y (po.)",
  "S!G9": "Feuilles nécessaires (avant arrondi)",
  "C!G10": "Nb. matrices (arrondi)",
  "S!W12": "Montant (coût de revient)",
  "S!W13": "Facteur (marge)",
  "S!W14": "Total (prix vendant)",
  "S!W15": "Prix unitaire",
  "S!W16": "Prix unitaire US",
  "S!F17": "Temps impression (hrs)",
  "S!H17": "Temps impression (min)",
  "S!U18": "Temps total (hrs)",
  "S!W18": "Temps total (min)",
  // résumé (rangée 61)
  "S!A61": "MAT. 1ère ($)",
  "S!C61": "Soies, encres, dév. ($)",
  "S!G61": "Set-up découpe ($)",
  "S!K61": "Sérigraphie ($)",
  "S!O61": "Découpe / Numérique ($)",
  "S!S61": "Divers ($)",
  "S!W61": "Sous-contrat ($)",
  // totaux du cerveau C
  "C!G11": "Total dépt. soies ($)",
  "C!G13": "Total set-up soies ($)",
  "C!X17": "Encres ($)",
  "C!Q11": "Total set-up découpe ($)",
  "C!J20": "Total débitage Zund ($)",
  "C!J30": "Total découpe / finition ($)",
  "C!J32": "Total plaques matrices ($)",
  "C!J43": "Grand total temps ($)",
  "C!S10": "Set-up découpe — part temps ($)",
  "C!Y12": "Temps impression ($ travail)",
  // lignes matériaux
  "S!U24": "Coût pi² Lexan",
  "S!Y24": "Montant Lexan ($)",
  "S!U25": "Coût pi² Vinyle",
  "S!Y25": "Montant Vinyle ($)",
  "S!U26": "Coût pi² Polyester",
  "S!Y26": "Montant Polyester ($)",
  "S!U27": "Coût pi² Alu. Foil",
  "S!Y27": "Montant Alu. Foil ($)",
  "S!U28": "Coût pi² Divers",
  "S!Y28": "Montant Divers ($)",
  "S!U29": "Coût pi² Adhésif F/R",
  "S!Y29": "Montant Adhésif F/R ($)",
  "S!U30": "Coût pi² Overlaminating",
  "S!Y30": "Montant Overlaminating ($)",
  "S!Y22": "Perte matériaux (fraction)",
  "S!Z22": "Perte adhésif (fraction)",
  "S!M24": "Matériau Lexan choisi",
  "S!M25": "Matériau Vinyle choisi",
  "S!M27": "Matériau Alu. Foil choisi",
  "S!M29": "Adhésif choisi",
  // sous-contrat
  "S!V38": "Sous-contrat ligne 1 ($)",
  "S!V39": "Sous-contrat ligne 2 ($)",
  "S!V40": "Sous-contrat ligne 3 ($)",
  "S!V41": "Sous-contrat ligne 4 ($)",
  "S!E51": "Transport ($)",
  "S!E52": "Autres frais ($)",
  // paramètres INV (carte de taux)
  // le taux et la majoration sont paramétrables (Taux_Calcul INV_8 / INV_6) : leur valeur
  // s'ajoute au libellé à l'affichage, elle n'est pas écrite en dur ici
  "INV!CF8": "Taux horaire",
  "INV!CF6": "Majoration matières",
  "INV!CF15": "Amortissement Mimaki/Ion",
  "INV!CF16": "Amortissement Zund",
  "INV!CH8": "Guillotine (mrcx/h)",
  "INV!CI8": "Cisaille grand volume (mrcx/h)",
  "INV!CH9": "Sérigraphie (mrcx/h)",
  "INV!CH11": "Sérigraphie clair (mrcx/h)",
  "INV!CH12": "Sérigraphie passe add. (mrcx/h)",
};

/** Cellules dont la valeur courante fait partie du libellé : figer « 73 $/h » dans le texte
 *  mentait dès que le taux changeait (passé à 74 $/h le 28 sept. 2026). */
const UNITE: Record<string, (v: number) => string> = {
  "INV!CF8": (v) => `${v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/h`,
  "INV!CF6": (v) => `×${v.toLocaleString("fr-CA", { maximumFractionDigits: 4 })}`,
};

export function libelle(cell: string, valeur?: (c: string) => CellValue): string {
  const base = LIBELLES[cell] ?? cell;
  const unite = UNITE[cell];
  if (!unite || !valeur) return base;
  const n = Number(valeur(cell));
  return Number.isFinite(n) && n !== 0 ? `${base} (${unite(n)})` : base;
}

// extrait les références directes d'une formule (hors littéraux entre guillemets)
const REF_RE = /(?:\[\d+\](INV)!|'?([A-Za-z]+)'?!)?\$?([A-Z]{1,3})\$?(\d{1,7})(?![\dA-Za-z_(])/g;

export function composantesDe(classeur: Classeur, cellKey: string, valeur: (c: string) => CellValue): Composante[] {
  const [sheet, ref] = cellKey.split("!");
  const f = (classeur as unknown as Record<string, { formulas: Record<string, string> }>)[sheet]?.formulas?.[ref];
  if (!f) return [];
  let clean = "";
  let inStr = false;
  for (const ch of f) {
    if (ch === '"') inStr = !inStr;
    else if (!inStr) clean += ch;
  }
  const seen = new Set<string>();
  const out: Composante[] = [];
  for (const m of clean.matchAll(REF_RE)) {
    const sh = m[1] ?? m[2] ?? sheet;
    const key = sh + "!" + m[3] + m[4];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ cell: key, label: libelle(key, valeur), value: valeur(key) });
    if (out.length >= 10) break;
  }
  return out;
}

export function expliquer(classeur: Classeur, cellKey: string, valeur: (c: string) => CellValue): Explication {
  const [sheet, ref] = cellKey.split("!");
  const f =
    (classeur as unknown as Record<string, { formulas: Record<string, string> }>)[sheet]?.formulas?.[ref] ?? null;
  return {
    cell: cellKey,
    label: libelle(cellKey, valeur),
    formule: f,
    value: valeur(cellKey),
    composantes: f ? composantesDe(classeur, cellKey, valeur) : [],
    estSaisie: !f,
  };
}
