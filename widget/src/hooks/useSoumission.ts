// État global de la soumission : { cellule → valeur saisie } + surcharges Creator.
// À chaque changement, le moteur recalcule tout le classeur (itératif, < 20 ms).
// Ordre d'application : surcharges Creator (prix/taux) < overrides popup Taux < machines
// choisies (presse/zund/platine) < prix directs < saisies utilisateur.
import { useMemo, useState, useCallback } from "react";
import { Moteur, type CellValue, type Classeur } from "@/lib/moteur";
import { entreesExemple, entreesVierges, normaliserEntrees } from "@/lib/modele";
import { construireParams, surchargesPrixDirect, type ParamsAppliques } from "@/lib/parametres";
import {
  fusionnerMachines,
  trouverMachine,
  surchargesMachines,
  surchargeMatrice,
  CELL_PRESSE,
  CELL_ZUND,
  CELL_PLATINE,
  CELL_LAMINOIR,
  CELL_SLITTER,
  CELL_GUILLOTINE,
  CELL_MATRICE,
} from "@/lib/machines";
import type { MachineCalc } from "@/data/machinesCalc";
import { TAUX_HORAIRE_CLASSEUR } from "@/lib/methodeCout";
import type { ParametresCreator, Machine } from "@/services/zohoService";
import classeurJson from "@/data/classeur.json";

export const CLASSEUR = classeurJson as unknown as Classeur;

/** Socle appliqué AVANT tout le reste : le cache INV embarqué dans classeur.json fige le taux
 *  horaire du master (73 $/h). Le taux courant est 74 $/h (28 sept. 2026) et la valeur
 *  autoritaire reste la ligne INV_8 de Taux_Calcul, qui écrase celle-ci dès que Creator répond. */
const SOCLE: Record<string, CellValue> = { "INV!CF8": TAUX_HORAIRE_CLASSEUR };

export interface Soumission {
  entrees: Record<string, CellValue>;
  set: (cell: string, v: CellValue) => void;
  unset: (cell: string) => void;
  reset: (mode: "vierge" | "exemple") => void;
  moteur: Moteur;
  val: (cell: string) => CellValue;
  num: (cell: string) => number;
  saisie: (cell: string) => CellValue;
  /** paramètres vivants Creator (null = snapshot embarqué) */
  params: ParamsAppliques | null;
  setParametres: (p: ParametresCreator) => void;
  /** surcharges de cellules taux/paramètres appliquées depuis le popup (priment sur params.surcharges) */
  overridesTaux: Record<string, CellValue>;
  appliquerOverrideTaux: (cell: string, v: CellValue) => void;
  /** machines sélectionnables (fusion Fiche_Machine Creator + snapshot Artistic CG) */
  machinesCalc: MachineCalc[];
  setMachinesCreator: (machines: Machine[] | null) => void;
  /** machine actuellement choisie par famille (null = comportement classeur/gabarit) */
  presseChoisie: MachineCalc | null;
  zundChoisi: MachineCalc | null;
  platineChoisie: MachineCalc | null;
  laminoirChoisi: MachineCalc | null;
  slitterChoisi: MachineCalc | null;
  guillotineChoisie: MachineCalc | null;
  /** surcharges de cellules induites par les machines choisies (réutilisées par les simulations) */
  surchargesMach: Record<string, CellValue>;
  /** restaure l'état complet depuis le JSON Donnees d'une soumission enregistrée */
  chargerDonnees: (json: string) => boolean;
}

export function useSoumission(): Soumission {
  const moteur = useMemo(() => new Moteur(CLASSEUR), []);
  const [entrees, setEntrees] = useState<Record<string, CellValue>>(() => entreesExemple(CLASSEUR));
  const [params, setParams] = useState<ParamsAppliques | null>(null);
  const [overridesTaux, setOverridesTaux] = useState<Record<string, CellValue>>({});
  const [machinesCalc, setMachinesCalc] = useState<MachineCalc[]>(() => fusionnerMachines(null));

  const appliquerOverrideTaux = useCallback((cell: string, v: CellValue) => {
    setOverridesTaux((prev) => ({ ...prev, [cell]: v }));
  }, []);

  const set = useCallback((cell: string, v: CellValue) => {
    setEntrees((prev) => ({ ...prev, [cell]: v }));
  }, []);

  /** retire une entrée (ex. ligne de quantité ajoutée) */
  const unset = useCallback((cell: string) => {
    setEntrees((prev) => {
      const next = { ...prev };
      delete next[cell];
      return next;
    });
  }, []);

  const reset = useCallback(
    (mode: "vierge" | "exemple") => {
      setEntrees(mode === "vierge" ? entreesVierges(params?.defauts) : entreesExemple(CLASSEUR));
    },
    [params],
  );

  const setParametres = useCallback((p: ParametresCreator) => {
    setParams(construireParams(p));
  }, []);

  const setMachinesCreator = useCallback((machines: Machine[] | null) => {
    setMachinesCalc(fusionnerMachines(machines));
  }, []);

  const chargerDonnees = useCallback((json: string) => {
    try {
      const obj = JSON.parse(json) as Record<string, CellValue>;
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
      // uniquement des paires cellule → valeur scalaire (le format écrit par « Enregistrer »)
      const entrees: Record<string, CellValue> = {};
      for (const [cell, v] of Object.entries(obj)) {
        if (!/^(S|C|FT|INV|X)!/.test(cell)) continue;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") entrees[cell] = v;
      }
      if (!Object.keys(entrees).length) return false;
      // anciennes soumissions : F/S vides, « Cont. » saisi en quantité… → état accepté par les formules
      setEntrees(normaliserEntrees(entrees));
      return true;
    } catch {
      return false;
    }
  }, []);

  // machines choisies (rangées dans les entrées comme pseudo-cellules → persistées dans Donnees)
  const presseChoisie = useMemo(
    () => trouverMachine(machinesCalc, "presse", String(entrees[CELL_PRESSE] ?? "")),
    [machinesCalc, entrees],
  );
  const zundChoisi = useMemo(
    () => trouverMachine(machinesCalc, "zund", String(entrees[CELL_ZUND] ?? "")),
    [machinesCalc, entrees],
  );
  const platineChoisie = useMemo(
    () => trouverMachine(machinesCalc, "platine", String(entrees[CELL_PLATINE] ?? "")),
    [machinesCalc, entrees],
  );
  // finition matière
  const laminoirChoisi = useMemo(
    () => trouverMachine(machinesCalc, "laminoir", String(entrees[CELL_LAMINOIR] ?? "")),
    [machinesCalc, entrees],
  );
  const slitterChoisi = useMemo(
    () => trouverMachine(machinesCalc, "slitter", String(entrees[CELL_SLITTER] ?? "")),
    [machinesCalc, entrees],
  );
  const guillotineChoisie = useMemo(
    () => trouverMachine(machinesCalc, "guillotine", String(entrees[CELL_GUILLOTINE] ?? "")),
    [machinesCalc, entrees],
  );
  const surchargesMach = useMemo(() => {
    // taux horaire base courant (INV!CF8) — surchargeable via Taux_Calcul / popup Taux
    const cf8 = Number(overridesTaux["INV!CF8"] ?? params?.surcharges?.["INV!CF8"] ?? SOCLE["INV!CF8"]);
    // nb de couleurs du job (S!E3) : sert à ramener en passes/h une presse en ligne
    const couleurs = Number(entrees["S!E3"] ?? moteur.num("S!E3"));
    return {
      ...surchargesMachines(
        {
          presse: presseChoisie,
          zund: zundChoisi,
          platine: platineChoisie,
          laminoir: laminoirChoisi,
          slitter: slitterChoisi,
          guillotine: guillotineChoisie,
        },
        Number.isFinite(cf8) && cf8 > 0 ? cf8 : TAUX_HORAIRE_CLASSEUR,
        Number.isFinite(couleurs) && couleurs >= 1 ? couleurs : 1,
      ),
      ...surchargeMatrice(entrees[CELL_MATRICE]),
    };
  }, [presseChoisie, zundChoisi, platineChoisie, laminoirChoisi, slitterChoisi, guillotineChoisie, entrees, overridesTaux, params, moteur]);

  // recalcul synchronisé sur l'état
  useMemo(() => {
    moteur.setInputs({
      ...SOCLE,
      ...(params?.surcharges ?? {}),
      ...overridesTaux,
      ...surchargesMach,
      ...surchargesPrixDirect(entrees, params),
      ...entrees,
    });
    moteur.calculer();
  }, [moteur, entrees, params, overridesTaux, surchargesMach]);

  const val = useCallback((cell: string) => moteur.val(cell), [moteur, entrees, params, overridesTaux, surchargesMach]); // eslint-disable-line react-hooks/exhaustive-deps
  const num = useCallback((cell: string) => moteur.num(cell), [moteur, entrees, params, overridesTaux, surchargesMach]); // eslint-disable-line react-hooks/exhaustive-deps
  const saisie = useCallback((cell: string) => entrees[cell] ?? "", [entrees]);

  return {
    entrees,
    set,
    unset,
    reset,
    moteur,
    val,
    num,
    saisie,
    params,
    setParametres,
    overridesTaux,
    appliquerOverrideTaux,
    machinesCalc,
    setMachinesCreator,
    presseChoisie,
    zundChoisi,
    platineChoisie,
    laminoirChoisi,
    slitterChoisi,
    guillotineChoisie,
    surchargesMach,
    chargerDonnees,
  };
}

// moteur dédié aux simulations (réutilisé — le parse des 1300 formules ne se fait qu'une fois)
let simMoteur: Moteur | null = null;

/** Recalcule le classeur dans le contexte exact du calcul principal (surcharges Creator,
 *  taux du popup, machines choisies, prix directs), avec des entrées modifiées. Sert aux
 *  simulations de quantité et au comparatif Zund / Platine — un seul moteur, jamais de
 *  formule parallèle. Retourne le moteur calculé (à lire immédiatement : il est partagé). */
export function simulerScenario(
  entrees: Record<string, CellValue>,
  params: ParamsAppliques | null,
  surcharges: Record<string, CellValue>,
  modifs: Record<string, CellValue>,
): Moteur {
  const m = (simMoteur ??= new Moteur(CLASSEUR));
  const e = { ...entrees, ...modifs };
  m.setInputs({
    ...SOCLE,
    ...(params?.surcharges ?? {}),
    ...surcharges,
    ...surchargesPrixDirect(e, params),
    ...e,
  });
  m.calculer();
  return m;
}

/** Simule la soumission pour une autre quantité (table QTÉ / PRIX / VENDU / US).
 *  `surcharges` : overrides additionnels (taux du popup + machines choisies) pour que la
 *  simulation reproduise exactement le contexte du calcul principal. */
export function simulerQuantite(
  entrees: Record<string, CellValue>,
  qte: number,
  params: ParamsAppliques | null = null,
  surcharges: Record<string, CellValue> = {},
): { cout: number; prix: number; vendu: number; us: number } {
  const m = simulerScenario(entrees, params, surcharges, { "S!E2": qte });
  // `cout` et `prix` sont DEUX valeurs distinctes, et il faut qu'elles le restent : le contrat
  // client expose les deux séparément (cout_unitaire / prix_unitaire). Les confondre
  // enverrait le prix à la place du coût sans qu'aucune erreur n'apparaisse.
  const cout = m.num("S!W12"); // coût de revient total pour cette quantité
  // La colonne PRIX affiche le PRIX UNITAIRE, facteur appliqué — la même valeur que
  // « Prix Unitaire » de la carte de prix (S!W15), et non le coût unitaire.
  //
  // On lit la cellule du moteur plutôt que de calculer `coût × (1 + facteur)` : dès qu'il y a
  // un sous-contrat, les deux diffèrent. Le classeur fait W14 = W12×(1+W13) + W61, le
  // sous-contrat portant sa propre marge de 35 %. La formule naïve serait juste sans
  // sous-contrat et fausse avec — silencieusement.
  const unit = m.num("S!W15"); // prix vendant unitaire, facteur compris
  const us = m.num("S!W16");
  return { cout: qte > 0 ? cout / qte : 0, prix: unit, vendu: unit, us };
}
