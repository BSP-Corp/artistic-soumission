// Machines sélectionnables dans la soumission (presses sérigraphie, découpe Zund, platines).
// Source de vérité des paramètres : Machines_Artistic.xlsx › feuille « Artistic CG »
// (L55 machine rate · L57 mise en train · L58 vitesse fle/h · L59 format feuille · L60 po-lin/min)
// — voir Recap_machines_serigraphie_decoupe_feuilleS.md. Le snapshot sert hors Zoho et pour
// compléter les fiches Creator (Fiche_Machine) dont les vitesses/setups seraient vides.
//
// Choix de méthode (récap §6, à trancher côté client) : le TAUX horaire du moteur reste la base
// soumission INV!CF8 (73 $/h) — la sélection d'une machine pilote la VITESSE et la MISE EN TRAIN
// via les cellules du classeur ; le « machine rate » CG (coût pleinement chargé) est affiché à
// titre indicatif et sert au comparatif Zund/Platine.

export type FamilleMachine = "presse" | "zund" | "platine" | "laminoir" | "slitter" | "guillotine";

export interface MachineCalc {
  nom: string;
  famille: FamilleMachine;
  /** presses + platines : feuilles/heure — zund : pouces linéaires/minute */
  vitesse: number;
  /** unité brute telle que stockée dans Fiche_Machine (`Unite_vitesse`), pour affichage/contrôle */
  uniteVitesse?: string;
  /** presse en ligne qui pose TOUTES les couleurs en un seul passage : sa vitesse fle/h vaut
   *  alors vitesse × nb_couleurs en passes/h (base de calcul du mode normal). Faux partout
   *  aujourd'hui — les fiches CG sont des presses à une couleur par passage. À confirmer avec
   *  l'atelier pour la Multiprint IST (cf. INV!CF70 « Vitesse 1 à 6 coul. »). */
  unePasseToutesCouleurs?: boolean;
  /** mise en train, minutes par job */
  setup: number;
  /** machine rate CG $/h (indicatif, null si inconnu — le moteur reste sur INV!CF8) */
  taux: number | null;
  /** format feuille max (presses) */
  largeurPo: number | null;
  hauteurPo: number | null;
  actif: boolean;
  /** vitesses platine par type de die (fle/h) quand la fiche Creator les précise */
  platine?: { adhesif?: number; coupe?: number; kissCut?: number; embossage?: number };
  /** vitesse variante (ex. platine chauffante kiss-cut → INV!CH37) */
  variante?: number | null;
  /** vitesses Zund par nombre de up (po-lin/min) quand la fiche Creator les précise */
  zund?: { up1?: number; moins4?: number; plus5?: number };
}

/** Vitesse/setup par défaut d'une famille (valeurs génériques du classeur). */
export const DEFAUTS_FAMILLE: Record<FamilleMachine, { vitesse: number; setup: number }> = {
  presse: { vitesse: 250, setup: 60 }, // gabarit "petite" du classeur : CH9=250, CI71=60
  zund: { vitesse: 280, setup: 15 }, // CF39=280 (2-4 up), CI53=15
  platine: { vitesse: 400, setup: 25 }, // CH20-23=400
  // finition matière — les cadences figées du classeur égalent déjà les vitesses CG
  laminoir: { vitesse: 200, setup: 15 }, // CH13=200, CI42/43/44=15
  slitter: { vitesse: 500, setup: 15 }, // CH17=500, CI46=15
  guillotine: { vitesse: 142, setup: 15 }, // CG=142 fle/h ; le classeur n'a PAS de cadence (cf. machines.ts)
};

// ── Snapshot Artistic CG ─────────────────────────────────────────────────────
export const MACHINES_CALC_SNAPSHOT: MachineCalc[] = [
  // Presses sérigraphie (vitesse fle/h L58 · mise en train L57 · format L59 · rate L55)
  { nom: "Cameo 18 no.116", famille: "presse", vitesse: 220, setup: 30, taux: 49.81, largeurPo: 12, hauteurPo: 8, actif: true },
  { nom: "Cameo 30SS no.110", famille: "presse", vitesse: 220, setup: 30, taux: null, largeurPo: 26, hauteurPo: 18, actif: true },
  { nom: "Saturn no.140", famille: "presse", vitesse: 220, setup: 30, taux: null, largeurPo: 25, hauteurPo: 38, actif: true },
  { nom: "Viking no.150", famille: "presse", vitesse: 220, setup: 30, taux: null, largeurPo: 30, hauteurPo: 50, actif: true },
  { nom: "Renegade 170", famille: "presse", vitesse: 220, setup: 30, taux: null, largeurPo: 30, hauteurPo: 40, actif: true },
  { nom: "Svecia no.130", famille: "presse", vitesse: 220, setup: 30, taux: null, largeurPo: 21, hauteurPo: 28, actif: true },
  { nom: "Multiprint IST no.180", famille: "presse", vitesse: 175, setup: 30, taux: 125.89, largeurPo: 24, hauteurPo: 44, actif: true },
  { nom: "One man", famille: "presse", vitesse: 180, setup: 30, taux: 152.75, largeurPo: 48, hauteurPo: 96, actif: false },
  // Découpe numérique — Zund (po-lin/min L60)
  { nom: "Zund M-1600", famille: "zund", vitesse: 280, setup: 15, taux: 74.88, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Zund 3XL-M-1600", famille: "zund", vitesse: 280, setup: 15, taux: 209.8, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Zund L-2500", famille: "zund", vitesse: 280, setup: 15, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Duplo", famille: "zund", vitesse: 280, setup: 15, taux: null, largeurPo: null, hauteurPo: null, actif: false },
  // Platine — die-cut (fle/h L58)
  { nom: "MG 18\"", famille: "platine", vitesse: 400, setup: 25, taux: 56.9, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "MG 24\"", famille: "platine", vitesse: 400, setup: 25, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Brausse", famille: "platine", vitesse: 400, setup: 25, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  // Finition matière (CG catégorie « Finition »). Les machine rate de cette famille sont
  // inexploitables en l'état (Seal 65 ≈ 816 $/h, Guillotine Cutter ≈ 1 612 $/h, plusieurs vides) :
  // ils restent indicatifs, le calcul est en mode temps — cf. lib/methodeCout.ts.
  { nom: "Wesco (Laminoir)", famille: "laminoir", vitesse: 200, setup: 20, taux: 43.83, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Wesco 2 (Laminoir)", famille: "laminoir", vitesse: 200, setup: 20, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Seal 65 (Laminoir)", famille: "laminoir", vitesse: 200, setup: 20, taux: 816.35, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "DryTac JM54 (Laminoir)", famille: "laminoir", vitesse: 200, setup: 20, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Pierce 30", famille: "slitter", vitesse: 500, setup: 15, taux: 19.09, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Pierce 36", famille: "slitter", vitesse: 500, setup: 15, taux: null, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Guillotine Cutter", famille: "guillotine", vitesse: 142, setup: 15, taux: 1612.02, largeurPo: null, hauteurPo: null, actif: true },
  { nom: "Schneider (Guillotine)", famille: "guillotine", vitesse: 142, setup: 15, taux: 27.78, largeurPo: null, hauteurPo: null, actif: true },
];

// ── Correspondance fiche Creator → famille sélectionnable ────────────────────
/** Catégorie Fiche_Machine → famille du calcul (null = machine non sélectionnable ici,
 *  ex. Numerique = impression numérique, Finition = laminoirs/guillotines). */
export function familleDepuisCategorie(categorie: string, nom: string): FamilleMachine | null {
  const c = categorie.trim().toLowerCase();
  if (c.startsWith("serigraphie") || c.startsWith("sérigraphie")) return "presse";
  if (c.startsWith("decoupe") || c.startsWith("découpe")) return "zund";
  if (c.startsWith("platine")) return "platine";
  // La catégorie « Finition » de CG est un fourre-tout : on répartit par NOM vers l'étape de
  // production concernée. Ce qui ne correspond à aucune étape modélisée (Assembly, Felix Gluer,
  // Rollcut…) renvoie null et reste un simple référentiel de gestion.
  if (c.startsWith("finition")) {
    if (/die[\s-]?cut/i.test(nom)) return "platine";
    if (/laminoir|wesco|seal|drytac/i.test(nom)) return "laminoir";
    if (/slitter|pierce/i.test(nom)) return "slitter"; // PAS Rosenthal : coupeuse à feuilles dans CG
    if (/guillotine|polar|schneider/i.test(nom)) return "guillotine";
  }
  return null;
}

/** clé de rapprochement Creator ↔ snapshot : minuscules, sans parenthèses ni « no.XXX » */
export function cleMachine(nom: string): string {
  return nom
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\bno\.?\s*\d+\b/g, "")
    .replace(/["""]/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}
