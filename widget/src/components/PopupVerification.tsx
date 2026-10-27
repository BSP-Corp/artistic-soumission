// Popup « Vérification » : la liste des contrôles de la soumission, revue une par une.
//
//   · confirmation  → Oui pose le drapeau « SANS » correspondant (le moteur recalcule, le
//                     prix unitaire apparaît) ; Non ferme le popup avec le conseil à suivre ;
//   · bloquant      → pas de bouton : on corrige dans le formulaire, la ligne disparaît
//                     d'elle-même (la liste est vivante — elle suit les saisies).
//
// Toutes les alertes restent affichées dans l'ordre du formulaire, sans tri par gravité,
// les réglées cochées ✓. Le bouton d'action ne s'active que lorsque tout est en ordre.
import { useEffect, useState } from "react";
import { useEchap } from "@/hooks/useEchap";
import type { Controle } from "@/lib/controles";

interface Props {
  /** contrôles courants (recalculés à chaque saisie par le parent) */
  controles: Controle[];
  /** libellé du bouton final (ex. « Valider → Bon de travail ») ; absent = simple vérification */
  action?: string;
  onAccepter: (drapeau: string) => void;
  onRefuser: (c: Controle) => void;
  onAction?: () => void;
  onClose: () => void;
}

export function PopupVerification({ controles, action, onAccepter, onRefuser, onAction, onClose }: Props) {
  useEchap(onClose);
  // photo de la liste à l'ouverture : une alerte réglée reste visible, cochée, plutôt que de
  // disparaître — le chargé de projet voit ce qu'il a accepté avant de continuer
  const [initial, setInitial] = useState<Controle[]>(controles);
  useEffect(() => {
    setInitial((prev) => {
      const connues = new Set(prev.map((c) => c.cle));
      const nouvelles = controles.filter((c) => !connues.has(c.cle));
      return nouvelles.length ? [...prev, ...nouvelles] : prev;
    });
  }, [controles]);

  const courantes = new Set(controles.map((c) => c.cle));
  // les rappels (§4 double-check) s'affichent mais ne retiennent jamais la validation
  const bloquantes = controles.filter((c) => c.type !== "info").length;
  const restantes = controles.length;
  const tout = initial.map((c) => ({ c, regle: !courantes.has(c.cle) }));

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-verif" role="dialog" aria-modal="true" aria-label="Vérification de la soumission">
        <div className="modal-head">
          <h2>Vérification de la soumission</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {tout.length === 0 ? (
            <p className="verif-ok">✓ Aucune alerte : la soumission est complète.</p>
          ) : (
            <>
              <p className="modal-intro">
                {bloquantes === 0
                  ? restantes === 0
                    ? "Toutes les alertes sont réglées."
                    : "Plus rien ne bloque — il reste un rappel, à lire mais pas obligatoire."
                  : `${bloquantes} alerte${bloquantes > 1 ? "s" : ""} à revoir, dans l'ordre du formulaire. Les points bloquants se corrigent directement dans la soumission — cette liste se met à jour toute seule.`}
              </p>
              <ol className="verif-liste">
                {tout.map(({ c, regle }) => (
                  <li key={c.cle} className={"verif-item " + (regle ? "regle" : c.type)}>
                    <span className="verif-puce" aria-hidden="true">
                      {regle ? "✓" : c.type === "confirmation" ? "?" : c.type === "info" ? "i" : "✕"}
                    </span>
                    <span className="verif-texte">
                      <span className="verif-msg">{c.message}</span>
                      {!regle && c.conseil && <span className="verif-conseil">{c.conseil}</span>}
                    </span>
                    {!regle && c.type === "confirmation" && (
                      <span className="verif-boutons">
                        <button type="button" className="btn solid petit" onClick={() => onAccepter(c.drapeau)}>
                          Oui
                        </button>
                        <button type="button" className="btn ghost petit" onClick={() => onRefuser(c)}>
                          Non
                        </button>
                      </span>
                    )}
                    {!regle && c.type === "bloquant" && <span className="verif-etiquette">bloquant</span>}
                    {!regle && c.type === "info" && <span className="verif-etiquette rappel">rappel</span>}
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="verif-pied">
            <button type="button" className="btn ghost" onClick={onClose}>
              {action ? "Annuler" : "Fermer"}
            </button>
            {action && onAction && (
              <button type="button" className="btn solid" disabled={bloquantes > 0} onClick={onAction}>
                {action}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
