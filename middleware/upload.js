const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Créer un nom unique pour le fichier
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
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


// Fonction pour supprimer un fichier
const deleteFile = (filename) => {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};


module.exports = {
    uploadSingle,
    uploadMultiple,
    uploadWithErrorHandling,
    deleteFile
}; 