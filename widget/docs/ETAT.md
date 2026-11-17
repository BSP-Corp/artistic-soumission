# Montage — état du chantier

> **Ce fichier est la source unique de l'avancement.** Il remplace les messages Cliq et les
> courriels entre nous. Chacun le met à jour **par un commit**, pas par un message : ce qui n'est
> pas ici n'existe pas, et personne n'a à demander « où on en est ».
>
> Mis à jour en dernier : **17 novembre 2026** — BSP.

---

## Comment on travaille (la convention)

Le 17 novembre, on s'est rendu compte qu'on s'échangeait par message des choses qui auraient dû
être dans le dépôt : un build prêt, des corrections de protocole, une décision client. Résultat,
chacun devait demander à l'autre où il en était, et personne ne pouvait le savoir seul.

**La règle :** tout ce qui fait avancer le chantier est un commit.

| Ce que tu as | Où ça va |
|---|---|
| Un correctif, une trouvaille, une correction de doc | un commit, avec le pourquoi dans le message |
| « j'ai fini X », « je bloque sur Y » | une ligne dans le **Journal** ci-dessous |
| Un résultat de test, une capture | `docs/captures/` + la case cochée dans le protocole |
| Une réponse client (Roberto, Christian) | résumée dans le document concerné, avec la date |
| Une décision (feu vert, arbitrage de prix) | une ligne dans le **Journal**, signée |

**Ce qui reste légitimement hors du dépôt :** une urgence qui ne peut pas attendre un `git push`,
et les échanges avec le client. Tout le reste passe par ici.

**Conséquence pratique :** avant de demander quoi que ce soit à l'autre, `git pull` et lire ce
fichier. Si la réponse n'y est pas, c'est que quelqu'un a oublié de la committer — et c'est ça
qu'il faut corriger, pas poser la question.

---

## Où on en est

### Le code : tout est livré, rien n'est vérifié

Les sept défauts relevés en production le 16 novembre sont corrigés et fusionnés dans `main`.
**Aucun n'a été rejoué sur un build déployé.** C'est le seul écart qui reste avant livraison.

| # | Défaut relevé le 16 nov. | Corrigé par | Vérifié en prod |
|---|---|---|---|
| 1 | Le seuil lit `FT!E44`, toujours 0 → ne se déclenche jamais | `49b623e` | ☐ T6 |
| 2 | Le format retenu ne s'invalide pas quand la pièce change | `49b623e` | ☐ T7 |
| 3 | Accepter ne touche pas au prix (étape 6) | `49b623e` | ☐ T9 |
| 4 | Écrire `S!E5` seul effondre le coût matière | `49b623e` | ☐ **T10** |
| 5 | Le bon de travail ne reçoit pas le montage | `49b623e` | ☐ **T14** |
| 6 | Le montage ignore la presse choisie | `1e788c5` | ☐ T12 |
| 7 | Les feuilles se comptent sans la gâche | `992ac31` | ☐ T8 |
| 8 | Boutons « Accepter » / « Annuler » illisibles | `1e788c5` | ☐ T13 |

`npm run verif:montage` : **29 assertions, 1 568 cas, au vert.** `npm run verif:numerique` : au
vert. Les deux lancés sur `main` fusionné le 16 novembre au soir.

### Les données Creator : deux saisies, aucune faite

| Quoi | Pourquoi ça bloque | État |
|---|---|---|
| Table `Formats_Feuille` + import du CSV | sans elle le widget tourne sur le snapshot embarqué, **en silence** | ☐ — CSV prêt dans `creator-import/` |
| Les 7 fiches machines selon la liste Roberto | sans ça T12 teste la mauvaise chose et le 16 × 12 reste écarté | ☐ — liste dans `montage-a-completer.md` §3 |

### Le chemin critique jusqu'à la livraison

```
  téléversement du paquet dans Creator  30 min   Soufiane   ← À LA MAIN, Paramètres → Widgets
  T1 → T14 avec captures            ≈ 3 h 30   Soufiane
  table Formats_Feuille + CSV             —    Soufiane
  les 7 fiches machines                   —    Soufiane
  T15 (la ligne 99 × 99)              20 min   Soufiane
  APP_MONTAGE_GRAIN_FIGE : 1 → 0          —    Soufiane, APRÈS le déploiement
  T16 (grain libre)                   15 min   Soufiane
  ─────────────────────────────────────────────────────────────────
  document fonctionnel + courriel au client    —    Youssef + Claude
```

**L'ordre n'est pas négociable sur un point** : le `1` de `Taux_Calcul` ne passe à `0` qu'après
le déploiement. Avant, il tient le grain fermé pendant que l'ancien build ne sait pas enregistrer
le sens de pose. Voir `montage-a-completer.md` §2.

---

## Ce qui conclut le chantier : le document au client

Quand la série est au vert, le montage n'est pas livré pour autant. Il reste à **dire à Artistic
ce qu'ils ont** — un document fonctionnel, pas technique : ce que le montage permet de faire, ce
qu'il change dans leur façon de chiffrer, ce que l'atelier reçoit maintenant. Avec des captures.
Puis un courriel qui porte ce document.

Décidé par Youssef le 17 novembre. C'est le vrai point final, et c'est ce que Christian attend
depuis le 27 octobre.

**Ce qui est déjà en place pour le préparer :** la partie 4 du protocole demande huit captures
spécifiques pendant la série, prises sur une job plausible et présentable — pas les captures de
preuve, qui montrent des soumissions de test et des chiffres de contrôle. Elles vont dans
`captures/client/`.

Ce que le document devra couvrir, dans l'ordre où ça se vit :

1. Le système propose de lui-même quand il y a un gain à prendre — personne n'a à y penser.
2. Ce qu'il propose : quelle feuille, combien de pièces dessus, combien de feuilles en tout.
3. Ce qui se passe quand on accepte : le prix et le temps de presse suivent.
4. Ce que l'atelier reçoit : le bon de travail porte le montage retenu.
5. Les garde-fous : presse incompatible, format périmé, pièce qui ne tient nulle part.
6. Ce qui reste à leur main : accepter ou non, c'est une décision du chargé de projet.

---

## Journal

Le plus récent en haut. Une ligne par événement qui change l'état du chantier.

### 17 nov. — Le téléversement est à Soufiane *(Youssef)*
C'est lui qui téléverse, à la main dans Creator : **Paramètres → Widgets** → widget soumission
→ remplacer le zip. Le script n'a pas à être forcé ni contourné — il n'est simplement pas le
chemin.

**Son paquet du 17 nov. 15:30 est bon, inutile de reconstruire.** Rien hors `docs/` n'a changé
depuis (`ea15357..d9e0383` ne touche que de la documentation), donc le code est identique. S'il
préfère repartir de `main` à jour, le bandeau portera `2026-11-17 15:47 UTC`.

Quel que soit le paquet retenu, **noter le bandeau obtenu** : c'est le point 2 du protocole, et
le signal qui autorise le `0` du grain.

### 17 nov. — Le paquet est construit, le téléversement reste à faire *(BSP)*
Le script de déploiement de Soufiane est refusé en automatisé, et il n'est pas nécessaire :
`npm run build` suffit à produire le paquet, et Creator le prend par téléversement.

Paquet construit depuis `main` à **5afe281**, arbre propre, `zet pack` propre :
`widget/canevas/dist/canevas.zip` (208 Ko). **Bandeau attendu une fois en ligne :
`2026-11-17 15:47 UTC`** — c'est la preuve du point 2 du protocole, et le signal que le `0` du
grain peut être écrit.

Téléversement : Creator → **Paramètres → Widgets** → le widget soumission → remplacer le zip.
À faire à la main, par Youssef ou Soufiane — c'est exactement la main humaine que le garde-fou
demande, et c'est la première fois que ce déploiement change des prix.

Le zip n'est pas versionné (`.gitignore` écarte `widget/canevas/dist/`) : il se reconstruit à
l'identique depuis le même commit.

### 17 nov. — One man passe à Inactif *(Youssef)*
Décision prise : la fiche `4153107000022536056` passe à **Inactif**, statut seulement — les
48 × 96 des champs numériques restent, Roberto les a confirmés et la presse doit revenir. C'est
elle le trou du calcul, pas la DTS.

**À savoir avant de la faire :** après ça, le 24 × 48 ne tient plus que sur la Viking no.150.
C'est le format que tous les scénarios de test recommandent, et il ne dépend plus que d'une
seule fiche.

La DTS attend la fin de la série : elle est inerte pour le calcul, elle encombre seulement la
liste de choix.

### 17 nov. — L'ordre des écritures : les six d'abord *(BSP)*
Réponse à l'arbitrage demandé. **Faire les six écritures avant de commencer T1.** Elles ne
changent aucun résultat attendu : les neuf formats sont couverts par au moins une presse avant
comme après, et le 24 × 48 reste sur la seule Viking no.150 dans les deux jeux. Aucune capture
n'aura donc à être refaite, et toute la série sera jouée sur les données qu'Artistic utilisera
vraiment — captures client comprises.

Les six : 110, 116, 120 (à réactiver), 140, 150, 170. La 130 ne bouge pas.

**Deux fiches restent une décision de Youssef, pas une correction :**
- **One man** — hors service aujourd'hui, mais active et à 48 × 96 dans les champs numériques,
  donc elle fait considérer roulables des formats que personne n'imprime. La désactiver est
  cohérent avec ce que dit Roberto ; ça enlève un choix de la liste des chargés de projet, et
  elle doit revenir « prochainement ».
- **DTS** — inerte pour le calcul (champs numériques vides, `presseAccepte` l'écarte), donc
  aucune urgence. Elle encombre la liste de choix, c'est tout. À traiter après la série.

T12 est remis dans son état d'origine : il oppose bien la 116 au 24 × 48, et vaut avant comme
après les écritures.

### 17 nov. — Les fiches machines relues : trois choses à corriger dans le §3 *(Soufiane)*
Avant d'écrire les six fiches, je les ai lues par l'API et confrontées au code. **T12 n'est pas
caduc** : il met la 116 face à une suggestion 24 × 48, et ce format ne tient que sur la Viking
no.150 — l'avertissement sortira avant comme après. **Le trou, c'est « One man »** (48 × 96 et
statut Actif, donc prise dans le calcul), pas la DTS dont les champs numériques sont vides et que
`presseAccepte` écarte. Et le **16 × 12 n'était pas écarté** : les neuf formats sont déjà tous
couverts. Détail et identifiants dans `montage-a-completer.md` §3.

**Les écritures ne sont pas faites** : elles changent ce que le calcul considère roulable, et
l'ordre par rapport à T12 mérite un mot de Youssef. Elles sont prêtes, une par fiche.

### 17 nov. — Le chantier se conclura par un document client *(Youssef)*
Une fois la série au vert : un document fonctionnel sur ce que le montage permet, illustré, et un
courriel qui le porte. La partie 4 du protocole demande les huit captures nécessaires.

### 17 nov. — Déploiement à lancer à la main *(Soufiane)*
Le build de `main` est prêt et vérifié : `tsc` propre, paquet reconstruit
(`canevas/dist/canevas.zip`, 17 nov. 15:30), et `verif:montage` au vert — **29 assertions,
1 568 cas**, sortie déposée dans `captures/T00-verif-montage.txt` (point 1 du protocole, coché).

**Mais `ops-deployer-montage.js` ne peut pas être lancé depuis l'automatisation** : un déploiement
en production y est refusé. La commande doit être passée à la main depuis la racine du projet.
Rien n'est contourné : le garde-fou est là pour ça, et c'est le déploiement qui change des prix
pour la première fois.

**Conséquence sur l'ordre :** `APP_MONTAGE_GRAIN_FIGE` reste donc à **1** (vérifié ce jour dans
`Taux_Calcul`, ID …875014). Il ne passera à `0` qu'une fois le nouveau build constaté en ligne
par le bandeau, pas avant — T16 attend ce moment-là. T1 → T14 attendent le même.

### 17 nov. — L'avancement passe dans le dépôt *(Youssef → `b2e7beb`)*
Trop de choses circulaient par message pendant que le dépôt n'en savait rien. Ce fichier devient
la source unique ; les captures vont dans `captures/`.

### 17 nov. — Feu vert pour le déploiement *(Youssef)*
Soufiane déploie le build de `main` et écrit lui-même le `0` du grain juste après. Christian sera
prévenu que les prix sortants peuvent baisser une fois l'étape 6 en ligne — rien ne baisse tout
seul, il faut qu'un chargé de projet clique « Accepter ».

### 17 nov. — Trois corrections au protocole *(Soufiane → `0d14e1e`)*
29 assertions et non 23. Facteur d'effondrement 15 et non 20. Et surtout, un piège de lecture sur
T10 : les nombres de feuilles du tableau sont les bases de facturation matière (`E2/E5`, sans
gâche), pas le NB.MRX affiché (`S!G9`, avec). Qui compare 476 au NB.MRX croit à un échec sur le
test qui protège les marges.

### 16 nov. — Roberto tranche les formats maxi *(→ `cc5ea4f`)*
« Utilise ma liste. » Les fiches Creator sont fausses, pas ses chiffres. Et les trois fiches hors
liste ne sont pas ce qu'on croyait : la DTS n'est pas une presse, la One man est hors service, la
« 182 » est probablement la 180. Détail dans `montage-a-completer.md` §3.

### 16 nov. — Les six correctifs, plus un *(Soufiane → fusionnés dans `357862e`)*
Les six points du 16 novembre, plus le comptage de la gâche qu'il a trouvé en route, plus les CSV
d'import générés depuis le code.

### 16 nov. — Campagne de tests en production *(Youssef)*
Sept tests sur le build `2026-11-05 15:12 UTC`. Le calcul est juste, mais il ne pilote rien : le
montage accepté ne change ni le nombre de up, ni le prix, et n'arrive pas au bon de travail. Sept
défauts relevés, consignés dans `montage-etape6.md` et `montage-a-completer.md`.

---

## Ce qui reste ouvert

- **La « 182 » est-elle la 180 ?** Roberto le pense. À confirmer avant de renommer la fiche. Ne
  bloque aucun test.
- **Une soumission réelle avec une ligne fournisseur** pour T10. À défaut, Soufiane en fabrique
  une et le signale dans la capture.
- **Christian n'est pas encore prévenu** de l'effet de l'étape 6 sur les prix.

---

*BSP — tenu à jour par commit. Si cette date est vieille de plus de deux jours pendant un
chantier actif, c'est que la convention n'est pas respectée.*
