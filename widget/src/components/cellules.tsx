// Cellules du formulaire : saisie numérique, pourcentage, texte, drapeau, valeur calculée.
// UX : contenu sélectionné au focus, Entrée valide et passe au champ suivant,
// chaque cellule porte data-cell → l'InfoBulle explique sa provenance au survol/focus.
import { useEffect, useState, type ReactNode } from "react";
import type { CellValue } from "@/lib/moteur";

function parseNombre(s: string): number | "" {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-") return "";
  const n = Number(t);
  return Number.isFinite(n) ? n : "";
}

/** Entrée : valide et passe au champ suivant (navigation clavier fluide). */
function toucheEntree(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;
  const courant = e.target as HTMLElement;
  courant.blur();
  const tous = Array.from(
    document.querySelectorAll<HTMLElement>(".sheet input.in, .sheet select.in"),
  ).filter((el) => el.offsetParent !== null && !(el as HTMLInputElement).readOnly);
  const i = tous.indexOf(courant);
  const prochain = tous[i + 1];
  if (prochain) {
    prochain.focus();
    if (prochain instanceof HTMLInputElement) prochain.select();
  }
}

const surFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

interface SaisieProps {
  cell: string;
  value: CellValue;
  onChange: (cell: string, v: CellValue) => void;
  width?: number;
  className?: string;
  label?: string;
  /** valeur suggérée, affichée en grisé tant que la cellule est vide (ex. prix vendu calculé) */
  placeholder?: string;
  /** champ alimenté ailleurs (bon de travail) : visible, grisé, non modifiable */
  lectureSeule?: boolean;
}

/** Saisie numérique (accepte la virgule décimale). Vide = cellule blanche. */
export function CelluleNum({ cell, value, onChange, width, className, label, placeholder }: SaisieProps) {
  const [texte, setTexte] = useState(value === "" ? "" : String(value).replace(".", ","));
  useEffect(() => {
    setTexte(value === "" || value === undefined ? "" : String(value).replace(".", ","));
  }, [value]);
  return (
    <input
      size={1}
      className={"in num " + (className ?? "")}
      style={width ? { width } : undefined}
      inputMode="decimal"
      value={texte}
      placeholder={placeholder}
      data-cell={cell}
      data-label={label}
      aria-label={label ?? cell}
      onFocus={surFocus}
      onChange={(e) => setTexte(e.target.value)}
      onBlur={() => onChange(cell, parseNombre(texte))}
      onKeyDown={toucheEntree}
    />
  );
}

/** Saisie pourcentage : affiche 25, stocke 0,25. */
export function CellulePct({ cell, value, onChange, width, className, label }: SaisieProps) {
  const affiche =
    value === "" || value === undefined ? "" : String(Math.round(Number(value) * 10000) / 100).replace(".", ",");
  const [texte, setTexte] = useState(affiche);
  useEffect(() => setTexte(affiche), [affiche]);
  return (
    <span className={"pctwrap " + (className ?? "")}>
      <input
      size={1}
        className="in num pct"
        style={width ? { width } : undefined}
        inputMode="decimal"
        value={texte}
        data-cell={cell}
        data-label={label}
        aria-label={label ?? cell}
        onFocus={surFocus}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={() => {
          const n = parseNombre(texte);
          onChange(cell, n === "" ? "" : n / 100);
        }}
        onKeyDown={toucheEntree}
      />
      <span className="pcts">%</span>
    </span>
  );
}

/** Saisie texte libre. `lectureSeule` : rempli par le bon de travail, on l'affiche sans le laisser taper. */
export function CelluleTexte({ cell, value, onChange, width, className, label, lectureSeule }: SaisieProps) {
  const [texte, setTexte] = useState(String(value ?? ""));
  useEffect(() => setTexte(String(value ?? "")), [value]);
  return (
    <input
      size={1}
      className={"in " + (lectureSeule ? "ro " : "") + (className ?? "")}
      style={width ? { width } : undefined}
      value={texte}
      readOnly={lectureSeule}
      tabIndex={lectureSeule ? -1 : undefined}
      title={lectureSeule ? "Rempli par le bon de travail — non modifiable ici" : undefined}
      data-cell={cell}
      data-label={label}
      aria-label={label ?? cell}
      onFocus={lectureSeule ? undefined : surFocus}
      onChange={(e) => setTexte(e.target.value)}
      onBlur={() => onChange(cell, texte)}
      onKeyDown={toucheEntree}
    />
  );
}

// ── date ────────────────────────────────────────────────────────────────────
// Stocke une date ISO (AAAA-MM-JJ), le format que `dateCreator()` sait relire pour Creator.
// Les anciennes soumissions portent du texte libre dans la même cellule : plutôt que de
// l'effacer en silence (un <input type="date"> n'affiche rien s'il ne comprend pas la valeur),
// on tente de le convertir, et si c'est impossible on garde le champ texte avec un repère.
const MOIS_FR = ["jan", "fév", "mar", "avr", "mai", "jui", "jul", "aoû", "sep", "oct", "nov", "déc"];

export function versISO(v: CellValue): string | null {
  const t = String(v ?? "").trim();
  if (!t) return "";
  let a: number, m: number, j: number;
  let mm: RegExpMatchArray | null;
  if ((mm = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) [a, m, j] = [+mm[1], +mm[2], +mm[3]];
  else if ((mm = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) [j, m, a] = [+mm[1], +mm[2], +mm[3]];
  else if ((mm = t.match(/^(\d{1,2})[-/ ]([A-Za-zéûà.]{3,10})[-/ ](\d{4})$/))) {
    const i = MOIS_FR.indexOf(mm[2].slice(0, 3).toLowerCase());
    if (i < 0) return null;
    [j, m, a] = [+mm[1], i + 1, +mm[3]];
  } else return null;
  if (m < 1 || m > 12 || j < 1 || j > 31) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

/** Saisie de date : calendrier natif. Retombe sur du texte si la valeur existante n'est pas une date. */
export function CelluleDate({ cell, value, onChange, width, className, label }: SaisieProps) {
  const iso = versISO(value);
  const [texte, setTexte] = useState(String(value ?? ""));
  useEffect(() => setTexte(String(value ?? "")), [value]);

  if (iso === null) {
    // valeur non interprétable : on la laisse telle quelle plutôt que de la perdre
    return (
      <input
        size={1}
        className={"in date-libre " + (className ?? "")}
        style={width ? { width } : undefined}
        value={texte}
        title="Texte non reconnu comme une date — remplacez-le par une date pour obtenir le calendrier"
        data-cell={cell}
        data-label={label}
        aria-label={label ?? cell}
        onFocus={surFocus}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={() => onChange(cell, texte)}
        onKeyDown={toucheEntree}
      />
    );
  }
  return (
    <input
      type="date"
      className={"in " + (className ?? "")}
      style={width ? { width } : undefined}
      value={iso}
      data-cell={cell}
      data-label={label}
      aria-label={label ?? cell}
      onChange={(e) => onChange(cell, e.target.value)}
      onKeyDown={toucheEntree}
    />
  );
}

/** Drapeau 1 / vide (cellule orange cliquable, comme dans le classeur). */
export function CelluleFlag({ cell, value, onChange, label }: SaisieProps) {
  // « ≥ 1 » et non « === 1 » : une ancienne soumission peut porter « 4 » dans une cellule
  // devenue interrupteur — elle doit s'afficher cochée (normaliserEntrees la ramène à 1).
  const actif = Number(value) >= 1;
  return (
    <button
      type="button"
      className={"flag" + (actif ? " on" : "")}
      data-cell={cell}
      data-label={label}
      aria-label={label ?? cell}
      aria-pressed={actif}
      onClick={() => onChange(cell, actif ? "" : 1)}
    >
      {actif ? "✓" : ""}
    </button>
  );
}

/** Valeur calculée : lecture seule + halo bref quand elle change (feedback de recalcul). */
export function Va({
  cell,
  label,
  className,
  children,
}: {
  cell: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const [flash, setFlash] = useState(false);
  const rendu = String(children);
  const [prev, setPrev] = useState(rendu);
  useEffect(() => {
    if (rendu !== prev) {
      setPrev(rendu);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [rendu, prev]);
  return (
    <span className={"va num " + (flash ? "flash " : "") + (className ?? "")} data-cell={cell} data-label={label} tabIndex={0}>
      {children}
    </span>
  );
}

/** Recherche de matériau : champ texte + datalist (filtrage natif en tapant). */
export function SelectMateriau({
  cell,
  value,
  onChange,
  options,
  listId,
  placeholder,
  libre = false,
  label,
}: SaisieProps & { options: string[]; listId: string; placeholder?: string; libre?: boolean }) {
  // Le classeur stocke le texte d'invite du menu déroulant DANS la cellule (S!M31:M34 =
  // « Choisir matériau avec/sans débitage »). Affiché tel quel, le champ paraît rempli alors
  // qu'il est vide — et le texte déborde. On l'affiche comme invite, sans toucher à la cellule.
  const brut = String(value ?? "");
  const val = /^choisir mat[ée]riau/i.test(brut.trim()) ? "" : brut;
  const [texte, setTexte] = useState(val);
  const [invalide, setInvalide] = useState(false);
  useEffect(() => {
    setTexte(val);
    setInvalide(false);
  }, [val]);
  return (
    <input
      size={1}
      className={"in mat" + (invalide ? " invalide" : "")}
      list={listId}
      value={texte}
      data-cell={cell}
      data-label={label}
      aria-label={label ?? cell}
      placeholder={placeholder ?? "Rechercher un matériau…"}
      onFocus={surFocus}
      onChange={(e) => {
        setTexte(e.target.value);
        // sélection dans la liste → applique tout de suite
        if (options.includes(e.target.value)) onChange(cell, e.target.value);
      }}
      onBlur={() => {
        if (texte === "" ) { onChange(cell, ""); return; }
        if (options.includes(texte) || libre) { onChange(cell, texte); setInvalide(false); return; }
        // nom inconnu du catalogue → on revient au choix précédent (le prix serait 0)
        setTexte(val);
        setInvalide(true);
        setTimeout(() => setInvalide(false), 1200);
      }}
      onKeyDown={toucheEntree}
    />
  );
}
