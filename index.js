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
  user_id: {
    type: String,
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
    type: String,
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
  User.find({}, { __v: 0 })
    .then((foundUsers) => {
      return res.json(foundUsers);
    })
    .catch((err) => {
      return res.json({ error: err });
    });
});

// POST /api/users/:id/exercises
app.post("/api/users/:_id/exercises", (req, res) => {
  // Récupérer les données du body
  const id = req.body._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date || new Date();
  // Attribuer l'id du user au paramettre _id dans l'url
  req.params._id = id;
  // Créer un objet exercise avec les données récupéré
  new Exercise({
    user_id: id,
    description: description,
    duration: duration,
    date: new Date(date).toDateString(),
  })
    .save() // Enregistrer l'objet exercise dans la base de donnée
    .then((savedExercise) => {
      // Rechercher le username du user avec l'id user_id
      User.findOne({ _id: savedExercise.user_id })
        .then((foundUser) => {
          if (foundUser) {
            return res.json({
              _id: savedExercise._id,
              username: foundUser.username,
              description: savedExercise.description,
              duration: savedExercise.duration,
              date: savedExercise.date,
            });
          } else {
            return res.json({ error: "username not found" });
          }
        })
        .catch((err) => {
          return res.json({ error: err });
        });
    })
    .catch((err) => {
      return res.json({ error: err });
    });
});

// GET /api/users/:id/logs
app.get("/api/users/:_id/logs", (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;
  const fromDate = from ? new Date(from).toDateString() : null;
  const toDate = to ? new Date(to).toDateString() : null;

  // initialiser l'objet du filtre
  const dateFilter = {};
  // S'il y'a une date de début spécifié dans l'url, parser cette url et stocker dans fromDate
  if (fromDate) dateFilter.$gte = fromDate;
  // S'il y'a une date de fin spécifié dans l'url, parser cette url et stocker dans toDate
  if (toDate) dateFilter.$lte = toDate;
  // Préparer la requête
  const query = Exercise.find(
    {
      user_id: id,
      // filtre de date si sprécisé dans url
      ...(fromDate || toDate ? { date: dateFilter } : {}),
    },
    // ne pas afficher les champs user_id, _id des exercices dans la sortie
    { user_id: 0, _id: 0 }
  );
  // Executer la requête
  query
    .limit(limit)
    .exec()
    .then((foundExercises) => {
      // Chercher le username du user
      User.findOne({ _id: id })
        .then((foundUser) => {
          if (foundUser) {
            // Si trouvé
            // Stocker le username dans username
            const username = foundUser.username;
            return res.json({
              _id: id,
              username: username,
              count: foundExercises.length,
              log: foundExercises,
            });
          } else {
            return res.json({ error: "User not found" });
          }
        })
        .catch((err) => {
          return res.json({ error: err });
        });
    });
});

// Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
