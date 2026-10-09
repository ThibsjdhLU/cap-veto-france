# Cap Véto France — site GitHub Pages

Site statique de suivi des notes, du bac général 2027 et des statistiques du concours vétérinaire public français.

## Publier une première fois

1. Créer un dépôt GitHub **public** nommé `cap-veto-france` avec la branche `main`.
2. Placer `index.html`, `app.js`, `styles.css` et `.nojekyll` à la **racine** du dépôt.
3. Dans **Settings → Pages**, choisir **Deploy from a branch**, **main**, **/(root)**, puis **Save**.
4. Consulter l'URL de publication fournie dans Settings → Pages (en général `https://UTILISATEUR.github.io/cap-veto-france/`).
5. Sur le site, importer son fichier personnel `Mon_Dossier_Cap_Veto.json` **depuis son propre ordinateur**.

Les fichiers personnels (JSON de notes, bulletins PDF, identifiants, etc.) ne doivent **jamais** être chargés dans le dépôt. GitHub Pages est un site public, même si on choisit certaines configurations de dépôt privé.

## Après la première publication

Les changements apportés aux fichiers de la branche `main` seront publiés sur la même adresse. Le stockage `localStorage` du navigateur ne doit pas être effacé lors des mises à jour : le site conserve alors les notes déjà importées. Pour migrer vers un autre nom de dépôt/domaine ou utiliser un nouvel appareil, exporter puis importer le JSON de sauvegarde.

## Limites transparentes

- Les simulations de bac sont des **scénarios**, pas des intervalles de confiance calibrés.
- Les statistiques ENV présentées sont des références historiques, pas des probabilités personnelles.
- Aucune connexion automatique à un ENT scolaire n'est incluse.
- Il n'existe **aucune synchronisation multi-appareils** : l'import/export JSON est nécessaire entre navigateurs.
- Les données sont dans `localStorage` sur l'appareil. Il est préférable d'utiliser un profil navigateur personnel et d'exporter régulièrement des sauvegardes chiffrées/privées ; le site ne fournit pas de chiffrement applicatif.

## Sources de calcul

- [Ministère : coefficients du bac 2027](https://www.education.gouv.fr/reussir-au-lycee/comment-calculer-votre-note-au-baccalaureat-325511)
- [Rapport concours véto post-bac 2026](https://www.concours-veto-postbac.fr/wp-content/uploads/2026/09/Rapport_Concours_ENVF_Public_2026_VD.pdf)
- [Concours véto post-bac](https://www.concours-veto-postbac.fr/)

## Technique

HTML, CSS, JavaScript sans dépendances ni API tierces. Pas de cookie analytique, pas de serveur traitant les notes.
