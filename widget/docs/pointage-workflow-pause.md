# Le workflow de pause du pointage — spécification

> ⚠️ **Périmé le 25 novembre au soir : il n'y a rien à appliquer.** L'export de l'application a
> montré que `Pointage_Atelier_Success` fait déjà tout ce qui est décrit ici, y compris le cas
> « terminer sans reprendre ». Mesuré sur BT-1001 : 3 min 10 s d'écoulé, 1,13 de pause,
> **2,04 de durée réelle**.
>
> Ce document reste comme description de ce qui doit se passer, et comme plan d'essai. Les
> consignes d'écriture ci-dessous ne s'appliquent pas.

> **Pourquoi.** Le widget de pointage n'écrit qu'un `Statut`, par conception : les heures et les
> durées sont posées par Creator. Aujourd'hui, le passage en pause n'est pas traité — une opération
> mise en pause une heure comptera cette heure comme du travail, et le comparatif estimé / réalisé
> en héritera.
>
> L'écran a été corrigé pour ne plus *afficher* ce temps, mais la base, elle, continue de le
> compter. **La vraie correction est ici.**
>
> BSP — 25 novembre 2026.

---

## Avant de commencer : lire ce qui existe déjà

Un workflow nommé **« Pointage -Success »** existe sur le formulaire `Pointage_Atelier`. Il pose
déjà `Punch_in` et calcule `Duree_reelle_min`.

**Ouvre-le d'abord**, et note deux choses :

1. **Son déclencheur.** « Lors de la création », « lors de la création ou de la modification », et
   surtout **avant** ou **après** l'enregistrement. C'est ce qui décide de la forme du code :
   - *avant* l'enregistrement → on écrit `input.Champ = valeur;` et c'est tout ;
   - *après* l'enregistrement → il faut un `update` sur l'enregistrement, `input.` ne persiste pas.

2. **Comment il calcule une durée en minutes.** Il le fait déjà entre `Punch_in` et `Punch_out`.
   **Reprends exactement la même expression** pour la pause. C'est plus sûr que d'en inventer une :
   Deluge a plusieurs façons de soustraire deux dates et elles ne rendent pas toutes la même unité.

> Si tu n'es pas sûr de l'unité que rend ton expression, mets un `info` dedans et regarde le
> journal : `info (maintenant.toLong() - input.Punch_in.toLong());` doit donner des millisecondes,
> donc 60 000 pour une minute.

---

## Les quatre règles

Peu importe la syntaxe, voilà ce qu'il faut obtenir :

| Quand | Ce qu'on fait |
|---|---|
| L'enregistrement naît avec `Statut = En cours` | `Punch_in` = maintenant |
| `Statut` passe à **En pause** | `Pause_debut` = maintenant |
| `Statut` revient à **En cours** | `Pause_cumulee_min` += (maintenant − `Pause_debut`), puis `Pause_debut` = vide |
| `Statut` passe à **Termine** | fermer d'abord une pause restée ouverte, puis `Punch_out` = maintenant et `Duree_reelle_min` = (`Punch_out` − `Punch_in`) − `Pause_cumulee_min` |

**La troisième ligne est celle qui manque aujourd'hui, et la quatrième est incomplète.** Sans le
« fermer d'abord », une opération terminée alors qu'elle était en pause garde une pause ouverte qui
n'est jamais comptée.

---

## Le code, pour un workflow *avant* enregistrement

À placer sur `Pointage_Atelier`, déclencheur **« lors de la création ou de la modification »**,
exécution **avant** l'enregistrement.

```javascript
maintenant = zoho.currenttime;

// 1 — le travail commence
if(input.Punch_in == null && input.Statut == "En cours")
{
	input.Punch_in = maintenant;
}

// 2 — mise en pause : on retient quand elle commence
if(input.Statut == "En pause" && input.Pause_debut == null)
{
	input.Pause_debut = maintenant;
}

// 3 — reprise : on ferme la pause et on l'accumule
if(input.Statut == "En cours" && input.Pause_debut != null)
{
	minutes = (maintenant.toLong() - input.Pause_debut.toLong()) / 60000;
	input.Pause_cumulee_min = ifnull(input.Pause_cumulee_min,0) + minutes;
	input.Pause_debut = null;
}

// 4 — fin : fermer une pause restée ouverte, puis calculer
if(input.Statut == "Termine")
{
	if(input.Pause_debut != null)
	{
		minutes = (maintenant.toLong() - input.Pause_debut.toLong()) / 60000;
		input.Pause_cumulee_min = ifnull(input.Pause_cumulee_min,0) + minutes;
		input.Pause_debut = null;
	}
	if(input.Punch_out == null)
	{
		input.Punch_out = maintenant;
	}
	brut = (input.Punch_out.toLong() - input.Punch_in.toLong()) / 60000;
	input.Duree_reelle_min = brut - ifnull(input.Pause_cumulee_min,0);
}
```

**L'ordre des quatre blocs compte.** Le bloc 4 doit venir en dernier, et fermer la pause avant de
calculer : sinon la dernière pause n'entre jamais dans le total.

**`/ 60000` suppose que `toLong()` rend des millisecondes.** C'est le cas en Deluge, mais vérifie-le
une fois avec l'`info` plus haut, ou remplace l'expression par celle que ton workflow existant
utilise déjà.

---

## Si ton workflow est *après* enregistrement

Les affectations `input.` ne survivent pas. Il faut relire et mettre à jour l'enregistrement :

```javascript
maintenant = zoho.currenttime;
fiche = Pointage_Atelier[ID == input.ID];

if(input.Statut == "En pause" && fiche.Pause_debut == null)
{
	fiche.Pause_debut = maintenant;
}
```

…et ainsi de suite, en remplaçant `input.` par `fiche.` dans les quatre blocs. Attention : une mise
à jour depuis un workflow peut le redéclencher. Garde les conditions telles qu'elles sont écrites
(`== null`, `!= null`) : elles rendent chaque bloc **idempotent**, donc un second passage ne double
rien.

---

## Comment vérifier que c'est bon

Sur `Pointage_essai`, une opération, montre en main :

1. **Démarre-la.** Ouvre l'enregistrement dans Creator : `Punch_in` doit être rempli,
   `Pause_debut` vide.
2. **Mets-la en pause**, attends **une minute**, regarde l'enregistrement : `Pause_debut` doit
   porter l'heure de la pause.
3. **Reprends.** `Pause_debut` doit être vide, et `Pause_cumulee_min` valoir **environ 1**.
4. **Attends une minute, puis termine.** `Duree_reelle_min` doit valoir **environ 2**, pas 3.

> C'est le point 4 qui compte : si tu lis 3, la pause n'a pas été déduite et il reste quelque chose
> à corriger.

5. **Un dernier essai, le piège :** démarre, mets en pause, et **termine sans reprendre**. La pause
   doit quand même être comptée. C'est le cas que le bloc 4 traite, et celui qu'on oublie toujours.

---

## Ce que ça débloque

Une fois ce workflow en place, le temps réel enregistré est **du temps de travail**, pas du temps
écoulé. C'est ce chiffre qui alimentera :

- le **comparatif estimé / réalisé** sur le bon de travail ;
- l'écart affiché sur chaque job du tableau d'atelier ;
- et, à terme, la validation de vos temps de soumission avec vos propres chiffres.

Tant qu'il n'est pas là, tous ces écarts sont gonflés des pauses.
