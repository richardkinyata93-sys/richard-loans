/************************************************************
 * PAYMENTS ENGINE
 * Loan Management System
 ************************************************************/


/**
 * Generate the next unique Payment ID.
 * Format: PAY-00001
 */
function generatePaymentId_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.PAYMENTS
  );

  if (!sheet) {
    throw new Error('Payments sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 'PAY-00001';
  }

  var ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat()
    .filter(String);

  var highest = 0;

  ids.forEach(function(id) {
    var match = String(id).match(/^PAY-(\d+)$/i);

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1])
      );
    }
  });

  return 'PAY-' +
    String(highest + 1).padStart(5, '0');
}


/**
 * Get all payments for a specific loan.
 */
function getPaymentsForLoan_(loanId) {
  loanId = String(
    loanId || ''
  ).trim();

  if (!loanId) {
    return [];
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.PAYMENTS
  );

  if (!sheet) {
    throw new Error(
      'Payments sheet not found.'
    );
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
      11
    )
    .getValues();

  return values
    .filter(function(row) {
      return String(row[1]).trim() === loanId;
    })
    .map(function(row) {
      return paymentRowToObject_(row);
    });
}


/**
 * Convert payment row into an object.
 */
function paymentRowToObject_(row) {
  return {
    paymentId: row[0],
    loanId: row[1],
    customerId: row[2],
    customerName: row[3],
    paymentDate: row[4],
    amount: Number(row[5]) || 0,
    paymentMethod: row[6],
    reference: row[7],
    notes: row[8],
    createdBy: row[9],
    createdAt: row[10]
  };
}


/**
 * Get all payments.
 */
function getAllPayments_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.PAYMENTS
  );

  if (!sheet) {
    throw new Error(
      'Payments sheet not found.'
    );
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
      11
    )
    .getValues();

  return values
    .filter(function(row) {
      return String(row[0]).trim() !== '';
    })
    .map(function(row) {
      return paymentRowToObject_(row);
    });
}


/**
 * Calculate total payments made against a loan.
 */
function calculateTotalPayments_(loanId) {
  var payments =
    getPaymentsForLoan_(loanId);

  return payments.reduce(
    function(total, payment) {
      return total +
        (Number(payment.amount) || 0);
    },
    0
  );
}


/**
 * Record a payment.
 *
 * Expected data:
 * {
 *   loanId,
 *   paymentDate,
 *   amount,
 *   paymentMethod,
 *   reference,
 *   notes
 * }
 */
function recordPayment(data) {
  data = data || {};

  var loanId = String(
    data.loanId || ''
  ).trim();

  if (!loanId) {
    throw new Error(
      'Loan ID is required.'
    );
  }

  var amount =
    requirePositiveNumber_(
      data.amount,
      'Payment amount'
    );

  var paymentDate;

  if (data.paymentDate) {
    paymentDate = toDate_(
      data.paymentDate,
      'payment date'
    );
  } else {
    paymentDate = new Date();
  }

  var paymentMethod = String(
    data.paymentMethod || 'Cash'
  ).trim();

  var reference = String(
    data.reference || ''
  ).trim();

  var notes = String(
    data.notes || ''
  ).trim();

  if (typeof getLoanById_ !== 'function') {
    throw new Error(
      'Loan engine is not available.'
    );
  }

  var loan =
    getLoanById_(loanId);

  if (!loan) {
    throw new Error(
      'Loan not found: ' + loanId
    );
  }

  /*
   * Refresh the loan before accepting the payment
   * so the system works with the current outstanding
   * balance.
   */
  if (
    typeof refreshLoanCalculations_ ===
    'function'
  ) {
    loan =
      refreshLoanCalculations_(loanId);
  }

  var outstanding =
    Number(
      loan.outstandingBalance
    ) || 0;

  if (outstanding <= 0) {
    throw new Error(
      'This loan has no outstanding balance.'
    );
  }

  /*
   * Prevent overpayment.
   */
  if (amount > outstanding) {
    throw new Error(
      'Payment exceeds the current outstanding balance of ' +
      outstanding.toFixed(2) +
      '.'
    );
  }

  /*
   * Generate unique Payment ID.
   */
  var paymentId =
    generatePaymentId_();

  var customerId =
    loan.customerId || '';

  var customerName =
    loan.customerName || '';

  var currentUser =
    getCurrentUser_();

  var now = new Date();

  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.PAYMENTS
    );

  if (!sheet) {
    throw new Error(
      'Payments sheet not found.'
    );
  }

  /*
   * Write the payment record.
   */
  sheet.appendRow([
    paymentId,
    loanId,
    customerId,
    customerName,
    paymentDate,
    amount,
    paymentMethod,
    reference,
    notes,
    currentUser,
    now
  ]);

  /*
   * Recalculate the loan immediately.
   */
  if (
    typeof refreshLoanCalculations_ ===
    'function'
  ) {
    loan =
      refreshLoanCalculations_(loanId);
  }

  /*
   * Create financial transaction.
   */
  if (
    typeof createTransaction_ ===
    'function'
  ) {
    createTransaction_({
      transactionDate: paymentDate,
      transactionType: 'Payment',
      loanId: loanId,
      customerId: customerId,
      referenceId: paymentId,
      amount: amount,
      direction: 'IN',
      description:
        'Payment received for loan ' +
        loanId
    });
  }

  /*
   * Audit the payment.
   */
  if (typeof audit_ === 'function') {
    audit_(
      'CREATE_PAYMENT',
      SYSTEM.SHEETS.PAYMENTS,
      paymentId,
      'Payment of ' +
        amount.toFixed(2) +
        ' recorded for loan ' +
        loanId
    );
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    paymentId: paymentId,
    loanId: loanId,
    amount: amount,
    outstandingBalance:
      loan.outstandingBalance,
    status: loan.status
  };
}


/**
 * Refresh payment totals on all loans.
 */
function refreshAllPaymentTotals_() {
  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var loanSheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.LOANS
    );

  if (!loanSheet) {
    throw new Error(
      'Loans sheet not found.'
    );
  }

  var lastRow =
    loanSheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: true,
      updated: 0
    };
  }

  var loanIds =
    loanSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();

  var updated = 0;

  loanIds.forEach(function(row) {

    var loanId =
      String(row[0] || '').trim();

    if (!loanId) {
      return;
    }

    if (
      typeof refreshLoanCalculations_ ===
      'function'
    ) {
      refreshLoanCalculations_(
        loanId
      );

      updated++;
    }
  });

  SpreadsheetApp.flush();

  return {
    success: true,
    updated: updated
  };
}


/**
 * Test payment recording.
 *
 * This creates a REAL payment.
 * Do not run unless you intentionally
 * want to create a test payment.
 */
function testRecordPayment_() {

  var loans =
    typeof getAllLoans_ ===
    'function'
      ? getAllLoans_()
      : [];

  if (!loans.length) {
    throw new Error(
      'No loans exist. Create a loan before testing payments.'
    );
  }

  var loan = null;

  for (var i = 0; i < loans.length; i++) {
    if (
      Number(
        loans[i].outstandingBalance
      ) > 0
    ) {
      loan = loans[i];
      break;
    }
  }

  if (!loan) {
    throw new Error(
      'No loan with an outstanding balance was found.'
    );
  }

  var paymentAmount =
    Math.min(
      1000,
      Number(
        loan.outstandingBalance
      )
    );

  var result =
    recordPayment({
      loanId: loan.loanId,
      paymentDate: new Date(),
      amount: paymentAmount,
      paymentMethod: 'Cash',
      reference:
        'TEST-' +
        new Date().getTime(),
      notes:
        'System test payment'
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

function testRecordPayment() {

  var result = recordPayment({

    loanId: 'LON-00001',

    paymentDate: new Date(),

    amount: 74400,

    paymentMethod: 'Cash',

    reference: 'TEST-PAY-001',

    notes: 'Automatic payment engine test'

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