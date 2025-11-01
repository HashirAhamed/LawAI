// models/LegalDocument.js
const mongoose = require("mongoose");

const legalDocumentSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    text: { type: String, required: true },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LegalDocument", legalDocumentSchema);
