// Section 09 : achats, sous-contrats et installation (spec §4-09), sans React.
//
// HYPOTHÈSE de la première version : la majoration REMPLACE le facteur, comme dans le classeur
// (S!W14 ajoute le sous-contrat, déjà majoré de 35 %, au coût multiplié par le facteur).
// Les montants sont forfaitaires : les mêmes quel que soit le palier.
//
// Aucun bon de commande n'est créé ici. Un Purchase_Order enregistré dans Creator part dans la
// comptabilité réelle (Zoho Books) : ces brouillons restent dans la soumission.
import type { CellValue } from "@/lib/moteur";
import { toNum } from "@/lib/format";

type Entrees = Record<string, CellValue>;
const txt = (v: CellValue | undefined) => String(v ?? "").trim();

export const TYPES_ACHAT = ["Matériel", "Sous-traitance", "Transport", "Outillage"];
export const MAJORATION_DEFAUT = 0.35;
export const MAX_ACHATS = 12;
export const champAchat = (n: number, champ: string) => `X!ST${n}_${champ}`;

export interface Achat {
  n: number;
  type: string;
  fournisseur: string;
  description: string;
  noSoumission: string;
  cout: number;
  majoration: number;
  delai: number;
  inclus: boolean;
  /** montant facturé au client, majoration comprise */
  prix: number;
}

export function achats(e: Entrees): Achat[] {
  const out: Achat[] = [];
  for (let n = 1; n <= MAX_ACHATS; n++) {
    if (toNum(e[`X!ST${n}`] ?? "") < 1) continue;
    const c = (x: string) => e[champAchat(n, x)] ?? "";
    const cout = toNum(c("COUT"));
    const majoration = toNum(c("MAJ"));
    out.push({
      n,
      type: txt(c("TYPE")),
      fournisseur: txt(c("FOUR")),
      description: txt(c("DESC")),
      noSoumission: txt(c("NOSOUM")),
      cout,
      majoration,
      delai: toNum(c("DELAI")),
      inclus: toNum(c("INC")) >= 1,
      prix: cout * (1 + majoration),
    });
  }
  return out;
}

export function prochainAchat(e: Entrees): number | null {
  for (let n = 1; n <= MAX_ACHATS; n++) if (toNum(e[`X!ST${n}`] ?? "") < 1) return n;
  return null;
}

/** Cellules posées à l'ajout d'une ligne : présente, incluse, majorée au taux par défaut. */
export const nouvelAchat = (n: number, majoration: number): [string, CellValue][] => [
  [`X!ST${n}`, 1],
  [champAchat(n, "INC"), 1],
  [champAchat(n, "MAJ"), majoration],
];

export const cellulesAchat = (n: number) =>
  [`X!ST${n}`].concat(["TYPE", "FOUR", "DESC", "NOSOUM", "COUT", "MAJ", "DELAI", "INC"].map((c) => champAchat(n, c)));

export function totauxAchats(liste: Achat[]) {
  const inclus = liste.filter((a) => a.inclus);
  return {
    cout: inclus.reduce((t, a) => t + a.cout, 0),
    prix: inclus.reduce((t, a) => t + a.prix, 0),
    delai: Math.max(0, ...liste.map((a) => a.delai)),
  };
}

/** Un bon de commande par fournisseur (spec §7.3) : les lignes du même nom sont regroupées. */
export function parFournisseur(liste: Achat[]): { fournisseur: string; lignes: Achat[]; total: number }[] {
  const out = new Map<string, { fournisseur: string; lignes: Achat[]; total: number }>();
  for (const a of liste) {
    if (!a.fournisseur) continue;
    const cle = a.fournisseur.toLowerCase();
    const g = out.get(cle) ?? { fournisseur: a.fournisseur, lignes: [], total: 0 };
    g.lignes.push(a);
    g.total += a.cout;
    out.set(cle, g);
  }
  return [...out.values()];
}

// ── installation ────────────────────────────────────────────────────────────
export const INSTALL = {
  requise: "X!INS_REQ",
  par: "X!INS_PAR",
  lieu: "X!INS_LIEU",
  adresse: "X!INS_ADRESSE",
  date: "X!INS_DATE",
  ressource: "X!INS_RESSOURCE",
  surface: "X!INS_SURFACE",
  preparation: "X!INS_PREP",
  nb: "X!INS_NB",
  heures: "X!INS_HEURES",
  taux: "X!INS_TAUX",
  distance: "X!INS_KM",
  deplacement: "X!INS_DEPL",
  acces: "X!INS_ACCES",
  accesCout: "X!INS_ACCES_COUT",
  securite: "X!INS_SECU",
  contraintes: "X!INS_CONTR",
} as const;

export const installationRequise = (e: Entrees) => txt(e[INSTALL.requise]) === "Requise";

/** Le taux horaire saisi est un tarif facturé : aucun facteur ne s'y ajoute. */
export function montantInstallation(e: Entrees): number {
  if (!installationRequise(e)) return 0;
  const n = (c: string) => toNum(e[c] ?? "");
  return n(INSTALL.nb) * n(INSTALL.heures) * n(INSTALL.taux) + n(INSTALL.deplacement) + n(INSTALL.accesCout);
}

/** Ce qui manque à la section 09. Vide = rien à signaler. */
export function manquesSection09(e: Entrees, liste: Achat[]): string[] {
  const out: string[] = [];
  for (const a of liste) {
    const m = [!a.type && "type", !a.fournisseur && "fournisseur", a.inclus && !(a.cout > 0) && "coût"].filter(Boolean);
    if (m.length) out.push(`Achat ${a.n} : ${m.join(", ")} à compléter.`);
  }
  if (installationRequise(e)) {
    const texte: [string, string][] = [[INSTALL.adresse, "adresse"], [INSTALL.surface, "surface"], [INSTALL.date, "date souhaitée"]];
    const nombre: [string, string][] = [[INSTALL.nb, "nombre d'installateurs"], [INSTALL.heures, "heures"], [INSTALL.taux, "taux horaire"]];
    const m = [...texte.filter(([c]) => txt(e[c]) === ""), ...nombre.filter(([c]) => !(toNum(e[c] ?? "") > 0))].map(([, l]) => l);
    if (m.length) out.push(`Installation : ${m.join(", ")} à compléter.`);
  }
  return out;
}
