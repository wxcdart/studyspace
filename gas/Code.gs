var SPACES_SHEET = "Spaces";
var STATS_SHEET = "Stats";

/**
 * GET /exec?action=spaces  — returns the full spaces catalog
 * GET /exec?action=stats   — returns aggregate pomodoro stats
 * GET /exec                — defaults to spaces
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "spaces";

  try {
    var data;
    if (action === "stats") {
      data = getStats();
    } else {
      data = getSpaces();
    }
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/**
 * POST /exec
 * Body (JSON): { action: "log_pomodoro", spaceId, durationSeconds }
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.action === "log_pomodoro") {
      logPomodoro(payload.spaceId, payload.durationSeconds);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

function getSpaces() {
  var sheet = getSheet(SPACES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];                // SpaceID | Name | YouTubeID | AmbientSoundURLs | Category
  var spaces = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var spaceId = row[headers.indexOf("SpaceID")];
    if (!spaceId) continue;            // skip blank rows

    var rawSounds = String(row[headers.indexOf("AmbientSoundURLs")] || "");
    var ambientSounds = rawSounds
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .map(function (url) {
        // Expected format: "label|url" or just "url"
        var parts = url.split("|");
        return parts.length === 2
          ? { label: parts[0].trim(), url: parts[1].trim() }
          : { label: "", url: parts[0].trim() };
      });

    spaces.push({
      id:           spaceId,
      name:         row[headers.indexOf("Name")],
      youtubeId:    row[headers.indexOf("YouTubeID")],
      ambientSounds: ambientSounds,
      category:     row[headers.indexOf("Category")]
    });
  }

  return spaces;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function logPomodoro(spaceId, durationSeconds) {
  var sheet = getSheet(STATS_SHEET);
  sheet.appendRow([new Date(), spaceId || "", durationSeconds || 0]);
}

function getStats() {
  var sheet = getSheet(STATS_SHEET);
  var rows = sheet.getDataRange().getValues();
  var total = Math.max(0, rows.length - 1); // minus header row
  return { totalPomodoros: total };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet \"" + name + "\" not found");
  return sheet;
}

function jsonResponse(data, statusCode) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
