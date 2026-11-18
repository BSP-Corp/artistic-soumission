# Montage (imposition) — ce qui reste à faire dans Creator

> Pour Soufiane. Le calcul est livré et validé (`montage-imposition.md`, 1 568 cas). Ce qui suit
> ne touche **pas au code** : ce sont trois choses à régler **dans Creator**, dont deux qui ne
> demandent aucun redéploiement.
>
> BSP — 16 novembre 2026.

---

## 1. Créer la table `Formats_Feuille` et la remplir — **priorité**

### Pourquoi

Les 9 formats du client vivent aujourd'hui **en dur** dans `src/data/montageSnapshot.ts`. Les
données sont bonnes — c'est la transcription exacte du gabarit rempli par Roberto le 2 novembre —
mais pour ajouter un format il faut modifier le code, recompiler et redéployer.

Le code lit déjà Creator en premier (`formatsDepuisCreator`, `src/services/zohoService.ts`) et ne
retombe sur le snapshot que si la table est absente ou vide. **Il n'y a donc rien à coder : il
suffit que la table existe.** Les formats passent alors au même régime que les matériaux et les
taux, que le client modifie déjà sans nous.

### Périmètre

**Table Creator seulement.** Pas d'écran de gestion dans le widget : on la modifie directement dans
Creator, comme `Taux_Calcul`. (Décision Youssef, 16 nov.)

### La structure, exactement

Formulaire **`Formats_Feuille`**, et son rapport doit s'appeler **`Formats_Feuille_Report`** —
c'est le nom que le code demande (`REPORT_FORMATS_FEUILLE`).

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `Nom_format` | Ligne simple | non | Si vide, le widget affiche « L × H ». |
| `Largeur_po` | Décimal | **oui** | Une ligne sans largeur **> 0** est ignorée. |
| `Hauteur_po` | Décimal | **oui** | Idem. |
| `Actif` | Liste (Oui/Non) ou Nombre | oui en pratique | « Non » ou `0` ⇒ inactif. **Tout le reste, y compris un champ vide, vaut actif.** Remplis toujours « Oui » explicitement. |

> ⚠️ **Le piège : les noms de champs doivent être exacts.** Si `Largeur_po` s'appelle
> `Largeur` ou `Largeur_PO`, le widget lit 0, la ligne est écartée par le filtre, la table renvoie
> une liste vide — et le code **retombe silencieusement sur le snapshot, sans erreur**. Tout aura
> l'air de fonctionner, et toute modification faite dans la table restera sans effet.
>
> **Vérification obligatoire après création :** ajoute une ligne de test évidente (par ex.
> `99 × 99`, Actif = Oui), ouvre une soumission avec une grosse quantité, et regarde si ce format
> apparaît dans les candidats. S'il n'apparaît pas, la table n'est pas lue. Retire la ligne de test
> ensuite.

### Les 9 lignes à saisir

Source : `Gabarit_formats_feuille.xlsx` rempli par Roberto Montanaro, 2 novembre 2026. À recopier
telles quelles.

| Nom_format | Largeur_po | Hauteur_po | Actif |
|---|---|---|---|
| 24 × 48 | 24 | 48 | Oui |
| 24 × 36 | 24 | 36 | Oui |
| 21 × 28 | 21 | 28 | Oui |
| 24 × 24 | 24 | 24 | Oui |
| 30 × 28 | 30 | 28 | Oui |
| 21 × 30 | 21 | 30 | Oui |
| 12 × 24 | 12 | 24 | Oui |
| 12 × 12 | 12 | 12 | Oui |
| 16 × 12 | 16 | 12 | Oui |

> La **compatibilité presse ne se saisit pas** : elle se déduit des fiches machines
> (`Largeur_max_po` / `Hauteur_max_po`). Pas de colonne presse dans cette table — une seule source
> de vérité, c'est le choix fait au départ et il tient.

### Une fois la table en place

`src/data/montageSnapshot.ts` **reste** : c'est le repli qui fait tourner le widget hors Zoho et en
développement. Ne le supprime pas. Il devient simplement inutilisé en production.

---

## 2. Corriger `APP_MONTAGE_GRAIN_FIGE` — 1 minute, aucun redéploiement

> ⛔ **L'ORDRE COMPTE — ne pas toucher au paramètre avant le déploiement.**
>
> Le code sait désormais tourner la pièce, et `grainFige` vaut `false` par défaut
> (`montage.ts`). Mais le `APP_MONTAGE_GRAIN_FIGE` à **1** présent dans `Taux_Calcul`
> (ID …875014) **n'est pas un oubli** : il tient le grain fermé tant que l'ancien build est en
> ligne. Ce build-là ne fait pas voyager le sens de pose avec la soumission
> (`X!MONTAGETOURNEE`). Y libérer le grain, c'est activer la rotation **sans que l'orientation
> soit enregistrée nulle part** — l'atelier peut monter la pièce dans le mauvais sens. C'est le
> trou du 11 novembre, rouvert.
>
> **Séquence : déployer le build de `main`, PUIS passer le 1 à 0, PUIS jouer T16.**
> Relevé par Soufiane le 16 novembre.


Le paramètre vaut **1** (pas de rotation de la pièce), repris de l'onglet « Paramètres » du gabarit
Excel, où Roberto avait coché « Oui ».

Mais à la question de confirmation posée par courriel, il a répondu le **3 novembre à 12 h 44** :

> *« 3. Comme le sens du grain impose l'orientation, on ne tourne pas la pièce de 90 degrés : on la
> garde telle qu'elle est saisie, sa longueur dans le sens du grain. C'est la bonne lecture ? »*
> → **« non pas d'importance »**

Le grain **n'impose pas** l'orientation. Le commit du montage date du même jour à 8 h 57, donc
antérieur de près de 4 heures à cette réponse : le code n'a jamais pu en tenir compte.

**Correction : passer `APP_MONTAGE_GRAIN_FIGE` à `0` dans `Taux_Calcul`.** Le code sait déjà
tourner la pièce (`evaluerFormat` teste la seconde orientation et garde la meilleure).

L'effet n'est pas cosmétique : la vérification montre un cas où grain figé donne 6 up par feuille
et grain libre **7**. C'est du gain qu'on laisse sur la table à chaque job.

Après la correction, relancer `npm run verif:montage` et vérifier qu'un format peut désormais
sortir avec la mention « pièce tournée de 90° ».

---

## 3. Corriger les fiches machines — **tranché par Roberto le 16 novembre**

Roberto a répondu le 16 novembre à 15 h 06 : **« utilise ma liste »**. Ce sont donc ses chiffres
du 2 novembre qui font foi, et les fiches Creator qui sont à corriger — l'inverse de ce qu'on
faisait en attendant.

### Les sept presses de sa liste

> **Ces écritures se font à la main, dans l'écran Creator** — les six ci-dessous plus One man.
> L'écriture automatisée a été refusée (modification de données partagées) et Youssef a tranché
> le 18 novembre de ne pas lever ce garde-fou. Recopier les valeurs ci-dessous telles quelles.

| Presse | Fiche Creator aujourd'hui | **À corriger pour** |
|---|---|---|
| 110 | 26 × 18 | **21 × 30** |
| 116 | 12 × 8 | **16 × 12** |
| 120 | vides, fiche inactive | **30 × 28** — et à réactiver, Roberto la liste |
| 130 | 21 × 28 | inchangée ✅ |
| 140 | 25 × 38 | **24 × 24** |
| 150 | 30 × 50 | **44 × 64** |
| 170 | 30 × 40 | **30 × 39** |

### Les trois fiches qui n'étaient pas dans sa liste

Il les a reprises une par une, et aucune des trois n'était ce qu'on croyait.

**« One man » — 48 × 96, mais pas encore.** *« une presse qui sera réactivée prochainement »*. Le
format est confirmé. Tant qu'elle n'est pas remise en service elle n'a rien à faire dans la liste
de choix ; c'est la seule des trois dont la fiche est juste.

**« DTS » — ce n'est pas une presse.** *Direct To Screen* : la machine qui **brûle les soies**
utilisées sur les presses. Son format maxi de cadre est 1200 × 1500 mm, soit ≈ **47 × 59 po** —
pas le 48 × 96 de sa fiche. À retirer des presses sélectionnables : tant qu'elle y figure à
48 × 96, elle fait croire au calcul qu'un format géant est roulable alors qu'aucune presse ne
l'imprimerait.

**« 182 » — probablement la 180.** *« tu dois sûrement vouloir dire la 180 »* : une presse
multi-tête 6 couleurs rotative, en fonction, **impression 28 × 38**. La fiche porte 24 × 44, qui
ne correspond à rien de connu. À confirmer avec lui que c'est bien la même machine avant de
renommer — c'est la seule inconnue qui reste.

### Ce que ça change pour le calcul

Le conflit se referme proprement : **avec la liste de Roberto, chacun des neuf formats permis est
roulable par au moins une presse.** Le 16 × 12 redevient disponible — il n'existait dans les neuf
qu'à cause de la 116, et la fiche à 12 × 8 l'écartait de tout.

Le test T12 du protocole devient donc caduc tel qu'il est écrit : il demande de choisir la
Cameo 18 no.116 et d'attendre un avertissement. Une fois la fiche corrigée à 16 × 12, cette
presse roule le 16 × 12 et l'avertissement ne doit plus sortir pour ce format. Prendre une autre
presse pour éprouver l'avertissement — la 140 à 24 × 24 face à une suggestion 24 × 48, par
exemple.

### Vérifié contre les données et le code — 17 novembre

Les fiches ont été relues par l'API et le comportement confronté au code avant de toucher à
quoi que ce soit. Trois choses écrites ci-dessus ne tiennent pas.

**1. T12 n'est pas caduc.** Le raisonnement ci-dessus porte sur le 16 × 12, mais T12 ne teste pas
ça : il met la 116 face à la suggestion du scénario, qui est **24 × 48** (pièce 7 × 1,4,
40 000 ex.). Or le 24 × 48 n'est roulable que par la **Viking no.150**, avant comme après
correction — la 116 à 16 × 12 ne le roule pas davantage qu'à 12 × 8. **L'avertissement sortira
donc toujours, et T12 reste valide tel qu'il est écrit.** Inutile de le réécrire.

**2. Le trou du calcul, c'est « One man », pas la DTS.** La DTS a ses champs numériques
`Largeur_max_po` / `Hauteur_max_po` **vides** — son 48 × 96 n'existe que dans le champ texte
`Format_max`, que le calcul ne lit pas. Et `presseAccepte` (`lib/montage.ts`) écarte
explicitement une presse sans format renseigné, au lieu de la croire illimitée. La DTS ne valide
donc **aucun** format : elle encombre la liste de choix, ce qui est un défaut d'ergonomie, pas de
prix.

« One man », elle, porte 48 × 96 **dans les champs numériques** et son statut est **Actif**.
`machinesFamille` ne filtre que sur le statut, donc elle entre dans le calcul et rend
« roulables » des formats que personne n'imprime aujourd'hui. C'est la fiche décrite plus haut
comme « la seule des trois dont la fiche est juste » : juste sur les dimensions, mais active à
tort. **La passer à Inactif tant qu'elle n'est pas remise en service est la seule des trois
corrections qui change un résultat.**

**3. Le 16 × 12 n'est pas « écarté de tout ».** Il est roulable dès aujourd'hui par la 110, la
130, la 140, la 150 et la 170. Et les neuf formats permis sont **tous** déjà couverts par au moins
une presse, avant comme après la liste de Roberto — vérifié format par format. La correction des
fiches reste nécessaire (les chiffres sont faux), mais elle ne débloque aucun format.

**Ce qu'elle déplace vraiment**, c'est quelles presses roulent quoi — donc l'avertissement de
T12 — et le fait que la 120, aujourd'hui **Inactif**, est dans la liste de Roberto : sans
réactivation, son 30 × 28 n'entre pas dans le calcul.

> ⚠ **Un point de fragilité à connaître :** le 24 × 48 — le format que le montage recommande
> dans tous les scénarios de test — ne tient que sur **une seule presse**, la Viking no.150, dans
> les deux jeux de données. Si cette fiche est fausse ou la presse indisponible, c'est toute la
> recommandation phare qui n'a plus de machine.

### Les six fiches à corriger, avec leurs identifiants

| Presse | ID Creator | Aujourd'hui | → Roberto |
|---|---|---|---|
| Cameo 30SS no.110 | `4153107000022536120` | 26 × 18 | **21 × 30** |
| Cameo 18 no.116 | `4153107000022536124` | 12 × 8 | **16 × 12** |
| Cameo 38SS no.120 | `4153107000022536122` | vides, **Inactif** | **30 × 28** + réactiver |
| Saturn no.140 | `4153107000022536118` | 25 × 38 | **24 × 24** |
| Viking no.150 | `4153107000022536116` | 30 × 50 | **44 × 64** |
| Renegade 170 | `4153107000022536114` | 30 × 40 | **30 × 39** |
| Svecia no.130 | `4153107000022536112` | 21 × 28 | inchangée ✅ |
| One man | `4153107000022536056` | 48 × 96, **Actif** | **passer à Inactif** |


> ✅ **One man : décision prise le 17 novembre (Youssef) — la passer à Inactif.** Elle est hors
> service, Roberto le dit lui-même, et tant qu'elle est active elle fait considérer roulables des
> formats que personne n'imprime.
>
> **Changer le statut, rien d'autre.** Garder les 48 × 96 dans les champs numériques : ils sont
> confirmés par Roberto, et il faudra les retrouver tels quels quand la presse reviendra.
>
> **Conséquence à connaître :** une fois One man inactive, le **24 × 48 ne tient plus que sur la
> Viking no.150**. C'est le format que tous les scénarios de test recommandent, et il ne dépend
> plus que d'une seule fiche. Si la 150 devenait inactive, ou si son format maxi passait sous
> 24 × 48, ce format disparaîtrait des propositions — sans erreur, juste en cessant d'être
> suggéré. Vaut la peine d'être dit à Christian le jour où on touchera aux presses.

Le champ texte `Format_max` est décoratif : aucun calcul ne le lit. Le corriger aussi évite
qu'il contredise les champs numériques à l'œil.

---

> Le fichier que Christian réclamait le 3 novembre (« Tu as oublié le fichier 😊 ») n'est jamais
> arrivé et n'est plus attendu : la réponse du 16 novembre tranche sans lui.

---

## 4. Les boutons « Accepter » / « Annuler » sont illisibles — correctif CSS

Relevé en testant le widget déployé dans Creator le 16 novembre. Les deux boutons du bloc montage
s'affichent comme des **rectangles blancs vides**. Ils fonctionnent — cliquer « Accepter » inscrit
bien « retenu : 24 × 48 » — mais leur libellé est invisible.

Ce n'est pas Creator qui écrase le style, c'est le nôtre. Dans `src/styles.css` :

```css
.btn.ghost {
  background: transparent;
  color: #fff;        /* texte blanc */
  border: 1px solid #4a4a4a;
}
```

`btn ghost` est faite pour la **barre d'outils du haut**, sur fond foncé. Dans `App.tsx` le bloc
montage la réutilise (`className="btn ghost petit"`) pour des boutons placés dans une cellule
`.machine-info`, **sur fond clair** : texte blanc sur fond blanc.

**Correctif :** une variante à texte foncé pour les boutons dans `.machine-info`. La règle
`.machine-info .btn.petit` existe déjà (ligne ~1356) et ne porte que des marges — c'est l'endroit
naturel où ajouter la couleur et la bordure.

À vérifier dans Creator après correction, pas seulement en développement : c'est précisément parce
que le contraste passait sur l'écran de dev que le défaut n'a pas été vu.

---

## Récapitulatif

| # | Quoi | Où | État au 16 nov. (soir) |
|---|---|---|---|
| 1 | Créer `Formats_Feuille` + les 9 lignes | Creator (builder) | CSV d'import prêt, table à créer |
| 2 | Grain libre | Code | ✅ défaut dans le code — le `1` de `Taux_Calcul` ne passe à `0` **qu'après** le déploiement |
| 3 | Fiches machines selon la liste Roberto | Creator (`Fiche_Machine`) | tranché, à saisir |
| 4 | Boutons illisibles (CSS) | Code | ✅ corrigé, à revoir dans Creator |

Reste donc deux choses à faire dans Creator : la table des formats et les fiches machines. Le
reste est dans le code, sur `main`, et attend d'être déployé puis validé — le protocole est dans
`montage-protocole-tests.md`.

> **Vérifié en production le 16 novembre** (build `2026-11-05 15:12 UTC`, Creator : 211 matériaux ·
> 124 taux) : le montage était bien déployé et calculait juste. Pièce 7 × 1,4 po, 40 000
> exemplaires → feuille 24 × 48, 3 × 28 = 84 up/feuille, 477 feuilles. Après « Accepter », coût,
> total, prix unitaire et temps étaient **inchangés au cent près** — c'est ce constat qui a
> déclenché l'étape 6, livrée depuis.

---

*BSP — 16 novembre 2026.*
