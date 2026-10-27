// Exporte la liste CHAMPS en JSON pur, pour alimenter la documentation interactive.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { CHAMPS, SCHEMA_VERSION } from "./contratSoumission";

const out = {
  schema_version: SCHEMA_VERSION,
  genere_le: new Date().toISOString().slice(0, 10),
  champs: CHAMPS.map((c) => ({
    chemin: c.chemin,
    type: c.type,
    origine: c.origine,
    description: c.description,
    section: c.chemin.split(".")[0].replace(/\[\]$/, ""),
  })),
};
writeFileSync(resolve(process.cwd(), "docs/api/champs.json"), JSON.stringify(out, null, 2), "utf8");
console.log("champs.json :", out.champs.length, "champs");
