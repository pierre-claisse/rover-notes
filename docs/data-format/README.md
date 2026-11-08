# Format du coffre rover-notes

Lecture seule pour un agent qui a le mot de passe, transmis hors de ce dépôt. Les validateurs exécutables sont dans `src/domain/schemas.ts`. Les schémas JSON de ce dossier en sont le miroir.

## Identifiant et mot de passe

- Identifiant : trim, puis normalisation Unicode NFC. La comparaison est sensible à la casse. Ce n’est pas un second facteur.
- Mot de passe : octets UTF-8 exacts. Pas de trim, pas de NFC, pas de troncature.
- Argon2id version 1, borné : `m=19456` KiB, `t=2`, `p=1`, sortie 32 octets. Sel 16 octets, nonce AES 12 octets, tag GCM 128 bits. Un fichier qui demande un autre coût est refusé avant la dérivation.
- AAD d’amorçage, UTF-8 du JSON canonique : `["rover-notes","secrets",1]`.
- La clé de déverrouillage n’est pas la clé des données. `dataKey` est une clé aléatoire stable de 32 octets. Changer le mot de passe refait seulement `secrets.json`.

`secrets.json` :

```json
{ "version": 1, "kdf": { "name": "argon2id", "memoryKiB": 19456, "iterations": 2, "parallelism": 1, "outputBytes": 32 }, "blob": { "salt": "", "nonce": "", "ciphertext": "" } }
```

Payload après déchiffrement, clés exactes : `username`, `pat`, `repoOwner`, `repoName`, `branch`, `keyId`, `dataKey` (base64 de 32 octets), `vaultManifestPath` (`vault/v1/manifest.enc.json`).

## Objets

HKDF-SHA-256 : sel UTF-8 `rover-notes/hkdf/v1`, info UTF-8 `rover-notes/v1/<keyId>/<objectId>`, 32 octets. Nouveau nonce à chaque écriture.

AAD UTF-8 : `["rover-notes",1,"<keyId>","<objectId>"]` via `JSON.stringify` (sans espaces).

Enveloppe, dans cet ordre : `{ "version": 1, "keyId", "objectId", "nonce", "ciphertext" }`. `nonce` et `ciphertext` sont du base64 standard. `objectId` correspond à `[A-Za-z0-9_-]{16,64}`.

```text
vault/v1/manifest.enc.json
vault/v1/objects/<objectId>.enc.json
```

Le manifeste, les semaines, le journal et le programme sont du JSON UTF-8 canonique (clés triées) puis chiffrés. Un morceau de fichier est le binaire brut, pas du JSON. Le nom, le type MIME, la taille et le SHA-256 sont seulement dans la semaine chiffrée. Morceaux de 256 KiB, 10 Mio maximum, le nombre de morceaux doit couvrir exactement la taille.

Messages de commit : `vault: update`.

Le champ `completedMinutes` du manifeste est un cache. Le temps affiché est la somme des `entries` du journal, dédupliquées par `id`. Une auto-évaluation `declared` n’est pas une compétence validée.

`answers.value` est une union : `{kind:"text",text}`, `{kind:"checkboxes",selectedIds}`, `{kind:"number",number}`, `{kind:"files",evidenceIds}`. Une preuve est `{kind:"file",...}` ou `{kind:"url",href,visibility,consented:true}`.

Le journal : `study_session`, ou `weekly_review` avec `review` `{learned,difficulties,nextSteps}`. Fuseau `Europe/Paris`.

## Lecture

```text
npm run read-progress -- --secrets public/secrets.json --username <identifiant> --week P0-S1
```

Mot de passe : invite masquée sur stderr, ou variable `ROVER_NOTES_PASSWORD`. Jamais en argument. `gh` doit pouvoir lire `rover-notes-data` ; le script n’utilise pas le PAT du coffre et ne l’imprime pas, ni `dataKey`.

`--fixture-dir` lit un dossier local. `--format md` écrit un résumé. `--verify-evidence` contrôle les empreintes en mémoire, sans écrire les fichiers. `--week all` parcourt les semaines référencées.

Si aucune séance n’est enregistrée, le résumé dit « Aucune entrée sauvegardée ». Cela ne conclut pas à une absence d’étude.

## Amorçage

`npm run build-secrets` lit `SYNC_PAT`, `SYNC_PASSWORD`, `SYNC_USERNAME`, `SYNC_DATA_KEY` (et, optionnellement, `SYNC_REPO_OWNER`, `SYNC_REPO_NAME`, `SYNC_BRANCH`, `SYNC_KEY_ID`). Sans `REQUIRE_SYNC_SECRETS=1`, l’absence de secret n’écrit rien. Avec ce drapeau, le processus s’arrête. `npm run bootstrap-vault` crée le coffre seulement s’il n’existe pas.
