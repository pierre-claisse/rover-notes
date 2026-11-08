# Programme semaine par semaine — contenu intégral

## P0-S1 — Vecteurs, mémoire C, Linux série, premier parseur

Lundi 2 nov. 2026

### Ce que vous devez savoir le dimanche
- Je sais dire ce que fait une matrice 2×2 à un vecteur, en regardant où vont (1,0) et (0,1)
- Je sais expliquer pourquoi [[0,-1],[1,0]] est une rotation de 90° et à quoi elle sert pour un robot qui tourne
- Je sais compiler et déboguer un programme C avec gcc, make et gdb sans droits admin
- Je sais expliquer la différence entre pile et tas en montrant deux adresses réelles
- Je sais me connecter en SSH, lire l'état d'un service systemd et expliquer pourquoi /dev/ttyUSB0 exige le groupe dialout
- Je sais écrire sans IA un parseur C pour {"T":1,"L":0.5,"R":0.5} et le tester

### Les 4 créneaux

#### Mardi · 1 h 30

Maths : épisodes 1 à 3 de « Essence of linear algebra ». Exercice papier : ce que fait [[0,-1],[1,0]] à (1,0) et (0,1), et pourquoi un robot qui tourne en a besoin

Ressource : https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab

#### Jeudi · 1 h 30

C : installer gcc, make, gdb sans droits admin (conda ou conteneur). Programme qui affiche l'adresse d'une variable locale et d'un bloc malloc ; expliquer pile vs tas

Ressource : Documentation gcc/gdb ; conda-forge ou image Docker gcc

#### Samedi · 4 h

1 h 30 Linux : SSH, systemd, permissions du port série /dev/ttyUSB0, groupe dialout. Puis 2 h 30 : parseur de trames C sans IA pour {"T":1,"L":0.5,"R":0.5}, au moins 3 tests

Ressource : https://missing.csail.mit.edu/ ; wiki UGV Rover (format JSON)

#### Dimanche · 2 h

Premier commit dans le dépôt privé github.com/pierre-claisse/rover-notes + page de notes de la semaine

Ressource : Votre dépôt rover-notes

**Exercice de vérification :** Sans notes : dessiner la rotation de 90° et montrer à l'écran les deux adresses (pile, tas) en expliquant laquelle est la plus haute

**Preuve à produire :** Commit 1 : parseur + 3 tests verts + notes S1

## P0-S2 — Composition de matrices, pointeurs, shell

Lundi 9 nov. 2026

### Ce que vous devez savoir le dimanche
- Je sais expliquer qu'un produit de matrices est l'enchaînement de deux transformations, et que l'ordre compte
- Je sais manipuler pointeurs, pointeurs de pointeurs et tableaux en C, et expliquer p[i] == *(p+i)
- Je sais écrire un script bash avec variables, boucles, pipes et redirections
- Je sais utiliser grep, find, chmod, chown et lire ls -l

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 4 et 5 (multiplication = composition, transformations 3D). Exercice : rotation de 90° puis symétrie, contre symétrie puis rotation : comparer les résultats

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

C : pointeurs et tableaux ; fonction qui inverse un tableau en place ; passer une structure par pointeur

Ressource : Missing Semester (outils) + man pages

#### Samedi · 4 h

1 h 30 shell (Missing Semester : shell, scripts) ; 2 h 30 : étendre le parseur aux trames invalides (accolade manquante, nombre mal formé), 5 tests de plus

Ressource : https://missing.csail.mit.edu/

#### Dimanche · 2 h

Notes : schéma pile/tas/pointeurs ; script bash qui lance les tests ; planifier S3

Ressource : rover-notes

**Exercice de vérification :** Prédire à la main le résultat de A·B et B·A pour deux matrices 2×2 simples, puis vérifier en Python

**Preuve à produire :** Commit : tests d'erreurs + script run_tests.sh

## P0-S3 — Déterminant, mémoire dynamique, électricité de base

Lundi 16 nov. 2026

### Ce que vous devez savoir le dimanche
- Je sais dire ce que mesure un déterminant (facteur d'aire) et ce que signifie un déterminant nul
- Je sais allouer, libérer et détecter une fuite mémoire (valgrind ou -fsanitize=address)
- Je sais appliquer la loi d'Ohm U = R·I et la puissance P = U·I sur un circuit simple
- Je sais expliquer tension, courant et résistance avec mes propres mots

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 6 et 7 (déterminant ; inverse, espace colonne, noyau). Exercice : déterminant de la rotation de 90° et pourquoi il vaut 1

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

C : malloc/free, tampon circulaire pour recevoir des octets série ; compiler avec -fsanitize=address

Ressource : Documentation gcc (sanitizers)

#### Samedi · 4 h

1 h 30 électricité : tension, courant, résistance, loi d'Ohm. 2 h 30 : brancher le tampon circulaire au parseur (lecture octet par octet)

Ressource : https://learn.sparkfun.com/tutorials/voltage-current-resistance-and-ohms-law

#### Dimanche · 2 h

Notes : 5 calculs de loi d'Ohm à la main ; commit ; planifier S4

Ressource : rover-notes

**Exercice de vérification :** Calculer le courant dans une LED avec résistance de 220 Ω sous 3,3 V (chute LED 2 V)

**Preuve à produire :** Commit : tampon circulaire + tests, zéro erreur ASan

## P0-S4 — Matrices non carrées, produit scalaire, PWM, endianness

Lundi 23 nov. 2026

### Ce que vous devez savoir le dimanche
- Je sais calculer un produit scalaire et l'interpréter comme une projection
- Je sais expliquer la PWM : rapport cyclique, fréquence, et pourquoi elle règle la vitesse d'un moteur
- Je sais ce qu'est l'endianness et lire un entier 16 bits petit-boutiste dans un tableau d'octets
- Je sais quand utiliser volatile en C et pourquoi

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 8 et 9 (matrices non carrées ; produit scalaire et dualité). Exercice : angle entre le cap du robot et la direction d'une cible

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

C : opérations bit à bit, masques, décalages ; fonctions read_u16_le / read_u16_be testées ; volatile

Ressource : man pages ; Missing Semester

#### Samedi · 4 h

1 h 30 PWM et pont en H (principe). 2 h 30 : simuler en C une PWM logicielle (tableau de niveaux) et tracer le signal en Python

Ressource : https://learn.sparkfun.com/tutorials/pulse-width-modulation

#### Dimanche · 2 h

Semaine allégeable (1 semaine sur 4 selon le plan) : notes, commit, rattrapage

Ressource : rover-notes

**Exercice de vérification :** Expliquer sans notes pourquoi une PWM à 25 % donne en moyenne un quart de la tension d'alimentation

**Preuve à produire :** Commit : fonctions d'endianness testées + graphe PWM

## P0-S5 — Produit vectoriel, bus série, C++ et RAII

Lundi 30 nov. 2026

### Ce que vous devez savoir le dimanche
- Je sais calculer un produit vectoriel et dire à quoi il sert (normale, sens de rotation)
- Je sais expliquer UART, I2C et SPI : fils, horloge, adressage, débit, et lequel relie le Pi à l'ESP32
- Je sais écrire une classe C++ qui libère sa ressource dans son destructeur (RAII)
- Je sais utiliser std::vector, std::string et std::unique_ptr à la place de malloc

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 10 et 11 (produit vectoriel). Exercice : le robot doit-il tourner à gauche ou à droite pour viser une cible ? (signe du produit vectoriel 2D)

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

C++ : réécrire le tampon circulaire en classe RAII ; tests

Ressource : Documentation cppreference

#### Samedi · 4 h

2 h bus série : UART puis I2C. 2 h : tableau comparatif UART/I2C/SPI dans les notes ; schéma Pi 5 ↔ UART ↔ ESP32 d'après le wiki

Ressource : https://learn.sparkfun.com/tutorials/serial-communication ; https://learn.sparkfun.com/tutorials/i2c ; wiki UGV Rover

#### Dimanche · 2 h

Commit ; première version du schéma d'architecture (sur papier puis en image)

Ressource : rover-notes

**Exercice de vérification :** Dire sans notes quel bus utilise une adresse sur 7 bits et lequel n'a pas de fil d'horloge

**Preuve à produire :** Commit : classe C++ RAII + schéma d'architecture v1

## P0-S6 — Changement de base, datasheet INA219, cross-compilation

Lundi 7 déc. 2026

### Ce que vous devez savoir le dimanche
- Je sais passer un point du repère du robot au repère du monde (changement de base)
- Je sais lire une datasheet : brochage, registres, formules de conversion
- Je sais recalculer à la main tension et courant à partir des registres bruts de l'INA219
- Je sais ce qu'est la cross-compilation et compiler un binaire ARM64 depuis mon PC

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 12 et 13 (règle de Cramer ; changement de base). Exercice : robot en (2,1) orienté à 90°, où est dans le monde un point situé à 1 m devant lui ?

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

Cross-compilation : chaîne aarch64 (conda ou conteneur), compiler le parseur pour ARM64, vérifier avec file / qemu

Ressource : Documentation gcc

#### Samedi · 4 h

Datasheet INA219 : registres shunt/bus, calibration. Exercice : à partir de valeurs brutes d'exemple, recalculer la tension et le courant à la main puis en C

Ressource : https://www.ti.com/lit/ds/symlink/ina219.pdf

#### Dimanche · 2 h

Notes « comment lire une datasheet » ; commit

Ressource : rover-notes

**Exercice de vérification :** Convertir à la main une valeur brute de registre bus de l'INA219 en volts

**Preuve à produire :** Commit : convertisseur INA219 en C + tests, binaire ARM64

## P0-S7 — Valeurs propres, Rust (ownership), CI

Lundi 14 déc. 2026

### Ce que vous devez savoir le dimanche
- Je sais dire ce qu'est un vecteur propre et pourquoi une rotation 2D n'en a pas de réel
- Je sais expliquer ownership, emprunt et durée de vie en Rust sur un exemple
- Je sais écrire une fonction Rust testée avec cargo test
- Je sais mettre en place une CI GitHub Actions qui compile et teste le code C

### Les 4 créneaux

#### Mardi · 1 h 30

Épisodes 14 et 15 (vecteurs et valeurs propres). Exercice : valeurs propres de [[2,0],[0,3]] et de la rotation de 90°

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

Rust Book ch. 1 à 4 (installation, ownership)

Ressource : https://doc.rust-lang.org/book/

#### Samedi · 4 h

2 h : workflow GitHub Actions qui lance make test sur le parseur C. 2 h : Rust Book ch. 5 et 6 (struct, enum, match)

Ressource : Documentation GitHub Actions ; Rust Book

#### Dimanche · 2 h

Notes ; commit ; badge CI

Ressource : rover-notes

**Exercice de vérification :** Expliquer pourquoi un code Rust qui utilise une String après l'avoir déplacée ne compile pas

**Preuve à produire :** Commit : CI verte sur le test C (moitié du critère de fin P0)

## P0-S8 — Rust : erreurs, traits ; parseur en Rust

Lundi 21 déc. 2026

### Ce que vous devez savoir le dimanche
- Je sais gérer les erreurs en Rust avec Result, Option et l'opérateur ?
- Je sais définir et implémenter un trait
- Je sais porter le parseur de trames en Rust avec tests
- Je sais expliquer ce que signifie no_std et ce qu'on perd sans la bibliothèque standard

### Les 4 créneaux

#### Mardi · 1 h 30

Épisode 16 (espaces vectoriels abstraits) + révision des 15 premiers avec 5 exercices papier

Ressource : Playlist 3Blue1Brown

#### Jeudi · 1 h 30

Rust Book ch. 8 à 10 (collections, erreurs, traits et génériques)

Ressource : https://doc.rust-lang.org/book/

#### Samedi · 4 h

Porter le parseur C en Rust, mêmes tests ; lire l'introduction et no_std dans The Embedded Rust Book

Ressource : https://docs.rust-embedded.org/book/

#### Dimanche · 2 h

Semaine de fêtes, allégeable : notes C vs Rust, commit

Ressource : rover-notes

**Exercice de vérification :** Donner sans notes deux choses indisponibles en no_std (allocation dynamique par défaut, std::fs…)

**Preuve à produire :** Commit : parseur Rust + tests

## P0-S9 — MIT 18.06, ROS 2 en simulation, bilan P0

Lundi 28 déc. 2026

### Ce que vous devez savoir le dimanche
- Je sais résoudre un petit système linéaire par élimination (vue « lignes » et vue « colonnes »)
- Je sais installer ROS 2 Humble (conteneur) et lancer un nœud talker/listener
- Je sais expliquer chaque fil entre le Pi et l'ESP32 d'après la documentation
- Je sais rédiger en anglais une page technique claire avec schéma

### Les 4 créneaux

#### Mardi · 1 h 30

MIT 18.06, cours 1 et 2 (géométrie des équations, élimination)

Ressource : https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/

#### Jeudi · 1 h 30

ROS 2 Humble dans un conteneur : tutoriels CLI (nœuds, topics)

Ressource : https://docs.ros.org/en/humble/Tutorials.html

#### Samedi · 4 h

Brouillon de l'article EN « Reverse-engineering my rover's architecture » à partir du wiki et des dépôts ugv_base_ros / ugv_rpi

Ressource : Wiki UGV Rover ; github.com/waveshareteam

#### Dimanche · 2 h

Bilan P0 : relire les « Je sais… », noter ce qui manque ; planifier P1

Ressource : rover-notes

**Exercice de vérification :** Expliquer à voix haute, sans notes, l'architecture Pi 5 ↔ UART ↔ ESP32 en 3 minutes (enregistrement)

**Preuve à produire :** Commit : brouillon d'article + bilan P0

## P1 — Firmware ESP32 en C++ (100 h, M3–M4)

S10–S12 outillage et compilation reproductible · S13–S16 PID et réponse indicielle · S17–S18 temps réel et jitter · S19–S21 protocole binaire

### Contrôle
- Je sais expliquer une boucle fermée : consigne, mesure, erreur, commande
- Je sais dire le rôle de P, I et D et l'effet de chaque gain sur une réponse indicielle
- Je sais mesurer dépassement, temps de montée et erreur statique sur un graphe
- Je sais ce qu'est la saturation et corriger le windup de l'intégrale

### Temps réel
- Je sais créer des tâches FreeRTOS et choisir leurs priorités
- Je sais pourquoi une ISR doit être courte et comment passer une donnée d'une ISR à une tâche
- Je sais mesurer le jitter d'une boucle par timestamps ou analyseur logique

### Capteurs et protocole
- Je sais lire un encodeur en quadrature et en déduire une vitesse filtrée
- Je sais encoder/décoder une trame COBS et calculer un CRC16
- Je sais détecter les trames perdues avec un numéro de séquence et mesurer un taux d'erreur

### Outillage
- Je sais compiler et flasher ugv_base_ros de façon reproductible (PlatformIO ou arduino-cli)
- Je sais tracer des mesures avec Python/matplotlib

Ressources du plan : Brian Douglas (YouTube) · ugv_base_ros · FreeRTOS · PlatformIO

## P2 — IMU, fusion de capteurs, Rust embarqué (140 h, M5–M7)

S22–S25 probabilités et filtre complémentaire · S26–S29 rotations et quaternions · S30–S33 EKF · S34–S37 Rust embassy et watchdog

### Probabilités et filtrage
- Je sais ce que représentent moyenne, variance et gaussienne
- Je sais écrire un filtre complémentaire gyroscope + accéléromètre
- Je sais dérouler les étapes prédiction / mise à jour d'un filtre de Kalman
- Je sais linéariser un modèle pour un EKF et chiffrer son erreur sur un log

### Rotations
- Je sais passer d'angles d'Euler à une matrice de rotation et à un quaternion
- Je sais expliquer le blocage de cardan (gimbal lock)
- Je sais calibrer un magnétomètre (hard iron, soft iron)

### Rust embarqué
- Je sais écrire un driver I2C no_std avec les traits embedded-hal
- Je sais écrire des tâches async avec embassy
- Je sais porter boucle moteur + PID + protocole binaire en Rust
- Je sais implémenter un watchdog qui coupe les moteurs après 200 ms sans trame

Ressources du plan : Labbe, Kalman and Bayesian Filters in Python · Modern Robotics ch. 3 · Embedded Rust Book · esp-hal · Embassy book

## P3 — ROS 2, simulation, dashboard web (120 h, M7–M9)

S38–S41 concepts ROS 2 et tf2 · S42–S45 URDF, Gazebo, ros2_control · S46–S50 dashboard React + WebRTC

### ROS 2
- Je sais écrire nœuds, topics, services et actions
- Je sais choisir une QoS et expliquer reliable vs best effort
- Je sais écrire un fichier launch avec arguments
- Je sais publier et lire des transformations tf2

### Modélisation et simulation
- Je sais décrire le Rover en URDF/xacro
- Je sais lancer le même code en Gazebo et sur le robot
- Je sais écrire un hardware_interface ros2_control pour mon protocole

### Web
- Je sais streamer la vidéo en WebRTC et mesurer la latence bout en bout
- Je sais afficher télémétrie batterie/IMU et téléopérer depuis React

Ressources du plan : ROS 2 Humble docs · ros2_control · Gazebo docs · Articulated Robotics

## P4 — Perception (100 h, M10–M11)

S51–S53 modèle de caméra et calibration fisheye · S54–S56 AprilTag et pan-tilt · S57–S59 inférence embarquée

### Caméra
- Je sais expliquer le modèle sténopé et les paramètres intrinsèques
- Je sais calibrer une caméra fisheye et publier camera_info
- Je sais ce qu'est la distorsion et la corriger

### Géométrie
- Je sais estimer la pose d'un AprilTag et mesurer son erreur
- Je sais expliquer le principe de l'odométrie visuelle

### Inférence
- Je sais mesurer FPS et latence d'un détecteur sur Pi 5
- Je sais ce que la quantification change en vitesse et en précision

Ressources du plan : OpenCV docs · AprilTag · Hailo RPi5 examples

## P5 — Localisation, SLAM, Nav2 (100 h, M12–M13)

S60–S62 filtre particulaire et SLAM · S63–S65 SLAM Toolbox avec LIDAR · S66–S68 Nav2 et comparaison d'odométries

### Localisation
- Je sais expliquer un filtre particulaire (AMCL)
- Je sais fusionner roues + IMU avec robot_localization
- Je sais mesurer la dérive de chaque source d'odométrie

### SLAM et navigation
- Je sais expliquer le SLAM par graphe et la fermeture de boucle
- Je sais construire une carte avec SLAM Toolbox
- Je sais configurer costmaps, planificateurs global/local et behavior trees dans Nav2

Ressources du plan : Probabilistic Robotics (Thrun et al.) · Nav2 docs · SLAM Toolbox

## P6 — Rigueur industrielle (90 h, M14–M15)

S69–S72 banc HIL et CI · S73–S75 MCAP, Foxglove, replay · S76–S78 sûreté et OTA

### Tests
- Je sais distinguer tests unitaires, d'intégration et HIL
- Je sais faire tourner un banc HIL à chaque commit

### Observabilité
- Je sais enregistrer en rosbag2/MCAP et rejouer un log de façon déterministe
- Je sais transformer un log en test de régression

### Sûreté
- Je sais définir des états dégradés et un arrêt d'urgence
- Je sais faire une mise à jour OTA signée avec retour arrière

Ressources du plan : MCAP · Foxglove docs

## P7 — Capstone (130 h, M16–M18)

S79–S82 choix et prototype · S83–S90 réalisation et mesures · S91–S94 article, vidéo, talk

### Selon l'option
- A : je sais construire une pile 100 % Rust (embassy + ros2_rust)
- B : je sais entraîner un contrôle en simulation et mesurer l'écart sim-to-real
- C : je sais coordonner deux robots et partager une carte

### Communication
- Je sais écrire un README qu'un inconnu reproduit
- Je sais présenter un résultat en 3 minutes de vidéo et en talk

Ressources du plan : ros2_rust · Underactuated Robotics · ROSCon · F1TENTH

## Source intégrale et autres sections

La source ci-dessous conserve également les tableaux, le référentiel complet, les notes de planning, les règles et toutes les ressources. Aucune question ou indice distinct n’existe dans le Canvas ; ne pas inventer un contenu « source ».

# Programme semaine par semaine — contenu intégral

Source : https://cursor.com/canvas/store-5b26d037-b305-4870-8d2e-d59cc2d6977f/ea922683-b26f-4176-a146-496ce9401bb7

Export intégral du code source du Canvas (texte français, données, tableaux, ressources et interface ; aucune coupe ni reformulation). Les vues sélectionnables sont toutes présentes dans les données.

```tsx
import { Page, Section, Text, Callout, Table, BulletList, Checklist, LinkCards, Properties, Segmented, TableOfContents, useState } from "grok/canvas";

type Slot = { c: string; d: string; contenu: string; res: string };
type Week = { n: string; date: string; theme: string; sais: string[]; slots: Slot[]; verif: string; preuve: string };

const weeks: Week[] = [
  { n: "S1", date: "2 nov. 2026", theme: "Vecteurs, mémoire C, Linux série, premier parseur",
    sais: ["Je sais dire ce que fait une matrice 2×2 à un vecteur, en regardant où vont (1,0) et (0,1)", "Je sais expliquer pourquoi [[0,-1],[1,0]] est une rotation de 90° et à quoi elle sert pour un robot qui tourne", "Je sais compiler et déboguer un programme C avec gcc, make et gdb sans droits admin", "Je sais expliquer la différence entre pile et tas en montrant deux adresses réelles", "Je sais me connecter en SSH, lire l'état d'un service systemd et expliquer pourquoi /dev/ttyUSB0 exige le groupe dialout", "Je sais écrire sans IA un parseur C pour {\"T\":1,\"L\":0.5,\"R\":0.5} et le tester"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Maths : épisodes 1 à 3 de « Essence of linear algebra ». Exercice papier : ce que fait [[0,-1],[1,0]] à (1,0) et (0,1), et pourquoi un robot qui tourne en a besoin", res: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab" },
      { c: "Jeudi", d: "1 h 30", contenu: "C : installer gcc, make, gdb sans droits admin (conda ou conteneur). Programme qui affiche l'adresse d'une variable locale et d'un bloc malloc ; expliquer pile vs tas", res: "Documentation gcc/gdb ; conda-forge ou image Docker gcc" },
      { c: "Samedi", d: "4 h", contenu: "1 h 30 Linux : SSH, systemd, permissions du port série /dev/ttyUSB0, groupe dialout. Puis 2 h 30 : parseur de trames C sans IA pour {\"T\":1,\"L\":0.5,\"R\":0.5}, au moins 3 tests", res: "https://missing.csail.mit.edu/ ; wiki UGV Rover (format JSON)" },
      { c: "Dimanche", d: "2 h", contenu: "Premier commit dans le dépôt privé github.com/pierre-claisse/rover-notes + page de notes de la semaine", res: "Votre dépôt rover-notes" },
    ],
    verif: "Sans notes : dessiner la rotation de 90° et montrer à l'écran les deux adresses (pile, tas) en expliquant laquelle est la plus haute", preuve: "Commit 1 : parseur + 3 tests verts + notes S1" },
  { n: "S2", date: "9 nov. 2026", theme: "Composition de matrices, pointeurs, shell",
    sais: ["Je sais expliquer qu'un produit de matrices est l'enchaînement de deux transformations, et que l'ordre compte", "Je sais manipuler pointeurs, pointeurs de pointeurs et tableaux en C, et expliquer p[i] == *(p+i)", "Je sais écrire un script bash avec variables, boucles, pipes et redirections", "Je sais utiliser grep, find, chmod, chown et lire ls -l"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 4 et 5 (multiplication = composition, transformations 3D). Exercice : rotation de 90° puis symétrie, contre symétrie puis rotation : comparer les résultats", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "C : pointeurs et tableaux ; fonction qui inverse un tableau en place ; passer une structure par pointeur", res: "Missing Semester (outils) + man pages" },
      { c: "Samedi", d: "4 h", contenu: "1 h 30 shell (Missing Semester : shell, scripts) ; 2 h 30 : étendre le parseur aux trames invalides (accolade manquante, nombre mal formé), 5 tests de plus", res: "https://missing.csail.mit.edu/" },
      { c: "Dimanche", d: "2 h", contenu: "Notes : schéma pile/tas/pointeurs ; script bash qui lance les tests ; planifier S3", res: "rover-notes" },
    ],
    verif: "Prédire à la main le résultat de A·B et B·A pour deux matrices 2×2 simples, puis vérifier en Python", preuve: "Commit : tests d'erreurs + script run_tests.sh" },
  { n: "S3", date: "16 nov. 2026", theme: "Déterminant, mémoire dynamique, électricité de base",
    sais: ["Je sais dire ce que mesure un déterminant (facteur d'aire) et ce que signifie un déterminant nul", "Je sais allouer, libérer et détecter une fuite mémoire (valgrind ou -fsanitize=address)", "Je sais appliquer la loi d'Ohm U = R·I et la puissance P = U·I sur un circuit simple", "Je sais expliquer tension, courant et résistance avec mes propres mots"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 6 et 7 (déterminant ; inverse, espace colonne, noyau). Exercice : déterminant de la rotation de 90° et pourquoi il vaut 1", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "C : malloc/free, tampon circulaire pour recevoir des octets série ; compiler avec -fsanitize=address", res: "Documentation gcc (sanitizers)" },
      { c: "Samedi", d: "4 h", contenu: "1 h 30 électricité : tension, courant, résistance, loi d'Ohm. 2 h 30 : brancher le tampon circulaire au parseur (lecture octet par octet)", res: "https://learn.sparkfun.com/tutorials/voltage-current-resistance-and-ohms-law" },
      { c: "Dimanche", d: "2 h", contenu: "Notes : 5 calculs de loi d'Ohm à la main ; commit ; planifier S4", res: "rover-notes" },
    ],
    verif: "Calculer le courant dans une LED avec résistance de 220 Ω sous 3,3 V (chute LED 2 V)", preuve: "Commit : tampon circulaire + tests, zéro erreur ASan" },
  { n: "S4", date: "23 nov. 2026", theme: "Matrices non carrées, produit scalaire, PWM, endianness",
    sais: ["Je sais calculer un produit scalaire et l'interpréter comme une projection", "Je sais expliquer la PWM : rapport cyclique, fréquence, et pourquoi elle règle la vitesse d'un moteur", "Je sais ce qu'est l'endianness et lire un entier 16 bits petit-boutiste dans un tableau d'octets", "Je sais quand utiliser volatile en C et pourquoi"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 8 et 9 (matrices non carrées ; produit scalaire et dualité). Exercice : angle entre le cap du robot et la direction d'une cible", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "C : opérations bit à bit, masques, décalages ; fonctions read_u16_le / read_u16_be testées ; volatile", res: "man pages ; Missing Semester" },
      { c: "Samedi", d: "4 h", contenu: "1 h 30 PWM et pont en H (principe). 2 h 30 : simuler en C une PWM logicielle (tableau de niveaux) et tracer le signal en Python", res: "https://learn.sparkfun.com/tutorials/pulse-width-modulation" },
      { c: "Dimanche", d: "2 h", contenu: "Semaine allégeable (1 semaine sur 4 selon le plan) : notes, commit, rattrapage", res: "rover-notes" },
    ],
    verif: "Expliquer sans notes pourquoi une PWM à 25 % donne en moyenne un quart de la tension d'alimentation", preuve: "Commit : fonctions d'endianness testées + graphe PWM" },
  { n: "S5", date: "30 nov. 2026", theme: "Produit vectoriel, bus série, C++ et RAII",
    sais: ["Je sais calculer un produit vectoriel et dire à quoi il sert (normale, sens de rotation)", "Je sais expliquer UART, I2C et SPI : fils, horloge, adressage, débit, et lequel relie le Pi à l'ESP32", "Je sais écrire une classe C++ qui libère sa ressource dans son destructeur (RAII)", "Je sais utiliser std::vector, std::string et std::unique_ptr à la place de malloc"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 10 et 11 (produit vectoriel). Exercice : le robot doit-il tourner à gauche ou à droite pour viser une cible ? (signe du produit vectoriel 2D)", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "C++ : réécrire le tampon circulaire en classe RAII ; tests", res: "Documentation cppreference" },
      { c: "Samedi", d: "4 h", contenu: "2 h bus série : UART puis I2C. 2 h : tableau comparatif UART/I2C/SPI dans les notes ; schéma Pi 5 ↔ UART ↔ ESP32 d'après le wiki", res: "https://learn.sparkfun.com/tutorials/serial-communication ; https://learn.sparkfun.com/tutorials/i2c ; wiki UGV Rover" },
      { c: "Dimanche", d: "2 h", contenu: "Commit ; première version du schéma d'architecture (sur papier puis en image)", res: "rover-notes" },
    ],
    verif: "Dire sans notes quel bus utilise une adresse sur 7 bits et lequel n'a pas de fil d'horloge", preuve: "Commit : classe C++ RAII + schéma d'architecture v1" },
  { n: "S6", date: "7 déc. 2026", theme: "Changement de base, datasheet INA219, cross-compilation",
    sais: ["Je sais passer un point du repère du robot au repère du monde (changement de base)", "Je sais lire une datasheet : brochage, registres, formules de conversion", "Je sais recalculer à la main tension et courant à partir des registres bruts de l'INA219", "Je sais ce qu'est la cross-compilation et compiler un binaire ARM64 depuis mon PC"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 12 et 13 (règle de Cramer ; changement de base). Exercice : robot en (2,1) orienté à 90°, où est dans le monde un point situé à 1 m devant lui ?", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "Cross-compilation : chaîne aarch64 (conda ou conteneur), compiler le parseur pour ARM64, vérifier avec file / qemu", res: "Documentation gcc" },
      { c: "Samedi", d: "4 h", contenu: "Datasheet INA219 : registres shunt/bus, calibration. Exercice : à partir de valeurs brutes d'exemple, recalculer la tension et le courant à la main puis en C", res: "https://www.ti.com/lit/ds/symlink/ina219.pdf" },
      { c: "Dimanche", d: "2 h", contenu: "Notes « comment lire une datasheet » ; commit", res: "rover-notes" },
    ],
    verif: "Convertir à la main une valeur brute de registre bus de l'INA219 en volts", preuve: "Commit : convertisseur INA219 en C + tests, binaire ARM64" },
  { n: "S7", date: "14 déc. 2026", theme: "Valeurs propres, Rust (ownership), CI",
    sais: ["Je sais dire ce qu'est un vecteur propre et pourquoi une rotation 2D n'en a pas de réel", "Je sais expliquer ownership, emprunt et durée de vie en Rust sur un exemple", "Je sais écrire une fonction Rust testée avec cargo test", "Je sais mettre en place une CI GitHub Actions qui compile et teste le code C"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisodes 14 et 15 (vecteurs et valeurs propres). Exercice : valeurs propres de [[2,0],[0,3]] et de la rotation de 90°", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "Rust Book ch. 1 à 4 (installation, ownership)", res: "https://doc.rust-lang.org/book/" },
      { c: "Samedi", d: "4 h", contenu: "2 h : workflow GitHub Actions qui lance make test sur le parseur C. 2 h : Rust Book ch. 5 et 6 (struct, enum, match)", res: "Documentation GitHub Actions ; Rust Book" },
      { c: "Dimanche", d: "2 h", contenu: "Notes ; commit ; badge CI", res: "rover-notes" },
    ],
    verif: "Expliquer pourquoi un code Rust qui utilise une String après l'avoir déplacée ne compile pas", preuve: "Commit : CI verte sur le test C (moitié du critère de fin P0)" },
  { n: "S8", date: "21 déc. 2026", theme: "Rust : erreurs, traits ; parseur en Rust",
    sais: ["Je sais gérer les erreurs en Rust avec Result, Option et l'opérateur ?", "Je sais définir et implémenter un trait", "Je sais porter le parseur de trames en Rust avec tests", "Je sais expliquer ce que signifie no_std et ce qu'on perd sans la bibliothèque standard"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "Épisode 16 (espaces vectoriels abstraits) + révision des 15 premiers avec 5 exercices papier", res: "Playlist 3Blue1Brown" },
      { c: "Jeudi", d: "1 h 30", contenu: "Rust Book ch. 8 à 10 (collections, erreurs, traits et génériques)", res: "https://doc.rust-lang.org/book/" },
      { c: "Samedi", d: "4 h", contenu: "Porter le parseur C en Rust, mêmes tests ; lire l'introduction et no_std dans The Embedded Rust Book", res: "https://docs.rust-embedded.org/book/" },
      { c: "Dimanche", d: "2 h", contenu: "Semaine de fêtes, allégeable : notes C vs Rust, commit", res: "rover-notes" },
    ],
    verif: "Donner sans notes deux choses indisponibles en no_std (allocation dynamique par défaut, std::fs…)", preuve: "Commit : parseur Rust + tests" },
  { n: "S9", date: "28 déc. 2026", theme: "MIT 18.06, ROS 2 en simulation, bilan P0",
    sais: ["Je sais résoudre un petit système linéaire par élimination (vue « lignes » et vue « colonnes »)", "Je sais installer ROS 2 Humble (conteneur) et lancer un nœud talker/listener", "Je sais expliquer chaque fil entre le Pi et l'ESP32 d'après la documentation", "Je sais rédiger en anglais une page technique claire avec schéma"],
    slots: [
      { c: "Mardi", d: "1 h 30", contenu: "MIT 18.06, cours 1 et 2 (géométrie des équations, élimination)", res: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/" },
      { c: "Jeudi", d: "1 h 30", contenu: "ROS 2 Humble dans un conteneur : tutoriels CLI (nœuds, topics)", res: "https://docs.ros.org/en/humble/Tutorials.html" },
      { c: "Samedi", d: "4 h", contenu: "Brouillon de l'article EN « Reverse-engineering my rover's architecture » à partir du wiki et des dépôts ugv_base_ros / ugv_rpi", res: "Wiki UGV Rover ; github.com/waveshareteam" },
      { c: "Dimanche", d: "2 h", contenu: "Bilan P0 : relire les « Je sais… », noter ce qui manque ; planifier P1", res: "rover-notes" },
    ],
    verif: "Expliquer à voix haute, sans notes, l'architecture Pi 5 ↔ UART ↔ ESP32 en 3 minutes (enregistrement)", preuve: "Commit : brouillon d'article + bilan P0" },
];

const phases = [
  ["P0", "Fondations", "M1–M2", "80 h", "Repo rover-notes + article EN « Reverse-engineering my rover's architecture »", "Vous expliquez sans notes chaque fil entre le Pi et l'ESP32 et un test C passe en CI"],
  ["P1", "Firmware ESP32 en C++", "M3–M4", "100 h", "Fork documenté + article « Tuning wheel PID with real step responses »", "Dépassement < 10 % mesuré, protocole binaire avec taux d'erreur mesuré sur 1 h"],
  ["P2", "IMU, fusion, Rust embarqué", "M5–M7", "140 h", "Repo rover-fw-rs + vidéo C++ vs Rust + article EKF", "Le Rover roule sur votre firmware Rust, watchdog testé, erreur EKF chiffrée"],
  ["P3", "ROS 2, simulation, dashboard", "M7–M9", "120 h", "Repo rover_ros2 + dashboard + vidéo « same code, sim and real »", "Bascule sim/réel par un argument de launch ; latence vidéo mesurée"],
  ["P4", "Perception", "M10–M11", "100 h", "Vidéo de suivi de tag + benchmark d'inférence Pi 5", "Erreur de pose AprilTag mesurée ; tableau FPS/latence publié"],
  ["P5", "Localisation, SLAM, Nav2", "M12–M13", "100 h", "Vidéo de navigation + carte + article « What actually drifts »", "10 navigations sur 10 vers 3 points, résultats publiés"],
  ["P6", "Rigueur industrielle", "M14–M15", "90 h", "CI publique avec badge HIL + article HIL", "Un bug réel attrapé par la CI HIL et documenté"],
  ["P7", "Capstone", "M16–M18", "130 h", "Repo, vidéo 3 min, article long, talk soumis", "Un ingénieur inconnu reproduit le résultat depuis votre README"],
];

type Theme = { t: string; items: string[] };
type PhaseK = { id: string; titre: string; blocs: string; themes: Theme[]; res: string };

const later: PhaseK[] = [
  { id: "P1", titre: "Firmware ESP32 en C++ (100 h, M3–M4)", blocs: "S10–S12 outillage et compilation reproductible · S13–S16 PID et réponse indicielle · S17–S18 temps réel et jitter · S19–S21 protocole binaire",
    themes: [
      { t: "Contrôle", items: ["Je sais expliquer une boucle fermée : consigne, mesure, erreur, commande", "Je sais dire le rôle de P, I et D et l'effet de chaque gain sur une réponse indicielle", "Je sais mesurer dépassement, temps de montée et erreur statique sur un graphe", "Je sais ce qu'est la saturation et corriger le windup de l'intégrale"] },
      { t: "Temps réel", items: ["Je sais créer des tâches FreeRTOS et choisir leurs priorités", "Je sais pourquoi une ISR doit être courte et comment passer une donnée d'une ISR à une tâche", "Je sais mesurer le jitter d'une boucle par timestamps ou analyseur logique"] },
      { t: "Capteurs et protocole", items: ["Je sais lire un encodeur en quadrature et en déduire une vitesse filtrée", "Je sais encoder/décoder une trame COBS et calculer un CRC16", "Je sais détecter les trames perdues avec un numéro de séquence et mesurer un taux d'erreur"] },
      { t: "Outillage", items: ["Je sais compiler et flasher ugv_base_ros de façon reproductible (PlatformIO ou arduino-cli)", "Je sais tracer des mesures avec Python/matplotlib"] },
    ], res: "Brian Douglas (YouTube) · ugv_base_ros · FreeRTOS · PlatformIO" },
  { id: "P2", titre: "IMU, fusion de capteurs, Rust embarqué (140 h, M5–M7)", blocs: "S22–S25 probabilités et filtre complémentaire · S26–S29 rotations et quaternions · S30–S33 EKF · S34–S37 Rust embassy et watchdog",
    themes: [
      { t: "Probabilités et filtrage", items: ["Je sais ce que représentent moyenne, variance et gaussienne", "Je sais écrire un filtre complémentaire gyroscope + accéléromètre", "Je sais dérouler les étapes prédiction / mise à jour d'un filtre de Kalman", "Je sais linéariser un modèle pour un EKF et chiffrer son erreur sur un log"] },
      { t: "Rotations", items: ["Je sais passer d'angles d'Euler à une matrice de rotation et à un quaternion", "Je sais expliquer le blocage de cardan (gimbal lock)", "Je sais calibrer un magnétomètre (hard iron, soft iron)"] },
      { t: "Rust embarqué", items: ["Je sais écrire un driver I2C no_std avec les traits embedded-hal", "Je sais écrire des tâches async avec embassy", "Je sais porter boucle moteur + PID + protocole binaire en Rust", "Je sais implémenter un watchdog qui coupe les moteurs après 200 ms sans trame"] },
    ], res: "Labbe, Kalman and Bayesian Filters in Python · Modern Robotics ch. 3 · Embedded Rust Book · esp-hal · Embassy book" },
  { id: "P3", titre: "ROS 2, simulation, dashboard web (120 h, M7–M9)", blocs: "S38–S41 concepts ROS 2 et tf2 · S42–S45 URDF, Gazebo, ros2_control · S46–S50 dashboard React + WebRTC",
    themes: [
      { t: "ROS 2", items: ["Je sais écrire nœuds, topics, services et actions", "Je sais choisir une QoS et expliquer reliable vs best effort", "Je sais écrire un fichier launch avec arguments", "Je sais publier et lire des transformations tf2"] },
      { t: "Modélisation et simulation", items: ["Je sais décrire le Rover en URDF/xacro", "Je sais lancer le même code en Gazebo et sur le robot", "Je sais écrire un hardware_interface ros2_control pour mon protocole"] },
      { t: "Web", items: ["Je sais streamer la vidéo en WebRTC et mesurer la latence bout en bout", "Je sais afficher télémétrie batterie/IMU et téléopérer depuis React"] },
    ], res: "ROS 2 Humble docs · ros2_control · Gazebo docs · Articulated Robotics" },
  { id: "P4", titre: "Perception (100 h, M10–M11)", blocs: "S51–S53 modèle de caméra et calibration fisheye · S54–S56 AprilTag et pan-tilt · S57–S59 inférence embarquée",
    themes: [
      { t: "Caméra", items: ["Je sais expliquer le modèle sténopé et les paramètres intrinsèques", "Je sais calibrer une caméra fisheye et publier camera_info", "Je sais ce qu'est la distorsion et la corriger"] },
      { t: "Géométrie", items: ["Je sais estimer la pose d'un AprilTag et mesurer son erreur", "Je sais expliquer le principe de l'odométrie visuelle"] },
      { t: "Inférence", items: ["Je sais mesurer FPS et latence d'un détecteur sur Pi 5", "Je sais ce que la quantification change en vitesse et en précision"] },
    ], res: "OpenCV docs · AprilTag · Hailo RPi5 examples" },
  { id: "P5", titre: "Localisation, SLAM, Nav2 (100 h, M12–M13)", blocs: "S60–S62 filtre particulaire et SLAM · S63–S65 SLAM Toolbox avec LIDAR · S66–S68 Nav2 et comparaison d'odométries",
    themes: [
      { t: "Localisation", items: ["Je sais expliquer un filtre particulaire (AMCL)", "Je sais fusionner roues + IMU avec robot_localization", "Je sais mesurer la dérive de chaque source d'odométrie"] },
      { t: "SLAM et navigation", items: ["Je sais expliquer le SLAM par graphe et la fermeture de boucle", "Je sais construire une carte avec SLAM Toolbox", "Je sais configurer costmaps, planificateurs global/local et behavior trees dans Nav2"] },
    ], res: "Probabilistic Robotics (Thrun et al.) · Nav2 docs · SLAM Toolbox" },
  { id: "P6", titre: "Rigueur industrielle (90 h, M14–M15)", blocs: "S69–S72 banc HIL et CI · S73–S75 MCAP, Foxglove, replay · S76–S78 sûreté et OTA",
    themes: [
      { t: "Tests", items: ["Je sais distinguer tests unitaires, d'intégration et HIL", "Je sais faire tourner un banc HIL à chaque commit"] },
      { t: "Observabilité", items: ["Je sais enregistrer en rosbag2/MCAP et rejouer un log de façon déterministe", "Je sais transformer un log en test de régression"] },
      { t: "Sûreté", items: ["Je sais définir des états dégradés et un arrêt d'urgence", "Je sais faire une mise à jour OTA signée avec retour arrière"] },
    ], res: "MCAP · Foxglove docs" },
  { id: "P7", titre: "Capstone (130 h, M16–M18)", blocs: "S79–S82 choix et prototype · S83–S90 réalisation et mesures · S91–S94 article, vidéo, talk",
    themes: [
      { t: "Selon l'option", items: ["A : je sais construire une pile 100 % Rust (embassy + ros2_rust)", "B : je sais entraîner un contrôle en simulation et mesurer l'écart sim-to-real", "C : je sais coordonner deux robots et partager une carte"] },
      { t: "Communication", items: ["Je sais écrire un README qu'un inconnu reproduit", "Je sais présenter un résultat en 3 minutes de vidéo et en talk"] },
    ], res: "ros2_rust · Underactuated Robotics · ROSCon · F1TENTH" },
];

const referentiel: [string, string[]][] = [
  ["Linux", ["SSH, systemd, journalctl", "Permissions, groupes, dialout, udev", "Scripts bash", "Cross-compilation ARM64"]],
  ["C/C++", ["Pointeurs, pile vs tas", "Mémoire dynamique sans fuite", "Bits, endianness, volatile", "RAII, conteneurs standard", "Tests unitaires et CI"]],
  ["Électronique", ["Loi d'Ohm, puissance", "PWM, pont en H", "UART, I2C, SPI", "Lire une datasheet (INA219, IMU)", "Encodeurs"]],
  ["Rust", ["Ownership, emprunt", "Result, Option, traits", "no_std, embedded-hal", "embassy async"]],
  ["Maths", ["Transformations, matrices, déterminant", "Changement de base, valeurs propres", "Probabilités, gaussiennes", "Kalman, EKF", "Rotations, quaternions", "PID, réponse indicielle"]],
  ["ROS 2", ["Nœuds, topics, services, actions, QoS", "Launch, tf2", "URDF, Gazebo", "ros2_control"]],
  ["Perception", ["Modèle sténopé, calibration fisheye", "Pose AprilTag", "Inférence embarquée mesurée"]],
  ["SLAM/Nav2", ["Filtre particulaire", "SLAM Toolbox", "Nav2 : costmaps, planificateurs, BT", "robot_localization"]],
  ["Tests/CI/HIL", ["CI GitHub Actions", "Banc HIL", "MCAP, Foxglove, replay", "Watchdog, OTA signé"]],
  ["Portfolio", ["Un article EN par phase", "Une vidéo de mesure par phase", "Contribution upstream", "Talk soumis"]],
];

export default function App() {
  const [w, setW] = useState<string>("S1");
  const [ph, setPh] = useState<string>("P1");
  const wk = weeks.find((x: Week) => x.n === w) ?? weeks[0];
  const pk = later.find((x: PhaseK) => x.id === ph) ?? later[0];
  return (
    <Page title="Programme d'étude : ce que vous devez savoir, semaine par semaine" summary="La liste exacte de ce que vous devez savoir pour passer du front-end à la robotique embarquée en 18 mois, à environ 9 h par semaine, avec les 9 semaines de P0 détaillées." width="column" lang="fr">
      <TableOfContents items={[{ label: "Mode d'emploi" }, { label: "Vue d'ensemble des 18 mois" }, { label: "Piste maths" }, { label: "Phase P0 semaine par semaine" }, { label: "Quand le robot arrive" }, { label: "Phases P1 à P7 : ce qu'il faut savoir" }, { label: "Référentiel de compétences" }, { label: "Ressources" }]} />

      <Section heading="Mode d'emploi">
        <Text>Chaque semaine, lisez les « Je sais… » d'abord : c'est ce que vous devez savoir faire le dimanche, quelle que soit votre façon d'étudier.</Text>
        <Callout tone="info" lead="Le détail est indicatif au-delà de 8 semaines.">Les semaines S1 à S9 sont précises. Au-delà, les blocs sont une estimation et seront affinés chaque dimanche lors de la planification. Robot pas encore acheté : les samedis se font sans robot (Linux, C/C++, Rust, maths, ROS 2 en simulation).</Callout>
      </Section>

      <Section heading="Vue d'ensemble des 18 mois">
        <Table columns={["Phase", "Nom", "Mois", "Heures", "Livrable", "C'est acquis quand…"]} rows={phases} />
        <Text>Total : 860 h de projet plus environ 100 h de maths réparties. Une semaine sur quatre peut être allégée ; prévoyez 20 % de marge.</Text>
      </Section>

      <Section heading="Piste maths">
        <Table columns={["Sujet", "Ressource", "Quand"]} rows={[
          ["Algèbre linéaire", "3Blue1Brown puis MIT 18.06 (Strang)", "M1–M4"],
          ["Contrôle (PID, espace d'état)", "Brian Douglas (YouTube)", "M3–M5"],
          ["Kalman, EKF", "Kalman and Bayesian Filters in Python (Labbe)", "M5–M7"],
          ["Cinématique, rotations", "Modern Robotics (Lynch & Park)", "M5–M9"],
          ["Probabilités, SLAM", "Probabilistic Robotics (Thrun et al.)", "M11–M13"],
          ["Contrôle avancé (option)", "Underactuated Robotics (MIT)", "M15+"],
        ]} />
        <Text>Le créneau du mardi porte la piste maths. Règle du plan : chaque concept est implémenté une fois à la main en Python ou Rust avant d'utiliser une bibliothèque.</Text>
      </Section>

      <Section heading="Phase P0 semaine par semaine">
        <Segmented options={weeks.map((x: Week) => ({ value: x.n, label: x.n }))} value={w} onChange={(v: string) => setW(v)} />
        <Properties items={[{ label: "Semaine", value: wk.n + " · lundi " + wk.date }, { label: "Thème", value: wk.theme }, { label: "Volume", value: "9 h : mardi 1 h 30, jeudi 1 h 30, samedi 4 h, dimanche 2 h" }]} />
        <Section heading="Ce que vous devez savoir le dimanche">
          <Checklist items={wk.sais.map((s: string) => ({ text: s, done: false }))} />
        </Section>
        <Section heading="Les 4 créneaux">
          <Table columns={["Créneau", "Durée", "Contenu", "Ressource"]} rows={wk.slots.map((s: Slot) => [s.c, s.d, s.contenu, s.res])} />
        </Section>
        <Section heading="Vérification et preuve">
          <Properties items={[{ label: "Exercice de vérification", value: wk.verif }, { label: "Preuve à produire", value: wk.preuve }]} />
        </Section>
        <Text>Statut au 3 nov. 2026 : 0 h faite, aucune case acquise. Dites-moi ce que vous savez et je mettrai la page à jour.</Text>
      </Section>

      <Section heading="Quand le robot arrive">
        <BulletList items={["Installer l'image ROS 2 du Rover et compléter le schéma Pi 5 ↔ UART ↔ ESP32 avec ce que vous voyez réellement", "Piloter le Rover depuis un script Python avec les commandes JSON du wiki (réutiliser votre parseur pour vérifier les trames)", "Comparer vos calculs INA219 de S6 avec la tension et le courant affichés sur l'OLED", "Ces exercices remplacent le samedi de la semaine d'arrivée ; P1 commence ensuite"]} />
      </Section>

      <Section heading="Phases P1 à P7 : ce qu'il faut savoir">
        <Segmented options={later.map((x: PhaseK) => ({ value: x.id, label: x.id }))} value={ph} onChange={(v: string) => setPh(v)} />
        <Properties items={[{ label: "Phase", value: pk.titre }, { label: "Blocs indicatifs", value: pk.blocs }, { label: "Ressources du plan", value: pk.res }]} />
        {pk.themes.map((t: Theme) => (
          <Section key={t.t} heading={t.t}>
            <BulletList items={t.items} />
          </Section>
        ))}
      </Section>

      <Section heading="Référentiel de compétences">
        <Text>Statut enregistré au 3 nov. 2026 : rien d'acquis pour l'instant. Les cases ne se cochent pas depuis la page ; demandez-moi et je les coche.</Text>
        <Checklist items={referentiel.flatMap(([d, list]: [string, string[]]) => list.map((s: string) => ({ text: s, meta: d, done: false })))} />
      </Section>

      <Section heading="Ressources">
        <LinkCards links={[
          { title: "Essence of linear algebra", site: "youtube.com", href: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab" },
          { title: "MIT 18.06 Linear Algebra", site: "ocw.mit.edu", href: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/" },
          { title: "The Missing Semester", site: "mit.edu", href: "https://missing.csail.mit.edu/" },
          { title: "Loi d'Ohm", site: "sparkfun.com", href: "https://learn.sparkfun.com/tutorials/voltage-current-resistance-and-ohms-law" },
          { title: "PWM", site: "sparkfun.com", href: "https://learn.sparkfun.com/tutorials/pulse-width-modulation" },
          { title: "Communication série", site: "sparkfun.com", href: "https://learn.sparkfun.com/tutorials/serial-communication" },
          { title: "I2C", site: "sparkfun.com", href: "https://learn.sparkfun.com/tutorials/i2c" },
          { title: "Datasheet INA219", site: "ti.com", href: "https://www.ti.com/lit/ds/symlink/ina219.pdf" },
          { title: "The Rust Book", site: "rust-lang.org", href: "https://doc.rust-lang.org/book/" },
          { title: "The Embedded Rust Book", site: "rust-embedded.org", href: "https://docs.rust-embedded.org/book/" },
          { title: "Wiki UGV Rover PI ROS2", site: "waveshare.com", href: "https://www.waveshare.com/wiki/UGV_Rover_PI_ROS2" },
          { title: "ugv_base_ros", site: "github.com", href: "https://github.com/waveshareteam/ugv_base_ros" },
          { title: "ugv_rpi", site: "github.com", href: "https://github.com/waveshareteam/ugv_rpi" },
          { title: "ROS 2 Humble tutoriels", site: "docs.ros.org", href: "https://docs.ros.org/en/humble/Tutorials.html" },
          { title: "FreeRTOS kernel", site: "freertos.org", href: "https://www.freertos.org/Documentation/02-Kernel/01-About-the-FreeRTOS-kernel/01-FreeRTOS-kernel" },
          { title: "PlatformIO", site: "platformio.org", href: "https://docs.platformio.org/en/latest/" },
          { title: "Brian Douglas, contrôle", site: "youtube.com", href: "https://www.youtube.com/@BrianBDouglas" },
          { title: "Kalman and Bayesian Filters in Python", site: "github.com", href: "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python" },
          { title: "Modern Robotics", site: "northwestern.edu", href: "https://hades.mech.northwestern.edu/index.php/Modern_Robotics" },
          { title: "esp-hal", site: "github.com", href: "https://github.com/esp-rs/esp-hal" },
          { title: "Embassy book", site: "embassy.dev", href: "https://embassy.dev/book/" },
          { title: "ros2_control", site: "control.ros.org", href: "https://control.ros.org/" },
          { title: "Gazebo docs", site: "gazebosim.org", href: "https://gazebosim.org/docs/" },
          { title: "Articulated Robotics", site: "youtube.com", href: "https://www.youtube.com/@ArticulatedRobotics" },
          { title: "OpenCV docs", site: "opencv.org", href: "https://docs.opencv.org/4.x/" },
          { title: "AprilTag", site: "github.com", href: "https://github.com/AprilRobotics/apriltag" },
          { title: "Nav2 docs", site: "nav2.org", href: "https://docs.nav2.org/" },
          { title: "SLAM Toolbox", site: "github.com", href: "https://github.com/SteveMacenski/slam_toolbox" },
          { title: "MCAP", site: "mcap.dev", href: "https://mcap.dev/" },
          { title: "Foxglove docs", site: "foxglove.dev", href: "https://docs.foxglove.dev/" },
          { title: "ros2_rust", site: "github.com", href: "https://github.com/ros2-rust/ros2_rust" },
          { title: "Underactuated Robotics", site: "mit.edu", href: "https://underactuated.mit.edu/" },
        ]} />
      </Section>
    </Page>
  );
}



```
