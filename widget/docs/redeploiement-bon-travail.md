# Redéployer le bon de travail — marche à suivre

> **Pourquoi.** Le widget de bon de travail tourne sur un build du **20 octobre**. C'est lui qui
> sème les lignes de la grille « Temps par opération » à la création d'un bon. Tant qu'il n'est pas
> redéployé, les bons créés depuis cet écran naissent sans lignes — et le pointage, qui ne sait que
> mettre à jour une ligne existante, n'a rien à remplir.
>
> Tout le reste de la chaîne est déjà en place : le workflow `Pointage_Atelier_Success` calcule la
> durée nette et reporte le cumul sur la grille dès qu'une ligne existe.
>
> BSP — 25 novembre 2026.

---

## D'abord : un essai de deux minutes, avant de toucher à la production

**Deux widgets créent des bons de travail :**

| Qui | Fichier | Build en ligne |
|---|---|---|
| L'écran de soumission — « Envoyer vers le bon de travail » | `src/App.tsx` | **20 novembre** ✅ |
| L'écran de bon de travail — « Créer le bon » | `src/bt/AppBT.tsx` | **20 octobre** ⚠️ |

Les deux appellent le même `creerBonTravail`, et ce code sème les lignes **depuis le 27 octobre**.
Donc l'écran de soumission devrait déjà les semer, et seul l'écran de bon de travail en serait
incapable.

**L'essai :** créer un bon **depuis l'écran de soumission** (« Envoyer vers le bon de travail »),
puis ouvrir ce bon dans Creator et regarder la grille.

- **Des lignes apparaissent** → l'hypothèse est confirmée. Le seul coupable est le widget de bon de
  travail, et le redéploiement ci-dessous règle tout.
- **La grille reste vide** → le semis échoue pour une autre raison, et il ne faut rien redéployer
  avant de savoir laquelle. Le code avale les erreurs de semis par conception (*« un semis raté ne
  doit pas empêcher la création du bon »*) : ouvrir la console du navigateur pendant la création
  montrera le `console.warn`.

> Cet essai coûte deux minutes et évite de redéployer un widget de production sur une supposition.

---

## Le redéploiement

Le paquet est déjà construit : **`widget/bontravail/dist/bontravail.zip`** (`npm run pack:bt`).

### Sur une page d'essai d'abord — recommandé

Même patron que `Soumission_essai` et `Pointage_essai` :

1. **Paramètres → Widgets** → créer une entrée **`bontravail2`**, y téléverser le zip.
2. Créer la page **`Bon_de_travail_essai`**, réservée aux administrateurs.
3. Y poser le widget `bontravail2`.
4. Créer un bon depuis cette page, puis vérifier la grille dans Creator.

L'entrée `bontravail` existante garde son build du 20 octobre : la production ne bouge pas.

### Puis en production

Une fois l'essai concluant, téléverser le **même zip** dans l'entrée **`bontravail`** existante.

---

## Ce que le redéploiement apporte, et ce qu'on ne sait pas

**Ce qu'on sait :** une seule modification du dépôt touche cet écran depuis sa création —
`61646ad` du 3 novembre, qui distingue les quatre causes du message « Hors Creator ». Plus le semis
des lignes, présent dès le premier commit.

**Ce qu'on ne sait pas :** le dépôt commence le **27 octobre** et le build en ligne date du
**20 octobre**. Ce qui a changé entre ces deux dates n'est documenté nulle part. Le redéploiement
apporte donc aussi ces changements-là, quels qu'ils soient.

C'est précisément pour ça que l'essai sur une page séparée vaut le détour : il les fait apparaître
avant qu'ils n'atteignent la production.

---

## À vérifier sur la page d'essai

1. **Créer un bon depuis une soumission.** La grille « Temps par opération » doit porter une ligne
   par opération estimée — en principe `SOIE`, `IMPR`, `NUM`, `DEC_PLAT`, `DEC_ZUND`, selon ce que
   la job comporte, avec leur `Temps_prevu_min`.
2. **Pointer cette opération** depuis `Pointage_essai`, puis terminer.
3. **Rouvrir le bon** : la ligne doit maintenant porter un `Temps_reel_min` et un `Ecart_min`.

> Le point 3 est l'aboutissement : c'est le comparatif estimé / réalisé qui fonctionne de bout en
> bout, sans qu'on ait écrit une ligne de Deluge.

4. **Ouvrir un bon existant** (BT-1000 à BT-1003) et vérifier qu'il s'affiche toujours
   correctement : ces bons n'ont pas de lignes et l'écran doit le supporter sans broncher.

---

## Ce que ça ne répare pas

Les bons **déjà créés** resteront sans lignes : le semis ne se fait qu'à la création. Deux options
quand la question se posera :

- les laisser ainsi — ce sont des bons d'essai ;
- ou écrire un petit script de réensemencement, qui lit les cinq temps de chaque bon et pose les
  lignes manquantes par l'API.

**Rien ne presse** : le tableau d'atelier et le futur bloc comparatif lisent les **pointages**, pas
la grille. Ils fonctionnent sur les bons sans lignes comme sur les autres.
