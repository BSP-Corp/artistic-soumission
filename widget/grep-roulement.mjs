// Usage exact des constantes de la part impression/roulement.
import { readFileSync } from "node:fs";
const c = JSON.parse(readFileSync(new URL("./src/data/classeur.json", import.meta.url)));
for (const motif of [/CH\$?89\b/, /CH\$?90\b/, /CH\$?91\b/, /CH\$?92\b/, /CF\$?71\b/]) {
  console.log("── motif", motif, "──");
  for (const sheet of ["S", "C", "FT"]) {
    for (const [cell, formula] of Object.entries(c[sheet].formulas ?? {})) {
      if (motif.test(formula)) console.log(sheet + "!" + cell, "=", formula.slice(0, 170));
    }
  }
}
for (const k of ["CH89", "CH90", "CH91", "CH92", "CF70", "CF71"]) console.log("INV!" + k, "=", c.INV[k]);
