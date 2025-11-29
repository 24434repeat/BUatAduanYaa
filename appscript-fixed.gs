const DRIVE_FOLDER_ID = '1ywogZf1qMj9AMeTKpV2VUFDbP88jVndf9U2_qyM2Hbne3kJb-fh7PqqH9Ew1c5V2P8pbN9D9';
const SPREADSHEET_ID = '1KdZt6l8dbKoZHgGDf5nk7CgBZCYphh22e-DslpgK8yA';
const SHEET_NAME = 'Buaya';
const DEFAULT_STATUS = 'pending'; // Sesuai dengan enum ReportStatus di Next.js

function parseJsonSafe(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Invalid JSON payload: empty or not a string');
  }
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Invalid JSON payload: ' + err.message);
  }
}

function stripDataUrlPrefix(base64String) {
  if (!base64String) return '';
  const commaIndex = base64String.indexOf(',');
  return commaIndex > -1 ? base64String.substring(commaIndex + 1) : base64String;
}

function saveBase64ImageToDrive(base64String, index) {
  if (!base64String) return '';
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const cleanedBase64 = stripDataUrlPrefix(base64String);
    const decodedBytes = Utilities.base64Decode(cleanedBase64);
    const blob = Utilities.newBlob(decodedBytes, 'image/jpeg', `oli_palsu_${Date.now()}_${index}.jpg`);
    const file = folder.createFile(blob);
    // file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    console.error('Error saving image to Drive:', err);
    return '';
  }
}

function buildGoogleMapsLink(lat, lng) {
  if (!lat || !lng) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function doPost(e) {
  try {
    // Log semua yang diterima untuk debugging
    console.log('doPost called with e:', JSON.stringify(e));
    console.log('e.postData:', e.postData ? JSON.stringify(e.postData) : 'null');
    console.log('e.parameter:', e.parameter ? JSON.stringify(e.parameter) : 'null');
    
    // Handle different ways data can come in
    let payload = null;
    
    // Prioritas 1: postData.contents (JSON body)
    if (e && e.postData && e.postData.contents) {
      console.log('Reading from e.postData.contents');
      console.log('postData.type:', e.postData.type);
      console.log('postData.contents:', e.postData.contents);
      payload = parseJsonSafe(e.postData.contents);
    } 
    // Prioritas 2: e.parameter (form data atau query params)
    else if (e && e.parameter) {
      console.log('Reading from e.parameter');
      // Jika parameter.action ada, berarti ini form data
      if (e.parameter.action) {
        payload = e.parameter;
      } else {
        // Coba parse sebagai JSON jika ada
        payload = e.parameter;
      }
    } 
    // Prioritas 3: Direct object (for testing)
    else if (e && typeof e === 'object' && e.action) {
      console.log('Reading from e directly');
      payload = e;
    } 
    else {
      console.error('No valid data source found');
      return createJsonResponse({ 
        success: false, 
        message: 'No POST data received. Expected e.postData.contents or e.parameter.' 
      });
    }

    console.log('Parsed payload:', JSON.stringify(payload));
    console.log('Payload type:', typeof payload);

    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload type or null');
      return createJsonResponse({ 
        success: false, 
        message: 'Invalid payload: must be an object. Received: ' + typeof payload 
      });
    }

    // Log untuk debugging
    console.log('Final payload:', JSON.stringify(payload));
    console.log('Payload keys:', Object.keys(payload));
    
    // Cek action dengan berbagai kemungkinan nama field
    const action = payload.action || payload.Action || payload.ACTION || payload['action'] || null;
    console.log('Action from payload:', action);
    console.log('Action type:', typeof action);
    console.log('Has action field?', 'action' in payload);
    console.log('Has Action field?', 'Action' in payload);

    // Jika tidak ada action, cek apakah ini delete request berdasarkan field yang ada
    if (!action) {
      // Jika ada rowNumber tapi tidak ada description, kemungkinan ini delete request
      if (payload.rowNumber && !payload.description) {
        console.log('⚠ No action found, but has rowNumber without description - treating as delete');
        return handleDelete(payload);
      }
      // Jika ada rowNumber dan status, kemungkinan ini updateStatus request
      if (payload.rowNumber && payload.status) {
        console.log('⚠ No action found, but has rowNumber and status - treating as updateStatus');
        return handleUpdateStatus(payload);
      }
      // Default ke create
      console.log('⚠ No action found, defaulting to create');
      return handleCreate(payload);
    }

    // Pastikan action adalah string dan trim whitespace
    const actionStr = String(action).trim().toLowerCase();
    console.log('Normalized action:', actionStr);

    // Routing berdasarkan action - cek dengan lebih eksplisit
    if (actionStr === 'updatestatus' || actionStr === 'update_status' || actionStr === 'updatestatus') {
      console.log('✓ Routing to handleUpdateStatus');
      return handleUpdateStatus(payload);
    }

    if (actionStr === 'delete' || actionStr === 'remove' || actionStr === 'del') {
      console.log('✓ Routing to handleDelete');
      return handleDelete(payload);
    }

    // Jika action tidak dikenali tapi ada rowNumber tanpa description, kemungkinan ini delete
    if (payload.rowNumber && !payload.description) {
      console.log('⚠ Action "' + actionStr + '" tidak dikenali, tapi ada rowNumber tanpa description - routing to handleDelete');
      return handleDelete(payload);
    }

    console.log('⚠ Routing to handleCreate (default) - action was: "' + actionStr + '"');
    console.log('⚠ Full payload:', JSON.stringify(payload));
    return handleCreate(payload);
  } catch (error) {
    console.error('Error in doPost:', error);
    console.error('Error stack:', error.stack);
    return createJsonResponse({ 
      success: false, 
      message: 'Server error: ' + error.toString() 
    });
  }
}

function handleCreate(data) {
  try {
    if (!data || typeof data !== 'object') {
      return createJsonResponse({ 
        success: false, 
        message: 'Invalid data: must be an object.' 
      });
    }

    const description = data.description || '';
    if (!description || description.trim() === '') {
      return createJsonResponse({ 
        success: false, 
        message: 'Description is required.' 
      });
    }

    const name = data.name || '';
    const phone = data.phone || '';
    const lat = data.lat || '';
    const lng = data.lng || '';
    const images = Array.isArray(data.images) ? data.images.slice(0, 3) : [];

    const mapsLink = buildGoogleMapsLink(lat, lng);
    const imageUrls = [];

    for (var i = 0; i < 3; i++) {
      const base64Image = images[i] || '';
      imageUrls.push(base64Image ? saveBase64ImageToDrive(base64Image, i + 1) : '');
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ 
        success: false, 
        message: 'Sheet "' + SHEET_NAME + '" not found.' 
      });
    }

    const timestamp = new Date();
    const row = [
      timestamp,
      name,
      phone,
      description,
      lat,
      lng,
      mapsLink,
      imageUrls[0],
      imageUrls[1],
      imageUrls[2],
      DEFAULT_STATUS,
    ];

    sheet.appendRow(row);

    return createJsonResponse({
      success: true,
      message: 'Report saved successfully.',
      data: {
        timestamp,
        name,
        phone,
        description,
        lat,
        lng,
        googleMapsLink: mapsLink,
        images: imageUrls,
      },
    });
  } catch (error) {
    console.error('Error in handleCreate:', error);
    return createJsonResponse({ 
      success: false, 
      message: 'Error creating report: ' + error.toString() 
    });
  }
}

function handleUpdateStatus(payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return createJsonResponse({ 
        success: false, 
        message: 'Invalid payload: must be an object.' 
      });
    }

    const rowNumber = Number(payload.rowNumber);
    const status = payload.status;

    if (!rowNumber || isNaN(rowNumber) || rowNumber < 1) {
      return createJsonResponse({ 
        success: false, 
        message: 'rowNumber wajib diisi dan harus berupa angka yang valid.' 
      });
    }

    if (!status || typeof status !== 'string') {
      return createJsonResponse({ 
        success: false, 
        message: 'status wajib diisi dan harus berupa string.' 
      });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ 
        success: false, 
        message: 'Sheet "' + SHEET_NAME + '" not found.' 
      });
    }

    const lastRow = sheet.getLastRow();
    if (rowNumber < 2 || rowNumber > lastRow) {
      return createJsonResponse({ 
        success: false, 
        message: 'rowNumber di luar jangkauan. Valid range: 2-' + lastRow + ', received: ' + rowNumber 
      });
    }

    const STATUS_COLUMN = 11;
    sheet.getRange(rowNumber, STATUS_COLUMN).setValue(status);

    return createJsonResponse({
      success: true,
      message: 'Status laporan berhasil diperbarui.',
      data: { rowNumber, status },
    });
  } catch (error) {
    console.error('Error in handleUpdateStatus:', error);
    return createJsonResponse({ 
      success: false, 
      message: 'Error updating status: ' + error.toString() 
    });
  }
}

function handleDelete(payload) {
  try {
    console.log('handleDelete called with payload:', JSON.stringify(payload));
    
    if (!payload || typeof payload !== 'object') {
      console.error('handleDelete: Invalid payload');
      return createJsonResponse({ 
        success: false, 
        message: 'Invalid payload: must be an object.' 
      });
    }

    const rowNumber = Number(payload.rowNumber);
    console.log('handleDelete: rowNumber =', rowNumber, '(type:', typeof rowNumber, ')');

    if (!rowNumber || isNaN(rowNumber) || rowNumber < 1) {
      console.error('handleDelete: Invalid rowNumber');
      return createJsonResponse({ 
        success: false, 
        message: 'rowNumber wajib diisi dan harus berupa angka yang valid. Received: ' + payload.rowNumber 
      });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.error('handleDelete: Sheet not found');
      return createJsonResponse({ 
        success: false, 
        message: 'Sheet "' + SHEET_NAME + '" not found.' 
      });
    }

    const lastRow = sheet.getLastRow();
    console.log('handleDelete: lastRow =', lastRow);
    
    if (rowNumber < 2 || rowNumber > lastRow) {
      console.error('handleDelete: rowNumber out of range');
      return createJsonResponse({ 
        success: false, 
        message: 'rowNumber di luar jangkauan. Valid range: 2-' + lastRow + ', received: ' + rowNumber 
      });
    }

    console.log('handleDelete: Deleting row', rowNumber);
    sheet.deleteRow(rowNumber);
    console.log('handleDelete: Row deleted successfully');

    return createJsonResponse({
      success: true,
      message: 'Laporan berhasil dihapus.',
      data: { rowNumber },
    });
  } catch (error) {
    console.error('Error in handleDelete:', error);
    console.error('Error stack:', error.stack);
    return createJsonResponse({ 
      success: false, 
      message: 'Error deleting report: ' + error.toString() 
    });
  }
}

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ 
        success: false, 
        message: 'Sheet "' + SHEET_NAME + '" not found.' 
      });
    }

    const values = sheet.getDataRange().getValues();

    if (values.length < 2) {
      return createJsonResponse({ success: true, data: [] });
    }

    const header = values[0];
    const dataRows = values.slice(1);

    const records = dataRows.map(function (row, index) {
      const obj = {};
      header.forEach(function (key, colIndex) {
        obj[key] = row[colIndex];
      });
      obj.rowNumber = index + 2; // baris data mulai dari 2
      return obj;
    });

    return createJsonResponse({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error in doGet:', error);
    return createJsonResponse({ 
      success: false, 
      message: 'Error fetching reports: ' + error.toString() 
    });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

