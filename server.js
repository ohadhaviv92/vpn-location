import express from "express";
import { locations } from "./location.js";
import { locationsNord } from "./location-nordvpn.js";
import fs from "fs/promises";
import axios from "axios";
let usersArr = [];
const app = express();
const PORT = process.env.PORT || 3002;

let userIndex = 0;
let locationIndex = 0;

let nordLocationIndex = 0;

const sessionToCookie = {};

app.use(express.json());

app.post("/sellSession", (req, res) => {
  const { cookies } = req.body;
  if (cookies) {
    let sessionID = Date.now().toString();
    sessionToCookie[sessionID] = cookies;
    res.status(200).json({ message: "Session saved", sessionID: sessionID });
  } else {
    res.status(400).json({ message: "Invalid cookies" });
  }
});

app.get("/listItem/:sessionID", async (req, res) => {
  const { asset_id, price } = req.query;
  let error = null;
  await listItem(asset_id, price, sessionToCookie[req.params.sessionID]).catch(
    (e) => {
      error = e.message;
    }
  );
  if (error) {
    res.status(500).json({ message: error });
  }
  res.status(200).json({ message: "Item listed" });
});

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

async function listItem(asset_id, price, cookie) {
  console.log("Listing item", asset_id, price, cookie);
  const url = "https://csfloat.com/api/v1/listings";
  await axios.post(
    url,
    {
      asset_id: asset_id,
      price: price,
      type: "buy_now",
    },
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Referer: "https://csfloat.com/sell",
      },
    }
  );
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
}, 1000 * 60 * 70);

app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});

app.get("/location", (req, res) => {
  const userData = usersArr[userIndex++ % usersArr.length];
  const location = locations[locationIndex++ % locations.length];

  if (userData.session && userData.session.sessionExpiry) {
    const expiryDate = new Date(userData.session.sessionExpiry);
    if (expiryDate < new Date()) {
      userData.session = null;
    }
  }
  res.json({
    location,
    user: userData,
    session: userData.session,
  });
});

app.get("/location-nordvpn", (req, res) => {
  const userData = usersArr[userIndex++ % usersArr.length];
  const location =
    locationsNord[nordLocationIndex++ % locationsNord.length].command;

  if (userData.session && userData.session.sessionExpiry) {
    const expiryDate = new Date(userData.session.sessionExpiry);
    if (expiryDate < new Date()) {
      userData.session = null;
    }
  }
  res.json({
    location,
    user: userData,
    session: userData.session,
  });
});

init();
