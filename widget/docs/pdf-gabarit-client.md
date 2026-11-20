# Le PDF de soumission — quel gabarit fait foi

> **Le gabarit de référence est celui de Josemaria Teixeira, du 30 octobre 2026**, transmis par
> Philippe Béland à Christian, puis à BSP le 2 novembre. Fichier : `Soumission_exemple (1).pdf`
> (dossier local de Youssef, hors dépôt).

---

## Ce qui a été implémenté, et pourquoi ça ne correspond plus

Le PDF actuel (`src/components/PopupProposition.tsx`) suit les retours du **27 octobre** : une
page, calquée sur la vraie soumission Fizz **S-26635**, avec **une seule ligne `QTÉ | PRIX`** —
la quantité retenue.

**Le gabarit du 2 novembre dit l'inverse** : une grille de **cinq paliers de quantité** par
produit, que le client coche. Il est postérieur de six jours et vient du VP, relayé par
Christian. C'est donc lui qui fait foi. Le PDF d'aujourd'hui n'est pas « presque bon » : c'est un
autre document.

**Rien n'a été répondu à Christian depuis.** Le 2 novembre, Youssef a écrit « c'est faisable, je
te reviens le plus rapidement possible » ; Christian a répondu « formidable, merci beaucoup ». La
suite n'est jamais arrivée.

---

## Ce que le gabarit demande

**Deux pages.**

### Page 1 — l'offre

En-tête : titre **SOUMISSION**, numéro au format **`S-2026-[0000]`**, date, **« Valide jusqu'au »
(30 jours)**, et **Représentant·e**.

Coordonnées Artistic, à gauche — et elles corrigent le code :

> **2565, boul. Le Corbusier, Laval (Québec) H7S 2E8 · 514 382-0351 · artisticdecal.com**

Le widget porte aujourd'hui « 9475 Jean-Pratt, Montréal (Québec) H4N 2W7 ».

Bloc client : raison sociale, personne-ressource et titre, téléphone, courriel, adresse. Face à
lui, un bloc projet : nom du projet, **réf. client / BC**, **délai de production**, **livraison**.

**La grille de prix**, qui est le cœur du document. Une ligne par produit, avec sa description
technique en retrait, et **cinq colonnes de quantité : 100, 250, 500, 1 000, 2 500**. Chaque case
porte **deux valeurs** : le prix unitaire (`0,00 $ / unité`) et le montant de la ligne.

Deux cas particuliers à prévoir :
- une ligne peut avoir **une quantité unique** au lieu des cinq paliers (la bannière de
  l'exemple : « Qté 3 × 75,00 $ / unité → 225,00 $ ») ;
- une ligne **« Frais de préparation »**, facturée une seule fois quelle que soit la quantité
  (BAT, écrans de sérigraphie, outil de coupe, fichiers).

**Le palier recommandé est marqué**, et c'est lui qui alimente le total.

Encadré **« COMMENT CHOISIR »** : explique au client que le prix unitaire baisse avec la
quantité parce que le montage et le réglage se répartissent, et que le total sera ajusté selon
les cases cochées.

Totaux : total selon les quantités recommandées, sous-total, **TPS 5 % et TVQ 9,975 % avec les
numéros d'enregistrement**, total.

Pied de page : renvoi à la page 2, et **« Page 1 de 2 »**.

### Page 2 — conditions et acceptation

Cinq blocs de conditions : **épreuve (BAT)**, **modalités de paiement**, **modifications après
approbation**, **couleurs**, **livraison et installation**, **validité et taxes**.

Puis un bloc **ACCEPTATION DU CLIENT** : case à cocher, nom en lettres moulées, titre, signature,
date, et numéro de bon de commande.

---

## La demande de Christian, en plus du gabarit

Le 2 novembre, avec le fichier :

> *« Pour les termes de paiement, il serait en fonction de ce qui est programmé pour le client.
> […] Certains seront COD, d'autres 30-45-60-90 jours. »*

Autrement dit : **les modalités de paiement ne sont pas un texte figé.** Le gabarit montre
« dépôt de 50 % à l'approbation du BAT, solde net 30 jours » — c'est un exemple. La vraie valeur
vient de la fiche client (CRM ou Books), et le PDF doit la reprendre.

---

## Ce que ça implique

Ce gabarit est **la cible du PDF décrite dans la spec de la refonte (§8)**. Il ne se greffe pas
sur le PDF d'aujourd'hui : la grille produits × paliers suppose que la soumission porte
**plusieurs produits** et **plusieurs paliers de quantité**, ce que la section 04 de la spec
prévoit et que l'écran actuel ne fait pas.

Deux chemins possibles, à trancher :

1. **Avec la refonte** — cohérent, puisque la grille a besoin de la structure produits × paliers.
   Mais ça reporte le PDF de plusieurs semaines, alors que Christian attend depuis le 2 novembre.
2. **Tout de suite, en version réduite** — reprendre la mise en page deux pages, l'en-tête, la
   bonne adresse, les conditions, le bloc d'acceptation et les modalités de paiement depuis la
   fiche client, avec la grille limitée aux paliers que la soumission actuelle sait produire.
   Le client voit le bon document ; la grille complète arrive avec la refonte.

**Quoi qu'il arrive, l'adresse de Laval est à corriger au prochain build** — elle est fausse sur
chaque PDF envoyé depuis le début.

---

*BSP — 20 novembre 2026. Gabarit source dans le dossier local de Youssef :
`Gabarit_soumission_client_Jose_2026-10-30.pdf`.*
