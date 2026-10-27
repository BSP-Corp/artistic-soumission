// Contrat JSON « Soumission » — ce que Zoho enverra à la plateforme du client.
//
// UNE SEULE source de vérité : la liste CHAMPS ci-dessous. Elle sert à la fois à
//   · construire le JSON (construireSoumissionJSON) — utilisé par le widget à l'enregistrement,
//   · générer la documentation (docChamps) — livrée au client.
// Doc et payload ne peuvent donc pas diverger.
//
// Règles du contrat (importantes pour le client) :
//   · aucune référence de cellule Excel n'est exposée — noms métier uniquement ;
//   · les pourcentages sont en 0-100 (pas en fraction 0,10) ;
//   · les cases à cocher sont des booléens ; un nombre non saisi est `null` ;
//   · les montants sont en CAD, 2 décimales, sauf le prix unitaire (4) ;
//   · les temps sont donnés en heures + minutes ET en minutes totales.

import type { CellValue, Moteur } from "@/lib/moteur";
import { IN, OUT, DECOUPE_HM, XTRA_PLACEHOLDER, CELL_VENDU, cellVendu } from "@/lib/modele";
import {
  CELL_PRESSE,
  CELL_ZUND,
  CELL_PLATINE,
  CELL_LAMINOIR,
  CELL_SLITTER,
  CELL_GUILLOTINE,
  CELL_MATRICE,
} from "@/lib/machines";

// 1.1 (16 sept. 2026) — ajouts rétro-compatibles : prix.prix_vendu_unitaire, prix.prix_vendu_total,
//     production.quantites_alternatives[].prix_vendu_unitaire. Aucun champ retiré ni retypé.
// 1.2 (28 sept. 2026) — élargissements de type, aucun retrait :
//     · decoupe.finition.coins_ronds.quantite devient nullable (opération retirée de l'outil) ;
//     · impression.faces.* et les interrupteurs restent inchangés.
//     Le taux horaire passe de 73 à 74 $/h : les montants changent, pas le contrat.
export const SCHEMA_VERSION = "1.2";

export type TypeChamp =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "percent"
  | "money"
  | "date"
  | "string|null"
  | "integer|null"
  | "number|null"
  | "money|null";

export interface Champ {
  /** chemin JSON, notation pointée ; `[]` marque un élément de tableau */
  chemin: string;
  type: TypeChamp;
  /** saisi par l'utilisateur (`in`) ou calculé par le moteur (`out`) ou métadonnée (`meta`) */
  origine: "in" | "out" | "meta";
  description: string;
  get?: (c: Ctx) => unknown;
}

export interface MetaSoumission {
  id: string;
  statut: string;
  source: "widget" | "api" | "import";
  date_soumission: string; // YYYY-MM-DD
  reference_externe?: string | null;
  notes?: string;
}

export interface Ctx {
  m: Moteur;
  e: Record<string, CellValue>;
  meta: MetaSoumission;
  /** simulation du prix pour une autre quantité (table QTÉ) — optionnel.
   *  `cout` = coût de revient unitaire · `prix` = prix unitaire, facteur appliqué.
   *  Les deux sont exposés séparément dans le contrat : ne jamais les confondre. */
  simuler?: (qte: number) => { cout: number; prix: number; vendu: number; us: number };
}

// ── helpers de lecture ──────────────────────────────────────────────────────
const brut = (c: Ctx, cell: string): CellValue => (cell in c.e ? c.e[cell] : c.m.val(cell));
const vide = (v: CellValue) => v === "" || v === undefined || v === null;
const num = (v: CellValue): number | null => {
  if (vide(v)) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const r2 = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
const r4 = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 10000);

const S = (cell: string) => (c: Ctx) => (vide(brut(c, cell)) ? "" : String(brut(c, cell)).trim());
const Sn = (cell: string) => (c: Ctx) => (vide(brut(c, cell)) ? null : String(brut(c, cell)).trim());
const N = (cell: string) => (c: Ctx) => num(brut(c, cell));
const I = (cell: string) => (c: Ctx) => {
  const n = num(brut(c, cell));
  return n === null ? null : Math.round(n);
};
const B = (cell: string) => (c: Ctx) => {
  const v = brut(c, cell);
  return v === 1 || v === true || v === "1" || v === "Oui";
};
const P = (cell: string) => (c: Ctx) => {
  const n = num(brut(c, cell));
  return n === null ? null : Math.round(n * 10000) / 100; // fraction → %
};
const M = (cell: string) => (c: Ctx) => r2(num(c.m.val(cell)) ?? 0);
const M4 = (cell: string) => (c: Ctx) => r4(num(c.m.val(cell)) ?? 0);
const Mn = (cell: string) => (c: Ctx) => r2(num(c.m.val(cell)));
const H = (h: string, min: string) => (c: Ctx) => ({
  heures: Math.trunc(num(c.m.val(h)) ?? 0),
  minutes: Math.round(num(c.m.val(min)) ?? 0),
  minutes_totales: r2((num(c.m.val(h)) ?? 0) * 60 + (num(c.m.val(min)) ?? 0)),
});
const machine = (cell: string) => (c: Ctx) => Sn(cell)(c);

// ── la liste des champs (doc + construction) ────────────────────────────────
export const CHAMPS: Champ[] = [
  // ── entête
  { chemin: "schema_version", type: "string", origine: "meta", description: "Version du contrat JSON (semver). Toute rupture de compatibilité incrémente le majeur.", get: () => SCHEMA_VERSION },
  { chemin: "soumission.id", type: "string", origine: "meta", description: "Identifiant unique Zoho Creator de la soumission (19 chiffres, à traiter comme une chaîne).", get: (c) => c.meta.id },
  { chemin: "soumission.no_soumission", type: "string", origine: "in", description: "Numéro de soumission saisi par l'estimateur (code « S »).", get: S(IN.codeS) },
  { chemin: "soumission.initiales", type: "string", origine: "in", description: "Initiales de l'estimateur (ex. « RB »).", get: S(IN.codeRB) },
  { chemin: "soumission.statut", type: "string", origine: "meta", description: "Brouillon | Valide | En_production | Termine.", get: (c) => c.meta.statut },
  { chemin: "soumission.source", type: "string", origine: "meta", description: "widget (saisie manuelle) | api (créée par la plateforme) | import.", get: (c) => c.meta.source },
  { chemin: "soumission.date_soumission", type: "date", origine: "meta", description: "Date d'enregistrement, format ISO YYYY-MM-DD.", get: (c) => c.meta.date_soumission },
  { chemin: "soumission.date_requise", type: "string|null", origine: "in", description: "Date requise par le client, telle que saisie (texte libre pour l'instant).", get: Sn(IN.date) },
  { chemin: "soumission.reference_externe", type: "string|null", origine: "meta", description: "Référence de la plateforme du client (idempotence). null si créée dans Zoho.", get: (c) => c.meta.reference_externe ?? null },
  { chemin: "soumission.notes", type: "string", origine: "meta", description: "Notes libres (champ long).", get: (c) => c.meta.notes ?? "" },

  // ── client / pièce
  { chemin: "client.no_client", type: "string", origine: "in", description: "Numéro de client.", get: S(IN.noClient) },
  { chemin: "client.nom", type: "string", origine: "in", description: "Nom du client.", get: S(IN.client) },
  { chemin: "piece.no_piece", type: "string", origine: "in", description: "Numéro de pièce (peut être alphanumérique).", get: S(IN.noPce) },
  { chemin: "piece.modele", type: "string", origine: "in", description: "Modèle.", get: S(IN.modele) },
  { chemin: "piece.autre", type: "string", origine: "in", description: "Information complémentaire libre.", get: S(IN.autre) },
  { chemin: "piece.dimensions_po.largeur", type: "number|null", origine: "in", description: "Largeur de la pièce finie, en pouces (centièmes admis).", get: N(IN.dimPceX) },
  { chemin: "piece.dimensions_po.hauteur", type: "number|null", origine: "in", description: "Hauteur de la pièce finie, en pouces.", get: N(IN.dimPceY) },
  { chemin: "piece.codes.M", type: "string", origine: "in", description: "Code M (fiche d'atelier).", get: S(IN.codeM) },
  { chemin: "piece.codes.R", type: "string", origine: "in", description: "Code R.", get: S(IN.codeR) },
  { chemin: "piece.codes.E", type: "string", origine: "in", description: "Code E.", get: S(IN.codeE) },

  // ── production
  { chemin: "production.quantite", type: "integer|null", origine: "in", description: "Quantité de pièces demandée — base du calcul.", get: I(IN.quantite) },
  { chemin: "production.perte_pct", type: "percent", origine: "in", description: "Pourcentage de perte (rebuts) appliqué aux matrices. Défaut 10.", get: P(IN.perte) },
  { chemin: "production.nb_up", type: "integer|null", origine: "in", description: "Nombre de pièces par feuille (« Up »).", get: I(IN.nbUp) },
  { chemin: "production.matrice_po.largeur", type: "number|null", origine: "in", description: "Largeur de la matrice (feuille imprimée), en pouces.", get: N(IN.dimMrxX) },
  { chemin: "production.matrice_po.hauteur", type: "number|null", origine: "in", description: "Hauteur de la matrice, en pouces.", get: N(IN.dimMrxY) },
  { chemin: "production.nb_matrices", type: "integer", origine: "out", description: "Nombre de matrices (feuilles) à produire = quantité × (1 + perte) ÷ up, arrondi au plein supérieur (comme affiché dans le widget).", get: (c) => Math.ceil(num(c.m.val(OUT.nbMrxExact)) ?? 0) },
  { chemin: "production.nb_matrices_exact", type: "number", origine: "out", description: "Même valeur avant arrondi.", get: M4(OUT.nbMrxExact) },
  { chemin: "production.surface_matrice_po2", type: "number", origine: "out", description: "Surface d'une matrice en pouces carrés = largeur × hauteur.", get: M(OUT.nbMrx) },
  { chemin: "production.multiprint", type: "boolean", origine: "in", description: "Mode presse MultiPrint (1 à 6 couleurs en ligne).", get: B(IN.multiprint) },
  { chemin: "production.numerique_multiup", type: "boolean", origine: "in", description: "Impression numérique multi-up.", get: B(IN.numeriqueMultiUp) },
  { chemin: "production.surplus", type: "boolean", origine: "in", description: "Surplus de 10 % autorisé sur la quantité produite (fiche d'atelier).", get: (c) => { const v = brut(c, "FT!Z4"); return vide(v) ? true : num(v) === 1; } },
  { chemin: "production.quantites_alternatives[]", type: "integer", origine: "in", description: "Autres quantités pour lesquelles un prix est demandé (table QTÉ), quantité principale exclue. Tableau vide si aucune.", get: (c) => quantitesAlternatives(c) },
  { chemin: "production.quantites_alternatives[].quantite", type: "integer", origine: "in", description: "Quantité simulée." },
  { chemin: "production.quantites_alternatives[].cout_unitaire", type: "money|null", origine: "out", description: "Coût de revient unitaire pour cette quantité (null si simulation indisponible)." },
  { chemin: "production.quantites_alternatives[].prix_unitaire", type: "money|null", origine: "out", description: "Prix vendant unitaire calculé pour cette quantité." },
  { chemin: "production.quantites_alternatives[].prix_vendu_unitaire", type: "money|null", origine: "in", description: "v1.1 — Prix vendu unitaire décidé par le chargé de projet pour cette quantité. null si non saisi : utilisez prix_unitaire." },

  // ── impression (sérigraphie)
  { chemin: "impression.couleurs_visibles", type: "integer|null", origine: "in", description: "Nombre de couleurs visibles.", get: I(IN.couleursVisibles) },
  { chemin: "impression.faces.separateur", type: "integer|null", origine: "in", description: "Nombre de passes F/S séparateur. Depuis v1.1 le champ n'est plus saisi : toujours 1.", get: I(IN.fs1) },
  { chemin: "impression.faces.recto", type: "integer|null", origine: "in", description: "Nombre de passes F/S recto. Depuis v1.1 : toujours 1.", get: I(IN.fs2) },
  { chemin: "impression.faces.verso", type: "integer|null", origine: "in", description: "Nombre de passes F/S verso. Depuis v1.1 : toujours 1.", get: I(IN.fs3) },
  { chemin: "impression.separateur.haut", type: "integer|null", origine: "in", description: "Séparateur haut (nb).", get: I(IN.separateur1) },
  { chemin: "impression.separateur.bas", type: "integer|null", origine: "in", description: "Séparateur bas (nb).", get: I(IN.separateur2) },
  { chemin: "impression.passes_additionnelles.a", type: "integer|null", origine: "in", description: "Passes additionnelles (colonne A).", get: I(IN.passeAdd1) },
  { chemin: "impression.passes_additionnelles.b", type: "integer|null", origine: "in", description: "Passes additionnelles (colonne B).", get: I(IN.passeAdd2) },
  { chemin: "impression.ajustement_additionnel", type: "number|null", origine: "in", description: "Ajustement additionnel (nb).", get: N(IN.ajustAdd) },
  { chemin: "impression.nettoyage.a", type: "integer|null", origine: "in", description: "Nettoyages additionnels (A).", get: I(IN.nettoyage1) },
  { chemin: "impression.nettoyage.b", type: "integer|null", origine: "in", description: "Nettoyages additionnels (B).", get: I(IN.nettoyage2) },
  { chemin: "impression.recto_verso.a", type: "integer|null", origine: "in", description: "Recto-verso (A).", get: I(IN.rectoVerso1) },
  { chemin: "impression.recto_verso.b", type: "integer|null", origine: "in", description: "Recto-verso (B).", get: I(IN.rectoVerso2) },
  { chemin: "impression.encres_pct", type: "percent", origine: "in", description: "Couverture d'encre (100 = pleine couverture).", get: P(IN.encres) },
  { chemin: "impression.sans_uv", type: "boolean", origine: "in", description: "Sans vernis UV.", get: B(IN.sansUv) },
  { chemin: "impression.hppl", type: "number|null", origine: "in", description: "HPPL (nb).", get: N(IN.hppl) },
  { chemin: "impression.texture_pct", type: "percent", origine: "in", description: "Texture (100 = oui).", get: P(IN.texture) },
  { chemin: "impression.ajustement_impression_pct", type: "percent", origine: "in", description: "Ajustement manuel du temps d'impression.", get: P(IN.ajustImpr) },
  { chemin: "impression.argent_clavier", type: "number|null", origine: "in", description: "Argent clavier (nb).", get: N(IN.argentClavier) },
  { chemin: "impression.temps", type: "number", origine: "out", description: "Temps d'impression {heures, minutes, minutes_totales}.", get: H(OUT.tempsImprHrs, OUT.tempsImprMin) },

  // ── exclusions
  { chemin: "exclusions.sans_adhesif", type: "boolean", origine: "in", description: "Le job ne comporte pas d'adhésif.", get: B(IN.sansAdhesif) },
  { chemin: "exclusions.sans_materiau", type: "boolean", origine: "in", description: "Matériau fourni par le client.", get: B(IN.sansMateriau) },
  { chemin: "exclusions.sans_coupe", type: "boolean", origine: "in", description: "Aucune découpe.", get: B(IN.sansCoupe) },
  { chemin: "exclusions.sans_encre", type: "boolean", origine: "in", description: "Aucune impression.", get: B(IN.sansEncre) },

  // ── matériaux
  { chemin: "materiaux[]", type: "string", origine: "in", description: "Lignes matériaux utilisées (les lignes vides sont omises). Ordre = ordre du formulaire.", get: (c) => materiaux(c) },
  { chemin: "materiaux[].ligne", type: "string", origine: "meta", description: "lexan | vinyle | polyester | alu_foil | divers | adhesif | overlaminating | xtra1..xtra4." },
  { chemin: "materiaux[].nom", type: "string", origine: "in", description: "Nom exact du matériau dans le catalogue (clé de jointure avec l'inventaire)." },
  { chemin: "materiaux[].cout_pi2", type: "money|null", origine: "out", description: "Coût au pied carré retenu (catalogue, ou saisi pour les lignes Xtra)." },
  { chemin: "materiaux[].perte_pct", type: "percent", origine: "in", description: "Perte spécifique à la ligne (lignes Xtra uniquement, sinon null)." },
  { chemin: "materiaux[].montant", type: "money", origine: "out", description: "Montant matière de la ligne = surface × coût pi² × (1 + perte) × multiplicateur." },
  { chemin: "materiaux[].temps_debitage_min", type: "number|null", origine: "out", description: "Temps de débitage (guillotine) de la ligne, en minutes." },
  { chemin: "materiaux_options.difference_decoupe_pct", type: "percent", origine: "in", description: "Différence de découpe (%).", get: P(IN.diffDec) },
  { chemin: "materiaux_options.perte_materiau_pct", type: "percent", origine: "in", description: "Perte matière globale additionnelle (%).", get: P(IN.perteMat) },
  { chemin: "materiaux_options.perte_adhesif_pct", type: "percent", origine: "in", description: "Perte adhésif globale (%).", get: P(IN.perteAdh) },
  { chemin: "materiaux_options.fini", type: "string|null", origine: "in", description: "brillant | mat | null.", get: (c) => (B(IN.brillant)(c) ? "brillant" : B(IN.mat_)(c) ? "mat" : null) },
  { chemin: "materiaux_options.montant_premask", type: "money", origine: "out", description: "Montant prémask.", get: M(OUT.montPremask) },

  // ── découpe (finition matière)
  { chemin: "decoupe.adhesif_lamine", type: "number", origine: "in", description: "{quantite, temps}. Adhésif laminé.", get: (c) => op(c, IN.adhesifLamine, null, "adhesifLamine") },
  { chemin: "decoupe.position_adhesif_lamine", type: "number", origine: "in", description: "{quantite, temps}. Positionnement adhésif & laminé (registre).", get: (c) => op(c, IN.adhesifRegistre, null, "adhesifRegistre") },
  { chemin: "decoupe.overlaminating", type: "number", origine: "in", description: "{quantite, quantite_b, temps}. Over-laminating.", get: (c) => op(c, IN.overLaminating, IN.overLaminatingB, "overLaminating") },
  { chemin: "decoupe.premask", type: "number", origine: "in", description: "{quantite, temps}. Prémask standard.", get: (c) => op(c, IN.premaskStd, null, "premaskStd") },
  { chemin: "decoupe.protecteur", type: "number", origine: "in", description: "{quantite, temps}. Protecteur.", get: (c) => op(c, IN.protecteur, null, "protecteur") },
  { chemin: "decoupe.protecteur_fenetre", type: "number", origine: "in", description: "{quantite, quantite_b, temps}. Protecteur fenêtre.", get: (c) => op(c, IN.protecteurFenetre, IN.protecteurFenetreB, "protecteurFenetre") },
  { chemin: "decoupe.slit", type: "number", origine: "in", description: "{quantite, temps}. Slit (nb).", get: (c) => op(c, IN.slit, null, "slit") },
  { chemin: "decoupe.guillotine", type: "number", origine: "in", description: "{quantite, taux, temps}. Guillotine.", get: (c) => opTaux(c, IN.guillotineQte, IN.guillotineTaux, "guillotine") },
  { chemin: "decoupe.assemblage", type: "number", origine: "in", description: "{quantite, taux, temps}. Assemblage.", get: (c) => opTaux(c, IN.assemblageQte, IN.assemblageTaux, "assemblage") },
  { chemin: "decoupe.autres", type: "number", origine: "in", description: "{quantite, taux, temps}. Autres opérations de découpe.", get: (c) => opTaux(c, IN.autresDecoupeQte, IN.autresDecoupeTaux, "autresDecoupe") },
  { chemin: "decoupe.platine.adhesif", type: "number", origine: "in", description: "{nb_die, up, temps}. Platine adhésif.", get: (c) => plat(c, IN.platAdhesifDie, IN.platAdhesifUp, "platAdhesif") },
  { chemin: "decoupe.platine.coupe", type: "number", origine: "in", description: "{nb_die, up, temps}. Platine coupe.", get: (c) => plat(c, IN.platCoupeDie, IN.platCoupeUp, "platCoupe") },
  { chemin: "decoupe.platine.kiss_cut", type: "number", origine: "in", description: "{nb_die, up, temps}. Platine kiss-cut. nb_die vaut 0 ou 1 (interrupteur depuis v1.1).", get: (c) => plat(c, IN.platKisscutDie, IN.platKisscutUp, "platKisscut") },
  { chemin: "decoupe.platine.embossage", type: "number", origine: "in", description: "{nb_die, up, temps}. Platine embossage.", get: (c) => plat(c, IN.platEmbossageDie, IN.platEmbossageUp, "platEmbossage") },
  { chemin: "decoupe.platine.ajustement_pct", type: "percent", origine: "in", description: "Ajustement manuel du temps platine.", get: P(IN.ajustPlatine) },
  { chemin: "decoupe.platine.temps_total", type: "number", origine: "out", description: "{heures, minutes, minutes_totales}.", get: H(...DECOUPE_HM.platTotal) },
  { chemin: "decoupe.zund.adhesif", type: "number", origine: "in", description: "{contour, cut_out, temps}. Zund adhésif. contour vaut 0 ou 1 (interrupteur depuis v1.1) ; cut_out = nombre de découpes intérieures par feuille.", get: (c) => zund(c, IN.zundAdhesifC, IN.zundAdhesifO, "zundAdhesif") },
  { chemin: "decoupe.zund.coupe", type: "number", origine: "in", description: "{contour, cut_out, temps}. Zund coupe. Mêmes règles que adhesif.", get: (c) => zund(c, IN.zundCoupeC, IN.zundCoupeO, "zundCoupe") },
  { chemin: "decoupe.zund.kiss_cut", type: "number", origine: "in", description: "{contour, cut_out, temps}. Zund kiss-cut. Mêmes règles que adhesif.", get: (c) => zund(c, IN.zundKisscutC, IN.zundKisscutO, "zundKisscut") },
  { chemin: "decoupe.zund.ajustement_pct", type: "percent", origine: "in", description: "Ajustement manuel du temps Zund.", get: P(IN.ajustZund) },
  { chemin: "decoupe.zund.temps_total", type: "number", origine: "out", description: "{heures, minutes, minutes_totales}.", get: H(...DECOUPE_HM.zundTotal) },
  { chemin: "decoupe.finition.decorticage", type: "number", origine: "in", description: "{quantite, taux, temps}. Décorticage.", get: (c) => opTaux(c, IN.decorticageQte, IN.decorticageTaux, "decorticage") },
  // v1.2 — opération retirée de l'outil le 28 sept. (« plus utilisée ») : le champ reste au
  // contrat pour ne pas casser les parseurs v1.0/v1.1, mais quantite vaut désormais toujours null.
  { chemin: "decoupe.finition.coins_ronds", type: "number|null", origine: "in", description: "{quantite, taux, temps}. Coins ronds — OBSOLÈTE depuis la v1.2 : l'opération a été retirée de l'outil, `quantite` est toujours null. Champ conservé pour compatibilité, retiré à la prochaine version majeure.", get: (c) => opTaux(c, IN.coinsRondsQte, IN.coinsRondsTaux, "coinsRonds") },
  { chemin: "decoupe.finition.laser", type: "number", origine: "in", description: "{quantite, ajustement, temps}. Laser.", get: (c) => ({ quantite: N(IN.laserQte)(c), ajustement: N(IN.laserAjust)(c), temps: H(...DECOUPE_HM.laser)(c) }) },
  { chemin: "decoupe.finition.autres[]", type: "number", origine: "in", description: "{libelle, quantite, taux_a, taux_b, temps}. Deux lignes « Autres » libres.", get: (c) => autres(c) },
  { chemin: "decoupe.finition.verification", type: "number", origine: "in", description: "{quantite, taux, temps}. Vérification / comptage.", get: (c) => opTaux(c, IN.verifQte, IN.verifTaux, "verif") },
  { chemin: "decoupe.finition.emballage", type: "number", origine: "in", description: "{quantite, taux, temps}. Emballage.", get: (c) => opTaux(c, IN.emballageQte, IN.emballageTaux, "emballage") },

  // ── machines
  { chemin: "machines.presse", type: "string|null", origine: "in", description: "Presse choisie (nom de la fiche machine). null = gabarit par défaut.", get: machine(CELL_PRESSE) },
  { chemin: "machines.zund", type: "string|null", origine: "in", description: "Table de découpe Zund choisie.", get: machine(CELL_ZUND) },
  { chemin: "machines.platine", type: "string|null", origine: "in", description: "Platine choisie.", get: machine(CELL_PLATINE) },
  { chemin: "machines.laminoir", type: "string|null", origine: "in", description: "Laminoir choisi.", get: machine(CELL_LAMINOIR) },
  { chemin: "machines.slitter", type: "string|null", origine: "in", description: "Slitter choisi.", get: machine(CELL_SLITTER) },
  { chemin: "machines.guillotine", type: "string|null", origine: "in", description: "Guillotine choisie.", get: machine(CELL_GUILLOTINE) },
  { chemin: "machines.matrice_job", type: "number|null", origine: "in", description: "Coût de la matrice (die) propre au job, en $.", get: N(CELL_MATRICE) },

  // ── sous-contrat
  { chemin: "sous_contrat[]", type: "string", origine: "in", description: "Lignes de sous-traitance renseignées (max 4, lignes vides omises).", get: (c) => sousContrat(c) },
  { chemin: "sous_contrat[].fournisseur", type: "string", origine: "in", description: "Nom du fournisseur." },
  { chemin: "sous_contrat[].cout", type: "money|null", origine: "in", description: "Coût fournisseur." },
  { chemin: "sous_contrat[].marge_pct", type: "percent", origine: "in", description: "Marge appliquée (défaut 35)." },
  { chemin: "sous_contrat[].montant", type: "money", origine: "out", description: "Montant facturé = coût × (1 + marge)." },

  // ── frais
  { chemin: "frais.transport", type: "money|null", origine: "in", description: "Transport ($).", get: N(IN.transport) },
  { chemin: "frais.autres", type: "money|null", origine: "in", description: "Autres frais ($).", get: N(IN.autresFrais) },

  // ── prix
  { chemin: "prix.devise", type: "string", origine: "meta", description: "Toujours « CAD ».", get: () => "CAD" },
  { chemin: "prix.facteur_marge_pct", type: "percent", origine: "in", description: "Facteur de marge appliqué au coût de revient (défaut 25).", get: P(IN.facteur) },
  { chemin: "prix.cout_revient", type: "money", origine: "out", description: "Coût de revient = somme des 6 catégories internes (matériaux, soies/encres, set-up découpe, sérigraphie, découpe/numérique, divers). Le sous-contrat n'en fait PAS partie.", get: M(OUT.montant) },
  { chemin: "prix.prix_vendant", type: "money", origine: "out", description: "Prix vendant = coût de revient × (1 + facteur de marge) + sous-contrat (le sous-contrat porte sa propre marge, voir sous_contrat[].marge_pct).", get: M(OUT.total) },
  { chemin: "prix.prix_unitaire", type: "money", origine: "out", description: "Prix vendant ÷ quantité (4 décimales). C'est la suggestion du moteur ; le prix engagé est prix_vendu_unitaire quand il est renseigné.", get: M4(OUT.prixUnitaire) },
  { chemin: "prix.prix_vendu_unitaire", type: "money|null", origine: "in", description: "v1.1 — Prix vendu unitaire décidé par le chargé de projet (peut être =, > ou < prix_unitaire ; jamais recalculé). null si non saisi : utilisez prix_unitaire.", get: (c) => r4(num(brut(c, CELL_VENDU))) },
  { chemin: "prix.prix_vendu_total", type: "money|null", origine: "out", description: "v1.1 — prix_vendu_unitaire × quantité (2 décimales). null si prix_vendu_unitaire est null.", get: (c) => { const v = num(brut(c, CELL_VENDU)); const q = num(brut(c, IN.quantite)); return v === null || q === null ? null : r2(v * q); } },
  { chemin: "prix.taux_us", type: "number|null", origine: "in", description: "Taux de change USD saisi (null si non renseigné).", get: N(IN.tauxUs) },
  { chemin: "prix.prix_unitaire_us", type: "money|null", origine: "out", description: "Prix unitaire en USD (null si pas de taux).", get: (c) => (N(IN.tauxUs)(c) ? r4(num(c.m.val(OUT.prixUnitaireUs))) : null) },
  { chemin: "prix.temps_total", type: "number", origine: "out", description: "Temps total de main-d'œuvre {heures, minutes, minutes_totales}.", get: H(OUT.tempsTotalHrs, OUT.tempsTotalMin) },

  // ── ventilation des coûts
  { chemin: "ventilation_couts[]", type: "money", origine: "out", description: "Les 6 catégories qui composent le coût de revient + le sous-contrat (ajouté après la marge). Toujours 7 lignes, dans cet ordre.", get: (c) => ventilation(c) },
  { chemin: "ventilation_couts[].code", type: "string", origine: "out", description: "materiaux | soies_encres | setup_decoupe | serigraphie | decoupe_numerique | divers | sous_contrat." },
  { chemin: "ventilation_couts[].libelle", type: "string", origine: "out", description: "Libellé lisible." },
  { chemin: "ventilation_couts[].montant", type: "money", origine: "out", description: "Montant de la catégorie." },
  { chemin: "ventilation_couts[].temps", type: "number|null", origine: "out", description: "{heures, minutes, minutes_totales} — null pour matériaux et sous-contrat." },
];

// ── constructeurs des sous-objets ───────────────────────────────────────────
function hmOp(c: Ctx, cle: keyof typeof DECOUPE_HM) {
  const [h, m] = DECOUPE_HM[cle];
  return H(h, m)(c);
}
function op(c: Ctx, qte: string, qteB: string | null, cle: keyof typeof DECOUPE_HM) {
  const o: Record<string, unknown> = { quantite: N(qte)(c) };
  if (qteB) o.quantite_b = N(qteB)(c);
  o.temps = hmOp(c, cle);
  return o;
}
function opTaux(c: Ctx, qte: string, taux: string, cle: keyof typeof DECOUPE_HM) {
  return { quantite: N(qte)(c), taux: N(taux)(c), temps: hmOp(c, cle) };
}
function plat(c: Ctx, die: string, up: string, cle: keyof typeof DECOUPE_HM) {
  return { nb_die: I(die)(c), up: I(up)(c), temps: hmOp(c, cle) };
}
function zund(c: Ctx, cont: string, cut: string, cle: keyof typeof DECOUPE_HM) {
  return { contour: N(cont)(c), cut_out: N(cut)(c), temps: hmOp(c, cle) };
}
function autres(c: Ctx) {
  return [
    { libelle: S(IN.autres1Label)(c), quantite: N(IN.autres1Qte)(c), taux_a: N(IN.autres1A)(c), taux_b: N(IN.autres1B)(c), temps: hmOp(c, "autres1") },
    { libelle: S(IN.autres2Label)(c), quantite: N(IN.autres2Qte)(c), taux_a: N(IN.autres2A)(c), taux_b: N(IN.autres2B)(c), temps: hmOp(c, "autres2") },
  ];
}

const LIGNES_MAT: { ligne: string; nom: string; cout?: string; mont: string; min?: string; perte?: string; coutManuel?: string }[] = [
  { ligne: "lexan", nom: IN.matLexan, cout: OUT.coutLexan, mont: OUT.montLexan, min: OUT.minLexan },
  { ligne: "vinyle", nom: IN.matVinyle, cout: OUT.coutVinyle, mont: OUT.montVinyle, min: OUT.minVinyle },
  { ligne: "polyester", nom: IN.matPolyester, cout: OUT.coutPolyester, mont: OUT.montPolyester, min: OUT.minPolyester },
  { ligne: "alu_foil", nom: IN.matAluFoil, cout: OUT.coutAluFoil, mont: OUT.montAluFoil, min: OUT.minAluFoil },
  { ligne: "divers", nom: IN.matDivers, cout: OUT.coutDivers, mont: OUT.montDivers, min: OUT.minDivers },
  { ligne: "adhesif", nom: IN.matAdhesif, cout: OUT.coutAdhesif, mont: OUT.montAdhesif, min: OUT.minAdhesif },
  { ligne: "overlaminating", nom: IN.matOverlam, cout: OUT.coutOverlam, mont: OUT.montOverlam, min: OUT.minOverlam },
  { ligne: "xtra1", nom: IN.matXtra1, mont: OUT.montXtra1, min: OUT.minXtra1, perte: IN.xtra1Perte, coutManuel: IN.xtra1Cout },
  { ligne: "xtra2", nom: IN.matXtra2, mont: OUT.montXtra2, min: OUT.minXtra2, perte: IN.xtra2Perte, coutManuel: IN.xtra2Cout },
  { ligne: "xtra3", nom: IN.matXtra3, mont: OUT.montXtra3, perte: IN.xtra3Perte, coutManuel: IN.xtra3Cout },
  { ligne: "xtra4", nom: IN.matXtra4, mont: OUT.montXtra4, perte: IN.xtra4Perte, coutManuel: IN.xtra4Cout },
];
function materiaux(c: Ctx) {
  const out: Record<string, unknown>[] = [];
  for (const l of LIGNES_MAT) {
    const nom = S(l.nom)(c);
    if (!nom || (XTRA_PLACEHOLDER as readonly string[]).includes(nom)) continue;
    out.push({
      ligne: l.ligne,
      nom,
      cout_pi2: l.cout ? Mn(l.cout)(c) : r2(N(l.coutManuel!)(c)),
      perte_pct: l.perte ? P(l.perte)(c) : null,
      montant: M(l.mont)(c),
      temps_debitage_min: l.min ? r2(num(c.m.val(l.min))) : null,
    });
  }
  return out;
}

function sousContrat(c: Ctx) {
  const lignes = [
    [IN.fourn1, IN.sc1Cout, IN.sc1Taux, OUT.sc1Mont],
    [IN.fourn2, IN.sc2Cout, IN.sc2Taux, OUT.sc2Mont],
    [IN.fourn3, IN.sc3Cout, IN.sc3Taux, OUT.sc3Mont],
    [IN.fourn4, IN.sc4Cout, IN.sc4Taux, OUT.sc4Mont],
  ];
  return lignes
    .filter(([f, cout]) => S(f)(c) || N(cout)(c))
    .map(([f, cout, taux, mont]) => ({ fournisseur: S(f)(c), cout: r2(N(cout)(c)), marge_pct: P(taux)(c), montant: M(mont)(c) }));
}

function quantitesAlternatives(c: Ctx) {
  const cells = [IN.qte1, IN.qte2, ...Object.keys(c.e).filter((k) => k.startsWith("X!QTE")).sort()];
  // depuis v1.1 la quantité principale figure aussi dans la table (scénario actif) : on ne la
  // répète pas ici — elle est déjà dans production.quantite / prix.*
  const principale = I(IN.quantite)(c);
  const out: Record<string, unknown>[] = [];
  for (const cell of cells) {
    const q = I(cell)(c);
    if (!q || q <= 0 || q === principale) continue;
    const sim = c.simuler?.(q);
    out.push({
      quantite: q,
      cout_unitaire: sim ? r4(sim.cout) : null,
      prix_unitaire: sim ? r4(sim.prix) : null,
      prix_vendu_unitaire: r4(num(brut(c, cellVendu(cell)))),
    });
  }
  return out;
}

function ventilation(c: Ctx) {
  const t = (h?: string, m?: string) => (h && m ? H(h, m)(c) : null);
  return [
    { code: "materiaux", libelle: "Matières premières", montant: M(OUT.cat1Mat)(c), temps: null },
    { code: "soies_encres", libelle: "Soies / encres / développement", montant: M(OUT.cat2Soies)(c), temps: t(OUT.cat2Hrs, OUT.cat2Min) },
    { code: "setup_decoupe", libelle: "Set-up découpe", montant: M(OUT.cat3Setup)(c), temps: t(OUT.cat3Hrs, OUT.cat3Min) },
    { code: "serigraphie", libelle: "Sérigraphie", montant: M(OUT.cat4Seri)(c), temps: t(OUT.cat4Hrs, OUT.cat4Min) },
    { code: "decoupe_numerique", libelle: "Découpe / numérique", montant: M(OUT.cat5Dec)(c), temps: t(OUT.cat5Hrs, OUT.cat5Min) },
    { code: "divers", libelle: "Divers", montant: M(OUT.cat6Divers)(c), temps: t(OUT.cat6Hrs, OUT.cat6Min) },
    { code: "sous_contrat", libelle: "Sous-contrat", montant: M(OUT.cat7SousContrat)(c), temps: null },
  ];
}

// ── construction du JSON ────────────────────────────────────────────────────
function poser(obj: Record<string, unknown>, chemin: string, valeur: unknown) {
  const parts = chemin.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = valeur;
}

/** Construit le JSON contractuel d'une soumission (ce que Zoho enverra au client). */
export function construireSoumissionJSON(ctx: Ctx): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ch of CHAMPS) {
    if (!ch.get) continue; // sous-champ d'un tableau : documenté, construit par le parent
    poser(out, ch.chemin.replace(/\[\]$/, ""), ch.get(ctx));
  }
  return out;
}

// ── documentation ───────────────────────────────────────────────────────────
const TYPES_DOC: Record<TypeChamp, string> = {
  string: "chaîne",
  "string|null": "chaîne ou null",
  integer: "entier",
  "integer|null": "entier ou null",
  number: "nombre",
  "number|null": "nombre ou null",
  boolean: "booléen",
  percent: "pourcentage 0-100 (nombre)",
  money: "montant CAD (nombre, 2 déc.)",
  "money|null": "montant CAD ou null",
  date: "date ISO YYYY-MM-DD",
};

/** Table Markdown des champs, groupée par section (1er segment du chemin). */
export function docChamps(): string {
  const sections = new Map<string, Champ[]>();
  for (const ch of CHAMPS) {
    const sec = ch.chemin.split(".")[0].replace(/\[\]$/, "");
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(ch);
  }
  const lignes: string[] = [];
  for (const [sec, champs] of sections) {
    lignes.push(`\n### \`${sec}\`\n`);
    lignes.push("| Champ | Type | Origine | Description |");
    lignes.push("|---|---|---|---|");
    for (const ch of champs) {
      const org = ch.origine === "in" ? "saisi" : ch.origine === "out" ? "**calculé**" : "méta";
      lignes.push(`| \`${ch.chemin}\` | ${TYPES_DOC[ch.type]} | ${org} | ${ch.description} |`);
    }
  }
  return lignes.join("\n");
}
