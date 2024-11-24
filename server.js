import express from "express";
import { locations } from "./location.js";
import { locationsNord } from "./location-nordvpn.js";
import fs from "fs/promises";
import axios from "axios";
let usersArr = [];
const app = express();
const PORT = process.env.PORT || 3002;

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
  if (!req.params.sessionID || !asset_id || !price) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }
  let error = null;
  let cookie = sessionToCookie[req.params.sessionID];
  if (!cookie) {
    res.status(400).json({ message: "Invalid sessionID no cookie" });
    return;
  }
  await listItem(asset_id, price, sessionToCookie[req.params.sessionID]).catch(
    (e) => {
      error = e.message;
    }
  );
  if (error) {
    res.status(500).json({ message: error });
    return;
  }
  res.status(200).json({ message: "Item listed" });
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
}, 1000 * 60 * 120);

app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});

app.get("/broken-location", (req, res) => {
  res.send(
    locations.filter((location) => {
      return location.block || location.userNotLogin;
    })
  );
});

app.get("/broken-location-nordvpn", (req, res) => {
  res.send(
    locationsNord.filter((location) => {
      return location.block || location.userNotLogin;
    })
  );
});

app.get("/location", (req, res) => {
  let { prevLocationName, rateLimitReset, block, userNotLogin } = req.query;
  let userIndex;
  if (block || userNotLogin) {
    const indexBlock = locations.findIndex(
      (location) => location.name === prevLocationName
    );
    if (indexBlock !== -1) {
      if (block) {
        locations[indexBlock].block = true;
      } else {
        locations[indexBlock].userNotLogin = true;
      }
      delete locations[indexBlock].rateLimitReset;
    }
  }
  if (prevLocationName && rateLimitReset) {
    rateLimitReset = parseInt(rateLimitReset);
    const locationIndex = locations.findIndex(
      (location) => location.name === prevLocationName
    );
    if (locationIndex !== -1) {
      locations[locationIndex].rateLimitReset = rateLimitReset;
    }
  }
  const now = Date.now();
  let locationRes;
  const locationIndex = locations.findIndex((location) => {
    return (
      location.rateLimitReset < now && !location.block && !location.userNotLogin
    );
  });
  if (locationIndex !== -1) {
    locations[locationIndex].rateLimitReset += 1000 * 60 * 5;
    locationRes = locations[locationIndex].name;
    userIndex = locationIndex;
  } else {
    const index = locations.findIndex((location) => {
      return (
        location.rateLimitReset === undefined &&
        !location.block &&
        !location.userNotLogin
      );
    });
    if (index !== -1) {
      locations[index].rateLimitReset = now + 1000 * 60 * 5;
      locationRes = locations[index].name;
      userIndex = index;
    }
  }
  if (!locationRes) {
    res.json({
      error: "No available location",
    });
  } else {
    const userData = usersArr[userIndex % usersArr.length];
    if (userData.session && userData.session.sessionExpiry) {
      const expiryDate = new Date(userData.session.sessionExpiry);
      if (expiryDate < new Date()) {
        userData.session = null;
      }
    }
    res.json({
      location: locationRes,
      user: userData,
      session: userData.session,
    });
  }
});

app.get("/available-locations-nordvpn", (req, res) => {
  const arr = locationsNord.filter(
    (location) => location.rateLimitReset < Date.now()
  );
  res.json(arr);
});

app.get("/available-locations", (req, res) => {
  const arr = locations.filter(
    (location) => location.rateLimitReset < Date.now()
  );
  res.json(arr);
});

app.get("/location/all", (req, res) => {
  res.json(locations);
});

app.get("/location-nordvpn", (req, res) => {
  let { prevLocationName, rateLimitReset, block, userNotLogin } = req.query;
  let userIndex;
  if (block || userNotLogin) {
    const indexBlock = locationsNord.findIndex(
      (location) => location.command === prevLocationName
    );
    if (locationIndex !== -1) {
      if (block) {
        locationsNord[indexBlock].block = true;
      } else {
        locationsNord[indexBlock].userNotLogin = true;
      }
      delete locationsNord[indexBlock].rateLimitReset;
    }
  }
  if (prevLocationName && rateLimitReset) {
    rateLimitReset = parseInt(rateLimitReset);
    const locationIndex = locationsNord.findIndex(
      (location) => location.command === prevLocationName
    );
    if (locationIndex !== -1) {
      locationsNord[locationIndex].rateLimitReset = rateLimitReset;
    }
  }
  const now = Date.now();
  let locationRes;
  const locationIndex = locationsNord.findIndex((location) => {
    return (
      location.rateLimitReset < now && !location.block && !location.userNotLogin
    );
  });
  if (locationIndex !== -1) {
    locationsNord[locationIndex].rateLimitReset += 1000 * 60 * 60;
    locationRes = locationsNord[locationIndex].command;
    userIndex = locationIndex;
  } else {
    const index = locationsNord.findIndex((location) => {
      return (
        location.rateLimitReset === undefined &&
        !location.block &&
        !location.userNotLogin
      );
    });
    if (index !== -1) {
      locationsNord[index].rateLimitReset = now + 1000 * 60 * 60;
      locationRes = locationsNord[index].command;
      userIndex = index;
    }
  }
  if (!locationRes) {
    res.json({
      error: "No available location",
    });
  } else {
    const userData = usersArr[usersArr.length - 1 - userIndex];
    if (userData.session && userData.session.sessionExpiry) {
      const expiryDate = new Date(userData.session.sessionExpiry);
      if (expiryDate < new Date()) {
        userData.session = null;
      }
    }
    res.json({
      location: locationRes,
      user: userData,
      session: userData.session,
    });
  }
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

init();
