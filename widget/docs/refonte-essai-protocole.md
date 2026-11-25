# Essayer la refonte — feuille de route pour Youssef

> Page `Soumission_essai` dans Creator, administrateurs seulement. L'écran de production n'est pas
> touché : rien de ce que tu fais ici ne peut l'abîmer.
>
> **Nomme « [Essai] … » tout ce que tu enregistres**, pour qu'on puisse faire le ménage après.
>
> Coche au fur et à mesure et note ce qui cloche. BSP — 24 novembre 2026.

---

## Avant de commencer : lire le bandeau

En haut de l'écran, la ligne grise sous « Soumission ». Elle doit dire :

```
prix : Creator (211 matériaux, 124 taux) · machines : Creator (41) · build 2026-11-24 15:45 UTC
```

- **Si une de ces deux sources dit « copie embarquée »** au lieu de « Creator », arrête-toi :
  l'écran tourne sur des données figées et tous les prix sont à jeter. Recharge la page ; si ça
  persiste, c'est pour Soufiane.
- **Si le build est antérieur au 24 novembre 15:45**, recharge avec `Ctrl+F5`.

Le bandeau dit aussi `questions numériques : copie embarquée` — **c'est normal pour l'instant**, la
table de configuration du numérique n'est pas encore créée.

---

## Les quatre essais qui comptent

Si tu n'as le temps que pour quatre choses, ce sont celles-là.

### ☐ 1. Une vraie job, de bout en bout

Prends une soumission réelle que tu connais, avec ses vrais chiffres sous les yeux.

1. Section 01, choisis « Client existant » et remplis le client, le contact, la date.
2. Section 02, une pièce : le modèle, la description, la largeur, la hauteur, la quantité.
3. Continue jusqu'au bas : la matière, les couleurs, la découpe, la finition.

**Ce que tu dois voir :** le total en bas qui bouge **pendant que tu tapes**, sans avoir à scroller
ni à cliquer sur quoi que ce soit. Et les mentions « à vérifier (5) » qui disparaissent au fur et à
mesure que les champs obligatoires se remplissent.

> Le compte entre parenthèses, c'est le nombre de contrôles encore en attente. Clique dessus pour
> voir lesquels.

### ☑ 2. Le même travail dans l'écran actuel — **passé le 25 novembre**

> **534,32 $ de coût, 667,90 $ de total, 13,36 $ l'unité, 5 h 47 — identiques des deux côtés.**
> Huit réglages ont dû être alignés à la main avant d'y arriver : quantité, facteur, gâche, ligne
> de platine, séparateurs, ajustement additionnel, couverture d'encre, transport. Aucun écart ne
> venait du calcul. Détail dans `ETAT.md`.

**C'est l'essai le plus important de tous.** Ouvre l'écran de production dans un autre onglet et
saisis exactement la même job.

**Les deux prix doivent être identiques au cent près.** Coût, unitaire, total.

S'il y a un écart, note **le montant exact des deux côtés** et quelle ligne diffère. Un écart ici
veut dire que la refonte ne calcule pas comme votre système actuel, et c'est le seul défaut qui
justifierait de tout arrêter.

> Soufiane l'a fait sur cinq soumissions et elles tombaient juste. L'intérêt, c'est que tu en
> choisisses une qu'il n'a pas prise.

### ☐ 3. Enregistrer, fermer, rouvrir

Enregistre ta soumission. Fais « Nouvelle soumission ». Puis « Ouvrir » et reprends-la.

**Le prix ne doit pas avoir bougé d'un cent.**

C'est exactement le défaut qu'on vient de corriger dans l'écran de production : une soumission qui
changeait de prix selon ce qui était affiché avant. Vérifie-le ici aussi, et fais-le **deux fois** —
une fois en ouvrant directement, une fois après avoir cliqué sur « Nouvelle soumission ».

### ☐ 4. Le document client

Clique sur « Imprimer ».

**Ce que tu dois voir :** deux pages, tes coordonnées de Laval en en-tête, le numéro de soumission,
la grille des quantités avec la colonne recommandée en évidence, les totaux avec TPS et TVQ, puis la
page de conditions et de signature.

Compare-le à l'exemplaire du 20 novembre : c'est le même gabarit, il doit sortir pareil.

---

## Le reste, si tu as le temps

### ☐ 5. Le total suit la frappe

Change la quantité principale et regarde la barre du bas. Elle doit bouger immédiatement, et rester
visible où que tu sois dans la page. C'est la chose que le client a redemandée en toutes lettres le
9 novembre.

### ☐ 6. Les paliers de quantité

La colonne de droite, « Prix par quantité » : 100, 250, 500, 1 000, 2 500. Change-en un, ajoutes-en
un. Le prix unitaire doit descendre quand la quantité monte.

### ☐ 7. Le calcul des poses

Avec une pièce qui s'y prête, le bloc « Calcul des poses » doit proposer un montage : la feuille,
le nombre de pièces dessus, le nombre de feuilles. Et le dessin doit montrer chaque pose.

Accepte la proposition : **le prix et le temps doivent suivre**.

### ☐ 8. Plusieurs pièces

« + Ajouter une pièce », jusqu'à cinq. La grille devient pièce × palier.

⚠️ **Hypothèse périmée depuis le 25 novembre.** L'écran chiffre les pièces comme s'imprimant
séparément. **Roberto a confirmé le contraire** : le montage mixte est autorisé pour les pièces
pleines, et interdit seulement quand une pièce porte une fenêtre. Ce bloc est à refaire — ne juge
donc pas ses prix, vérifie seulement que la saisie tient.

> ⚠️ **Limite connue :** une soumission à plusieurs pièces ouverte dans l'écran **actuel** n'y montre
> que la pièce 1. C'est pour ça qu'elles se nomment « [Essai] … ». Ne t'en sers pas pour comparer
> les prix entre les deux écrans.

### ☐ 9. Le formulaire intelligent

Choisis un produit numérique : une **bannière**. Les questions doivent s'adapter — les œillets
doivent apparaître. Choisis ensuite une **face graphique** : les œillets ne doivent **pas**
apparaître.

Puis change de produit en cours de route. **Les champs de l'ancien produit doivent se vider**, pas
rester en place avec leurs valeurs.

> **Les prix du numérique sont des hypothèses**, marquées provisoires, et ils ne s'impriment pas
> sur le document client. Tant qu'Artistic ne nous a pas donné ses taux et ses vitesses, ne juge
> pas les montants — juge la saisie.

### ☐ 10. Les garde-fous

Essaie d'enregistrer une soumission avec un **nouveau client incomplet** : ça doit bloquer.
Essaie une pièce trop grande pour toute feuille : ça doit le dire.

### ☐ 11. La sous-traitance

Section 09. Quand elle est remplie, **la majoration de 35 % remplace le facteur habituel**. Vérifie
que le prix réagit comme tu l'attends, et qu'un brouillon de bon de commande se prépare.

> Rien n'est écrit dans Books à ce stade : ce sont des brouillons internes.

### ☐ 12. Le bon de travail

« Envoyer vers le bon de travail ».

> ⚠️ Soufiane l'a testé sur banc local, **pas encore créé dans Creator**. Si ça échoue, ce n'est pas
> une surprise — note le message et passe à autre chose.

---

## Ce qu'on sait déjà qui manque

Inutile de le relever, c'est connu :

- la table `Config_Champs_Produit_Numerique` n'existe pas encore ;
- la recherche de client dans le CRM n'est pas branchée ;
- le montage mixte de plusieurs pièces sur une feuille n'est pas fait ;
- l'infographie s'affiche mais n'entre pas dans le prix ;
- les sections ne se replient pas encore — c'est demandé, pas fait ;
- **la section 07 n'offre qu'une seule paire « Platine, matrices / poses », et c'est la *coupe*.**
  L'adhésif, le kiss-cut et l'embossage à la platine n'ont nulle part où aller. Si ta job de
  référence en fait un, les deux écrans ne tomberont pas pareil — et ce n'est pas le calcul qui est
  en cause. Pour l'essai 2, **choisis une job dont la découpe platine est une coupe**, ou pas de
  platine du tout.

---

## Comment rapporter

Une ligne par anomalie, dans le journal (`ETAT.md`) ou directement à Soufiane :

> **Ce que j'ai fait** · **ce que j'attendais** · **ce que j'ai vu** · le numéro de la soumission
> d'essai.

Le numéro compte plus que tout le reste : il permet de rouvrir exactement ton cas.

---

*BSP — 24 novembre 2026. Première version de la refonte, build `2026-11-24 15:45 UTC`.*
