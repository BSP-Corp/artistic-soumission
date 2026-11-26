// Numéros de soumission et révisions (réponse de Roberto, 25 nov. 2026) :
// « Mettre R1, R2 ainsi de suite à la fin de la séquence » → S-2026-0002, S-2026-0002R1, R2…
//
// Une révision est une NOUVELLE soumission : l'originale reste telle qu'elle a été envoyée.

/** S-2026-0002R3 → S-2026-0002 */
export const numeroBase = (no: string) => no.trim().replace(/R\d+$/i, "");

/** Numéro de révision d'un numéro : 0 pour l'original. */
export function noRevision(no: string): number {
  const m = /R(\d+)$/i.exec(no.trim());
  return m ? Number(m[1]) : 0;
}

/** Prochaine révision de `no`, d'après tous les numéros déjà enregistrés. "" si `no` est vide. */
export function prochaineRevision(no: string, existants: string[]): string {
  const base = numeroBase(no);
  if (!base) return "";
  let max = noRevision(no);
  for (const x of existants) if (numeroBase(x) === base) max = Math.max(max, noRevision(x));
  return `${base}R${max + 1}`;
}

/** Numéros S-… lus dans les données des soumissions enregistrées. */
export function numerosEnregistres(donnees: string[], cellNumero: string): string[] {
  const re = new RegExp(`"${cellNumero.replace(/[!]/g, "\\$&")}":"(S-[^"]+)"`);
  return donnees.map((d) => re.exec(d)?.[1] ?? "").filter(Boolean);
}
