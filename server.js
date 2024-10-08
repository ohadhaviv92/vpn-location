import express from "express";
import { locations } from "./location.js";
import fs from "fs/promises";

let usersArr = [];
const app = express();
const PORT = process.env.PORT || 3002;

let index = 0;

app.use(express.json());

app.post("/addUserSession", (req, res) => {
  const { username, cookie, localStorage } = req.body;
  if (username && cookie && localStorage) {
    const userToUpdate = usersArr.find((user) => user.username === username);
    if (userToUpdate) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      userToUpdate.session = {
        cookie,
        localStorage,
        sessionExpiry: expiryDate,
      };
      res.status(200).json({
        message: "User session updated successfully",
        user: userToUpdate,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
});

async function init() {
  try {
    const data = await fs.readFile("./usersData.json", "utf8");
    const { users } = JSON.parse(data);
    usersArr.push(...users);
    console.log("Users loaded from userData.json");
  } catch (error) {
    console.error("Error reading userData.json:", error);
  }

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

setInterval(() => {
  //save usersArr to file
  console.log("Saving users to file");
  fs.writeFile(
    "./usersData.json",
    JSON.stringify({ users: usersArr }),
    "utf8"
  ).catch((error) => {
    console.error("Error saving users to file:", error);
  });
  locationIndex = 0;
}, 1000 * 60 * 70);

app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});

app.get("/location", (req, res) => {
  const userData = usersArr[index % usersArr.length];
  const location = locations[index % locations.length];
  index++;
  if (userData.session && userData.session.sessionExpiry) {
    const expiryDate = new Date(userData.session.sessionExpiry);
    if (expiryDate < new Date()) {
      userData.session = null;
    }
  }
  res.json({
    location,
    user: userData,
  });
});

init();
