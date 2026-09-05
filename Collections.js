/*******************************************************
 * COLLECTIONS ENGINE
 * Loan Collection Activity Management
 *******************************************************/


/**
 * Generate the next unique Collection ID.
 * Format: COL-00001
 */
function generateCollectionId_() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.COLLECTIONS
  );

  if (!sheet) {
    throw new Error('Collections sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 'COL-00001';
  }

  var ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat()
    .filter(String);

  var highest = 0;

  ids.forEach(function(id) {

    var match = String(id).match(/^COL-(\d+)$/i);

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1])
      );
    }

  });

  return 'COL-' +
    String(highest + 1).padStart(5, '0');
}


/**
 * Convert one Collections sheet row into an object.
 */
function collectionRowToObject_(row) {

  return {

    collectionId: row[0],

    loanId: row[1],

    customerId: row[2],

    customerName: row[3],

    phone: row[4],

    collectionDate: row[5],

    contactMethod: row[6],

    promiseToPayDate: row[7],

    amountPromised:
      Number(row[8]) || 0,

    amountReceived:
      Number(row[9]) || 0,

    collectionStatus: row[10],

    collectorUser: row[11],

    notes: row[12],

    createdAt: row[13]

  };

}


/**
 * Get all collection records.
 */
function getAllCollections_() {

  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.COLLECTIONS
    );

  if (!sheet) {
    throw new Error(
      'Collections sheet not found.'
    );
  }

  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        14
      )
      .getValues();

  return values

    .filter(function(row) {

      return row[0] !== '';

    })

    .map(function(row) {

      return collectionRowToObject_(row);

    });

}


/**
 * Get one collection by Collection ID.
 */
function getCollectionById_(collectionId) {

  if (!collectionId) {
    return null;
  }

  var collections =
    getAllCollections_();

  for (
    var i = 0;
    i < collections.length;
    i++
  ) {

    if (
      String(
        collections[i].collectionId
      ) === String(collectionId)
    ) {

      return collections[i];

    }

  }

  return null;

}


/**
 * Get all collection activities for a loan.
 */
function getCollectionsForLoan_(loanId) {

  if (!loanId) {
    return [];
  }

  return getAllCollections_()
    .filter(function(collection) {

      return String(
        collection.loanId
      ) === String(loanId);

    });

}


/**
 * Get all collection activities for a customer.
 */
function getCollectionsForCustomer_(customerId) {

  if (!customerId) {
    return [];
  }

  return getAllCollections_()
    .filter(function(collection) {

      return String(
        collection.customerId
      ) === String(customerId);

    });

}


/**
 * Record a collection activity.
 *
 * IMPORTANT:
 *
 * A collection activity is different from
 * an actual payment.
 *
 * If money is actually received,
 * it should normally also be recorded
 * through the Payments module so that
 * the loan balance is updated correctly.
 */
function recordCollection(data) {

  data = data || {};

  if (!data.loanId) {

    throw new Error(
      'Loan ID is required.'
    );

  }


  var loan =
    getLoanById_(data.loanId);

  if (!loan) {

    throw new Error(
      'Loan not found: ' +
      data.loanId
    );

  }


  var customerId =
    loan.customerId;


  var customer =
    getCustomerById_(customerId);

  if (!customer) {

    throw new Error(
      'Customer not found for loan: ' +
      data.loanId
    );

  }


  var collectionDate;

  if (data.collectionDate) {

    collectionDate =
      toDate_(
        data.collectionDate,
        'Collection Date'
      );

  } else {

    collectionDate =
      new Date();

  }


  var promiseToPayDate = '';

  if (data.promiseToPayDate) {

    promiseToPayDate =
      toDate_(
        data.promiseToPayDate,
        'Promise to Pay Date'
      );

  }


  var amountPromised = 0;

  if (
    data.amountPromised !== undefined &&
    data.amountPromised !== null &&
    data.amountPromised !== ''
  ) {

    amountPromised =
      Number(data.amountPromised);

    if (
      isNaN(amountPromised) ||
      amountPromised < 0
    ) {

      throw new Error(
        'Amount Promised cannot be negative.'
      );

    }

  }


  var amountReceived = 0;

  if (
    data.amountReceived !== undefined &&
    data.amountReceived !== null &&
    data.amountReceived !== ''
  ) {

    amountReceived =
      Number(data.amountReceived);

    if (
      isNaN(amountReceived) ||
      amountReceived < 0
    ) {

      throw new Error(
        'Amount Received cannot be negative.'
      );

    }

  }


  var collectionStatus =
    data.collectionStatus
      ? String(
          data.collectionStatus
        ).trim()
      : '';


  if (!collectionStatus) {

    if (
      amountReceived > 0 &&
      amountPromised > 0 &&
      amountReceived >= amountPromised
    ) {

      collectionStatus =
        'Paid';

    } else if (
      amountReceived > 0
    ) {

      collectionStatus =
        'Partially Paid';

    } else if (
      promiseToPayDate
    ) {

      collectionStatus =
        'Promise to Pay';

    } else {

      collectionStatus =
        'Contacted';

    }

  }


  var allowedStatuses = [

    'Pending',

    'Contacted',

    'Promise to Pay',

    'Partially Paid',

    'Paid',

    'Escalated',

    'No Contact'

  ];


  if (
    allowedStatuses.indexOf(
      collectionStatus
    ) === -1
  ) {

    throw new Error(
      'Invalid Collection Status. ' +
      'Allowed values: ' +
      allowedStatuses.join(', ')
    );

  }


  var contactMethod =
    data.contactMethod
      ? String(
          data.contactMethod
        ).trim()
      : '';


  var notes =
    data.notes
      ? String(
          data.notes
        ).trim()
      : '';


  var collectorUser =
    getCurrentUser_();


  var collectionId =
    generateCollectionId_();


  var createdAt =
    new Date();


  var row = [

    collectionId,

    loan.loanId,

    customer.customerId,

    customer.name,

    customer.phone || '',

    collectionDate,

    contactMethod,

    promiseToPayDate,

    amountPromised,

    amountReceived,

    collectionStatus,

    collectorUser,

    notes,

    createdAt

  ];


  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.COLLECTIONS
    );


  if (!sheet) {

    throw new Error(
      'Collections sheet not found.'
    );

  }


  sheet.appendRow(row);


  var savedRow =
    sheet.getLastRow();


  var savedId =
    sheet
      .getRange(
        savedRow,
        1
      )
      .getValue();


  if (
    String(savedId) !==
    String(collectionId)
  ) {

    throw new Error(
      'Collection could not be ' +
      'verified after saving.'
    );

  }


  audit_(
    'CREATE_COLLECTION',
    SYSTEM.SHEETS.COLLECTIONS,
    collectionId,
    'Collection activity recorded for loan ' +
      loan.loanId +
      '.'
  );


  return getCollectionById_(
    collectionId
  );

}


/**
 * Alias for recordCollection().
 */
function createCollection(data) {

  return recordCollection(data);

}


/**
 * Web-app function:
 * Get collections for one customer.
 */
function getCustomerCollections(customerId) {

  return getCollectionsForCustomer_(
    customerId
  );

}


/**
 * Test the Collections system.
 */
function testCollectionsSystem() {

  var result = {};


  result.allCollections =
    getAllCollections_();


  result.collectionCount =
    result.allCollections.length;


  if (
    result.collectionCount > 0
  ) {

    result.firstCollection =
      result.allCollections[0];

  } else {

    result.firstCollection =
      null;

  }


  Logger.log(
    '========================================'
  );

  Logger.log(
    'COLLECTIONS SYSTEM TEST'
  );

  Logger.log(
    '========================================'
  );

  Logger.log(
    'Collection Count: ' +
    result.collectionCount
  );

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  Logger.log(
    '========================================'
  );


  return result;

}