# La séance de déploiement — une heure, dans cet ordre

Tout ce qui bloque la série de tests tient sur cette page. Deux gestes, à la main, dans la même
séance. Rien à décider en chemin : les décisions sont prises, les valeurs sont ci-dessous.

Pourquoi une page à part : ces deux gestes se sont retrouvés éparpillés entre `ETAT.md`,
`montage-a-completer.md` §3 et le protocole. Ici, ils sont ensemble et dans l'ordre.

---

## Étape 1 — Téléverser le paquet

**Creator → Paramètres → Widgets → widget soumission → remplacer le zip.**

Le paquet : `widget/canevas/dist/canevas.zip`, construit le 17 nov. à 15:30 (207 981 o).
**Inutile de reconstruire** — entre `ea15357` et `6246975`, aucun fichier hors `docs/` n'a changé,
le code du paquet est celui de `main`. Reconstruire ne ferait que changer l'heure du bandeau.

**Noter le bandeau obtenu** (`__BUILD__`, coin du widget) et le reporter dans le protocole,
point 2. C'est la seule preuve que le déploiement a pris — et le feu vert pour le `0` du grain,
plus tard.

---

## Étape 2 — Les sept écritures de fiches

Formulaire **`Fiche_Machine`**. Champs numériques **`Largeur_max_po`** et **`Hauteur_max_po`**.
Statut : champ **`Statut`**, valeurs `Actif` / `Inactif`.

> **À la main, dans l'écran Creator.** L'écriture automatisée a été refusée (modification de
> données partagées) et Youssef a tranché le 18 novembre de ne pas lever ce garde-fou.

| # | Presse | ID Creator | Largeur_max_po | Hauteur_max_po | Statut |
|---|---|---|---|---|---|
| 1 | Cameo 30SS no.110 | `4153107000022536120` | **21** | **30** | — |
| 2 | Cameo 18 no.116 | `4153107000022536124` | **16** | **12** | — |
| 3 | Cameo 38SS no.120 | `4153107000022536122` | **30** | **28** | **Actif** (réactiver) |
| 4 | Saturn no.140 | `4153107000022536118` | **24** | **24** | — |
| 5 | Viking no.150 | `4153107000022536116` | **44** | **64** | — |
| 6 | Renegade 170 | `4153107000022536114` | **30** | **39** | — |
| 7 | One man | `4153107000022536056` | *ne pas toucher* | *ne pas toucher* | **Inactif** |

**Svecia no.130** (`4153107000022536112`) : 21 × 28, déjà juste. Ne pas y toucher.

**One man : le statut, rien d'autre.** Garder 48 × 96 dans les champs numériques — Roberto les
confirme, et il faudra les retrouver tels quels quand la presse reviendra en service.

Le champ texte `Format_max` est décoratif, aucun calcul ne le lit. Le corriger aussi si c'est
rapide, pour qu'il ne contredise pas les champs numériques à l'œil.

### Contrôle avant de passer à la suite

Relire la fiche 110 : elle doit porter **21 × 30**. Si elle porte encore 26 × 18, l'écriture
n'a pas pris.

---

## Ensuite seulement : T1

L'ordre compte. Les écritures passent **avant** T1, pour que toute la série tourne sur les
données qu'Artistic utilisera vraiment — captures client comprises. Sinon il faut tout refaire.

## Ce qu'il ne faut PAS faire dans cette séance

⛔ **Ne pas toucher à `APP_MONTAGE_GRAIN_FIGE`.** Il reste à `1` jusqu'à ce que le bandeau
confirme le déploiement. Avant, il tient le grain fermé pendant que l'ancien build ne sait pas
enregistrer le sens de pose — l'atelier pourrait poser la pièce à l'envers. Voir
`montage-a-completer.md` §2.

---

*BSP — si une valeur de cette page contredit une autre page du dépôt, c'est celle-ci qui a tort :
la source reste `montage-a-completer.md` §3.*
