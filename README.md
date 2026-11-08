# rover-notes

Hub d’étude de Pierre : la semaine en cours, les réponses, les notes, le journal et les preuves.

L’application (React, Vite, TypeScript) vise `https://pierre-claisse.github.io/rover-notes/`. Sans déverrouillage, seul l’écran identifiant et mot de passe est affiché. Les réponses, le programme, le journal et les fichiers sont chiffrés avant d’être enregistrés dans le dépôt privé `rover-notes-data`.

Départ : 0 h le 8 novembre 2026, environ 9 h par semaine, robot non acheté. S1 à S9 sont détaillées. S10 à S94 sont des blocs indicatifs. Le plan parle de 18 mois et les blocs vont jusqu’à S94 : les deux ne décrivent pas le même calendrier.

```text
npm install
npm run dev
npm test
npm run build
npm run build-secrets
npm run read-progress -- --help
npm run bootstrap-vault
```

Le déploiement Pages exige `SYNC_PAT`, `SYNC_PASSWORD`, `SYNC_USERNAME` et `SYNC_DATA_KEY`. Sans ces valeurs, la construction de production s’arrête. Il n’y a pas de mot de passe par défaut.

Le format lu par un autre agent est décrit dans `docs/data-format/README.md`.
