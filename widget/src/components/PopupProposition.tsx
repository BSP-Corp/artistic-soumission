// Popup « Soumission client » — le document qui part chez le client (Lot A, point 6).
//
// Mise en page calquée sur le gabarit de Josemaria Teixeira du 30 octobre 2026, transmis par
// Philippe Béland à Christian puis à BSP le 2 novembre. Il remplace le gabarit S-26635 d'une
// seule quantité sur lequel ce document était bâti : voir `docs/pdf-gabarit-client.md`.
//
// Deux pages. Page 1 : en-tête SOUMISSION (numéro, date, validité 30 jours, représentant),
// coordonnées Artistic, bloc client, bloc projet, la grille produit × paliers de quantité avec
// prix unitaire et montant par case, la ligne de frais de préparation, l'encadré COMMENT
// CHOISIR et les totaux avec TPS et TVQ. Page 2 : les conditions et le bloc d'acceptation à
// signer.
//
// Ce que le gabarit demande et que la soumission actuelle ne sait pas encore produire : une
// grille de PLUSIEURS produits. L'écran ne porte qu'un article, donc la grille a une ligne.
// Les colonnes, elles, sont bien les paliers de quantité de la soumission — le widget calcule
// déjà un prix pour chacun. La grille multi-produits viendra avec la refonte (spec §8).
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

/** Coordonnées Artistic, telles qu'elles figurent sur le gabarit du 30 octobre. L'adresse de
 *  Montréal qui traînait ici (9475 Jean-Pratt) était fausse : le siège est à Laval. */
const EMETTEUR = {
  nom: "Artistic — groupe canva",
  adresse: "2565, boul. Le Corbusier, Laval (Québec) H7S 2E8",
  contact: "514 382-0351 · artisticdecal.com",
};

/** Taux en vigueur au Québec. Les numéros d'enregistrement se saisissent dans l'aperçu tant
 *  qu'Artistic ne nous les a pas donnés : un faux numéro sur un document client serait pire
 *  qu'une ligne sans numéro. */
const TPS = 0.05;
const TVQ = 0.09975;

const VALIDITE_JOURS = 30;

const COMMENT_CHOISIR =
  "Cochez une quantité par produit. Plus la quantité est grande, plus le prix unitaire baisse : " +
  "le temps de montage et de réglage est réparti sur un plus grand nombre d'unités. Le total " +
  "final sera ajusté selon les quantités cochées.";

const PAIEMENT_DEFAUT =
  "Dépôt de 50 % à l'approbation du BAT, solde payable net 30 jours suivant la livraison. " +
  "Virement, chèque et carte de crédit acceptés.";

/** Les cinq blocs de conditions du gabarit qui ne dépendent pas du client. Le sixième — les
 *  modalités de paiement — se saisit, parce qu'il varie d'un client à l'autre. */
const CONDITIONS = [
  {
    titre: "Épreuve (BAT)",
    texte:
      "La production débute après l'approbation écrite du BAT. Fichiers vectoriels (AI, PDF, EPS) recommandés.",
  },
  {
    titre: "Modifications après approbation",
    texte:
      "Toute modification demandée après l'approbation du BAT peut entraîner des frais supplémentaires et un nouveau délai de production.",
  },
  {
    titre: "Couleurs",
    texte:
      "Les teintes Pantone sont respectées en sérigraphie ; en numérique, une légère variation peut survenir.",
  },
  {
    titre: "Livraison et installation",
    texte:
      "La livraison indiquée à la page 1 est incluse. L'installation sur place, si requise, fait l'objet d'une soumission distincte.",
  },
  {
    titre: "Validité et taxes",
    texte:
      "Prix valides 30 jours à compter de la date de la soumission. TPS et TVQ en sus, selon les taux en vigueur.",
  },
];

export interface LigneProposition {
  qte: number;
  /** prix unitaire retenu : le vendu décidé par le chargé de projet, sinon le calculé */
  unitaire: number;
  /** true quand aucun vendu n'a été saisi — c'est le prix calculé qui est imprimé */
  suggere: boolean;
  /** la quantité recommandée : celle qui est cochée sur le document et qui porte le total */
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

/** « valide jusqu'au » = la date de la soumission + 30 jours. La date arrive en `AAAA-MM-JJ`
 *  (toLocaleDateString fr-CA) ; tout autre format laisse la ligne vide plutôt que d'imprimer
 *  une date inventée. */
function dateValidite(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + VALIDITE_JOURS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function PopupProposition({ infos, lignes, libre, setLibre, onClose }: Props) {
  useEchap(onClose);
  // `mode-proposition` sur <body> : la feuille de style d'impression ne laisse que ce document
  // sur le papier (sans la barre d'outils, sans la soumission, sans les boutons du popup).
  useEffect(() => {
    document.body.classList.add("mode-proposition");
    return () => document.body.classList.remove("mode-proposition");
  }, []);

  const texte = (cell: string) => String(libre(cell) ?? "").trim();
  const montantFrais = Number(String(libre(CELL_PROP.fraisMontant) ?? "").replace(",", ".")) || 0;

  // Les colonnes de la grille sont les paliers de quantité de la soumission. Une ligne sans
  // quantité n'a rien à faire sur un document client, et les paliers se lisent du plus petit
  // au plus grand : l'encadré « comment choisir » promet que le prix unitaire baisse quand la
  // quantité monte, l'ordre des colonnes doit le montrer. Les lignes de la soumission, elles,
  // sont dans l'ordre où le chargé de projet les a saisies.
  const paliers = lignes.filter((l) => l.qte > 0).sort((a, b) => a.qte - b.qte);
  const retenue = paliers.find((l) => l.active) ?? paliers[0] ?? null;

  /** Prix unitaire arrondi au cent, et le montant qui en découle. Le client multiplie : si le
   *  document affiche 2,51 $ et 62 723,50 $ pour 25 000 pièces, il trouve 26,50 $ d'écart et
   *  rappelle. Les deux nombres imprimés doivent se vérifier l'un par l'autre. */
  const auCent = (v: number) => Math.round(v * 100) / 100;
  const montantLigne = (l: LigneProposition) => auCent(l.unitaire) * l.qte;

  const montantRetenu = retenue ? montantLigne(retenue) : 0;
  const sousTotal = montantRetenu + montantFrais;
  const mtTPS = sousTotal * TPS;
  const mtTVQ = sousTotal * TVQ;
  const total = sousTotal + mtTPS + mtTVQ;

  const validiteLe = dateValidite(infos.date);

  // Description technique du produit, sous son nom : ce que la fiche porte réellement.
  const specProduit = [infos.dimensions, infos.materiau, infos.couleurs, texte(CELL_PROP.finition)]
    .filter(Boolean)
    .join(" · ");

  // Brouillon de courriel : objet + corps reprennent la soumission en texte, le PDF
  // téléchargé se joint ensuite. `mailto:` est posé sur un vrai lien — un widget en iframe
  // n'a pas le droit de changer la barre d'adresse de la page hôte.
  const sujet = ["Soumission", infos.noSoumission, infos.description && "— " + infos.description]
    .filter(Boolean)
    .join(" ");
  const corps = [
    `Bonjour,`,
    ``,
    `Vous trouverez ci-joint notre soumission${infos.noSoumission ? " " + infos.noSoumission : ""}${infos.description ? " pour « " + infos.description + " »" : ""}.`,
    ``,
    ...(retenue ? [`  Qté ${retenue.qte} — ${nombre2(retenue.unitaire)} $ / unité`, ``] : []),
    validiteLe ? `Cette soumission est valide jusqu'au ${validiteLe}.` : `Cette soumission est valide 30 jours.`,
    ``,
    `Au plaisir,`,
    EMETTEUR.nom,
  ].join("\r\n");
  const mailto = `mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  /** Ligne « LIBELLÉ : valeur » du gabarit, valeur lue dans la fiche.
   *
   *  Une ligne restée vide garde sa place dans l'aperçu — le chargé de projet doit voir ce
   *  qu'il n'a pas rempli — mais ne s'imprime pas : un libellé suivi de rien, sur le document
   *  qui part chez le client, donne un devis bâclé. */
  const spec = (label: string, valeur: string) => (
    <div className={"prop-spec" + (valeur ? "" : " prop-spec-vide")}>
      <span>{label}</span>
      <b>{valeur}</b>
    </div>
  );
  /** même ligne, mais le gabarit demande une information que la fiche n'a pas :
   *  elle se tape ici et se sauvegarde avec la soumission */
  const specLibre = (label: string, cell: string, apercu: string) => (
    <div className={"prop-spec" + (texte(cell) ? "" : " prop-spec-vide")}>
      <span>{label}</span>
      <CelluleTexte cell={cell} value={libre(cell)} onChange={setLibre} className="prop-libre" label={apercu} />
    </div>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-proposition" role="dialog" aria-modal="true" aria-label="Soumission client">
        <div className="modal-head">
          <h2>Soumission client — aperçu</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ───────────────────────────── page 1 : l'offre ───────────────────────────── */}
          <div className="prop-doc prop-page">
            <div className="prop-entete">
              <div className="prop-emetteur">
                <img className="prop-logo" src={LOGO_ARTISTIC} alt="Artistic — groupe canva" />
                <div>{EMETTEUR.adresse}</div>
                <div>{EMETTEUR.contact}</div>
              </div>
              <div className="prop-titre">
                <div className="prop-banniere">Soumission</div>
                <div className="prop-no">{infos.noSoumission}</div>
                <div className="prop-entete-lignes">
                  {spec("Date", infos.date)}
                  {spec("Valide jusqu'au", validiteLe ? `${validiteLe} (${VALIDITE_JOURS} jours)` : "")}
                  {specLibre("Représentant·e", CELL_PROP.representant, "Nom, prénom")}
                </div>
              </div>
            </div>

            <div className="prop-ident">
              <div className="prop-bloc">
                <div className="prop-bloc-nom">{infos.client}</div>
                {specLibre("Personne-ressource", CELL_PROP.contact, "Nom, prénom")}
                {specLibre("Titre", CELL_PROP.titreContact, "Titre")}
                {specLibre("Téléphone", CELL_PROP.telClient, "Téléphone")}
                {specLibre("Courriel", CELL_PROP.courrielClient, "Courriel")}
                {specLibre("Adresse", CELL_PROP.adresseClient, "Adresse de livraison")}
                {infos.noClient ? spec("N° de client", infos.noClient) : null}
              </div>
              <div className="prop-bloc">
                <div className="prop-bloc-nom">{infos.description}</div>
                {specLibre("Réf. client / BC", CELL_PROP.refBC, "Bon de commande du client")}
                {specLibre("Délai de production", CELL_PROP.delai, "Après approbation de l'épreuve")}
                {specLibre("Livraison", CELL_PROP.livraison, "Incluse, à l'usine de…")}
                {infos.noPce ? spec("N° de pièce", infos.noPce) : null}
                {specLibre("Épreuves", CELL_PROP.epreuves, "Épreuves")}
              </div>
            </div>

            {/* La grille : une ligne de produit, une colonne par palier de quantité. */}
            <table className="prop-grille num">
              <thead>
                <tr>
                  <th className="prop-grille-produit">Produit et spécifications</th>
                  {paliers.map((l, i) => (
                    <th key={i} className={"ct" + (l.active ? " prop-reco" : "")}>
                      <span className="prop-grille-qte">Qté</span>
                      <br />
                      {l.qte.toLocaleString("fr-CA")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paliers.length > 0 ? (
                  <tr>
                    <td className="prop-grille-produit">
                      <b>{infos.description || "Article"}</b>
                      {specProduit ? <div className="prop-grille-spec">{specProduit}</div> : null}
                    </td>
                    {paliers.map((l, i) => (
                      <td key={i} className={"ct" + (l.active ? " prop-reco" : "")}>
                        <div className="prop-unitaire">{nombre2(auCent(l.unitaire))} $</div>
                        <div className="prop-par">/ unité</div>
                        <div className="prop-montant">{nombre2(montantLigne(l))} $</div>
                      </td>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={2}>
                      <span className="prop-vide">Aucune quantité saisie dans la soumission.</span>
                    </td>
                  </tr>
                )}
                {/* La ligne de frais occupe toute la largeur : le libellé, la mention « une
                    seule fois » qui couvre les paliers sauf un, et le montant sous le dernier.
                    Sans palier, la grille n'a qu'une colonne de prix et la mention saute. */}
                {paliers.length > 0 && (
                  // Sans montant saisi, la ligne reste dans l'aperçu pour qu'on pense à la
                  // remplir, mais ne s'imprime pas : un poste de facturation sans prix sur un
                  // devis fait désordre.
                  <tr className={"prop-frais" + (montantFrais > 0 ? "" : " prop-spec-vide")}>
                    <td className="prop-grille-produit">
                      <b>Frais de préparation</b>
                      <div className="prop-grille-spec">
                        <CelluleTexte
                          cell={CELL_PROP.fraisLibelle}
                          value={libre(CELL_PROP.fraisLibelle)}
                          onChange={setLibre}
                          className="prop-libre"
                          label="BAT · écrans de sérigraphie · outil de coupe · fichiers"
                        />
                      </div>
                    </td>
                    {paliers.length > 1 && (
                      <td className="prop-frais-note" colSpan={paliers.length - 1}>
                        Facturés une seule fois, peu importe les quantités choisies
                      </td>
                    )}
                    <td className="ct">
                      <CelluleTexte
                        cell={CELL_PROP.fraisMontant}
                        value={libre(CELL_PROP.fraisMontant)}
                        onChange={setLibre}
                        className="prop-libre prop-libre-mt"
                        label="0,00"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="prop-bas">
              <div className="prop-choisir">
                <div className="prop-choisir-titre">Comment choisir</div>
                <p>{COMMENT_CHOISIR}</p>
                <div className="prop-legende">
                  <span className="prop-puce" /> Quantité recommandée, utilisée pour le total ci-contre
                </div>
              </div>
              <table className="prop-totaux num">
                <tbody>
                  <tr>
                    <td>Total selon la quantité recommandée</td>
                    <td className="rt">{nombre2(montantRetenu)} $</td>
                  </tr>
                  <tr>
                    <td>Sous-total</td>
                    <td className="rt">{nombre2(sousTotal)} $</td>
                  </tr>
                  <tr>
                    <td>
                      TPS (5 %)
                      <CelluleTexte
                        cell={CELL_PROP.noTPS}
                        value={libre(CELL_PROP.noTPS)}
                        onChange={setLibre}
                        className="prop-libre prop-libre-no"
                        label="N° d'enregistrement"
                      />
                    </td>
                    <td className="rt">{nombre2(mtTPS)} $</td>
                  </tr>
                  <tr>
                    <td>
                      TVQ (9,975 %)
                      <CelluleTexte
                        cell={CELL_PROP.noTVQ}
                        value={libre(CELL_PROP.noTVQ)}
                        onChange={setLibre}
                        className="prop-libre prop-libre-no"
                        label="N° d'enregistrement"
                      />
                    </td>
                    <td className="rt">{nombre2(mtTVQ)} $</td>
                  </tr>
                  <tr className="prop-total">
                    <td>Total</td>
                    <td className="rt">{nombre2(total)} $</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Avertissement interne : il met en garde le chargé de projet dans l'aperçu, il n'a
                rien à faire sur le document que le client reçoit. */}
            {retenue && retenue.suggere && (
              <p className="prop-note ecran-seul">
                Prix calculé par la fiche : aucun prix vendu n'a été saisi pour la quantité recommandée.
              </p>
            )}

            <div className="prop-pied">
              <div>
                <b>Conditions et acceptation</b> — les conditions de la soumission et le bloc d'acceptation à
                signer se trouvent à la page 2.
              </div>
              <div className="prop-pagination">Page 1 de 2</div>
            </div>
          </div>

          {/* ─────────────────── page 2 : conditions et acceptation ─────────────────── */}
          <div className="prop-doc prop-page prop-page2">
            <div className="prop-entete2">
              <div>
                {EMETTEUR.adresse} · {EMETTEUR.contact}
              </div>
              <div className="prop-entete2-droite">
                <b>Soumission</b> {infos.noSoumission}
              </div>
            </div>

            <div className="prop-conditions">
              <div className="prop-condition">
                <div className="prop-condition-titre">Modalités de paiement</div>
                {/* Demande de Christian du 2 novembre : les modalités suivent le client. Le
                    champ se saisit à l'écran, et c'est la ligne au-dessous qui s'imprime —
                    avec le texte du gabarit tant que rien n'a été saisi. */}
                <CelluleTexte
                  cell={CELL_PROP.paiement}
                  value={libre(CELL_PROP.paiement)}
                  onChange={setLibre}
                  className="prop-libre prop-libre-bloc ecran-seul"
                  label="COD, net 30, net 45, net 60, net 90…"
                />
                <p className="prop-imprime">{texte(CELL_PROP.paiement) || PAIEMENT_DEFAUT}</p>
              </div>
              {CONDITIONS.map((c) => (
                <div className="prop-condition" key={c.titre}>
                  <div className="prop-condition-titre">{c.titre}</div>
                  <p>{c.texte}</p>
                </div>
              ))}
            </div>

            <div className="prop-acceptation">
              <div className="prop-acceptation-titre">Acceptation du client</div>
              <div className="prop-acceptation-mot">
                <span className="prop-case" /> J'accepte la présente soumission pour la quantité
                recommandée à la page 1, ainsi que les conditions énoncées ci-dessus.
              </div>
              <div className="prop-signature">
                <div>
                  <span className="prop-ligne" />
                  Nom en lettres moulées
                </div>
                <div>
                  <span className="prop-ligne" />
                  Titre
                </div>
                <div>
                  <span className="prop-ligne" />
                  Signature
                </div>
                <div>
                  <span className="prop-ligne" />
                  Date
                </div>
                <div>
                  <span className="prop-ligne" />
                  N° de bon de commande (si applicable)
                </div>
              </div>
            </div>

            <div className="prop-pied">
              <div>{EMETTEUR.nom}</div>
              <div className="prop-pagination">Page 2 de 2</div>
            </div>
          </div>

          <div className="prop-notes-internes">
            {specLibre("Notes internes", CELL_PROP.notes, "Ne s'imprime pas")}
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
