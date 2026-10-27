// Comparatif « Zund ou platine ? » calculé par le VRAI moteur (handoff du 15 sept., corr. 4).
//
// L'ancien comparatif (lib/machines.ts : coutZund / coutPlatine) avait sa propre petite
// formule : vitesse de base de la fiche, mise en train de la fiche, pas de perte. Ses
// chiffres ne collaient donc jamais au récap de la soumission, qui suit le classeur
// (vitesses par nombre de Up INV!CF38/39/40, mise en train CI53, perte S!I2…).
//
// Ici on fait tourner le classeur deux fois avec les mêmes entrées :
//   · scénario Zund     — drapeaux platine vidés, mêmes opérations cochées côté Zund ;
//   · scénario platine  — drapeaux Zund vidés, mêmes opérations côté platine, Up = S!E5.
// Le coût affiché d'une famille = les deux postes de découpe du récap (rangée 61) dans ce
// scénario : SET-UP DÉCOUPE (S!G61 ← C!Q11) + DÉCOUPE / NUMÉRIQUE (S!O61 ← C!J30). C'est
// exactement ce que la soumission facture quand cette famille est sélectionnée — vérifiable au
// centime en survolant les deux postes du récap (corr. 4 bis : qté 100, coupe Zund → 49,69 $).
// (Un delta de coût de revient S!W12 « avec / sans découpe » donnait un chiffre intermédiaire,
// pollué par les effets indirects du temps total.) Aucune formule parallèle à maintenir.
//
// Base machine : la machine SÉLECTIONNÉE de la famille si elle l'est (le chiffre égale alors le
// récap), sinon la meilleure des fiches actives — et, à défaut de fiche, la générique du classeur.

import type { CellValue } from "./moteur";
import { IN, OUT } from "./modele";
import { machinesFamille, surchargesMachines, surchargeMatrice, CELL_MATRICE } from "./machines";
import { simulerScenario } from "@/hooks/useSoumission";
import type { ParamsAppliques } from "./parametres";
import type { MachineCalc } from "@/data/machinesCalc";

export interface ScenarioDecoupe {
  /** null = machine générique du classeur (aucune fiche active dans la famille) */
  machine: MachineCalc | null;
  /** set-up découpe + découpe/numérique du récap, dans ce scénario ($) */
  total: number;
  setup: number;
  decoupe: number;
  minutes: number;
  /** true si c'est la machine actuellement sélectionnée dans la soumission */
  selectionnee: boolean;
}

export interface ComparatifMoteur {
  zund: ScenarioDecoupe | null;
  platine: ScenarioDecoupe | null;
  /** quantité de bascule (première quantité où l'autre famille devient moins chère), null si un type domine */
  bascule: number | null;
  /** opérations comparées (adhésif / coupe / kiss-cut), déduites des cases cochées */
  operations: string[];
}

export interface ContexteComparatif {
  entrees: Record<string, CellValue>;
  params: ParamsAppliques | null;
  overridesTaux: Record<string, CellValue>;
  machinesCalc: MachineCalc[];
  /** machines choisies hors découpe — conservées telles quelles dans les deux scénarios */
  autres: { presse: MachineCalc | null; laminoir: MachineCalc | null; slitter: MachineCalc | null; guillotine: MachineCalc | null };
  /** machines de découpe sélectionnées dans la soumission (null = générique du classeur) */
  zundChoisi: MachineCalc | null;
  platineChoisie: MachineCalc | null;
  cf8: number;
  couleurs: number;
}

type Op = "adhesif" | "coupe" | "kisscut";
const OPS: { op: Op; libelle: string; zundC: string; zundO: string; platDie: string; platUp: string }[] = [
  { op: "adhesif", libelle: "adhésif", zundC: IN.zundAdhesifC, zundO: IN.zundAdhesifO, platDie: IN.platAdhesifDie, platUp: IN.platAdhesifUp },
  { op: "coupe", libelle: "coupe", zundC: IN.zundCoupeC, zundO: IN.zundCoupeO, platDie: IN.platCoupeDie, platUp: IN.platCoupeUp },
  { op: "kisscut", libelle: "kiss-cut", zundC: IN.zundKisscutC, zundO: IN.zundKisscutO, platDie: IN.platKisscutDie, platUp: IN.platKisscutUp },
];
const CELLS_ZUND = [IN.zundAdhesifC, IN.zundAdhesifO, IN.zundCoupeC, IN.zundCoupeO, IN.zundKisscutC, IN.zundKisscutO, IN.ajustZund];
const CELLS_PLAT = [
  IN.platAdhesifDie, IN.platAdhesifUp, IN.platCoupeDie, IN.platCoupeUp, IN.platKisscutDie, IN.platKisscutUp,
  IN.platEmbossageDie, IN.platEmbossageUp, IN.ajustPlatine,
];

const n = (v: CellValue) => {
  const x = Number(v === "" || v === undefined ? 0 : v);
  return Number.isFinite(x) ? x : 0;
};

/** opérations demandées : celles cochées d'un côté ou de l'autre ; « coupe » par défaut */
export function operationsDemandees(e: Record<string, CellValue>): Op[] {
  const ops = OPS.filter((o) => n(e[o.zundC]) >= 1 || n(e[o.platDie]) > 0).map((o) => o.op);
  return ops.length ? ops : ["coupe"];
}

function vider(cells: string[]): Record<string, CellValue> {
  const m: Record<string, CellValue> = {};
  for (const c of cells) m[c] = "";
  return m;
}

/** entrées du scénario Zund : platine vidée, opérations cochées côté Zund (Cut O conservé) */
function entreesZund(e: Record<string, CellValue>, ops: Op[]): Record<string, CellValue> {
  const m: Record<string, CellValue> = { ...vider(CELLS_PLAT), [IN.ajustZund]: e[IN.ajustZund] ?? 0 };
  for (const o of OPS) {
    m[o.zundC] = ops.includes(o.op) ? 1 : "";
    m[o.zundO] = ops.includes(o.op) ? e[o.zundO] ?? "" : "";
  }
  return m;
}

/** entrées du scénario platine : Zund vidé, un die par opération, Up = nombre de Up (S!E5) */
function entreesPlatine(e: Record<string, CellValue>, ops: Op[]): Record<string, CellValue> {
  const up = Math.max(1, n(e[IN.nbUp]));
  const m: Record<string, CellValue> = { ...vider(CELLS_ZUND), [IN.ajustPlatine]: e[IN.ajustPlatine] ?? 0 };
  for (const o of OPS) {
    m[o.platDie] = ops.includes(o.op) ? 1 : "";
    m[o.platUp] = ops.includes(o.op) ? up : "";
  }
  // l'embossage n'existe que sur platine : conservé tel quel dans ce scénario
  m[IN.platEmbossageDie] = e[IN.platEmbossageDie] ?? "";
  m[IN.platEmbossageUp] = e[IN.platEmbossageUp] ?? "";
  return m;
}

interface Postes {
  total: number;
  setup: number;
  decoupe: number;
  minutes: number;
}

function coutScenario(
  ctx: ContexteComparatif,
  machines: { zund: MachineCalc | null; platine: MachineCalc | null },
  modifs: Record<string, CellValue>,
  qte: number,
): Postes {
  const surch = {
    ...ctx.overridesTaux,
    ...surchargesMachines({ ...ctx.autres, ...machines }, ctx.cf8, ctx.couleurs),
    ...surchargeMatrice(ctx.entrees[CELL_MATRICE]),
  };
  const m = simulerScenario(ctx.entrees, ctx.params, surch, { ...modifs, [IN.quantite]: qte });
  const setup = m.num(OUT.cat3Setup);
  const decoupe = m.num(OUT.cat5Dec);
  const minutes = m.num(OUT.cat3Hrs) * 60 + m.num(OUT.cat3Min) + m.num(OUT.cat5Hrs) * 60 + m.num(OUT.cat5Min);
  return { total: setup + decoupe, setup, decoupe, minutes };
}

export function comparerParMoteur(ctx: ContexteComparatif): ComparatifMoteur | null {
  const e = ctx.entrees;
  const qte = n(e[IN.quantite]);
  if (!qte) return null;
  const ops = operationsDemandees(e);

  // candidats par famille : la machine sélectionnée seule, sinon les fiches actives, sinon la générique
  const candidats = (famille: "zund" | "platine", choisie: MachineCalc | null): (MachineCalc | null)[] => {
    if (choisie) return [choisie];
    const fiches = machinesFamille(ctx.machinesCalc, famille);
    return fiches.length ? fiches : [null];
  };

  const evalZund = (mc: MachineCalc | null, q: number) => coutScenario(ctx, { zund: mc, platine: null }, entreesZund(e, ops), q);
  const evalPlat = (mc: MachineCalc | null, q: number) => coutScenario(ctx, { zund: null, platine: mc }, entreesPlatine(e, ops), q);

  const meilleur = (liste: ScenarioDecoupe[]) =>
    liste.reduce<ScenarioDecoupe | null>((b, r) => (b === null || r.total < b.total ? r : b), null);
  const scenario = (mc: MachineCalc | null, p: Postes, choisie: MachineCalc | null): ScenarioDecoupe => ({
    machine: mc,
    ...p,
    selectionnee: !!mc && mc === choisie,
  });

  const zund = meilleur(candidats("zund", ctx.zundChoisi).map((mc) => scenario(mc, evalZund(mc, qte), ctx.zundChoisi)));
  const platine = meilleur(candidats("platine", ctx.platineChoisie).map((mc) => scenario(mc, evalPlat(mc, qte), ctx.platineChoisie)));

  // bascule : grille géométrique puis bissection, sur les deux machines retenues
  let bascule: number | null = null;
  if (zund && platine) {
    const signe = (q: number) => Math.sign(evalZund(zund.machine, q).total - evalPlat(platine.machine, q).total);
    const grille = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000];
    let prev = signe(grille[0]);
    for (let i = 1; i < grille.length && bascule === null; i++) {
      const s = signe(grille[i]);
      if (s !== prev && s !== 0 && prev !== 0) {
        let lo = grille[i - 1], hi = grille[i];
        while (hi - lo > 1) {
          const mid = Math.round((lo + hi) / 2);
          if (signe(mid) === prev) lo = mid;
          else hi = mid;
        }
        bascule = hi;
      }
      if (s !== 0) prev = s;
    }
  }
  return { zund, platine, bascule, operations: ops.map((o) => OPS.find((x) => x.op === o)!.libelle) };
}
