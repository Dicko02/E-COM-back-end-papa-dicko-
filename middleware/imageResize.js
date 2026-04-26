const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Middleware pour redimensionner les images de produits
 * Utilise le buffer de multer (req.file)
 * Doit être appelé APRÈS le middleware multer
 * 
 * Dimensions: 350x350px
 * Format: JPEG
 * Qualité: 85%
 * Compression: ~95%
 */

async function resizeProductImage(req, res, next) {
  // Skip si pas de fichier uploadé
  if (!req.file) {
    return next();
  }

  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Générer un nom unique pour l'image redimensionnée
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const resizedFilename = `product-${timestamp}-${random}.jpg`;
    const resizedPath = path.join(uploadsDir, resizedFilename);

    // Source : buffer (memoryStorage) OU chemin disque (diskStorage)
    const source = req.file.buffer || req.file.path;

    // Redimensionner l'image
    await sharp(source)
      .resize(350, 350, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 85, 
        progressive: true
      })
      .toFile(resizedPath);

    // Si diskStorage, supprimer le fichier original (remplacé par le redimensionné)
    if (req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }

    // Mettre à jour req.file avec le nouveau nom
    req.file.filename = resizedFilename;
    req.file.path = resizedPath;

    next();

  } catch (error) {
    console.error('❌ Erreur lors du redimensionnement:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du traitement de l\'image',
      details: error.message 
    });
  }
}

/**
 * Middleware pour redimensionner plusieurs images (galerie)
 * Doit être appelé APRÈS multer.array()
 * Traite req.files (array)
 */

async function resizeProductImages(req, res, next) {
  // Skip si pas de fichiers
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    console.log(`🖼️ Redimensionnement de ${req.files.length} images...`);

    // Traiter chaque fichier
    const resizedFilenames = [];

    for (const file of req.files) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const resizedFilename = `product-${timestamp}-${random}.jpg`;
      const resizedPath = path.join(uploadsDir, resizedFilename);

      await sharp(file.buffer)
        .resize(350, 350, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(resizedPath);

      resizedFilenames.push(resizedFilename);
      console.log(`  ✅ Image redimensionnée: ${resizedFilename}`);
    }

    // Remplacer req.files par les noms redimensionnés
    req.file.filenames = resizedFilenames;

    console.log(`✅ ${resizedFilenames.length} images redimensionnées`);
    next();

  } catch (error) {
    console.error('❌ Erreur lors du redimensionnement des images:', error);
    return res.status(350).json({ 
      error: 'Erreur lors du traitement des images',
      details: error.message 
    });
  }
}

module.exports = {
  resizeProductImage,
  resizeProductImages
};
