
# E-Commerce Back-End API

Ce projet est une API back-end pour une application e-commerce, développée avec Node.js, Express.js et MongoDB.

## Architecture

L'application suit le modèle MVC :

- **Models** : Schémas Mongoose pour la structure des données (admins, clients, produits, catégories, commandes, etc.).
- **Controllers** : Logique métier, gestion des requêtes et réponses.
- **Routes** : Définition des endpoints et mapping vers les contrôleurs.
- **Middleware** : Authentification (JWT), gestion des fichiers (upload), gestion des erreurs.

## Fonctionnalités principales

- Authentification et gestion des administrateurs et clients (JWT)
- Gestion des produits, catégories, commandes, panier (chart)
- Notifications par email pour les commandes
- Sécurisation des routes sensibles avec `requireAuth`

## Démarrage rapide

### Prérequis

- Node.js
- MongoDB

### Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Créer un fichier `.env` à la racine :
   ```
   PORT=3000
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   ```
4. Lancer le serveur :
   ```bash
   npm start
   ```

Le serveur démarre sur `http://localhost:3000`.

## Principaux endpoints API

### Admin

- `POST /api/admin/register` : Enregistrement d'un administrateur
- `POST /api/admin/login` : Connexion administrateur
- `GET /api/admin/logout` : Déconnexion administrateur (protégée)
- `GET /api/admin/` : Liste des administrateurs (protégée)
- `GET /api/admin/:userId` : Détails d'un administrateur (protégée)
- `PUT /api/admin/:id` : Mise à jour d'un administrateur (protégée)
- `DELETE /api/admin/:id` : Suppression d'un administrateur (protégée)

### Client

- `POST /api/client/register` : Enregistrement client
- `POST /api/client/login` : Connexion client
- `GET /api/client/logout` : Déconnexion client

### Produits

- `GET /api/produits` : Liste des produits
- `GET /api/produits/:id` : Détail d'un produit
- `POST /api/produits` : Création produit
- `PUT /api/produits/:id` : Modification produit
- `DELETE /api/produits/:id` : Suppression produit

### Catégories

- `GET /api/category` : Liste des catégories
- `GET /api/category/:id` : Détail d'une catégorie
- `POST /api/category` : Création catégorie
- `PUT /api/category/:id` : Modification catégorie
- `DELETE /api/category/:id` : Suppression catégorie


---

## Documentation détaillée des endpoints et schémas de réponse

### Catégories

#### 1. Créer une catégorie
- **POST** `/api/category/addCategory`
   **Body JSON** :
   ```json
   { "name": "Nom de la catégorie" }
   ```
   **Réponse (201)** :
   ```json
   {
      "message": "Catégorie créée",
      "category": { "_id": "...", "name": "Nom de la catégorie" }
   }
   ```

#### 2. Voir toutes les catégories
- **GET** `/api/category/getAllCategories`
   **Réponse (200)** :
   ```json
   [
      { "_id": "...", "name": "Catégorie 1" },
      { "_id": "...", "name": "Catégorie 2" }
   ]
   ```

#### 3. Voir une catégorie
- **GET** `/api/category/getCategory/:id`
   **Réponse (200)** :
   ```json
   { "_id": "...", "name": "Catégorie" }
   ```

#### 4. Mettre à jour une catégorie
- **PUT** `/api/category/updateCategory/:id`
   **Body JSON** :
   ```json
   { "name": "Nouveau nom" }
   ```
   **Réponse (200)** :
   ```json
   { "_id": "...", "name": "Nouveau nom" }
   ```

#### 5. Supprimer une catégorie
- **DELETE** `/api/category/deleteCategory/:id`
   **Réponse (200)** :
   ```json
   { "_id": "...", "name": "Catégorie supprimée" }
   ```

---

### Produits

#### 1. Créer un produit
- **POST** `/api/produits/addProduit`
   **Body JSON** :
   ```json
   {
      "nom": "Nom du produit",
      "description": "Description",
      "categorie": "id_categorie",
      "prix": 100,
      "nombreDisponible": 10
   }
   ```
   **Réponse (201)** :
   ```json
   {
      "_id": "...",
      "nom": "Nom du produit",
      "description": "Description",
      "categorie": { "_id": "...", "name": "..." },
      "prix": 100,
      "nombreDisponible": 10,
      "image": "..."
   }
   ```

#### 2. Voir tous les produits
- **GET** `/api/produits/getAllProduits`
   **Réponse (200)** :
   ```json
   [
      {
         "_id": "...",
         "nom": "...",
         "description": "...",
         "categorie": { "_id": "...", "name": "..." },
         "prix": 100,
         "nombreDisponible": 10,
         "imageUrl": "..."
      }
   ]
   ```

#### 3. Voir un produit
- **GET** `/api/produits/getProduit/:id`
   **Réponse (200)** :
   ```json
   {
      "_id": "...",
      "nom": "...",
      "description": "...",
      "categorie": { "_id": "...", "name": "..." },
      "prix": 100,
      "nombreDisponible": 10,
      "imageUrl": "..."
   }
   ```

#### 4. Mettre à jour un produit
- **PUT** `/api/produits/updateProduit/:id`
   **Body JSON** :
   ```json
   { "nom": "Nouveau nom", "prix": 120 }
   ```
   **Réponse (200)** :
   ```json
   {
      "_id": "...",
      "nom": "Nouveau nom",
      "prix": 120,
      ...
   }
   ```

#### 5. Supprimer un produit
- **DELETE** `/api/produits/deleteProduit/:id`
   **Réponse (200)** :
   ```json
   { "message": "Produit supprimé avec succès" }
   ```

---

### Clients

#### 1. Inscription
- **POST** `/api/client/register`
   **Body JSON** :
   ```json
   {
      "nom": "Nom",
      "prenom": "Prénom",
      "email": "email@example.com",
      "password": "motdepasse",
      "number": "0600000000"
   }
   ```
   **Réponse (200)** :
   ```json
   { "user": { "_id": "...", "nom": "Nom", ... } }
   ```

#### 2. Connexion
- **POST** `/api/client/login`
   **Body JSON** :
   ```json
   { "email": "email@example.com", "password": "motdepasse" }
   ```
   **Réponse (200)** :
   ```json
   { "user": "id_user", "token": "jwt_token" }
   ```

#### 3. Voir tous les clients
- **GET** `/api/client/`
   **Réponse (200)** :
   ```json
   [ { "_id": "...", "nom": "Nom", ... } ]
   ```

#### 4. Voir un client
- **GET** `/api/client/:userId`
   **Réponse (200)** :
   ```json
   { "_id": "...", "nom": "Nom", ... }
   ```

#### 5. Mettre à jour un client
- **PUT** `/api/client/:id`
   **Body JSON** :
   ```json
   { "nom": "Nouveau nom" }
   ```
   **Réponse (200)** :
   ```json
   { "_id": "...", "nom": "Nouveau nom", ... }
   ```

#### 6. Supprimer un client
- **DELETE** `/api/client/:id`
   **Réponse (200)** :
   ```json
   { "message": "User deleted succesfully" }
   ```

---

### Commandes

#### 1. Créer une commande
- **POST** `/api/orders/createNewOrder`
   **Body JSON** :
   ```json
   {
      "produitId": "id_produit",
      "quantity": 2,
      "customerEmail": "client@example.com"
   }
   ```
   **Réponse (200)** :
   ```json
   {
      "message": "Commande enregistrée, mail envoyé",
      "order": { "_id": "...", ... }
   }
   ```

#### 2. Voir toutes les commandes
- **GET** `/api/orders/viewAllOrder`
   **Réponse (200)** :
   ```json
   [ { "_id": "...", "produitId": "...", ... } ]
   ```

#### 3. Voir une commande
- **GET** `/api/orders/viewOneOrder/:id`
   **Réponse (200)** :
   ```json
   { "_id": "...", "produitId": "...", ... }
   ```

#### 4. Mettre à jour une commande
- **PUT** `/api/orders/updateOneOrder/:id`
   **Body JSON** :
   ```json
   { "quantity": 3 }
   ```
   **Réponse (200)** :
   ```json
   { "message": "Commande mise à jour", "order": { ... } }
   ```

#### 5. Supprimer une commande
- **DELETE** `/api/orders/deleteOneOrder/:id`
   **Réponse (200)** :
   ```json
   { "message": "Commande supprimée", "order": { ... } }
   ```

---

### Panier (Chart)

#### 1. Récupérer le panier d'un client
- **GET** `/api/chart/:clientId`
   **Réponse (200)** :
   ```json
   {
      "_id": "...",
      "client": "id_client",
      "products": [
         { "product": { "_id": "...", "nom": "...", "prix": 100 }, "quantity": 2 }
      ],
      "totalPrice": 200,
      "totalItems": 2
   }
   ```

#### 2. Récupérer le total du panier
- **GET** `/api/chart/:clientId/total`
   **Réponse (200)** :
   ```json
   {
      "totalPrice": 200,
      "totalItems": 2,
      "products": 1
   }
   ```

#### 3. Ajouter un produit au panier
- **POST** `/api/chart/:clientId`
   **Body JSON** :
   ```json
   { "productId": "id_produit", "quantity": 2 }
   ```
   **Réponse (200/201)** :
   ```json
   {
      "_id": "...",
      "client": "id_client",
      "products": [ { "product": "id_produit", "quantity": 2 } ]
   }
   ```

#### 4. Mettre à jour la quantité d'un produit
- **PUT** `/api/chart/:clientId/:productId`
   **Body JSON** :
   ```json
   { "quantity": 3 }
   ```
   **Réponse (200)** :
   ```json
   {
      "_id": "...",
      "client": "id_client",
      "products": [ { "product": "id_produit", "quantity": 3 } ]
   }
   ```

#### 5. Retirer un produit du panier
- **DELETE** `/api/chart/:clientId/:productId`
   **Réponse (200)** :
   ```json
   { "message": "Produit supprimé du panier" }
   ```

#### 6. Vider le panier
- **DELETE** `/api/chart/:clientId`
   **Réponse (200)** :
   ```json
   { "message": "Panier vidé avec succès" }
   ```
