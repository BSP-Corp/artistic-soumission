// Contrôles de validation d'une soumission (réunions du 6 et du 13 août, handoff du 15 sept.).
//
// Trois familles, toutes calculées SANS toucher au moteur :
//   · confirmations  — un élément manque (adhésif, matériau, coupe, encre) : le chargé de
//                      projet répond oui/non. « Oui » pose le drapeau « SANS » du classeur
//                      (S!I11-14), qui lève le verrou correspondant (C!R60-63) ;
//   · bloquants      — format incompatible, prix ou quantité à zéro, indicateur > 1 :
//                      la validation refuse tant que ce n'est pas corrigé ;
//   · le tout listé dans l'ordre du formulaire — jamais trié par gravité, chaque alerte
//                      est revue une par une.
//
// Ces règles remplacent le « mettre un 1 dans I-10 » du classeur Excel.

import type { CellValue, Moteur } from "./moteur";
import { IN, OUT, VERROUS_MATERIAUX, XTRA_PLACEHOLDER } from "./modele";
import { alertesRegles, manquantsPrix, CONSEIL_ELEMENT, LIBELLE_ELEMENT, REGLES_DEFAUT, type RegleMateriau } from "./reglesMateriaux";
import type { MachineCalc } from "@/data/machinesCalc";

export type Controle =
  | { type: "confirmation"; cle: string; message: string; conseil: string; drapeau: string }
  | { type: "bloquant"; cle: string; message: string; conseil?: string }
  /** rappel non bloquant : s'affiche dans la liste, n'empêche jamais la validation */
  | { type: "info"; cle: string; message: string; conseil?: string };

export interface MachinesChoisies {
  presse: MachineCalc | null;
  zund: MachineCalc | null;
  platine: MachineCalc | null;
}

const n = (v: CellValue): number => {
  if (v === "" || v === undefined || v === null) return 0;
  const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: CellValue) => String(v ?? "").trim();

/** `a × b` tient dans `A × B`, rotation permise. */
export function tient(a: number, b: number, A: number, B: number): boolean {
  return (a <= A && b <= B) || (a <= B && b <= A);
}

// ── 3.1 alertes matériaux : confirmation oui / non ──────────────────────────
// Deux sources, fusionnées par élément :
//   · les RÈGLES par matériau (lib/reglesMateriaux.ts, paramétrables dans Creator) — strictes ;
//   · les verrous du classeur (C!Q60-63) — plus laxistes, mais ce sont eux qui mettent le prix
//     unitaire à zéro : s'ils sont fermés sans qu'une règle l'ait dit, on le signale quand même.
export function controlesMateriaux(m: Moteur, e: Record<string, CellValue>, regles: RegleMateriau[] = REGLES_DEFAUT): Controle[] {
  const out: Controle[] = alertesRegles(m, e, regles);
  const couverts = new Set(out.map((c) => c.cle.replace(/^regle-/, "")));
  for (const v of VERROUS_MATERIAUX) {
    if (couverts.has(v.cle)) continue;
    const present = m.num(v.verrou) >= 1;
    const accepte = n(e[v.drapeau]) >= 1;
    if (!present && !accepte) {
      out.push({ type: "confirmation", cle: v.cle, message: v.question, conseil: v.conseil, drapeau: v.drapeau });
    }
  }
  return out;
}

// ── 3.2 format : la feuille accepte la pièce, la machine accepte la feuille ──
export function controlesFormat(e: Record<string, CellValue>, mach: MachinesChoisies): Controle[] {
  const out: Controle[] = [];
  const px = n(e[IN.dimPceX]), py = n(e[IN.dimPceY]);
  const fx = n(e[IN.dimMrxX]), fy = n(e[IN.dimMrxY]);

  if (!px || !py) {
    // C!Q64 : sans dimension de pièce le classeur refuse le prix unitaire
    out.push({ type: "bloquant", cle: "piece", message: "Dimensions de la pièce manquantes.", conseil: "Renseignez « Dim. Pce » (X × Y, en pouces)." });
  } else if (fx && fy && !tient(px, py, fx, fy)) {
    out.push({
      type: "bloquant",
      cle: "piece-feuille",
      message: `La pièce ${px} × ${py} po ne tient pas dans la feuille ${fx} × ${fy} po.`,
      conseil: "Agrandissez « Dim. Mrx » ou réduisez la pièce.",
    });
  }

  if (fx && fy) {
    const familles: [string, MachineCalc | null][] = [
      ["presse", mach.presse],
      ["platine", mach.platine],
      ["Zund", mach.zund],
    ];
    for (const [famille, mc] of familles) {
      if (!mc || !mc.largeurPo || !mc.hauteurPo) continue; // fiche sans format max : pas de contrôle
      if (!tient(fx, fy, mc.largeurPo, mc.hauteurPo)) {
        out.push({
          type: "bloquant",
          cle: "feuille-" + famille,
          message: `La feuille ${fx} × ${fy} po dépasse le format max de la ${famille} ${mc.nom} (${mc.largeurPo} × ${mc.hauteurPo} po).`,
          conseil: "Choisissez une autre machine ou réduisez le format.",
        });
      }
    }
  }
  return out;
}

// ── 3.3 jamais de prix à zéro ───────────────────────────────────────────────
const LIGNES_MATERIAU: [string, string, string][] = [
  ["Lexan", IN.matLexan, OUT.montLexan],
  ["Vinyle", IN.matVinyle, OUT.montVinyle],
  ["Polyester", IN.matPolyester, OUT.montPolyester],
  ["Alu. Foil", IN.matAluFoil, OUT.montAluFoil],
  ["Divers", IN.matDivers, OUT.montDivers],
  ["Adhésif F/R", IN.matAdhesif, OUT.montAdhesif],
  ["Overlaminating", IN.matOverlam, OUT.montOverlam],
  ["Xtra 1", IN.matXtra1, OUT.montXtra1],
  ["Xtra 2", IN.matXtra2, OUT.montXtra2],
  ["Xtra 3", IN.matXtra3, OUT.montXtra3],
  ["Xtra 4", IN.matXtra4, OUT.montXtra4],
];
const LIGNES_FOURNISSEUR: [string, string, string][] = [
  ["Fournisseur 1", IN.fourn1, IN.sc1Cout],
  ["Fournisseur 2", IN.fourn2, IN.sc2Cout],
  ["Fournisseur 3", IN.fourn3, IN.sc3Cout],
  ["Fournisseur 4", IN.fourn4, IN.sc4Cout],
];
/** opérations « quantité + taux » : une quantité (l'interrupteur « 1 ») sans taux = prix à zéro.
 *  L'inverse (taux sans quantité) n'est pas une erreur : ce sont les taux par défaut du classeur,
 *  pré-remplis sur toute soumission vierge — l'opération n'a simplement pas lieu. */
const PAIRES_FINITION: [string, string, string][] = [
  ["Guillotine", IN.guillotineQte, IN.guillotineTaux],
  ["Assemblage", IN.assemblageQte, IN.assemblageTaux],
  ["Autres (découpe)", IN.autresDecoupeQte, IN.autresDecoupeTaux],
  ["Décorticage", IN.decorticageQte, IN.decorticageTaux],
  ["Autres 1", IN.autres1Qte, IN.autres1A],
  ["Autres 2", IN.autres2Qte, IN.autres2A],
  ["Vérification / comptage", IN.verifQte, IN.verifTaux],
  ["Emballage", IN.emballageQte, IN.emballageTaux],
];

export function controlesPrixZero(m: Moteur, e: Record<string, CellValue>): Controle[] {
  const out: Controle[] = [];
  for (const [libelle, nom, mont] of LIGNES_MATERIAU) {
    const nomSaisi = txt(e[nom]);
    if (!nomSaisi || (XTRA_PLACEHOLDER as readonly string[]).includes(nomSaisi)) continue;
    if (m.num(mont) <= 0) {
      out.push({
        type: "bloquant",
        cle: "mat-" + libelle,
        message: `${libelle} « ${nomSaisi} » : montant à zéro.`,
        conseil: "Prix pi² inconnu pour ce matériau ou quantité nulle — vérifiez le prix (Xtra : saisissez le coût pi²) et la quantité.",
      });
    }
  }
  for (const [libelle, fourn, cout] of LIGNES_FOURNISSEUR) {
    if (txt(e[fourn]) && n(e[cout]) <= 0) {
      out.push({
        type: "bloquant",
        cle: "sc-" + libelle,
        message: `${libelle} « ${txt(e[fourn])} » : coût à zéro.`,
        conseil: "Saisissez le coût du sous-contrat.",
      });
    }
  }
  for (const [libelle, qte, taux] of PAIRES_FINITION) {
    if (n(e[qte]) > 0 && n(e[taux]) <= 0) {
      out.push({
        type: "bloquant",
        cle: "fin-" + libelle,
        message: `${libelle} : opération activée sans taux (prix à zéro).`,
        conseil: "Saisissez le taux de la ligne, ou retirez la quantité.",
      });
    }
  }
  return out;
}

// ── garde du classeur : aucun indicateur ne doit dépasser 1 (C!T84, rangées 66-84) ──
// Les colonnes « qté » des finitions en font partie : dans le classeur ce sont des
// interrupteurs (1 = l'opération a lieu), le tarif est dans la colonne « taux ».
const INDICATEURS: [string, string][] = [
  ["Séparateur (1)", IN.separateur1],
  ["Séparateur (2)", IN.separateur2],
  ["Recto / Verso (2)", IN.rectoVerso2],
  ["Sans vinyle / UV", IN.sansUv],
  ["HPPL", IN.hppl],
  ["Multiprint", IN.multiprint],
  ["Numérique multi-up", IN.numeriqueMultiUp],
  ["Protecteur fenêtre", IN.protecteurFenetre],
  ["Guillotine (qté)", IN.guillotineQte],
  ["Assemblage (qté)", IN.assemblageQte],
  ["Autres découpe (qté)", IN.autresDecoupeQte],
  // décorticage / vérification / emballage sont désormais des cases à cocher (§5) : la valeur
  // ne peut plus dépasser 1, inutile de la contrôler ici
  ["Impression laser (qté)", IN.laserQte],
  ["Autres 1 (qté)", IN.autres1Qte],
  ["Autres 2 (qté)", IN.autres2Qte],
  ["Fini brillant", IN.brillant],
  ["Fini mat", IN.mat_],
];
export function controlesIndicateurs(e: Record<string, CellValue>): Controle[] {
  return INDICATEURS.filter(([, cell]) => n(e[cell]) > 1).map(([libelle, cell]) => ({
    type: "bloquant" as const,
    cle: "ind-" + cell,
    message: `${libelle} : valeur ${n(e[cell])} — cet indicateur vaut 1 ou vide.`,
    conseil: "Le classeur met le prix unitaire à zéro dès qu'un indicateur dépasse 1.",
  }));
}

// ── §2 / §6b : ce qui manque pour que le PRIX UNITAIRE soit affichable ──────
// Tant que cette liste n'est pas vide, le widget masque le prix unitaire (« À vérifier avant
// d'obtenir le prix ») : on ne donne pas un prix au client sur une fiche incomplète.
export function controlesPrix(m: Moteur, e: Record<string, CellValue>, regles: RegleMateriau[] = REGLES_DEFAUT): Controle[] {
  return manquantsPrix(m, e, regles).map(({ element, materiaux }) => {
    const message = `Prix non validé — ${materiaux.join(", ")} exige ${LIBELLE_ELEMENT[element]}.`;
    const v = VERROUS_MATERIAUX.find((x) => x.cle === element);
    // Un élément qui a un drapeau « SANS » reste décidable : sinon une règle de prix sans
    // alerte correspondante (ex. Vinyle exige une coupe) n'aurait aucune issue.
    return v
      ? { type: "confirmation" as const, cle: "prix-" + element, message: message + " Vous acceptez de ne pas en mettre ?", conseil: CONSEIL_ELEMENT[element], drapeau: v.drapeau }
      : { type: "bloquant" as const, cle: "prix-" + element, message, conseil: CONSEIL_ELEMENT[element] };
  });
}

/** §4 — rappel de double vérification au-delà d'un montant. Jamais bloquant. */
export const SEUIL_DOUBLE_CHECK_DEFAUT = 4000;
export function controleDoubleCheck(m: Moteur, seuil = SEUIL_DOUBLE_CHECK_DEFAUT): Controle[] {
  const total = m.num(OUT.total);
  if (!(seuil > 0) || total < seuil) return [];
  return [
    {
      type: "info",
      cle: "double-check",
      message: `Soumission de ${Math.round(total).toLocaleString("fr-CA")} $ — as-tu demandé à un collègue de double-checker ta soumission ?`,
      conseil: `Rappel au-delà de ${Math.round(seuil).toLocaleString("fr-CA")} $ (paramètre APP_SEUIL_DOUBLE_CHECK de Taux_Calcul). N'empêche pas la validation.`,
    },
  ];
}

/** Tous les contrôles, dans l'ordre du formulaire. */
export function controlesSoumission(
  m: Moteur,
  e: Record<string, CellValue>,
  mach: MachinesChoisies,
  regles: RegleMateriau[] = REGLES_DEFAUT,
  seuilDoubleCheck = SEUIL_DOUBLE_CHECK_DEFAUT,
): Controle[] {
  const prix = controlesPrix(m, e, regles);
  const materiaux = controlesMateriaux(m, e, regles);
  // une même exigence peut sortir des deux tables : on ne la montre qu'une fois, en gardant
  // la version « alerte » (elle porte la question oui/non et le drapeau à poser)
  const dejaVus = new Set(materiaux.map((c) => c.cle.replace(/^regle-/, "")));
  return [
    ...controlesFormat(e, mach),
    ...controlesIndicateurs(e),
    ...materiaux,
    ...prix.filter((c) => !dejaVus.has(c.cle.replace(/^prix-/, ""))),
    ...controlesPrixZero(m, e),
    ...controleDoubleCheck(m, seuilDoubleCheck),
  ];
}
