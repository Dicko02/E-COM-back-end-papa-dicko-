const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration du stockage Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'wayne-enterprize/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 350, height: 350, crop: 'fill' }],
        format: 'jpg',
        public_id: (req, file) => {
            // Créer un nom unique pour le fichier
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return 'product-' + uniqueSuffix;
        }
    }
});


// Filtrer les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Seuls les fichiers JPEG, PNG, GIF et WebP sont acceptés.'), false);
    }
};


// Configuration de Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});


// Middleware pour upload d'une seule image
const uploadSingle = upload.single('image');


// Middleware pour upload de plusieurs images
const uploadMultiple = upload.array('images', 5); // Max 5 images


// Middleware avec gestion d'erreurs
const uploadWithErrorHandling = (req, res, next) => {
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Fichier trop volumineux. Taille maximale: 5MB' });
            }
            return res.status(400).json({ error: 'Erreur lors de l\'upload: ' + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};


// Fonction pour supprimer un fichier de Cloudinary
const deleteFile = async (filename) => {
    try {
        // Extraire le public_id du filename
        // Format attendu: "product-1234567890-123456789" ou URL Cloudinary complète
        let publicId = filename;
        
        // Si c'est une URL Cloudinary, extraire le public_id
        if (filename.includes('cloudinary.com')) {
            const parts = filename.split('/');
            const fileWithExt = parts[parts.length - 1];
            const fileWithoutExt = fileWithExt.split('.')[0];
            publicId = `wayne-enterprize/products/${fileWithoutExt}`;
        } else if (!filename.includes('/')) {
            // Si c'est juste le nom du fichier, ajouter le chemin complet
            publicId = `wayne-enterprize/products/${filename.split('.')[0]}`;
        }
        
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'image Cloudinary:', error);
    }
};


module.exports = {
    uploadSingle,
    uploadMultiple,
    uploadWithErrorHandling,
    deleteFile
}; 