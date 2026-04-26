const mongoose = require('mongoose');

// Connexion à MongoDB
mongoose.connect(
    process.env.MONGO_URI // lien(ou chemin ou URL) vers la base mongo
).then(
    () => console.log("✅ MongoDB Connected")
).catch(
    err => console.error("❌ Connection error: " + err)
);