function myFunction() {
/**
 * HOMOEOASCENT 1.0 – 2026 | Google Apps Script Backend
 * Routes generated certificate PDFs into separate Google Drive folders
 * based on Participant Category: Student, Intern, or Practitioner.
 *
 * ============================================================================
 * MANDATORY 3-STEP SETUP (Why PDFs fail to save if skipped):
 * ============================================================================
 * 1. Paste your 3 Google Drive Folder IDs (or full Folder URLs) in
 *    DEFAULT_FOLDERS below (or inside DRIVE_CONFIG in index.html).
 * 2. CRITICAL: In the Apps Script toolbar at the top, select
 *    `testAndAuthorizeDrive` from the function dropdown and click "Run".
 *    -> Click "Review permissions" -> Choose your Google Account ->
 *       Click "Advanced" -> "Go to Untitled project (unsafe)" -> "Allow".
 *    -> This grants the script permission to create PDFs in your Google Drive
 *       and drops a test file into your folders to verify they work!
 * 3. Click "Deploy" -> "New deployment" (or "Manage deployments" -> Edit ->
 *    Version: "New version" if updating an existing deployment!):
 *    - Select type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Click Deploy and copy the `/exec` Web App URL into `DRIVE_CONFIG.webAppUrl`
 *      inside `index.html`.
 */

var DEFAULT_FOLDERS = {
  "Student": "PASTE_STUDENT_GOOGLE_DRIVE_FOLDER_ID_OR_URL_HERE",
  "Intern": "PASTE_INTERN_GOOGLE_DRIVE_FOLDER_ID_OR_URL_HERE",
  "Practitioner": "PASTE_PRACTITIONER_GOOGLE_DRIVE_FOLDER_ID_OR_URL_HERE"
};

/**
 * Extracts a clean Google Drive Folder ID whether you paste a full URL
 * (like https://drive.google.com/drive/folders/1AbCdEf... ) or a raw ID.
 * Returns "" if the string is still a placeholder.
 */
function extractFolderId(input) {
  if (!input) return "";
  var str = String(input).trim();
  if (!str || str.indexOf("PASTE_") !== -1 || str.indexOf("YOUR_") !== -1) {
    return "";
  }
  var folderMatch = str.match(/folders\/([a-zA-Z0-9_-]{15,})/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  var idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  var rawMatch = str.match(/[-\w]{25,}/);
  return rawMatch ? rawMatch[0] : str;
}

/**
 * Resolves the target Drive folder for a category ("Student", "Intern", "Practitioner").
 * If no valid Folder ID is configured, automatically creates/uses a folder
 * named "HOMOEOASCENT_2026_<Category>" in your root Google Drive so no PDF is ever lost.
 */
function getTargetFolder(category, clientFolderId) {
  var safeCategory = ["Student", "Intern", "Practitioner"].indexOf(category) !== -1
    ? category
    : "Student";

  var folderId = extractFolderId(clientFolderId) || extractFolderId(DEFAULT_FOLDERS[safeCategory]);
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (err) {
      Logger.log("Folder ID lookup failed for " + folderId + ", falling back to auto-folder: " + err);
    }
  }

  var fallbackName = "HOMOEOASCENT_2026_" + safeCategory;
  var existing = DriveApp.getFoldersByName(fallbackName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return DriveApp.createFolder(fallbackName);
}

/**
 * STEP 2: Select `testAndAuthorizeDrive` in the Apps Script top bar and click "Run" ONCE!
 * This triggers the Google Drive permission prompt and verifies your folders.
 */
function testAndAuthorizeDrive() {
  var categories = ["Student", "Intern", "Practitioner"];
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var folder = getTargetFolder(cat, "");
    Logger.log("Verified folder for [" + cat + "]: " + folder.getName() + " (ID: " + folder.getId() + ")");
  }
}

function doPost(e) {
  try {
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(rawContents);

    var category = data.category || "Student";
    if (["Student", "Intern", "Practitioner"].indexOf(category) === -1) {
      category = "Student";
    }

    var folder = getTargetFolder(category, data.folderId);

    // Strip any accidental data URI prefix before decoding Base64
    var cleanBase64 = String(data.pdfBase64 || "").replace(/^data:application\/pdf;[^,]*,/, "");
    var pdfBytes = Utilities.base64Decode(cleanBase64);
    var fileName = data.fileName || ("HOMOEOASCENT_1.0_2026_" + category + "_" + (data.fullName || "Participant") + ".pdf");
    var blob = Utilities.newBlob(pdfBytes, "application/pdf", fileName);
    var file = folder.createFile(blob);

    file.setDescription(
      "Event: HOMOEOASCENT 1.0 - 2026 | Name: " + (data.fullName || "") +
      " | Email: " + (data.email || "") +
      " | Category: " + category +
      " | Claim #: " + (data.claimNumber || "")
    );

    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      fileId: file.getId(),
      fileName: file.getName(),
      category: category,
      folderName: folder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
}
