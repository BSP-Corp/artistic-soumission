// Valeurs d'une soumission que cet écran ne montre pas.
//
// Une soumission ouverte garde TOUTES ses cellules et le moteur les chiffre, y compris celles qui
// n'ont pas de case ici (platine kiss-cut, slit, pertes…). Le prix est donc juste, mais personne
// ne voit ce qui le compose ni ne peut le corriger. Ce contrôle ne connaît aucune liste de champs
// manquants : il compare les cellules de la soumission à celles réellement affichées (lues dans la
// page). Un champ ajouté ou retiré de l'écran demain est pris en compte sans rien changer ici.
import type { CellValue } from "@/lib/moteur";
import { IN } from "@/lib/modele";
import { CELL_GUILLOTINE, CELL_LAMINOIR, CELL_MATRICE, CELL_PLATINE, CELL_SLITTER, CELL_ZUND } from "@/lib/machines";

type Entrees = Record<string, CellValue>;

/** Choix de machine : ils changent le prix sans passer par une cellule du classeur. */
const MACHINES: Record<string, string> = {
  [CELL_ZUND]: "Zünd choisi",
  [CELL_PLATINE]: "Platine choisie",
  [CELL_LAMINOIR]: "Laminoir choisi",
  [CELL_SLITTER]: "Slitter choisi",
  [CELL_GUILLOTINE]: "Guillotine choisie",
  [CELL_MATRICE]: "Matrice choisie",
};

/** Noms lisibles. Une cellule absente d'ici est quand même signalée, sous son adresse. */
const LIBELLES: Record<string, string> = {
  [IN.sansUv]: "Sans UV",
  [IN.hppl]: "HPPL",
  [IN.texture]: "Texture",
  [IN.ajustImpr]: "Ajustement impression",
  [IN.argentClavier]: "Argent clavier",
  [IN.sansAdhesif]: "Sans adhésif",
  [IN.sansMateriau]: "Sans matériau",
  [IN.sansCoupe]: "Sans coupe",
  [IN.sansEncre]: "Sans encre",
  [IN.multiprint]: "Multiprint",
  [IN.numeriqueMultiUp]: "Numérique multi-up",
  [IN.overLaminating]: "Over laminating",
  [IN.overLaminatingB]: "Over laminating",
  [IN.premaskStd]: "Premask standard",
  [IN.protecteur]: "Protecteur",
  [IN.protecteurFenetre]: "Protecteur fenêtre",
  [IN.protecteurFenetreB]: "Protecteur fenêtre",
  [IN.slit]: "Slit",
  [IN.guillotineTaux]: "Guillotine, temps",
  [IN.assemblageQte]: "Assemblage",
  [IN.assemblageTaux]: "Assemblage",
  [IN.autresDecoupeQte]: "Autres (découpe)",
  [IN.autresDecoupeTaux]: "Autres (découpe)",
  [IN.platAdhesifDie]: "Platine, adhésif",
  [IN.platAdhesifUp]: "Platine, adhésif",
  [IN.platKisscutDie]: "Platine, kiss-cut",
  [IN.platKisscutUp]: "Platine, kiss-cut",
  [IN.platEmbossageDie]: "Platine, embossage",
  [IN.platEmbossageUp]: "Platine, embossage",
  [IN.ajustPlatine]: "Ajustement platine",
  [IN.zundAdhesifC]: "Zünd, adhésif",
  [IN.zundAdhesifO]: "Zünd, adhésif",
  [IN.zundCoupeO]: "Zünd, coupe (cut-out)",
  [IN.zundKisscutO]: "Zünd, kiss-cut (cut-out)",
  [IN.ajustZund]: "Ajustement Zünd",
  [IN.decorticageQte]: "Décorticage",
  [IN.decorticageTaux]: "Décorticage",
  [IN.laserQte]: "Laser",
  [IN.laserAjust]: "Laser",
  [IN.autres1Qte]: "Autres 1 (finition)",
  [IN.autres1Label]: "Autres 1 (finition)",
  [IN.autres2Qte]: "Autres 2 (finition)",
  [IN.autres2Label]: "Autres 2 (finition)",
  [IN.verifQte]: "Vérification",
  [IN.verifTaux]: "Vérification",
  [IN.emballageQte]: "Emballage",
  [IN.emballageTaux]: "Emballage",
  [IN.matXtra1]: "Xtra 1",
  [IN.xtra1Cout]: "Xtra 1",
  [IN.matXtra2]: "Xtra 2",
  [IN.xtra2Cout]: "Xtra 2",
  [IN.matXtra3]: "Xtra 3",
  [IN.xtra3Cout]: "Xtra 3",
  [IN.matXtra4]: "Xtra 4",
  [IN.xtra4Cout]: "Xtra 4",
  [IN.diffDec]: "Différence découpe",
  [IN.perteMat]: "Perte matière",
  [IN.perteAdh]: "Perte adhésif",
  [IN.brillant]: "Brillant",
  [IN.mat_]: "Mat",
  [IN.sc1Cout]: "Sous-contrat 1",
  [IN.fourn1]: "Sous-contrat 1",
  [IN.sc2Cout]: "Sous-contrat 2",
  [IN.fourn2]: "Sous-contrat 2",
  [IN.sc3Cout]: "Sous-contrat 3",
  [IN.fourn3]: "Sous-contrat 3",
  [IN.sc4Cout]: "Sous-contrat 4",
  [IN.fourn4]: "Sous-contrat 4",
  [IN.autresFrais]: "Autres frais",
  [IN.tauxUs]: "Taux US",
  [IN.autre]: "Autre",
  [IN.codeM]: "Code M",
  [IN.codeR]: "Code R",
  [IN.codeE]: "Code E",
  [IN.codeS]: "Code S",
  [IN.codeRB]: "Code RB",
};

export interface ValeurCachee {
  libelle: string;
  /** « S!D35 = 1, S!E35 = 4 » */
  detail: string;
  cellules: string[];
  /** ce que la ligne ajoute au total ; null : non isolable (choix de machine) */
  montant: number | null;
  machine: boolean;
}

const vide = (v: CellValue) => v === undefined || v === null || v === false || String(v).trim() === "" || Number(v) === 0;
const egal = (a: CellValue, b: CellValue) =>
  (vide(a) && vide(b)) || String(a).trim() === String(b).trim() || (!vide(a) && !vide(b) && Number(a) === Number(b));

/** Une opération du classeur tient sur une ligne (matrices + poses, quantité + temps) : ses
 *  cellules ne valent que l'une par l'autre, on les chiffre ensemble. Colonnes A–I : opérations ;
 *  J et suivantes : matières et sous-contrats. */
function ligne(cell: string): string {
  const m = /^S!([A-Z]+)(\d+)$/.exec(cell);
  return m ? `${m[2]}${m[1].length === 1 && m[1] < "J" ? "g" : "d"}` : cell;
}

/** Cellules de la soumission sans case à l'écran, qui diffèrent d'une fiche vierge. Une valeur
 *  vidée compte aussi : « Vérification » ramenée à rien change le prix autant qu'un ajout.
 *  `total(modifs)` : le total de la pièce 1 avec ces cellules remplacées, par le même moteur. */
export function valeursCachees(e: Entrees, visibles: Set<string>, vierge: Entrees, total: (modifs: Entrees) => number): ValeurCachee[] {
  const groupes = new Map<string, string[]>();
  for (const [c, v] of Object.entries(e)) {
    if (visibles.has(c) || egal(v, vierge[c] ?? "")) continue;
    if (!/^(S|FT|C|INV)!/.test(c) && !(c in MACHINES)) continue;
    const k = ligne(c);
    groupes.set(k, [...(groupes.get(k) ?? []), c]);
  }
  if (!groupes.size) return [];
  const base = total({});
  return [...groupes.values()].map((cellules) => {
    const machine = cellules[0] in MACHINES;
    const d = machine ? NaN : base - total(Object.fromEntries(cellules.map((c) => [c, vierge[c] ?? ""])));
    const noms = [...new Set(cellules.map((c) => MACHINES[c] ?? LIBELLES[c]).filter(Boolean))];
    return {
      libelle: noms.join(", ") || cellules.join(", "),
      detail: cellules.map((c) => (machine ? String(e[c]) : `${c} = ${vide(e[c]) ? "vide" : String(e[c]).trim()}`)).join(", "),
      cellules,
      montant: Number.isFinite(d) ? Math.round(d * 100) / 100 : null,
      machine,
    };
  });
}

/** Comptés d'office par une fiche vierge, sans case à l'écran : ce qu'ils pèsent dans le total. */
export function comptesDoffice(e: Entrees, visibles: Set<string>, total: (modifs: Entrees) => number): { libelle: string; montant: number }[] {
  const cellules = [IN.verifQte, IN.emballageQte].filter((c) => !visibles.has(c) && !vide(e[c]));
  if (!cellules.length) return [];
  const base = total({});
  return cellules
    .map((c) => ({ libelle: LIBELLES[c], montant: Math.round((base - total({ [c]: "" })) * 100) / 100 }))
    .filter((x) => Number.isFinite(x.montant) && x.montant !== 0);
}
