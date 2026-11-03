// Popup « Ouvrir une soumission » : liste les soumissions enregistrées dans Creator (Form1),
// recherche par client / modèle / no pièce, ouverture = restaure toutes les entrées depuis le
// JSON Donnees (y compris machines choisies X!* et lignes QTÉ ajoutées). Suppression possible.
import { useEchap } from "@/hooks/useEchap";
import { useMemo, useState } from "react";
import type { ResultatSoumissions, SoumissionResume } from "@/services/zohoService";
import { supprimerSoumission } from "@/services/zohoService";
import { argent } from "@/lib/format";

/** Un seul message « Hors Creator » couvrait quatre pannes sans rapport entre elles, dont une
 *  — le rôle sans accès au rapport — qui n'a rien à voir avec l'environnement. Chaque cause
 *  porte maintenant ce que l'utilisateur peut en faire : il est seul devant son écran. */
const EXPLICATION: Record<string, { titre: string; quoiFaire: string }> = {
  "sdk-absent": {
    titre: "Le SDK Zoho n'a pas pu être chargé.",
    quoiFaire:
      "Le script js.zohostatic.com est injoignable — proxy, pare-feu ou bloqueur de publicités. À signaler au service informatique.",
  },
  "init-expire": {
    titre: "Creator n'a pas répondu au widget dans le délai imparti.",
    quoiFaire:
      "Rechargez la page (F5). Si cela se répète, c'est la liaison du poste vers Zoho qui est en cause, pas la soumission.",
  },
  "hors-creator": {
    titre: "Le widget ne tourne pas dans Creator.",
    quoiFaire: "Les soumissions enregistrées ne sont lisibles que depuis l'application Creator.",
  },
  indetermine: {
    titre: "La connexion a Creator n'a pas encore abouti.",
    quoiFaire: "Refermez et rouvrez cette fenetre dans quelques secondes.",
  },
  "lecture-refusee": {
    titre: "Creator a refusé la lecture des soumissions.",
    quoiFaire:
      "Votre rôle n'a probablement pas accès au rapport Form1_Report. À faire vérifier par l'administrateur de l'application.",
  },
};

interface Props {
  resultat: ResultatSoumissions | null; // null = pas encore chargé
  chargement: boolean;
  onOuvrir: (s: SoumissionResume) => void;
  onSupprimee: (id: string) => void;
  onClose: () => void;
}

export function PopupSoumissions({ resultat, chargement, onOuvrir, onSupprimee, onClose }: Props) {
  useEchap(onClose);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  const filtrees = useMemo(() => {
    const liste = resultat?.ok ? resultat.liste : [];
    const term = q.trim().toLowerCase();
    if (!term) return liste;
    return liste.filter((s) =>
      [s.client, s.modele, s.noPce].some((v) => v.toLowerCase().includes(term)),
    );
  }, [resultat, q]);

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
          ) : resultat && !resultat.ok ? (
            <div className="taux-note">
              <p>
                <b>{EXPLICATION[resultat.cause]?.titre ?? "Les soumissions enregistrées ne sont pas disponibles."}</b>
              </p>
              <p>{EXPLICATION[resultat.cause]?.quoiFaire ?? ""}</p>
              {resultat.detail && <p className="soum-detail">Détail technique : {resultat.detail}</p>}
              <p className="soum-detail">Code : {resultat.cause}</p>
            </div>
          ) : !resultat ? (
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
