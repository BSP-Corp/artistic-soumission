// Règles matériaux — DEUX tables distinctes, toutes deux paramétrables dans Creator
// (formulaire `Regles_Materiaux`, rapport `R_gles_mat_riaux_Report`).
//
//   · ALERTE          (handoff 28 sept. §6a) — élément manquant → question oui/non à la
//                      validation. « Oui » pose le drapeau « SANS » (S!I11-14) et ça passe.
//   · VALIDATION PRIX (handoff 28 sept. §6b) — élément manquant → le PRIX UNITAIRE reste
//                      caché (§2) : on ne donne pas un prix au client sur une fiche incomplète.
//
// Un même matériau a donc jusqu'à deux lignes de règles ; les colonnes sont les mêmes.
//
// Pourquoi ne pas se fier aux verrous du classeur (C!Q60-63) : ils sont plus laxistes —
// C!Q60 compte un Vinyle, un Alu. Foil ou un Overlaminating comme « adhésif présent », donc
// un Lexan sans adhésif F/R passait inaperçu dès qu'une ligne Vinyle existait. Ici « adhésif »
// veut dire la ligne Adhésif F/R, et rien d'autre.
//
// Une règle cible soit une LIGNE du formulaire (Lexan, Vinyle…), soit un NOM de matériau
// (exact — c'est ce que renvoie le lookup Product de Creator — ou « contient »).

import type { CellValue, Moteur } from "./moteur";
import { IN, VERROUS_MATERIAUX, XTRA_PLACEHOLDER } from "./modele";
import type { Controle } from "./controles";

/** éléments qu'une règle peut exiger. `dimensions` n'a pas de drapeau « SANS » : il se corrige. */
export type ElementRequis = "adhesif" | "materiau" | "coupe" | "encre" | "dimensions";
export const ELEMENTS: ElementRequis[] = ["adhesif", "materiau", "coupe", "encre", "dimensions"];

/** portée d'une règle : alerte oui/non (§6a) ou condition d'affichage du prix (§6b) */
export type PorteeRegle = "alerte" | "prix";

export interface RegleMateriau {
  id?: string;
  /** libellé de ligne (« Lexan »), nom exact du produit, ou fragment de nom selon `typeCible` */
  cible: string;
  typeCible: "ligne" | "nom-exact" | "nom";
  portee: PorteeRegle;
  exige: ElementRequis[];
  actif: boolean;
  note?: string;
}

// ── défauts embarqués = les deux tables du client (handoff du 28 sept.) ─────
// Ils s'appliquent tant que Creator ne renvoie rien pour cette portée : le widget est donc
// utile dès le premier lancement, et BSP remplace ligne par ligne sans toucher au code.
const M_LEXAN = "Lexan", M_VINYLE = "Vinyle", M_POLYESTER = "Polyester", M_FOIL = "Alu. Foil", M_ABS = "Divers";

/** §6a — alerte oui/non : Lexan = encre + adhésif ; les autres = encre. */
export const REGLES_ALERTE_DEFAUT: RegleMateriau[] = [
  { cible: M_LEXAN, typeCible: "ligne", portee: "alerte", exige: ["encre", "adhesif"], actif: true, note: "défaut client 28 sept." },
  { cible: M_VINYLE, typeCible: "ligne", portee: "alerte", exige: ["encre"], actif: true, note: "défaut client 28 sept." },
  { cible: M_POLYESTER, typeCible: "ligne", portee: "alerte", exige: ["encre"], actif: true, note: "défaut client 28 sept." },
  { cible: M_FOIL, typeCible: "ligne", portee: "alerte", exige: ["encre"], actif: true, note: "défaut client 28 sept." },
  { cible: M_ABS, typeCible: "ligne", portee: "alerte", exige: ["encre"], actif: true, note: "défaut client 28 sept. (ligne Divers = ABS)" },
];

/** §6b — validation du prix : tous exigent encre + dim. pce + matériaux + coupe ; Lexan aussi l'adhésif. */
export const REGLES_PRIX_DEFAUT: RegleMateriau[] = [
  { cible: M_LEXAN, typeCible: "ligne", portee: "prix", exige: ["encre", "dimensions", "materiau", "adhesif", "coupe"], actif: true, note: "défaut client 28 sept." },
  { cible: M_VINYLE, typeCible: "ligne", portee: "prix", exige: ["encre", "dimensions", "materiau", "coupe"], actif: true, note: "défaut client 28 sept." },
  { cible: M_POLYESTER, typeCible: "ligne", portee: "prix", exige: ["encre", "dimensions", "materiau", "coupe"], actif: true, note: "défaut client 28 sept." },
  { cible: M_FOIL, typeCible: "ligne", portee: "prix", exige: ["encre", "dimensions", "materiau", "coupe"], actif: true, note: "défaut client 28 sept." },
  { cible: M_ABS, typeCible: "ligne", portee: "prix", exige: ["encre", "dimensions", "materiau", "coupe"], actif: true, note: "défaut client 28 sept. (ligne Divers = ABS)" },
];

export const REGLES_DEFAUT: RegleMateriau[] = [...REGLES_ALERTE_DEFAUT, ...REGLES_PRIX_DEFAUT];

/** lignes matériau du formulaire : libellé de ligne → cellule du nom */
export const LIGNES_MATERIAU: [string, string][] = [
  ["Lexan", IN.matLexan],
  ["Vinyle", IN.matVinyle],
  ["Polyester", IN.matPolyester],
  ["Alu. Foil", IN.matAluFoil],
  ["Divers", IN.matDivers],
  ["Xtra", IN.matXtra1],
  ["Xtra", IN.matXtra2],
  ["Xtra", IN.matXtra3],
  ["Xtra", IN.matXtra4],
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const txt = (v: CellValue) => String(v ?? "").trim();
const nomValide = (v: CellValue) => {
  const t = txt(v);
  return t !== "" && !(XTRA_PLACEHOLDER as readonly string[]).includes(t);
};
const n = (v: CellValue) => {
  const x = Number(v === "" || v === undefined ? 0 : v);
  return Number.isFinite(x) ? x : 0;
};

/** matériaux nommés dans la soumission, avec leur ligne */
export function materiauxPresents(e: Record<string, CellValue>): { ligne: string; nom: string }[] {
  return LIGNES_MATERIAU.filter(([, cell]) => nomValide(e[cell])).map(([ligne, cell]) => ({ ligne, nom: txt(e[cell]) }));
}

// BSP saisit le vocabulaire du client (« Lexan / Polycarbonate », « Aluminium Foil », « ABS »),
// pas les libellés des lignes du formulaire (« Lexan », « Alu. Foil », « Divers »). On ramène les
// deux à une même famille pour qu'une règle écrite dans les mots du métier s'applique vraiment —
// sans quoi elle ne ferait rien, en silence.
const FAMILLES: [RegExp, string][] = [
  [/lexan|polycarbonate/, "lexan"],
  [/vinyle|vinyl/, "vinyle"],
  [/polyester|mylar/, "polyester"],
  [/alu|foil/, "alufoil"],
  [/abs|styrene|coroplast|divers/, "divers"],
  [/adhesif|spacer/, "adhesif"],
  [/overlam|premask|protecteur/, "overlam"],
  [/xtra/, "xtra"],
];
function famille(libelle: string): string | null {
  // « Lexan / Polycarbonate » → on teste chaque terme séparément
  for (const terme of norm(libelle).split(/\s*\/\s*|\s+ou\s+/)) {
    for (const [motif, cle] of FAMILLES) if (motif.test(terme)) return cle;
  }
  for (const [motif, cle] of FAMILLES) if (motif.test(norm(libelle))) return cle;
  return null;
}

/** règles d'une portée donnée qui s'appliquent à un matériau */
export function reglesPour(regles: RegleMateriau[], portee: PorteeRegle, ligne: string, nom: string): RegleMateriau[] {
  return regles.filter((r) => {
    if (!r.actif || r.portee !== portee || !r.cible.trim()) return false;
    if (r.typeCible === "ligne") {
      if (norm(r.cible) === norm(ligne)) return true;
      const a = famille(r.cible);
      return a !== null && a === famille(ligne);
    }
    if (r.typeCible === "nom-exact") return norm(r.cible) === norm(nom);
    return norm(nom).includes(norm(r.cible));
  });
}

/** présence de chaque élément dans la soumission (strict : un adhésif = la ligne Adhésif F/R) */
export function elementsPresents(m: Moteur, e: Record<string, CellValue>): Record<ElementRequis, boolean> {
  return {
    adhesif: nomValide(e[IN.matAdhesif]),
    materiau: materiauxPresents(e).length > 0,
    coupe: m.num("C!Q61") >= 1, // guillotine, platine coupe / kiss-cut, Zund coupe / kiss-cut
    encre: m.num("C!Q63") >= 1, // un coût d'encre est compté (couleurs visibles, HPPL, texture…)
    dimensions: n(e[IN.dimPceX]) > 0 && n(e[IN.dimPceY]) > 0,
  };
}

const LIBELLE: Record<ElementRequis, string> = {
  adhesif: "un adhésif",
  materiau: "un matériau d'impression",
  coupe: "une coupe",
  encre: "une encre",
  dimensions: "les dimensions de la pièce",
};
const SANS: Record<ElementRequis, string> = { adhesif: "adhésif", materiau: "matériau", coupe: "coupe", encre: "encre", dimensions: "dimensions" };
const CONSTAT: Record<ElementRequis, string> = {
  adhesif: "aucune ligne « Adhésif F/R »",
  materiau: "aucun matériau d'impression",
  coupe: "aucune coupe (platine, Zund, guillotine)",
  encre: "aucune encre comptée (pas de couleur visible)",
  dimensions: "« Dim. Pce » vide",
};
const CONSEIL: Record<ElementRequis, string> = {
  adhesif: "Ajoutez un adhésif (ligne « Adhésif F/R » des matériaux).",
  materiau: "Choisissez un matériau (Lexan, vinyle, polyester…).",
  coupe: "Cochez une opération de découpe (platine, Zund) ou une guillotine.",
  encre: "Renseignez les couleurs visibles ou une encre HPPL / texture.",
  dimensions: "Renseignez « Dim. Pce » (X × Y, en pouces).",
};

/** éléments manquants pour une portée, avec les matériaux qui les exigent */
function manquantsPour(
  m: Moteur,
  e: Record<string, CellValue>,
  regles: RegleMateriau[],
  portee: PorteeRegle,
  ignorerDrapeaux: boolean,
): Map<ElementRequis, string[]> {
  const presents = elementsPresents(m, e);
  const out = new Map<ElementRequis, string[]>();
  for (const mat of materiauxPresents(e)) {
    for (const r of reglesPour(regles, portee, mat.ligne, mat.nom)) {
      for (const el of r.exige) {
        if (presents[el]) continue;
        // un « Sans X » confirmé lève l'exigence — sauf les dimensions, qui n'ont pas de drapeau
        const v = VERROUS_MATERIAUX.find((x) => x.cle === el);
        if (!ignorerDrapeaux && v && n(e[v.drapeau]) >= 1) continue;
        const liste = out.get(el) ?? [];
        const etiquette = `${mat.ligne} « ${mat.nom} »`;
        if (!liste.includes(etiquette)) liste.push(etiquette);
        out.set(el, liste);
      }
    }
  }
  return out;
}

/** §6a — alertes oui/non. Un « Sans X » déjà accepté lève l'alerte. */
export function alertesRegles(m: Moteur, e: Record<string, CellValue>, regles: RegleMateriau[]): Controle[] {
  const manquants = manquantsPour(m, e, regles, "alerte", false);
  return ELEMENTS.filter((el) => manquants.has(el)).map((el) => {
    const v = VERROUS_MATERIAUX.find((x) => x.cle === el);
    const base = `${manquants.get(el)!.join(", ")} sans ${SANS[el]} — confirmez-vous ? (règle : ${LIBELLE[el]} obligatoire ; ${CONSTAT[el]})`;
    // sans drapeau « SANS » (dimensions), la question n'a pas de sens : c'est un bloquant
    return v
      ? { type: "confirmation" as const, cle: "regle-" + el, message: base, conseil: CONSEIL[el], drapeau: v.drapeau }
      : { type: "bloquant" as const, cle: "regle-" + el, message: `${manquants.get(el)!.join(", ")} : ${CONSTAT[el]}.`, conseil: CONSEIL[el] };
  });
}

/** §6b — ce qui manque pour que le PRIX soit valide (§2). Les drapeaux « SANS » comptent aussi
 *  ici : confirmer « oui, sans adhésif » vaut décision, et le prix redevient calculable. */
export function manquantsPrix(m: Moteur, e: Record<string, CellValue>, regles: RegleMateriau[]): { element: ElementRequis; materiaux: string[] }[] {
  const manquants = manquantsPour(m, e, regles, "prix", false);
  return ELEMENTS.filter((el) => manquants.has(el)).map((el) => ({ element: el, materiaux: manquants.get(el)! }));
}

export const LIBELLE_ELEMENT = LIBELLE;
export const CONSEIL_ELEMENT = CONSEIL;

// ── lecture du formulaire Creator `Regles_Materiaux` ────────────────────────
// Structure posée par BSP le 17 sept. : `Materiau` = lookup → Product ({ ID, Name,
// zc_display_value }), `Adhesif_Obligatoire` + `Coupe_Obligatoire1` / `Encre_Obligatoire1` /
// `Oncle_Obligatoire1` / `Angle_Obligatoire1` = cases à cocher ("true"/"false"), `Autre` = texte.
//
// Deux tables dans un seul formulaire : une colonne `Type_regle` (« Alerte » / « Prix ») les
// sépare. Si elle n'existe pas encore, la ligne est lue comme une règle d'ALERTE — le
// comportement d'avant, sans rupture ; les règles de prix restent alors les défauts client.
const vrai = (v: unknown) => v === true || v === 1 || v === "true" || v === "1" || v === "Oui" || v === "oui";

// Creator fabrique le nom technique d'un champ à partir de son libellé, et il ne translittère pas
// les accents : il les SUPPRIME. « Matériau obligatoire » devient `Mat_riau_obligatoire`, « Type
// règle » devient `Type_r_gle`, et un suffixe `1` s'ajoute en cas de collision. Impossible donc
// de deviner le nom exact depuis le libellé que BSP tapera dans le builder.
//
// On compare en deux passes :
//   1. clé réduite — sans accents, sans séparateurs, sans casse, sans chiffre final ;
//   2. à défaut, squelette consonantique — les voyelles retirées, ce qui rend la lettre accentuée
//      manquante invisible (`materiau` et `matriau` donnent tous deux `mtr`).
// Le champ est ainsi trouvé quel que soit le libellé saisi.
const cle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\d+$/, "");
const squelette = (s: string) => cle(s).replace(/[aeiouy]/g, "");

function champ(r: Record<string, unknown>, ...alias: string[]): unknown {
  const cles = alias.map(cle);
  for (const [k, v] of Object.entries(r)) if (cles.includes(cle(k))) return v;
  const sq = alias.map(squelette);
  for (const [k, v] of Object.entries(r)) if (sq.includes(squelette(k))) return v;
  return undefined;
}

export function regleDepuisCreator(r: Record<string, unknown>): RegleMateriau | null {
  const mat = champ(r, "Materiau") as { Name?: string; zc_display_value?: string } | string | undefined;
  const nom = (typeof mat === "object" && mat ? mat.zc_display_value || mat.Name : String(mat ?? "")) ?? "";
  const cible = String(nom).trim() || String(champ(r, "Cible", "Famille") ?? "").trim();
  if (!cible) return null;
  const exige: ElementRequis[] = [];
  if (vrai(champ(r, "Adhesif_Obligatoire", "Adhesif"))) exige.push("adhesif");
  if (vrai(champ(r, "Materiau_Obligatoire", "Materiaux_Obligatoire"))) exige.push("materiau");
  if (vrai(champ(r, "Coupe_Obligatoire", "Coupe"))) exige.push("coupe");
  if (vrai(champ(r, "Encre_Obligatoire", "Encre"))) exige.push("encre");
  if (vrai(champ(r, "Dim_Pce_Obligatoire", "Dimensions_Obligatoire", "Dim_Piece_Obligatoire"))) exige.push("dimensions");
  // « Oncle » / « Angle » : colonnes présentes dans le formulaire, sens non confirmé → non lues
  const actif = champ(r, "Actif");
  return {
    id: String(r.ID ?? ""),
    cible,
    typeCible: String(nom).trim() ? "nom-exact" : "ligne",
    portee: /prix/i.test(String(champ(r, "Type_regle", "Type_de_regle", "Portee") ?? "")) ? "prix" : "alerte",
    exige,
    actif: actif === undefined ? true : vrai(actif),
    note: String(champ(r, "Autre", "Note", "Commentaires") ?? "").trim(),
  };
}

/** Fusionne ce que Creator renvoie avec les défauts : une portée absente de Creator garde ses
 *  défauts client, de sorte qu'ajouter la colonne `Type_regle` plus tard ne casse rien. */
export function fusionnerRegles(creator: RegleMateriau[] | null): { regles: RegleMateriau[]; source: string } {
  if (!creator || !creator.length) return { regles: REGLES_DEFAUT, source: "défauts embarqués" };
  const alertes = creator.filter((r) => r.portee === "alerte");
  const prix = creator.filter((r) => r.portee === "prix");
  const regles = [...(alertes.length ? alertes : REGLES_ALERTE_DEFAUT), ...(prix.length ? prix : REGLES_PRIX_DEFAUT)];
  const detail = `${alertes.length || "défauts"} alerte${alertes.length > 1 ? "s" : ""} · ${prix.length || "défauts"} prix`;
  return { regles, source: `Creator : ${detail}` };
}
