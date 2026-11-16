// Formulaire intelligent « Production numérique » — la logique d'affichage et de validation.
//
// Handoff du 10 novembre 2026, étapes 1 à 5 et 7. Trois principes, repris tels quels :
//   · une info se saisit une fois ; l'amont filtre l'aval ;
//   · ce qui se calcule ne se saisit pas ;
//   · un seul encadré de produit visible à la fois.
//
// ── CE QUE CE MODULE NE FAIT PAS ─────────────────────────────────────────────
// Il ne calcule aucun prix, et ne touche à aucune formule du classeur. L'étape 6 du handoff
// (« brancher sur le calcul numérique existant ») repose sur deux prémisses fausses, vérifiées
// dans le code le 11 novembre 2026 :
//
//   1. `S!O5` n'est pas le numérique. Dans `lib/modele.ts`, `S!O5` = `multiprint` (la presse
//      Multiprint IST) et `S!O6` = `numeriqueMultiUp`. Router sur `S!O5` brancherait sur un
//      mode sérigraphie.
//   2. Il n'y a pas de calcul numérique à conserver. `FamilleMachine`
//      (`data/machinesCalc.ts`) compte six familles — presse, zund, platine, laminoir,
//      slitter, guillotine — et aucune `numerique`. Les machines Flash (Inca Onset, HP Latex,
//      Acuity, Anapurna) n'existent que dans l'inventaire administratif
//      (`administrationSnapshot.ts`, catégorie « Numerique »), sans vitesse ni taux horaire.
//
// Le coût numérique est donc à CONSTRUIRE, pas à brancher : il faut une famille de machines
// `numerique` avec ses vitesses, et les taux des finitions. Tant qu'ils manquent, ce module
// expose ce qui est calculable sans inventer un prix : les dimensions réelles, et le nombre
// d'œillets. Le reste est signalé par `postesACouter()`.

import type { Controle } from "./controles";
import {
  CONFIG_CHAMPS_NUMERIQUE,
  CONSTANTES_PRODUIT,
  DIMENSIONS_SELON_FORMAT,
  FILTRE_MATERIAU_PRODUIT,
  PRODUITS_NUMERIQUES,
  type ChampNumerique,
  type ProduitNumerique,
} from "@/data/produitsNumeriques";

/** Valeur d'un champ du formulaire numérique. Un `multi` arrive en tableau depuis Creator,
 *  mais une chaîne séparée par `;` reste acceptée : c'est la forme stockée en base. */
export type ValeurNum = string | number | boolean | string[] | null | undefined;
export type ValeursNum = Record<string, ValeurNum>;

const txt = (v: ValeurNum): string => (v === null || v === undefined ? "" : String(v).trim());

/** Les valeurs d'un champ, toujours sous forme de liste — qu'il soit simple ou multiple. */
export function listeValeurs(v: ValeurNum): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  // Creator stocke un multiselect en « a;b;c ». Un champ simple n'a jamais de `;`, donc
  // découper est sans risque — et indispensable pour relire une valeur déjà enregistrée.
  return s.split(";").map((x) => x.trim()).filter(Boolean);
}

/** Un champ est-il rempli ? Pour une case à cocher, « non cochée » n'est PAS un vide : c'est
 *  une réponse. D'où le traitement à part — sans lui, toute case non cochée bloquerait. */
function rempli(c: ChampNumerique, v: ValeurNum): boolean {
  if (c.typeChamp === "case") return true;
  if (c.typeChamp === "decimal") {
    const n = Number(txt(v).replace(",", "."));
    return txt(v) !== "" && Number.isFinite(n);
  }
  return listeValeurs(v).length > 0;
}

// ── Produits ────────────────────────────────────────────────────────────────

/** Les produits proposables : ceux dont la feuille client est arrivée. */
export function produitsActifs(produits: ProduitNumerique[] = PRODUITS_NUMERIQUES): ProduitNumerique[] {
  return produits.filter((p) => p.actif);
}

/** Options de la liste « Type de produit ». Dérivées des produits actifs, et non recopiées
 *  dans la configuration : deux listes à tenir à jour en parallèle finissent par diverger. */
export function optionsTypeProduit(produits: ProduitNumerique[] = PRODUITS_NUMERIQUES): string[] {
  return produitsActifs(produits).map((p) => p.libelle);
}

/** Retrouve un produit par son code OU son libellé — le formulaire stocke le libellé, le
 *  code circule dans la configuration. */
export function trouverProduit(cle: string, produits: ProduitNumerique[] = PRODUITS_NUMERIQUES): ProduitNumerique | null {
  const k = cle.trim().toLowerCase();
  if (!k) return null;
  return produits.find((p) => p.code.toLowerCase() === k || p.libelle.toLowerCase() === k) ?? null;
}

// ── Étape 4 : quels champs afficher ─────────────────────────────────────────

/** Toutes les lignes qui concernent un produit : ses propres champs + les champs communs
 *  dont il n'est pas exclu. Sans tenir compte des conditions — c'est `champsVisibles` qui
 *  les applique. */
export function champsDuProduit(produit: string, config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): ChampNumerique[] {
  const p = trouverProduit(produit);
  const code = p?.code ?? produit.trim().toLowerCase();
  return config
    .filter((c) => c.actif)
    .filter((c) => (c.typeProduit === "*" ? !(c.sauf ?? []).includes(code) : c.typeProduit === code))
    .sort((a, b) => a.ordre - b.ordre || a.champ.localeCompare(b.champ));
}

/** La condition d'affichage d'un champ est-elle remplie ?
 *  Le parent peut être multiple (« Autre finition » dépend de `Ban_Finition`, un multi) :
 *  on teste alors l'APPARTENANCE, pas l'égalité. */
export function conditionRemplie(c: ChampNumerique, valeurs: ValeursNum): boolean {
  if (!c.dependDe || !c.dependValeurs?.length) return true;
  const actuelles = listeValeurs(valeurs[c.dependDe]);
  return actuelles.some((v) => c.dependValeurs!.includes(v));
}

/** Les champs réellement à l'écran, dans l'ordre. */
export function champsVisibles(produit: string, valeurs: ValeursNum, config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): ChampNumerique[] {
  return champsDuProduit(produit, config).filter((c) => conditionRemplie(c, valeurs));
}

/** Les champs visibles regroupés par bloc, blocs dans l'ordre de leur premier champ.
 *  C'est la forme que consomme l'écran : un encadré par bloc. */
export function blocsVisibles(
  produit: string,
  valeurs: ValeursNum,
  config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE,
): { bloc: string; champs: ChampNumerique[] }[] {
  const out: { bloc: string; champs: ChampNumerique[] }[] = [];
  for (const c of champsVisibles(produit, valeurs, config)) {
    const dernier = out[out.length - 1];
    if (dernier && dernier.bloc === c.bloc) dernier.champs.push(c);
    else out.push({ bloc: c.bloc, champs: [c] });
  }
  return out;
}

/** Étape 4.3 — changer de produit vide les champs de l'ancien.
 *
 *  Ne vide QUE ce qui appartenait en propre à l'ancien produit : les champs communs
 *  (dimensions, quantité, infographie, notes…) sont conservés, sinon changer d'avis sur le
 *  type de produit effacerait la saisie déjà faite. Un champ commun dont le NOUVEAU produit
 *  est exclu est vidé lui aussi — garder une adresse d'installation sur un roll-up, qui n'a
 *  pas d'installation, laisserait une donnée orpheline invisible à l'écran mais bien présente
 *  dans la soumission enregistrée. C'est l'anomalie US du Lot A. */
export function champsAVider(ancienProduit: string, nouveauProduit: string, config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): string[] {
  if (!ancienProduit.trim()) return [];
  const avant = champsDuProduit(ancienProduit, config);
  const apres = new Set(champsDuProduit(nouveauProduit, config).map((c) => c.champ));
  return avant.filter((c) => !apres.has(c.champ)).map((c) => c.champ);
}

/** Applique le vidage : renvoie une copie des valeurs, sans muter l'original. */
export function viderChamps(valeurs: ValeursNum, champs: string[]): ValeursNum {
  const out: ValeursNum = { ...valeurs };
  for (const c of champs) delete out[c];
  return out;
}

/** Les constantes du produit — ce qui est fixe et ne se demande pas (roll-up : vinyle 9 oz,
 *  recto seulement). À joindre à la soumission et au bon de travail. */
export function constantesProduit(produit: string): Record<string, string> {
  const p = trouverProduit(produit);
  return { ...(CONSTANTES_PRODUIT[p?.code ?? ""] ?? {}) };
}

// ── Dimensions : « ce qui se calcule ne se saisit pas » ─────────────────────

/** Convertit en pouces. Le classeur travaille en pouces ; les millimètres ne sont qu'une
 *  commodité de saisie (règle 6 de la liste Openmind). */
export function enPouces(valeur: ValeurNum, unite: ValeurNum): number {
  const n = Number(txt(valeur).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return /millim/i.test(txt(unite)) ? n / 25.4 : n;
}

/** Les dimensions réelles de la pièce, en pouces.
 *  Pour un produit à format catalogue (roll-up), elles viennent du format choisi et non
 *  d'une saisie — voir `DIMENSIONS_SELON_FORMAT`. */
export function dimensionsProduit(
  produit: string,
  valeurs: ValeursNum,
  config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE,
): { largeurPo: number; hauteurPo: number; source: "format" | "saisie" | "absente" } {
  const p = trouverProduit(produit);
  const parFormat = DIMENSIONS_SELON_FORMAT[p?.code ?? ""];
  if (parFormat) {
    // Le champ qui porte le format est identifié par la CONFIGURATION : c'est celui dont les
    // options sont les formats catalogue. Chercher la valeur dans tous les champs du
    // formulaire serait plus court mais faux — un « 33 × 80 po » tapé dans les notes serait
    // alors lu comme le format de la pièce.
    const champ = champsDuProduit(produit, config).find((c) => c.options.length > 0 && c.options.every((o) => o in parFormat));
    const dim = champ ? parFormat[txt(valeurs[champ.champ])] : undefined;
    if (dim) return { largeurPo: dim.largeurPo, hauteurPo: dim.hauteurPo, source: "format" };
    return { largeurPo: 0, hauteurPo: 0, source: "absente" };
  }
  const l = enPouces(valeurs.Num_Largeur, valeurs.Num_Unite);
  const h = enPouces(valeurs.Num_Hauteur, valeurs.Num_Unite);
  return { largeurPo: l, hauteurPo: h, source: l > 0 && h > 0 ? "saisie" : "absente" };
}

// ── Œillets : la seule quantité de finition que le handoff chiffre ──────────

/** Une finition « Couture + œillets aux N po ». Le `œ` et le `oe` sont tous deux acceptés :
 *  la ligature se perd à la ressaisie, et une option mal orthographiée dans Creator ne doit
 *  pas faire disparaître les œillets du calcul en silence.
 *
 *  Cette expression est la DÉFINITION de « finition à œillets espacés ». Elle sert à la fois à
 *  lire l'espacement et à retirer ces finitions de la liste des postes non chiffrés : filtrer
 *  sur un simple « contient œillets » ferait disparaître « Perçage / œillets » des panneaux,
 *  qui n'a pas d'espacement et n'est donc comptée nulle part. */
const RE_OEILLETS_ESPACES = /(?:œ|oe)illets\s+aux\s+(\d+)\s*po/i;

/** Espacement d'œillets demandé, en pouces, lu dans la finition choisie. 0 = pas d'œillets.
 *  Si les deux espacements sont cochés, le plus serré gagne : c'est le plus coûteux, et se
 *  tromper vers le bas ferait sous-facturer. À confirmer avec Roberto. */
export function espacementOeillets(valeurs: ValeursNum, champFinition = "Ban_Finition"): number {
  const choix = listeValeurs(valeurs[champFinition]);
  let espacement = 0;
  for (const c of choix) {
    const m = c.match(RE_OEILLETS_ESPACES);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    espacement = espacement === 0 ? n : Math.min(espacement, n);
  }
  return espacement;
}

/** Nombre d'œillets — formule du handoff : périmètre ÷ espacement.
 *
 *  ⚠ Le plancher de 4 est une HYPOTHÈSE, pas une donnée du handoff : une bannière porte
 *  toujours un œillet à chaque coin, et la division seule en donne moins sur une petite
 *  pièce (une bannière 12 × 12 à 24 po d'espacement donnerait 2 œillets). À confirmer avec
 *  Roberto avant de brancher un coût dessus. */
export function nbOeillets(largeurPo: number, hauteurPo: number, espacementPo: number): number {
  if (!(largeurPo > 0) || !(hauteurPo > 0) || !(espacementPo > 0)) return 0;
  const perimetre = 2 * (largeurPo + hauteurPo);
  return Math.max(4, Math.ceil(perimetre / espacementPo));
}

// ── Étape 5 : filtrage des matériaux ────────────────────────────────────────

/** Les matériaux permis pour un produit.
 *
 *  `nomsInventaire` = les noms réellement présents dans l'inventaire Creator. Tant que la
 *  colonne « type numérique » n'est pas remplie, on le laisse vide et la fonction renvoie les
 *  libellés des feuilles produit, en signalant qu'ils ne sont pas rapprochés. Rapprocher à
 *  l'aveugle (par ressemblance de nom) donnerait un prix pris sur le mauvais matériau : un
 *  champ vide coûte moins cher qu'un faux prix. */
export function materiauxPermis(
  produit: string,
  nomsInventaire: string[] = [],
  filtre: Record<string, string[]> = FILTRE_MATERIAU_PRODUIT,
): { permis: string[]; rapproches: string[]; nonRapproches: string[] } {
  const p = trouverProduit(produit);
  const permis = filtre[p?.code ?? ""] ?? [];
  if (!nomsInventaire.length) return { permis, rapproches: [], nonRapproches: [...permis] };
  const dispo = new Map(nomsInventaire.map((n) => [n.trim().toLowerCase(), n]));
  const rapproches: string[] = [];
  const nonRapproches: string[] = [];
  for (const m of permis) {
    const trouve = dispo.get(m.trim().toLowerCase());
    if (trouve) rapproches.push(trouve);
    else nonRapproches.push(m);
  }
  return { permis, rapproches, nonRapproches };
}

// ── Étape 7 : validations ───────────────────────────────────────────────────

/** Contrôles du formulaire numérique. Même forme que `lib/controles.ts`, pour que l'écran
 *  n'ait qu'une seule liste d'alertes à afficher.
 *
 *  Un champ requis n'est bloquant que s'il est VISIBLE : une adresse d'installation
 *  obligatoire mais masquée (installation non requise) bloquerait une soumission sans que
 *  l'utilisateur voie quoi corriger. */
export function controlerNumerique(produit: string, valeurs: ValeursNum, config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): Controle[] {
  const out: Controle[] = [];
  const p = trouverProduit(produit);

  if (!produit.trim()) {
    out.push({ type: "bloquant", cle: "num-produit", message: "Type de produit non choisi.", conseil: "Choisissez un type de produit : l'écran n'affiche ses questions qu'ensuite." });
    return out;
  }
  if (!p) {
    out.push({ type: "bloquant", cle: "num-produit-inconnu", message: `Type de produit inconnu : « ${produit} ».` });
    return out;
  }
  if (!p.actif) {
    out.push({
      type: "bloquant",
      cle: "num-produit-a-venir",
      message: `« ${p.libelle} » n'est pas encore configuré.`,
      conseil: p.note ?? "La feuille produit du client n'est pas arrivée.",
    });
    return out;
  }

  for (const c of champsVisibles(produit, valeurs, config)) {
    if (c.requis && !rempli(c, valeurs[c.champ])) {
      out.push({
        type: "bloquant",
        cle: "num-requis-" + c.champ,
        message: `${c.bloc} — « ${c.libelle} » est obligatoire.`,
        // Le laminage des autocollants est le seul requis que le handoff marque
        // « (obligatoire) » en toutes lettres : son conseil le rappelle explicitement.
        conseil: c.champ === "Auto_Laminage" ? "Le laminage est obligatoire sur les autocollants et décalques." : undefined,
      });
    }
  }

  const dim = dimensionsProduit(produit, valeurs, config);
  if (dim.source === "absente") {
    out.push({
      type: "bloquant",
      cle: "num-dimensions",
      message: "Dimensions manquantes : rien ne peut être chiffré.",
      conseil: DIMENSIONS_SELON_FORMAT[p.code] ? "Choisissez un format : les dimensions en découlent." : undefined,
    });
  }

  // Une quantité de 0 passe le contrôle « champ rempli » — « 0 » est bel et bien une saisie —
  // mais ne produit rien à chiffrer. Sans ce contrôle, une soumission à 0 pièce se validerait
  // et donnerait un prix de 0 $, qui se lit comme « gratuit » et non comme « incomplet ».
  const qte = Number(txt(valeurs.Num_Quantite).replace(",", "."));
  if (txt(valeurs.Num_Quantite) !== "" && !(Number.isFinite(qte) && qte > 0)) {
    out.push({ type: "bloquant", cle: "num-quantite", message: "La quantité doit être supérieure à 0." });
  }

  // Rappel non bloquant : les postes de coût que le calcul ne sait pas encore chiffrer.
  for (const poste of postesACouter(produit, valeurs, config)) {
    out.push({ type: "info", cle: "num-poste-" + poste.cle, message: poste.message, conseil: poste.conseil });
  }

  return out;
}

/** Les options choisies qui ont un coût mais pas encore de taux : signalées plutôt que
 *  chiffrées à zéro. Un zéro silencieux est la pire des réponses — il se lit comme « gratuit »
 *  et part dans une proposition client. */
export function postesACouter(
  produit: string,
  valeurs: ValeursNum,
  config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE,
): { cle: string; message: string; conseil?: string }[] {
  const out: { cle: string; message: string; conseil?: string }[] = [];
  const visibles = champsVisibles(produit, valeurs, config);
  const dim = dimensionsProduit(produit, valeurs, config);

  const espacement = espacementOeillets(valeurs);
  if (espacement > 0) {
    const n = nbOeillets(dim.largeurPo, dim.hauteurPo, espacement);
    out.push({
      cle: "oeillets",
      message: `Œillets aux ${espacement} po : ${n} œillets (périmètre ${(2 * (dim.largeurPo + dim.hauteurPo)).toFixed(1)} po).`,
      conseil: "Le nombre est calculé, le coût unitaire n'est pas encore paramétré.",
    });
  }

  for (const c of visibles) {
    const choix = listeValeurs(valeurs[c.champ]);
    if (!choix.length) continue;
    if (/laminage/i.test(c.champ) && !choix.includes("Aucun")) {
      out.push({ cle: "laminage", message: `Laminage ${choix.join(", ")} : coût à paramétrer.` });
    }
    if (/finition/i.test(c.champ)) {
      // On ne retire QUE les finitions déjà comptées juste au-dessus (celles à espacement).
      // Filtrer sur « contient œillets » ferait disparaître « Perçage / œillets » des
      // panneaux : elle n'a pas d'espacement, donc elle n'est comptée nulle part — elle
      // sortirait du rapport sans jamais y être entrée.
      const restantes = choix.filter((x) => !RE_OEILLETS_ESPACES.test(x));
      if (restantes.length) out.push({ cle: "finition-" + c.champ, message: `Finitions à paramétrer : ${restantes.join(", ")}.` });
    }
    if (/montage/i.test(c.champ) && !choix.includes("Aucun")) {
      out.push({ cle: "montage", message: `Montage sur substrat (${choix.join(", ")}) : coût à paramétrer.` });
    }
  }

  if (txt(valeurs.Retr_Modele)) out.push({ cle: "rollup-modele", message: `Roll-up ${txt(valeurs.Retr_Modele)} : coût du matériel à paramétrer.` });
  if (valeurs.Retr_Lampe_DEL === true || /^(1|oui|true)$/i.test(txt(valeurs.Retr_Lampe_DEL))) {
    out.push({ cle: "rollup-del", message: "Lampe DEL : coût à paramétrer." });
  }
  if (txt(valeurs.Num_Installation) === "Demandée") out.push({ cle: "installation", message: "Installation demandée : coût à paramétrer." });
  if (txt(valeurs.Num_Infographie) === "Infographie à réaliser par Artistic") {
    out.push({ cle: "infographie", message: "Infographie à réaliser : temps à paramétrer." });
  }

  return out;
}

// ── Diagnostics de configuration ────────────────────────────────────────────

/** Champs `choix` à une seule option : des constantes déguisées en questions dans les
 *  feuilles client. Pas une erreur — une remarque à faire au client. */
export function optionUnique(config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): ChampNumerique[] {
  return config.filter((c) => c.actif && c.typeChamp === "choix" && c.options.length === 1);
}

/** Incohérences de configuration : une condition qui pointe vers un champ absent du même
 *  produit, ou vers une valeur que le champ parent n'offre pas. Une condition fausse masque
 *  un champ pour toujours, sans message — c'est invisible à l'œil nu dans la table Creator. */
export function incoherencesConfig(config: ChampNumerique[] = CONFIG_CHAMPS_NUMERIQUE): string[] {
  const out: string[] = [];
  const codes = PRODUITS_NUMERIQUES.map((p) => p.code);
  for (const c of config) {
    if (c.typeProduit !== "*" && !codes.includes(c.typeProduit)) {
      out.push(`${c.champ} : type de produit inconnu « ${c.typeProduit} »`);
    }
    for (const s of c.sauf ?? []) {
      if (!codes.includes(s)) out.push(`${c.champ} : exclusion vers un produit inconnu « ${s} »`);
    }
    if (!c.dependDe) continue;
    const famille = c.typeProduit === "*" ? config : config.filter((x) => x.typeProduit === c.typeProduit || x.typeProduit === "*");
    const parent = famille.find((x) => x.champ === c.dependDe);
    if (!parent) {
      out.push(`${c.champ} : dépend de « ${c.dependDe} », qui n'existe pas pour ce produit`);
      continue;
    }
    for (const v of c.dependValeurs ?? []) {
      if (parent.options.length && !parent.options.includes(v)) {
        out.push(`${c.champ} : dépend de la valeur « ${v} », absente des options de ${parent.champ}`);
      }
    }
  }

  // Un bloc coupé en deux par la numérotation. C'est le défaut le plus difficile à voir dans
  // la table Creator : les lignes y sont correctes une par une, mais `ordre` étant une
  // numérotation GLOBALE, un champ commun et un champ de produit qui partagent un numéro
  // s'entrelacent au tri. L'écran affiche alors deux fois le même bloc, et les questions du
  // produit passent avant le champ qui choisit le produit. Voir les bandes d'ordre
  // documentées dans `data/produitsNumeriques.ts`.
  for (const p of PRODUITS_NUMERIQUES) {
    if (!p.actif) continue;
    const vus = new Map<string, number>();
    let precedent = "";
    for (const c of champsDuProduit(p.code, config)) {
      if (c.bloc !== precedent) {
        const dejaVu = vus.get(c.bloc);
        if (dejaVu !== undefined) {
          out.push(`${p.code} : le bloc « ${c.bloc} » est coupé en deux par la numérotation (ordre ${dejaVu} puis ${c.ordre}) — voir les bandes d'ordre`);
        }
        vus.set(c.bloc, c.ordre);
        precedent = c.bloc;
      }
    }
  }

  return out;
}
