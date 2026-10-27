# Paramétrage des matériaux & taux depuis Creator — analyse et plan

Analyse exhaustive de `InventaireA 2.xlsm` (feuille INV) et `materiaux.csv`,
et mapping vers les formulaires Creator existants (`Materiaux`, `Product`).

## 1. Contenu des fichiers (toutes colonnes)

### materiaux.csv (228 lignes)
| Colonne | Sens |
|---|---|
| Nom | nom complet avec dims (ex. « Lexan Clair ,005x24x48 ») |
| Categorie | POLYCARBONATE, ABS-STYRENE… |
| Epaisseur | po | Largeur_po / Longueur_po | po |
| Prix_pi2 | coût au pied carré (souvent 0 dans l'extraction) |
| Unite | FEUILLE… | Qte_en_stock | | Actif | 0/1 |

### InventaireA 2.xlsm — feuille INV (154 matériaux, 104 lignes de taux)
**Bloc 1 — B→BA : « Sem. 52 → 1 »** : consommation/stock par semaine (52 colonnes).
Historique transactionnel — à NE PAS répliquer en 52 champs (voir §5).

**Bloc 2 — BB→BM : achat / fournisseur**
| Col | Sens | Col | Sens |
|---|---|---|---|
| BB | Fournisseur | BH | Frais courtage |
| BC | Date dernière variation prix | BI | Valeur $Cda vs US$ (taux 0,75) |
| BD | Prix payé | BJ | Montant total |
| BE | Escompte % | BK | Nbr MSI (Flexcon) |
| BF | Transport | BM | Nbr feuille ou rouleau |
| BG | From USA (1/0) | | |

**Bloc 3 — BN→CA : catalogue matériau** (ce que lit la soumission)
| Col | Sens | Col | Sens |
|---|---|---|---|
| BN | Nbr par feuille/rouleau | BV | **Coûtant pied² ← prix lu par le calcul** |
| BO | Description | BW | # Inventaire Artistic |
| BP | Format M / SC (Mezza.) | BX | # Inventaire Idenco |
| BQ | Épaisseur (po) | BY | Quantité en stock |
| BR | Largeur (po) | BZ | Valeur $ |
| BS | Longueur (po) | CA | Stock inventaire |
| BT | Prix unit. feuille/rouleau | | |
| BU | Autres frais pi² | | |

Catégories = lignes `***` : POLYCARBONATE (Lexan), ABS-STYRENE-COROPLAST,
POLYESTER, VINYLE, ADHÉSIF-SPACER, PRÉMASK-PROTECTEUR, FOIL.

**Bloc 4 — CE→CI : carte de taux (104 lignes)** : CE=section, CG=libellé,
CF=constante $ (73 $/h, ×1,35…), CH=cadence mrcx/h, CI=temps min / cadence
grand volume. Détail complet dans `parametres-machines.md`.

## 2. Form Materiaux — champs existants réutilisés + à créer

Existants (réutilisés) : `Nom` (texte) ← BO/Nom · `mat_prix_pi2` (texte) ← BV/Prix_pi2 ·
`mat_qte_stock` (texte) ← BY/Qte_en_stock · `Actif` (nombre).

À créer :
| Champ (lien) | Type Creator | Source |
|---|---|---|
| Categorie | Liste (7 choix) | sections *** / CSV |
| Format_MSC | Liste (M, SC) | BP |
| Epaisseur_po | Décimal | BQ |
| Largeur_po / Longueur_po | Décimal | BR / BS |
| Nbr_feuille_rouleau | Nombre | BN |
| Prix_feuille | Devise | BT |
| Autres_frais_pi2 | Décimal | BU |
| Inv_Artistic / Inv_Idenco | Texte | BW / BX |
| Valeur_stock | Devise | BZ |
| Stock_inventaire | Nombre | CA |
| Unite | Texte | CSV |
| Produit (optionnel) | Lookup → Product | lien achat |

## 3. Form Product — correspondances (bloc achat BB→BM)

| Excel | Champ Product existant |
|---|---|
| BB Fournisseur | Vendors / VENDOR_NAME / Vendor ✓ |
| BC Date dernier prix | Last_Purchase ✓ |
| BD Prix payé | Purchase_Price / Prix_d_achat / Last_Cost ✓ |
| BT Prix feuille | Average_cost ✓ |
| BG From USA | Country_of_Origin ✓ |
| BI $Cda vs US | Devise ✓ (+ champ Taux_change à créer) |
| BY stock | Stock_initial ✓ |
| BE Escompte % | à créer : Escompte_pct (décimal) |
| BF Transport | à créer : Frais_transport (devise) |
| BH Frais courtage | à créer : Frais_courtage (devise) |
| BK Nbr MSI | à créer : Nbr_MSI (décimal) |
| BM Nbr feuille/rouleau | à créer : Nbr_feuille_rouleau_achat (nombre) |

## 4. Carte de taux → nouveau form `Taux_Calcul`

Champs : Code (texte, ex. INV_8), Section (texte), Libelle (texte),
Valeur (décimal = CF), Cadence_mrcx_h (décimal = CH), Temps_ou_cadence2
(décimal = CI), Actif. → 104 enregistrements (fichier prêt).

## 5. Les colonnes « Sem. 52→1 »

52 champs par semaine = anti-pattern Creator. Deux options :
- ignorer (l'app a déjà Stock / Inventory / Stock_Adjustment pour le suivi) ;
- ou form `Conso_Hebdo` (Materiau lookup, Annee, Semaine, Qte) : 1 enregistrement
  par semaine — même donnée, requêtable.

## 6. Fichiers d'import prêts (dossier `Canevas/creator-import/`)

- `materiaux_complet.csv` — 357 lignes (154 d'InventaireA fusionnées avec les
  203 restantes du CSV), TOUTES les colonnes des deux fichiers.
- `taux_calcul.csv` — 104 lignes de la carte de taux.

**Création recommandée — par import CSV** (Creator crée les champs à l'import) :
1. Form Materiaux → ⋯ → Importer des données → `materiaux_complet.csv`
   → à l'étape de mappage : associer Nom→Nom, Prix_pi2→mat_prix_pi2,
   Qte_stock→mat_qte_stock, Actif→Actif, et « Créer un nouveau champ »
   pour toutes les autres colonnes (Creator propose le bon type).
2. Accueil de l'app → + → Importer → `taux_calcul.csv` → crée le form
   `Taux_Calcul` d'un coup avec ses champs.

## 7. Côté widget (phase suivante)

Au chargement : `getRecords(Materiaux)` + `getRecords(Taux_Calcul)` →
`moteur.setInput("INV!BVxxx", prix)` / `("INV!CFxxx", valeur)` par
correspondance de nom (le mapping nom ↔ cellule INV est déjà dans les
formules extraites). Fallback : snapshot embarqué si Zoho indisponible.
Le Code `INV_8` du form Taux correspond directement à la ligne 8 des
cellules CF/CH/CI — mapping trivial.
