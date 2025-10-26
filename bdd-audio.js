/**
 * bdd-audio-versets.js
 * Gestionnaire de base de données IndexedDB pour AudioVersets
 * À copier dans votre projet racine
 */

import { openDB, deleteDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

class GestionnaireBDDAudioVersets {
  constructor() {
    this.nomBD = 'AudioVersets_V1';
    this.versionBD = 1;
    this.bdd = null;
  }

  /**
   * Initialiser la base de données
   * Appelez ceci une seule fois au démarrage
   */
  async initialiser() {
    try {
      this.bdd = await openDB(this.nomBD, this.versionBD, {
        upgrade: (bdd, ancienneVersion, nouvelleVersion, transaction) => {
          this.creerSchema(bdd);
        },
      });
      console.log('✓ Base de données AudioVersets initialisée');
      return this.bdd;
    } catch (erreur) {
      console.error('✗ Erreur lors de l\'initialisation:', erreur);
      throw erreur;
    }
  }

  /**
   * Créer la structure de la base de données
   */
  creerSchema(bdd) {
    // 1. Table des SURAHS (chapitres du Coran)
    if (!bdd.objectStoreNames.contains('surahs')) {
      const storeSurah = bdd.createObjectStore('surahs', { keyPath: 'id' });
      storeSurah.createIndex('numero', 'numero', { unique: true });
      storeSurah.createIndex('nom', 'nom', { unique: false });
    }

    // 2. Table des VERSETS (ayahs)
    if (!bdd.objectStoreNames.contains('versets')) {
      const storeVersets = bdd.createObjectStore('versets', { 
        keyPath: ['id_surah', 'numero_verset'] 
      });
      storeVersets.createIndex('id_surah', 'id_surah', { unique: false });
      storeVersets.createIndex('texte_ar', 'texte_ar', { unique: false });
    }

    // 3. Table des FICHIERS AUDIO
    if (!bdd.objectStoreNames.contains('fichierAudio')) {
      const storeAudio = bdd.createObjectStore('fichierAudio', { keyPath: 'id' });
      storeAudio.createIndex('id_surah', 'id_surah', { unique: false });
      storeAudio.createIndex('numero_verset', 'numero_verset', { unique: false });
      storeAudio.createIndex('surah_verset', ['id_surah', 'numero_verset'], { unique: true });
    }

    // 4. Table de l'HISTORIQUE DES QUIZ
    if (!bdd.objectStoreNames.contains('historiqueQuiz')) {
      const storeHistorique = bdd.createObjectStore('historiqueQuiz', { keyPath: 'id', autoIncrement: true });
      storeHistorique.createIndex('timestamp', 'timestamp', { unique: false });
      storeHistorique.createIndex('id_surah', 'id_surah', { unique: false });
    }

    // 5. Table des PARAMÈTRES UTILISATEUR
    if (!bdd.objectStoreNames.contains('parametres')) {
      bdd.createObjectStore('parametres', { keyPath: 'cle' });
    }

    // 6. Table de SYNCHRONISATION HORS LIGNE
    if (!bdd.objectStoreNames.contains('fileSynchronisation')) {
      const storeSync = bdd.createObjectStore('fileSynchronisation', { keyPath: 'id', autoIncrement: true });
      storeSync.createIndex('timestamp', 'timestamp', { unique: false });
      storeSync.createIndex('synchronise', 'synchronise', { unique: false });
    }
  }

  // ============================================================
  // GESTION DES SURAHS
  // ============================================================

  async ajouterSurah(donneesSurah) {
    const tx = this.bdd.transaction('surahs', 'readwrite');
    await tx.store.put(donneesSurah);
    await tx.done;
  }

  async obtenirTousSurahs() {
    return await this.bdd.getAll('surahs');
  }

  async obtenirSurah(idSurah) {
    return await this.bdd.get('surahs', idSurah);
  }

  async obtenirSurahParNumero(numero) {
    return await this.bdd.getFromIndex('surahs', 'numero', numero);
  }

  // ============================================================
  // GESTION DES VERSETS
  // ============================================================

  async ajouterVersets(versets) {
    const tx = this.bdd.transaction('versets', 'readwrite');
    for (const verset of versets) {
      await tx.store.put(verset);
    }
    await tx.done;
  }

  async obtenirVersetsPourSurah(idSurah) {
    const tx = this.bdd.transaction('versets', 'readonly');
    const index = tx.store.index('id_surah');
    return await index.getAll(idSurah);
  }

  async obtenirVerset(idSurah, numeroVerset) {
    return await this.bdd.get('versets', [idSurah, numeroVerset]);
  }

  // ============================================================
  // GESTION DES FICHIERS AUDIO
  // ============================================================

  async sauvegarderFichierAudio(idSurah, numeroVerset, blobAudio, metadonnees = {}) {
    const enregistrementAudio = {
      id: `${idSurah}_${numeroVerset}`,
      id_surah: idSurah,
      numero_verset: numeroVerset,
      blob: blobAudio,
      taille: blobAudio.size,
      type: blobAudio.type,
      timestamp: Date.now(),
      ...metadonnees,
    };

    const tx = this.bdd.transaction('fichierAudio', 'readwrite');
    await tx.store.put(enregistrementAudio);
    await tx.done;
    
    return enregistrementAudio.id;
  }

  async obtenirFichierAudio(idSurah, numeroVerset) {
    return await this.bdd.get('fichierAudio', `${idSurah}_${numeroVerset}`);
  }

  async obtenirFichiersAudioSurah(idSurah) {
    const tx = this.bdd.transaction('fichierAudio', 'readonly');
    const index = tx.store.index('id_surah');
    return await index.getAll(idSurah);
  }

  async verifierExistenceAudio(idSurah, numeroVerset) {
    const audio = await this.obtenirFichierAudio(idSurah, numeroVerset);
    return !!audio;
  }

  async obtenirTailleStockageAudio() {
    const tousAudios = await this.bdd.getAll('fichierAudio');
    return tousAudios.reduce((total, fichier) => total + (fichier.taille || 0), 0);
  }

  async supprimerFichierAudio(idSurah, numeroVerset) {
    const tx = this.bdd.transaction('fichierAudio', 'readwrite');
    await tx.store.delete(`${idSurah}_${numeroVerset}`);
    await tx.done;
  }

  async effacerTousAudios() {
    const tx = this.bdd.transaction('fichierAudio', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }

  // ============================================================
  // GESTION DE L'HISTORIQUE QUIZ
  // ============================================================

  async enregistrerResultatQuiz(donneeQuiz) {
    const enregistrement = {
      id_surah: donneeQuiz.idSurah,
      versets_etudies: donneeQuiz.versets,
      score: donneeQuiz.score,
      nombre_questions: donneeQuiz.nombreQuestions,
      timestamp: Date.now(),
      duree_secondes: donneeQuiz.duree,
      ...donneeQuiz,
    };

    const tx = this.bdd.transaction('historiqueQuiz', 'readwrite');
    const id = await tx.store.add(enregistrement);
    await tx.done;
    
    return id;
  }

  async obtenirHistoriqueQuizSurah(idSurah, limite = 10) {
    const tx = this.bdd.transaction('historiqueQuiz', 'readonly');
    const index = tx.store.index('id_surah');
    let resultats = [];
    
    for await (const cursor of index.iterate(idSurah, 'prev')) {
      resultats.push(cursor.value);
      if (resultats.length >= limite) break;
    }
    
    return resultats;
  }

  async obtenirToutHistoriqueQuiz(limite = 100) {
    const tx = this.bdd.transaction('historiqueQuiz', 'readonly');
    const index = tx.store.index('timestamp');
    let resultats = [];
    
    for await (const cursor of index.iterate(null, 'prev')) {
      resultats.push(cursor.value);
      if (resultats.length >= limite) break;
    }
    
    return resultats;
  }

  // ============================================================
  // GESTION DES PARAMÈTRES
  // ============================================================

  async sauvegarderParametre(cle, valeur) {
    const tx = this.bdd.transaction('parametres', 'readwrite');
    await tx.store.put({ cle, valeur });
    await tx.done;
  }

  async obtenirParametre(cle, valeurParDefaut = null) {
    const parametre = await this.bdd.get('parametres', cle);
    return parametre ? parametre.valeur : valeurParDefaut;
  }

  async obtenirTousParametres() {
    const parametres = await this.bdd.getAll('parametres');
    return parametres.reduce((acc, p) => ({ ...acc, [p.cle]: p.valeur }), {});
  }

  async supprimerParametre(cle) {
    const tx = this.bdd.transaction('parametres', 'readwrite');
    await tx.store.delete(cle);
    await tx.done;
  }

  // ============================================================
  // GESTION DE LA SYNCHRONISATION
  // ============================================================

  async ajouterOperationSync(operation, donnees) {
    const enregistrement = {
      operation,
      donnees,
      timestamp: Date.now(),
      synchronise: false,
      nombreTentatives: 0,
    };

    const tx = this.bdd.transaction('fileSynchronisation', 'readwrite');
    const id = await tx.store.add(enregistrement);
    await tx.done;
    
    return id;
  }

  async obtenirOperationsEnAttente() {
    const tx = this.bdd.transaction('fileSynchronisation', 'readonly');
    const index = tx.store.index('synchronise');
    return await index.getAll(false);
  }

  async marquerCommeSync(idOperation) {
    const tx = this.bdd.transaction('fileSynchronisation', 'readwrite');
    const operation = await tx.store.get(idOperation);
    if (operation) {
      operation.synchronise = true;
      operation.dateSync = Date.now();
      await tx.store.put(operation);
    }
    await tx.done;
  }

  async effacerOperationsSyncees() {
    const tx = this.bdd.transaction('fileSynchronisation', 'readwrite');
    const index = tx.store.index('synchronise');
    
    for await (const cursor of index.iterate(true)) {
      cursor.delete();
    }
    await tx.done;
  }

  // ============================================================
  // MAINTENANCE DE LA BDD
  // ============================================================

  async obtenirStatistiques() {
    return {
      surahs: (await this.bdd.count('surahs')),
      versets: (await this.bdd.count('versets')),
      fichiersAudio: (await this.bdd.count('fichierAudio')),
      tailleAudio: await this.obtenirTailleStockageAudio(),
      historiqueQuiz: (await this.bdd.count('historiqueQuiz')),
      operationEnAttenteSync: (await this.bdd.countFromIndex('fileSynchronisation', 'synchronise', false)),
    };
  }

  async fermer() {
    if (this.bdd) {
      this.bdd.close();
      this.bdd = null;
    }
  }

  async supprimerBaseDeDonnees() {
    await this.fermer();
    try {
      await deleteDB(this.nomBD);
      console.log('✓ Base de données supprimée');
    } catch (erreur) {
      console.error('✗ Erreur lors de la suppression:', erreur);
    }
  }

  async exporterEnJSON() {
    const donnees = {
      timestamp: Date.now(),
      version: this.versionBD,
      surahs: await this.bdd.getAll('surahs'),
      versets: await this.bdd.getAll('versets'),
      parametres: await this.obtenirTousParametres(),
      historiqueQuiz: await this.obtenirToutHistoriqueQuiz(50),
    };
    return JSON.stringify(donnees, null, 2);
  }
}

// Créer une instance unique et l'exporter
export const gestionnaireBDD = new GestionnaireBDDAudioVersets();

// Initialiser automatiquement
await gestionnaireBDD.initialiser();
