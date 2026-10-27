// Base de couleurs Artistic (handoff du 28 sept. §11) — lecture seule depuis Creator.
//
// Le bon de travail y puise la colonne COULEURS : au lieu d'un texte libre, le chargé de projet
// choisit un `Code_Artistic` du catalogue et le PMS s'affiche tout seul. Les couleurs sont une
// INSTRUCTION DE PRODUCTION : elles n'entrent dans aucune formule, le prix ne les connaît pas
// (la soumission ne compte que le NOMBRE de couleurs visibles).
//
// Si le formulaire est absent ou vide, la fonction renvoie null et le widget garde la saisie
// libre d'avant. Aucun blocage.

import { isZohoEnv } from "./zohoService";

// Creator suffixe le nom technique quand il entre en collision avec un nom déjà pris : le
// formulaire « Couleurs » a donné `Couleurs1` et son rapport `Couleurs_Report1`. Plutôt que
// d'imposer un renommage (souvent impossible après coup), on essaie les variantes connues et
// on retient celle qui répond.
export const RAPPORTS_COULEURS = ["Couleurs_Report", "Couleurs_Report1", "Couleurs1_Report", "couleurs_Report"];

export interface Couleur {
  id: string;
  /** code interne Artistic — la clé (ex. B-4, R-12, G-500) */
  code: string;
  /** numéro Pantone, ou « COLOR MATCH » */
  pms: string;
  /** cartable / classeur physique (Bleu #1, Rouge #1…) */
  cartable: string;
  type: string;
  commentaires: string;
  /** Active = utilisable · Demandée = en attente du directeur de production */
  statut: string;
  actif: boolean;
}

const txt = (v: unknown) => String(v ?? "").trim();
const vrai = (v: unknown) => v === true || v === 1 || v === "true" || v === "1" || v === "Oui" || v === "oui";

/** Lit un rapport page par page ; lève si le nom n'existe pas. */
async function lireRapport(rapport: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 30; page++) {
    const cfg: Parameters<typeof ZOHO.CREATOR.DATA.getRecords>[0] = {
      report_name: rapport,
      max_records: 200,
      field_config: "all",
    };
    if (cursor) cfg.record_cursor = cursor;
    const res = (await ZOHO.CREATOR.DATA.getRecords(cfg)) as {
      code: number;
      data?: Record<string, unknown>[];
      record_cursor?: string;
    };
    if (res.code !== 3000 || !res.data?.length) break;
    out.push(...res.data);
    cursor = res.record_cursor;
    if (!cursor || res.data.length < 200) break;
  }
  return out;
}

/** Catalogue complet des couleurs. null = hors Zoho, formulaire absent ou vide → le widget
 *  retombe sur la saisie libre d'avant. */
export async function chargerCouleurs(): Promise<Couleur[] | null> {
  if (!isZohoEnv()) return null;
  try {
    let out: Record<string, unknown>[] = [];
    for (const rapport of RAPPORTS_COULEURS) {
      try {
        out = await lireRapport(rapport);
      } catch {
        continue; // ce nom-là n'existe pas : on essaie le suivant
      }
      if (out.length) break;
    }
    if (!out.length) return null;
    return out
      .map((r) => ({
        id: txt(r.ID),
        code: txt(r.Code_Artistic),
        pms: txt(r.PMS),
        cartable: txt(r.Cartable),
        type: txt(r.Type),
        commentaires: txt(r.Commentaires),
        statut: txt(r.Statut) || "Active",
        actif: r.Actif === undefined ? true : vrai(r.Actif),
      }))
      .filter((c) => c.code);
  } catch (e) {
    console.warn("chargerCouleurs (formulaire Couleurs absent ?) :", e);
    return null;
  }
}

/** Ce qui est proposé dans la liste : actif ET actif au sens du statut (11b). */
export function couleursSelectionnables(liste: Couleur[]): Couleur[] {
  return liste.filter((c) => c.actif && /^actif|^active/i.test(c.statut));
}

/** Index code (sans casse ni espaces) → couleur, pour retrouver le PMS à l'affichage. */
export function indexParCode(liste: Couleur[]): Map<string, Couleur> {
  const m = new Map<string, Couleur>();
  for (const c of liste) m.set(c.code.toUpperCase().replace(/\s+/g, ""), c);
  return m;
}

export function trouverCouleur(index: Map<string, Couleur>, saisie: unknown): Couleur | null {
  const t = txt(saisie).toUpperCase().replace(/\s+/g, "");
  return t ? (index.get(t) ?? null) : null;
}
