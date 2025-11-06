// server.js
require("dotenv").config();
const app = require("./app");
const cors = require("cors");

app.use(cors({
  origin: process.env.CLIENT_ORIGIN, 
  methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
}));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
