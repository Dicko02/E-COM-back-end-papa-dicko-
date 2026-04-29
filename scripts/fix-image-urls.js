// Script pour remplacer toutes les occurrences de génération d'URL d'images
// par l'utilisation de la fonction helper addImageUrls

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../controllers/produits.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern à remplacer
const oldPattern = `const produitObj = produit.toObject();
      if (produitObj.image) {
        produitObj.imageUrl = \`\${req.protocol}://\${req.get('host')}/uploads/\${produitObj.image}\`;
      }
      if (produitObj.images && produitObj.images.length > 0) {
        produitObj.imageUrls = produitObj.images.map(img => 
          \`\${req.protocol}://\${req.get('host')}/uploads/\${img}\`
        );
      }
      return produitObj;`;

const newPattern = `return addImageUrls(produit.toObject(), req);`;

// Remplacer toutes les occurrences
content = content.split(oldPattern).join(newPattern);

// Pattern pour les cas où c'est juste produitObj sans le return
const oldPattern2 = `const produitObj = produit.toObject();
    if (produitObj.image) {
      produitObj.imageUrl = \`\${req.protocol}://\${req.get('host')}/uploads/\${produitObj.image}\`;
    }
    if (produitObj.images && produitObj.images.length > 0) {
      produitObj.imageUrls = produitObj.images.map(img => 
        \`\${req.protocol}://\${req.get('host')}/uploads/\${img}\`
      );
    }`;

const newPattern2 = `const produitObj = addImageUrls(produit.toObject(), req);`;

content = content.split(oldPattern2).join(newPattern2);

// Pattern pour product au lieu de produit
const oldPattern3 = `const productObj = product.toObject();
      if (productObj.image) {
        productObj.imageUrl = \`\${req.protocol}://\${req.get('host')}/uploads/\${productObj.image}\`;
      }
      return productObj;`;

const newPattern3 = `return addImageUrls(product.toObject(), req);`;

content = content.split(oldPattern3).join(newPattern3);

// Écrire le fichier modifié
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fichier produits.controller.js mis à jour avec succès!');
console.log('Toutes les occurrences de génération d\'URL ont été remplacées par addImageUrls()');
