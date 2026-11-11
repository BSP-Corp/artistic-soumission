# Contrat d'échange — Soumission (Zoho Creator → plateforme client)

**Version du schéma : `1.3`** · Généré le 2026-11-05 à partir du code du widget
(le document et le payload sont produits par la même source : ils ne peuvent pas diverger).

Ce document décrit **ce que Zoho enverra** à votre API à chaque soumission validée.
L'exemple ci-dessous n'est pas inventé : il est calculé par le moteur de prix réel sur le
job d'exemple de l'entreprise (50 pièces, 4 matériaux, découpe platine).

---

## 1. Vue d'ensemble

| | |
|---|---|
| Format | JSON, UTF-8, `Content-Type: application/json` |
| Sens | Zoho Creator **→** votre API (POST) |
| Déclencheur | passage d'une soumission au statut **Valide** (bouton « Valider » du widget) |
| Rejeu | si votre API répond autre chose que 2xx, Zoho réessaie (3 tentatives, puis journalisation) |
| Idempotence | `soumission.id` est stable : deux envois avec le même `id` = la même soumission (mise à jour) |
| Taille typique | 6 à 12 Ko |

### Conventions

- **Aucune référence au fichier Excel d'origine** n'est exposée : les noms sont des noms métier stables.
- Les **pourcentages sont en 0-100** (`perte_pct: 10` = 10 %), jamais en fraction.
- Les **cases à cocher sont des booléens** ; un nombre non saisi est `null` (pas `0`, pas `""`).
- Les **montants sont en CAD**, arrondis à 2 décimales — sauf `prix.prix_unitaire` (4 décimales).
- Les **temps** sont donnés sous la forme `{ heures, minutes, minutes_totales }`.
- Les **tableaux** (`materiaux`, `sous_contrat`, `quantites_alternatives`) n'incluent que les lignes renseignées ; `ventilation_couts` a toujours 7 lignes.
- Colonne **Origine** : *saisi* = entré par l'estimateur ; ***calculé*** = produit par le moteur de prix ; *méta* = ajouté par Zoho.
- Nouveaux champs = version mineure (`1.x`), compatible. Suppression / renommage = version majeure, annoncée à l'avance.

**99 champs saisis · 26 champs calculés.**

### Historique des versions

| Version | Date | Changements |
|---|---|---|
| `1.3` | 2026-11-05 | **Réponses aux questions 1, 2, 3 et 5.** *Ajouts (compatibles)* : `soumission.date_commande`, `soumission.date_expedition_prevue`, `soumission.date_requise_texte`, `soumission.moment`, `materiaux[].epaisseur_po`, `materiaux[].epaisseur_mil`, `production.nb_matrices_calcule`, `production.nb_matrices_corrige`, `production.nb_matrices_source`. *Deux changements à lire avant d'intégrer* : (1) `soumission.date_requise` **passe de texte libre à date ISO** et vaut `null` quand la saisie n'est pas une date — le texte d'origine part intact dans `date_requise_texte` ; (2) `production.nb_matrices` **change de sens** : il porte désormais la valeur **retenue** (la correction de l'atelier quand elle existe), le calcul seul restant dans `nb_matrices_calcule`. |
| `1.2` | 2026-09-28 | **Élargissement de type (compatible)** : `decoupe.finition.coins_ronds.quantite` accepte `null` — l'opération « coins ronds » a été retirée de l'outil, le champ reste au contrat et vaut toujours `null`. Aucun autre changement de structure. À noter : le **taux horaire passe de 73 à 74 $/h**, donc les montants d'une même fiche changent — c'est une donnée, pas une rupture de contrat. |
| `1.1` | 2026-09-16 | **Ajouts (compatibles)** : `prix.prix_vendu_unitaire`, `prix.prix_vendu_total`, `production.quantites_alternatives[].prix_vendu_unitaire` — le prix **décidé par le chargé de projet**, distinct du prix calculé. Précisions sans changement de type : `decoupe.zund.*.contour` et `decoupe.platine.kiss_cut.nb_die` valent désormais 0 ou 1 ; `impression.faces.*` vaut toujours 1. |
| `1.0` | 2026-09-10 | Version initiale. |

> **Pour votre intégration (v1.1)** : le prix à retenir pour le client est `prix.prix_vendu_unitaire`
> **s'il n'est pas `null`**, sinon `prix.prix_unitaire`.
>
> **Pour votre intégration (v1.3)** — trois points, dans l'ordre d'importance :
> 1. **Le nombre de feuilles sur lequel raisonner est `production.nb_matrices`.** Il vaut
>    maintenant la correction du chef d'atelier quand il y en a une. `nb_matrices_source` vous
>    dit laquelle a servi (`calcul` ou `correction`) sans avoir à comparer les champs.
>    C'était votre question 2 : lire le calcul là où l'atelier avait corrigé produisait une
>    fausse alerte sur chaque dossier corrigé.
> 2. **`soumission.date_requise` est maintenant une date ISO**, ou `null`. Un `null` ne veut pas
>    dire « pas de date demandée » : il veut dire « ce qui a été saisi n'est pas une date »
>    (`ASAP`, `fin du mois`). Dans ce cas, `date_requise_texte` porte la saisie telle quelle.
>    Pour comparer un délai, utilisez `date_requise` et `date_expedition_prevue`.
> 3. **`soumission.moment` vous dit où vous êtes dans le parcours** — voir la section 2 bis.

---

## 2. Exemple complet

```json
{
  "schema_version": "1.3",
  "soumission": {
    "id": "4153107000022542146",
    "no_soumission": "S-2026-0142",
    "initiales": "RB",
    "statut": "Valide",
    "source": "widget",
    "date_soumission": "2026-09-10",
    "date_requise": "2026-09-26",
    "date_requise_texte": "2026-09-26",
    "date_commande": "2026-09-11",
    "date_expedition_prevue": "2026-09-24",
    "moment": "validation",
    "reference_externe": null,
    "notes": "Client demande une épreuve PDF avant production."
  },
  "client": {
    "no_client": "C-0084",
    "nom": "BSP"
  },
  "piece": {
    "no_piece": "4152464",
    "modele": "Panneau de contrôle",
    "autre": "",
    "dimensions_po": {
      "largeur": 7,
      "hauteur": 1.4
    },
    "codes": {
      "M": "M-118",
      "R": "",
      "E": ""
    }
  },
  "production": {
    "quantite": 50,
    "perte_pct": 10,
    "nb_up": 4,
    "matrice_po": {
      "largeur": 8,
      "hauteur": 9.5
    },
    "nb_matrices": 16,
    "nb_matrices_calcule": 14,
    "nb_matrices_corrige": 16,
    "nb_matrices_source": "correction",
    "nb_matrices_exact": 13.75,
    "surface_matrice_po2": 76,
    "multiprint": false,
    "numerique_multiup": false,
    "surplus": true,
    "quantites_alternatives": [
      {
        "quantite": 100,
        "cout_unitaire": 5.8064,
        "prix_unitaire": 8.4056,
        "prix_vendu_unitaire": 11.75
      },
      {
        "quantite": 200,
        "cout_unitaire": 3.6141,
        "prix_unitaire": 5.0914,
        "prix_vendu_unitaire": null
      }
    ]
  },
  "impression": {
    "couleurs_visibles": 2,
    "faces": {
      "separateur": 1,
      "recto": 1,
      "verso": 1
    },
    "separateur": {
      "haut": 1,
      "bas": 1
    },
    "passes_additionnelles": {
      "a": null,
      "b": null
    },
    "ajustement_additionnel": 5,
    "nettoyage": {
      "a": null,
      "b": null
    },
    "recto_verso": {
      "a": null,
      "b": null
    },
    "encres_pct": 100,
    "sans_uv": false,
    "hppl": null,
    "texture_pct": 100,
    "ajustement_impression_pct": 0,
    "argent_clavier": null,
    "temps": {
      "heures": 2,
      "minutes": 38,
      "minutes_totales": 157.94
    }
  },
  "exclusions": {
    "sans_adhesif": false,
    "sans_materiau": false,
    "sans_coupe": false,
    "sans_encre": false
  },
  "materiaux": [
    {
      "ligne": "lexan",
      "nom": "Lexan Clair ,005x24x48",
      "cout_pi2": 0.36,
      "epaisseur_po": 0.005,
      "epaisseur_mil": 5,
      "perte_pct": null,
      "montant": 3.57,
      "temps_debitage_min": 2.06
    },
    {
      "ligne": "vinyle",
      "nom": "Vinyle Blanc Opaque V-23 ,002x30x38",
      "cout_pi2": 0.89,
      "epaisseur_po": 0.002,
      "epaisseur_mil": 2,
      "perte_pct": null,
      "montant": 8.7,
      "temps_debitage_min": 2.06
    },
    {
      "ligne": "alu_foil",
      "nom": "Foil 7942 Argent Brillant ,0037x20x27",
      "cout_pi2": 1.62,
      "epaisseur_po": 0.0037,
      "epaisseur_mil": 3.7,
      "perte_pct": null,
      "montant": 15.89,
      "temps_debitage_min": 2.06
    },
    {
      "ligne": "adhesif",
      "nom": "Adhésif 467 ,002x24x6480",
      "cout_pi2": 0.68,
      "epaisseur_po": 0.002,
      "epaisseur_mil": 2,
      "perte_pct": null,
      "montant": 6.69,
      "temps_debitage_min": 0
    }
  ],
  "materiaux_options": {
    "difference_decoupe_pct": 0,
    "perte_materiau_pct": 0,
    "perte_adhesif_pct": 0,
    "fini": null,
    "montant_premask": 0
  },
  "decoupe": {
    "adhesif_lamine": {
      "quantite": 0,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "position_adhesif_lamine": {
      "quantite": 0,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "overlaminating": {
      "quantite": null,
      "quantite_b": null,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "premask": {
      "quantite": null,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "protecteur": {
      "quantite": null,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "protecteur_fenetre": {
      "quantite": null,
      "quantite_b": null,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "slit": {
      "quantite": null,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "guillotine": {
      "quantite": null,
      "taux": 0.05,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "assemblage": {
      "quantite": null,
      "taux": 0.5,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "autres": {
      "quantite": null,
      "taux": 0.25,
      "temps": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "platine": {
      "adhesif": {
        "nb_die": null,
        "up": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "coupe": {
        "nb_die": 1,
        "up": 4,
        "temps": {
          "heures": 0,
          "minutes": 35,
          "minutes_totales": 34.66
        }
      },
      "kiss_cut": {
        "nb_die": null,
        "up": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "embossage": {
        "nb_die": null,
        "up": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "ajustement_pct": 0,
      "temps_total": {
        "heures": 0,
        "minutes": 35,
        "minutes_totales": 34.66
      }
    },
    "zund": {
      "adhesif": {
        "contour": null,
        "cut_out": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "coupe": {
        "contour": null,
        "cut_out": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "kiss_cut": {
        "contour": null,
        "cut_out": null,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "ajustement_pct": 0,
      "temps_total": {
        "heures": 0,
        "minutes": 0,
        "minutes_totales": 0
      }
    },
    "finition": {
      "decorticage": {
        "quantite": null,
        "taux": 0.2,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "coins_ronds": {
        "quantite": null,
        "taux": 0.015,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "laser": {
        "quantite": null,
        "ajustement": 0,
        "temps": {
          "heures": 0,
          "minutes": 0,
          "minutes_totales": 0
        }
      },
      "autres": [
        {
          "libelle": "Autres",
          "quantite": null,
          "taux_a": 0,
          "taux_b": 0,
          "temps": {
            "heures": 0,
            "minutes": 0,
            "minutes_totales": 0
          }
        },
        {
          "libelle": "Autres",
          "quantite": null,
          "taux_a": 0,
          "taux_b": 0,
          "temps": {
            "heures": 0,
            "minutes": 0,
            "minutes_totales": 0
          }
        }
      ],
      "verification": {
        "quantite": 1,
        "taux": 0.02,
        "temps": {
          "heures": 0,
          "minutes": 1,
          "minutes_totales": 0.89
        }
      },
      "emballage": {
        "quantite": 1,
        "taux": 0.01,
        "temps": {
          "heures": 0,
          "minutes": 4,
          "minutes_totales": 4.05
        }
      }
    }
  },
  "machines": {
    "presse": "Cameo 18",
    "zund": null,
    "platine": null,
    "laminoir": null,
    "slitter": null,
    "guillotine": null,
    "matrice_job": null
  },
  "sous_contrat": [
    {
      "fournisseur": "Gravure Laser Québec",
      "cout": 85,
      "marge_pct": 35,
      "montant": 114.75
    }
  ],
  "frais": {
    "transport": 20,
    "autres": null
  },
  "prix": {
    "devise": "CAD",
    "facteur_marge_pct": 25,
    "cout_revient": 509.93,
    "prix_vendant": 752.16,
    "prix_unitaire": 15.0433,
    "prix_vendu_unitaire": 15.5,
    "prix_vendu_total": 775,
    "taux_us": null,
    "prix_unitaire_us": null,
    "temps_total": {
      "heures": 5,
      "minutes": 28,
      "minutes_totales": 328.14
    }
  },
  "ventilation_couts": [
    {
      "code": "materiaux",
      "libelle": "Matières premières",
      "montant": 34.86,
      "temps": null
    },
    {
      "code": "soies_encres",
      "libelle": "Soies / encres / développement",
      "montant": 374,
      "temps": {
        "heures": 4,
        "minutes": 30,
        "minutes_totales": 270
      }
    },
    {
      "code": "setup_decoupe",
      "libelle": "Set-up découpe",
      "montant": 40.2,
      "temps": {
        "heures": 0,
        "minutes": 25,
        "minutes_totales": 25
      }
    },
    {
      "code": "serigraphie",
      "libelle": "Sérigraphie",
      "montant": 24.6,
      "temps": {
        "heures": 0,
        "minutes": 20,
        "minutes_totales": 19.94
      }
    },
    {
      "code": "decoupe_numerique",
      "libelle": "Découpe / numérique",
      "montant": 10.18,
      "temps": {
        "heures": 0,
        "minutes": 8,
        "minutes_totales": 8.25
      }
    },
    {
      "code": "divers",
      "libelle": "Divers",
      "montant": 26.1,
      "temps": {
        "heures": 0,
        "minutes": 5,
        "minutes_totales": 4.95
      }
    },
    {
      "code": "sous_contrat",
      "libelle": "Sous-contrat",
      "montant": 114.75,
      "temps": null
    }
  ]
}
```

---

## 2 bis. Quand l'envoi part — les deux moments

C'est la réponse à votre question 5, et c'est le point à lire en premier.

Vous partiez du passage au statut **Valide**. Or dans Zoho, « Valide » est posé par le bouton
**« Valider → Bon de travail »** : il marque le moment où la job **part en production**, donc
**après** que la proposition a été envoyée au client et acceptée. Une alerte à ce moment-là
arrive après la décision qu'elle devait éclairer.

Nous avons donc ouvert **un second moment**, en amont. Les deux envoient le même contrat, au
même endpoint ; `soumission.moment` dit lequel :

| `soumission.moment` | Quand | Appels | Ce que vous pouvez encore faire |
|---|---|---|---|
| `avant_envoi` | Le chargé de projet vient de produire la proposition. **Le client ne l'a pas encore reçue.** Déclenché par le bouton « Analyser avant envoi » du widget. | `POST /analyses` seulement | **Tout.** Un oubli signalé ici se corrige avant que le client voie quoi que ce soit. |
| `validation` | La soumission passe en production (« Valider → Bon de travail »), après acceptation du client. | `PUT /history` puis `POST /analyses` | Alimenter l'historique et la comparaison ; la correction coûte déjà quelque chose. |

**Pourquoi `avant_envoi` n'alimente pas `/history`** : l'historique est votre base de
comparaison entre soumissions réelles. Y verser des propositions qui ne seront peut-être
jamais acceptées fausserait les comparaisons à venir. L'historique reste alimenté par la
validation seule.

**Vos 8 à 20 secondes sont prises en compte.** Aucun des deux moments n'appelle votre API
depuis le workflow d'enregistrement : l'utilisateur serait bloqué devant un bouton figé, et
Deluge coupe de toute façon les exécutions longues. Le widget pose un drapeau
(`Webhook_Statut`), et une fonction séparée fait l'appel.

Dans l'exemple ci-dessus, `moment` vaut `validation`.

---

## 3. Référence des champs

### `schema_version`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `schema_version` | chaîne | méta | Version du contrat JSON (semver). Toute rupture de compatibilité incrémente le majeur. |

### `soumission`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `soumission.id` | chaîne | méta | Identifiant unique Zoho Creator de la soumission (19 chiffres, à traiter comme une chaîne). |
| `soumission.no_soumission` | chaîne | saisi | Numéro de soumission saisi par l'estimateur (code « S »). |
| `soumission.initiales` | chaîne | saisi | Initiales de l'estimateur (ex. « RB »). |
| `soumission.statut` | chaîne | méta | Brouillon | Valide | En_production | Termine. |
| `soumission.source` | chaîne | méta | widget (saisie manuelle) | api (créée par la plateforme) | import. |
| `soumission.date_soumission` | date ISO YYYY-MM-DD | méta | Date d'enregistrement, format ISO YYYY-MM-DD. |
| `soumission.date_requise` | date ISO YYYY-MM-DD ou null | saisi | v1.3 — Date requise par le client, en ISO YYYY-MM-DD. null quand la saisie n'est pas une date lisible (« ASAP », « fin du mois ») : le texte d'origine est alors dans date_requise_texte. RETYPÉ en v1.3 — était du texte libre jusqu'en v1.2. |
| `soumission.date_requise_texte` | chaîne ou null | saisi | v1.3 — La date requise telle que saisie, sans interprétation. Conserve le comportement v1.2 pour les intégrations qui le préfèrent. |
| `soumission.date_commande` | date ISO YYYY-MM-DD ou null | saisi | v1.3 — Date de la commande ferme du client (réception du PO), ISO YYYY-MM-DD. null tant qu'elle n'est pas saisie. |
| `soumission.date_expedition_prevue` | date ISO YYYY-MM-DD ou null | saisi | v1.3 — Date d'expédition prévue, ISO YYYY-MM-DD. null tant qu'elle n'est pas saisie. C'est la date à comparer à date_requise pour juger d'un délai. |
| `soumission.moment` | chaîne | méta | v1.3 — Moment du parcours qui a produit cet envoi : avant_envoi (proposition produite, client pas encore servi — c'est là qu'une alerte peut encore servir) | validation (passage en production, après acceptation du client). |
| `soumission.reference_externe` | chaîne ou null | méta | Référence de la plateforme du client (idempotence). null si créée dans Zoho. |
| `soumission.notes` | chaîne | méta | Notes libres (champ long). |

### `client`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `client.no_client` | chaîne | saisi | Numéro de client. |
| `client.nom` | chaîne | saisi | Nom du client. |

### `piece`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `piece.no_piece` | chaîne | saisi | Numéro de pièce (peut être alphanumérique). |
| `piece.modele` | chaîne | saisi | Modèle. |
| `piece.autre` | chaîne | saisi | Information complémentaire libre. |
| `piece.dimensions_po.largeur` | nombre ou null | saisi | Largeur de la pièce finie, en pouces (centièmes admis). |
| `piece.dimensions_po.hauteur` | nombre ou null | saisi | Hauteur de la pièce finie, en pouces. |
| `piece.codes.M` | chaîne | saisi | Code M (fiche d'atelier). |
| `piece.codes.R` | chaîne | saisi | Code R. |
| `piece.codes.E` | chaîne | saisi | Code E. |

### `production`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `production.quantite` | entier ou null | saisi | Quantité de pièces demandée — base du calcul. |
| `production.perte_pct` | pourcentage 0-100 (nombre) | saisi | Pourcentage de perte (rebuts) appliqué aux matrices. Défaut 10. |
| `production.nb_up` | entier ou null | saisi | Nombre de pièces par feuille (« Up »). |
| `production.matrice_po.largeur` | nombre ou null | saisi | Largeur de la matrice (feuille imprimée), en pouces. |
| `production.matrice_po.hauteur` | nombre ou null | saisi | Hauteur de la matrice, en pouces. |
| `production.nb_matrices` | entier | **calculé** | Nombre de feuilles RETENU — c'est la valeur sur laquelle raisonner. v1.3 : vaut nb_matrices_corrige quand le chef d'atelier a corrigé à la main, sinon nb_matrices_calcule. CHANGEMENT DE SENS en v1.3 : jusqu'en v1.2 ce champ portait toujours le calcul. |
| `production.nb_matrices_calcule` | entier | **calculé** | v1.3 — Le calcul seul = quantité × (1 + perte) ÷ up, arrondi au plein supérieur. C'est ce que portait nb_matrices jusqu'en v1.2. |
| `production.nb_matrices_corrige` | entier ou null | saisi | v1.3 — Correction manuelle du chef d'atelier. null quand personne n'a corrigé : ne jamais lire 0 comme une correction. |
| `production.nb_matrices_source` | chaîne | **calculé** | v1.3 — D'où vient nb_matrices : calcul | correction. Évite d'avoir à comparer les deux champs pour le savoir. |
| `production.nb_matrices_exact` | nombre | **calculé** | Le calcul avant arrondi. Non affecté par une correction manuelle. |
| `production.surface_matrice_po2` | nombre | **calculé** | Surface d'une matrice en pouces carrés = largeur × hauteur. |
| `production.multiprint` | booléen | saisi | Mode presse MultiPrint (1 à 6 couleurs en ligne). |
| `production.numerique_multiup` | booléen | saisi | Impression numérique multi-up. |
| `production.surplus` | booléen | saisi | Surplus de 10 % autorisé sur la quantité produite (fiche d'atelier). |
| `production.quantites_alternatives[]` | entier | saisi | Autres quantités pour lesquelles un prix est demandé (table QTÉ), quantité principale exclue. Tableau vide si aucune. |
| `production.quantites_alternatives[].quantite` | entier | saisi | Quantité simulée. |
| `production.quantites_alternatives[].cout_unitaire` | montant CAD ou null | **calculé** | Coût de revient unitaire pour cette quantité (null si simulation indisponible). |
| `production.quantites_alternatives[].prix_unitaire` | montant CAD ou null | **calculé** | Prix vendant unitaire calculé pour cette quantité. |
| `production.quantites_alternatives[].prix_vendu_unitaire` | montant CAD ou null | saisi | v1.1 — Prix vendu unitaire décidé par le chargé de projet pour cette quantité. null si non saisi : utilisez prix_unitaire. |

### `impression`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `impression.couleurs_visibles` | entier ou null | saisi | Nombre de couleurs visibles. |
| `impression.faces.separateur` | entier ou null | saisi | Nombre de passes F/S séparateur. Depuis v1.1 le champ n'est plus saisi : toujours 1. |
| `impression.faces.recto` | entier ou null | saisi | Nombre de passes F/S recto. Depuis v1.1 : toujours 1. |
| `impression.faces.verso` | entier ou null | saisi | Nombre de passes F/S verso. Depuis v1.1 : toujours 1. |
| `impression.separateur.haut` | entier ou null | saisi | Séparateur haut (nb). |
| `impression.separateur.bas` | entier ou null | saisi | Séparateur bas (nb). |
| `impression.passes_additionnelles.a` | entier ou null | saisi | Passes additionnelles (colonne A). |
| `impression.passes_additionnelles.b` | entier ou null | saisi | Passes additionnelles (colonne B). |
| `impression.ajustement_additionnel` | nombre ou null | saisi | Ajustement additionnel (nb). |
| `impression.nettoyage.a` | entier ou null | saisi | Nettoyages additionnels (A). |
| `impression.nettoyage.b` | entier ou null | saisi | Nettoyages additionnels (B). |
| `impression.recto_verso.a` | entier ou null | saisi | Recto-verso (A). |
| `impression.recto_verso.b` | entier ou null | saisi | Recto-verso (B). |
| `impression.encres_pct` | pourcentage 0-100 (nombre) | saisi | Couverture d'encre (100 = pleine couverture). |
| `impression.sans_uv` | booléen | saisi | Sans vernis UV. |
| `impression.hppl` | nombre ou null | saisi | HPPL (nb). |
| `impression.texture_pct` | pourcentage 0-100 (nombre) | saisi | Texture (100 = oui). |
| `impression.ajustement_impression_pct` | pourcentage 0-100 (nombre) | saisi | Ajustement manuel du temps d'impression. |
| `impression.argent_clavier` | nombre ou null | saisi | Argent clavier (nb). |
| `impression.temps` | nombre | **calculé** | Temps d'impression {heures, minutes, minutes_totales}. |

### `exclusions`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `exclusions.sans_adhesif` | booléen | saisi | Le job ne comporte pas d'adhésif. |
| `exclusions.sans_materiau` | booléen | saisi | Matériau fourni par le client. |
| `exclusions.sans_coupe` | booléen | saisi | Aucune découpe. |
| `exclusions.sans_encre` | booléen | saisi | Aucune impression. |

### `materiaux`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `materiaux[]` | chaîne | saisi | Lignes matériaux utilisées (les lignes vides sont omises). Ordre = ordre du formulaire. |
| `materiaux[].ligne` | chaîne | méta | lexan | vinyle | polyester | alu_foil | divers | adhesif | overlaminating | xtra1..xtra4. |
| `materiaux[].nom` | chaîne | saisi | Nom exact du matériau dans le catalogue (clé de jointure avec l'inventaire). |
| `materiaux[].cout_pi2` | montant CAD ou null | **calculé** | Coût au pied carré retenu (catalogue, ou saisi pour les lignes Xtra). |
| `materiaux[].epaisseur_po` | nombre ou null | méta | v1.3 — Épaisseur du matériau en POUCES, lue dans l'inventaire Creator (fiche produit, Dim_Epaisseur_po). null si la fiche ne la porte pas — jamais 0. |
| `materiaux[].epaisseur_mil` | nombre ou null | méta | v1.3 — La même épaisseur en mil (= pouces × 1000), l'unité des règles de découpe. 0,020 po = 20 mil. null si l'épaisseur est inconnue. |
| `materiaux[].perte_pct` | pourcentage 0-100 (nombre) | saisi | Perte spécifique à la ligne (lignes Xtra uniquement, sinon null). |
| `materiaux[].montant` | montant CAD (nombre, 2 déc.) | **calculé** | Montant matière de la ligne = surface × coût pi² × (1 + perte) × multiplicateur. |
| `materiaux[].temps_debitage_min` | nombre ou null | **calculé** | Temps de débitage (guillotine) de la ligne, en minutes. |

### `materiaux_options`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `materiaux_options.difference_decoupe_pct` | pourcentage 0-100 (nombre) | saisi | Différence de découpe (%). |
| `materiaux_options.perte_materiau_pct` | pourcentage 0-100 (nombre) | saisi | Perte matière globale additionnelle (%). |
| `materiaux_options.perte_adhesif_pct` | pourcentage 0-100 (nombre) | saisi | Perte adhésif globale (%). |
| `materiaux_options.fini` | chaîne ou null | saisi | brillant | mat | null. |
| `materiaux_options.montant_premask` | montant CAD (nombre, 2 déc.) | **calculé** | Montant prémask. |

### `decoupe`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `decoupe.adhesif_lamine` | nombre | saisi | {quantite, temps}. Adhésif laminé. |
| `decoupe.position_adhesif_lamine` | nombre | saisi | {quantite, temps}. Positionnement adhésif & laminé (registre). |
| `decoupe.overlaminating` | nombre | saisi | {quantite, quantite_b, temps}. Over-laminating. |
| `decoupe.premask` | nombre | saisi | {quantite, temps}. Prémask standard. |
| `decoupe.protecteur` | nombre | saisi | {quantite, temps}. Protecteur. |
| `decoupe.protecteur_fenetre` | nombre | saisi | {quantite, quantite_b, temps}. Protecteur fenêtre. |
| `decoupe.slit` | nombre | saisi | {quantite, temps}. Slit (nb). |
| `decoupe.guillotine` | nombre | saisi | {quantite, taux, temps}. Guillotine. |
| `decoupe.assemblage` | nombre | saisi | {quantite, taux, temps}. Assemblage. |
| `decoupe.autres` | nombre | saisi | {quantite, taux, temps}. Autres opérations de découpe. |
| `decoupe.platine.adhesif` | nombre | saisi | {nb_die, up, temps}. Platine adhésif. |
| `decoupe.platine.coupe` | nombre | saisi | {nb_die, up, temps}. Platine coupe. |
| `decoupe.platine.kiss_cut` | nombre | saisi | {nb_die, up, temps}. Platine kiss-cut. nb_die vaut 0 ou 1 (interrupteur depuis v1.1). |
| `decoupe.platine.embossage` | nombre | saisi | {nb_die, up, temps}. Platine embossage. |
| `decoupe.platine.ajustement_pct` | pourcentage 0-100 (nombre) | saisi | Ajustement manuel du temps platine. |
| `decoupe.platine.temps_total` | nombre | **calculé** | {heures, minutes, minutes_totales}. |
| `decoupe.zund.adhesif` | nombre | saisi | {contour, cut_out, temps}. Zund adhésif. contour vaut 0 ou 1 (interrupteur depuis v1.1) ; cut_out = nombre de découpes intérieures par feuille. |
| `decoupe.zund.coupe` | nombre | saisi | {contour, cut_out, temps}. Zund coupe. Mêmes règles que adhesif. |
| `decoupe.zund.kiss_cut` | nombre | saisi | {contour, cut_out, temps}. Zund kiss-cut. Mêmes règles que adhesif. |
| `decoupe.zund.ajustement_pct` | pourcentage 0-100 (nombre) | saisi | Ajustement manuel du temps Zund. |
| `decoupe.zund.temps_total` | nombre | **calculé** | {heures, minutes, minutes_totales}. |
| `decoupe.finition.decorticage` | nombre | saisi | {quantite, taux, temps}. Décorticage. |
| `decoupe.finition.coins_ronds` | nombre ou null | saisi | {quantite, taux, temps}. Coins ronds — OBSOLÈTE depuis la v1.2 : l'opération a été retirée de l'outil, `quantite` est toujours null. Champ conservé pour compatibilité, retiré à la prochaine version majeure. |
| `decoupe.finition.laser` | nombre | saisi | {quantite, ajustement, temps}. Laser. |
| `decoupe.finition.autres[]` | nombre | saisi | {libelle, quantite, taux_a, taux_b, temps}. Deux lignes « Autres » libres. |
| `decoupe.finition.verification` | nombre | saisi | {quantite, taux, temps}. Vérification / comptage. |
| `decoupe.finition.emballage` | nombre | saisi | {quantite, taux, temps}. Emballage. |

### `machines`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `machines.presse` | chaîne ou null | saisi | Presse choisie (nom de la fiche machine). null = gabarit par défaut. |
| `machines.zund` | chaîne ou null | saisi | Table de découpe Zund choisie. |
| `machines.platine` | chaîne ou null | saisi | Platine choisie. |
| `machines.laminoir` | chaîne ou null | saisi | Laminoir choisi. |
| `machines.slitter` | chaîne ou null | saisi | Slitter choisi. |
| `machines.guillotine` | chaîne ou null | saisi | Guillotine choisie. |
| `machines.matrice_job` | nombre ou null | saisi | Coût de la matrice (die) propre au job, en $. |

### `sous_contrat`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `sous_contrat[]` | chaîne | saisi | Lignes de sous-traitance renseignées (max 4, lignes vides omises). |
| `sous_contrat[].fournisseur` | chaîne | saisi | Nom du fournisseur. |
| `sous_contrat[].cout` | montant CAD ou null | saisi | Coût fournisseur. |
| `sous_contrat[].marge_pct` | pourcentage 0-100 (nombre) | saisi | Marge appliquée (défaut 35). |
| `sous_contrat[].montant` | montant CAD (nombre, 2 déc.) | **calculé** | Montant facturé = coût × (1 + marge). |

### `frais`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `frais.transport` | montant CAD ou null | saisi | Transport ($). |
| `frais.autres` | montant CAD ou null | saisi | Autres frais ($). |

### `prix`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `prix.devise` | chaîne | méta | Toujours « CAD ». |
| `prix.facteur_marge_pct` | pourcentage 0-100 (nombre) | saisi | Facteur de marge appliqué au coût de revient (défaut 25). |
| `prix.cout_revient` | montant CAD (nombre, 2 déc.) | **calculé** | Coût de revient = somme des 6 catégories internes (matériaux, soies/encres, set-up découpe, sérigraphie, découpe/numérique, divers). Le sous-contrat n'en fait PAS partie. |
| `prix.prix_vendant` | montant CAD (nombre, 2 déc.) | **calculé** | Prix vendant = coût de revient × (1 + facteur de marge) + sous-contrat (le sous-contrat porte sa propre marge, voir sous_contrat[].marge_pct). |
| `prix.prix_unitaire` | montant CAD (nombre, 2 déc.) | **calculé** | Prix vendant ÷ quantité (4 décimales). C'est la suggestion du moteur ; le prix engagé est prix_vendu_unitaire quand il est renseigné. |
| `prix.prix_vendu_unitaire` | montant CAD ou null | saisi | v1.1 — Prix vendu unitaire décidé par le chargé de projet (peut être =, > ou < prix_unitaire ; jamais recalculé). null si non saisi : utilisez prix_unitaire. |
| `prix.prix_vendu_total` | montant CAD ou null | **calculé** | v1.1 — prix_vendu_unitaire × quantité (2 décimales). null si prix_vendu_unitaire est null. |
| `prix.taux_us` | nombre ou null | saisi | Taux de change USD saisi (null si non renseigné). |
| `prix.prix_unitaire_us` | montant CAD ou null | **calculé** | Prix unitaire en USD (null si pas de taux). |
| `prix.temps_total` | nombre | **calculé** | Temps total de main-d'œuvre {heures, minutes, minutes_totales}. |

### `ventilation_couts`

| Champ | Type | Origine | Description |
|---|---|---|---|
| `ventilation_couts[]` | montant CAD (nombre, 2 déc.) | **calculé** | Les 6 catégories qui composent le coût de revient + le sous-contrat (ajouté après la marge). Toujours 7 lignes, dans cet ordre. |
| `ventilation_couts[].code` | chaîne | **calculé** | materiaux | soies_encres | setup_decoupe | serigraphie | decoupe_numerique | divers | sous_contrat. |
| `ventilation_couts[].libelle` | chaîne | **calculé** | Libellé lisible. |
| `ventilation_couts[].montant` | montant CAD (nombre, 2 déc.) | **calculé** | Montant de la catégorie. |
| `ventilation_couts[].temps` | nombre ou null | **calculé** | {heures, minutes, minutes_totales} — null pour matériaux et sous-contrat. |

---

## 4. Sécurité

### 4.1 Zoho → votre API (envoi des soumissions)

Zoho appelle votre endpoint avec un **jeton secret partagé** en en-tête :

```http
POST /api/soumissions HTTP/1.1
Host: api.votre-plateforme.com
Authorization: Bearer <JETON_SECRET_PARTAGE>
Content-Type: application/json
X-Zoho-Signature: sha256=<HMAC-SHA256 du corps, clé = jeton>
X-Zoho-Event: soumission.validee
X-Zoho-Delivery: <uuid unique par envoi>
```

- Le jeton est généré par nous, transmis hors bande (jamais par courriel en clair), stocké chiffré côté Zoho.
- `X-Zoho-Signature` vous permet de vérifier que le corps n'a pas été altéré, indépendamment du transport.
  Vérification : `hex(HMAC_SHA256(jeton, corps_brut)) == signature`. Comparez en temps constant.
- `X-Zoho-Delivery` est unique par tentative : dédoublonnez sur `soumission.id` (métier), pas sur cet en-tête.
- Votre réponse attendue : **`200`/`202`** avec un corps JSON libre (il sera stocké dans Zoho et affiché dans le widget, ex. un verdict d'analyse). `4xx` = erreur définitive, pas de rejeu. `5xx`/timeout = rejeu.
- Rotation du jeton : nous supportons deux jetons actifs simultanément pour une rotation sans coupure.
- Transport : HTTPS obligatoire, TLS 1.2+.

### 4.2 Votre plateforme → Zoho (lecture inventaire, fournisseurs, clients…)

Deux options, selon ce que vous préférez côté implémentation :

| | Option A — Jeton partagé (simple) | Option B — OAuth 2.0 Zoho (standard) |
|---|---|---|
| Mécanisme | Endpoints **Custom API** Creator, protégés par une clé que nous vous remettons | Client OAuth Zoho (client credentials), scope `ZohoCreator.customapi.EXECUTE` |
| Appel | `GET https://creator.zoho.com/api/v2.1/<compte>/<app>/custom/<endpoint>?publickey=<CLE>` | `Authorization: Zoho-oauthtoken <access_token>` (jeton 1 h, refresh token) |
| Pour qui | démarrage rapide, scripts, tests | production, révocation fine, audit Zoho |
| Rotation | on régénère la clé | standard OAuth |

Recommandation : **A pour démarrer les tests dès maintenant, B avant la mise en production.**
Les deux exposent exactement les mêmes endpoints, en **lecture seule**.

Endpoints prévus (à confirmer avec votre liste d'entités) :

```
GET /custom/inventaire                 → liste des matériaux (nom, catégorie, format, coût pi², stock, fournisseur, actif)
GET /custom/inventaire?nom=<nom>       → un matériau par nom exact (clé = materiaux[].nom du contrat)
GET /custom/inventaire?categorie=Vinyle
GET /custom/fournisseurs               → (à confirmer)
GET /custom/clients                    → (à confirmer)
```

Pagination : `?page=1&par_page=200`, réponse `{ "donnees": [...], "page": 1, "total": 356 }`.

---

## 5. Ce qui n'est pas encore figé

| Point | État |
|---|---|
| `soumission.date_requise` | **Réglé en v1.3** — date ISO, avec le texte d'origine conservé dans `date_requise_texte`. Côté Zoho, le champ du formulaire reste à retyper en Date : tant que ce n'est pas fait, un estimateur peut encore saisir « ASAP », et le contrat renverra alors `null`. |
| Heures par **département** et charge planifiée | N'existent pas dans Zoho (votre question 11). Le temps par **opération** est dans `ventilation_couts[].temps`. Les heures par département se construiraient à partir des opérations — c'est un développement ; la charge planifiée supposerait un ordonnancement, qui n'existe pas. |
| Composition et fiche technique des matériaux | N'existent nulle part dans Zoho (votre question 4a). L'épaisseur, elle, est livrée depuis la v1.3. |
| `soumission.notes` + fichiers joints | champ Notes long prévu ; **fichiers : nombre et taille max à confirmer** (25 fichiers / 50-100 Mo évoqués, vs limites de votre moteur d'analyse) — nous proposons d'envoyer des **URL signées** plutôt que les fichiers eux-mêmes dans le JSON |
| Réponse de votre API | libre pour l'instant ; si vous renvoyez un verdict structuré (ex. `{ "alertes": [...] }`), dites-nous le format et on l'affichera tel quel dans le widget |
| Règles métier | à répartir Zoho / IA d'après votre liste — les règles déterministes (seuils, champs obligatoires, combinaisons interdites) restent côté Zoho |
| Entités en lecture | inventaire confirmé ; fournisseurs / clients / autres à confirmer par vous |

---

*Contact technique : voir le fil courriel. Toute question sur un champ précis : citez son chemin (ex. `decoupe.platine.coupe.up`).*
