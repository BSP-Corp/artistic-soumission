// Popup « Ouvrir une soumission » : liste les soumissions enregistrées dans Creator (Form1),
// recherche par client / modèle / no pièce, ouverture = restaure toutes les entrées depuis le
// JSON Donnees (y compris machines choisies X!* et lignes QTÉ ajoutées). Suppression possible.
import { useEchap } from "@/hooks/useEchap";
import { useMemo, useState } from "react";
import type { SoumissionResume } from "@/services/zohoService";
import { supprimerSoumission } from "@/services/zohoService";
import { argent } from "@/lib/format";

interface Props {
  soumissions: SoumissionResume[] | null; // null = hors Zoho ou pas encore chargées
  chargement: boolean;
  onOuvrir: (s: SoumissionResume) => void;
  onSupprimee: (id: string) => void;
  onClose: () => void;
}

export function PopupSoumissions({ soumissions, chargement, onOuvrir, onSupprimee, onClose }: Props) {
  useEchap(onClose);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  const filtrees = useMemo(() => {
    const liste = soumissions ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return liste;
    return liste.filter((s) =>
      [s.client, s.modele, s.noPce].some((v) => v.toLowerCase().includes(term)),
    );
  }, [soumissions, q]);

  async function supprimer(id: string) {
    if (confirmationId !== id) {
      setConfirmationId(id);
      setMessage("Cliquez de nouveau sur ✕ pour confirmer la suppression.");
      return;
    }
    setConfirmationId(null);
    setMessage("Suppression…");
    const res = await supprimerSoumission(id);
    setMessage(res.message);
    if (res.ok) onSupprimee(id);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-taux" role="dialog" aria-modal="true" aria-label="Soumissions enregistrées">
        <div className="modal-head">
          <h2>Soumissions enregistrées</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <input
            className="guide-recherche taux-recherche"
            type="search"
            placeholder="Rechercher un client, un modèle, un no. de pièce…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {message && <p className="taux-msg">{message}</p>}
          {chargement ? (
            <p className="taux-note">Chargement des soumissions…</p>
          ) : soumissions === null ? (
            <p className="taux-note">Hors Creator — les soumissions enregistrées ne sont pas disponibles.</p>
          ) : filtrees.length === 0 ? (
            <p className="taux-note">{q ? "Aucune soumission ne correspond à la recherche." : "Aucune soumission enregistrée pour le moment — utilisez le bouton « Enregistrer »."}</p>
          ) : (
            <div className="soum-liste">
              {filtrees.map((s) => (
                <div key={s.id} className="soum-item">
                  <button
                    type="button"
                    className="soum-ouvrir"
                    onClick={() => onOuvrir(s)}
                    disabled={!s.donnees}
                    title={s.donnees ? "Ouvrir cette soumission dans le formulaire" : "Enregistrement sans données complètes (ancien format) — non ouvrable"}
                  >
                    <span className="soum-client">{s.client || "(sans client)"}</span>
                    <span className="soum-detail">
                      {[s.modele && "modèle " + s.modele, s.noPce && "pce " + s.noPce, s.quantite ? "qté " + s.quantite : ""]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="soum-total">{s.total !== null ? argent(s.total) : ""}</span>
                  </button>
                  <button
                    type="button"
                    className={"soum-suppr" + (confirmationId === s.id ? " confirme" : "")}
                    onClick={() => void supprimer(s.id)}
                    title="Supprimer cette soumission de Creator"
                    aria-label={"Supprimer la soumission " + (s.client || s.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
