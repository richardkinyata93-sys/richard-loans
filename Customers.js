/*******************************************************
 * CUSTOMERS ENGINE
 * Loan Management System
 *******************************************************/

function generateCustomerId_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.CUSTOMERS);

  if (!sheet) {
    throw new Error('Customers sheet not found. Please run Setup System first.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 'CUS-00001';
  }

  var ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat();

  var highest = 0;

  ids.forEach(function(id) {
    if (!id) return;

    var match = String(id).match(/^CUS-(\d+)$/i);

    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  });

  return 'CUS-' + String(highest + 1).padStart(5, '0');
}


/* =====================================================
   CURRENT USER
===================================================== */

function getCurrentUser_() {
  try {
    var email = Session.getActiveUser().getEmail();

    if (email) {
      return email;
    }
  } catch (error) {
    // Ignore and use fallback
  }

  return 'Administrator';
}


/* =====================================================
   CREATE CUSTOMER
===================================================== */

function createCustomer(data) {

  if (!data) {
    throw new Error('No customer information was provided.');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.CUSTOMERS
  );

  if (!sheet) {
    throw new Error(
      'Customers sheet not found. Please run Setup System first.'
    );
  }


  /* ---------------------------------------------------
     VALIDATE NAME
  --------------------------------------------------- */

  var name = String(data.name || '').trim();

  if (!name) {
    throw new Error('Customer name is required.');
  }


  /* ---------------------------------------------------
     VALIDATE PHONE
  --------------------------------------------------- */

  var phone = String(data.phone || '').trim();

  if (!phone) {
    throw new Error('Customer phone number is required.');
  }


  /* ---------------------------------------------------
     DUPLICATE PHONE CHECK
  --------------------------------------------------- */

  var lastRow = sheet.getLastRow();

  if (lastRow >= 2) {

    var existingRows = sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        Math.min(sheet.getLastColumn(), 13)
      )
      .getValues();

    var normalizedPhone = phone
      .replace(/\s+/g, '')
      .replace(/[-()]/g, '');

    for (var i = 0; i < existingRows.length; i++) {

      var existingPhone =
        String(existingRows[i][2] || '')
          .trim()
          .replace(/\s+/g, '')
          .replace(/[-()]/g, '');

      if (
        existingPhone &&
        existingPhone === normalizedPhone
      ) {
        throw new Error(
          'A customer with this phone number already exists.'
        );
      }
    }
  }


  /* ---------------------------------------------------
     GENERATE ID
  --------------------------------------------------- */

  var customerId = generateCustomerId_();


  /* ---------------------------------------------------
     DATE
  --------------------------------------------------- */

  var registrationDate =
    data.registrationDate
      ? toDate_(data.registrationDate, 'registration date')
      : new Date();


  /* ---------------------------------------------------
     STATUS
  --------------------------------------------------- */

  var customerStatus =
    String(data.customerStatus || 'Active').trim();


  /* ---------------------------------------------------
     USER
  --------------------------------------------------- */

  var currentUser = getCurrentUser_();

  var now = new Date();


  /* ---------------------------------------------------
     CREATE ROW
     
     Customers columns:
     
     A Customer ID
     B Name
     C Phone
     D Alternative Phone
     E Address
     F ID / Reference
     G Occupation / Business
     H Registration Date
     I Customer Status
     J Notes
     K Created By
     L Created At
     M Updated At
  --------------------------------------------------- */

  var row = [
    customerId,
    name,
    phone,
    String(data.alternativePhone || '').trim(),
    String(data.address || '').trim(),
    String(data.idReference || '').trim(),
    String(data.occupationBusiness || '').trim(),
    registrationDate,
    customerStatus,
    String(data.notes || '').trim(),
    currentUser,
    now,
    now
  ];


  /* ---------------------------------------------------
     WRITE CUSTOMER
  --------------------------------------------------- */

  sheet.appendRow(row);


  /* ---------------------------------------------------
     VERIFY WRITE
  --------------------------------------------------- */

  var newLastRow = sheet.getLastRow();

  var savedId =
    sheet.getRange(newLastRow, 1).getValue();

  if (String(savedId) !== String(customerId)) {
    throw new Error(
      'Customer could not be verified after saving.'
    );
  }


  /* ---------------------------------------------------
     AUDIT
  --------------------------------------------------- */

  if (typeof audit_ === 'function') {

    audit_(
      'Created Customer',
      SYSTEM.SHEETS.CUSTOMERS,
      customerId,
      'Created customer: ' + name
    );

  }


  /* ---------------------------------------------------
     RETURN
  --------------------------------------------------- */

  return getCustomerById_(customerId);
}


/* =====================================================
   GET CUSTOMER
===================================================== */

function getCustomerById_(customerId) {

  if (!customerId) {
    return null;
  }

  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.CUSTOMERS);

  if (!sheet) {
    throw new Error('Customers sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  var values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      13
    )
    .getValues();

  for (var i = 0; i < values.length; i++) {

    if (
      String(values[i][0]) ===
      String(customerId)
    ) {
      return customerRowToObject_(values[i]);
    }
  }

  return null;
}


/* =====================================================
   CUSTOMER ROW → OBJECT
===================================================== */

function customerRowToObject_(row) {

  return {

    customerId: row[0],

    name: row[1],

    phone: row[2],

    alternativePhone: row[3],

    address: row[4],

    idReference: row[5],

    occupationBusiness: row[6],

    registrationDate: row[7],

    customerStatus: row[8],

    notes: row[9],

    createdBy: row[10],

    createdAt: row[11],

    updatedAt: row[12]

  };
}


/* =====================================================
   GET ALL CUSTOMERS
===================================================== */

function getAllCustomers_() {

  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.CUSTOMERS);

  if (!sheet) {
    throw new Error('Customers sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      13
    )
    .getValues();

  return values
    .filter(function(row) {
      return row[0] !== '';
    })
    .map(function(row) {
      return customerRowToObject_(row);
    });
}


/* =====================================================
   SEARCH CUSTOMERS
===================================================== */

function searchCustomers_(searchTerm) {

  var customers = getAllCustomers_();

  if (!searchTerm) {
    return customers;
  }

  var search =
    String(searchTerm)
      .trim()
      .toLowerCase();

  return customers.filter(function(customer) {

    return (

      String(customer.customerId || '')
        .toLowerCase()
        .indexOf(search) !== -1

      ||

      String(customer.name || '')
        .toLowerCase()
        .indexOf(search) !== -1

      ||

      String(customer.phone || '')
        .toLowerCase()
        .indexOf(search) !== -1

      ||

      String(customer.alternativePhone || '')
        .toLowerCase()
        .indexOf(search) !== -1

      ||

      String(customer.idReference || '')
        .toLowerCase()
        .indexOf(search) !== -1

    );

  });
}


/* =====================================================
   PUBLIC TEST
===================================================== */

function testCreateCustomer() {

  var testCustomer = {

    name: 'Test Customer',

    phone: '0999000000',

    alternativePhone: '',

    address: 'Test Address',

    idReference: 'TEST-001',

    occupationBusiness: 'Test Business',

    customerStatus: 'Active',

    notes: 'System test customer'

  };

  var result =
    createCustomer(testCustomer);

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}