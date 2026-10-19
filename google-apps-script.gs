/**
 * HOMOEOASCENT 1.0 – 2026 | Google Apps Script Backend
 * Routes generated certificate PDFs into separate Google Drive folders
 * based on Participant Category: Student, Intern, or Practitioner.
 *
 * SETUP:
 * 1. Create 3 folders in Google Drive:
 *    - Student Certificates
 *    - Intern Certificates
 *    - Practitioner Certificates
 * 2. Copy the Folder ID from each folder's URL in Google Drive and paste below
 *    (or pass them from DRIVE_CONFIG in index.html).
 * 3. In Google Apps Script (https://script.google.com), paste this code,
 *    click Deploy -> New deployment -> Select type: Web app ->
 *    Execute as: Me -> Who has access: Anyone -> Deploy.
 * 4. Copy the Web App URL into DRIVE_CONFIG.webAppUrl in index.html and set enabled: true.
 */

var DEFAULT_FOLDERS = {
  "Student": "PASTE_STUDENT_GOOGLE_DRIVE_FOLDER_ID_HERE",
  "Intern": "PASTE_INTERN_GOOGLE_DRIVE_FOLDER_ID_HERE",
  "Practitioner": "PASTE_PRACTITIONER_GOOGLE_DRIVE_FOLDER_ID_HERE"
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var category = data.category || "Student";
    if (["Student", "Intern", "Practitioner"].indexOf(category) === -1) {
      category = "Student";
    }

    // Use folderId sent from index.html DRIVE_CONFIG or fallback to DEFAULT_FOLDERS
    var targetFolderId = (data.folderId && data.folderId.indexOf("PASTE_") === -1)
      ? data.folderId
      : DEFAULT_FOLDERS[category];

    var folder = DriveApp.getFolderById(targetFolderId);
    var pdfBytes = Utilities.base64Decode(data.pdfBase64);
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
      status: "success",
      fileId: file.getId(),
      category: category,
      folderId: targetFolderId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
