// Déclaration des temps — intégration Creator.
//
// PRINCIPE : le widget n'horodate RIEN et ne calcule aucune durée. Il envoie un changement
// de statut, et le workflow « Pointage -Success » pose les heures et calcule les durées côté
// serveur. Deux raisons : les tablettes d'atelier n'ont pas toutes la même heure, et une
// durée calculée dans le navigateur serait modifiable par celui qui la déclare. Le chrono
// affiché ici n'est qu'un reflet, jamais une source.
//
// ATTENTION — un rapport Creator n'expose que les colonnes qu'on lui a configurées. Les
// rapports créés en même temps qu'un formulaire vide n'exposent QUE l'ID : les champs
// ajoutés ensuite n'y entrent pas tout seuls, et le widget lit alors des enregistrements
// vides sans la moindre erreur. Voir `ops-config-colonnes.js` côté outillage.

import { isZohoEnv } from "./zohoService";

// Le formulaire `Pointage` d'origine est abandonné : AUCUN rapport exposant des colonnes ne
// pouvait en être lu (erreur 500), à cause de son lookup `Ressource` affiché par `[Name]` —
// un champ « nom complet » composite, que le moteur de rendu des rapports ne sait pas
// projeter. `Pointage_Atelier` est identique mais affiche `[Nom_affichage]`, un texte simple.
export const FORM_POINTAGE = "Pointage_Atelier";
// `Pointage_Report` et `All_Operations` sont nés en même temps que des formulaires VIDES :
// ils n'exposent que l'ID, et les champs ajoutés ensuite n'y sont jamais entrés. La boîte
// « Configurer les champs » s'ouvre depuis l'en-tête d'une colonne — impossible quand il n'y
// en a aucune. Ces rapports-ci ont été créés APRÈS les champs : ils les exposent tous.
export const REPORT_POINTAGE = "Pointage_Atelier_Vue";
export const REPORT_OPERATIONS = "Operations_Liste";
export const FORM_RESSOURCES = "Ressources";
export const REPORT_RESSOURCES = "Ressources_Report";
export const REPORT_MACHINES = "Fiche_Machine_Report";
export const REPORT_BT = "bon_travail_Report";
export const REPORT_DEPARTEMENTS = "Departement_Report";
export const REPORT_ROLES = "Role_Report";

export type StatutPointage = "En cours" | "En pause" | "Termine";

export interface Operation {
  id: string;
  code: string;
  nom: string;
  departement: string;
  ordre: number | null;
  categorieMachine: string;
  actif: boolean;
}
export interface Ressource {
  id: string;
  nom: string;
  departement: string;
}
export interface MachineRef {
  id: string;
  nom: string;
}
export interface BonRef {
  id: string;
  noBT: string;
  client: string;
  modele: string;
  noPiece: string;
  statut: string;
}
export interface Referentiel {
  id: string;
  nom: string;
}
export interface Pointage {
  id: string;
  btId: string;
  btNo: string;
  operationId: string;
  operationNom: string;
  ressourceId: string;
  ressourceNom: string;
  machineNom: string;
  statut: StatutPointage | "";
  punchIn: Date | null;
  punchOut: Date | null;
  pauseDebut: Date | null;
  pauseCumuleeMin: number;
  dureeReelleMin: number | null;
  commentaire: string;
}

/** Un lookup revient soit en objet { ID, zc_display_value }, soit en simple chaîne. */
function lookup(v: unknown): { id: string; libelle: string } {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return {
      id: String(o.ID ?? ""),
      libelle: String(o.zc_display_value ?? o.display_value ?? o.Name ?? "").trim(),
    };
  }
  const s = String(v ?? "").trim();
  return { id: /^\d{10,}$/.test(s) ? s : "", libelle: /^\d{10,}$/.test(s) ? "" : s };
}

/** Un champ « Nom complet » Creator revient en objet { first_name, last_name, … }. */
function nomComplet(v: unknown): string {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const direct = String(o.zc_display_value ?? "").trim();
    if (direct) return direct;
    return [o.first_name, o.last_name].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ");
  }
  return String(v ?? "").trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
}

const MOIS: Record<string, number> = {
  jan: 0, feb: 1, fev: 1, mar: 2, apr: 3, avr: 3, may: 4, mai: 4, jun: 5, juin: 5,
  jul: 6, juil: 6, aug: 7, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** « 19-Oct-2026 07:09:18 » → Date. Le format vient de `date_format` du formulaire
 *  (dd-MMM-yyyy) ; les abréviations peuvent être anglaises ou françaises selon la langue
 *  de l'utilisateur, d'où la table ci-dessus. Renvoie null plutôt que NaN : un chrono qui
 *  affiche « NaN » est pire qu'un chrono absent. */
export function dateCreator(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})-([A-Za-zéû.]+)-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const cle = m[2].toLowerCase().replace(/\./g, "").slice(0, 4);
  const mois = MOIS[cle] ?? MOIS[cle.slice(0, 3)];
  if (mois === undefined) return null;
  const d = new Date(Number(m[3]), mois, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

type Reponse = { code: number; data?: Record<string, unknown>[]; record_cursor?: string };

async function toutesLignes(report: string, criteria?: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let toutChamps = true;
  for (let page = 0; page < 20; page++) {
    const cfg: Parameters<typeof ZOHO.CREATOR.DATA.getRecords>[0] = { report_name: report, max_records: 200 };
    if (toutChamps) cfg.field_config = "all";
    if (criteria) cfg.criteria = criteria;
    if (cursor) cfg.record_cursor = cursor;
    let res: Reponse;
    try {
      res = (await ZOHO.CREATOR.DATA.getRecords(cfg)) as Reponse;
    } catch (e) {
      if (!toutChamps) {
        // 9220 = « aucun enregistrement » : ce n'est pas une panne, c'est une liste vide.
        if (String((e as { code?: unknown })?.code ?? "") === "9220") return out;
        throw e;
      }
      toutChamps = false;
      page--;
      continue;
    }
    if (res.code !== 3000 || !res.data?.length) break;
    out.push(...res.data);
    cursor = res.record_cursor;
    if (!cursor || res.data.length < 200) break;
  }
  return out;
}

async function lignesSures(report: string, criteria?: string): Promise<Record<string, unknown>[]> {
  try {
    return await toutesLignes(report, criteria);
  } catch (e) {
    console.warn(`lecture de ${report} impossible`, e);
    return [];
  }
}

export interface Referentiels {
  operations: Operation[];
  ressources: Ressource[];
  machines: MachineRef[];
  bons: BonRef[];
  departements: Referentiel[];
  roles: Referentiel[];
  organisationId: string;
}

export async function chargerReferentiels(): Promise<Referentiels | null> {
  if (!isZohoEnv()) return null;
  const [ops, res, mach, bts, deps, roles, orgs] = await Promise.all([
    lignesSures(REPORT_OPERATIONS),
    lignesSures(REPORT_RESSOURCES),
    lignesSures(REPORT_MACHINES),
    lignesSures(REPORT_BT),
    lignesSures(REPORT_DEPARTEMENTS),
    lignesSures(REPORT_ROLES),
    lignesSures("Organization_Report"),
  ]);

  const operations: Operation[] = ops
    .map((r) => ({
      id: String(r.ID ?? ""),
      code: String(r.Code ?? "").trim(),
      nom: String(r.Nom ?? "").trim(),
      departement: lookup(r.Departement).libelle,
      ordre: num(r.Ordre),
      categorieMachine: String(r.Categorie_machine ?? "").trim(),
      actif: String(r.Actif) !== "false",
    }))
    .filter((o) => o.id)
    .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999) || a.nom.localeCompare(b.nom, "fr"));

  const ressources: Ressource[] = res
    .map((r) => ({
      id: String(r.ID ?? ""),
      nom: String(r.Nom_affichage ?? "").trim() || nomComplet(r.Name),
      departement: lookup(r.Departement).libelle,
    }))
    .filter((r) => r.id)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const machines: MachineRef[] = mach
    .map((r) => ({ id: String(r.ID ?? ""), nom: String(r.Nom_machine ?? r.Name ?? "").trim() }))
    .filter((m) => m.id && m.nom)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const bons: BonRef[] = bts
    .map((r) => ({
      id: String(r.ID ?? ""),
      noBT: String(r.No_BT ?? "").trim(),
      client: String(r.Client ?? "").trim(),
      modele: String(r.Modele ?? "").trim(),
      noPiece: String(r.No_Piece ?? "").trim(),
      statut: String(r.Statut ?? "").trim(),
    }))
    .filter((b) => b.id && b.noBT)
    .sort((a, b) => b.noBT.localeCompare(a.noBT, "fr", { numeric: true }));

  // Les référentiels ne nomment pas tous leur libellé pareil : `Departement` utilise `Name`,
  // `Role` utilise `Label`. Lire `Name` seul renvoyait une liste vide, et le widget disait
  // « aucun rôle défini » alors que les deux rôles existaient bel et bien.
  const ref = (rows: Record<string, unknown>[]): Referentiel[] =>
    rows
      .map((r) => ({ id: String(r.ID ?? ""), nom: nomComplet(r.Label ?? r.Name ?? r.Nom) }))
      .filter((x) => x.id && x.nom)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return {
    operations,
    ressources,
    machines,
    bons,
    departements: ref(deps),
    roles: ref(roles),
    organisationId: String(orgs[0]?.ID ?? ""),
  };
}

export async function chargerPointages(): Promise<Pointage[]> {
  if (!isZohoEnv()) return [];
  const lignes = await lignesSures(REPORT_POINTAGE);
  return lignes
    .map((r) => {
      const bt = lookup(r.Bon_de_travail);
      const op = lookup(r.Operation);
      const rs = lookup(r.Ressource);
      return {
        id: String(r.ID ?? ""),
        btId: bt.id,
        btNo: bt.libelle,
        operationId: op.id,
        operationNom: op.libelle,
        ressourceId: rs.id,
        ressourceNom: rs.libelle,
        machineNom: lookup(r.Machine).libelle,
        statut: String(r.Statut ?? "") as StatutPointage | "",
        punchIn: dateCreator(r.Punch_in),
        punchOut: dateCreator(r.Punch_out),
        pauseDebut: dateCreator(r.Pause_debut),
        pauseCumuleeMin: num(r.Pause_cumulee_min) ?? 0,
        dureeReelleMin: num(r.Duree_reelle_min),
        commentaire: String(r.Commentaire ?? "").trim(),
      };
    })
    .filter((p) => p.id);
}

export interface NouveauPointage {
  btId: string;
  operationId: string;
  ressourceId: string;
  machineId?: string;
  commentaire?: string;
}

export async function demarrerPointage(p: NouveauPointage): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!isZohoEnv()) return { ok: false, message: "Hors Zoho — rien n'a été enregistré." };
  const data: Record<string, unknown> = {
    Bon_de_travail: p.btId,
    Operation: p.operationId,
    Statut: "En cours",
  };
  if (p.ressourceId) data.Ressource = p.ressourceId;
  if (p.machineId) data.Machine = p.machineId;
  if (p.commentaire) data.Commentaire = p.commentaire;
  try {
    const res = await ZOHO.CREATOR.DATA.addRecords({ form_name: FORM_POINTAGE, payload: { data } });
    if (res.code === 3000) return { ok: true, message: "Pointage démarré.", id: String(res.data.ID) };
    return { ok: false, message: `Réponse Zoho inattendue (code ${res.code}).` };
  } catch (e) {
    return { ok: false, message: "Erreur : " + String((e as Error)?.message ?? e) };
  }
}

/** Seul écrit le statut : les heures et les durées sont posées par le workflow. */
export async function changerStatut(id: string, statut: StatutPointage): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: false, message: "Hors Zoho — rien n'a été enregistré." };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_POINTAGE,
      id,
      payload: { data: { Statut: statut } },
    });
    if (res.code === 3000) return { ok: true, message: "Statut mis à jour." };
    return { ok: false, message: `Réponse Zoho inattendue (code ${res.code}).` };
  } catch (e) {
    return { ok: false, message: "Erreur : " + String((e as Error)?.message ?? e) };
  }
}

/** Crée un opérateur. Organisation, département et rôle sont obligatoires sur le
 *  formulaire Ressources : sans eux Creator refuse l'enregistrement. */
export async function creerRessource(v: {
  prenom: string;
  nom: string;
  departementId: string;
  roleId: string;
  organisationId: string;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!isZohoEnv()) return { ok: false, message: "Hors Zoho — rien n'a été enregistré." };
  try {
    const res = await ZOHO.CREATOR.DATA.addRecords({
      form_name: FORM_RESSOURCES,
      payload: {
        data: {
          Name: { first_name: v.prenom, last_name: v.nom },
          // Libellé texte, indispensable : c'est lui que le lookup du pointage affiche.
          // Afficher le champ composé `Name` depuis un lookup fait tomber tout rapport
          // qui expose cette colonne (erreur 500 côté Creator).
          Nom_affichage: `${v.prenom} ${v.nom}`.trim(),
          Departement: v.departementId,
          Role: v.roleId,
          Organization: v.organisationId,
          Active: true,
        },
      },
    });
    if (res.code === 3000) return { ok: true, message: "Opérateur ajouté.", id: String(res.data.ID) };
    return { ok: false, message: `Réponse Zoho inattendue (code ${res.code}).` };
  } catch (e) {
    return { ok: false, message: "Erreur : " + String((e as Error)?.message ?? e) };
  }
}

/** Minutes écoulées d'un pointage, telles qu'on les AFFICHE. Le chiffre qui fera foi est
 *  celui que le workflow écrira au « Terminé » — celui-ci n'est qu'un reflet pour l'écran. */
export function minutesEcoulees(p: Pointage, maintenant: Date): number {
  if (p.dureeReelleMin !== null && p.statut === "Termine") return p.dureeReelleMin;
  if (!p.punchIn) return 0;
  const fin = p.punchOut ?? maintenant;
  let pause = p.pauseCumuleeMin;
  if (p.pauseDebut) pause += (maintenant.getTime() - p.pauseDebut.getTime()) / 60000;
  return Math.max(0, (fin.getTime() - p.punchIn.getTime()) / 60000 - pause);
}

/** 95,4 min → « 1 h 35 ». Sous l'heure on reste en minutes et secondes, parce qu'un
 *  opérateur qui vient de pointer veut voir le chrono bouger. */
export function dureeLisible(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) {
    const m = Math.floor(minutes);
    const s = Math.floor((minutes - m) * 60);
    return `${m} min ${String(s).padStart(2, "0")} s`;
  }
  const h = Math.floor(minutes / 60);
  return `${h} h ${String(Math.round(minutes - h * 60)).padStart(2, "0")}`;
}

export function heureLisible(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function estAujourdhui(d: Date | null): boolean {
  if (!d) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
