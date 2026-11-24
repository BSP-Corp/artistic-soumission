// Champs du 2e widget. Différence avec components/cellules.tsx : la valeur est écrite à
// CHAQUE FRAPPE, pas à la sortie du champ. Le client veut voir le total bouger « dès qu'il
// change quelque chose » (9 nov.) ; le moteur recalcule en moins de 20 ms.
import { useEffect, useState, type ReactNode } from "react";
import type { CellValue } from "@/lib/moteur";
import { lireNombre } from "./logique";

interface PropsChamp {
  label: string;
  cell: string;
  value: CellValue;
  onChange: (cell: string, v: CellValue) => void;
  /** affiche 25 pour 0,25 */
  pct?: boolean;
  unite?: string;
  placeholder?: string;
  /** sans étiquette visible (cellule de tableau) */
  nu?: boolean;
}

const enTexte = (v: CellValue, pct?: boolean) => {
  if (v === "" || v === undefined || v === null) return "";
  if (!pct) return String(v).replace(".", ",");
  return String(Math.round(Number(v) * 1e6) / 1e4).replace(".", ",");
};

export function Champ({ label, children, aide }: { label: string; children: ReactNode; aide?: ReactNode }) {
  return (
    <label className="s2-champ">
      <span className="s2-lb">{label}</span>
      {children}
      {aide ? <span className="s2-aide">{aide}</span> : null}
    </label>
  );
}

export function Nombre({ label, cell, value, onChange, pct, unite, placeholder, nu }: PropsChamp) {
  const [texte, setTexte] = useState(enTexte(value, pct));
  // Ne réécrire le texte que si la valeur a changé AILLEURS : sinon « 1, » deviendrait « 1 »
  // sous les doigts de l'utilisateur.
  useEffect(() => {
    const lu = lireNombre(texte);
    const courant = lu === "" || lu === null ? lu : pct ? lu / 100 : lu;
    const recu = value === undefined ? "" : value;
    const egal = typeof courant === "number" && recu !== "" ? Math.abs(courant - Number(recu)) < 1e-9 : courant === recu;
    if (!egal) setTexte(enTexte(value, pct));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const champ = (
    <span className="s2-saisie">
      <input
        className="in num"
        size={1}
        inputMode="decimal"
        aria-label={label}
        data-cell={cell}
        value={texte}
        placeholder={placeholder}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setTexte(e.target.value);
          const n = lireNombre(e.target.value);
          if (n !== null) onChange(cell, n === "" ? "" : pct ? n / 100 : n);
        }}
        onBlur={() => {
          if (lireNombre(texte) === null) setTexte(enTexte(value, pct));
        }}
      />
      {pct ? <i>%</i> : unite ? <i>{unite}</i> : null}
    </span>
  );
  return nu ? champ : <Champ label={label}>{champ}</Champ>;
}

export function Texte({ label, cell, value, onChange, placeholder, nu, type = "text" }: PropsChamp & { type?: "text" | "date" }) {
  const champ = (
    <input
      className="in"
      size={1}
      type={type}
      aria-label={label}
      data-cell={cell}
      value={String(value ?? "")}
      placeholder={placeholder}
      onChange={(e) => onChange(cell, e.target.value)}
    />
  );
  return nu ? champ : <Champ label={label}>{champ}</Champ>;
}

export function Coche({ label, cell, value, onChange }: PropsChamp) {
  return (
    <label className="s2-coche">
      <input type="checkbox" data-cell={cell} checked={Number(value) >= 1} onChange={(e) => onChange(cell, e.target.checked ? 1 : "")} />
      {label}
    </label>
  );
}

/** Choix de matériau : seule une valeur du catalogue est écrite. Un nom inconnu donnerait un
 *  prix nul sans le dire ; il est donc rejeté à la sortie du champ. */
export function Materiau({ label, cell, value, onChange, options }: PropsChamp & { options: string[] }) {
  const brut = String(value ?? "");
  const [texte, setTexte] = useState(brut);
  const [refus, setRefus] = useState(false);
  useEffect(() => setTexte(brut), [brut]);
  const liste = "s2-" + cell.replace("!", "-");
  return (
    <Champ label={label} aide={refus ? <b className="s2-alerte">absent du catalogue, choix précédent rétabli</b> : undefined}>
      <input
        className="in"
        size={1}
        list={liste}
        aria-label={label}
        data-cell={cell}
        value={texte}
        placeholder="Rechercher…"
        onChange={(e) => {
          setTexte(e.target.value);
          setRefus(false);
          if (e.target.value === "" || options.includes(e.target.value)) onChange(cell, e.target.value);
        }}
        onBlur={() => {
          if (texte === "" || options.includes(texte)) return;
          setTexte(brut);
          setRefus(true);
        }}
      />
      <datalist id={liste}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </Champ>
  );
}
