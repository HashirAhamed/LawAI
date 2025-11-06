// server.js
require("dotenv").config();
const app = require("./app");
// const cors = require("cors"); // No longer needed here

// The CORS policy is now inside app.js

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});