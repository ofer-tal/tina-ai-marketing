import fs from "fs";

// Read the .env file
let content = fs.readFileSync(".env", "utf8");

// Update MongoDB URI to use MongoDB Atlas (placeholder for user to configure)
content = content.replace(
  /MONGODB_URI=mongodb:\/\/localhost:27017\/blush-marketing/,
  `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blush-marketing?retryWrites=true&w=majority`
);

fs.writeFileSync(".env", content);
console.log(".env updated with MongoDB Atlas placeholder");
console.log("Please update MONGODB_URI with your actual MongoDB Atlas credentials");
