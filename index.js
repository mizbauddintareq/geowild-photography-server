const express = require("express");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.taxrqnn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Create JWT
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
  res.send({ token });
});

// verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "unauthorize access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const servicesCollection = client
      .db("geoWild-photography")
      .collection("services");

    const reviewsCollection = client
      .db("geoWild-photography")
      .collection("reviews");

    //   Get limited services API
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.limit(3).toArray();
      res.send(services);
    });

    //   Get all service API
    app.get("/services/all", async (req, res) => {
      const allServices = await servicesCollection.find({}).toArray();
      res.send(allServices);
    });

    //   Get single service by id API
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });

    // Post Review API
    app.post("/review", async (req, res) => {
      const data = req.body;
      const reviews = await reviewsCollection.insertOne(data);
      res.send(reviews);
    });

    // Get reviews API
    app.get("/reviews", async (req, res) => {
      let query = {};
      const service = req.query.service;
      if (service) {
        query = {
          serviceName: service,
        };
      }
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    // Get review by id API
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const review = await reviewsCollection.findOne(query);
      res.send(review);
    });

    // Get my reviews API
    app.get("/myReviews", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (req.decoded.email !== email) {
        return res.status(401).send({ message: "unauthorize access" });
      }

      let query = {};
      if (email) {
        query = {
          userEmail: email,
        };
      }
      const cursor = reviewsCollection.find(query);
      const myReviews = await cursor.toArray();
      res.send(myReviews);
    });

    // Delete review API
    app.delete("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/review/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const review = req.body;
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          userName: review.userName,
          userEmail: review.userEmail,
          serviceName: review.serviceName,
        },
      };

      const result = await reviewsCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
