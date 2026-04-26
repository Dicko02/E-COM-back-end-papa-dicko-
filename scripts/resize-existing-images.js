/**
 * Script Batch pour Redimensionner les Images Existantes
 * 
 * Usage: node scripts/resize-existing-images.js
 * 
 * Actions:
 * 1. Scanne le dossier ./uploads/
 * 2. Resize tous les product-*.* en 350x350px
 * 3. Sauvegarde les versions redimensionnées (overwrite)
 * 4. Met à jour les références en base de données
 * 5. Affiche rapport de compression
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const Produit = require('../models/produitsModel');
const mongoose = require('mongoose');

const uploadsDir = path.join(__dirname, '../uploads');

async function resizeExistingImages() {
  try {
    // Connexion MongoDB
    console.log('🔗 Connexion à MongoDB...');
    require('../config/db_config');

    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre connexion

    console.log('📁 Scan du dossier uploads...\n');

    // Récupérer tous les fichiers
    const files = await fs.readdir(uploadsDir);
    const productImages = files.filter(file => file.startsWith('product-'));

    if (productImages.length === 0) {
      console.log('ℹ️ Aucune image de produit trouvée.');
      process.exit(0);
    }

    console.log(`🖼️ Trovato ${productImages.length} immagini da ridimensionare\n`);

    let totalBefore = 0;
    let totalAfter = 0;
    let successCount = 0;
    let errorCount = 0;

    // Traiter chaque fichier
    for (const filename of productImages) {
      try {
        const filepath = path.join(uploadsDir, filename);
        const stats = await fs.stat(filepath);
        const sizeBefore = stats.size;

        totalBefore += sizeBefore;

        console.log(`⏳ Processing: ${filename}`);
        console.log(`   Avant: ${(sizeBefore / 1024).toFixed(2)} KB`);

        // Redimensionner
        const metadata = await sharp(filepath).metadata();
        
        await sharp(filepath)
          .resize(350, 350, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85, progressive: true })
          .toFile(`${filepath}.tmp`);

        // Remplacer l'original
        await fs.unlink(filepath);
        await fs.rename(`${filepath}.tmp`, filepath);

        // Vérifier la taille après
        const statAfter = await fs.stat(filepath);
        const sizeAfter = statAfter.size;
        const compression = ((1 - sizeAfter / sizeBefore) * 100).toFixed(2);

        totalAfter += sizeAfter;

        console.log(`   Après: ${(sizeAfter / 1024).toFixed(2)} KB`);
        console.log(`   Compression: ${compression}% ✅\n`);

        successCount++;

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}\n`);
        errorCount++;
      }
    }

    // Résumé
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Images redimensionnées: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📈 Taille avant: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📉 Taille après: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
    const totalCompression = ((1 - totalAfter / totalBefore) * 100).toFixed(2);
    console.log(`🚀 Compression totale: ${totalCompression}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Exécuter
resizeExistingImages();
