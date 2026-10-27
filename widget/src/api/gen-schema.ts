// Génère docs/api/soumission.schema.json — JSON Schema draft 2020-12 du payload.
//
// Les types sont INFÉRÉS DU PAYLOAD RÉEL (produit par le moteur), pas déduits de la
// table CHAMPS : plusieurs entrées de CHAMPS décrivent un objet composite sous un type
// scalaire (ex. `decoupe.platine.coupe` = {nb_die, up, temps}), ce qui donnerait un
// schéma faux. Les descriptions, elles, viennent de CHAMPS quand le chemin correspond.
//
// Ce que le client peut en faire :
//   · valider chaque payload reçu (ajv, System.Text.Json, jsonschema…)
//   · générer ses types (quicktype, json-schema-to-typescript, NSwag…)
//   · monter un mock avant notre premier envoi

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { CHAMPS, SCHEMA_VERSION } from "./contratSoumission";

// ── payload de référence ────────────────────────────────────────────────────
// On relit le fichier que gen-exemple vient d'écrire au lieu de reconstruire un payload ici :
// les deux avaient fini par diverger (gen-schema ignorait normaliserEntrees, si bien que le
// schéma typait « entier » des champs devenus null dans l'exemple, et ajv refusait l'exemple
// contre son propre schéma). Une seule source, elles ne peuvent plus se contredire.
const payload = JSON.parse(readFileSync(resolve(process.cwd(), "docs/api/exemple-soumission.json"), "utf8")) as Record<string, unknown>;

// ── descriptions par chemin, depuis la table CHAMPS ─────────────────────────
const DESCRIPTIONS = new Map<string, string>();
for (const c of CHAMPS) DESCRIPTIONS.set(c.chemin.replace(/\[\]/g, ""), c.description);

/** Chemin JSON → chemin CHAMPS (les indices de tableau s'effacent). */
function cheminNormalise(pile: string[]): string {
  return pile.filter((p) => !/^\d+$/.test(p)).join(".");
}

type Schema = Record<string, unknown>;

/** Un champ vaut null dans l'exemple mais peut porter une valeur : on l'ouvre au
 *  type déclaré dans CHAMPS plutôt que de le figer sur `null`. */
function typeDeclare(chemin: string): string[] | null {
  const c = CHAMPS.find((x) => x.chemin.replace(/\[\]/g, "") === chemin);
  if (!c) return null;
  const base = c.type.split("|")[0];
  const map: Record<string, string> = {
    string: "string", date: "string", integer: "integer",
    number: "number", percent: "number", money: "number", boolean: "boolean",
  };
  const t = map[base];
  return t ? [t, "null"] : null;
}

/** Fusionne deux schémas d'éléments d'un même tableau : union des types et des
 *  propriétés, intersection des `required` (une clé absente d'un élément ne peut pas
 *  être obligatoire). */
function fusionner(a: Schema, b: Schema): Schema {
  const types = new Set<string>();
  for (const t of [a.type, b.type].flat()) if (typeof t === "string") types.add(t);
  const out: Schema = { type: types.size === 1 ? [...types][0] : [...types].sort() };

  const pa = (a.properties ?? {}) as Schema;
  const pb = (b.properties ?? {}) as Schema;
  const clefs = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  if (clefs.size) {
    const props: Schema = {};
    for (const k of clefs) {
      const va = pa[k] as Schema | undefined;
      const vb = pb[k] as Schema | undefined;
      props[k] = va && vb ? fusionner(va, vb) : ((va ?? vb) as Schema);
    }
    out.properties = props;
    const ra = new Set((a.required ?? []) as string[]);
    const rb = new Set((b.required ?? []) as string[]);
    const inter = [...ra].filter((k) => rb.has(k));
    if (inter.length) out.required = inter;
    out.additionalProperties = false;
  }
  if (a.items || b.items) {
    out.items = a.items && b.items ? fusionner(a.items as Schema, b.items as Schema) : ((a.items ?? b.items) as Schema);
  }
  const d = a.description ?? b.description;
  if (d) out.description = d;
  for (const k of ["minItems", "maxItems"]) if (a[k] !== undefined) out[k] = a[k];
  return out;
}

function inferer(valeur: unknown, pile: string[]): Schema {
  const chemin = cheminNormalise(pile);
  const desc = DESCRIPTIONS.get(chemin);
  const s: Schema = {};

  if (valeur === null) {
    s.type = typeDeclare(chemin) ?? ["string", "number", "boolean", "null"];
  } else if (Array.isArray(valeur)) {
    s.type = "array";
    if (valeur.length) {
      // Les éléments ne sont pas toujours homogènes : dans ventilation_couts, `temps`
      // vaut null pour les catégories sans main-d'œuvre et porte un objet ailleurs.
      // On fusionne le schéma de TOUS les éléments, sinon le schéma rejette le payload.
      s.items = valeur.map((v, i) => inferer(v, [...pile, String(i)])).reduce(fusionner);
    } else {
      s.items = { type: "object" };
    }
    // ventilation_couts : toujours exactement 7 lignes, c'est une garantie du contrat
    if (chemin === "ventilation_couts") {
      s.minItems = 7;
      s.maxItems = 7;
    }
  } else if (typeof valeur === "object") {
    s.type = "object";
    const props: Schema = {};
    const requis: string[] = [];
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) {
      props[k] = inferer(v, [...pile, k]);
      requis.push(k);
    }
    s.properties = props;
    s.required = requis;
    s.additionalProperties = false;
  } else if (typeof valeur === "number") {
    const dec = typeDeclare(chemin);
    s.type = dec ? dec[0] : Number.isInteger(valeur) ? "integer" : "number";
    // un entier de l'exemple peut être décimal ailleurs : on n'enferme que ce que
    // CHAMPS déclare explicitement entier
    if (s.type === "integer" && !dec) s.type = ["integer", "number"];
  } else {
    s.type = typeof valeur;
  }

  if (desc) s.description = desc;
  return s;
}

const racine = inferer(payload, []) as Schema;
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://groupecanva.example/schemas/soumission-" + SCHEMA_VERSION + ".json",
  title: "Soumission Matériaux Souples",
  description:
    "Charge utile envoyée par Zoho Creator à la plateforme partenaire à chaque soumission validée. " +
    "Conventions : pourcentages en 0-100, montants CAD (2 décimales, prix unitaire 4), " +
    "durées sous forme { heures, minutes, minutes_totales }, null si non saisi.",
  ...racine,
  examples: [payload],
};

writeFileSync(resolve(process.cwd(), "docs/api/soumission.schema.json"), JSON.stringify(schema, null, 2) + "\n", "utf8");

function compter(o: unknown): number {
  if (!o || typeof o !== "object") return 0;
  const s = o as Schema;
  let n = 0;
  if (s.properties) for (const v of Object.values(s.properties as Schema)) n += 1 + compter(v);
  if (s.items) n += compter(s.items);
  return n;
}
console.log("soumission.schema.json — propriétés décrites :", compter(racine));
console.log("descriptions rattachées :", DESCRIPTIONS.size, "chemins connus de CHAMPS");
