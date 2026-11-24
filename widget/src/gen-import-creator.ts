// ─────────────────────────────────────────────────────────────────────────────
//  Génère les fichiers d'import CSV des trois tables Creator qui restent à créer.
//
//  POURQUOI CE SCRIPT EXISTE. Les trois tables ne peuvent pas être créées par l'API :
//  `createForm` exige `environment: "development"` (seul environnement supporté par les
//  Builder APIs), et cet environnement n'existe pas sur ce compte —
//  `getAppEnvironmentStatus` répond `11580 : Environments are not supported for this version
//  of creator`. Ce n'est pas un refus temporaire, c'est une limite du forfait. La création
//  passe donc par l'interface Creator, à la main.
//
//  Ce qui est à la main n'a pas à être RECOPIÉ à la main : 68 lignes tapées, c'est 68
//  occasions de faute de frappe, et une faute de frappe dans ces tables ne produit aucune
//  erreur — la ligne est écartée par le filtre, la table renvoie une liste vide, le code
//  retombe en silence sur les données embarquées. Tout a l'air de marcher et aucune
//  modification faite dans la table n'a d'effet.
//
//  Les CSV sont donc générés DEPUIS LE CODE, qui est la source de vérité aujourd'hui. Ils ne
//  peuvent pas dériver : `npm run gen:import` les régénère.
//
//  ⚠ L'import ne dispense pas de la vérification. Les noms de champs doivent être exacts
//  (`Largeur_po`, pas `Largeur` ni `Largeur_PO`). Après création, ajouter une ligne 99 × 99
//  active, ouvrir une soumission à grosse quantité et vérifier qu'elle apparaît dans les
//  candidats. Si elle n'apparaît pas, la table n'est pas lue.
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { FORMATS_FEUILLE_SNAPSHOT } from "@/data/montageSnapshot";
import { CONFIG_CHAMPS_NUMERIQUE, FILTRE_MATERIAU_PRODUIT } from "@/data/produitsNumeriques";

const DOSSIER = join("docs", "creator-import");

/** Échappement CSV. Les libellés contiennent des virgules (« Perforé 60/40 »), des guillemets
 *  et des caractères accentués : sans guillemets doublés, l'import décale les colonnes. */
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(entetes: string[], lignes: unknown[][]): string {
  // BOM UTF-8 : sans lui, Excel et l'import Creator lisent « Perforé » comme « PerforÃ© ».
  return "﻿" + [entetes, ...lignes].map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}

function ecrire(nom: string, contenu: string, nbLignes: number): void {
  const chemin = join(DOSSIER, nom);
  writeFileSync(chemin, contenu, "utf8");
  console.log(`${chemin.padEnd(52)} ${String(nbLignes).padStart(3)} lignes`);
}

mkdirSync(DOSSIER, { recursive: true });

// ── 1. Formats_Feuille ──────────────────────────────────────────────────────
// Rapport attendu : Formats_Feuille_Report (REPORT_FORMATS_FEUILLE dans le code).
// La compatibilité presse NE se saisit PAS : elle se déduit des fiches machines.
ecrire(
  "Formats_Feuille.csv",
  csv(
    ["Nom_format", "Largeur_po", "Hauteur_po", "Actif"],
    FORMATS_FEUILLE_SNAPSHOT.map((f) => [f.nom, f.largeurPo, f.hauteurPo, f.actif ? "Oui" : "Non"]),
  ),
  FORMATS_FEUILLE_SNAPSHOT.length,
);

// ── 2. Config_Champs_Produit_Numerique ──────────────────────────────────────
// ⚠ `Ordre` est une numérotation GLOBALE : respecter les bandes réservées documentées dans
// data/produitsNumeriques.ts. Renuméroter au hasard coupe un bloc en deux à l'écran.
ecrire(
  "Config_Champs_Produit_Numerique.csv",
  csv(
    [
      "Type_produit",
      "Sauf",
      "Bloc",
      "Champ_technique",
      "Libelle",
      "Type_champ",
      "Options",
      "Ordre",
      "Actif",
      "Requis",
      "Depend_de",
      "Depend_valeurs",
    ],
    CONFIG_CHAMPS_NUMERIQUE.map((c) => [
      c.typeProduit,
      (c.sauf ?? []).join(";"),
      c.bloc,
      c.champ,
      c.libelle,
      c.typeChamp,
      c.options.join(";"),
      c.ordre,
      c.actif ? 1 : 0,
      c.requis ? 1 : 0,
      c.dependDe ?? "",
      (c.dependValeurs ?? []).join(";"),
    ]),
  ),
  CONFIG_CHAMPS_NUMERIQUE.length,
);

// ── 3. Filtre_Materiau_Produit ──────────────────────────────────────────────
// Une ligne par couple produit × matériau : c'est ce que le rapprochement avec l'inventaire
// demandera, et une liste dans une cellule ne se filtre pas.
const filtre = Object.entries(FILTRE_MATERIAU_PRODUIT).flatMap(([produit, materiaux]) =>
  materiaux.map((m) => [produit, m]),
);
ecrire("Filtre_Materiau_Produit.csv", csv(["Type_produit", "Materiau"], filtre), filtre.length);

console.log(`\n${3} fichiers générés dans ${DOSSIER}/`);
