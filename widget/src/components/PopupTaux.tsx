// Popup « Taux & paramètres » : l'utilisateur choisit un taux/paramètre (Code INV_n / S_xxx),
// voit sa valeur actuelle, peut la modifier — effet immédiat sur le calcul en cours (Appliquer),
// et en option l'enregistrer dans Creator (Enregistrer) pour que ça serve à toutes les soumissions futures.
import { useEchap } from "@/hooks/useEchap";
import { useMemo, useState } from "react";
import type { CellValue } from "@/lib/moteur";
import type { TauxCreator } from "@/services/zohoService";
import { sauvegarderTaux } from "@/services/zohoService";
import { TAUX_SNAPSHOT } from "@/data/tauxSnapshot";

interface Champ {
  label: string;
  cle: "valeur" | "cadence" | "temps";
  cell: string;
}

interface Ligne {
  id: string;
  code: string;
  section: string;
  libelle: string;
  champs: Champ[];
}

function construireLignes(taux: TauxCreator[]): Ligne[] {
  const out: Ligne[] = [];
  for (const t of taux) {
    if (!t.actif) continue;
    const mInv = t.code.match(/^INV_(\d+)$/);
    const mS = t.code.match(/^S_([A-Z]+\d+)$/);
    const champs: Champ[] = [];
    if (mInv) {
      const l = mInv[1];
      if (t.valeur !== null) champs.push({ label: "Valeur (CF)", cle: "valeur", cell: "INV!CF" + l });
      if (t.cadence !== null) champs.push({ label: "Cadence (CH)", cle: "cadence", cell: "INV!CH" + l });
      if (t.temps !== null) champs.push({ label: "Temps (CI)", cle: "temps", cell: "INV!CI" + l });
    } else if (mS) {
      champs.push({ label: "Valeur", cle: "valeur", cell: "S!" + mS[1] });
    } else {
      continue;
    }
    if (champs.length) out.push({ id: t.id, code: t.code, section: t.section, libelle: t.libelle, champs });
  }
  return out;
}

/** repli hors Zoho : le snapshot embarqué n'a pas d'ID Creator (édition locale seulement) */
function lignesSnapshot(): Ligne[] {
  return construireLignes(
    TAUX_SNAPSHOT.map((t) => ({
      id: "",
      code: t.code,
      section: t.section,
      libelle: t.libelle,
      valeur: t.valeur,
      cadence: t.cadence,
      temps: t.temps,
      actif: true,
    })),
  );
}

interface Props {
  taux: TauxCreator[] | null; // null = pas de paramètres Creator chargés
  isZoho: boolean;
  valeurActuelle: (cell: string) => CellValue;
  appliquer: (cell: string, v: CellValue) => void;
  onClose: () => void;
}

export function PopupTaux({ taux, isZoho, valeurActuelle, appliquer, onClose }: Props) {
  useEchap(onClose);
  const lignes = useMemo(() => (taux && taux.length ? construireLignes(taux) : lignesSnapshot()), [taux]);
  const sections = useMemo(() => {
    const m = new Map<string, Ligne[]>();
    for (const l of lignes) {
      const key = l.section || "Autres";
      (m.get(key) ?? m.set(key, []).get(key)!).push(l);
    }
    return [...m.entries()];
  }, [lignes]);

  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const filtrees = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sections;
    return sections
      .map(([sec, ls]) => [sec, ls.filter((l) => l.code.toLowerCase().includes(term) || l.libelle.toLowerCase().includes(term))] as [string, Ligne[]])
      .filter(([, ls]) => ls.length);
  }, [sections, q]);

  const ligneChoisie = lignes.find((l) => l.code === selection) ?? null;

  function ouvrir(l: Ligne) {
    setSelection(l.code);
    const b: Record<string, string> = {};
    for (const c of l.champs) {
      const v = valeurActuelle(c.cell);
      b[c.cle] = v === "" || v === undefined ? "" : String(v);
    }
    setBrouillon(b);
    setMessages((m) => ({ ...m, [l.code]: "" }));
  }

  function appliquerLigne(l: Ligne) {
    for (const c of l.champs) {
      const raw = brouillon[c.cle];
      if (raw === undefined || raw === "") continue;
      const n = Number(raw.replace(",", "."));
      if (Number.isFinite(n)) appliquer(c.cell, n);
    }
    setMessages((m) => ({ ...m, [l.code]: "Appliqué — utilisé dans le calcul de cette soumission." }));
  }

  async function enregistrerCreator(l: Ligne) {
    if (!l.id) {
      setMessages((m) => ({ ...m, [l.code]: "Non lié à un enregistrement Creator (snapshot hors ligne)." }));
      return;
    }
    appliquerLigne(l);
    const champs: { valeur?: number; cadence?: number; temps?: number } = {};
    for (const c of l.champs) {
      const raw = brouillon[c.cle];
      if (raw === undefined || raw === "") continue;
      const n = Number(raw.replace(",", "."));
      if (Number.isFinite(n)) champs[c.cle] = n;
    }
    setMessages((m) => ({ ...m, [l.code]: "Enregistrement…" }));
    const res = await sauvegarderTaux(l.id, champs);
    setMessages((m) => ({ ...m, [l.code]: res.message }));
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-taux" role="dialog" aria-modal="true" aria-label="Taux et paramètres de calcul">
        <div className="modal-head">
          <h2>Taux &amp; paramètres de calcul</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body modal-body-split">
          <div className="taux-liste">
            <input
              className="guide-recherche taux-recherche"
              type="search"
              placeholder="Rechercher un code, un libellé…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {!isZoho && <p className="taux-note">Hors Creator — snapshot embarqué (lecture seule côté serveur).</p>}
            {filtrees.map(([section, ls]) => (
              <div key={section} className="taux-section">
                <div className="taux-section-titre">{section}</div>
                {ls.map((l) => (
                  <button
                    type="button"
                    key={l.code}
                    className={"taux-item" + (selection === l.code ? " actif" : "")}
                    onClick={() => ouvrir(l)}
                  >
                    <span className="taux-item-code">{l.code}</span>
                    <span className="taux-item-libelle">{l.libelle || "—"}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtrees.length === 0 && <p className="modal-intro">Aucun résultat.</p>}
          </div>

          <div className="taux-detail">
            {!ligneChoisie && <p className="modal-intro">Choisissez un taux ou un paramètre dans la liste à gauche pour voir et modifier sa valeur.</p>}
            {ligneChoisie && (
              <>
                <h3>{ligneChoisie.code}</h3>
                <p className="taux-detail-libelle">{ligneChoisie.libelle || "(sans libellé)"}</p>
                <p className="modal-intro">Section : {ligneChoisie.section || "—"}</p>
                <div className="taux-champs">
                  {ligneChoisie.champs.map((c) => (
                    <label key={c.cle} className="taux-champ">
                      <span>{c.label}</span>
                      <input
                        type="number"
                        step="any"
                        value={brouillon[c.cle] ?? ""}
                        onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))}
                      />
                      <code className="taux-cell">{c.cell}</code>
                    </label>
                  ))}
                </div>
                <div className="taux-actions">
                  <button type="button" className="btn ghost-fonce" onClick={() => appliquerLigne(ligneChoisie)}>
                    Appliquer à cette soumission
                  </button>
                  <button type="button" className="btn solid" onClick={() => void enregistrerCreator(ligneChoisie)}>
                    Enregistrer dans Creator
                  </button>
                </div>
                {messages[ligneChoisie.code] && <p className="taux-msg">{messages[ligneChoisie.code]}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
