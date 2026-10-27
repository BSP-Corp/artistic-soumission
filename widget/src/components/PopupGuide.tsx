// Popup « Guide des paramètres » : explique en langage simple chaque champ calculé et où changer
// un prix ou un taux (Administration) — destiné à qui remplit une soumission, pas à qui configure
// les taux dans Creator.
import { useEchap } from "@/hooks/useEchap";
import { useMemo, useState } from "react";
import { GUIDE_ESSENTIEL, GUIDE_CHAMPS, CATEGORIES_MATERIAUX, DEPANNAGE } from "@/data/guideChamps";

interface Props {
  onClose: () => void;
}

export function PopupGuide({ onClose }: Props) {
  useEchap(onClose);
  const [q, setQ] = useState("");

  const champsFiltres = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return GUIDE_CHAMPS;
    return GUIDE_CHAMPS.filter((c) => c.titre.toLowerCase().includes(term) || c.explication.toLowerCase().includes(term));
  }, [q]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-guide" role="dialog" aria-modal="true" aria-label="Guide des paramètres">
        <div className="modal-head">
          <h2>Guide des paramètres</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-intro">
            Tous les prix, taux et valeurs par défaut sont paramétrables dans Zoho Creator. Ce guide explique chaque
            champ calculé, les paramètres qu'il utilise, et où les modifier.
          </p>

          <h3>Où paramétrer</h3>
          {GUIDE_ESSENTIEL.map((bloc) => (
            <div className="guide-carte" key={bloc.titre}>
              <b>{bloc.titre}</b>
              <ul>
                {bloc.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}

          <h3>Catégories de matériaux → ligne du formulaire</h3>
          <div className="guide-carte">
            <table className="guide-table">
              <tbody>
                {CATEGORIES_MATERIAUX.map(([cat, ligne]) => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td>{ligne}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>
            Champs calculés{" "}
            <input
              className="guide-recherche"
              type="search"
              placeholder="Rechercher un champ, un code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </h3>
          {champsFiltres.map((c) => (
            <div className="guide-carte" key={c.titre}>
              <b>{c.titre}</b>
              <p className="guide-explication">{c.explication}</p>
              {c.exemple && <div className="guide-exemple">Exemple : {c.exemple}</div>}
            </div>
          ))}
          {champsFiltres.length === 0 && <p className="modal-intro">Aucun champ ne correspond à « {q} ».</p>}

          <h3>Dépannage</h3>
          <div className="guide-carte">
            <table className="guide-table">
              <tbody>
                {DEPANNAGE.map(([symptome, solution]) => (
                  <tr key={symptome}>
                    <td>
                      <b>{symptome}</b>
                    </td>
                    <td>{solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
