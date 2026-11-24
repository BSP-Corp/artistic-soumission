// Chiffrage PROVISOIRE du numérique et de la découpe seule.
//
// Le client n'a pas encore fourni ses vitesses ni ses coûts de finition. Pour avoir une première
// version qui se teste, chaque donnée manquante porte une HYPOTHÈSE BSP, marquée comme telle à
// l'écran, modifiable dans la soumission (X!NT_<code>) et globalement (Taux_Calcul,
// APP_NUM_<code>). Dès qu'une fiche machine porte un taux ou une vitesse, la fiche l'emporte.
//
// Ces prix ne s'impriment pas et ne créent pas de bon de travail. Aucune formule du classeur
// n'est touchée : ce calcul est à côté du moteur, jamais dedans.
import type { CellValue } from "@/lib/moteur";
import { toNum } from "@/lib/format";
import { dimensionsProduit, espacementOeillets, listeValeurs, nbOeillets, trouverProduit, type ValeursNum } from "@/lib/numerique";

type Entrees = Record<string, CellValue>;
export const PREFIXE_TAUX_NUM = "X!NT_";
export const CELL_MACHINE_NUM = "X!NMACHINE";
export const CELL_MATIERE_NUM = "X!NMATIERE";

export type SourceTaux = "saisie" | "réglage" | "fiche" | "hypothèse";
export interface TauxNum {
  code: string;
  libelle: string;
  unite: string;
  defaut: number;
}

const T = (code: string, libelle: string, unite: string, defaut: number): TauxNum => ({ code, libelle, unite, defaut });

/** Toutes les hypothèses. Les ordres de grandeur sont de BSP, aucun ne vient du client, sauf
 *  les taux et vitesses que la fiche machine porte déjà. */
export const TAUX_NUM: TauxNum[] = [
  T("V_HP570", "Vitesse HP Latex 570", "pi²/h", 225),
  T("V_HP365", "Vitesse HP Latex 365", "pi²/h", 150),
  T("V_ANAPURNA", "Vitesse Anapurna", "pi²/h", 250),
  T("T_HP570", "Taux HP Latex 570", "$/h", 59.79),
  T("T_HP365", "Taux HP Latex 365", "$/h", 59.79),
  T("T_ANAPURNA", "Taux Anapurna", "$/h", 100.12),
  T("SETUP", "Mise en train impression", "min", 20),
  T("BLANC", "Multiplicateur avec blanc", "×", 1.5),
  T("ENCRE", "Encre", "$/pi²", 0.35),
  T("LAMINE", "Film de laminage", "$/pi²", 1.1),
  T("LAMINE_V", "Vitesse de laminage", "pi²/h", 300),
  T("MO", "Taux main-d'œuvre", "$/h", 74),
  T("T_ZUND", "Taux Zünd M-1600", "$/h", 74.88),
  T("V_ZUND", "Vitesse Zünd M-1600", "po/min", 280),
  T("SETUP_ZUND", "Mise en train Zünd", "min", 15),
  T("M_ADHESIF", "Vinyle adhésif", "$/pi²", 1.25),
  T("M_PERFORE", "Vinyle perforé", "$/pi²", 1.9),
  T("M_RIGIDE", "Panneau économique", "$/pi²", 1.5),
  T("M_RIGIDE_HG", "Panneau Sintra, Dibond, acrylique, polycarbonate", "$/pi²", 4.5),
  T("M_BANNIERE", "Toile de bannière", "$/pi²", 0.9),
  T("M_ROLLUP", "Vinyle de roll-up 9 oz", "$/pi²", 1),
  T("F_OEILLET", "Œillet posé", "$ / œillet", 0.75),
  T("F_COUTURE", "Couture et ourlet", "$/po", 0.05),
  T("F_PERCAGE", "Perçage de panneau", "$ / pièce", 2),
  T("F_COINS", "Coins arrondis", "$ / pièce", 1),
  T("F_RUBAN", "Ruban double face", "$/po", 0.06),
  T("F_VELCRO", "Velcro", "$/po", 0.12),
  T("F_SLIT", "Slit", "$ / pièce", 0.1),
  T("F_TRANSFERT", "Transfert et échenillage", "$/pi²", 2.5),
  T("F_AUTRE", "Autre finition", "$ / pièce", 5),
  T("SUBSTRAT", "Substrat fourni par Artistic", "$/pi²", 3),
  T("POSE_SUBSTRAT", "Pose sur substrat", "$/pi²", 0.75),
  T("KIT_ECO33", "Mécanisme économique 33 po", "$ / pièce", 65),
  T("KIT_ECO48", "Mécanisme économique 48 po", "$ / pièce", 110),
  T("KIT_LUXE33", "Mécanisme luxe 33 po", "$ / pièce", 120),
  T("KIT_LUXE48", "Mécanisme luxe 48 po", "$ / pièce", 190),
  T("DEL", "Lampe DEL", "$ / pièce", 45),
];

export const MACHINES_NUM = [
  { cle: "HP570", nom: "HP Latex 570", motif: /latex\s*570/i },
  { cle: "HP365", nom: "HP Latex 365", motif: /latex\s*365/i },
  { cle: "ANAPURNA", nom: "Anapurna", motif: /anapurna/i },
];

export interface FicheMachineNum {
  nomMachine: string;
  statut: string;
  tauxMachine: number | null;
  vitesseBase: number | null;
  setupMinutes: number | null;
}

/** Valeur retenue pour un taux, et d'où elle vient. */
export function lireTaux(
  code: string,
  e: Entrees,
  app: Record<string, number> | undefined,
  fiches: FicheMachineNum[],
): { valeur: number; source: SourceTaux } {
  const def = TAUX_NUM.find((t) => t.code === code);
  if (!def) throw new Error("taux numérique inconnu : " + code);
  const saisi = e[PREFIXE_TAUX_NUM + code];
  // Une vitesse à zéro diviserait par zéro : seule une valeur positive est retenue.
  const ok = (v: unknown) => Number.isFinite(Number(v)) && (Number(v) > 0 || (Number(v) === 0 && !/^V_|_V$/.test(code)));
  if (saisi !== undefined && saisi !== "" && ok(saisi)) return { valeur: Number(saisi), source: "saisie" };
  const reglage = app?.["NUM_" + code];
  if (reglage !== undefined && ok(reglage)) return { valeur: Number(reglage), source: "réglage" };
  const active = (motif: RegExp) => fiches.find((f) => motif.test(f.nomMachine.trim()) && f.statut !== "Inactif");
  const presse = MACHINES_NUM.find((m) => code === "V_" + m.cle || code === "T_" + m.cle);
  const zund = /^(T|V|SETUP)_ZUND$/.test(code);
  const fiche = presse ? active(presse.motif) : zund ? active(/^zund m-1600$/i) : undefined;
  const v = code.startsWith("V_") ? fiche?.vitesseBase : code.startsWith("T_") ? fiche?.tauxMachine : fiche?.setupMinutes;
  if (fiche && v && v > 0) return { valeur: v, source: "fiche" };
  return { valeur: def.defaut, source: "hypothèse" };
}

export interface Poste {
  libelle: string;
  cout: number;
}
export interface ResultatNum {
  postes: Poste[];
  cout: number;
  prix: number;
  unitaire: number;
  heures: number;
  machine: string;
  /** tous les taux utilisés, dans l'ordre du calcul */
  taux: string[];
  /** ceux qui ne sont que des hypothèses BSP */
  hypotheses: string[];
  /** pourquoi rien n'est chiffré, vide sinon */
  manque: string;
}

export function machineParDefaut(produit: string, v: ValeursNum): string {
  const code = trouverProduit(produit)?.code;
  return code === "panneaux" && /directe/i.test(String(v.Pan_Impr_methode ?? "")) ? "ANAPURNA" : "HP570";
}

/** Coût de matière par défaut, d'après l'option du produit. */
function codeMatiere(code: string, v: ValeursNum): string {
  if (code === "panneaux") return /sintra|dibond|acryl|polycarb/i.test(String(v.Pan_Materiel ?? "")) ? "M_RIGIDE_HG" : "M_RIGIDE";
  if (code === "bannieres") return "M_BANNIERE";
  if (code === "rollup") return "M_ROLLUP";
  return /perfor/i.test(String(v.Auto_Media ?? "")) ? "M_PERFORE" : "M_ADHESIF";
}

export interface DemandeNum {
  /** « decoupe » : aucune impression */
  methode: "numerique" | "decoupe";
  valeurs: ValeursNum;
  qte: number;
  gache: number;
  facteur: number;
  transport: number;
  entrees: Entrees;
  app?: Record<string, number>;
  fiches: FicheMachineNum[];
  /** $/pi² de la matière d'inventaire choisie, null sinon */
  prixMatiere: number | null;
  /** remplace les dimensions lues dans les valeurs (pièces 2 à 5) */
  dims?: { l: number; h: number };
}

const vrai = (v: unknown) => v === true || /^(1|oui|true)$/i.test(String(v ?? ""));

export function chiffrerNumerique(d: DemandeNum): ResultatNum {
  const vide = (manque: string): ResultatNum => ({
    postes: [], cout: 0, prix: 0, unitaire: 0, heures: 0, machine: "", taux: [], hypotheses: [], manque,
  });
  const v = d.valeurs;
  const imprime = d.methode === "numerique";
  const produit = String(v.Num_Type_produit ?? "");
  const p = imprime ? trouverProduit(produit) : null;
  if (imprime && !p?.actif) return vide("Choisissez un type de produit.");
  const code = p?.code ?? "";
  const lues = imprime ? dimensionsProduit(produit, v) : { largeurPo: toNum(v.Num_Largeur as CellValue), hauteurPo: toNum(v.Num_Hauteur as CellValue) };
  // Le roll-up tire ses dimensions de son format : une pièce 2 n'y change rien.
  const autres = d.dims && code !== "rollup" ? d.dims : null;
  const L = autres ? autres.l : lues.largeurPo;
  const H = autres ? autres.h : lues.hauteurPo;
  if (!(L > 0 && H > 0)) return vide(code === "rollup" ? "Choisissez un format de roll-up." : "Entrez la largeur et la hauteur de la pièce (section 02).");
  if (!(d.qte > 0)) return vide("Aucune quantité.");

  const utilises = new Map<string, SourceTaux>();
  const t = (c: string) => {
    const r = lireTaux(c, d.entrees, d.app, d.fiches);
    utilises.set(c, r.source);
    return r.valeur;
  };
  const postes: Poste[] = [];
  const poste = (libelle: string, cout: number) => {
    if (cout > 0) postes.push({ libelle, cout });
  };
  const qteProd = Math.ceil(Number((d.qte * (1 + Math.max(0, d.gache))).toFixed(6)));
  const pi2 = ((L * H) / 144) * qteProd;
  const perimetre = 2 * (L + H);
  let heures = 0;
  let machine = "";

  poste(d.prixMatiere ? "Matière (inventaire)" : "Matière", pi2 * (d.prixMatiere || t(codeMatiere(code, v))));

  if (imprime) {
    const choisie = String(d.entrees[CELL_MACHINE_NUM] ?? "");
    const m = MACHINES_NUM.find((x) => x.cle === choisie) ?? MACHINES_NUM.find((x) => x.cle === machineParDefaut(produit, v))!;
    machine = m.nom;
    const faces = [v.Auto_Impr_face, v.Pan_Impr_face, v.Ban_Impr_face].some((x) => /verso/i.test(String(x ?? ""))) ? 2 : 1;
    const blanc = /\+ blanc/i.test([v.Auto_Impr_couleur, v.Pan_Impr_couleur].join(" ")) ? t("BLANC") : 1;
    const surface = pi2 * faces;
    const h = t("SETUP") / 60 + (surface * blanc) / t("V_" + m.cle);
    heures += h;
    poste(`Impression ${machine}`, h * t("T_" + m.cle));
    poste("Encre", surface * blanc * t("ENCRE"));
    if (/contrecoll/i.test(String(v.Pan_Impr_methode ?? ""))) {
      poste("Vinyle contrecollé", surface * t("M_ADHESIF"));
      poste("Pose du vinyle", surface * t("POSE_SUBSTRAT"));
    }
    const lam = [v.Auto_Laminage, v.Pan_Laminage].map((x) => String(x ?? "")).find((x) => x && x !== "Aucun");
    if (lam) {
      const hl = surface / t("LAMINE_V");
      heures += hl;
      poste(`Laminage ${lam}`, surface * t("LAMINE") + hl * t("MO"));
    }
  }

  const fin = imprime ? [v.Auto_Finition, v.Pan_Finition, v.Ban_Finition].flatMap(listeValeurs) : [];
  if (!imprime || fin.some((x) => /découp|coupé au format|kiss-cut/i.test(x))) {
    const h = t("SETUP_ZUND") / 60 + (perimetre * qteProd) / (t("V_ZUND") * 60);
    heures += h;
    poste("Découpe Zünd", h * t("T_ZUND"));
  }

  if (imprime) {
    const esp = code === "bannieres" ? espacementOeillets(v) : 0;
    if (esp > 0) {
      poste("Œillets", nbOeillets(L, H, esp) * d.qte * t("F_OEILLET"));
      poste("Couture", perimetre * d.qte * t("F_COUTURE"));
    }
    const ourlets = fin.filter((x) => /^ourlet/i.test(x)).length;
    if (ourlets) poste("Ourlets", ourlets * L * d.qte * t("F_COUTURE"));
    if (fin.includes("Perçage / œillets")) poste("Perçage", d.qte * t("F_PERCAGE"));
    if (fin.includes("Coins arrondis")) poste("Coins arrondis", d.qte * t("F_COINS"));
    if (fin.includes("Ruban adhésif double face")) poste("Ruban double face", perimetre * d.qte * t("F_RUBAN"));
    if (fin.includes("Velcro")) poste("Velcro", perimetre * d.qte * t("F_VELCRO"));
    if (fin.includes("Slit")) poste("Slit", d.qte * t("F_SLIT"));
    if (fin.some((x) => /transfert/i.test(x))) poste("Transfert et échenillage", pi2 * t("F_TRANSFERT"));
    if (fin.includes("Autre finition")) poste("Autre finition", d.qte * t("F_AUTRE"));
    const montage = code === "autocollants" ? String(v.Auto_Montage ?? "") : "";
    if (/Substrat/.test(montage)) poste("Pose sur substrat", pi2 * t("POSE_SUBSTRAT"));
    if (/Artistic/.test(montage)) poste("Substrat", pi2 * t("SUBSTRAT"));
    if (code === "rollup") {
      poste("Mécanisme", d.qte * t((/luxe/i.test(String(v.Retr_Modele ?? "")) ? "KIT_LUXE" : "KIT_ECO") + (L >= 48 ? "48" : "33")));
      if (vrai(v.Retr_Lampe_DEL)) poste("Lampe DEL", d.qte * t("DEL"));
    }
  }

  poste("Transport", Math.max(0, d.transport));
  const cout = postes.reduce((s, x) => s + x.cout, 0);
  const prix = cout * (1 + Math.max(0, d.facteur));
  return {
    postes,
    cout,
    prix,
    unitaire: prix / d.qte,
    heures,
    machine,
    taux: [...utilises.keys()],
    hypotheses: [...utilises].filter(([, s]) => s === "hypothèse").map(([c]) => c),
    manque: "",
  };
}
