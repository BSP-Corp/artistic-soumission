// Logique « sélection machine » : fusion Creator↔snapshot, surcharges des cellules du moteur,
// et modèle de coût comparatif Zund vs Platine (maquettes de refonte, données Artistic CG).
import type { CellValue } from "./moteur";
import type { Machine } from "@/services/zohoService";
import { facteurCout, surchargeCadence, surchargeTemps, TAUX_HORAIRE_CLASSEUR } from "./methodeCout";
import {
  MACHINES_CALC_SNAPSHOT,
  DEFAUTS_FAMILLE,
  familleDepuisCategorie,
  cleMachine,
  type MachineCalc,
  type FamilleMachine,
} from "@/data/machinesCalc";

export { cleMachine } from "@/data/machinesCalc";

/** pseudo-cellules où la sélection est rangée (persistées dans le JSON Donnees) */
export const CELL_PRESSE = "X!PRESSE";
export const CELL_ZUND = "X!ZUND";
export const CELL_PLATINE = "X!PLATINE";
export const CELL_LAMINOIR = "X!LAMINOIR";
export const CELL_SLITTER = "X!SLITTER";
export const CELL_GUILLOTINE = "X!GUILLOTINE";

/** Fusionne les fiches Creator (Fiche_Machine) avec le snapshot Artistic CG.
 *
 *  RÈGLE (corrigée 2026-07-23) : dès qu'une fiche EXISTE dans Creator, elle fait foi
 *  INTÉGRALEMENT — y compris ses champs vides, qui retombent sur le défaut de famille et NON
 *  sur le snapshot. Auparavant un champ vidé dans Creator réempruntait la valeur du snapshot :
 *  la modification semblait « ne pas prendre » de façon intermittente, selon que la machine
 *  figurait ou non dans le snapshot. Le snapshot ne sert plus qu'à deux choses : fournir les
 *  machines totalement absentes de Creator, et faire tourner le widget hors Zoho. */
export function fusionnerMachines(creator: Machine[] | null): MachineCalc[] {
  const parCle = new Map<string, MachineCalc>();
  for (const s of MACHINES_CALC_SNAPSHOT) parCle.set(cleMachine(s.nom), { ...s });

  const out: MachineCalc[] = [];
  const vues = new Set<string>();
  for (const m of creator ?? []) {
    const famille = familleDepuisCategorie(m.categorie, m.nomMachine);
    if (!famille) continue;
    const cle = cleMachine(m.nomMachine);
    const snap = parCle.get(cle);
    const defauts = DEFAUTS_FAMILLE[famille];
    const platine =
      famille === "platine"
        ? {
            adhesif: m.vitessePlatineAdhesif ?? undefined,
            coupe: m.vitessePlatineCoupe ?? undefined,
            kissCut: m.vitessePlatineKissCut ?? undefined,
            embossage: m.vitessePlatineEmbossage ?? undefined,
          }
        : undefined;
    const zund =
      famille === "zund"
        ? {
            up1: m.vitesse1up ?? undefined,
            moins4: m.vitesseMoins4up ?? undefined,
            plus5: m.vitessePlus5up ?? undefined,
          }
        : undefined;
    out.push({
      nom: m.nomMachine,
      famille,
      // Creator fait foi : un champ vide retombe sur le défaut de famille, jamais sur le snapshot
      vitesse: m.vitesseBase ?? defauts.vitesse,
      uniteVitesse: m.uniteVitesse || undefined,
      unePasseToutesCouleurs: snap?.unePasseToutesCouleurs, // caractéristique physique, pas une donnée saisie
      setup: m.setupMinutes ?? defauts.setup,
      taux: m.tauxMachine ?? null,
      largeurPo: m.largeurMaxPo ?? null,
      hauteurPo: m.hauteurMaxPo ?? null,
      actif: m.statut !== "Inactif",
      platine,
      zund,
      variante: m.vitesseVariante ?? null,
    });
    vues.add(cle);
  }
  // machines du snapshot que Creator ne connaît pas (ex. hors Zoho : tout le snapshot)
  for (const [cle, s] of parCle) if (!vues.has(cle)) out.push(s);
  return out;
}

export function machinesFamille(machines: MachineCalc[], famille: FamilleMachine): MachineCalc[] {
  return machines.filter((m) => m.famille === famille && m.actif);
}

export function trouverMachine(machines: MachineCalc[], famille: FamilleMachine, nom: string): MachineCalc | null {
  if (!nom) return null;
  const cle = cleMachine(nom);
  return machines.find((m) => m.famille === famille && cleMachine(m.nom) === cle) ?? null;
}

// ── Surcharges des cellules du moteur ────────────────────────────────────────
// Feuille de route « Changements_a_appliquer_Impression_Decoupe.md » (§2-3) : on ne remplace
// QUE la source des vitesses/setups machine — la décomposition des coûts du classeur reste.
//
// PRESSE — CADENCES DE ROULEMENT (corrigé 2026-07-22).
//   Le temps/coût de tirage du classeur est porté par SIX cellules de cadence, pas une seule :
//     · C!G15 (roulement de base)     = G9 × couleurs × (CF8 / CH9 | CH10)     ← 250 | 251
//     · C!G16 (séparateur, passes add.) = G9 × extras × (CF8 / CH12 | CH11)    ← 325 | 265
//     · C!G17 (impr. adhésif 2 hommes) = G9 × (CF8 / CH35)                     ← 162,5
//     · C!U20/Y20/U23/Y23 (familles Lexan) = G9 × (CF8 / CH89 | CH91 | CH92)   ← 308 | 115,5 | 150
//     · C!R37 (mode « 1 à 6 coul. » S!O5=1) = (G9 / CF70) × (CF8 × CF71)       ← 225 | 1
//   La version précédente ne surchargeait que CH89/91/92 + CF70/71 : G15+G16 (≈2/3 du poste,
//   et la totalité en mode normal sans matériau Lexan) restaient figés sur 250/251/265/325 —
//   d'où un temps de roulement quasi insensible à la presse choisie. Toutes les cadences sont
//   maintenant mises à l'échelle de la presse, en préservant les paliers relatifs du classeur.
//   CONSERVÉS (§2.4) : montage soie CI71-73, nettoyage CI79-81, set-up couleurs CF64-67,
//   émulsion CF20 — pilotés par le gabarit, pas par la machine. FT!L4 (« No. Presse ») auto.
//
//   UNITÉ (question tranchée 2026-07-22) : la table Machines stocke TOUTES les presses dans la
//   même unité, `Unite_vitesse = "fle/hre"` (220 pour les presses manuelles, 175 Multiprint) —
//   elles sont donc comparables entre elles sans conversion. Le « 225 passes/h » n'est PAS une
//   donnée machine : c'est INV!CF70, dont le libellé InventaireA est « Vitesse 1 à 6 coul.
//   225 Passes », utilisé UNIQUEMENT dans le mode S!O5=1. La cadence du mode normal est
//   INV!CH9 = 250, multipliée par le nombre de couleurs → elle compte des PASSES.
//   Base unique retenue : la PASSE (une feuille traversant la presse une fois). Une presse qui
//   pose une seule couleur par passage a fle/h ≡ passes/h (cas de toutes les fiches actuelles).
//   Si l'atelier confirme qu'une presse en ligne pose N couleurs en un seul passage, il suffit
//   de mettre `unePasseToutesCouleurs: true` sur sa fiche : sa vitesse est alors convertie en
//   passes/h (× nb de couleurs du job) avant d'alimenter les cadences du mode normal.
// ZUND (§3.2) : vitesses contour par nb de up INV!CF38/39/40 — champs Vitesse_1up/_moins_4up/
//   _plus_5up de la fiche s'ils existent, sinon mise à l'échelle vitesse/280 (préserve les
//   paliers du classeur). CF42 (cut-out) et CF43 (manipulation) CONSERVÉS. CI53 = setup machine.
// PLATINE (§3.2) : cadences INV!CH20-23 = vitesse machine (par type de die si précisé) ;
//   setups CI54/56/60 = temps_setup machine ; re-set-up CI55/57/59/61 CONSERVÉS ;
//   CH37 (variante chauffante kiss-cut) = vitesse variante de la fiche si renseignée.
/** Cadences de roulement du classeur (base : INV!CH9 = 250 passes/h). Les surcharges presse
 *  conservent ces rapports — une presse 2× plus rapide divise tous ces temps par 2. */
export const CADENCES_PRESSE_CLASSEUR = {
  "INV!CH9": 250, // roulement standard
  "INV!CH10": 251, // roulement Lexan clair
  "INV!CH11": 265, // séparateur / passes add. Lexan clair
  "INV!CH12": 325, // séparateur / passes add. standard
  "INV!CH35": 162.5, // impression adhésif, 2 hommes
  "INV!CH89": 308, // Lexan HP
  "INV!CH91": 115.5, // Lexan clair
  "INV!CH92": 150, // Lexan HP sérigraphie sur dessus
} as const;
/** cadence de référence : celle à laquelle les autres sont rapportées */
export const CADENCE_PRESSE_REF = CADENCES_PRESSE_CLASSEUR["INV!CH9"];
/** vitesse du mode « 1 à 6 couleurs » (INV!CF70), en feuilles/h toutes couleurs confondues */
export const VITESSE_MULTIPRINT_CLASSEUR = 225;

// ── Finition matière : cadences et setups figés du classeur ──────────────────
// Opération → cellules (relevé dans classeur.json, cf. widget/docs) :
//   Adhésif laminé    S!22 → C!I18 = N5(CI42) + G18(E18←CH13 200)
//   Adhésif régistre  S!23 → C!I19 = N6(CI43) + G19(E19←CH14 132)
//   Over Laminating   S!24 → C!I20 = N9(CI45) + G20(E20←CH16 200, avec ×2 = 2 personnes)
//   Prémask Std       S!25 → C!I21 = N7(CI44) + G21(E21←CH15 200)
//   Protecteur        S!26 → C!I22 = N8(CI44) + G22(E22←CH15 200)   ← MÊME constante que Prémask
//   Protecteur fenêtre S!27 → C!G24 = E24←CI15 400  ← cadence logée dans la colonne CI (piège)
//   Slit              S!28 → C!I25 = N10(CI46) + G25(E25←CH17 500)
//   Guillotine        S!29 → C!I26 = N11(CI47) + G26 ; G26 = qté × S!E29 × E26, et
//                     E26 = IF(E29=1, S!F29, 0) → le tarif de roulage est une SAISIE ($/pièce,
//                     0,05 par défaut), PAS une cadence. Seul le setup CI47 est câblable.
export const CADENCES_LAMINOIR_CLASSEUR = {
  "INV!CH13": 200, // adhésif laminé (référence de la famille)
  "INV!CH14": 132, // adhésif régistre — plus lent, rapport conservé
  "INV!CH15": 200, // prémask + protecteur
  "INV!CH16": 200, // over laminating
  "INV!CI15": 400, // protecteur fenêtre
} as const;
export const CADENCE_LAMINOIR_REF = CADENCES_LAMINOIR_CLASSEUR["INV!CH13"];
export const SETUPS_LAMINOIR_CLASSEUR = {
  "INV!CI42": 15, // adhésif laminé
  "INV!CI43": 15, // adhésif régistre
  "INV!CI44": 15, // prémask + protecteur
  "INV!CI45": 20, // over laminating
} as const;
export const SETUP_LAMINOIR_REF = 15;
export const CADENCE_SLITTER_CLASSEUR = 500; // INV!CH17
export const SETUP_SLITTER_CLASSEUR = 15; // INV!CI46
export const SETUP_GUILLOTINE_CLASSEUR = 15; // INV!CI47

/** Vitesse presse ramenée à la base unique « passes/heure », avec garde-fou numérique :
 *  une fiche sans vitesse exploitable retombe sur la cadence du classeur (250). */
export function cadencePresse(presse: MachineCalc, couleurs = 1): number {
  const v = Number(presse.vitesse);
  if (!Number.isFinite(v) || v <= 0) return CADENCE_PRESSE_REF;
  if (!presse.unePasseToutesCouleurs) return v; // 1 couleur par passage : fle/h ≡ passes/h
  const n = Number.isFinite(couleurs) && couleurs >= 1 ? Math.floor(couleurs) : 1;
  return v * n;
}

/** true si la fiche n'a pas de vitesse exploitable (→ repli classeur + signalement UI) */
export function vitessePresseManquante(presse: MachineCalc): boolean {
  const v = Number(presse.vitesse);
  return !Number.isFinite(v) || v <= 0;
}

export function surchargesMachines(
  sel: {
    presse?: MachineCalc | null;
    zund?: MachineCalc | null;
    platine?: MachineCalc | null;
    laminoir?: MachineCalc | null;
    slitter?: MachineCalc | null;
    guillotine?: MachineCalc | null;
  },
  /** valeur courante de INV!CF8 (taux horaire base, surchargeable via Taux_Calcul INV_8) */
  tauxHoraire = TAUX_HORAIRE_CLASSEUR,
  /** nb de couleurs du job (S!E3) — sert à convertir en passes/h une presse en ligne */
  couleurs = 1,
): Record<string, CellValue> {
  const out: Record<string, CellValue> = {};
  const { presse, zund, platine } = sel;
  if (presse) {
    // facteur de méthode de coût — 1 en mode temps (défaut), machine_rate/CF8 sinon.
    // Voir lib/methodeCout.ts : c'est le SEUL endroit où la méthode se décide.
    const f = facteurCout(presse.taux, tauxHoraire);
    const k = cadencePresse(presse, couleurs) / CADENCE_PRESSE_REF;
    for (const [cell, valeur] of Object.entries(CADENCES_PRESSE_CLASSEUR)) {
      out[cell] = surchargeCadence(valeur * k, f);
    }
    // mode « 1 à 6 couleurs » (S!O5=1) : CF70 est en feuilles/h toutes couleurs confondues
    const v = vitessePresseManquante(presse) ? VITESSE_MULTIPRINT_CLASSEUR : presse.vitesse;
    out["INV!CF70"] = surchargeCadence(v, f);
    // CF71 (multiplicateur de taux du mode 1-6 coul.) reste à sa valeur classeur : la méthode
    // de coût passe déjà par CF70, le surcharger ici l'appliquerait deux fois.
    out["FT!L4"] = presse.nom;
  }
  if (zund) {
    const f = facteurCout(zund.taux, tauxHoraire);
    const ratio = zund.vitesse / DEFAUTS_FAMILLE.zund.vitesse;
    out["INV!CF38"] = surchargeCadence(zund.zund?.up1 ?? 360 * ratio, f);
    out["INV!CF39"] = surchargeCadence(zund.zund?.moins4 ?? zund.vitesse, f);
    out["INV!CF40"] = surchargeCadence(zund.zund?.plus5 ?? 150 * ratio, f);
    out["INV!CI53"] = surchargeTemps(zund.setup, f);
  }
  if (platine) {
    const f = facteurCout(platine.taux, tauxHoraire);
    out["INV!CH20"] = surchargeCadence(platine.platine?.adhesif ?? platine.vitesse, f);
    out["INV!CH21"] = surchargeCadence(platine.platine?.coupe ?? platine.vitesse, f);
    out["INV!CH22"] = surchargeCadence(platine.platine?.kissCut ?? platine.vitesse, f);
    out["INV!CH23"] = surchargeCadence(platine.platine?.embossage ?? platine.vitesse, f);
    out["INV!CI54"] = surchargeTemps(platine.setup, f);
    out["INV!CI56"] = surchargeTemps(platine.setup, f);
    out["INV!CI60"] = surchargeTemps(platine.setup, f);
    if (platine.variante) out["INV!CH37"] = surchargeCadence(platine.variante, f);
  }
  // ── Finition matière (laminoir / slitter / guillotine) ────────────────────
  // Même patron que ci-dessus : les cadences et setups figés deviennent ceux de la machine
  // choisie, les rapports du classeur sont conservés (une machine à 200 fle/h ne change donc
  // rien, ce qui est le cas de toutes les fiches CG actuelles).
  const { laminoir, slitter, guillotine } = sel;
  if (laminoir) {
    const f = facteurCout(laminoir.taux, tauxHoraire);
    const k = vitesseUtile(laminoir, DEFAUTS_FAMILLE.laminoir.vitesse) / CADENCE_LAMINOIR_REF;
    for (const [cell, valeur] of Object.entries(CADENCES_LAMINOIR_CLASSEUR)) out[cell] = surchargeCadence(valeur * k, f);
    const ks = setupUtile(laminoir, DEFAUTS_FAMILLE.laminoir.setup) / SETUP_LAMINOIR_REF;
    for (const [cell, valeur] of Object.entries(SETUPS_LAMINOIR_CLASSEUR)) out[cell] = surchargeTemps(valeur * ks, f);
  }
  if (slitter) {
    const f = facteurCout(slitter.taux, tauxHoraire);
    out["INV!CH17"] = surchargeCadence(vitesseUtile(slitter, CADENCE_SLITTER_CLASSEUR), f);
    out["INV!CI46"] = surchargeTemps(setupUtile(slitter, SETUP_SLITTER_CLASSEUR), f);
  }
  if (guillotine) {
    // ⚠ SEUL le setup est câblé. Le classeur facture le roulage de la guillotine à un tarif
    // saisi par job ($/pièce, S!F29) et n'a aucune cellule de cadence ; la vitesse CG
    // (142 fle/h) relève d'un autre modèle de coût. Conversion volontairement NON faite —
    // à trancher avec le client avant câblage.
    const f = facteurCout(guillotine.taux, tauxHoraire);
    out["INV!CI47"] = surchargeTemps(setupUtile(guillotine, SETUP_GUILLOTINE_CLASSEUR), f);
  }
  return out;
}

/** vitesse exploitable d'une fiche, sinon la valeur du classeur (jamais NaN ni 0) */
function vitesseUtile(m: MachineCalc, repli: number): number {
  const v = Number(m.vitesse);
  return Number.isFinite(v) && v > 0 ? v : repli;
}
/** setup exploitable d'une fiche, sinon la valeur du classeur */
function setupUtile(m: MachineCalc, repli: number): number {
  const s = Number(m.setup);
  return Number.isFinite(s) && s >= 0 ? s : repli;
}

/** Pseudo-cellule « coût matrice du job » (feuille de route §3.3 : le coût de matrice se
 *  saisit PAR JOB — c'est lui qui crée le point de bascule Platine ↔ Zund). Vide = coûts
 *  classeur (CF22-25 : 7,50 / 9,37 / 15,37 / 5,00 $ selon le type de die). */
export const CELL_MATRICE = "X!MATRICE";

export function surchargeMatrice(valeur: CellValue): Record<string, CellValue> {
  const n = Number(String(valeur ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return {};
  return { "INV!CF22": n, "INV!CF23": n, "INV!CF24": n, "INV!CF25": n };
}

// ── Comparatif Zund vs Platine ──────────────────────────────────────────────
// Retiré le 16 sept. 2026 : l'ancien calcul (vitesse de base × périmètre, mise en train de la
// fiche, sans perte) ne collait pas au récap de la soumission. Le comparatif fait maintenant
// tourner le vrai moteur — voir lib/comparatifMoteur.ts.
