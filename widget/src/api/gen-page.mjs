// Génère docs/api/contrat-soumission.html — document autonome, SANS AUCUN JavaScript.
//
// Pourquoi zéro script : ce fichier part chez un client. Il doit s'ouvrir partout,
// s'imprimer en PDF proprement, et ne rien avoir qui puisse casser. Tout ce qui
// demandait du script est donc soit pré-calculé ici, soit obtenu en CSS pur :
//
//   coloration du JSON     → balisée à la génération
//   filtre par section     → radios + sélecteurs frères (`:checked ~`)
//   replier / déplier      → <details>/<summary>
//   téléchargements        → <a download href="data:…">, sans script
//
// Lancement : npm run gen:page

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const lire = (f) => readFileSync(resolve(process.cwd(), "docs/api/" + f), "utf8");

// Logo BSP embarqué en base64 : le document reste un fichier unique, lisible hors ligne.
const logo64 = readFileSync(resolve(process.cwd(), "src/api/marque/bsp-logo.png")).toString("base64");
const LOGO = "data:image/png;base64," + logo64;
const champs = JSON.parse(lire("champs.json"));
const exemple = JSON.parse(lire("exemple-soumission.json"));
const schemaBrut = lire("soumission.schema.json").trim();
const exempleJoli = JSON.stringify(exemple, null, 2);

const nbIn = champs.champs.filter((c) => c.origine === "in").length;
const nbOut = champs.champs.filter((c) => c.origine === "out").length;
const DATE = "28 septembre 2026";

// ── échappement ─────────────────────────────────────────────────────────────
const ech = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── coloration du JSON, faite ici plutôt que dans le navigateur ─────────────
function colorerJSON(src) {
  return ech(src).replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let c = "j-num";
      if (m.startsWith("&quot;") || m.startsWith('"')) c = /:\s*$/.test(m) ? "j-cle" : "j-txt";
      else if (/^(true|false|null)$/.test(m)) c = "j-lit";
      return `<span class="${c}">${m}</span>`;
    },
  );
}

// ── URI de données pour les téléchargements (aucun script requis) ───────────
const dataURI = (txt) => "data:application/json;charset=utf-8," + encodeURIComponent(txt);

// ── libellés ────────────────────────────────────────────────────────────────
const TYPES = {
  string: "chaîne", "string|null": "chaîne · null", integer: "entier",
  "integer|null": "entier · null", number: "nombre", "number|null": "nombre · null",
  boolean: "booléen", percent: "% (0-100)", money: "montant CAD",
  "money|null": "montant · null", date: "date ISO",
};
const ORIGINE = { in: "Saisi", out: "Calculé", meta: "Méta" };
const SECTIONS = [...new Set(champs.champs.map((c) => c.section))];
const slug = (s) => s.replace(/[^a-z0-9]/gi, "-").toLowerCase();

// ── filtre de section, en CSS pur ───────────────────────────────────────────
// Une radio par section, placée avant le tableau ; `#s-x:checked ~ … tr:not(.x)`
// masque tout le reste. Aucun script, et l'état survit au défilement.
const radios =
  `<input class="r" type="radio" name="sec" id="s-tout" checked>\n` +
  SECTIONS.map((s) => `<input class="r" type="radio" name="sec" id="s-${slug(s)}">`).join("\n");

const etiquettes =
  `<label for="s-tout">Toutes <span class="n">${champs.champs.length}</span></label>\n` +
  SECTIONS.map((s) => {
    const n = champs.champs.filter((c) => c.section === s).length;
    return `<label for="s-${slug(s)}">${ech(s)} <span class="n">${n}</span></label>`;
  }).join("\n");

const cssFiltre = SECTIONS.map(
  (s) => `#s-${slug(s)}:checked ~ .tablewrap tbody tr:not(.sec-${slug(s)}){display:none}
#s-${slug(s)}:checked ~ .filtres label[for="s-${slug(s)}"]{background:var(--accent);border-color:var(--accent);color:#fff}`,
).join("\n");

const lignes = champs.champs
  .map(
    (c) => `<tr class="sec-${slug(c.section)}">
<td class="chemin">${ech(c.chemin)}</td>
<td class="type">${ech(TYPES[c.type] || c.type)}</td>
<td><span class="bulle ${c.origine}">${ORIGINE[c.origine]}</span></td>
<td class="desc">${ech(c.description)}</td></tr>`,
  )
  .join("\n");

// ── le document ─────────────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Contrat d'échange Soumission Matériaux Souples — Groupe Canva">
<title>Contrat Soumission Groupe Canva</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Palette BSP — les trois bleus proviennent du logo, relevés au pixel :
   #0171D7 (39 %) · #01A0FE (29 %) · #5BD1FF (28 %).
   Les neutres sont volontairement tirés vers le bleu pour rester cohérents. */
:root{
  --papier:#F3F6FA; --feuille:#FFFFFF; --feuille-2:#F8FAFD;
  --encre:#111926; --encre-2:#54627A; --encre-3:#8593A8;
  --filet:#DDE4EE; --filet-fort:#C0CBDB;
  --accent:#0171D7; --accent-doux:#E4F0FC; --accent-fort:#0159A8;
  --accent-vif:#01A0FE; --accent-clair:#5BD1FF;
  --ambre:#B4690E; --ambre-doux:#FBF0DD; --vert:#12805A;
  --r:3px; --pas:clamp(1.4rem,3vw,2.6rem);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --papier:#0C1017; --feuille:#141A24; --feuille-2:#1A2130;
    --encre:#E6ECF4; --encre-2:#98A6BC; --encre-3:#6E7E96;
    --filet:#242E3D; --filet-fort:#354255;
    --accent:#5BD1FF; --accent-doux:#0D2437; --accent-fort:#9AE2FF;
    --accent-vif:#01A0FE; --accent-clair:#5BD1FF;
    --ambre:#E0A44A; --ambre-doux:#2E2413; --vert:#4FC79B;
  }
}
:root[data-theme="dark"]{
  --papier:#0C1017; --feuille:#141A24; --feuille-2:#1A2130;
  --encre:#E6ECF4; --encre-2:#98A6BC; --encre-3:#6E7E96;
  --filet:#242E3D; --filet-fort:#354255;
  --accent:#5BD1FF; --accent-doux:#0D2437; --accent-fort:#9AE2FF;
  --accent-vif:#01A0FE; --accent-clair:#5BD1FF;
  --ambre:#E0A44A; --ambre-doux:#2E2413; --vert:#4FC79B;
}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--encre);
  font:400 15px/1.6 "IBM Plex Sans",-apple-system,Segoe UI,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:Archivo,"IBM Plex Sans",sans-serif;text-wrap:balance;margin:0}
code,kbd,pre,.mono{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace}
a{color:var(--accent);text-underline-offset:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}

/* bandeau de marque : les trois bleus du logo, dans l'ordre du logo */
.bandeau{height:3px;background:linear-gradient(90deg,
  var(--accent) 0%, var(--accent) 34%,
  var(--accent-vif) 34%, var(--accent-vif) 67%,
  var(--accent-clair) 67%, var(--accent-clair) 100%)}
.cartouche{border-bottom:1px solid var(--filet-fort);background:var(--feuille)}
.marque{display:flex;align-items:center;justify-content:space-between;gap:1rem;
  flex-wrap:wrap;padding-bottom:1.1rem;margin-bottom:1.3rem;border-bottom:1px solid var(--filet)}
.marque img{height:34px;width:auto;display:block}
.marque .role{font-size:12px;color:var(--encre-2);text-align:right;line-height:1.45}
.marque .role b{display:block;font-weight:600;color:var(--encre);font-size:12.5px}
.signature{display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;
  margin-top:1.3rem;padding-top:1.2rem;border-top:1px solid var(--filet)}
.signature img{height:28px;width:auto;opacity:.9}
.signature span{font-size:12.5px;color:var(--encre-3)}
.dans{max-width:1080px;margin:0 auto;padding:0 clamp(1rem,4vw,2.4rem)}
.cartouche .dans{padding-top:var(--pas)}
.doc-type{font:600 11px/1.5 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;
  color:var(--accent);margin:0 0 .8rem;max-width:100%}
h1{font-size:clamp(1.75rem,4.4vw,2.7rem);font-weight:700;letter-spacing:-.02em;line-height:1.08}
.sous{color:var(--encre-2);max-width:62ch;margin:.85rem 0 0;font-size:1.02rem}
.bloc-titre{display:grid;grid-template-columns:repeat(auto-fit,minmax(146px,1fr));
  border:1px solid var(--filet-fort);border-bottom:0;margin:1.7rem 0 0}
.bt{border-right:1px solid var(--filet);padding:.55rem .75rem}
.bt:last-child{border-right:0}
.bt dt{font:600 9.5px/1 Archivo,sans-serif;letter-spacing:.13em;text-transform:uppercase;
  color:var(--encre-3);margin-bottom:.35rem}
.bt dd{margin:0;font-size:13px;font-weight:500}

main{max-width:1080px;margin:0 auto;padding:var(--pas) clamp(1rem,4vw,2.4rem) 4rem}
section{margin-bottom:3.2rem}
section>h2{font-size:1.32rem;font-weight:700;letter-spacing:-.01em;
  padding-bottom:.5rem;border-bottom:2px solid var(--encre);margin-bottom:1.1rem}
section>h2 .num{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--encre-3);
  margin-right:.6rem;vertical-align:.18em}
h3{font-size:1rem;font-weight:600;margin:1.6rem 0 .55rem}
p{margin:0 0 .85rem;max-width:70ch}
.note{color:var(--encre-2);font-size:14px}

.specs{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
  border:1px solid var(--filet);border-radius:var(--r);overflow:hidden;background:var(--feuille)}
.spec{padding:.8rem .95rem;border-right:1px solid var(--filet);border-bottom:1px solid var(--filet)}
.spec dt{font:600 9.5px/1 Archivo,sans-serif;letter-spacing:.13em;text-transform:uppercase;
  color:var(--encre-3);margin-bottom:.4rem}
.spec dd{margin:0;font-size:14px;line-height:1.45}

.regles{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.regles li{display:grid;grid-template-columns:auto 1fr;gap:.75rem;align-items:baseline;
  padding:.65rem .9rem;background:var(--feuille);border:1px solid var(--filet);
  border-radius:var(--r);font-size:14px}
.regles b{font-family:"IBM Plex Mono",monospace;font-size:12.5px;font-weight:600;
  color:var(--accent);white-space:nowrap}

.encart{border:1px solid var(--filet);border-left:3px solid var(--ambre);
  background:var(--ambre-doux);border-radius:var(--r);padding:.85rem 1rem;font-size:14px;margin:1.1rem 0}

.codebloc{border:1px solid var(--filet);border-radius:var(--r);overflow:hidden;background:var(--feuille)}
.codebarre{padding:.5rem .8rem;border-bottom:1px solid var(--filet);background:var(--feuille-2);
  font:600 11px/1 Archivo,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--encre-2)}
pre{margin:0;padding:1rem;overflow-x:auto;font-size:12.5px;line-height:1.62;tab-size:2}
.j-cle{color:var(--accent-fort)}.j-txt{color:var(--vert)}
.j-num{color:var(--ambre)}.j-lit{color:var(--encre-2);font-style:italic}

details{border:1px solid var(--filet);border-radius:var(--r);background:var(--feuille);overflow:hidden}
summary{padding:.6rem .85rem;cursor:pointer;background:var(--feuille-2);
  border-bottom:1px solid transparent;font-size:13.5px;font-weight:500}
summary:hover{color:var(--accent)}
details[open] summary{border-bottom-color:var(--filet)}
details pre{max-height:32rem}

.telech{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:.7rem}
.fichier{padding:.9rem 1rem;background:var(--feuille);border:1px solid var(--filet);border-radius:var(--r)}
.fichier .nom{font:600 13.5px "IBM Plex Mono",monospace;display:block}
.fichier .det{font-size:12.5px;color:var(--encre-2);display:block;margin:.25rem 0 .7rem}
.bouton{display:inline-block;padding:.45rem .8rem;font-size:13px;font-weight:500;
  background:var(--accent);color:#fff;border-radius:var(--r);text-decoration:none}
.bouton:hover{filter:brightness(1.12);color:#fff}

/* ── filtre de section : radios + sélecteurs frères, zéro script ─────── */
.r{position:absolute;opacity:0;pointer-events:none}
.filtres{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.9rem}
.filtres label{cursor:pointer;padding:.35rem .6rem;font-size:12.5px;
  background:var(--feuille);border:1px solid var(--filet-fort);border-radius:var(--r);
  color:var(--encre-2);user-select:none}
.filtres label:hover{border-color:var(--accent);color:var(--accent)}
.filtres label .n{font:500 11px "IBM Plex Mono",monospace;opacity:.65;margin-left:.25rem}
#s-tout:checked ~ .filtres label[for="s-tout"]{background:var(--accent);border-color:var(--accent);color:#fff}
${cssFiltre}

.tablewrap{border:1px solid var(--filet);border-radius:var(--r);overflow:auto;
  max-height:40rem;background:var(--feuille)}
table{border-collapse:collapse;width:100%;font-size:13px}
thead th{position:sticky;top:0;z-index:1;background:var(--feuille-2);
  font:600 10px/1 Archivo,sans-serif;letter-spacing:.11em;text-transform:uppercase;
  color:var(--encre-2);text-align:left;padding:.6rem .7rem;
  border-bottom:1px solid var(--filet-fort);white-space:nowrap}
tbody td{padding:.5rem .7rem;border-bottom:1px solid var(--filet);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
td.chemin{font-family:"IBM Plex Mono",monospace;font-size:12px;white-space:nowrap;font-weight:500}
td.type{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--encre-2);white-space:nowrap}
td.desc{min-width:19rem;color:var(--encre-2);line-height:1.5}
.bulle{display:inline-block;font:600 9.5px/1 Archivo,sans-serif;letter-spacing:.09em;
  text-transform:uppercase;padding:.28rem .45rem;border-radius:2px;white-space:nowrap}
.bulle.in{background:transparent;color:var(--encre-2);border:1px solid var(--filet-fort)}
.bulle.out{background:var(--accent);color:#fff}
.bulle.meta{background:transparent;color:var(--encre-3);border:1px dashed var(--filet-fort)}

.demandes{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.demandes li{display:grid;grid-template-columns:1.3rem 1fr;gap:.7rem;align-items:start;
  padding:.75rem .95rem;background:var(--feuille);border:1px solid var(--filet);border-radius:var(--r)}
.demandes .case{width:1.05rem;height:1.05rem;border:1.5px solid var(--filet-fort);
  border-radius:2px;margin-top:.12rem}
.demandes strong{display:block;font-size:14px;font-weight:600;margin-bottom:.15rem}
.demandes span{font-size:13.5px;color:var(--encre-2);line-height:1.5}

footer{border-top:1px solid var(--filet);max-width:1080px;margin:0 auto;
  padding:1.6rem clamp(1rem,4vw,2.4rem) 3rem;color:var(--encre-3);font-size:13px}

/* ── impression : « Imprimer → Enregistrer en PDF » donne un document propre ── */
@media print{
  :root{--papier:#fff;--feuille:#fff;--feuille-2:#fafafa;--encre:#000;--encre-2:#333;
        --filet:#ccc;--filet-fort:#999;--accent:#0E6E8C}
  body{font-size:10pt}
  .filtres,.telech{display:none}
  .bandeau{height:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .marque,.signature{border-color:#ccc}
  .tablewrap{max-height:none;overflow:visible;border:0}
  details{border:0}
  details:not([open])>*:not(summary){display:revert}
  summary{display:none}
  pre{max-height:none;white-space:pre-wrap;word-break:break-all;font-size:7.5pt}
  section{break-inside:avoid-page}
  tr{break-inside:avoid}
  thead{display:table-header-group}
  @page{size:letter;margin:14mm}
}
</style>
</head>
<body>

<div class="bandeau"></div>
<header class="cartouche">
  <div class="dans">
    <div class="marque">
      <img src="${LOGO}" alt="BSP" width="187" height="86">
      <div class="role"><b>Document préparé par BSP</b>Partenaire Premium Zoho · pour Groupe Canva</div>
    </div>
    <p class="doc-type">Contrat d'échange · Zoho Creator → plateforme d'analyse</p>
    <h1>Soumission Matériaux Souples</h1>
    <p class="sous">Ce que Zoho enverra à votre API à chaque soumission validée : structure, types, exemple réel et authentification. De quoi faire votre mapping sans attendre notre prochaine rencontre.</p>
    <dl class="bloc-titre">
      <div class="bt"><dt>Schéma</dt><dd class="mono">v${champs.schema_version}</dd></div>
      <div class="bt"><dt>Généré le</dt><dd class="mono">${DATE}</dd></div>
      <div class="bt"><dt>Champs</dt><dd><span class="mono">${nbIn}</span> saisis · <span class="mono">${nbOut}</span> calculés</dd></div>
      <div class="bt"><dt>Sens</dt><dd>Zoho → vous</dd></div>
      <div class="bt"><dt>Format</dt><dd>JSON · UTF-8</dd></div>
    </dl>
  </div>
</header>

<main>

<section>
  <h2><span class="num">01</span>Aperçu</h2>
  <p>Une soumission est chiffrée dans notre outil d'estimation, puis validée par un estimateur. À cet instant, Zoho vous l'envoie en JSON. Vous répondez ; votre réponse est stockée et réaffichée à côté de la soumission.</p>
  <dl class="specs">
    <div class="spec"><dt>Déclencheur</dt><dd>Passage au statut <b>Validé</b> dans notre outil</dd></div>
    <div class="spec"><dt>Méthode</dt><dd class="mono">POST</dd></div>
    <div class="spec"><dt>Taille réelle</dt><dd>environ 5,6 Ko (JSON compact)</dd></div>
    <div class="spec"><dt>Rejeu</dt><dd>3 tentatives sur 5xx ou timeout. Jamais sur 4xx.</dd></div>
    <div class="spec"><dt>Idempotence</dt><dd>Clé = <span class="mono">soumission.id</span>, stable dans le temps</dd></div>
    <div class="spec"><dt>Votre réponse</dt><dd><span class="mono">200</span> ou <span class="mono">202</span>, corps JSON libre</dd></div>
  </dl>
  <p class="note" style="margin-top:1.1rem">Nous journalisons chaque tentative de notre côté — code HTTP, horodatage, corps de votre réponse. Si vous ne recevez rien, nous pouvons dire en quelques secondes ce qui est parti et ce qui a été répondu.</p>
</section>

<section>
  <h2><span class="num">02</span>Conventions</h2>
  <p>Six règles valables partout dans le document. Elles évitent les mauvaises surprises au mapping.</p>
  <ul class="regles">
    <li><b>noms métier</b><span>Aucune référence à notre fichier de calcul d'origine n'est exposée. Les noms sont stables et ne bougeront pas d'une version mineure à l'autre.</span></li>
    <li><b>0-100</b><span>Les pourcentages sont des nombres entre 0 et 100. <span class="mono">perte_pct: 10</span> signifie 10 %, jamais 0,1.</span></li>
    <li><b>null</b><span>Un champ non saisi vaut <span class="mono">null</span> — pas <span class="mono">0</span>, pas de chaîne vide. Les cases à cocher sont de vrais booléens.</span></li>
    <li><b>CAD</b><span>Tous les montants sont en dollars canadiens, arrondis à 2 décimales. Seul <span class="mono">prix.prix_unitaire</span> en porte 4.</span></li>
    <li><b>temps</b><span>Chaque durée arrive sous la forme <span class="mono">{ heures, minutes, minutes_totales }</span> — à vous de choisir la plus commode.</span></li>
    <li><b>tableaux</b><span>Les lignes vides sont omises. Seule exception : <span class="mono">ventilation_couts</span> compte toujours exactement 7 lignes, dans le même ordre.</span></li>
  </ul>
  <div class="encart"><b>Versionnement.</b> Le champ <span class="mono">schema_version</span> voyage dans chaque envoi. Un ajout de champ incrémente la version mineure et reste compatible. Une suppression ou un renommage passe en version majeure et vous est annoncé 30 jours à l'avance.</div>
</section>

<section>
  <h2><span class="num">03</span>Fichiers à récupérer</h2>
  <p>Le schéma vous génère vos types et valide chaque envoi reçu ; l'exemple sert de jeu d'essai à votre parseur.</p>
  <div class="telech">
    <div class="fichier">
      <span class="nom">soumission.schema.json</span>
      <span class="det">JSON Schema 2020-12 · ${(schemaBrut.length / 1024).toFixed(0)} Ko · 297 propriétés décrites</span>
      <a class="bouton" download="soumission.schema.json" href="${dataURI(schemaBrut)}">Télécharger le schéma</a>
    </div>
    <div class="fichier">
      <span class="nom">exemple-soumission.json</span>
      <span class="det">Payload réel · ${(exempleJoli.length / 1024).toFixed(0)} Ko · celui reproduit ci-dessous</span>
      <a class="bouton" download="exemple-soumission.json" href="${dataURI(exempleJoli)}">Télécharger l'exemple</a>
    </div>
  </div>
  <div class="codebloc" style="margin-top:1.1rem">
    <div class="codebarre">Générer vos types</div>
    <pre><code># TypeScript
npx json-schema-to-typescript soumission.schema.json -o soumission.d.ts

# C# · Python · Java · Go
npx quicktype soumission.schema.json -o Soumission.cs --lang csharp

# Valider un payload reçu, en test comme en production
npx ajv-cli validate -s soumission.schema.json -d recu.json --spec=draft2020</code></pre>
  </div>
</section>

<section>
  <h2><span class="num">04</span>Exemple complet</h2>
  <p>Ce n'est pas une maquette. Ces chiffres sortent de notre moteur de calcul réel sur un travail type : 50 pièces, 4 matériaux, découpe à la platine, un sous-contrat de gravure.</p>
  <details open>
    <summary>soumission.validee — ${exempleJoli.length.toLocaleString("fr-CA")} caractères indentés</summary>
    <pre><code>${colorerJSON(exempleJoli)}</code></pre>
  </details>
</section>

<section>
  <h2><span class="num">05</span>Référence des champs</h2>
  <p>Cliquez une section pour ne garder qu'elle. <b>Saisi</b> = entré par l'estimateur. <b>Calculé</b> = produit par notre moteur de prix. <b>Méta</b> = ajouté par Zoho à l'envoi.</p>
${radios}
  <div class="filtres">
${etiquettes}
  </div>
  <div class="tablewrap">
    <table>
      <thead><tr><th>Chemin</th><th>Type</th><th>Origine</th><th>Description</th></tr></thead>
      <tbody>
${lignes}
      </tbody>
    </table>
  </div>
</section>

<section>
  <h2><span class="num">06</span>Authentification</h2>
  <p>Un jeton secret partagé, transmis hors courriel. Chaque envoi porte en plus une signature du corps, pour que vous puissiez vérifier son intégrité indépendamment du transport.</p>
  <div class="codebloc">
    <div class="codebarre">Requête entrante</div>
    <pre><code>POST /votre-endpoint HTTP/1.1
Content-Type: application/json
Authorization: Bearer &lt;JETON_PARTAGÉ&gt;
X-Zoho-Signature: sha256=&lt;HMAC-SHA256 du corps brut, clé = jeton&gt;
X-Zoho-Event: soumission.validee
X-Zoho-Delivery: &lt;identifiant unique par tentative&gt;
X-API-Version: ${champs.schema_version}</code></pre>
  </div>
  <h3>Vérifier la signature</h3>
  <p>Calculez le HMAC-SHA256 du <b>corps brut reçu</b>, clé = le jeton, encodage hexadécimal. Comparez en temps constant — jamais avec <span class="mono">==</span>, qui fuit la clé par le temps de réponse.</p>
  <div class="codebloc">
    <div class="codebarre">Node.js</div>
    <pre><code>import { createHmac, timingSafeEqual } from "node:crypto";

const attendue = "sha256=" + createHmac("sha256", JETON)
  .update(corpsBrut, "utf8").digest("hex");

const a = Buffer.from(req.headers["x-zoho-signature"] ?? "");
const b = Buffer.from(attendue);
const valide = a.length === b.length &amp;&amp; timingSafeEqual(a, b);</code></pre>
  </div>
  <div class="codebloc" style="margin-top:.8rem">
    <div class="codebarre">C#</div>
    <pre><code>using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(jeton));
var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(corpsBrut));
var attendue = "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();

var valide = CryptographicOperations.FixedTimeEquals(
    Encoding.UTF8.GetBytes(attendue),
    Encoding.UTF8.GetBytes(signatureRecue));</code></pre>
  </div>
  <div class="encart"><b>Codes de réponse.</b> <span class="mono">200</span> ou <span class="mono">202</span> : reçu, nous n'insistons pas. <span class="mono">4xx</span> : erreur définitive, nous ne réessayons pas — c'est le bon code si le contrat est violé. <span class="mono">5xx</span> ou timeout : nous rejouons 3 fois, puis la soumission est marquée en erreur et rejouable à la main.</div>
</section>

<section>
  <h2><span class="num">07</span>Lire nos données</h2>
  <p>Au-delà de recevoir les soumissions, vous pourrez interroger nos référentiels en lecture seule — pour comparer un matériau à l'inventaire, ou situer un montant par rapport à l'historique.</p>
  <dl class="specs">
    <div class="spec"><dt>Confirmé</dt><dd>Inventaire des matières premières — nom, catégorie, coût au pied carré, fournisseur, stock</dd></div>
    <div class="spec"><dt>Disponible</dt><dd>Fournisseurs · clients · historique des soumissions et feuilles de travail</dd></div>
    <div class="spec"><dt>Jointure</dt><dd>Le champ <span class="mono">materiaux[].nom</span> du contrat est la clé exacte du catalogue</dd></div>
    <div class="spec"><dt>Accès</dt><dd>Identifiants OAuth 2.0 en lecture seule, que nous vous remettons</dd></div>
  </dl>
  <p class="note" style="margin-top:1.1rem">Envoyez-nous la liste des entités qui vous intéressent : nous ouvrons les accès correspondants et vous transmettons la spécification.</p>
</section>

<section>
  <h2><span class="num">08</span>Ce qu'il nous faut</h2>
  <p>Quatre éléments de votre côté pour brancher le premier envoi réel.</p>
  <ul class="demandes">
    <li><span class="case"></span><div><strong>L'URL de votre environnement de test</strong><span>Nous la configurons chez nous ; aucun redéploiement n'est nécessaire ensuite pour passer en production.</span></div></li>
    <li><span class="case"></span><div><strong>Le format de votre réponse</strong><span>Si votre analyse renvoie un verdict structuré, décrivez-le : nous l'afficherons tel quel à côté de la soumission, pour l'estimateur.</span></div></li>
    <li><span class="case"></span><div><strong>Vos limites sur les fichiers joints</strong><span>Nombre et taille maximale. Nous proposons de vous envoyer des liens signés plutôt que les fichiers dans le JSON.</span></div></li>
    <li><span class="case"></span><div><strong>Vos règles métier</strong><span>Pour répartir : les règles déterministes restent chez nous, l'analyse contextuelle chez vous. Objectif — ne pas développer deux fois la même validation.</span></div></li>
  </ul>
</section>

</main>

<footer>
  Contrat de schéma <span class="mono">v${champs.schema_version}</span> · généré le ${DATE} depuis le code de l'outil d'estimation — document et payload viennent de la même source et ne peuvent pas diverger. Pour toute question sur un champ, citez son chemin, par exemple <span class="mono">decoupe.platine.coupe.up</span>.
  <br><br>Ce document ne contient aucun script : il s'ouvre hors ligne, dans n'importe quel navigateur, et s'imprime en PDF par <b>Fichier → Imprimer → Enregistrer au format PDF</b>.
  <div class="signature">
    <img src="${LOGO}" alt="BSP" width="187" height="86">
    <span>BSP — Partenaire Premium Zoho · <a href="https://bspcorp.co">bspcorp.co</a><br>Intégration et développement sur mesure pour Groupe Canva.</span>
  </div>
</footer>

</body>
</html>
`;

writeFileSync(resolve(process.cwd(), "docs/api/contrat-soumission.html"), html, "utf8");
console.log("contrat-soumission.html :", (html.length / 1024).toFixed(0), "Ko");
console.log("  champs :", champs.champs.length, "· sections :", SECTIONS.length);
console.log("  scripts :", (html.match(/<script/gi) || []).length);
