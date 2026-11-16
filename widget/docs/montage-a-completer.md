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

> ✅ **Réglé depuis, dans le code** : `grainFige` vaut `false` par défaut (`montage.ts`), donc rien
> à paramétrer. Il reste à vérifier qu'aucun `APP_MONTAGE_GRAIN_FIGE` à `1` ne traîne dans
> `Taux_Calcul` — il écraserait le défaut et refermerait le grain. La section ci-dessous explique
> pourquoi ce choix.

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
| 2 | Grain libre | Code | ✅ défaut dans le code — vérifier qu'aucun `APP_MONTAGE_GRAIN_FIGE` à 1 ne traîne |
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
