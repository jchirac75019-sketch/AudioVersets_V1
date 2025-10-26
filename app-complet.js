/**
 * app-complet.js
 * Logique complète de l'application AudioVersets
 * À créer DIRECTEMENT - Copier-coller ce contenu entier dans un fichier nommé app-complet.js
 */

import { gestionnaireBDD } from './bdd-audio.js';

async function initialiserApp() {
  try {
    console.log('🚀 Démarrage de AudioVersets...');
    const stats = await gestionnaireBDD.obtenirStatistiques();
    console.log('📊 Statistiques actuelles:', stats);
    
    if (stats.surahs === 0) {
      console.log('📥 Première utilisation - Chargement des données du Coran...');
      await chargerDonneesCoran();
    } else {
      console.log('✓ Données du Coran déjà présentes');
    }
    
    mettreAJourStatutConnexion();
    
  } catch (erreur) {
    console.error('✗ Erreur d\'initialisation:', erreur);
    afficherMessage('Erreur lors du démarrage: ' + erreur.message, 'erreur');
  }
}

async function chargerDonneesCoran() {
  try {
    console.log('⏳ Téléchargement des données du Coran...');
    
    const reponse = await fetch('https://api.alquran.cloud/v1/quran/ar.alafasy');
    const donnees = await reponse.json();
    
    if (donnees.code === 200) {
      for (const surah of donnees.data.surahs) {
        await gestionnaireBDD.ajouterSurah({
          id: surah.number,
          numero: surah.number,
          nom: surah.englishName,
          nomArabique: surah.name,
          nombreAyahs: surah.numberOfAyahs,
          typeRevelation: surah.revelationType,
        });
      }
      
      for (const surah of donnees.data.surahs) {
        const versets = surah.ayahs.map(ayah => ({
          id_surah: surah.number,
          numero_verset: ayah.numberInSurah,
          texte_ar: ayah.text,
          texte_en: ayah.en,
          verset_global: ayah.number,
        }));
        
        await gestionnaireBDD.ajouterVersets(versets);
      }
      
      console.log('✓ Données du Coran chargées avec succès !');
      afficherMessage('✓ Données du Coran chargées !', 'succes');
      
    } else {
      throw new Error('Réponse API invalide');
    }
    
  } catch (erreur) {
    console.error('✗ Erreur lors du chargement du Coran:', erreur);
    afficherMessage('✗ Impossible de charger les données du Coran', 'erreur');
  }
}

async function telechargerAudioSurah(numeroSurah, lecteur = 'ar.alafasy') {
  try {
    const surah = await gestionnaireBDD.obtenirSurah(numeroSurah);
    if (!surah) {
      throw new Error(`Surah ${numeroSurah} non trouvée`);
    }
    
    console.log(`🎵 Téléchargement audio pour la Surah ${numeroSurah}: ${surah.nom}`);
    afficherMessage(`Téléchargement de la Surah ${surah.nom}...`, 'info');
    
    const versets = await gestionnaireBDD.obtenirVersetsPourSurah(numeroSurah);
    let telecharges = 0;
    let erreurs = 0;
    
    for (const verset of versets) {
      try {
        const urlAudio = `https://cdn.islamic.network/quran/audio/${verset.verset_global}/${lecteur}.mp3`;
        
        const reponse = await fetch(urlAudio);
        if (!reponse.ok) {
          throw new Error(`HTTP ${reponse.status}`);
        }
        
        const blob = await reponse.blob();
        
        await gestionnaireBDD.sauvegarderFichierAudio(
          numeroSurah,
          verset.numero_verset,
          blob,
          { lecteur, langue: 'ar' }
        );
        
        telecharges++;
        
        const pourcentage = Math.round((telecharges / versets.length) * 100);
        afficherProgression(pourcentage, `${telecharges}/${versets.length}`);
        
      } catch (erreur) {
        erreurs++;
        console.warn(`✗ Erreur pour le verset ${verset.numero_verset}:`, erreur);
      }
    }
    
    console.log(`✓ ${telecharges}/${versets.length} fichiers audio téléchargés`);
    afficherMessage(`✓ ${telecharges} fichiers audio téléchargés !`, 'succes');
    
    return { telecharges, erreurs, total: versets.length };
    
  } catch (erreur) {
    console.error('✗ Erreur lors du téléchargement audio:', erreur);
    afficherMessage('✗ Erreur: ' + erreur.message, 'erreur');
    throw erreur;
  }
}

async function chargerQuizSurah(numeroSurah, nombre = 5) {
  try {
    const versets = await gestionnaireBDD.obtenirVersetsPourSurah(numeroSurah);
    
    if (versets.length === 0) {
      throw new Error(`Aucun verset trouvé pour la Surah ${numeroSurah}`);
    }
    
    const melanges = versets.sort(() => Math.random() - 0.5);
    const selectionnes = melanges.slice(0, Math.min(nombre, versets.length));
    
    return selectionnes.map(verset => ({
      surah: numeroSurah,
      numeroVerset: verset.numero_verset,
      texte: verset.texte_ar,
      traduction: verset.texte_en,
    }));
    
  } catch (erreur) {
    console.error('✗ Erreur lors du chargement du quiz:', erreur);
    afficherMessage('✗ Erreur: ' + erreur.message, 'erreur');
    throw erreur;
  }
}

async function jouerAudioVerset(numeroSurah, numeroVerset) {
  try {
    const enregistrementAudio = await gestionnaireBDD.obtenirFichierAudio(numeroSurah, numeroVerset);
    
    if (!enregistrementAudio) {
      console.error('✗ Fichier audio non trouvé');
      afficherMessage('✗ Fichier audio non disponible', 'erreur');
      return null;
    }
    
    const urlAudio = URL.createObjectURL(enregistrementAudio.blob);
    
    const audio = new Audio();
    audio.src = urlAudio;
    audio.play();
    
    console.log('🔊 Lecture du verset', numeroVerset);
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(urlAudio);
    });
    
    return audio;
    
  } catch (erreur) {
    console.error('✗ Erreur lors de la lecture audio:', erreur);
    afficherMessage('✗ Erreur de lecture audio', 'erreur');
    return null;
  }
}

async function terminerQuiz(numeroSurah, resultats) {
  try {
    const enregistrementQuiz = {
      idSurah: numeroSurah,
      versets: resultats.map(r => r.numeroVerset),
      score: resultats.filter(r => r.correct).length,
      nombreQuestions: resultats.length,
      duree: resultats.duree || 0,
      timestamp: Date.now(),
    };
    
    const id = await gestionnaireBDD.enregistrerResultatQuiz(enregistrementQuiz);
    console.log('✓ Quiz enregistré avec l\'ID:', id);
    
    if (navigator.onLine) {
      try {
        await synchroniserResultatsQuiz();
      } catch (erreur) {
        console.log('ℹ️ Synchronisation échouée, réessai quand vous êtes en ligne');
      }
    } else {
      await gestionnaireBDD.ajouterOperationSync('resultat_quiz', enregistrementQuiz);
      console.log('⏳ Quiz en attente de synchronisation');
      afficherMessage('📱 Quiz en attente (synchronisé quand vous êtes en ligne)', 'info');
    }
    
  } catch (erreur) {
    console.error('✗ Erreur lors de l\'enregistrement du quiz:', erreur);
  }
}

async function synchroniserResultatsQuiz() {
  try {
    const operationsEnAttente = await gestionnaireBDD.obtenirOperationsEnAttente();
    
    if (operationsEnAttente.length === 0) {
      console.log('✓ Rien à synchroniser');
      return;
    }
    
    console.log(`🔄 Synchronisation de ${operationsEnAttente.length} éléments...`);
    
    for (const operation of operationsEnAttente) {
      try {
        const reponse = await fetch('/api/synchroniser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.donnees),
        });
        
        if (reponse.ok) {
          await gestionnaireBDD.marquerCommeSync(operation.id);
          console.log(`✓ Synchronisé: ${operation.operation}`);
        } else {
          console.warn(`⚠️ Échec de la synchronisation: ${operation.operation}`);
        }
      } catch (erreur) {
        console.error(`✗ Erreur de synchronisation:`, erreur);
      }
    }
    
    console.log('✓ Synchronisation terminée');
    afficherMessage('✓ Données synchronisées !', 'succes');
    
  } catch (erreur) {
    console.error('✗ Erreur lors de la synchronisation:', erreur);
  }
}

async function afficherGestionnaireStockage() {
  try {
    const stats = await gestionnaireBDD.obtenirStatistiques();
    const tailleAudioMB = (stats.tailleAudio / (1024 * 1024)).toFixed(2);
    
    console.log('💾 UTILISATION DU STOCKAGE:');
    console.log(`   - Surahs: ${stats.surahs}/114`);
    console.log(`   - Versets: ${stats.versets}`);
    console.log(`   - Fichiers audio: ${stats.fichiersAudio}`);
    console.log(`   - Taille audio: ${tailleAudioMB} MB`);
    console.log(`   - Sessions quiz: ${stats.historiqueQuiz}`);
    console.log(`   - En attente de sync: ${stats.operationEnAttenteSync}`);
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimation = await navigator.storage.estimate();
      const utiliseMB = (estimation.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimation.quota / (1024 * 1024)).toFixed(2);
      const pourcentage = ((estimation.usage / estimation.quota) * 100).toFixed(1);
      
      console.log(`\n📊 QUOTA TOTAL:`);
      console.log(`   - Utilisé: ${utiliseMB} MB / ${quotaMB} MB (${pourcentage}%)`);
      
      if (pourcentage > 80) {
        console.warn('⚠️ ATTENTION: Stockage presque plein !');
      }
    }
    
    return stats;
    
  } catch (erreur) {
    console.error('✗ Erreur lors de la vérification du stockage:', erreur);
  }
}

async function effacerAudiAnciens(joursAnciens = 7) {
  try {
    console.log(`🗑️ Suppression des fichiers audio de plus de ${joursAnciens} jours...`);
    
    const maintenant = Date.now();
    const tempsLimite = maintenant - (joursAnciens * 24 * 60 * 60 * 1000);
    
    let supprimmes = 0;
    const tousAudios = await gestionnaireBDD.bdd.getAll('fichierAudio');
    
    for (const audio of tousAudios) {
      if (audio.timestamp < tempsLimite) {
        await gestionnaireBDD.supprimerFichierAudio(audio.id_surah, audio.numero_verset);
        supprimmes++;
      }
    }
    
    console.log(`✓ ${supprimmes} fichiers audio supprimés`);
    afficherMessage(`✓ ${supprimmes} fichiers nettoyés`, 'succes');
    return supprimmes;
    
  } catch (erreur) {
    console.error('✗ Erreur lors du nettoyage:', erreur);
  }
}

function afficherMessage(texte, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${texte}`);
  
  if (document.getElementById('messagesArea')) {
    const message = document.createElement('div');
    message.className = `message message-${type}`;
    message.textContent = texte;
    document.getElementById('messagesArea').appendChild(message);
    
    setTimeout(() => message.remove(), 5000);
  }
}

function afficherProgression(pourcentage, texte = '') {
  const progressBar = document.getElementById('barreRemplissage');
  if (progressBar) {
    progressBar.style.width = pourcentage + '%';
    progressBar.textContent = pourcentage + '%';
  }
  console.log(`📊 Progression: ${pourcentage}% ${texte}`);
}

function mettreAJourStatutConnexion() {
  const badge = document.getElementById('statusBadge');
  if (badge) {
    if (navigator.onLine) {
      badge.className = 'badge badge-online';
      badge.textContent = '🟢 En ligne';
    } else {
      badge.className = 'badge badge-offline';
      badge.textContent = '🔴 Hors ligne';
    }
  }
}

window.addEventListener('online', async () => {
  console.log('✓ Vous êtes revenu en ligne !');
  mettreAJourStatutConnexion();
  afficherMessage('✓ Connecté ! Synchronisation en cours...', 'succes');
  await synchroniserResultatsQuiz();
});

window.addEventListener('offline', () => {
  console.log('⚠️ Vous êtes hors ligne');
  mettreAJourStatutConnexion();
  afficherMessage('📱 Vous êtes hors ligne - Les données seront synchronisées automatiquement', 'info');
});

window.AudioVersetsApp = {
  initialiser: initialiserApp,
  chargerDonneesCoran,
  telechargerAudio: telechargerAudioSurah,
  chargerQuiz: chargerQuizSurah,
  jouerAudio: jouerAudioVerset,
  terminerQuiz,
  synchroniser: synchroniserResultatsQuiz,
  afficherStockage: afficherGestionnaireStockage,
  effacerAudio: effacerAudiAnciens,
  gestionnaire: gestionnaireBDD,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialiserApp);
} else {
  initialiserApp();
}