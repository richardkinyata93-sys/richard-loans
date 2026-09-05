/*******************************************************
 * LOANS ENGINE
 * Stage 2
 *******************************************************/

/**
 * Generate the next Loan ID.
 * Format: LON-00001
 */
function generateLoanId_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.LOANS);

  if (!sheet) {
    throw new Error('Loans sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return SYSTEM.PREFIXES.LOAN + '00001';
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  var highest = 0;

  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0] || '').trim();
    var match = id.match(/^LON-(\d+)$/i);

    if (match) {
      var number = Number(match[1]);

      if (number > highest) {
        highest = number;
      }
    }
  }

  return SYSTEM.PREFIXES.LOAN +
    String(highest + 1).padStart(5, '0');
}


/**
 * Get a setting value from the Settings sheet.
 */
function getSetting_(settingName, fallback) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.SETTINGS);

  if (!sheet) {
    return fallback;
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return fallback;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();

    if (key === settingName) {
      var value = values[i][1];

      if (value === '' || value === null || typeof value === 'undefined') {
        return fallback;
      }

      return value;
    }
  }

  return fallback;
}


/**
 * Calculate loan due date.
 */
function calculateDueDate_(loanDate, termDays) {
  var date = new Date(loanDate);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid loan/disbursement date.');
  }

  var days = Number(termDays);

  if (isNaN(days) || days <= 0) {
    throw new Error('Loan term must be greater than zero.');
  }

  date.setDate(date.getDate() + days);

  return date;
}


/**
 * Calculate initial interest.
 */
function calculateInitialInterest_(principal, rate) {
  var p = Number(principal);
  var r = Number(rate);

  if (isNaN(p) || p <= 0) {
    throw new Error('Principal must be greater than zero.');
  }

  if (isNaN(r) || r < 0) {
    throw new Error('Interest rate cannot be negative.');
  }

  return p * r;
}


/**
 * Create a new loan.
 */
function createLoan(data) {

  if (!data) {
    throw new Error('Loan information is required.');
  }

  var customerId = String(data.customerId || '').trim();

  if (!customerId) {
    throw new Error('Customer ID is required.');
  }

  var customer = getCustomerById_(customerId);

  if (!customer) {
    throw new Error('Customer not found: ' + customerId);
  }

  var principal = requirePositiveNumber_(
    data.principal,
    'Principal'
  );

  var rate;

  if (
    data.interestRate === '' ||
    data.interestRate === null ||
    typeof data.interestRate === 'undefined'
  ) {
    rate = Number(getSetting_(
      'Default Interest Rate',
      0.40
    ));
  } else {
    rate = Number(data.interestRate);

    /*
     * Allow either:
     * 0.40 = 40%
     * 40   = 40%
     */
    if (rate > 1) {
      rate = rate / 100;
    }
  }

  if (isNaN(rate) || rate < 0) {
    throw new Error('Interest rate must be zero or greater.');
  }

  var termDays;

  if (
    data.termDays === '' ||
    data.termDays === null ||
    typeof data.termDays === 'undefined'
  ) {
    termDays = Number(getSetting_(
      'Default Loan Term',
      30
    ));
  } else {
    termDays = Number(data.termDays);
  }

  if (isNaN(termDays) || termDays <= 0) {
    throw new Error('Loan term must be greater than zero.');
  }

  var disbursementDate;

  if (data.disbursementDate) {
    disbursementDate = toDate_(
      data.disbursementDate,
      'disbursement date'
    );
  } else {
    disbursementDate = new Date();
  }

  var applicationDate = data.applicationDate
    ? toDate_(data.applicationDate, 'application date')
    : new Date(disbursementDate);

  var approvalDate = data.approvalDate
    ? toDate_(data.approvalDate, 'approval date')
    : new Date(disbursementDate);

  var dueDate = calculateDueDate_(
    disbursementDate,
    termDays
  );

  var initialInterest = calculateInitialInterest_(
    principal,
    rate
  );

  var totalInterest = initialInterest;
  var totalPayments = 0;
  var outstandingBalance = principal + totalInterest;

  var loanId = generateLoanId_();
  var now = new Date();
  var user = getCurrentUser_();

  var loanPurpose = data.loanPurpose || '';
  var disbursementMethod = data.disbursementMethod || 'Cash';
  var notes = data.notes || '';

  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.LOANS);

  if (!sheet) {
    throw new Error('Loans sheet not found.');
  }

  sheet.appendRow([
    loanId,                  // 1 Loan ID
    customerId,              // 2 Customer ID
    customer.name,           // 3 Customer Name
    applicationDate,         // 4 Application Date
    approvalDate,            // 5 Approval Date
    disbursementDate,        // 6 Disbursement Date
    principal,               // 7 Principal
    rate,                    // 8 Interest Rate
    termDays,                // 9 Term Days
    dueDate,                 // 10 Due Date
    initialInterest,         // 11 Initial Interest
    0,                       // 12 Additional Interest
    totalInterest,           // 13 Total Interest Charged
    totalPayments,           // 14 Total Payments
    outstandingBalance,      // 15 Outstanding Balance
    0,                       // 16 Days Overdue
    0,                       // 17 Overdue Periods
    'Active',                // 18 Status
    '',                      // 19 Paid Date
    '',                      // 20 Closed Date
    loanPurpose,             // 21 Loan Purpose
    disbursementMethod,      // 22 Disbursement Method
    notes,                   // 23 Notes
    user,                    // 24 Created By
    now,                     // 25 Created At
    now                      // 26 Updated At
  ]);

  /*
   * Record the disbursement as a transaction.
   * Transactions.gs must exist before creating loans.
   */
  if (typeof createTransaction_ === 'function') {
    createTransaction_({
      transactionType: 'Loan Disbursement',
      loanId: loanId,
      customerId: customerId,
      referenceId: loanId,
      amount: principal,
      direction: 'OUT',
      description: 'Loan disbursement for ' + customer.name
    });
  }

  audit_(
    'Created Loan',
    SYSTEM.SHEETS.LOANS,
    loanId,
    'Created loan for ' + customer.name +
    ' with principal ' + principal
  );

  return {
    success: true,
    loanId: loanId,
    customerId: customerId,
    customerName: customer.name,
    principal: principal,
    interestRate: rate,
    initialInterest: initialInterest,
    totalInterest: totalInterest,
    outstandingBalance: outstandingBalance,
    dueDate: dueDate,
    status: 'Active'
  };
}


/**
 * Get a loan by Loan ID.
 */
function getLoanById_(loanId) {

  if (!loanId) {
    return null;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.LOANS);

  if (!sheet) {
    throw new Error('Loans sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  var data = sheet
    .getRange(2, 1, lastRow - 1, 26)
    .getValues();

  var searchId = String(loanId).trim();

  for (var i = 0; i < data.length; i++) {

    if (String(data[i][0]).trim() === searchId) {
      return loanRowToObject_(
        data[i],
        i + 2
      );
    }
  }

  return null;
}


/**
 * Convert a loan sheet row into an object.
 */
function loanRowToObject_(row, sheetRow) {

  return {
    row: sheetRow,
    loanId: row[0],
    customerId: row[1],
    customerName: row[2],
    applicationDate: row[3],
    approvalDate: row[4],
    disbursementDate: row[5],
    principal: row[6],
    interestRate: row[7],
    termDays: row[8],
    dueDate: row[9],
    initialInterest: row[10],
    additionalInterest: row[11],
    totalInterestCharged: row[12],
    totalPayments: row[13],
    outstandingBalance: row[14],
    daysOverdue: row[15],
    overduePeriods: row[16],
    status: row[17],
    paidDate: row[18],
    closedDate: row[19],
    loanPurpose: row[20],
    disbursementMethod: row[21],
    notes: row[22],
    createdBy: row[23],
    createdAt: row[24],
    updatedAt: row[25]
  };
}


/**
 * Get all loans.
 */
function getAllLoans_() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.LOANS);

  if (!sheet) {
    throw new Error('Loans sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var data = sheet
    .getRange(2, 1, lastRow - 1, 26)
    .getValues();

  var loans = [];

  for (var i = 0; i < data.length; i++) {

    if (!data[i][0]) {
      continue;
    }

    loans.push(
      loanRowToObject_(
        data[i],
        i + 2
      )
    );
  }

  return loans;
}


/**
 * Get all loans belonging to a customer.
 */
function getLoansForCustomer_(customerId) {

  if (!customerId) {
    return [];
  }

  var loans = getAllLoans_();
  var results = [];

  for (var i = 0; i < loans.length; i++) {

    if (
      String(loans[i].customerId).trim() ===
      String(customerId).trim()
    ) {
      results.push(loans[i]);
    }
  }

  return results;
}


/**
 * Calculate the total additional interest
 * recorded in the Interest Ledger.
 *
 * Period 0 is the initial interest and is
 * therefore excluded here.
 */
function calculateAdditionalInterestFromLedger_(loanId) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.INTEREST
  );

  if (!sheet) {
    return 0;
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 0;
  }

  var data = sheet
    .getRange(2, 1, lastRow - 1, 12)
    .getValues();

  var total = 0;

  for (var i = 0; i < data.length; i++) {

    if (
      String(data[i][1]).trim() ===
      String(loanId).trim()
    ) {

      var periodNumber = Number(data[i][4]);

      if (periodNumber !== 0) {
        total += Number(data[i][7]) || 0;
      }
    }
  }

  return total;
}


/**
 * Calculate total payments for a loan.
 */
function calculateLoanPayments_(loanId) {

  if (
    typeof calculateTotalPayments_ ===
    'function'
  ) {
    return calculateTotalPayments_(loanId);
  }

  return 0;
}


/**
 * Refresh calculated loan fields.
 */
function refreshLoanCalculations_(loanId) {

  var loan = getLoanById_(loanId);

  if (!loan) {
    throw new Error(
      'Loan not found: ' + loanId
    );
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.LOANS
  );

  if (!sheet) {
    throw new Error('Loans sheet not found.');
  }

  var additionalInterest =
    calculateAdditionalInterestFromLedger_(
      loanId
    );

  var totalInterest =
    Number(loan.initialInterest || 0) +
    Number(additionalInterest || 0);

  var totalPayments =
    calculateLoanPayments_(loanId);

  var outstanding =
    Number(loan.principal || 0) +
    totalInterest -
    Number(totalPayments || 0);

  if (outstanding < 0) {
    outstanding = 0;
  }

  var today = new Date();
  var dueDate = loan.dueDate
    ? new Date(loan.dueDate)
    : null;

  var daysOverdue = 0;

  if (
    dueDate &&
    !isNaN(dueDate.getTime()) &&
    outstanding > 0 &&
    today.getTime() > dueDate.getTime()
  ) {

    var millisecondsPerDay =
      1000 * 60 * 60 * 24;

    daysOverdue = Math.floor(
      (
        today.getTime() -
        dueDate.getTime()
      ) / millisecondsPerDay
    );
  }

  /*
   * Number of completed 30-day periods
   * after the original disbursement date.
   */
  var overduePeriods = 0;

  if (loan.disbursementDate) {

    var disbursementDate =
      new Date(loan.disbursementDate);

    if (!isNaN(disbursementDate.getTime())) {

      var millisecondsPerPeriod =
        1000 * 60 * 60 * 24 * 30;

      var elapsedPeriods = Math.floor(
        (
          today.getTime() -
          disbursementDate.getTime()
        ) / millisecondsPerPeriod
      );

      if (elapsedPeriods > 0) {
        overduePeriods = elapsedPeriods;
      }
    }
  }

  var status = loan.status || 'Active';

  if (outstanding <= 0) {

    outstanding = 0;

    status = 'Paid';

  } else if (
    dueDate &&
    today.getTime() >= dueDate.getTime()
  ) {

    status = 'Overdue';

  } else if (
    status !== 'Application' &&
    status !== 'Approved' &&
    status !== 'Closed' &&
    status !== 'Written Off'
  ) {

    status = 'Active';
  }

  var row = loan.row;

  sheet.getRange(row, 12, 1, 7).setValues([[
    additionalInterest,
    totalInterest,
    totalPayments,
    outstanding,
    daysOverdue,
    overduePeriods,
    status
  ]]);

  sheet.getRange(row, 26).setValue(new Date());

  return getLoanById_(loanId);
}


/**
 * Test loan creation.
 *
 * This requires at least one customer,
 * normally CUS-00001.
 */
function testCreateLoan_() {

  var customer =
    getCustomerById_('CUS-00001');

  if (!customer) {
    throw new Error(
      'CUS-00001 does not exist. ' +
      'Create a customer first.'
    );
  }

  var result = createLoan({

    customerId: 'CUS-00001',

    principal: 100000,

    interestRate: 0.40,

    termDays: 30,

    loanPurpose: 'Business',

    disbursementMethod: 'Cash',

    notes: 'System test loan'

  });

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}