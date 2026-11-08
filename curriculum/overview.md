# Plan d’ensemble — contenu intégral
## Phases (données structurées du Canvas)
### P0 — Fondations (M1–M2, 80 h)
#### Objectifs théoriques et pourquoi
- Linux (systemd, udev, permissions série), shell, SSH, cross-compilation : c'est l'OS de 90 % des robots
- C/C++ moderne : pointeurs, stack vs heap, RAII, `volatile`, endianness : la mémoire que le web cache
- Électronique de base : loi d'Ohm, PWM, pont en H, UART/I2C/SPI, lire une datasheet (INA219, IMU)
- Rust : ownership, traits, `no_std` (lecture du Rust Book en parallèle)

#### Exercices concrets
- Installer l'image ROS 2 du Rover, cartographier son architecture (Pi 5 ↔ UART ↔ ESP32) dans un schéma
- Piloter le Rover depuis un script Python en envoyant les commandes JSON documentées sur le wiki
- Écrire en C un parseur de trames avec tests unitaires, sans IA pour la première version
- Lire la datasheet de l'INA219 et recalculer à la main la tension/courant affichés

**Livrable :** Repo `rover-notes` + article EN « Reverse-engineering my rover's architecture »

**Terminé quand :** Tu sais expliquer sans notes chaque fil entre le Pi et l'ESP32 et tu as un test C qui passe en CI

### P1 — Firmware ESP32 en C++ (M3–M4, 100 h)
#### Objectifs théoriques et pourquoi
- Contrôle : boucle fermée, PID, réponse indicielle, saturation et anti-windup (vidéos Brian Douglas)
- Temps réel : FreeRTOS, priorités, jitter, ISR courtes
- Encodeurs, échantillonnage, filtrage de vitesse

#### Exercices concrets
- Forker `ugv_base_ros`, le compiler et le flasher ; rendre la compilation reproductible (PlatformIO ou arduino-cli)
- Mesurer la réponse indicielle d'une roue, la tracer (Python/matplotlib), régler le PID et montrer avant/après
- Mesurer le jitter de la boucle de contrôle à l'oscilloscope logique ou par timestamps
- Remplacer le JSON par un protocole binaire maison (COBS + CRC16) avec numéro de séquence

**Livrable :** Fork documenté + article « Tuning wheel PID with real step responses » + graphes

**Terminé quand :** Dépassement < 10 % mesuré, protocole binaire avec taux d'erreur mesuré sur 1 h de trafic

### P2 — IMU, fusion de capteurs, Rust embarqué (M5–M7, 140 h)
#### Objectifs théoriques et pourquoi
- Probabilités, gaussiennes, filtre complémentaire puis filtre de Kalman étendu (Labbe)
- Rotations : quaternions, angles d'Euler, gimbal lock (Modern Robotics ch. 3)
- Rust embarqué : esp-hal, embassy (async sans OS), HAL et traits embedded-hal

#### Exercices concrets
- Driver IMU 9 axes en Rust `no_std`, calibration magnétomètre (hard/soft iron)
- Filtre complémentaire puis EKF pour l'orientation ; comparer les deux sur un même log
- Porter la boucle moteur + PID + protocole binaire en Rust/embassy sur l'ESP32
- Watchdog : moteurs coupés si plus de trame depuis 200 ms

**Livrable :** Repo `rover-fw-rs` (firmware Rust complet) + vidéo comparatif C++ vs Rust + article EKF

**Terminé quand :** Le Rover roule sur ton firmware Rust, avec watchdog testé et un EKF dont l'erreur est chiffrée

### P3 — ROS 2, simulation, dashboard web (M7–M9, 120 h)
#### Objectifs théoriques et pourquoi
- ROS 2 : nœuds, topics, services, actions, QoS, launch, tf2
- URDF/xacro, Gazebo, ros2_control (hardware interface)
- WebRTC, latence vidéo, sérialisation

#### Exercices concrets
- Écrire un `hardware_interface` ros2_control qui parle ton protocole binaire
- URDF exact du Rover, même code en simulation Gazebo et sur le vrai robot
- Dashboard React : téléopération, télémétrie batterie/IMU, vidéo WebRTC, latence affichée

**Livrable :** Repo `rover_ros2` + dashboard + vidéo « same code, sim and real »

**Terminé quand :** Bascule sim/réel par un seul argument de launch ; latence vidéo bout-en-bout mesurée

### P4 — Perception (M10–M11, 100 h)
#### Objectifs théoriques et pourquoi
- Modèle sténopé, distorsion fisheye (caméra 160°), calibration
- Géométrie multi-vues, odométrie visuelle
- Inférence embarquée : quantification, profiling CPU/NPU

#### Exercices concrets
- Calibrer la caméra fisheye, publier `camera_info`
- Détection AprilTag et estimation de pose ; suivi de tag par la tourelle pan-tilt
- Détecteur type YOLO sur Pi 5 : mesurer FPS/latence CPU, puis avec Hailo (option)

**Livrable :** Vidéo du Rover qui suit un tag + article benchmark d'inférence sur Pi 5

**Terminé quand :** Erreur de pose AprilTag mesurée contre un mètre ruban ; tableau FPS/latence publié

### P5 — Localisation, SLAM, Nav2 (M12–M13, 100 h)
#### Objectifs théoriques et pourquoi
- Filtre particulaire, SLAM par graphe (Probabilistic Robotics)
- Planification globale/locale, costmaps, behavior trees
- Fusion odométrie roues + IMU (robot_localization)

#### Exercices concrets
- Monter le LIDAR D500, carte de l'appartement avec SLAM Toolbox
- Nav2 : navigation autonome point à point, puis patrouille
- Comparer odométrie roues, roues+IMU (EKF), et localisation LIDAR

**Livrable :** Vidéo de navigation autonome + carte + article « What actually drifts »

**Terminé quand :** 10 navigations sur 10 réussies vers 3 points, taux de réussite et temps publiés

### P6 — Rigueur industrielle (M14–M15, 90 h)
#### Objectifs théoriques et pourquoi
- Tests (unitaires, intégration, hardware-in-the-loop), CI
- Observabilité : rosbag2/MCAP, Foxglove, replay déterministe
- Sûreté : watchdogs, états dégradés, arrêt d'urgence ; mises à jour OTA

#### Exercices concrets
- Banc HIL : un second ESP32 ou le Pi teste le firmware à chaque commit
- Pipeline log → MCAP → Foxglove → test de régression rejoué
- OTA signé du firmware ESP32 avec rollback

**Livrable :** CI publique avec badge HIL + article « Hardware-in-the-loop for a hobby rover »

**Terminé quand :** Un bug réel attrapé par la CI HIL et documenté

### P7 — Capstone (M16–M18, 130 h)
#### Objectifs théoriques et pourquoi
- Selon le capstone : sim-to-real, apprentissage par renforcement, coordination multi-robot
- Écriture technique et présentation

#### Exercices concrets
- Option A : pile temps réel 100 % Rust (firmware embassy + nœuds ros2_rust)
- Option B : contrôle appris en simulation transféré sur le vrai Rover, avec mesure du gap sim-to-real
- Option C : 2 rovers (ou rover + sim) coordonnés, partage de carte

**Livrable :** Projet phare : repo, vidéo 3 min, article long, talk soumis (meetup ROS, ROSCon)

**Terminé quand :** Un ingénieur robotique inconnu comprend et reproduit le résultat depuis ton README

## Source intégrale et autres sections

La source ci-dessous conserve aussi l’intégralité des sections contexte, matériel, maths, portfolio, emploi/visa, semaine type, tracker et ressources.

# Plan d’ensemble — contenu intégral

Source : https://cursor.com/canvas/store-5b26d037-b305-4870-8d2e-d59cc2d6977f/db1bb61e-f76c-4448-96a4-302ffb6c6f4c

Export intégral du code source du Canvas (texte français, données, tableaux, ressources et interface ; aucune coupe ni reformulation). Les vues sélectionnables sont toutes présentes dans les données.

```tsx
import { Page, Section, Text, Callout, Table, Steps, BulletList, NumberedList, Checklist, LinkCards, Properties, Segmented, Grid, ProsCons, TableOfContents, Columns, Diagram, useState } from "grok/canvas";

type Phase = { id: string; nom: string; mois: string; heures: number; theorie: string[]; exercices: string[]; livrable: string; done: string };

const phases: Phase[] = [
  { id: "P0", nom: "Fondations", mois: "M1–M2", heures: 80,
    theorie: ["Linux (systemd, udev, permissions série), shell, SSH, cross-compilation : c'est l'OS de 90 % des robots", "C/C++ moderne : pointeurs, stack vs heap, RAII, `volatile`, endianness : la mémoire que le web cache", "Électronique de base : loi d'Ohm, PWM, pont en H, UART/I2C/SPI, lire une datasheet (INA219, IMU)", "Rust : ownership, traits, `no_std` (lecture du Rust Book en parallèle)"],
    exercices: ["Installer l'image ROS 2 du Rover, cartographier son architecture (Pi 5 ↔ UART ↔ ESP32) dans un schéma", "Piloter le Rover depuis un script Python en envoyant les commandes JSON documentées sur le wiki", "Écrire en C un parseur de trames avec tests unitaires, sans IA pour la première version", "Lire la datasheet de l'INA219 et recalculer à la main la tension/courant affichés"],
    livrable: "Repo `rover-notes` + article EN « Reverse-engineering my rover's architecture »", done: "Tu sais expliquer sans notes chaque fil entre le Pi et l'ESP32 et tu as un test C qui passe en CI" },
  { id: "P1", nom: "Firmware ESP32 en C++", mois: "M3–M4", heures: 100,
    theorie: ["Contrôle : boucle fermée, PID, réponse indicielle, saturation et anti-windup (vidéos Brian Douglas)", "Temps réel : FreeRTOS, priorités, jitter, ISR courtes", "Encodeurs, échantillonnage, filtrage de vitesse"],
    exercices: ["Forker `ugv_base_ros`, le compiler et le flasher ; rendre la compilation reproductible (PlatformIO ou arduino-cli)", "Mesurer la réponse indicielle d'une roue, la tracer (Python/matplotlib), régler le PID et montrer avant/après", "Mesurer le jitter de la boucle de contrôle à l'oscilloscope logique ou par timestamps", "Remplacer le JSON par un protocole binaire maison (COBS + CRC16) avec numéro de séquence"],
    livrable: "Fork documenté + article « Tuning wheel PID with real step responses » + graphes", done: "Dépassement < 10 % mesuré, protocole binaire avec taux d'erreur mesuré sur 1 h de trafic" },
  { id: "P2", nom: "IMU, fusion de capteurs, Rust embarqué", mois: "M5–M7", heures: 140,
    theorie: ["Probabilités, gaussiennes, filtre complémentaire puis filtre de Kalman étendu (Labbe)", "Rotations : quaternions, angles d'Euler, gimbal lock (Modern Robotics ch. 3)", "Rust embarqué : esp-hal, embassy (async sans OS), HAL et traits embedded-hal"],
    exercices: ["Driver IMU 9 axes en Rust `no_std`, calibration magnétomètre (hard/soft iron)", "Filtre complémentaire puis EKF pour l'orientation ; comparer les deux sur un même log", "Porter la boucle moteur + PID + protocole binaire en Rust/embassy sur l'ESP32", "Watchdog : moteurs coupés si plus de trame depuis 200 ms"],
    livrable: "Repo `rover-fw-rs` (firmware Rust complet) + vidéo comparatif C++ vs Rust + article EKF", done: "Le Rover roule sur ton firmware Rust, avec watchdog testé et un EKF dont l'erreur est chiffrée" },
  { id: "P3", nom: "ROS 2, simulation, dashboard web", mois: "M7–M9", heures: 120,
    theorie: ["ROS 2 : nœuds, topics, services, actions, QoS, launch, tf2", "URDF/xacro, Gazebo, ros2_control (hardware interface)", "WebRTC, latence vidéo, sérialisation"],
    exercices: ["Écrire un `hardware_interface` ros2_control qui parle ton protocole binaire", "URDF exact du Rover, même code en simulation Gazebo et sur le vrai robot", "Dashboard React : téléopération, télémétrie batterie/IMU, vidéo WebRTC, latence affichée"],
    livrable: "Repo `rover_ros2` + dashboard + vidéo « same code, sim and real »", done: "Bascule sim/réel par un seul argument de launch ; latence vidéo bout-en-bout mesurée" },
  { id: "P4", nom: "Perception", mois: "M10–M11", heures: 100,
    theorie: ["Modèle sténopé, distorsion fisheye (caméra 160°), calibration", "Géométrie multi-vues, odométrie visuelle", "Inférence embarquée : quantification, profiling CPU/NPU"],
    exercices: ["Calibrer la caméra fisheye, publier `camera_info`", "Détection AprilTag et estimation de pose ; suivi de tag par la tourelle pan-tilt", "Détecteur type YOLO sur Pi 5 : mesurer FPS/latence CPU, puis avec Hailo (option)"],
    livrable: "Vidéo du Rover qui suit un tag + article benchmark d'inférence sur Pi 5", done: "Erreur de pose AprilTag mesurée contre un mètre ruban ; tableau FPS/latence publié" },
  { id: "P5", nom: "Localisation, SLAM, Nav2", mois: "M12–M13", heures: 100,
    theorie: ["Filtre particulaire, SLAM par graphe (Probabilistic Robotics)", "Planification globale/locale, costmaps, behavior trees", "Fusion odométrie roues + IMU (robot_localization)"],
    exercices: ["Monter le LIDAR D500, carte de l'appartement avec SLAM Toolbox", "Nav2 : navigation autonome point à point, puis patrouille", "Comparer odométrie roues, roues+IMU (EKF), et localisation LIDAR"],
    livrable: "Vidéo de navigation autonome + carte + article « What actually drifts »", done: "10 navigations sur 10 réussies vers 3 points, taux de réussite et temps publiés" },
  { id: "P6", nom: "Rigueur industrielle", mois: "M14–M15", heures: 90,
    theorie: ["Tests (unitaires, intégration, hardware-in-the-loop), CI", "Observabilité : rosbag2/MCAP, Foxglove, replay déterministe", "Sûreté : watchdogs, états dégradés, arrêt d'urgence ; mises à jour OTA"],
    exercices: ["Banc HIL : un second ESP32 ou le Pi teste le firmware à chaque commit", "Pipeline log → MCAP → Foxglove → test de régression rejoué", "OTA signé du firmware ESP32 avec rollback"],
    livrable: "CI publique avec badge HIL + article « Hardware-in-the-loop for a hobby rover »", done: "Un bug réel attrapé par la CI HIL et documenté" },
  { id: "P7", nom: "Capstone", mois: "M16–M18", heures: 130,
    theorie: ["Selon le capstone : sim-to-real, apprentissage par renforcement, coordination multi-robot", "Écriture technique et présentation"],
    exercices: ["Option A : pile temps réel 100 % Rust (firmware embassy + nœuds ros2_rust)", "Option B : contrôle appris en simulation transféré sur le vrai Rover, avec mesure du gap sim-to-real", "Option C : 2 rovers (ou rover + sim) coordonnés, partage de carte"],
    livrable: "Projet phare : repo, vidéo 3 min, article long, talk soumis (meetup ROS, ROSCon)", done: "Un ingénieur robotique inconnu comprend et reproduit le résultat depuis ton README" },
];

const diff: Record<string, string> = { P0: "Moyenne", P1: "Élevée", P2: "Très élevée", P3: "Moyenne", P4: "Élevée", P5: "Élevée", P6: "Élevée", P7: "Très élevée" };

export default function App() {
  const [sel, setSel] = useState<string>("P0");
  const p = phases.find((x: Phase) => x.id === sel) ?? phases[0];
  return (
    <Page title="UGV Rover – plan d'auto-formation et de portfolio robotique" summary="18 mois, 8 à 12 h par semaine, pour passer du web aux robots avec le Waveshare UGV Rover PT PI5 AI Kit, et construire des preuves publiques lisibles par un employeur robotique américain." width="column" lang="fr">
      <TableOfContents items={[{ label: "Verdict honnête" }, { label: "Ce que le matériel permet vraiment" }, { label: "Feuille de route" }, { label: "Détail des phases" }, { label: "Piste maths et théorie" }, { label: "Options matérielles" }, { label: "Stratégie portfolio" }, { label: "Stratégie emploi et visa" }, { label: "Semaine type" }, { label: "Tracker" }, { label: "Ressources" }]} />

      <Section heading="Verdict honnête">
        <Callout lead="Faisable, mais pas magique.">Environ 960 h sur 18 mois suffisent pour un profil crédible d'ingénieur logiciel robotique ou embarqué junior-confirmé, avec un avantage rare : full-stack + firmware Rust + ROS 2. Cela ne remplace pas un master en robotique pour les postes de recherche (contrôle avancé, perception SOTA). Le visa est le goulot d'étranglement, pas les compétences.</Callout>
        <ProsCons pros={["7 ans de prod logicielle : tests, revues, déploiement, déjà acquis", "React + backend : rare chez les roboticiens, utile pour l'outillage et les dashboards", "Le Rover couvre firmware, ROS 2, perception et navigation sur une seule plateforme"]} cons={["Maths (algèbre linéaire, probas, contrôle) à reconstruire : le vrai mur", "Coder sans IA sur la partie bas niveau est indispensable pour apprendre", "Les offres US citent souvent un master/PhD ou une expérience robotique pro"]} />
      </Section>

      <Section heading="Ce que le matériel permet vraiment">
        <Properties items={[
          { label: "Hôte", value: "Raspberry Pi 5 (4 Go), ROS 2 Humble (dépôt `ugv_ws`, branche `ros2-humble-develop`)" },
          { label: "Sous-contrôleur", value: "ESP32 : moteurs + PID, IMU 9 axes, INA219, OLED, stabilisation pan-tilt ; firmware open source `ugv_base_ros` (C/Arduino)" },
          { label: "Lien Pi ↔ ESP32", value: "UART avec commandes JSON ; aussi HTTP et ESP-NOW" },
          { label: "Code Pi officiel", value: "`ugv_rpi` (Python, interface web, vision)" },
          { label: "Capteurs", value: "Caméra 5 MP 160° sur pan-tilt ; LIDAR D500 ou STL27L en option" },
          { label: "Prix du kit", value: "Affichés sur waveshare.com au 1er nov. 2026 : 244,99 $ et 486,99 $ selon la variante ; vérifie la tienne" },
        ]} />
        <Text>Le firmware ESP32 étant ouvert, le réécrire (C++ puis Rust) est le cœur différenciant du plan.</Text>
      </Section>

      <Section heading="Feuille de route">
        <Columns points={phases.map((x: Phase) => ({ label: x.id, value: x.heures, display: x.heures + " h" }))} emphasis={2} />
        <Diagram direction="horizontal" nodes={[{ id: "a", label: "Fondations" }, { id: "b", label: "Firmware C++" }, { id: "c", label: "Rust + fusion" }, { id: "d", label: "ROS 2 + web" }, { id: "e", label: "Perception" }, { id: "f", label: "SLAM + Nav2" }, { id: "g", label: "Rigueur" }, { id: "h", label: "Capstone", kind: "terminal" }]} edges={[{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" }, { from: "f", to: "g" }, { from: "g", to: "h" }]} />
        <Text>Heures estimées par phase ; total 860 h de projet plus environ 100 h de maths réparties. Prévois 20 % de marge : le matériel casse.</Text>
      </Section>

      <Section heading="Détail des phases">
        <Segmented options={phases.map((x: Phase) => ({ value: x.id, label: x.id }))} value={sel} onChange={(v: string) => setSel(v)} />
        <Properties items={[{ label: "Phase", value: p.nom }, { label: "Période", value: p.mois }, { label: "Heures estimées", value: p.heures + " h" }, { label: "Difficulté", value: diff[p.id] }]} />
        <Section heading="Objectifs théoriques et pourquoi">
          <BulletList items={p.theorie} />
        </Section>
        <Section heading="Exercices concrets">
          <NumberedList items={p.exercices} />
        </Section>
        <Section heading="Livrable public et définition de terminé">
          <Properties items={[{ label: "Livrable", value: p.livrable }, { label: "Terminé quand", value: p.done }]} />
        </Section>
      </Section>

      <Section heading="Piste maths et théorie">
        <Table columns={["Sujet", "Ressource", "Quand"]} rows={[
          ["Algèbre linéaire", "3Blue1Brown puis MIT 18.06 (Strang)", "M1–M4"],
          ["Contrôle (PID, espace d'état)", "Brian Douglas (YouTube)", "M3–M5"],
          ["Kalman, EKF", "Kalman and Bayesian Filters in Python (Labbe)", "M5–M7"],
          ["Cinématique, rotations", "Modern Robotics (Lynch & Park), livre + vidéos gratuits", "M5–M9"],
          ["Probabilités, SLAM", "Probabilistic Robotics (Thrun et al.), livre à acheter ou emprunter", "M11–M13"],
          ["Contrôle avancé (option)", "Underactuated Robotics (MIT, Tedrake)", "M15+"],
        ]} />
        <Text>Règle : chaque concept est implémenté une fois à la main en Python ou Rust avant d'utiliser une bibliothèque.</Text>
      </Section>

      <Section heading="Options matérielles">
        <Table columns={["Option", "Prix", "Phase"]} rows={[
          ["LIDAR D500 (Waveshare)", "à partir de 95,99 $ sur waveshare.com au 1er nov. 2026", "P5"],
          ["LIDAR STL27L (Waveshare)", "à partir de 167,99 $ sur waveshare.com au 1er nov. 2026", "P5 (option)"],
          ["Raspberry Pi AI HAT+ (Hailo)", "prix non vérifié", "P4"],
          ["Raspberry Pi Debug Probe", "prix non vérifié", "P1"],
          ["Analyseur logique USB bon marché", "prix non vérifié", "P1"],
        ]} />
        <Text>Prix hors taxes et port, tarifs dégressifs selon la quantité. Le D500 suffit pour SLAM Toolbox et Nav2 en intérieur.</Text>
      </Section>

      <Section heading="Stratégie portfolio">
        <BulletList items={["GitHub : un repo par couche (`rover-fw-rs`, `rover_ros2`, `rover-dashboard`) + un repo parapluie avec README, schéma d'architecture et liens vidéo", "Chaque phase : une vidéo de 1 à 3 min montrant une mesure, pas seulement une démo", "Un article technique en anglais par phase, avec chiffres, échecs et graphes", "X et LinkedIn : un fil court par livrable, en taguant les projets utilisés (ROS 2, embassy, esp-hal)", "Contributions upstream : corriger docs et petits bugs dans esp-hal, embassy, Nav2 ou ros2_rust ; c'est le signal le plus fort et le plus vérifiable", "Compétitions et événements : F1TENTH, meetups ROS, soumettre un talk à ROSCon"]} />
      </Section>

      <Section heading="Stratégie emploi et visa">
        <Table columns={["Voie", "Principe (USCIS)", "Réalisme pour toi"]} rows={[
          ["L-1", "Transfert intra-groupe après au moins 1 an continu sur les 3 dernières années dans une entité liée hors US ; L-1B exige une connaissance spécialisée", "La voie la plus réaliste : rejoindre une boîte FR/UE avec une entité US, puis demander le transfert"],
          ["O-1A", "Capacité extraordinaire prouvée par des critères (prix, publications, contributions originales majeures, salaire élevé, etc.)", "Long terme : se construit avec contributions upstream, talks, presse, articles cités"],
          ["H-1B", "Loterie annuelle, employeur sponsor, diplôme spécialisé", "Ton diplôme d'ingénieur aide ; la loterie reste aléatoire et l'employeur doit l'accepter"],
        ]} />
        <Text>Règles résumées, à vérifier sur uscis.gov et avec un avocat en immigration avant toute décision ; elles changent.</Text>
        <BulletList items={["Rôles cibles : robotics software engineer, embedded software engineer, autonomy/perception engineer, et robotics tooling/infra (là où ton profil web est un atout)", "Pour la voie L-1, cherche en France/UE des entreprises robotiques ou hardware ayant une entité US ; vérifie chaque fois leur structure et leurs offres actuelles", "Postuler en remote US est rare pour du hardware : prévois une étape intermédiaire en Europe", "Prépare les entretiens : C/C++, systèmes embarqués, algos classiques (LeetCode moyen), design système robotique"]} />
      </Section>

      <Section heading="Semaine type">
        <Table columns={["Créneau", "Durée", "Contenu"]} rows={[
          ["Mardi soir", "1,5 h", "Maths ou théorie, avec exercices papier"],
          ["Jeudi soir", "1,5 h", "Code ciblé (un exercice de la phase)"],
          ["Samedi matin", "4 h", "Session robot : banc, mesures, vidéo"],
          ["Dimanche", "2 h", "Write-up, commit, post, planification"],
        ]} />
        <Text>9 h par semaine ; une semaine sur quatre allégée pour éviter l'épuisement.</Text>
      </Section>

      <Section heading="Tracker">
        <Text>Statut au 1er nov. 2026 : rien n'est encore démarré. Demande-moi de cocher un élément et je mettrai la page à jour.</Text>
        <Checklist items={phases.map((x: Phase) => ({ text: x.id + " " + x.nom + " : " + x.done, meta: x.mois }))} />
      </Section>

      <Section heading="Ressources">
        <LinkCards links={[
          { title: "Page produit UGV Rover", site: "waveshare.com", href: "https://www.waveshare.com/ugv-rover.htm" },
          { title: "Wiki UGV Rover PI ROS2", site: "waveshare.com", href: "https://www.waveshare.com/wiki/UGV_Rover_PI_ROS2" },
          { title: "ugv_base_ros (firmware ESP32)", site: "github.com", href: "https://github.com/waveshareteam/ugv_base_ros" },
          { title: "ugv_ws (ROS 2)", site: "github.com", href: "https://github.com/waveshareteam/ugv_ws" },
          { title: "ugv_rpi (code Pi)", site: "github.com", href: "https://github.com/waveshareteam/ugv_rpi" },
          { title: "Modern Robotics", site: "northwestern.edu", href: "https://hades.mech.northwestern.edu/index.php/Modern_Robotics" },
          { title: "Brian Douglas, contrôle", site: "youtube.com", href: "https://www.youtube.com/@BrianBDouglas" },
          { title: "Kalman and Bayesian Filters in Python", site: "github.com", href: "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python" },
          { title: "MIT 18.06 Linear Algebra", site: "ocw.mit.edu", href: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/" },
          { title: "3Blue1Brown, algèbre linéaire", site: "3blue1brown.com", href: "https://www.3blue1brown.com/topics/linear-algebra" },
          { title: "The Embedded Rust Book", site: "rust-embedded.org", href: "https://docs.rust-embedded.org/book/" },
          { title: "esp-hal", site: "github.com", href: "https://github.com/esp-rs/esp-hal" },
          { title: "Embassy book", site: "embassy.dev", href: "https://embassy.dev/book/" },
          { title: "ROS 2 Humble docs", site: "docs.ros.org", href: "https://docs.ros.org/en/humble/" },
          { title: "ros2_control", site: "control.ros.org", href: "https://control.ros.org/" },
          { title: "Nav2 docs", site: "nav2.org", href: "https://docs.nav2.org/" },
          { title: "SLAM Toolbox", site: "github.com", href: "https://github.com/SteveMacenski/slam_toolbox" },
          { title: "Gazebo docs", site: "gazebosim.org", href: "https://gazebosim.org/docs/" },
          { title: "Articulated Robotics", site: "youtube.com", href: "https://www.youtube.com/@ArticulatedRobotics" },
          { title: "OpenCV docs", site: "opencv.org", href: "https://docs.opencv.org/4.x/" },
          { title: "AprilTag", site: "github.com", href: "https://github.com/AprilRobotics/apriltag" },
          { title: "Hailo RPi5 examples", site: "github.com", href: "https://github.com/hailo-ai/hailo-rpi5-examples" },
          { title: "MCAP", site: "mcap.dev", href: "https://mcap.dev/" },
          { title: "Foxglove docs", site: "foxglove.dev", href: "https://docs.foxglove.dev/" },
          { title: "ros2_rust", site: "github.com", href: "https://github.com/ros2-rust/ros2_rust" },
          { title: "Underactuated Robotics", site: "mit.edu", href: "https://underactuated.mit.edu/" },
          { title: "F1TENTH", site: "f1tenth.org", href: "https://f1tenth.org/" },
          { title: "ROSCon", site: "ros.org", href: "https://roscon.ros.org/" },
          { title: "USCIS O-1", site: "uscis.gov", href: "https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement" },
          { title: "USCIS L-1B", site: "uscis.gov", href: "https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1b-intracompany-transferee-specialized-knowledge" },
          { title: "USCIS H-1B", site: "uscis.gov", href: "https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations" },
        ]} />
      </Section>
    </Page>
  );
}



```
