// services/autoTitle.service.js
function makeAutoTitleFrom(text) {
  if (!text) return "New chat";
  // Take first sentence or first 6–8 meaningful words
  let t = text
    .replace(/\s+/g, " ")
    .replace(/[`*_#>]/g, "")
    .trim();
  const stopAt = /[.!?]/.exec(t)?.index ?? -1;
  if (stopAt > 12) t = t.slice(0, stopAt);

  const words = t.split(" ").slice(0, 8).join(" ");
  t = words[0]?.toUpperCase() + words.slice(1);
  // Shorten to ~48 chars
  if (t.length > 48) t = t.slice(0, 48).trim() + "…";
  return t || "New chat";
}

module.exports = { makeAutoTitleFrom };
