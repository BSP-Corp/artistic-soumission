// ═══════════════════════════════════════════════════════════════════════════
// INTERRUPTEUR GLOBAL — méthode de coût de la soumission
// ═══════════════════════════════════════════════════════════════════════════
// Défaut = mode TEMPS, fidèle à l'Excel : dans le classeur d'origine, TOUTE opération
// (impression, découpe, finition…) vaut « un temps × INV!CF8 (74 $/h) ». Aucun taux machine
// n'intervient dans le calcul de soumission ; le choix d'une machine n'agit que sur le TEMPS,
// via sa vitesse et sa mise en train. Le coût est dérivé du temps, jamais l'inverse.
//
// Alternative = mode COÛT MACHINE ("machine-rate"), à activer sur décision comptabilité :
// chaque opération est facturée au machine rate CG de la machine choisie (coût de revient
// pleinement chargé : amortissement + indirects) plutôt qu'au taux main-d'œuvre de base.
//
// ⚠ Conséquence connue du mode "machine-rate" : le classeur affiche les heures comme
// « coût ÷ CF8 » (ex. S!M61 = TRUNC(K61/INV!CF$8)). Le temps AFFICHÉ y est donc gonflé du
// rapport machine_rate / CF8 et ne vaut plus feuilles ÷ vitesse. En mode "temps" (défaut) la
// cohérence est structurelle : les surcharges machine ne contiennent aucun taux, donc le
// temps affiché reste égal au temps réel quel que soit le CF8 courant (74 $/h ou valeur
// modifiée via Taux_Calcul INV_8).
//
// POUR BASCULER : changer la seule valeur ci-dessous ("temps" → "machine-rate"), rebuild,
// redéployer. Aucune autre modification n'est requise : tous les volets (impression, platine,
// Zund, et toute étape ajoutée plus tard) passent par les helpers de ce fichier.
//
// ═══════════════════════════════════════════════════════════════════════════
// RÈGLE « QUELLE SOURCE FAIT FOI » (arbitrage client 2026-07-23)
// ═══════════════════════════════════════════════════════════════════════════
// 1. Quand la fiche machine et le classeur mesurent LA MÊME opération, la FICHE MACHINE prime.
//    Ex. mise en train laminoir : 20 min (Artistic CG) l'emporte sur 15 min (classeur).
//    Appliqué à CI42-45, CI46, CI47, CI53, CI54/56/60 et à toutes les cadences.
// 2. Quand le CLASSEUR DÉCOMPOSE PLUS FINEMENT que la fiche, on garde la décomposition.
//    Ex. préparation sérigraphie : le classeur distingue montage soie (60/75/90 min PAR ÉCRAN
//    selon le gabarit), nettoyage (20/23/25) et set-up couleurs (110-150 min selon 3 à 6
//    couleurs) — trois postes réels ; la fiche presse n'a qu'un agrégat « mise en train 30 min ».
//    Y substituer les 30 min ferait perdre le nettoyage, le set-up par couleur et la
//    proportionnalité au nombre de soies : ce serait une PERTE de précision, pas un alignement.
//    → INV!CI71-73, CI79-81, CF64-67 et CF20 ne sont JAMAIS surchargés par la presse choisie.
//      La « mise en train » de la fiche presse ne sert que de contrôle de cohérence (affichée
//      à titre indicatif dans le bloc Sérigraphie), elle ne pilote rien.
//    Verrouillé par deux assertions dans test-machines.mjs (§10) — ne pas les contourner.
// Seul le ROULEMENT de la presse suit la vitesse machine (cf. lib/machines.ts).

export type MethodeCout = "temps" | "machine-rate";

/** ⇦ L'INTERRUPTEUR. "temps" = temps × CF8 (fidèle Excel) · "machine-rate" = temps × machine rate. */
export const METHODE_COUT: MethodeCout = "temps";

/** Taux horaire de base (INV!CF8) — REPLI seulement : hors Zoho, ou si Taux_Calcul ne répond pas.
 *  La valeur autoritaire est la ligne `INV_8` du formulaire Creator `Taux_Calcul`, lue au
 *  chargement et appliquée en surcharge. Passé de 73 à 74 $/h le 28 sept. 2026 pour que le
 *  repli corresponde à INV_8 ; changer INV_8 dans Creator ne demande PAS de recompiler. */
export const TAUX_HORAIRE_CLASSEUR = 74;

// ── Helpers : tout volet qui surcharge des cellules machine passe par ici ────
// Le classeur n'a que deux formes de cellule machine :
//   · CADENCE / VITESSE — le coût y est INVERSEMENT proportionnel (coût = qté × CF8 / cellule)
//     ex. CH9 (roulement), CH20-23 (platine), CF38-40 (Zund), CF70 (mode 1-6 coul.)
//   · TEMPS / SETUP (minutes) — le coût y est proportionnel (coût = cellule/60 × CF8)
//     ex. CI53 (mise en train Zund), CI54/56/60 (setups platine)
// Une nouvelle étape de production se branche donc sur l'interrupteur en appelant
// facteurCout() une fois, puis surchargeCadence() / surchargeTemps() sur ses cellules.

/** Facteur de méthode pour une machine donnée : 1 en mode temps, machine_rate/CF8 sinon.
 *  Une machine sans machine rate connu retombe sur le taux de base (facteur 1). */
export function facteurCout(tauxMachine: number | null | undefined, tauxHoraire = TAUX_HORAIRE_CLASSEUR): number {
  if (METHODE_COUT === "temps") return 1;
  const base = Number.isFinite(tauxHoraire) && tauxHoraire > 0 ? tauxHoraire : TAUX_HORAIRE_CLASSEUR;
  const rate = Number(tauxMachine);
  if (!Number.isFinite(rate) || rate <= 0) return 1;
  return rate / base;
}

/** Surcharge d'une cellule CADENCE/VITESSE (coût ∝ 1/valeur). */
export function surchargeCadence(valeur: number, facteur: number): number {
  return valeur / facteur;
}

/** Surcharge d'une cellule TEMPS/SETUP en minutes (coût ∝ valeur). */
export function surchargeTemps(valeur: number, facteur: number): number {
  return valeur * facteur;
}

/** Taux $/h à appliquer à un calcul direct en dollars (hors cellules du classeur) —
 *  ex. le comparatif Zund/Platine. Suit le même interrupteur. */
export function tauxOperation(tauxMachine: number | null | undefined, tauxHoraire = TAUX_HORAIRE_CLASSEUR): number {
  const base = Number.isFinite(tauxHoraire) && tauxHoraire > 0 ? tauxHoraire : TAUX_HORAIRE_CLASSEUR;
  return base * facteurCout(tauxMachine, base);
}
