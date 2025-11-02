// utils/isFollowup.js
function isFollowupMessage(text) {
  const t = text.toLowerCase().trim();
  const short = t.length < 20; // heuristics
  const followupWords = [
    "short answer",
    "make it short",
    "summarize",
    "in short",
    "tell shortly",
    "explain more",
    "make it longer",
    "translate",
    "in sinhala",
    "in tamil",
    "give me a summary",
  ];
  if (followupWords.some((w) => t.includes(w))) return true;
  // very short messages after a long answer → probably followup
  return short;
}

module.exports = { isFollowupMessage };
