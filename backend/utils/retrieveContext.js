// utils/retrieveContext.js
const KNOWLEDGE_BASE = require("../data/knowledgeBase");

function retrieveContext(query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(" ").filter((w) => w.length > 3);

  const relevantChunks = KNOWLEDGE_BASE.filter((chunk) => {
    const textLower = chunk.text.toLowerCase();
    const sourceLower = chunk.source.toLowerCase();
    return (
      textLower.includes(queryLower) ||
      keywords.some((kw) => textLower.includes(kw) || sourceLower.includes(kw))
    );
  });

  console.log(
    `Found ${relevantChunks.length} relevant chunks for query: "${query}"`
  );

  return relevantChunks;
}

module.exports = retrieveContext;
