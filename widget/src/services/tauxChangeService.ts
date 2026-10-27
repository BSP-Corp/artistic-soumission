// Taux de change CAD → USD, paramétré dans Creator (formulaire Taux_Change).
//
// Règle demandée par Artistic le 26 oct. 2026 — une cascade, du plus précis au plus général :
//   taux du jour → taux de la semaine → taux du mois → taux standard.
// Un taux laissé vide est SAUTÉ, on passe au suivant. Le standard n'expire jamais : tant
// qu'il est rempli, il y a toujours un taux, et la soumission ne se retrouve pas sans prix US.
//
// Le choix dépend de la DATE D'EFFET de l'enregistrement, comparée à la date de la
// soumission (aujourd'hui par défaut) : même jour, même semaine, même mois.

import { isZohoEnv } from "./zohoService";

export const FORM_TAUX_CHANGE = "Taux_Change";
// Rapport créé APRÈS les champs : un rapport né en même temps qu'un formulaire vide
// n'expose que l'ID, et le widget lirait des enregistrements vides sans la moindre erreur.
export const REPORT_TAUX_CHANGE = "Taux_Change_Liste";

export type NiveauTaux = "jour" | "semaine" | "mois" | "standard";

export interface TauxChange {
  id: string;
  dateEffet: Date | null;
  jour: number | null;
  semaine: number | null;
  mois: number | null;
  standard: number | null;
  actif: boolean;
  note: string;
}

/** Taux retenu et niveau d'où il vient, pour pouvoir l'expliquer à l'écran. */
export interface TauxRetenu {
  taux: number;
  niveau: NiveauTaux;
  dateEffet: Date | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MOIS: Record<string, number> = {
  jan: 0, feb: 1, fev: 1, mar: 2, apr: 3, avr: 3, may: 4, mai: 4, jun: 5, juin: 5,
  jul: 6, juil: 6, aug: 7, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** « 26-Oct-2026 » → Date. Format `dd-MMM-yyyy` du formulaire ; abréviations anglaises ou
 *  françaises selon la langue de l'utilisateur. Renvoie null plutôt qu'une date invalide. */
export function dateCreator(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})-([A-Za-zéû.]+)-(\d{4})/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const cle = m[2].toLowerCase().replace(/\./g, "").slice(0, 4);
  const mois = MOIS[cle] ?? MOIS[cle.slice(0, 3)];
  if (mois === undefined) return null;
  const d = new Date(Number(m[3]), mois, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const memeMois = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Même semaine civile, lundi comme premier jour. */
function memeSemaine(a: Date, b: Date): boolean {
  const lundi = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x.getTime();
  };
  return lundi(a) === lundi(b);
}

/** Applique la cascade à UN enregistrement, pour une date donnée. null si aucun taux ne
 *  s'applique (tous vides, ou la date d'effet est trop ancienne et le standard est vide). */
export function choisirTaux(t: TauxChange, quand: Date = new Date()): TauxRetenu | null {
  const d = t.dateEffet;
  if (d) {
    if (t.jour !== null && memeJour(d, quand)) return { taux: t.jour, niveau: "jour", dateEffet: d };
    if (t.semaine !== null && memeSemaine(d, quand)) return { taux: t.semaine, niveau: "semaine", dateEffet: d };
    if (t.mois !== null && memeMois(d, quand)) return { taux: t.mois, niveau: "mois", dateEffet: d };
  }
  // Le standard ne dépend pas de la date d'effet : c'est le filet.
  if (t.standard !== null) return { taux: t.standard, niveau: "standard", dateEffet: d };
  return null;
}

type Reponse = { code: number; data?: Record<string, unknown>[] };

/** Lit les taux actifs, le plus récent d'abord. [] hors Zoho ou si le rapport est vide. */
export async function chargerTaux(): Promise<TauxChange[]> {
  if (!isZohoEnv()) return [];
  try {
    const res = (await ZOHO.CREATOR.DATA.getRecords({
      report_name: REPORT_TAUX_CHANGE,
      max_records: 200,
      field_config: "all",
    })) as Reponse;
    if (res.code !== 3000 || !res.data?.length) return [];
    return res.data
      .map((r) => ({
        id: String(r.ID ?? ""),
        dateEffet: dateCreator(r.Date_Effet),
        jour: num(r.Taux_Jour),
        semaine: num(r.Taux_Semaine),
        mois: num(r.Taux_Mois),
        standard: num(r.Taux_Standard),
        actif: String(r.Actif) !== "false",
        note: String(r.Note ?? "").trim(),
      }))
      .filter((t) => t.id && t.actif)
      .sort((a, b) => (b.dateEffet?.getTime() ?? 0) - (a.dateEffet?.getTime() ?? 0));
  } catch (e) {
    console.warn("lecture des taux de change impossible", e);
    return [];
  }
}

/** Le taux applicable à `quand` : on descend les enregistrements actifs du plus récent au
 *  plus ancien et on retient le premier qui donne quelque chose. */
export async function tauxApplicable(quand: Date = new Date()): Promise<TauxRetenu | null> {
  for (const t of await chargerTaux()) {
    const r = choisirTaux(t, quand);
    if (r) return r;
  }
  return null;
}

export const LIBELLE_NIVEAU: Record<NiveauTaux, string> = {
  jour: "taux du jour",
  semaine: "taux de la semaine",
  mois: "taux du mois",
  standard: "taux standard",
};
