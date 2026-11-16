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

## 3. Trancher le conflit des formats maxi des presses — demande au client

Les formats maxi fournis par Roberto ne correspondent pas aux fiches machines déjà dans Creator.
Relevé le 3 novembre, documenté en tête de `montageSnapshot.ts` :

| Presse | Liste Roberto | Fiche Creator | |
|---|---|---|---|
| 110 | 21 × 30 | 26 × 18 | ≠ |
| 116 | 16 × 12 | 12 × 8 | ≠ |
| 120 | 30 × 28 | vides, fiche inactive | ≠ |
| 130 | 21 × 28 | 21 × 28 | ✅ seule concordance |
| 140 | 24 × 24 | 25 × 38 | ≠ |
| 150 | 44 × 64 | 30 × 50 | ≠ |
| 170 | 30 × 39 | 30 × 40 | ≈ |
| 182 | absente | 24 × 44, active | — |

Les presses « One man » (48 × 96) et « DTS » sont actives dans Creator et absentes de la liste.

**Conséquence concrète :** le format 16 × 12 n'existe dans la liste que parce que la 116 ferait
16 × 12. Avec la fiche Creator (12 × 8), aucune presse ne peut le rouler et le calcul l'écarte.

**En attendant, les fiches Creator font foi** — elles sont la source déjà branchée et déjà affichée
dans l'écran. Rien n'est écrasé. Ce point demande un appel à Roberto, pas du code.

> À noter : le 3 novembre à 14 h 29, Christian écrivait à Roberto *« Tu as oublié le fichier 😊 »*.
> Un fichier devait accompagner ses réponses et n'est jamais arrivé. C'est peut-être la liste
> corrigée. À réclamer avant de trancher.

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

| # | Quoi | Où | Redéploiement |
|---|---|---|---|
| 1 | Créer `Formats_Feuille` + les 9 lignes | Creator (builder) | non |
| 2 | `APP_MONTAGE_GRAIN_FIGE` → 0 | Creator (`Taux_Calcul`) | non |
| 3 | Conflit des formats maxi presses | Appel client | — |
| 4 | Boutons illisibles (CSS) | Code | **oui** |

Les trois premiers ne touchent pas au code ; le quatrième est quelques lignes de CSS. L'**étape 6**
— réinjecter le format retenu dans le temps d'impression et donc dans le prix — reste le seul vrai
chantier de développement, et elle attend un arbitrage client parce qu'elle change des prix.

> **Vérifié en production le 16 novembre** (build `2026-11-05 15:12 UTC`, Creator : 211 matériaux ·
> 124 taux) : le montage est bien déployé et calcule juste. Pièce 7 × 1,4 po, 40 000 exemplaires →
> feuille 24 × 48, 3 × 28 = 84 up/feuille, 477 feuilles. Après « Accepter », coût, total, prix
> unitaire et temps sont **inchangés au cent près** — l'étape 6 confirmée manquante sur le
> déployé, pas seulement en local.

---

*BSP — 16 novembre 2026.*
