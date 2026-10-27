# Contrat Soumission — mise à jour v1.1 (16 septembre 2026)

Bonjour,

Le contrat JSON que Zoho envoie à votre API passe en **version 1.1**. C'est une mise à jour **rétro-compatible** : aucun champ n'a été retiré, renommé ni changé de type. Votre parseur v1.0 continue de fonctionner tel quel.

## Ce qui est ajouté

| Champ | Type | Signification |
|---|---|---|
| `prix.prix_vendu_unitaire` | montant CAD ou `null` | **Le prix décidé par le chargé de projet**, unitaire. Peut être égal, supérieur ou inférieur au prix calculé. `null` si non saisi. |
| `prix.prix_vendu_total` | montant CAD ou `null` | `prix_vendu_unitaire × quantité`. `null` si le premier est `null`. |
| `production.quantites_alternatives[].prix_vendu_unitaire` | montant CAD ou `null` | Même chose pour chaque quantité alternative de la table. |

`schema_version` vaut désormais `"1.1"`.

## Ce que ça change pour vous

- **Le prix à retenir pour le client** est `prix.prix_vendu_unitaire` **quand il n'est pas `null`**, sinon `prix.prix_unitaire` (la valeur calculée, inchangée).
- `prix.prix_unitaire` reste la suggestion du moteur de prix ; `prix.prix_vendant` et `prix.cout_revient` sont inchangés.

## Précisions (sans changement de type)

- `decoupe.zund.*.contour` et `decoupe.platine.kiss_cut.nb_die` valent maintenant **0 ou 1** (ce sont des interrupteurs ; ils étaient déjà documentés comme tels).
- `impression.faces.*` vaut toujours **1** : ces champs ne sont plus saisis.

## Documents à jour

- `CONTRAT-SOUMISSION.md` — référence complète, avec l'historique des versions
- `exemple-soumission.json` — payload réel v1.1 (contient un `prix_vendu_unitaire` renseigné)
- `soumission.schema.json` — JSON Schema 2020-12, validé contre l'exemple
- `openapi.yaml`
- `contrat-soumission.html` — même contenu, lisible dans un navigateur, imprimable

Les envois passeront en v1.1 dès le déploiement de la nouvelle version du widget — nous vous confirmerons la date. D'ici là, vous recevez toujours du v1.0. Pour toute question sur un champ, citez son chemin (ex. `prix.prix_vendu_unitaire`).

Cordialement,
BSP
