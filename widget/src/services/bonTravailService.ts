// Intégration Creator du bon de travail (feuille FT du classeur).
//
// Principe : le bon NE RECOPIE PAS les valeurs calculées. Il conserve
//   · `Donnees_Soum` = le JSON des entrées de la soumission (cellule → valeur)
//   · `Donnees_BT`   = le JSON des saisies atelier (cellules FT jaunes)
//
// ATTENTION — un rapport Creator n'expose que les colonnes qu'on lui a configurées, et
// `bon_travail_Report` n'expose PAS `Donnees_Soum` (ni `Soumission_ID`, ni `No_Piece`).
// Le widget écrivait donc une donnée qu'il ne pouvait pas relire : à la réouverture d'un bon,
// tous les champs bleus restaient vides. `field_config: "all"` ne lève pas la limite dans le
// SDK déployé. Plutôt que de dépendre d'une case à cocher dans la configuration du rapport,
// on range MAINTENANT les deux JSON dans `Donnees_BT`, qui est exposée — voir `ENVELOPPE`.
// et le widget rejoue le moteur pour recalculer toutes les cellules FL bleues.
// Les colonnes « plates » (Client, Temps_*, Qte_*…) sont écrites EN PLUS, uniquement pour
// que le rapport Creator soit lisible / filtrable / imprimable sans ouvrir le widget.

import { isZohoEnv } from "./zohoService";

// Noms de liens RÉELS relevés dans l'app groupecanva/artisticerp le 2026-09-08 (via MCP) :
// le formulaire et le rapport sont en minuscules.
export const FORM_BON_TRAVAIL = "bon_travail";
export const REPORT_BON_TRAVAIL = "bon_travail_Report";

export type StatutBT = "Brouillon" | "Valide" | "En_production" | "Termine";

/** Colonnes plates du formulaire Bon_Travail (noms de liens Creator). */
export interface ChampsPlatsBT {
  Soumission_ID: string; // « Une seule ligne » : un ID Creator fait 19 chiffres
  Statut: StatutBT;
  Commande_Le: string; // format Creator dd-MMM-yyyy (voir dateCreator)
  Date_Requise: string; // format Creator dd-MMM-yyyy
  No_Client: string;
  Client: string;
  Modele: string;
  No_Piece: string;
  Autre: string;
  No_Soum: string;
  Code_RB: string;
  Code: number | null; // champ Nombre dans l'app
  Code_M: string;
  Code_R: string;
  Code_E: string;
  PO: string;
  No_Presse: string;
  No_Cadre: string;
  Surplus: string;
  Nb_Up: number;
  Format_X: number;
  Format_Y: number;
  Dim_Mrx_X: number;
  Dim_Mrx_Y: number;
  Qte_Commandee: number;
  Protection_Pct: number;
  Qte_Produite: number;
  Qte_Maximum: number;
  Nbre_Mrcx_Feuille: number;
  Nbre_Feuilles: number;
  Feuilles_Corr: number; // champ Nombre (entier) dans l'app
  Mx_A_Impr: number;
  Temps_Numerique_Min: number;
  Temps_Zund_Min: number;
  Temps_Soies_Min: number;
  Temps_Impression_Min: number;
  Temps_Decoupe_Min: number;
  Instructions: string;
  Procedure: string;
}

export interface BonTravail extends Partial<ChampsPlatsBT> {
  id: string;
  no_bt: string;
  /** JSON des entrées de la soumission d'origine */
  donnees_soum: string;
  /** JSON des saisies atelier (cellules FT) */
  donnees_bt: string;
}

function txt(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}
function nb(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : 0;
}

/** Arrondi à 4 décimales — les champs Décimale de Creator rejettent au-delà (piège connu). */
export function d4(v: number): number {
  return Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0;
}
/** Entier — pour les champs Nombre. */
export function ent(v: number): number {
  return Number.isFinite(v) ? Math.round(v) : 0;
}

const MOIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formate une saisie libre au format Date de l'app Creator (`dd-MMM-yyyy`).
 *  Accepte `2026-09-08`, `08/09/2026`, `8 sept 2026`, `08-Sep-2026`.
 *  Retourne "" si la date est illisible — le champ est alors OMIS du payload plutôt que
 *  de faire rejeter tout l'enregistrement par Creator. */
export function dateCreator(v: unknown): string {
  const t = String(v ?? "").trim();
  if (!t) return "";
  let a: number, m: number, j: number;
  let mm: RegExpMatchArray | null;
  if ((mm = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) {
    [a, m, j] = [+mm[1], +mm[2], +mm[3]];
  } else if ((mm = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) {
    [j, m, a] = [+mm[1], +mm[2], +mm[3]];
  } else if ((mm = t.match(/^(\d{1,2})[-/ ]([A-Za-zéûà.]{3,10})[-/ ](\d{4})$/))) {
    const p = mm[2].slice(0, 3).toLowerCase();
    const i = MOIS.findIndex((x) => x.toLowerCase() === p) >= 0
      ? MOIS.findIndex((x) => x.toLowerCase() === p)
      : ["jan", "fév", "mar", "avr", "mai", "jui", "jul", "aoû", "sep", "oct", "nov", "déc"].indexOf(p);
    if (i < 0) return "";
    [j, m, a] = [+mm[1], i + 1, +mm[3]];
  } else {
    return "";
  }
  if (m < 1 || m > 12 || j < 1 || j > 31) return "";
  return String(j).padStart(2, "0") + "-" + MOIS[m - 1] + "-" + a;
}

/** Nombre pour un champ Creator de type Nombre : null si la valeur n'est pas numérique
 *  (le champ sera omis du payload — `No_Piece` et `Code` sont typés Nombre dans l'app). */
export function nbOuNull(v: unknown): number | null {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Champs typés Date ou Nombre/Décimale dans l'app : Creator rejette l'enregistrement entier
 *  si on leur envoie une chaîne vide. On les omet plutôt (les champs texte gardent ""). */
const CHAMPS_NON_TEXTE = new Set([
  "Commande_Le",
  "Date_Requise",
  "Code",
  "Nb_Up",
  "Format_X",
  "Format_Y",
  "Dim_Mrx_X",
  "Dim_Mrx_Y",
  "Qte_Commandee",
  "Protection_Pct",
  "Qte_Produite",
  "Qte_Maximum",
  "Nbre_Mrcx_Feuille",
  "Nbre_Feuilles",
  "Feuilles_Corr",
  "Mx_A_Impr",
  "Temps_Numerique_Min",
  "Temps_Zund_Min",
  "Temps_Soies_Min",
  "Temps_Impression_Min",
  "Temps_Decoupe_Min",
]);

/** Retire les clés vides des champs Date/Nombre — un champ omis vaut mieux qu'un rejet global. */
export function nettoyerPayload(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const vide = v === null || v === undefined || v === "";
    if (vide && CHAMPS_NON_TEXTE.has(k)) continue;
    out[k] = vide ? "" : v;
  }
  return out;
}

/** Marqueur de l'enveloppe : `Donnees_BT` contient soit les saisies atelier à plat (bons
 *  d'avant le 28 sept. 2026), soit `{ v: 2, soum, bt, sid }` qui embarque aussi la soumission
 *  et le lien vers elle. Les deux formes se relisent, aucune conversion n'est nécessaire. */
const VERSION_ENVELOPPE = 2;

export function emballerDonnees(donneesSoum: string, donneesBT: string, soumissionId: string): string {
  return JSON.stringify({ v: VERSION_ENVELOPPE, sid: soumissionId, soum: donneesSoum, bt: donneesBT });
}

/** Rend { soum, bt, sid } quelle que soit la forme stockée. */
export function deballerDonnees(brut: string): { soum: string; bt: string; sid: string } {
  const t = String(brut ?? "").trim();
  if (!t) return { soum: "", bt: "", sid: "" };
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (o && typeof o === "object" && Number(o.v) >= 2) {
      return { soum: txt(o.soum), bt: txt(o.bt), sid: txt(o.sid) };
    }
  } catch {
    /* pas du JSON exploitable : traité comme l'ancien format */
  }
  return { soum: "", bt: t, sid: "" }; // ancien format : uniquement les saisies atelier
}

function versBon(r: Record<string, unknown>): BonTravail {
  // `Donnees_BT` est la seule des deux colonnes que le rapport expose : c'est elle qui porte
  // tout depuis le 28 sept. On garde la priorité à `Donnees_Soum` quand elle est bien là
  // (rapport correctement configuré, ou bon écrit avant l'enveloppe).
  const env = deballerDonnees(txt(r.Donnees_BT));
  return {
    id: txt(r.ID),
    no_bt: txt(r.No_BT),
    Soumission_ID: txt(r.Soumission_ID) || env.sid,
    Statut: (txt(r.Statut) || "Brouillon") as StatutBT,
    Commande_Le: txt(r.Commande_Le),
    Date_Requise: txt(r.Date_Requise),
    No_Client: txt(r.No_Client),
    Client: txt(r.Client),
    Modele: txt(r.Modele),
    No_Piece: txt(r.No_Piece),
    No_Soum: txt(r.No_Soum),
    Qte_Commandee: nb(r.Qte_Commandee),
    donnees_soum: txt(r.Donnees_Soum) || env.soum,
    donnees_bt: env.bt,
  };
}

/** Liste les bons de travail, plus récents d'abord. null hors Zoho. */
export async function chargerBonsTravail(): Promise<BonTravail[] | null> {
  if (!isZohoEnv()) return null;
  try {
    const out: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    let toutChamps = true;
    for (let page = 0; page < 20; page++) {
      const cfg: Parameters<typeof ZOHO.CREATOR.DATA.getRecords>[0] = {
        report_name: REPORT_BON_TRAVAIL,
        max_records: 200,
      };
      // On demande tous les champs du formulaire — le SDK déployé ne l'honore pas toujours,
      // d'où l'enveloppe dans Donnees_BT (voir en tête de fichier) ; quand il l'honore, on
      // récupère en prime Soumission_ID et No_Piece, absents des colonnes du rapport.
      if (toutChamps) cfg.field_config = "all";
      if (cursor) cfg.record_cursor = cursor;
      let res: { code: number; data?: Record<string, unknown>[]; record_cursor?: string };
      try {
        res = (await ZOHO.CREATOR.DATA.getRecords(cfg)) as typeof res;
      } catch (e) {
        if (!toutChamps) throw e;
        console.warn("chargerBonsTravail : field_config non supporté, repli sur les colonnes du rapport", e);
        toutChamps = false;
        page--;
        continue;
      }
      if (res.code !== 3000 || !res.data?.length) break;
      out.push(...res.data);
      cursor = res.record_cursor;
      if (!cursor || res.data.length < 200) break;
    }
    return out
      .map(versBon)
      .filter((b) => b.id)
      .sort((a, b) => (a.id < b.id ? 1 : -1));
  } catch (e) {
    console.warn("chargerBonsTravail:", e);
    return null;
  }
}

// ── numérotation des bons ───────────────────────────────────────────────────
// Le type « Numérotation automatique » de Creator est buggé sur cette app : on génère
// le numéro nous-mêmes. `No_BT` doit rester un champ « Une seule ligne » sans valeur
// initiale (idéalement coché Unique, ce qui fait détecter les collisions par Creator).

export const PREFIXE_BT = "BT-";
export const DEPART_BT = 1000;

/** Prochain numéro à partir des numéros existants. Ignore ce qui ne finit pas par des
 *  chiffres (`BT-TEST-MCP`). `BT-0001` compte pour 1, donc la série démarre bien à 1000. */
export function numeroSuivant(numeros: string[], prefixe = PREFIXE_BT, depart = DEPART_BT): string {
  let max = depart - 1;
  for (const n of numeros) {
    const m = /(\d+)\s*$/.exec(String(n ?? "").trim());
    if (!m) continue;
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > max) max = v;
  }
  return prefixe + String(max + 1).padStart(4, "0");
}

/** Lit les numéros déjà pris et renvoie le suivant. */
export async function prochainNoBT(): Promise<string> {
  const bons = await chargerBonsTravail();
  return numeroSuivant((bons ?? []).map((b) => b.no_bt));
}

/** Ligne de la grille « Temps par opération » d'un bon de travail. */
interface LigneTemps {
  Operation: string;
  Temps_prevu_min: number;
  Temps_reel_min: number;
  Ecart_min: number;
}

/** Les cinq temps estimés que porte le bon de travail, chacun vers son opération.
 *  Découpe platine et Zünd sont deux postes distincts : un bon qui a les deux reçoit les
 *  deux lignes. Les autres opérations (laminage, œillets, QC…) n'ont pas d'estimation sur le
 *  bon ; leurs pointages restent enregistrés, ils n'apparaissent simplement pas ici. */
const TEMPS_VERS_OPERATION: [string, keyof ChampsPlatsBT][] = [
  ["SOIE", "Temps_Soies_Min"],
  ["IMPR", "Temps_Impression_Min"],
  ["NUM", "Temps_Numerique_Min"],
  ["DEC_PLAT", "Temps_Decoupe_Min"],
  ["DEC_ZUND", "Temps_Zund_Min"],
];

async function semerTempsOperations(plats: ChampsPlatsBT): Promise<LigneTemps[]> {
  try {
    const res = await ZOHO.CREATOR.DATA.getRecords({
      report_name: "Operations_Liste",
      max_records: 200,
      field_config: "all",
    });
    const idParCode = new Map<string, string>();
    for (const o of res.data ?? []) {
      const code = String(o.Code ?? "").trim();
      if (code) idParCode.set(code, String(o.ID ?? ""));
    }
    if (!idParCode.size) {
      console.warn("semis Temps_par_operation : aucune opération lue — rien semé");
      return [];
    }
    return TEMPS_VERS_OPERATION.flatMap(([code, champ]) => {
      const n = Number(plats[champ]);
      const id = idParCode.get(code);
      if (!id || !Number.isFinite(n) || n <= 0) return [];
      const prevu = Math.round(n * 100) / 100;
      return [{ Operation: id, Temps_prevu_min: prevu, Temps_reel_min: 0, Ecart_min: -prevu }];
    });
  } catch (e) {
    // Un semis raté ne doit pas empêcher la création du bon : on le signale et on continue.
    console.warn("semis Temps_par_operation :", e);
    return [];
  }
}

/** Crée un bon de travail à partir d'une soumission validée.
 *  Le numéro est calculé juste avant l'écriture ; en cas de collision (deux postes qui
 *  valident en même temps et champ No_BT coché Unique), on renumérote et on réessaie. */
export async function creerBonTravail(rec: {
  plats: ChampsPlatsBT;
  donnees_soum: string;
  donnees_bt: string;
}): Promise<{ ok: boolean; message: string; id?: string; no_bt?: string }> {
  if (!isZohoEnv()) {
    console.info("[mock] bon de travail :", rec);
    return { ok: true, message: "Mode démo — bon de travail non enregistré (hors Zoho)." };
  }
  // Lignes « Temps par opération » semées À LA CRÉATION. Le pointage d'atelier ne sait que
  // METTRE À JOUR une ligne existante : Deluge ne peut pas en rattacher une à un bon déjà
  // créé (Creator refuse `.add()` sur la grille, faute de champ retour). Sans ce semis, le
  // temps réel déclaré n'aurait nulle part où se poser sur le bon.
  //
  // Lu via `Operations_Liste` et NON `All_Operations` : ce dernier est né en même temps qu'un
  // formulaire vide et n'expose QUE l'ID — la correspondance Code→ID y serait vide, aucune
  // ligne ne serait semée, et le `catch` plus bas n'en dirait rien.
  //
  // Hors de la boucle de réessai : les opérations ne changent pas d'une tentative à l'autre.
  const lignesTemps = await semerTempsOperations(rec.plats);

  let dernier = "";
  for (let essai = 0; essai < 3; essai++) {
    try {
      const no = await prochainNoBT();
      const data = nettoyerPayload({
        No_BT: no,
        ...rec.plats,
        Donnees_Soum: rec.donnees_soum,
        // l'enveloppe embarque la soumission : c'est la seule colonne que le rapport rend
        Donnees_BT: emballerDonnees(rec.donnees_soum, rec.donnees_bt, rec.plats.Soumission_ID ?? ""),
      });
      if (lignesTemps.length) data.Temps_par_operation = lignesTemps;
      const res = await ZOHO.CREATOR.DATA.addRecords({
        form_name: FORM_BON_TRAVAIL,
        payload: { data },
      });
      if (res.code === 3000) {
        return { ok: true, message: "Bon de travail " + no + " créé (ID " + res.data.ID + ").", id: String(res.data.ID), no_bt: no };
      }
      dernier = "code " + res.code + (res.message ? " — " + res.message : "");
      // collision de numéro (champ Unique) → on relit la liste et on réessaie
      if (!/No_BT/i.test(JSON.stringify(res))) break;
    } catch (e) {
      dernier = String((e as Error)?.message ?? e);
      break;
    }
  }
  return { ok: false, message: "Erreur de création : " + dernier };
}

/** Met à jour un bon existant (saisies atelier + colonnes plates recalculées). */
export async function sauvegarderBonTravail(
  id: string,
  champs: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) {
    console.info("[mock] maj bon de travail :", id, champs);
    return { ok: true, message: "Mode démo — modification non enregistrée (hors Zoho)." };
  }
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_BON_TRAVAIL,
      id,
      payload: { data: nettoyerPayload(champs) },
    });
    if (res.code === 3000) return { ok: true, message: "Bon de travail enregistré." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

/** Supprime un bon de travail. */
export async function supprimerBonTravail(id: string): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — rien à supprimer (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.deleteRecordById({ report_name: REPORT_BON_TRAVAIL, id });
    if (res.code === 3000) return { ok: true, message: "Bon de travail supprimé." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur de suppression : " + String((e as Error)?.message ?? e) };
  }
}
