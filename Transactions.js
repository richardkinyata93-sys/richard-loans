/************************************************************
 * TRANSACTIONS ENGINE
 * Loan Management System
 *
 * Transactions = financial events.
 * Audit Log = user/system actions.
 ************************************************************/


/**
 * Generate the next unique Transaction ID.
 *
 * Format:
 * TXN-00001
 */
function generateTransactionId_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.TRANSACTIONS
  );

  if (!sheet) {
    throw new Error(
      'Transactions sheet not found.'
    );
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 'TXN-00001';
  }

  var ids = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      1
    )
    .getValues()
    .flat()
    .filter(String);

  var highest = 0;

  ids.forEach(function(id) {

    var match = String(id)
      .match(/^TXN-(\d+)$/i);

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1])
      );
    }
  });

  return 'TXN-' +
    String(highest + 1)
      .padStart(5, '0');
}


/**
 * Check whether a transaction already exists
 * for the same Reference ID + Transaction Type.
 *
 * This prevents duplicate financial transactions.
 */
function transactionExistsByReference_(
  referenceId,
  transactionType
) {
  referenceId = String(
    referenceId || ''
  ).trim();

  transactionType = String(
    transactionType || ''
  ).trim();

  if (!referenceId || !transactionType) {
    return false;
  }

  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.TRANSACTIONS
    );

  if (!sheet) {
    throw new Error(
      'Transactions sheet not found.'
    );
  }

  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return false;
  }

  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        11
      )
      .getValues();

  for (
    var i = 0;
    i < values.length;
    i++
  ) {

    var existingType =
      String(
        values[i][2] || ''
      ).trim();

    var existingReference =
      String(
        values[i][5] || ''
      ).trim();

    if (
      existingReference ===
        referenceId &&
      existingType ===
        transactionType
    ) {
      return true;
    }
  }

  return false;
}


/**
 * Create a financial transaction.
 *
 * Expected data:
 *
 * {
 *   transactionDate,
 *   transactionType,
 *   loanId,
 *   customerId,
 *   referenceId,
 *   amount,
 *   direction,
 *   description
 * }
 *
 * Direction:
 *
 * OUT = money leaving the business
 * IN  = money received / receivable increase
 */
function createTransaction_(data) {

  data = data || {};

  var transactionType =
    String(
      data.transactionType || ''
    ).trim();

  if (!transactionType) {
    throw new Error(
      'Transaction type is required.'
    );
  }

  var amount =
    requirePositiveNumber_(
      data.amount,
      'Transaction amount'
    );

  var direction =
    String(
      data.direction || ''
    ).trim().toUpperCase();

  if (
    direction !== 'IN' &&
    direction !== 'OUT'
  ) {
    throw new Error(
      'Transaction direction must be IN or OUT.'
    );
  }

  var transactionDate;

  if (data.transactionDate) {

    transactionDate =
      toDate_(
        data.transactionDate,
        'transaction date'
      );

  } else {

    transactionDate =
      new Date();
  }

  var loanId =
    String(
      data.loanId || ''
    ).trim();

  var customerId =
    String(
      data.customerId || ''
    ).trim();

  var referenceId =
    String(
      data.referenceId || ''
    ).trim();

  var description =
    String(
      data.description || ''
    ).trim();

  /*
   * Duplicate protection.
   *
   * A transaction with the same reference and
   * transaction type must not be created twice.
   */
  if (
    referenceId &&
    transactionExistsByReference_(
      referenceId,
      transactionType
    )
  ) {

    return {
      success: true,
      duplicate: true,
      message:
        'Transaction already exists.',
      referenceId: referenceId,
      transactionType:
        transactionType
    };
  }

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.TRANSACTIONS
    );

  if (!sheet) {
    throw new Error(
      'Transactions sheet not found.'
    );
  }

  var transactionId =
    generateTransactionId_();

  var currentUser =
    typeof getCurrentUser_ ===
    'function'
      ? getCurrentUser_()
      : 'Administrator';

  var createdAt =
    new Date();

  sheet.appendRow([
    transactionId,
    transactionDate,
    transactionType,
    loanId,
    customerId,
    referenceId,
    amount,
    direction,
    description,
    currentUser,
    createdAt
  ]);

  /*
   * Audit the financial event.
   */
  if (
    typeof audit_ ===
    'function'
  ) {

    audit_(
      'CREATE_TRANSACTION',
      SYSTEM.SHEETS.TRANSACTIONS,
      transactionId,
      transactionType +
        ' transaction created: ' +
        amount.toFixed(2) +
        ' (' +
        direction +
        ')'
    );
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    duplicate: false,
    transactionId:
      transactionId,
    transactionDate:
      transactionDate,
    transactionType:
      transactionType,
    loanId:
      loanId,
    customerId:
      customerId,
    referenceId:
      referenceId,
    amount:
      amount,
    direction:
      direction,
    description:
      description
  };
}


/**
 * Get a transaction by Transaction ID.
 */
function getTransactionById_(
  transactionId
) {

  transactionId =
    String(
      transactionId || ''
    ).trim();

  if (!transactionId) {
    return null;
  }

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.TRANSACTIONS
    );

  if (!sheet) {
    throw new Error(
      'Transactions sheet not found.'
    );
  }

  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        11
      )
      .getValues();

  for (
    var i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][0]
      ).trim() ===
      transactionId
    ) {

      return transactionRowToObject_(
        values[i]
      );
    }
  }

  return null;
}


/**
 * Convert transaction row to object.
 */
function transactionRowToObject_(
  row
) {

  return {

    transactionId:
      row[0],

    transactionDate:
      row[1],

    transactionType:
      row[2],

    loanId:
      row[3],

    customerId:
      row[4],

    referenceId:
      row[5],

    amount:
      Number(row[6]) || 0,

    direction:
      row[7],

    description:
      row[8],

    createdBy:
      row[9],

    createdAt:
      row[10]
  };
}


/**
 * Get all transactions.
 */
function getAllTransactions_() {

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.TRANSACTIONS
    );

  if (!sheet) {
    throw new Error(
      'Transactions sheet not found.'
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
        11
      )
      .getValues();

  return values

    .filter(function(row) {

      return String(
        row[0] || ''
      ).trim() !== '';

    })

    .map(function(row) {

      return transactionRowToObject_(
        row
      );

    });
}


/**
 * Get transactions for a loan.
 */
function getTransactionsForLoan_(
  loanId
) {

  loanId =
    String(
      loanId || ''
    ).trim();

  if (!loanId) {
    return [];
  }

  var transactions =
    getAllTransactions_();

  return transactions.filter(
    function(transaction) {

      return String(
        transaction.loanId || ''
      ).trim() === loanId;

    }
  );
}


/**
 * Get transactions for a customer.
 */
function getTransactionsForCustomer_(
  customerId
) {

  customerId =
    String(
      customerId || ''
    ).trim();

  if (!customerId) {
    return [];
  }

  var transactions =
    getAllTransactions_();

  return transactions.filter(
    function(transaction) {

      return String(
        transaction.customerId || ''
      ).trim() === customerId;

    }
  );
}


/**
 * Calculate total incoming transactions.
 */
function calculateTotalIncoming_() {

  var transactions =
    getAllTransactions_();

  return transactions.reduce(
    function(total, transaction) {

      if (
        String(
          transaction.direction || ''
        ).toUpperCase() ===
        'IN'
      ) {

        return total +
          (
            Number(
              transaction.amount
            ) || 0
          );
      }

      return total;

    },
    0
  );
}


/**
 * Calculate total outgoing transactions.
 */
function calculateTotalOutgoing_() {

  var transactions =
    getAllTransactions_();

  return transactions.reduce(
    function(total, transaction) {

      if (
        String(
          transaction.direction || ''
        ).toUpperCase() ===
        'OUT'
      ) {

        return total +
          (
            Number(
              transaction.amount
            ) || 0
          );
      }

      return total;

    },
    0
  );
}


/**
 * Public transaction engine test.
 *
 * This creates one REAL test transaction.
 */
function testTransactions() {

  var reference =
    'TEST-' +
    new Date().getTime();

  var result =
    createTransaction_({

      transactionDate:
        new Date(),

      transactionType:
        'Adjustment',

      loanId:
        '',

      customerId:
        '',

      referenceId:
        reference,

      amount:
        100,

      direction:
        'IN',

      description:
        'Transaction engine test'
    });

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}