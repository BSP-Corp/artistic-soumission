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
  /** Rang dans la gamme, de 10 (soie) à 160 (emballage). Donne l'ordre d'affichage. */
  ordre: number | null;
  categorieMachine: string;
  /** « serigraphie », « numerique », « platine », « zund », « adhesif_rouleau »,
   *  « adhesif_feuille », « toujours » ou « manuel ». Dit à quelles jobs l'opération
   *  s'applique — voir `gammeDuBon`. */
  regle: string;
  pointable: boolean;
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
  /** Les cinq temps estimés que porte le bon, en minutes, rangés par code d'opération.
   *  Les onze autres opérations de la gamme n'ont pas d'estimation : elles restent
   *  déclarables, simplement sans rien à quoi se comparer. */
  prevuMin: Record<string, number>;
}

/** Quels temps du bon de travail alimentent quelle opération. Même correspondance que
 *  `TEMPS_VERS_OPERATION` dans bonTravailService : une seule vérité, deux lectures. */
const PREVU_PAR_CODE: [string, string][] = [
  ["SOIE", "Temps_Soies_Min"],
  ["IMPR", "Temps_Impression_Min"],
  ["NUM", "Temps_Numerique_Min"],
  ["DEC_PLAT", "Temps_Decoupe_Min"],
  ["DEC_ZUND", "Temps_Zund_Min"],
];
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
      // Creator ne nomme pas toujours le champ pareil selon qu'il a été créé à la main ou
      // importé : on essaie les trois orthographes plutôt que d'en supposer une.
      regle: String(r.Regle_de_declenchement ?? r.Regle_declenchement ?? r.Regle ?? "").trim().toLowerCase(),
      pointable: String(r.Pointable) !== "false",
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
      prevuMin: Object.fromEntries(
        PREVU_PAR_CODE.map(([code, champ]) => [code, num(r[champ]) ?? 0]).filter(([, v]) => (v as number) > 0),
      ) as Record<string, number>,
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

/** Ce qu'une job a réellement à faire, dans l'ordre de la gamme.
 *
 *  `Operations_Liste` porte une règle de déclenchement par opération. Quatre d'entre elles se
 *  déduisent des temps estimés que le bon porte déjà : un temps d'impression veut dire que la
 *  job est en sérigraphie, un temps Zünd qu'elle passe au Zünd. Les opérations « toujours »
 *  (contrôle qualité, emballage) valent pour toutes les jobs. Les autres — laminage, régistre,
 *  et tout ce qui est « manuel » — ne se devinent pas : l'opérateur les ajoute quand il les fait.
 *
 *  Une opération déjà pointée est toujours incluse, même si la règle ne l'aurait pas prévue :
 *  ce qui a été déclaré ne doit jamais disparaître de l'écran. */
export function gammeDuBon(
  bon: BonRef,
  operations: Operation[],
  pointages: Pointage[] = [],
): { operation: Operation; prevuMin: number }[] {
  const prevu = bon.prevuMin;
  const regles = new Set<string>(["toujours"]);
  if ((prevu.IMPR ?? 0) > 0 || (prevu.SOIE ?? 0) > 0) regles.add("serigraphie");
  if ((prevu.NUM ?? 0) > 0) regles.add("numerique");
  if ((prevu.DEC_PLAT ?? 0) > 0) regles.add("platine");
  if ((prevu.DEC_ZUND ?? 0) > 0) regles.add("zund");

  const dejaPointees = new Set(pointages.filter((p) => p.btId === bon.id).map((p) => p.operationId));

  return operations
    .filter((o) => o.actif && o.pointable)
    .filter((o) => regles.has(o.regle) || dejaPointees.has(o.id))
    .map((o) => ({ operation: o, prevuMin: prevu[o.code] ?? 0 }))
    .sort((a, b) => (a.operation.ordre ?? 999) - (b.operation.ordre ?? 999));
}

/** Les opérations que l'opérateur peut ajouter à la main : celles que la gamme n'a pas
 *  déduites. Laminage, régistre, coins ronds, œillets… tout ce qui dépend de la job sans
 *  qu'aucun temps estimé ne le dise. */
export function operationsAjoutables(
  bon: BonRef,
  operations: Operation[],
  pointages: Pointage[] = [],
): Operation[] {
  const deja = new Set(gammeDuBon(bon, operations, pointages).map((g) => g.operation.id));
  return operations.filter((o) => o.actif && o.pointable && !deja.has(o.id));
}

/** Le temps déclaré sur une opération d'un bon, toutes personnes confondues. Les pointages
 *  en cours comptent leur temps écoulé, ceux qui sont terminés leur durée réelle. */
export function reelMin(
  bonId: string,
  operationId: string,
  pointages: Pointage[],
  maintenant: Date,
): number {
  return pointages
    .filter((p) => p.btId === bonId && p.operationId === operationId)
    .reduce((somme, p) => somme + minutesEcoulees(p, maintenant), 0);
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

/** Une durée posée : « 52 min », « 2 h 51 ». Sans les secondes, qui n'ont de sens que sur
 *  un chrono qui tourne — `dureeLisible` reste là pour celui-là. */
export function dureeCourte(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  const m = Math.round(minutes);
  if (m < 60) return m + " min";
  return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
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

// ── jeu d'exemple, hors Creator ─────────────────────────────────────────────
// Le widget ne sert à rien hors de Creator : les rapports ne répondent pas et l'écran reste
// vide. Plutôt qu'un écran mort, on montre une demi-journée d'atelier plausible, clairement
// annoncée comme telle. Ça permet de regarder l'écran sans toucher aux données réelles —
// pour une démonstration, une relecture, ou simplement travailler la mise en page.
//
// Les opérations sont celles de la vraie gamme (codes, ordre et règles d'`Operations_Liste`).
// Les clients et les bons sont inventés.

const OPS_EXEMPLE: [string, string, string, number, string][] = [
  ["SOIE", "Fabrication des écrans (soie)", "Soie", 10, "serigraphie"],
  ["COLOR", "Préparation des encres (coloriste)", "Coloriste", 20, "serigraphie"],
  ["IMPR", "Impression sérigraphie", "Impression", 30, "serigraphie"],
  ["NUM", "Impression numérique", "Impression", 40, "numerique"],
  ["LAM", "Laminage", "Laminage", 50, "adhesif_rouleau"],
  ["REG", "Régistre (adhésif en feuille)", "Préparation", 60, "adhesif_feuille"],
  ["DEC_PLAT", "Découpe platine", "Découpe", 70, "platine"],
  ["DEC_ZUND", "Découpe Zünd", "Découpe", 80, "zund"],
  ["DECORT", "Décorticage", "Finition", 90, "manuel"],
  ["COINS", "Coins ronds", "Finition", 100, "manuel"],
  ["SLIT", "Slitting", "Finition", 110, "manuel"],
  ["GUILL", "Guillotine", "Finition", 120, "manuel"],
  ["OEIL", "Œillets", "Finition", 130, "manuel"],
  ["ASSEMB", "Assemblage", "Finition", 140, "manuel"],
  ["QC", "Contrôle qualité", "QC", 150, "toujours"],
  ["EMB", "Emballage", "Expédition", 160, "toujours"],
];

const EQUIPE_EXEMPLE: [string, string][] = [
  ["Phillipe", "Impression"],
  ["Roberto", "Découpe"],
  ["Jose", "Finition"],
  ["Marc-André", "Soie"],
  ["Sylvie", "Expédition"],
];

export function referentielsExemple(): Referentiels {
  const operations: Operation[] = OPS_EXEMPLE.map(([code, nom, departement, ordre, regle], i) => ({
    id: "op" + i,
    code,
    nom,
    departement,
    ordre,
    categorieMachine: "",
    regle,
    pointable: true,
    actif: true,
  }));
  return {
    operations,
    ressources: EQUIPE_EXEMPLE.map(([nom, departement], i) => ({ id: "r" + i, nom, departement })),
    machines: [],
    bons: [
      {
        id: "b1", noBT: "BT-1042", client: "Groupe Delmar",
        modele: "Panneau Lexan 7 × 1,4", noPiece: "4152464", statut: "En production",
        prevuMin: { SOIE: 32, IMPR: 158, DEC_PLAT: 52 },
      },
      {
        id: "b2", noBT: "BT-1041", client: "Ateliers Rivard",
        modele: "Plaque signalétique alu", noPiece: "88120", statut: "En production",
        prevuMin: { SOIE: 28, IMPR: 95, DEC_ZUND: 70 },
      },
      {
        id: "b3", noBT: "BT-1039", client: "Norbec Industries",
        modele: "Étiquettes polyester", noPiece: "55566", statut: "En production",
        prevuMin: { NUM: 64, DEC_ZUND: 45 },
      },
    ],
    departements: [...new Set(OPS_EXEMPLE.map((o) => o[2]))].map((nom, i) => ({ id: "d" + i, nom })),
    roles: [{ id: "role1", nom: "Opérateur" }],
    organisationId: "org-exemple",
  };
}

export function pointagesExemple(ref: Referentiels): Pointage[] {
  const op = (code: string) => ref.operations.find((o) => o.code === code);
  const qui = (n: number) => ref.ressources[n];
  const ilYA = (min: number) => new Date(Date.now() - min * 60000);

  const fait = (
    id: string, bon: { id: string; noBT: string }, code: string, n: number, duree: number,
  ): Pointage[] => {
    const o = op(code);
    const r = qui(n);
    if (!o || !r) return [];
    return [{
      id, btId: bon.id, btNo: bon.noBT, operationId: o.id, operationNom: o.nom,
      ressourceId: r.id, ressourceNom: r.nom, machineNom: "", statut: "Termine",
      punchIn: ilYA(duree + 90), punchOut: ilYA(90), pauseDebut: null,
      pauseCumuleeMin: 0, dureeReelleMin: duree, commentaire: "",
    }];
  };
  const encours = (
    id: string, bon: { id: string; noBT: string }, code: string, n: number, depuis: number,
  ): Pointage[] => {
    const o = op(code);
    const r = qui(n);
    if (!o || !r) return [];
    return [{
      id, btId: bon.id, btNo: bon.noBT, operationId: o.id, operationNom: o.nom,
      ressourceId: r.id, ressourceNom: r.nom, machineNom: "", statut: "En cours",
      punchIn: ilYA(depuis), punchOut: null, pauseDebut: null,
      pauseCumuleeMin: 0, dureeReelleMin: null, commentaire: "",
    }];
  };

  const [b1, b2, b3] = ref.bons;
  return [
    ...fait("p1", b1, "SOIE", 3, 35),
    ...fait("p2", b1, "COLOR", 0, 22),
    ...encours("p3", b1, "IMPR", 0, 171),
    ...fait("p4", b2, "SOIE", 3, 26),
    ...encours("p5", b2, "COLOR", 2, 14),
    ...fait("p6", b3, "NUM", 1, 58),
  ];
}

