// Couche d'infobulles globale : tout élément portant data-cell affiche, au survol OU
// au focus clavier, la provenance du chiffre (formule Excel + composantes et valeurs).
// Un seul écouteur délégué — aucun coût par cellule.
import { useEffect, useRef, useState } from "react";
import { expliquer, type Explication } from "@/lib/explication";
import type { CellValue, Classeur } from "@/lib/moteur";

function fmtVal(v: CellValue): string {
  if (typeof v === "number") {
    const r = Math.abs(v) >= 100 ? v.toFixed(2) : Math.round(v * 10000) / 10000;
    return String(r).replace(".", ",");
  }
  if (typeof v === "boolean") return v ? "VRAI" : "FAUX";
  if (v === "") return "vide";
  return String(v);
}

interface Props {
  classeur: Classeur;
  valeur: (cell: string) => CellValue;
  /** version des données : change à chaque recalcul pour rafraîchir la bulle ouverte */
  version: number;
}

export function InfoBulle({ classeur, valeur, version }: Props) {
  const [exp, setExp] = useState<Explication | null>(null);
  const [labelChamp, setLabelChamp] = useState<string | undefined>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const cible = useRef<string | null>(null);
  const bulle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function montrer(el: Element) {
      const cell = el.getAttribute("data-cell");
      if (!cell) return;
      cible.current = cell;
      setLabelChamp(el.getAttribute("data-label") ?? undefined);
      setExp(expliquer(classeur, cell, valeur));
      const r = el.getBoundingClientRect();
      setPos({ x: Math.min(r.left, window.innerWidth - 380), y: r.bottom + 6 });
    }
    function survol(e: Event) {
      const el = (e.target as Element).closest?.("[data-cell]");
      if (el) montrer(el);
      else if (!(e.target as Element).closest?.(".infobulle")) {
        cible.current = null;
        setExp(null);
      }
    }
    function focus(e: FocusEvent) {
      const el = (e.target as Element).closest?.("[data-cell]");
      if (el) montrer(el);
    }
    function blur() {
      cible.current = null;
      setExp(null);
    }
    function echap(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cible.current = null;
        setExp(null);
      }
    }
    document.addEventListener("mouseover", survol);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mouseover", survol);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("keydown", echap);
    };
  }, [classeur, valeur]);

  // rafraîchit la bulle ouverte quand le calcul change
  useEffect(() => {
    if (cible.current) setExp(expliquer(classeur, cible.current, valeur));
  }, [version, classeur, valeur]);

  // garde la bulle dans la fenêtre
  useEffect(() => {
    const el = bulle.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight) el.style.top = Math.max(8, pos.y - r.height - 34) + "px";
  }, [exp, pos]);

  if (!exp) return null;
  return (
    <div ref={bulle} className="infobulle" role="tooltip" style={{ left: pos.x, top: pos.y }}>
      <div className="ib-titre">
        <span className="ib-label">{labelChamp ?? exp.label}</span>
        <span className="ib-cell">{exp.cell}</span>
      </div>
      <div className="ib-valeur">= {fmtVal(exp.value)}</div>
      {exp.estSaisie ? (
        <div className="ib-saisie">Champ saisi — entre dans le calcul tel quel.</div>
      ) : (
        <>
          <code className="ib-formule">{exp.formule}</code>
          {exp.composantes.length > 0 && (
            <ul className="ib-deps">
              {exp.composantes.map((c) => (
                <li key={c.cell}>
                  <span className="ib-dep-label">{c.label}</span>
                  <span className="ib-dep-val">{fmtVal(c.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
