const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Connexion à la base de données
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connecté à MongoDB");
  })
  .catch((error) => {
    console.error("Error de connexion à MongoDB : ", error);
  });

// Définition du schema user
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});
// Modèle User
const User = mongoose.model("User", userSchema);

// Définition du schema exercise
const exerciseSchema = mongoose.Schema({
  username: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 20,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});
// Modèle Exercise
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.urlencoded({ extended: true })); // Permettre de parser les données provenant des formulaires classique <form>.
app.use(express.json()); // Permettre de parser les données envoyés en POST avec du JSON brut dans le body

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// POST /api/users
app.post("/api/users", (req, res) => {
  const username = req.body.username;
  // Vérifier si le username existe déjà
  User.findOne({ username: username }, { __v: 0 })
    .then((foundUser) => {
      if (foundUser) {
        // Si oui renvoyer l'objet user existant
        return res.json(foundUser);
      } else {
        // Si non enregister le nouveau user dans la base et renvoyer l'objet enregisté ensuite.
        new User({ username: username })
          .save()
          .then((savedUser) => {
            // Renvoyer user après enregistrement
            const user = savedUser.toObject();
            delete user.__v;
            return res.json(user);
          })
          .catch((err) => {
            return res.json({ error: err });
          });
      }
    })
    .catch((err) => {
      return res.json({ error: err });
    });
});

// GET /api/users
app.get("/api/users", (req, res) => {
  User.findAll();
});

// POST /api/users/:id/exercises
app.post("/api/users/:_id/exercises", (req, res) => {});

// GET /api/users/:id/logs
app.get("/api/users/:_id/logs?[from][&to][&limit]", (req, res) => {});

// Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
