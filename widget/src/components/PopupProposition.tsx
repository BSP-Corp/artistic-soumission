// Popup « Proposition client » — le document qui part chez le client (Lot A, point 6).
//
// Mise en page calquée sur le gabarit Artistic fourni par BSP (soumission S-26635) : logo
// centré, coordonnées, bandeau PROPOSITION, les deux blocs d'identification, le mot bilingue,
// la liste des spécifications, la bande de validité, une seule ligne QTÉ | PRIX, puis les
// trois signatures du bas. Les libellés sont bilingues comme sur le gabarit.
//
// Trois actions, les trois demandées : APERÇU (ce popup), TÉLÉCHARGER (impression → « Enregistrer
// au format PDF » du navigateur) et ENVOYER (brouillon de courriel pré-rempli, le PDF se joint).
// Un widget Creator ne peut pas fabriquer un fichier PDF côté serveur ni expédier un courriel
// lui-même : c'est l'imprimante virtuelle du navigateur et le client de messagerie de
// l'utilisateur qui font ces deux gestes.
import { useEffect } from "react";
import { useEchap } from "@/hooks/useEchap";
import { nombre2 } from "@/lib/format";
import { CELL_PROP } from "@/lib/modele";
import { CelluleTexte } from "@/components/cellules";
import { LOGO_ARTISTIC } from "@/assets/logoArtistic";
import type { CellValue } from "@/lib/moteur";

/** Coordonnées imprimées sous le logo, telles qu'elles figurent sur le gabarit Artistic. */
const EMETTEUR = {
  nom: "Artistic — groupe canva",
  adresse: "9475 Jean-Pratt, Montréal (Québec) H4N 2W7",
  contact: "Tél.: 514 382-0351  |  artisticdecal.com",
};

const MOT_FR =
  "Merci de nous offrir l'opportunité de vous proposer cette offre de service pour vos besoins d'impression, selon les spécifications suivantes :";
const MOT_EN =
  "Thank you for giving us the opportunity to offer you this service offer for your printing needs, according to the following specifications:";
const VALIDITE = "Cette proposition est valide pour 30 jours / This proposal is valid for 30 days";

export interface LigneProposition {
  qte: number;
  /** prix unitaire retenu : le vendu décidé par le chargé de projet, sinon le calculé */
  unitaire: number;
  /** true quand aucun vendu n'a été saisi — c'est le prix calculé qui est imprimé */
  suggere: boolean;
  /** la quantité principale de la soumission : la seule qui sorte sur le document */
  active: boolean;
}

export interface InfosProposition {
  noSoumission: string;
  date: string;
  client: string;
  noClient: string;
  description: string;
  noPce: string;
  dimensions: string;
  materiau: string;
  couleurs: string;
}

interface Props {
  infos: InfosProposition;
  lignes: LigneProposition[];
  /** valeur d'une ligne du gabarit saisie à la main (pseudo-cellules `CELL_PROP`) */
  libre: (cell: string) => CellValue;
  /** écrit cette ligne dans la soumission : elle se sauvegarde et se relit avec elle */
  setLibre: (cell: string, valeur: CellValue) => void;
  onClose: () => void;
}

export function PopupProposition({ infos, lignes, libre, setLibre, onClose }: Props) {
  useEchap(onClose);
  // `mode-proposition` sur <body> : la feuille de style d'impression ne laisse que ce document
  // sur le papier (sans la barre d'outils, sans la soumission, sans les boutons du popup).
  useEffect(() => {
    document.body.classList.add("mode-proposition");
    return () => document.body.classList.remove("mode-proposition");
  }, []);

  // Le client ne voit qu'une ligne : la quantité retenue (BSP, 27 oct. 2026). Les autres
  // quantités, le prix US, le total et la référence de contrat restent internes au widget.
  const retenue = lignes.find((l) => l.active) ?? lignes.find((l) => l.qte > 0) ?? null;

  // Brouillon de courriel : objet + corps reprennent la proposition en texte, le PDF
  // téléchargé se joint ensuite. `mailto:` est posé sur un vrai lien — un widget en iframe
  // n'a pas le droit de changer la barre d'adresse de la page hôte.
  const sujet = ["Proposition", infos.noSoumission, infos.description && "— " + infos.description].filter(Boolean).join(" ");
  const corps = [
    `Bonjour,`,
    ``,
    `Vous trouverez ci-joint notre proposition${infos.noSoumission ? " " + infos.noSoumission : ""}${infos.description ? " pour « " + infos.description + " »" : ""}.`,
    ``,
    ...(retenue ? [`  QTÉ ${retenue.qte} — ${nombre2(retenue.unitaire)} $ ch`, ``] : []),
    VALIDITE,
    ``,
    `Au plaisir,`,
    EMETTEUR.nom,
  ].join("\r\n");
  const mailto = `mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  /** ligne « LIBELLÉ : valeur » du gabarit, valeur lue dans la fiche */
  const spec = (label: string, valeur: string) => (
    <div className="prop-spec">
      <span>{label}</span>
      <b>{valeur}</b>
    </div>
  );
  /** même ligne, mais le gabarit Artistic demande une information que la fiche n'a pas :
   *  elle se tape ici et se sauvegarde avec la soumission */
  const specLibre = (label: string, cell: string, apercu: string) => (
    <div className="prop-spec">
      <span>{label}</span>
      <CelluleTexte cell={cell} value={libre(cell)} onChange={setLibre} className="prop-libre" label={apercu} />
    </div>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-proposition" role="dialog" aria-modal="true" aria-label="Proposition client">
        <div className="modal-head">
          <h2>Proposition client — aperçu</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="prop-doc">
            {/* en-tête du gabarit : logo centré, coordonnées, bandeau PROPOSITION */}
            <div className="prop-entete">
              <img className="prop-logo" src={LOGO_ARTISTIC} alt="Artistic — groupe canva" />
              <div className="prop-emetteur">
                <div>{EMETTEUR.adresse}</div>
                <div>{EMETTEUR.contact}</div>
              </div>
            </div>
            <div className="prop-banniere">Proposition</div>

            <div className="prop-ident">
              <div>
                {specLibre("À / To :", CELL_PROP.contact, "Personne-ressource chez le client")}
                {spec("Client :", infos.client)}
                {infos.noClient ? spec("N° de client :", infos.noClient) : null}
              </div>
              <div>
                {spec("Date", infos.date)}
                {spec("N° Soumission :", infos.noSoumission)}
              </div>
            </div>

            <p className="prop-mot">
              {MOT_FR}
              <br />
              <i>{MOT_EN}</i>
            </p>

            <div className="prop-specs">
              {spec("# Pièce / Item :", infos.noPce)}
              {spec("Description :", infos.description)}
              {spec("Qtée / Qty :", retenue && retenue.qte > 0 ? String(retenue.qte) : "")}
              {specLibre("# Lot(s) :", CELL_PROP.lots, "Nombre de lots")}
              {spec("Format :", infos.dimensions)}
              {spec("Matériel / Material :", infos.materiau)}
              {spec("Couleur(s) / Colors :", infos.couleurs)}
              {specLibre("Épreuves / Proof sheets :", CELL_PROP.epreuves, "Épreuves")}
              {specLibre("Finition / Finishing :", CELL_PROP.finition, "Finition")}
              {specLibre("Livraison / Delivery :", CELL_PROP.livraison, "Livraison")}
              {specLibre("Notes :", CELL_PROP.notes, "Notes")}
            </div>

            <div className="prop-validite">{VALIDITE}</div>

            <table className="prop-table num">
              <thead>
                <tr>
                  <th className="ct">Qté</th>
                  <th className="ct">Prix</th>
                </tr>
              </thead>
              <tbody>
                {retenue && retenue.qte > 0 ? (
                  <tr>
                    <td className="ct">{retenue.qte}</td>
                    <td className="ct">{nombre2(retenue.unitaire)} $ ch</td>
                  </tr>
                ) : (
                  <tr>
                    <td className="ct" colSpan={2}>
                      <span className="prop-vide">Aucune quantité retenue dans la soumission.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {retenue && retenue.qte > 0 && retenue.suggere && (
              <p className="prop-note">Prix calculé par la fiche : aucun prix vendu n'a été saisi pour cette quantité.</p>
            )}

            <div className="prop-signature">
              <div>
                <span className="prop-ligne" />
                Approuvé par / Approved by :
              </div>
              <div>
                <span className="prop-ligne" />
                Date
              </div>
              <div>
                <span className="prop-ligne" />
                # Bon de commande / P.O. #
              </div>
            </div>
          </div>
        </div>

        <div className="prop-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Fermer
          </button>
          <a className="btn ghost" href={mailto}>
            Envoyer par courriel
          </a>
          <button type="button" className="btn solid" onClick={() => window.print()}>
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}
