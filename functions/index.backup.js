const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");

exports.scheduledRSSPoll = onSchedule({
  schedule: "every 4 hours",
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["ADMIN_TOKEN", "GEMINI_API_KEY"],
}, async () => {
  console.log("Scheduled poll placeholder");
});

exports.manualRSSPoll = onRequest({
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["ADMIN_TOKEN", "GEMINI_API_KEY"],
  cors: true,
}, async (req, res) => {
  res.json({ success: true, message: "placeholder" });
});
