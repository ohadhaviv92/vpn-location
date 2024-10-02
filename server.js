import express from "express";
import { locations } from "./location.js";
import { users } from "./users.js";

const app = express();
const PORT = process.env.PORT || 3000;

let userIndex = 0;

let locationIndex = 0;

setInterval(() => {
  locationIndex = 0;
}, 1000 * 60 * 70);

app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});

app.get("/location", (req, res) => {
  const userData = users[userIndex++ % users.length];
  const location = locations[locationIndex++ % locations.length];
  res.json({
    location,
    user: userData,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
