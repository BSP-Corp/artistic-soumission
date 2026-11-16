# Plateforme de soumission – Spécifications pour l’intégration Zoho

**Version :** maquette du 9 novembre 2026
**Maquette de référence :** https://claude.ai/artifact/8V3DNpFYt3jD4K1vMbQZRa
**Gabarit de la soumission client (PDF) :** https://claude.ai/artifact/MkWpAivPrQke7aa11jMwA4

Ce document décrit l’écran de soumission interne à intégrer dans Zoho Creator : sa structure, ses champs, ses calculs et ses règles. Les montants et taux indiqués comme « par défaut » sont des paramètres de l’entreprise à rendre modifiables dans l’Administration.

---

## 1. Principes généraux

- **Une information se saisit une seule fois.** Ce qui est choisi dans une section remplit ou filtre les sections suivantes (ex. le type de produit filtre la liste des matériaux).
- **Ce qui se calcule ne se saisit pas.** Poses, longueurs, frais fixes, marge, conversion US et taxes sont des résultats affichés, jamais des champs à remplir.
- **On ne part jamais d’une page blanche** quand c’est évitable : bouton Dupliquer, gabarits de produits, et préremplissage à partir du dossier client.
- **Toutes les sections sont repliables** (clic sur la bande titre). Les sections 01 à 08 sont ouvertes par défaut, 09 et 10 fermées.

## 2. En-tête

| Élément | Comportement |
|---|---|
| Icône de l’entreprise | Image fixe, 76 × 76 px, à gauche du titre. |
| Titre | « Soumission » + numéro `S-AAAA-NNNN`, généré automatiquement à la création. Lecture seule. |
| Ligne d’info | « Créée le [date] · valide 30 jours · paiement selon le dossier client ». |

## 3. Barre d’actions

Ordre, de gauche à droite : **Nouvelle soumission · Dupliquer · Ouvrir · Imprimer · Envoyer**, puis à droite **Enregistrer** (secondaire) et **Envoyer vers le bon de travail** (principal, orange).

| Bouton | Action |
|---|---|
| Nouvelle soumission | Ouvre un formulaire vierge avec un nouveau numéro. |
| Dupliquer | Copie la soumission choisie dans une nouvelle, avec un nouveau numéro. L’originale reste intacte. |
| Ouvrir | Recherche et ouvre une soumission existante. |
| Imprimer | Produit la soumission client (gabarit PDF, 2 pages). |
| Envoyer | Envoie la soumission client par courriel au contact du client. |
| Enregistrer | Sauvegarde. Bloqué si une validation échoue (voir section 6). |
| Envoyer vers le bon de travail | Crée le bon de travail à partir des quantités retenues. Bloqué si une validation échoue. |

## 4. Sections du formulaire (colonne de gauche)

### 01 Client

| Champ | Type | Notes |
|---|---|---|
| Type de client | Choix : Client existant / Nouveau client | Idéalement automatique : un nom absent des clients Zoho fait passer en « Nouveau client ». |
| Date | Date | Date de la soumission. |
| N° client | Texte | Attribué à la création pour un nouveau client. |
| Client | Recherche (lookup) | Clients Zoho / CRM. |
| Contact | Texte / lookup | Contacts du client. |
| Représentant·e | Liste des utilisateurs | |
| **Coordonnées** (nouveau client seulement) | Bloc | Adresse*, Ville*, Province*, Code postal*, Pays*, Téléphone*, Poste, Courriel*, case « Adresse de livraison différente ». |

\* Obligatoires pour un nouveau client. Pour un client existant, les coordonnées viennent du dossier client et le bloc n’est pas affiché.

### 02 Pièces et fichier

**Tableau des pièces** (1 à 5 lignes ; bouton « + Ajouter une pièce », bouton X pour retirer une ligne) :

| Colonne | Type |
|---|---|
| # | Numéro de ligne automatique |
| N° de pièce | Texte |
| Modèle | Texte |
| Description | Texte (reprise dans la grille de la section 04) |
| Dimension L × H | 2 décimales, en pouces |
| Qté / ensemble | Entier, défaut 1 |

**Bloc Fichier et infographie :**

| Champ | Type |
|---|---|
| État du fichier | Choix : Prêt à imprimer / À modifier / À redessiner |
| Épreuve demandée | Choix : Oui / Non |
| Nombre d’heures | Décimal (montage, films, etc.) |
| Taux horaire | Paramètre, défaut **85,00 $/h** |
| Coût | Calculé : heures × taux. Ajouté aux frais fixes. |

### 03 Certifications

| Champ | Type |
|---|---|
| UL | Case à cocher |
| CSA | Case à cocher |
| FAIR (rapport d’inspection du premier article) | Case à cocher |
| Exigence ou N° de dossier | Texte |

Plusieurs certifications peuvent être cochées à la fois.

### 04 Quantités

- **Paliers à soumettre :** 5 cases numériques, défaut **100 / 250 / 500 / 1 000 / 2 500**, modifiables. Bouton « + Ajouter un palier ».
- **Paliers par pièce :** grille avec une ligne par pièce de la section 02 et une colonne par palier. Toutes les cases sont cochées par défaut ; on décoche un palier qui ne s’applique pas. Colonne **Qté unique** pour une pièce vendue à l’unité (ex. bannière × 3).
- **Gâche :** paramètre, défaut **10 %**.
- **Qté retenue + gâche :** calculée.

Si une pièce a une Qté / ensemble > 1, sa quantité réelle = palier × Qté / ensemble.

### 05 Production

**Méthode** (choix unique) : Sérigraphie / Numérique / Découpe numérique seulement.

**Sérigraphie :**

| Groupe | Champs |
|---|---|
| Base | Couleurs visibles, Presse (liste ; ex. « Presse générique (classeur) – 250 passes/h, 74,00 $/h ») |
| Réglages d’impression | Séparateur (avant / après), Passe additionnelle, Recto / verso, Couverture d’encre (%) |
| Ajouts de production | Ajustement additionnel, Nettoyage additionnel |

**Numérique :**

- **Usage :** Intérieur / Extérieur.
- **Type de produit**, dans cet ordre : Autocollants, Faces graphiques, Matières rigides / panneaux, Matières souples / affiches, Bannières, Bannières rétractables.
- Le type choisi affiche ses propres options (un seul encadré visible à la fois) :

| Type | Options |
|---|---|
| Autocollants | Forme : à la forme (contour) / carré-rectangle / mi-chair sur feuille |
| Faces graphiques | Éclairage (non éclairée / rétroéclairée), dimensions de la boîte, impression haute densité jour / nuit |
| Matières rigides / panneaux | Méthode (impression directe / vinyle monté), coins arrondis, perçage + nombre de trous |
| Matières souples / affiches | Montage : aucun / carton mousse / encadrement / barres haut et bas |
| Bannières | Ourlets, œillets + espacement, pochettes + largeur |
| Bannières rétractables | Format (33 × 80, 36 × 92, 47 × 80, autre), qualité de la base, inclus (kit complet / impression seulement) |

**Découpe numérique seulement :** aucune impression ; renvoie à la section 07.

### 06 Matériel et laminage

| Champ | Type | Notes |
|---|---|---|
| Matériau | Liste | **Filtrée selon le type de produit** de la section 05. |
| Fini d’origine du matériau | Liste | Lustré, Mat, Velvet… |
| Épaisseur | mil | |
| Format | Feuille / Rouleau | |
| Largeur du rouleau | po | Si rouleau. |
| Longueur par pièce | Calculée | Hauteur + espacement. |
| Adhésif | Liste | Permanent, Amovible, Repositionnable, Haute adhérence… |
| Épaisseur de l’adhésif | mil | |
| **Laminage** | Choix | Aucun (défaut), Glacé, Lustré, Mat, Plancher (antidérapant), Texturé |
| Type de film | Choix | Calendré / Cast (coulé) |
| Côté | Liste | Recto / Verso / Recto-verso |
| Épaisseur du laminé, Produit / fournisseur | Texte | |

### 07 Finition et découpe

| Champ | Type |
|---|---|
| Type de coupe | Zünd (numérique) / Platine / Guillotine |
| Outil | Aucun (coupe Zünd) / Existant / À fabriquer ; N° d’outil ; Coût de l’outil |
| Échenillage | Case + temps (h) |
| Papier de transfert | Case + type (papier / plastique transparent) + temps de pose (h) |

### 08 Livraison

| Champ | Type |
|---|---|
| Format de sortie | En feuilles / En rouleau / Individuel / À plat (boîte) |
| Délai de production | Jours ouvrables |
| Quantité par paquet | Entier |
| Mode d’expédition | Livraison par nos soins / Cueillette / Compte client / FedEx / Purolator / UPS / Autre |
| N° de compte transporteur | Si « Compte client » |
| Livrer à | Défaut : adresse du dossier client |
| Date requise, Notes d’emballage | Date, texte |

### 09 Sous-traitance et installation (optionnelle, repliée)

**Achats et sous-contrats** – tableau de lignes :
Type (Matériel / Sous-traitance / Transport / Outillage), Fournisseur, Description, N° de soumission fournisseur, Coût, Majoration %, Délai (jours), Inclure dans le prix (case), **bouton PO**, retirer.

Sous le tableau : « + Ajouter une ligne », **« Émettre les PO »**, et les totaux (coût fournisseurs, avec majoration, délai le plus long).

**Installation** – Installation requise / Aucune installation. Si requise : réalisée par (notre équipe / sous-traitant), lieu, adresse, date souhaitée, personne-ressource, surface, préparation de surface, nombre d’installateurs, heures, taux horaire, distance, frais de déplacement, équipement d’accès, formation sécurité, contraintes.

### 10 Notes (optionnelle, repliée)

- **Notes internes** : visibles seulement à l’interne.
- **Notes au client** : imprimées sur la soumission client.

## 5. Colonne de droite

### Prix par quantité
Une ligne par palier (reprend les valeurs de la section 04) : Qté, Prix, Vendu, US, Contrat. À terme : grille pièce × palier, identique au tableau de la soumission client.

### Calcul des poses
Entrées : dimension de la pièce (reprise de la section 02), largeur de la feuille ou du rouleau, espacement entre pièces, marge, orientation (auto = meilleure des deux).
Résultats : poses par feuille ou en largeur, longueur par pièce (rouleau), taux d’utilisation, et un aperçu de la disposition.

### Sommaire (replié, total visible sur la bande)
Coût de revient (dont frais fixes / coûts variables), facteur, **marge réelle**, fournisseurs, installation, temps de production, prix unitaire, total, total US. Volet « Détail du coût » repliable.

## 6. Calculs

| Calcul | Formule |
|---|---|
| Qté + gâche | palier × (1 + gâche) |
| Poses en largeur (feuille) | ⌊(largeur utile + espacement) ÷ (largeur pièce + espacement)⌋, idem en hauteur ; on garde la meilleure orientation |
| Nombre de feuilles | ⌈(qté + gâche) ÷ poses par feuille⌉ |
| Mètres linéaires (rouleau) | (qté + gâche) × (hauteur pièce + espacement) ÷ 39,37 |
| Utilisation | surface des pièces ÷ surface de matériel utilisée |
| Infographie | heures × 85,00 $ (taux paramétrable) |
| Prix de vente | coût × (1 + facteur) ; facteur par défaut **40 %** |
| Marge réelle | (prix − coût) ÷ prix ; ex. facteur 40 % → marge 28,6 % |
| Conversion US | montant CA ÷ taux USD/CAD du jour (date et taux affichés) |
| TPS / TVQ | 5 % / 9,975 % sur le sous-total (clients du Québec) |

Les frais fixes (écrans, calage, préparation de la découpe, infographie, outil) sont facturés une seule fois et répartis sur la quantité dans le prix unitaire.

## 7. Règles et validations

1. **Nouveau client :** les coordonnées marquées * sont obligatoires. Zoho Creator ne gère pas l’obligation conditionnelle ; utiliser une validation à l’enregistrement (alerte + annulation de l’enregistrement).
2. **Enregistrer / Envoyer vers le bon de travail** sont bloqués tant qu’une validation échoue.
3. **PO :** recommandé de griser les boutons PO tant que la soumission n’a pas été acceptée ou envoyée vers le bon de travail. Un PO par fournisseur ; les lignes d’un même fournisseur sont regroupées. Création dans Zoho Books ou Inventory, reliée au numéro de soumission.
4. **Validité :** 30 jours par défaut ; affichée dans l’en-tête et sur la soumission client.
5. **Préremplissage client existant :** mode d’expédition, compte transporteur, conditions de paiement et facteur habituel.

## 8. Soumission client (PDF)

Gabarit en 2 pages, format lettre.

- **Page 1 :** en-tête (logo, adresse, N°, date, validité, représentant), boîte client, boîte projet (réf. / BC, délai, livraison), tableau produits × paliers avec la quantité recommandée surlignée, lignes à quantité unique, ligne de frais de préparation, encadré « Comment choisir », sous-total, TPS, TVQ et total.
- **Page 2 :** conditions (BAT, couleurs, paiement, livraison et installation, modifications, validité et taxes) et bloc d’acceptation à signer.

Les **notes au client** de la section 10 s’impriment sur la page 1 ou 2.

## 9. Questions encore ouvertes

- Taux réels : presse, Zünd, échenillage, pose de transfert, matériaux, encres.
- Les pièces multiples s’impriment-elles séparément ou en montage mixte sur la même feuille ?
- Prix minimum de commande, et seuils d’approbation par un supérieur (marge, montant).
- Format exact du numéro de soumission et des numéros de révision.
- Import de fichiers externes (anciennes fiches Excel, demandes de prix en PDF) : à prévoir dans une phase ultérieure.
