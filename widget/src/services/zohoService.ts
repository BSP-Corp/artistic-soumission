// Intégration Zoho Creator (pattern BSP dual-service : zoho en prod, mock en dev navigateur).
// Le calcul est 100 % local (moteur embarqué) — Zoho ne sert qu'à sauvegarder la soumission
// et, plus tard, à alimenter la table Matériaux.

// Formulaire Creator de l'app groupecanva où sont enregistrées les soumissions.
// Noms de liens réels du formulaire (vérifiés dans le builder le 2026-07-15) :
//   Client, Mod_le, No_Pi_ce, Quantit, Montant, Total, Prix_Unitaire, Donnees, S_W13…
export const FORM_SOUMISSIONS = "Form1";
import { regleDepuisCreator, type RegleMateriau } from "@/lib/reglesMateriaux";

export const REPORT_SOUMISSIONS = "Form1_Report";

let insideZohoPage = false;

export function isZohoEnv(): boolean {
  return typeof ZOHO !== "undefined" && !!ZOHO?.CREATOR?.DATA && insideZohoPage;
}

export async function initZohoEnv(): Promise<void> {
  if (typeof ZOHO === "undefined" || !ZOHO?.CREATOR?.UTIL) return;
  try {
    const params = await Promise.race([
      ZOHO.CREATOR.UTIL.getInitParams(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("init-timeout")), 2000)),
    ]);
    insideZohoPage = !!params?.loginUser;
  } catch {
    insideZohoPage = false;
  }
}

// ── Paramètres vivants (Materiaux + Taux_Calcul) ─────────────────────────────
// Liens des champs = codes colonnes Excel (BO=nom, BV=coût pi², CF/CH/CI=taux…).
export const REPORT_MATERIAUX = "Materiaux_Report";
export const REPORT_TAUX = "Taux_Calcul_Report";

export interface MateriauCreator {
  id: string;
  nom: string;
  categorie: string;
  coutPi2: number;
  format: string;
  actif: boolean;
  /** dernier cout d'achat (Product.Last_Cost), alimente par la reception d'une commande.
   *  Affiche a titre indicatif dans la soumission : ce n'est PAS lui qui sert au calcul.
   *  Le calcul utilise coutPi2 ($/pi2) ; un prix d'achat est au format d'achat (feuille,
   *  rouleau), et le convertir exige largeur x longueur, absentes de Product a ce jour. */
  dernierCout: number | null;
  /** date du dernier achat (Product.Last_Purchase), pour juger de la fraicheur du prix */
  dernierAchat: string;
}
export interface TauxCreator {
  id: string;
  code: string; // INV_<ligne> ou S_<cellule>
  section: string;
  libelle: string;
  valeur: number | null; // CF
  cadence: number | null; // CH
  temps: number | null; // CI
  actif: boolean;
}
export interface ParametresCreator {
  materiaux: MateriauCreator[];
  taux: TauxCreator[];
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
}

type ReponseRecords = { code: number; data?: Record<string, unknown>[]; record_cursor?: string };

/** Lit un rapport page par page. `field_config: "all"` demande TOUS les champs du formulaire,
 *  pas seulement les colonnes affichées : sinon un champ oublié dans la configuration du
 *  rapport revient vide côté widget, en silence (c'était le cas de Donnees_Soum / No_Piece /
 *  Soumission_ID sur bon_travail_Report). Si le SDK déployé ne connaît pas l'option, on
 *  retombe sur l'appel d'origine plutôt que de renvoyer une liste vide. */
async function toutesLignes(report: string, fields?: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let toutChamps = true;
  for (let page = 0; page < 20; page++) {
    const cfg: Parameters<typeof ZOHO.CREATOR.DATA.getRecords>[0] = { report_name: report, max_records: 200 };
    if (toutChamps) cfg.field_config = "all";
    if (fields) cfg.fields = fields;
    if (cursor) cfg.record_cursor = cursor;
    let res: ReponseRecords;
    try {
      res = (await ZOHO.CREATOR.DATA.getRecords(cfg)) as ReponseRecords;
    } catch (e) {
      if (!toutChamps) throw e;
      console.warn(`toutesLignes(${report}) : field_config non supporté, repli sur les colonnes du rapport`, e);
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

/** Matériaux depuis le catalogue Product (Est_materiau=1, champs Mat_*, lus via le rapport
 *  étendu). Retourne [] tant que la migration Materiaux→Product n'est pas faite — l'appelant
 *  retombe alors sur l'ancien formulaire Materiaux. */
/** « Lexan Clair » + 0,005 x 24 x 48 → « Lexan Clair ,005x24x48 ».
 *
 *  Le classeur nomme ses matériaux ainsi, et c'est sur ce libellé que repose toute la chaîne :
 *  la liste proposée à l'utilisateur, la clé de prix `prixParNom`, et `NOM_VERS_INV` qui
 *  retrouve la ligne du classeur à surcharger.
 *
 *  Depuis l'import de l'inventaire du 9 oct. 2026, `Name` ne porte plus que la description :
 *  dix produits s'appellent « Lexan Clair ». Sans les dimensions, ni l'utilisateur ni le moteur
 *  ne peuvent les distinguer. On recompose donc le libellé à partir des champs `Dim_*_po`.
 *
 *  L'épaisseur suit la convention du classeur : virgule, pas de zéro de tête, trois décimales
 *  au minimum (0,04 → « ,040 ») mais davantage si la valeur en demande (0,0037 → « ,0037 »). */
function nomAvecDimensions(nom: string, ep: unknown, larg: unknown, lon: unknown): string {
  const dim = (v: unknown): string => {
    const x = Number(v);
    return isFinite(x) && x > 0 ? String(x).replace(".", ",") : "";
  };
  const e = Number(ep);
  if (!isFinite(e) || e <= 0) return nom;
  let dec = String(e);
  dec = dec.startsWith("0.") ? dec.slice(2) : dec.replace(".", "");
  while (dec.length < 3) dec += "0";
  const l = dim(larg);
  const L = dim(lon);
  if (!l || !L) return nom;
  return `${nom} ,${dec}x${l}x${L}`;
}

async function materiauxDepuisProduct(): Promise<MateriauCreator[]> {
  try {
    const lignes = await toutesLignes(REPORT_PRODUITS_ETENDU);
    return lignes
      .filter((r) => num(r.Est_materiau) === 1)
      .map((r) => ({
        id: String(r.ID ?? ""),
        nom: nomAvecDimensions(String(r.Name ?? "").trim(), r.Dim_Epaisseur_po, r.Dim_Largeur_po, r.Dim_Longueur_po),
        categorie: String(r.Mat_Categorie ?? "").trim(),
        coutPi2: num(r.Mat_Cout_pi2) ?? 0,
        format: String(r.Mat_Format ?? "").trim(),
        actif: String(r.Active) !== "false",
        dernierCout: num(r.Last_Cost),
        dernierAchat: String(r.Last_Purchase ?? "").trim(),
      }))
      .filter((m) => m.nom);
  } catch (e) {
    console.warn("materiauxDepuisProduct:", e);
    return [];
  }
}

/** Charge matériaux + taux depuis Creator. null hors Zoho ou en cas d'échec (→ snapshot embarqué).
 *  Matériaux : Product (catalogue) en priorité, ancien formulaire Materiaux en repli. */
export async function chargerParametres(): Promise<ParametresCreator | null> {
  if (!isZohoEnv()) return null;
  try {
    // Product est la SEULE source du catalogue matiere (centralisation 2026-10-01).
    // L'ancien formulaire Materiaux a ete verifie redondant : ses 57 lignes existent
    // toutes dans Product, et aucune n'y portait un prix que Product n'avait pas.
    // Le garder en repli entretenait un bug reel : la lecture venait de Product, mais
    // l'enregistrement d'un prix partait dans Materiaux — la correction n'avait donc
    // aucun effet visible. Voir sauvegarderMateriau() plus bas.
    const [materiaux, taux] = await Promise.all([materiauxDepuisProduct(), toutesLignes(REPORT_TAUX)]);
    return {
      materiaux,
      taux: taux
        .map((r) => ({
          id: String(r.ID ?? ""),
          code: String(r.Code ?? "").trim(),
          section: String(r.CE_Section ?? "").trim(),
          libelle: String(r.CG_Libelle ?? "").trim(),
          valeur: num(r.CF_Valeur),
          cadence: num(r.CH_Cadence),
          temps: num(r.CI_Temps),
          actif: num(r.Actif) !== 0,
        }))
        .filter((t) => t.code),
    };
  } catch (e) {
    console.warn("chargerParametres:", e);
    return null;
  }
}

/** Enregistre un taux/paramètre modifié dans le formulaire Taux_Calcul de Creator. */
export async function sauvegarderTaux(
  id: string,
  champs: { valeur?: number | null; cadence?: number | null; temps?: number | null },
): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — non enregistré dans Creator (hors Zoho)." };
  try {
    const data: Record<string, unknown> = {};
    if (champs.valeur !== undefined) data.CF_Valeur = champs.valeur;
    if (champs.cadence !== undefined) data.CH_Cadence = champs.cadence;
    if (champs.temps !== undefined) data.CI_Temps = champs.temps;
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_TAUX,
      id,
      payload: { data },
    });
    if (res.code === 3000) return { ok: true, message: "Taux enregistré dans Creator." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

/** Enregistre un prix matériau modifié dans le formulaire Materiaux de Creator. */
export async function sauvegarderMateriau(id: string, coutPi2: number): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — non enregistré dans Creator (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_PRODUITS_ETENDU,
      id,
      payload: { data: { Mat_Cout_pi2: coutPi2 } },
    });
    if (res.code === 3000) return { ok: true, message: "Prix matériau enregistré dans Creator." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

// ── Onglet Administration ────────────────────────────────────────────────────
// 4 formulaires mono-enregistrement (paramètres standards) + Fiche_Machine (catalogue).
export const REPORT_PARAMETRES_BASE = "Parametres_Base_Report";
export const REPORT_FOURNITURES = "Fournitures_Production_Report";
export const REPORT_TRANSPORT = "Transport_Report";
export const REPORT_AMORTISSEMENTS = "Amortissements_Report";
// Les machines vivent dans le formulaire dédié Fiche_Machine (décision client 2026-07-21 :
// Product = catalogue Zoho Inventory/Books, réservé aux produits/MATÉRIAUX — les fiches machine
// qui y avaient été migrées sont retirées). Le rapport Machines_Report (formulaire Product)
// reste utilisé, mais pour lire les MATÉRIAUX (champs Mat_* + Est_materiau) : sa config de
// colonnes est indépendante du formulaire, c'est le seul rapport Product qui expose nos champs.
export const FORM_MACHINE = "Fiche_Machine";
export const REPORT_MACHINE = "Fiche_Machine_Report";
/** Règles matériaux (corr. 3.1) : une ligne = « ce matériau exige ces éléments ». Voir lib/reglesMateriaux.ts. */
export const REPORT_REGLES_MATERIAUX = "R_gles_mat_riaux_Report";
export const FORM_PRODUIT = "Product";
export const REPORT_PRODUITS_ETENDU = "Machines_Report";

// NB : les champs "Date_*" (Date_derniere_maj, Date_creation, Date_maj…) ont été créés comme
// champs E-mail dans Creator (erreur d'automation lors de la création des formulaires — le code
// de type de champ utilisé ne correspondait pas à "Date" sur cette instance) : écrire dedans via
// l'API renvoie "Enter a valid email address". On n'auto-horodate donc plus ces champs depuis
// le widget ; à corriger manuellement dans le builder si l'horodatage automatique est souhaité.

export interface ParametresBase {
  id: string;
  tauxHoraireArtistic: number | null;
  tauxHoraireFlash: number | null;
  multiplicateurMateriaux: number | null;
  tauxDirectLabourArtistic: number | null;
  tauxDirectLabourFlash: number | null;
  indirectLabourArtistic: number | null;
  indirectLabourFlash: number | null;
  heuresParSemaine: number | null;
  semainesParAnnee: number | null;
  heuresVacances: number | null;
  tauxShutdown: number | null;
  seuilAlerteHeures: number | null;
  modeDebug: boolean;
  dateDerniereMaj: string;
}
export interface FournituresProduction {
  id: string;
  coutSoieEmulsionExpo: number | null;
  coutSoieEmulsionSimple: number | null;
  coutMatriceAdhesif: number | null;
  coutMatriceCoupe: number | null;
  coutMatriceKissCut: number | null;
  coutMatriceEmbossage: number | null;
  coutNettoyagePetit: number | null;
  coutNettoyageMoyen: number | null;
  coutNettoyageGrand: number | null;
  coutRectoVersoMoyen: number | null;
  coutRectoVersoGrand: number | null;
  coutLaserParFeuille: number | null;
  vitesseLaser: number | null;
  setupLaserMinParUp: number | null;
  setupLaserMinimum: number | null;
  dateDerniereMaj: string;
}
export interface TransportParams {
  id: string;
  coutKmAutoroute: number | null;
  coutKmVille: number | null;
  vitesseAutoroute: number | null;
  vitesseVille: number | null;
  dateDerniereMaj: string;
}
export interface Amortissements {
  id: string;
  amortMimakiIon: number | null;
  amortZundHre: number | null;
  amortZundMin: number | null;
  maintFujifilmR404: number | null;
  maintFujifilmR40i: number | null;
  maintAcuityPrime: number | null;
  maintAgfa: number | null;
  dateDerniereMaj: string;
}
export interface Machine {
  id: string;
  nomMachine: string;
  codeMachine: string;
  site: string;
  categorie: string;
  statut: string; // "Actif" | "Inactif"
  tauxMachine: number | null;
  prixAcquisition: number | null;
  dateAcquisition: string;
  periodeAmortissement: number | null;
  heuresDisponiblesNettes: number | null;
  tauxUtilisation: number | null;
  heuresReelles: number | null;
  employesMachine: number | null;
  vitesseBase: number | null;
  uniteVitesse: string;
  vitesse1up: number | null;
  vitesseMoins4up: number | null;
  vitessePlus5up: number | null;
  vitesseVariante: number | null;
  setupMinutes: number | null;
  setupParCouleur: boolean;
  formatMax: string;
  largeurMaxPo: number | null;
  hauteurMaxPo: number | null;
  vitessePlatineAdhesif: number | null;
  vitessePlatineCoupe: number | null;
  vitessePlatineKissCut: number | null;
  vitessePlatineEmbossage: number | null;
  notes: string;
  dateCreation: string;
  dateMaj: string;
}

async function premiereLigne(report: string): Promise<Record<string, unknown> | null> {
  const lignes = await toutesLignes(report);
  return lignes[0] ?? null;
}

/** Charge les 4 formulaires de paramètres standards + le catalogue machines. null hors Zoho. */
export async function chargerAdmin(): Promise<{
  base: ParametresBase | null;
  fournitures: FournituresProduction | null;
  transport: TransportParams | null;
  amortissements: Amortissements | null;
  machines: Machine[];
} | null> {
  if (!isZohoEnv()) return null;
  try {
    const [rBase, rFourn, rTransport, rAmort, rMachines] = await Promise.all([
      premiereLigne(REPORT_PARAMETRES_BASE),
      premiereLigne(REPORT_FOURNITURES),
      premiereLigne(REPORT_TRANSPORT),
      premiereLigne(REPORT_AMORTISSEMENTS),
      // Fiche_Machine : pas de paramètre `fields` — on lit les colonnes que le rapport expose
      // (sa config doit inclure les champs vitesse/setup/format, voir docs de déploiement)
      toutesLignes(REPORT_MACHINE),
    ]);
    return {
      base: rBase && {
        id: String(rBase.ID ?? ""),
        tauxHoraireArtistic: num(rBase.Taux_horaire_Artistic),
        tauxHoraireFlash: num(rBase.Taux_horaire_Flash),
        multiplicateurMateriaux: num(rBase.Multiplicateur_materiaux),
        tauxDirectLabourArtistic: num(rBase.Taux_direct_labour_Artistic),
        tauxDirectLabourFlash: num(rBase.Taux_direct_labour_Flash),
        indirectLabourArtistic: num(rBase.Indirect_labour_Artistic),
        indirectLabourFlash: num(rBase.Indirect_labour_Flash),
        heuresParSemaine: num(rBase.Heures_par_semaine),
        semainesParAnnee: num(rBase.Semaines_par_annee),
        heuresVacances: num(rBase.Heures_vacances),
        tauxShutdown: num(rBase.Taux_shutdown),
        seuilAlerteHeures: num(rBase.Seuil_alerte_heures),
        modeDebug: num(rBase.Mode_debug) !== 0,
        dateDerniereMaj: String(rBase.Date_derniere_maj ?? ""),
      },
      fournitures: rFourn && {
        id: String(rFourn.ID ?? ""),
        coutSoieEmulsionExpo: num(rFourn.Cout_soie_emulsion_expo),
        coutSoieEmulsionSimple: num(rFourn.Cout_soie_emulsion_simple),
        coutMatriceAdhesif: num(rFourn.Cout_matrice_adhesif),
        coutMatriceCoupe: num(rFourn.Cout_matrice_coupe),
        coutMatriceKissCut: num(rFourn.Cout_matrice_kiss_cut),
        coutMatriceEmbossage: num(rFourn.Cout_matrice_embossage),
        coutNettoyagePetit: num(rFourn.Cout_nettoyage_petit),
        coutNettoyageMoyen: num(rFourn.Cout_nettoyage_moyen),
        coutNettoyageGrand: num(rFourn.Cout_nettoyage_grand),
        coutRectoVersoMoyen: num(rFourn.Cout_recto_verso_moyen),
        coutRectoVersoGrand: num(rFourn.Cout_recto_verso_grand),
        coutLaserParFeuille: num(rFourn.Cout_laser_par_feuille),
        vitesseLaser: num(rFourn.Vitesse_laser),
        setupLaserMinParUp: num(rFourn.Setup_laser_min_par_up),
        setupLaserMinimum: num(rFourn.Setup_laser_minimum),
        dateDerniereMaj: String(rFourn.Date_derniere_maj ?? ""),
      },
      transport: rTransport && {
        id: String(rTransport.ID ?? ""),
        coutKmAutoroute: num(rTransport.Cout_km_autoroute),
        coutKmVille: num(rTransport.Cout_km_ville),
        vitesseAutoroute: num(rTransport.Vitesse_autoroute),
        vitesseVille: num(rTransport.Vitesse_ville),
        dateDerniereMaj: String(rTransport.Date_derniere_maj ?? ""),
      },
      amortissements: rAmort && {
        id: String(rAmort.ID ?? ""),
        amortMimakiIon: num(rAmort.Amort_Mimaki_Ion),
        amortZundHre: num(rAmort.Amort_Zund_hre),
        amortZundMin: num(rAmort.Amort_Zund_min),
        maintFujifilmR404: num(rAmort.Maint_Fujifilm_R404),
        maintFujifilmR40i: num(rAmort.Maint_Fujifilm_R40i),
        maintAcuityPrime: num(rAmort.Maint_Acuity_Prime),
        maintAgfa: num(rAmort.Maint_Agfa),
        dateDerniereMaj: String(rAmort.Date_derniere_maj ?? ""),
      },
      machines: rMachines
        .map((r) => ({
          id: String(r.ID ?? ""),
          nomMachine: String(r.Nom_machine ?? "").trim(),
          codeMachine: String(r.Code_machine ?? "").trim(),
          site: String(r.Site ?? "").trim(),
          categorie: String(r.Categorie ?? "").trim(),
          statut: String(r.Statut ?? "").trim() === "Inactif" ? "Inactif" : "Actif",
          tauxMachine: num(r.Taux_machine),
          prixAcquisition: num(r.Prix_acquisition),
          dateAcquisition: String(r.Date_acquisition ?? "").trim(),
          periodeAmortissement: num(r.Periode_amortissement),
          heuresDisponiblesNettes: num(r.Heures_disponibles_nettes),
          tauxUtilisation: num(r.Taux_utilisation),
          heuresReelles: num(r.Heures_reelles),
          employesMachine: num(r.Employes_machine),
          vitesseBase: num(r.Vitesse_base),
          uniteVitesse: String(r.Unite_vitesse ?? "").trim(),
          vitesse1up: num(r.Vitesse_1up),
          vitesseMoins4up: num(r.Vitesse_moins_4up),
          vitessePlus5up: num(r.Vitesse_plus_5up),
          vitesseVariante: num(r.Vitesse_variante),
          setupMinutes: num(r.Setup_minutes),
          setupParCouleur: num(r.Setup_par_couleur) !== 0,
          formatMax: String(r.Format_max ?? "").trim(),
          largeurMaxPo: num(r.Largeur_max_po),
          hauteurMaxPo: num(r.Hauteur_max_po),
          vitessePlatineAdhesif: num(r.Vitesse_platine_adhesif),
          vitessePlatineCoupe: num(r.Vitesse_platine_coupe),
          vitessePlatineKissCut: num(r.Vitesse_platine_kiss_cut),
          vitessePlatineEmbossage: num(r.Vitesse_platine_embossage),
          notes: String(r.Notes ?? "").trim(),
          dateCreation: "",
          dateMaj: "",
        }))
        .filter((m) => m.nomMachine),
    };
  } catch (e) {
    console.warn("chargerAdmin:", e);
    return null;
  }
}

async function sauvegarderSingleton(report: string, id: string, data: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — non enregistré dans Creator (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({ report_name: report, id, payload: { data } });
    if (res.code === 3000) return { ok: true, message: "Paramètre enregistré dans Creator." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

export const sauvegarderParametresBase = (id: string, champs: Record<string, unknown>) => sauvegarderSingleton(REPORT_PARAMETRES_BASE, id, champs);
export const sauvegarderFournitures = (id: string, champs: Record<string, unknown>) => sauvegarderSingleton(REPORT_FOURNITURES, id, champs);
export const sauvegarderTransport = (id: string, champs: Record<string, unknown>) => sauvegarderSingleton(REPORT_TRANSPORT, id, champs);
export const sauvegarderAmortissements = (id: string, champs: Record<string, unknown>) => sauvegarderSingleton(REPORT_AMORTISSEMENTS, id, champs);

/** Enregistre une fiche machine modifiée (données déjà mappées vers les liens Fiche_Machine). */
export async function sauvegarderMachine(id: string, data: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — non enregistré dans Creator (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({ report_name: REPORT_MACHINE, id, payload: { data } });
    if (res.code === 3000) return { ok: true, message: "Fiche machine enregistrée dans Creator." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

/** Crée une nouvelle fiche machine (formulaire Fiche_Machine). Retourne l'ID créé. */
export async function creerMachine(data: Record<string, unknown>): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — non créé dans Creator (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.addRecords({
      form_name: FORM_MACHINE,
      payload: {
        data: {
          Statut: "Actif",
          ...data,
        },
      },
    });
    if (res.code === 3000) return { ok: true, message: "Machine créée dans Creator.", id: String(res.data.ID) };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ") : " + JSON.stringify((res as { message?: unknown }).message ?? res) };
  } catch (e) {
    return { ok: false, message: "Erreur de création : " + String((e as Error)?.message ?? e) };
  }
}

/** Désactive (Statut=Inactif, suppression douce) ou réactive une fiche machine. */
export async function desactiverMachine(id: string, actif: boolean): Promise<{ ok: boolean; message: string }> {
  return sauvegarderMachine(id, { Statut: actif ? "Actif" : "Inactif" });
}

/** Résumé d'une soumission enregistrée (liste du popup « Ouvrir »). */
export interface SoumissionResume {
  id: string;
  client: string;
  modele: string;
  noPce: string;
  quantite: number | null;
  montant: number | null;
  total: number | null;
  /** JSON complet des entrées (cellule → valeur), incluant machines X!* et lignes QTÉ */
  donnees: string;
}

/** Liste les soumissions enregistrées (Form1), plus récentes d'abord. null hors Zoho. */
export async function chargerSoumissions(): Promise<SoumissionResume[] | null> {
  if (!isZohoEnv()) return null;
  try {
    const lignes = await toutesLignes(REPORT_SOUMISSIONS);
    return lignes
      .map((r) => ({
        id: String(r.ID ?? ""),
        client: String(r.Client ?? "").trim(),
        modele: String(r.Mod_le ?? "").trim(),
        noPce: String(r.No_Pi_ce ?? "").trim(),
        quantite: num(r.Quantit),
        montant: num(r.Montant),
        total: num(r.Total),
        donnees: String(r.Donnees ?? ""),
      }))
      .filter((s) => s.id)
      .sort((a, b) => (a.id < b.id ? 1 : -1)); // IDs croissants dans le temps → tri décroissant = plus récentes d'abord
  } catch (e) {
    console.warn("chargerSoumissions:", e);
    return null;
  }
}

/** Supprime une soumission enregistrée. */
export async function supprimerSoumission(id: string): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — rien à supprimer (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.deleteRecordById({ report_name: REPORT_SOUMISSIONS, id });
    if (res.code === 3000) return { ok: true, message: "Soumission supprimée." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur de suppression : " + String((e as Error)?.message ?? e) };
  }
}

/** Écrit le JSON contractuel (+ statut) sur une soumission déjà créée.
 *  Fait en 2 temps parce que le contrat contient `soumission.id`, connu seulement après l'insert. */
export async function majSoumissionJSON(
  id: string,
  champs: { Soumission_JSON?: string; Statut?: string; Webhook_Statut?: string; Reponse_IA?: string },
): Promise<{ ok: boolean; message: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — JSON non enregistré (hors Zoho)." };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_SOUMISSIONS,
      id,
      payload: { data: champs as Record<string, unknown> },
    });
    if (res.code === 3000) return { ok: true, message: "JSON de soumission enregistré." };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'écriture du JSON : " + String((e as Error)?.message ?? e) };
  }
}

export interface SoumissionRecord {
  client: string;
  no_client: string;
  modele: string;
  no_pce: string;
  quantite: number;
  facteur: number;
  montant: number;
  total: number;
  prix_unitaire: number;
  donnees_json: string; // toutes les entrées (cellule → valeur) pour ré-ouvrir la soumission
  // Contrat v1.0 envoyé à la plateforme du client. Écrit DÈS LA CRÉATION : dans Creator,
  // seul un addRecords par API déclenche les workflows de formulaire — une mise à jour
  // faite après coup ne les déclenche pas.
  soumission_json: string;
  statut: "Brouillon" | "Valide";
  webhook_statut: string; // "En_attente" si le workflow doit envoyer, "" sinon
}

/** Colonnes Creator d'une soumission — mêmes valeurs à la création et à la mise à jour. */
function champsSoumission(rec: SoumissionRecord): Record<string, unknown> {
  return {
    Client: rec.client,
    Mod_le: rec.modele,
    No_Pi_ce: rec.no_pce,
    Quantit: Math.round(rec.quantite),
    // arrondis : les champs Décimale de Creator plafonnent la précision
    Montant: Math.round(rec.montant * 100) / 100,
    Total: Math.round(rec.total * 100) / 100,
    Prix_Unitaire: Math.round(rec.prix_unitaire * 10000) / 10000,
    // no_client et facteur sont conservés dans le JSON complet (Donnees)
    Donnees: rec.donnees_json,
    Soumission_JSON: rec.soumission_json,
    Statut: rec.statut,
    Webhook_Statut: rec.webhook_statut,
  };
}

/** Met à jour une soumission déjà enregistrée, au lieu d'en créer une deuxième.
 *
 *  ATTENTION : le workflow Creator qui pousse la soumission vers la plateforme du client se
 *  déclenche à la CRÉATION d'un enregistrement, pas à sa modification. Une soumission validée
 *  par cette voie n'est donc pas envoyée automatiquement — le bouton « Renvoyer à la
 *  plateforme » du rapport reste le rattrapage. Voir docs/api/deluge/. */
export async function majSoumission(id: string, rec: SoumissionRecord): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!isZohoEnv()) return { ok: true, message: "Mode démo — soumission non enregistrée (hors Zoho).", id };
  try {
    const res = await ZOHO.CREATOR.DATA.updateRecordById({
      report_name: REPORT_SOUMISSIONS,
      id,
      payload: { data: champsSoumission(rec) },
    });
    if (res.code === 3000) return { ok: true, message: "Soumission mise à jour (ID " + id + ").", id };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

export async function sauvegarderSoumission(rec: SoumissionRecord): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!isZohoEnv()) {
    // mode dev / hors Zoho : rien à sauvegarder côté serveur
    console.info("[mock] soumission :", rec);
    return { ok: true, message: "Mode démo — soumission non enregistrée (hors Zoho)." };
  }
  try {
    const res = await ZOHO.CREATOR.DATA.addRecords({
      form_name: FORM_SOUMISSIONS,
      payload: { data: champsSoumission(rec) },
    });
    if (res.code === 3000) return { ok: true, message: "Soumission enregistrée (ID " + res.data.ID + ").", id: String(res.data.ID) };
    return { ok: false, message: "Réponse Zoho inattendue (code " + res.code + ")." };
  } catch (e) {
    return { ok: false, message: "Erreur d'enregistrement : " + String((e as Error)?.message ?? e) };
  }
}

// ── Règles matériaux (formulaire Regles_Materiaux, rapport R_gles_mat_riaux_Report) ────────
// Le mapping des champs est dans lib/reglesMateriaux.ts (regleDepuisCreator) — testable hors Zoho.
// Retourne null si le rapport est inaccessible ou hors Zoho → l'appelant garde REGLES_DEFAUT.
export async function chargerReglesMateriaux(): Promise<RegleMateriau[] | null> {
  if (!isZohoEnv()) return null;
  try {
    const lignes = await toutesLignes(REPORT_REGLES_MATERIAUX);
    return lignes.map(regleDepuisCreator).filter((r): r is RegleMateriau => r !== null);
  } catch (e) {
    console.warn("chargerReglesMateriaux :", e);
    return null;
  }
}
