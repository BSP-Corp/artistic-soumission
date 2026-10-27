// Déclaration des temps — poste de pointage d'atelier.
//
// Pensé pour un écran tactile debout : gros boutons, peu de texte, une seule décision à la
// fois. L'opérateur se choisit une fois (mémorisé sur la tablette), puis l'écran ne montre
// que ce qui le concerne : ce qu'il est en train de faire, et ce qu'il a fait aujourd'hui.
//
// Le widget n'horodate RIEN : il envoie un changement de statut, le workflow Creator pose
// les heures et calcule les durées. Le chrono affiché est un reflet, jamais une source.

import { useCallback, useEffect, useMemo, useState } from "react";
import { initZohoEnv, isZohoEnv } from "@/services/zohoService";
import {
  chargerReferentiels,
  chargerPointages,
  demarrerPointage,
  changerStatut,
  creerRessource,
  minutesEcoulees,
  dureeLisible,
  heureLisible,
  estAujourdhui,
  type Referentiels,
  type Pointage,
  type Operation,
} from "@/services/pointageService";
import "./pointage.css";

declare const __BUILD__: string;

const CLE_OPERATEUR = "bsp.pointage.operateur";

type Avis = { ton: "ok" | "erreur"; texte: string } | null;

export default function AppPointage() {
  const [pret, setPret] = useState(false);
  const [dansZoho, setDansZoho] = useState(false);
  const [ref, setRef] = useState<Referentiels | null>(null);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [operateur, setOperateur] = useState<string>(() => localStorage.getItem(CLE_OPERATEUR) ?? "");
  const [avis, setAvis] = useState<Avis>(null);
  const [occupe, setOccupe] = useState(false);
  const [maintenant, setMaintenant] = useState(() => new Date());

  // saisie d'un nouveau pointage
  const [rechercheBT, setRechercheBT] = useState("");
  const [btChoisi, setBtChoisi] = useState("");
  const [opChoisie, setOpChoisie] = useState("");
  const [machineChoisie, setMachineChoisie] = useState("");

  // ajout d'un opérateur
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [depNouveau, setDepNouveau] = useState("");

  const rafraichir = useCallback(async () => {
    const [r, p] = await Promise.all([chargerReferentiels(), chargerPointages()]);
    if (r) setRef(r);
    setPointages(p);
  }, []);

  useEffect(() => {
    (async () => {
      await initZohoEnv();
      const dedans = isZohoEnv();
      setDansZoho(dedans);
      if (dedans) await rafraichir();
      setPret(true);
    })();
  }, [rafraichir]);

  // Le chrono est purement visuel : une seconde suffit, et on ne réinterroge pas Creator.
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const mesPointages = useMemo(
    () => pointages.filter((p) => !operateur || p.ressourceId === operateur),
    [pointages, operateur],
  );
  const enCours = useMemo(
    () => mesPointages.filter((p) => p.statut === "En cours" || p.statut === "En pause"),
    [mesPointages],
  );
  const duJour = useMemo(
    () =>
      mesPointages
        .filter((p) => p.statut === "Termine" && estAujourdhui(p.punchIn))
        .sort((a, b) => (b.punchIn?.getTime() ?? 0) - (a.punchIn?.getTime() ?? 0)),
    [mesPointages],
  );
  const totalJour = useMemo(() => duJour.reduce((s, p) => s + (p.dureeReelleMin ?? 0), 0), [duJour]);

  const bonsFiltres = useMemo(() => {
    const q = rechercheBT.trim().toLowerCase();
    const liste = ref?.bons ?? [];
    if (!q) return liste.slice(0, 12);
    return liste
      .filter((b) => [b.noBT, b.client, b.modele, b.noPiece].some((v) => v.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [ref, rechercheBT]);

  const operationsOffertes = useMemo(() => {
    const actives = (ref?.operations ?? []).filter((o) => o.actif);
    const moi = ref?.ressources.find((r) => r.id === operateur);
    if (!moi?.departement) return actives;
    // On remonte les opérations du département de l'opérateur, sans masquer les autres :
    // en atelier on dépanne souvent un poste voisin.
    const sien = (o: Operation) => (o.departement === moi.departement ? 0 : 1);
    return [...actives].sort((a, b) => sien(a) - sien(b) || (a.ordre ?? 999) - (b.ordre ?? 999));
  }, [ref, operateur]);

  const agir = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    setOccupe(true);
    const r = await fn();
    setAvis({ ton: r.ok ? "ok" : "erreur", texte: r.message });
    if (r.ok) await rafraichir();
    setOccupe(false);
  };

  const demarrer = () =>
    agir(async () => {
      if (!btChoisi) return { ok: false, message: "Choisissez un bon de travail." };
      if (!opChoisie) return { ok: false, message: "Choisissez une opération." };
      if (!operateur) return { ok: false, message: "Choisissez votre nom." };
      const r = await demarrerPointage({
        btId: btChoisi,
        operationId: opChoisie,
        ressourceId: operateur,
        machineId: machineChoisie || undefined,
      });
      if (r.ok) {
        setBtChoisi("");
        setOpChoisie("");
        setMachineChoisie("");
        setRechercheBT("");
      }
      return r;
    });

  const ajouterOperateur = () =>
    agir(async () => {
      if (!prenom.trim() || !nom.trim()) return { ok: false, message: "Prénom et nom sont requis." };
      if (!depNouveau) return { ok: false, message: "Choisissez un département." };
      const roleUser = ref?.roles.find((r) => /user/i.test(r.nom)) ?? ref?.roles[0];
      if (!roleUser) return { ok: false, message: "Aucun rôle défini dans Creator." };
      const r = await creerRessource({
        prenom: prenom.trim(),
        nom: nom.trim(),
        departementId: depNouveau,
        roleId: roleUser.id,
        organisationId: ref?.organisationId ?? "",
      });
      if (r.ok && r.id) {
        setOperateur(r.id);
        localStorage.setItem(CLE_OPERATEUR, r.id);
        setAjoutOuvert(false);
        setPrenom("");
        setNom("");
      }
      return r;
    });

  const choisirOperateur = (id: string) => {
    setOperateur(id);
    localStorage.setItem(CLE_OPERATEUR, id);
    setAvis(null);
  };

  if (!pret) return <div className="pt-vide">Chargement…</div>;

  if (!dansZoho) {
    return (
      <div className="pt-vide">
        <h1>Déclaration des temps</h1>
        <p>
          Cet écran doit être ouvert depuis Creator : il lit et écrit les pointages dans l'application.
          Hors Zoho, il n'a aucune donnée à afficher.
        </p>
        <p className="pt-build">build {__BUILD__}</p>
      </div>
    );
  }

  const moi = ref?.ressources.find((r) => r.id === operateur);

  // ── Choix de l'opérateur ────────────────────────────────────────────────
  if (!operateur || !moi) {
    return (
      <div className="pt-page">
        <header className="pt-entete">
          <h1>Qui pointe&nbsp;?</h1>
          <span className="pt-build">build {__BUILD__}</span>
        </header>
        {avis && <p className={`pt-avis pt-avis-${avis.ton}`}>{avis.texte}</p>}

        {ref?.ressources.length ? (
          <div className="pt-grille-operateurs">
            {ref.ressources.map((r) => (
              <button key={r.id} className="pt-operateur" onClick={() => choisirOperateur(r.id)}>
                <span className="pt-operateur-nom">{r.nom}</span>
                {r.departement && <span className="pt-operateur-dep">{r.departement}</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="pt-note">
            Aucun opérateur n'est encore enregistré dans Creator. Ajoutez le premier ci-dessous.
          </p>
        )}

        {ajoutOuvert ? (
          <div className="pt-carte pt-ajout">
            <h2>Nouvel opérateur</h2>
            <div className="pt-ligne">
              <input className="pt-champ" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              <input className="pt-champ" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
              <select className="pt-champ" value={depNouveau} onChange={(e) => setDepNouveau(e.target.value)}>
                <option value="">Département…</option>
                {ref?.departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-ligne">
              <button className="pt-btn pt-btn-primaire" disabled={occupe} onClick={ajouterOperateur}>
                Ajouter
              </button>
              <button className="pt-btn" disabled={occupe} onClick={() => setAjoutOuvert(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button className="pt-btn pt-lien" onClick={() => setAjoutOuvert(true)}>
            Je ne suis pas dans la liste
          </button>
        )}
      </div>
    );
  }

  // ── Poste de pointage ───────────────────────────────────────────────────
  return (
    <div className="pt-page">
      <header className="pt-entete">
        <div>
          <h1>{moi.nom}</h1>
          {moi.departement && <span className="pt-sous">{moi.departement}</span>}
        </div>
        <div className="pt-entete-droite">
          <span className="pt-build">build {__BUILD__}</span>
          <button className="pt-btn pt-lien" onClick={() => choisirOperateur("")}>
            Changer d'opérateur
          </button>
        </div>
      </header>

      {avis && <p className={`pt-avis pt-avis-${avis.ton}`}>{avis.texte}</p>}

      {enCours.length > 0 && (
        <section className="pt-section">
          <h2>En cours</h2>
          {enCours.map((p) => {
            const enPause = p.statut === "En pause";
            return (
              <div key={p.id} className={`pt-carte pt-actif ${enPause ? "pt-pause" : ""}`}>
                <div className="pt-actif-tete">
                  <span className="pt-bt">{p.btNo}</span>
                  <span className="pt-op">{p.operationNom}</span>
                  {p.machineNom && <span className="pt-machine">{p.machineNom}</span>}
                </div>
                <div className="pt-chrono">{dureeLisible(minutesEcoulees(p, maintenant))}</div>
                <div className="pt-detail">
                  Début {heureLisible(p.punchIn)}
                  {p.pauseCumuleeMin > 0 && <> · pause {dureeLisible(p.pauseCumuleeMin)}</>}
                  {enPause && <> · <strong>en pause</strong></>}
                </div>
                <div className="pt-ligne">
                  {enPause ? (
                    <button
                      className="pt-btn pt-btn-primaire pt-btn-grand"
                      disabled={occupe}
                      onClick={() => agir(() => changerStatut(p.id, "En cours"))}
                    >
                      Reprendre
                    </button>
                  ) : (
                    <button
                      className="pt-btn pt-btn-grand"
                      disabled={occupe}
                      onClick={() => agir(() => changerStatut(p.id, "En pause"))}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    className="pt-btn pt-btn-fin pt-btn-grand"
                    disabled={occupe}
                    onClick={() => agir(() => changerStatut(p.id, "Termine"))}
                  >
                    Terminer
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="pt-section">
        <h2>Démarrer un pointage</h2>
        <div className="pt-carte">
          <input
            className="pt-champ pt-recherche"
            placeholder="Chercher un bon de travail (n°, client, modèle, n° pièce)"
            value={rechercheBT}
            onChange={(e) => setRechercheBT(e.target.value)}
          />
          <div className="pt-grille-bt">
            {bonsFiltres.map((b) => (
              <button
                key={b.id}
                className={`pt-bt-carte ${btChoisi === b.id ? "pt-choisi" : ""}`}
                onClick={() => setBtChoisi(b.id === btChoisi ? "" : b.id)}
              >
                <span className="pt-bt">{b.noBT}</span>
                <span className="pt-bt-info">{[b.client, b.modele].filter(Boolean).join(" · ") || "—"}</span>
                {b.noPiece && <span className="pt-bt-info">n° pièce {b.noPiece}</span>}
              </button>
            ))}
            {!bonsFiltres.length && <p className="pt-note">Aucun bon de travail ne correspond.</p>}
          </div>

          <div className="pt-ligne">
            <select className="pt-champ" value={opChoisie} onChange={(e) => setOpChoisie(e.target.value)}>
              <option value="">Opération…</option>
              {operationsOffertes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom}
                  {o.departement ? ` — ${o.departement}` : ""}
                </option>
              ))}
            </select>
            <select className="pt-champ" value={machineChoisie} onChange={(e) => setMachineChoisie(e.target.value)}>
              <option value="">Machine (facultatif)…</option>
              {ref?.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </div>

          <button className="pt-btn pt-btn-primaire pt-btn-grand pt-btn-large" disabled={occupe} onClick={demarrer}>
            Démarrer
          </button>
        </div>
      </section>

      <section className="pt-section">
        <h2>
          Aujourd'hui{duJour.length > 0 && <span className="pt-total"> — {dureeLisible(totalJour)} au total</span>}
        </h2>
        {duJour.length ? (
          <table className="pt-table">
            <thead>
              <tr>
                <th>Bon</th>
                <th>Opération</th>
                <th>Début</th>
                <th>Fin</th>
                <th className="pt-droite">Durée</th>
              </tr>
            </thead>
            <tbody>
              {duJour.map((p) => (
                <tr key={p.id}>
                  <td>{p.btNo}</td>
                  <td>{p.operationNom}</td>
                  <td>{heureLisible(p.punchIn)}</td>
                  <td>{heureLisible(p.punchOut)}</td>
                  <td className="pt-droite">{dureeLisible(p.dureeReelleMin ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="pt-note">Aucun pointage terminé aujourd'hui.</p>
        )}
      </section>
    </div>
  );
}
