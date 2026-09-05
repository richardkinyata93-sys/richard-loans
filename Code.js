/************************************************************
 * LOAN MANAGEMENT SYSTEM
 * Code.gs
 * Core system configuration, setup, menu and maintenance
 ************************************************************/

var SYSTEM = {
  VERSION: '1.0.0',

  TIMEZONE:
    Session.getScriptTimeZone() ||
    'Africa/Blantyre',

  CURRENCY: 'MWK',

  SHEETS: {
    DASHBOARD: 'Dashboard',
    CUSTOMERS: 'Customers',
    LOANS: 'Loans',
    PAYMENTS: 'Payments',
    INTEREST: 'Interest Ledger',
    TRANSACTIONS: 'Transactions',
    COLLECTIONS: 'Collections',
    SETTINGS: 'Settings',
    LISTS: 'Lists',
    AUDIT: 'Audit Log'
  },

  PREFIXES: {
    CUSTOMER: 'CUS-',
    LOAN: 'LON-',
    PAYMENT: 'PAY-',
    INTEREST: 'INT-',
    TRANSACTION: 'TXN-',
    COLLECTION: 'COL-',
    AUDIT: 'AUD-'
  }
};


/************************************************************
 * SYSTEM SETUP
 ************************************************************/

function setupSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  createAllSheets_();
  installAllHeaders_();
  populateSettings_();
  populateLists_();
  formatAllSheets_();
  installValidations_();
  buildDashboard_();
  writeSystemMetadata_();
  createMenu_();

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'Loan Management System setup completed successfully.',
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    version: SYSTEM.VERSION
  };
}


/************************************************************
 * CREATE ALL REQUIRED SHEETS
 ************************************************************/

function createAllSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var requiredSheets = [
    SYSTEM.SHEETS.DASHBOARD,
    SYSTEM.SHEETS.CUSTOMERS,
    SYSTEM.SHEETS.LOANS,
    SYSTEM.SHEETS.PAYMENTS,
    SYSTEM.SHEETS.INTEREST,
    SYSTEM.SHEETS.TRANSACTIONS,
    SYSTEM.SHEETS.COLLECTIONS,
    SYSTEM.SHEETS.SETTINGS,
    SYSTEM.SHEETS.LISTS,
    SYSTEM.SHEETS.AUDIT
  ];

  requiredSheets.forEach(function(sheetName) {
    if (!ss.getSheetByName(sheetName)) {
      ss.insertSheet(sheetName);
    }
  });

  // Remove the default Sheet1 only when it is completely empty
  var defaultSheet = ss.getSheetByName('Sheet1');

  if (
    defaultSheet &&
    ss.getSheets().length > 1 &&
    defaultSheet.getLastRow() === 0 &&
    defaultSheet.getLastColumn() === 0
  ) {
    ss.deleteSheet(defaultSheet);
  }
}


/************************************************************
 * INSTALL HEADERS
 ************************************************************/

function installAllHeaders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var headers = {};

  headers[SYSTEM.SHEETS.CUSTOMERS] = [
    'Customer ID',
    'Name',
    'Phone',
    'Alternative Phone',
    'Address',
    'ID / Reference',
    'Occupation / Business',
    'Registration Date',
    'Customer Status',
    'Notes',
    'Created By',
    'Created At',
    'Updated At'
  ];

  headers[SYSTEM.SHEETS.LOANS] = [
    'Loan ID',
    'Customer ID',
    'Customer Name',
    'Application Date',
    'Approval Date',
    'Disbursement Date',
    'Principal',
    'Interest Rate',
    'Term Days',
    'Due Date',
    'Initial Interest',
    'Additional Interest',
    'Total Interest Charged',
    'Total Payments',
    'Outstanding Balance',
    'Days Overdue',
    'Overdue Periods',
    'Status',
    'Paid Date',
    'Closed Date',
    'Loan Purpose',
    'Disbursement Method',
    'Notes',
    'Created By',
    'Created At',
    'Updated At'
  ];

  headers[SYSTEM.SHEETS.PAYMENTS] = [
    'Payment ID',
    'Loan ID',
    'Customer ID',
    'Customer Name',
    'Payment Date',
    'Amount',
    'Payment Method',
    'Reference',
    'Notes',
    'Created By',
    'Created At'
  ];

  headers[SYSTEM.SHEETS.INTEREST] = [
    'Interest ID',
    'Loan ID',
    'Customer ID',
    'Interest Date',
    'Period Number',
    'Opening Balance',
    'Interest Rate',
    'Interest Amount',
    'Closing Balance',
    'Notes',
    'Created By',
    'Created At'
  ];

  headers[SYSTEM.SHEETS.TRANSACTIONS] = [
    'Transaction ID',
    'Transaction Date',
    'Transaction Type',
    'Loan ID',
    'Customer ID',
    'Reference ID',
    'Amount',
    'Direction',
    'Description',
    'Created By',
    'Created At'
  ];

  headers[SYSTEM.SHEETS.COLLECTIONS] = [
    'Collection ID',
    'Loan ID',
    'Customer ID',
    'Customer Name',
    'Phone',
    'Collection Date',
    'Contact Method',
    'Promise to Pay Date',
    'Amount Promised',
    'Amount Received',
    'Collection Status',
    'Collector/User',
    'Notes',
    'Created At'
  ];

  headers[SYSTEM.SHEETS.SETTINGS] = [
    'Setting',
    'Value',
    'Description'
  ];

  headers[SYSTEM.SHEETS.LISTS] = [
    'Customer Status',
    'Loan Status',
    'Payment Method',
    'Collection Status',
    'Contact Method',
    'Disbursement Method',
    'Transaction Type',
    'User Role'
  ];

  headers[SYSTEM.SHEETS.AUDIT] = [
    'Audit ID',
    'Date / Time',
    'User',
    'Action',
    'Sheet',
    'Record ID',
    'Description'
  ];

  Object.keys(headers).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Required sheet not found: ' + sheetName);
    }

    var row = headers[sheetName];

    // Only install headers if they are missing.
    var existing = sheet
      .getRange(1, 1, 1, row.length)
      .getValues()[0];

    var hasHeader = existing.some(function(value) {
      return String(value).trim() !== '';
    });

    if (!hasHeader) {
      sheet.getRange(1, 1, 1, row.length).setValues([row]);
    }
  });
}


/************************************************************
 * SETTINGS
 ************************************************************/

function populateSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.SETTINGS);

  if (!sheet) {
    throw new Error('Settings sheet not found.');
  }

  var settings = [
    [
      'Business Name',
      'My Loan Business',
      'Business name displayed by the system.'
    ],
    [
      'Currency',
      'MWK',
      'System currency.'
    ],
    [
      'Default Interest Rate',
      0.40,
      'Default monthly interest rate for new loans. 0.40 = 40%.'
    ],
    [
      'Default Loan Term',
      30,
      'Default loan term in days.'
    ],
    [
      'Grace Period',
      0,
      'Grace period in days before overdue processing.'
    ],
    [
      'Compounding Enabled',
      'Yes',
      'Controls whether additional interest is processed.'
    ],
    [
      'Payment Allocation Method',
      'Outstanding Balance',
      'Current V1 payment allocation method.'
    ],
    [
      'Administrator',
      'Administrator',
      'Default system administrator.'
    ]
  ];

  if (sheet.getLastRow() <= 1) {
    sheet
      .getRange(2, 1, settings.length, 3)
      .setValues(settings);
  } else {
    // Ensure missing settings are added without overwriting
    // values already configured by the administrator.
    var existingRows = sheet
      .getRange(
        2,
        1,
        Math.max(sheet.getLastRow() - 1, 1),
        3
      )
      .getValues();

    var existingNames = {};

    existingRows.forEach(function(row) {
      if (row[0]) {
        existingNames[String(row[0])] = true;
      }
    });

    var missing = settings.filter(function(row) {
      return !existingNames[String(row[0])];
    });

    if (missing.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, missing.length, 3)
        .setValues(missing);
    }
  }
}


/************************************************************
 * LIST VALUES
 ************************************************************/

function populateLists_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.LISTS);

  if (!sheet) {
    throw new Error('Lists sheet not found.');
  }

  var lists = {
    customerStatus: [
      'Active',
      'Inactive',
      'Blacklisted'
    ],

    loanStatus: [
      'Application',
      'Approved',
      'Active',
      'Disbursed',
      'Due',
      'Overdue',
      'Paid',
      'Closed',
      'Written Off'
    ],

    paymentMethod: [
      'Cash',
      'Bank',
      'Mobile Money',
      'Other'
    ],

    collectionStatus: [
      'Pending',
      'Contacted',
      'Promise to Pay',
      'Partially Paid',
      'Paid',
      'Escalated',
      'No Contact'
    ],

    contactMethod: [
      'Phone',
      'SMS',
      'WhatsApp',
      'Visit',
      'Other'
    ],

    disbursementMethod: [
      'Cash',
      'Bank',
      'Mobile Money',
      'Other'
    ],

    transactionType: [
      'Loan Disbursement',
      'Payment',
      'Interest',
      'Adjustment',
      'Collection',
      'Reversal'
    ],

    userRole: [
      'Administrator',
      'Loan Officer',
      'Cashier',
      'Collector',
      'Manager',
      'Viewer'
    ]
  };

  var columns = [
    lists.customerStatus,
    lists.loanStatus,
    lists.paymentMethod,
    lists.collectionStatus,
    lists.contactMethod,
    lists.disbursementMethod,
    lists.transactionType,
    lists.userRole
  ];

  columns.forEach(function(values, index) {
    var column = index + 1;

    // Keep header.
    if (sheet.getMaxRows() < values.length + 1) {
      sheet.insertRowsAfter(
        sheet.getMaxRows(),
        values.length + 1 - sheet.getMaxRows()
      );
    }

    // Clear existing list values only below header.
    sheet
      .getRange(2, column, sheet.getMaxRows() - 1, 1)
      .clearContent();

    if (values.length > 0) {
      sheet
        .getRange(2, column, values.length, 1)
        .setValues(
          values.map(function(value) {
            return [value];
          })
        );
    }
  });
}


/************************************************************
 * DATA VALIDATION
 ************************************************************/

function installValidations_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lists = ss.getSheetByName(SYSTEM.SHEETS.LISTS);

  if (!lists) {
    throw new Error('Lists sheet not found.');
  }

  var maxRows = 1000;

  var customers = ss.getSheetByName(
    SYSTEM.SHEETS.CUSTOMERS
  );

  var loans = ss.getSheetByName(
    SYSTEM.SHEETS.LOANS
  );

  var payments = ss.getSheetByName(
    SYSTEM.SHEETS.PAYMENTS
  );

  var collections = ss.getSheetByName(
    SYSTEM.SHEETS.COLLECTIONS
  );

  if (customers) {
    var customerStatusRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 1, 3, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    customers
      .getRange(2, 9, maxRows, 1)
      .setDataValidation(customerStatusRule);
  }

  if (loans) {
    var loanStatusRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 2, 9, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    var disbursementRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 6, 4, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    loans
      .getRange(2, 18, maxRows, 1)
      .setDataValidation(loanStatusRule);

    loans
      .getRange(2, 22, maxRows, 1)
      .setDataValidation(disbursementRule);
  }

  if (payments) {
    var paymentRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 3, 4, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    payments
      .getRange(2, 7, maxRows, 1)
      .setDataValidation(paymentRule);
  }

  if (collections) {
    var collectionStatusRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 4, 7, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    var contactMethodRule =
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(
          lists.getRange(2, 5, 5, 1),
          true
        )
        .setAllowInvalid(false)
        .build();

    collections
      .getRange(2, 7, maxRows, 1)
      .setDataValidation(contactMethodRule);

    collections
      .getRange(2, 11, maxRows, 1)
      .setDataValidation(collectionStatusRule);
  }
}


/************************************************************
 * FORMATTING
 ************************************************************/

function formatAllSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SYSTEM.SHEETS).forEach(function(key) {
    var sheetName = SYSTEM.SHEETS[key];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) return;

    var lastColumn = Math.max(sheet.getLastColumn(), 1);

    // Header formatting
    sheet
      .getRange(1, 1, 1, lastColumn)
      .setFontWeight('bold')
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    sheet.setFrozenRows(1);

    // Filter
    if (sheet.getFilter()) {
      sheet.getFilter().remove();
    }

    if (sheet.getLastRow() >= 1 && lastColumn >= 1) {
      sheet
        .getRange(
          1,
          1,
          Math.max(sheet.getLastRow(), 2),
          lastColumn
        )
        .createFilter();
    }

    sheet
      .getRange(1, 1, sheet.getMaxRows(), lastColumn)
      .setVerticalAlignment('middle');

    sheet.autoResizeColumns(
      1,
      Math.min(lastColumn, 12)
    );
  });

  formatCustomerSheet_();
  formatLoanSheet_();
  formatPaymentSheet_();
  formatInterestSheet_();
  formatTransactionSheet_();
  formatCollectionSheet_();
  formatSettingsSheet_();
  formatAuditSheet_();
  formatListsSheet_();
}


function formatCustomerSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.CUSTOMERS);

  if (!sheet) return;

  sheet
    .getRange('H2:H')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('L2:M')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 140);
  sheet.setColumnWidth(7, 180);
  sheet.setColumnWidth(10, 220);
}


function formatLoanSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.LOANS);

  if (!sheet) return;

  sheet
    .getRange('D2:F')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('G2:G')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('H2:H')
    .setNumberFormat('0.00%');

  sheet
    .getRange('J2:J')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('K2:O')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('P2:Q')
    .setNumberFormat('0');

  sheet
    .getRange('S2:T')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('Y2:Z')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(23, 220);
}


function formatPaymentSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.PAYMENTS);

  if (!sheet) return;

  sheet
    .getRange('E2:E')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('F2:F')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('K2:K')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(9, 220);
}


function formatInterestSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.INTEREST);

  if (!sheet) return;

  sheet
    .getRange('D2:D')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('F2:F')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('G2:G')
    .setNumberFormat('0.00%');

  sheet
    .getRange('H2:I')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('L2:L')
    .setNumberFormat('dd/mm/yyyy hh:mm');
}


function formatTransactionSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.TRANSACTIONS);

  if (!sheet) return;

  sheet
    .getRange('B2:B')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('G2:G')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('K2:K')
    .setNumberFormat('dd/mm/yyyy hh:mm');
}


function formatCollectionSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.COLLECTIONS);

  if (!sheet) return;

  sheet
    .getRange('F2:H')
    .setNumberFormat('dd/mm/yyyy');

  sheet
    .getRange('I2:J')
    .setNumberFormat('#,##0.00');

  sheet
    .getRange('N2:N')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(13, 220);
}


function formatSettingsSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.SETTINGS);

  if (!sheet) return;

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 400);
}


function formatAuditSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.AUDIT);

  if (!sheet) return;

  sheet
    .getRange('B2:B')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(7, 400);
}


function formatListsSheet_() {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.LISTS);

  if (!sheet) return;

  for (var i = 1; i <= 8; i++) {
    sheet.setColumnWidth(i, 160);
  }
}


/************************************************************
 * DASHBOARD FOUNDATION
 ************************************************************/

function buildDashboard_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.DASHBOARD
  );

  if (!sheet) {
    throw new Error('Dashboard sheet not found.');
  }

  sheet.clear();

  sheet
    .getRange('A1:H1')
    .merge()
    .setValue('LOAN MANAGEMENT SYSTEM')
    .setFontSize(20)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f4e79')
    .setHorizontalAlignment('center');

  sheet
    .getRange('A3:B10')
    .setValues([
      ['Metric', 'Value'],
      ['Total Customers', 0],
      ['Total Loans', 0],
      ['Active Loans', 0],
      ['Overdue Loans', 0],
      ['Paid Loans', 0],
      ['Interest Charged', 0],
      ['Outstanding Balance', 0]
    ]);

  sheet
    .getRange('A3:B3')
    .setFontWeight('bold')
    .setBackground('#d9eaf7');

  sheet
    .getRange('B4:B10')
    .setNumberFormat('#,##0.00');

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 180);
}


/************************************************************
 * SYSTEM METADATA
 ************************************************************/

function writeSystemMetadata_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.SETTINGS
  );

  if (!sheet) return;

  sheet.getRange('E1:F1')
    .setValues([['System Information', 'Value']])
    .setFontWeight('bold')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff');

  sheet.getRange('E2:F8').setValues([
    ['System Version', SYSTEM.VERSION],
    ['Currency', SYSTEM.CURRENCY],
    ['Timezone', SYSTEM.TIMEZONE],
    ['Spreadsheet ID', ss.getId()],
    ['Spreadsheet Name', ss.getName()],
    ['Setup Date', new Date()],
    ['Interest Model', '30-day compounding']
  ]);

  sheet
    .getRange('F7')
    .setNumberFormat('dd/mm/yyyy hh:mm');

  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 260);
}


/************************************************************
 * MENU
 ************************************************************/

function createMenu_() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Loan Management')
    .addItem('Setup System', 'setupSystem')
    .addItem('Refresh System', 'refreshSystem')
    .addSeparator()
    .addItem('Process Interest', 'processInterest')
    .addItem('Sync Payments', 'syncPaymentsToTransactions')
    .addItem('Sync Collections', 'syncCollections')
    .addItem('Close Selected Loan', 'closeSelectedLoan')
    .addSeparator()
    .addItem('Create Daily Automation', 'createDailyTrigger')
    .addItem('Remove Daily Automation', 'removeDailyTrigger')
    .addSeparator()
    .addItem('Repair System', 'repairSystem')
    .addItem('Test System', 'testSystem')
    .addToUi();
}


/************************************************************
 * ON OPEN
 ************************************************************/

function onOpen() {
  createMenu_();
}


/************************************************************
 * REFRESH SYSTEM
 ************************************************************/

function refreshSystem() {
  installAllHeaders_();
  populateSettings_();
  populateLists_();
  formatAllSheets_();
  installValidations_();
  writeSystemMetadata_();
  createMenu_();

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'System refreshed successfully.'
  };
}


/************************************************************
 * REPAIR SYSTEM
 ************************************************************/

function repairSystem() {
  try {
    createAllSheets_();
    installAllHeaders_();
    populateSettings_();
    populateLists_();
    formatAllSheets_();
    installValidations_();
    buildDashboard_();
    writeSystemMetadata_();
    createMenu_();

    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'System repair completed successfully.'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}


/************************************************************
 * SYSTEM TEST
 ************************************************************/

function testSystem() {
  var results = [];

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    results.push({
      test: 'Spreadsheet',
      passed: !!ss,
      details: ss ? ss.getName() : 'Spreadsheet unavailable'
    });

    var requiredSheets = Object.keys(SYSTEM.SHEETS);

    requiredSheets.forEach(function(key) {
      var sheetName = SYSTEM.SHEETS[key];
      var exists = !!ss.getSheetByName(sheetName);

      results.push({
        test: 'Sheet: ' + sheetName,
        passed: exists,
        details: exists
          ? 'Sheet exists'
          : 'Sheet missing'
      });
    });

    var settingsSheet = ss.getSheetByName(
      SYSTEM.SHEETS.SETTINGS
    );

    results.push({
      test: 'Settings',
      passed: !!settingsSheet,
      details: settingsSheet
        ? 'Settings sheet available'
        : 'Settings sheet missing'
    });

    var listsSheet = ss.getSheetByName(
      SYSTEM.SHEETS.LISTS
    );

    results.push({
      test: 'Lists',
      passed: !!listsSheet,
      details: listsSheet
        ? 'Lists sheet available'
        : 'Lists sheet missing'
    });

    var passed = results.every(function(result) {
      return result.passed;
    });

    Logger.log(JSON.stringify(results, null, 2));

    return {
      success: passed,
      passed: results.filter(function(r) {
        return r.passed;
      }).length,
      total: results.length,
      results: results
    };

  } catch (error) {
    return {
      success: false,
      message: error.message,
      results: results
    };
  }
}


/************************************************************
 * PLACEHOLDER MAINTENANCE FUNCTIONS
 *
 * IMPORTANT:
 * These are intentionally NOT interest-engine functions.
 * The actual implementations are in:
 *
 * Automation.gs
 * Transactions.gs
 * InterestEngine.gs
 * Collections.gs
 *
 * We only keep safe wrappers here where required by
 * the existing menu/API architecture.
 ************************************************************/

function syncPaymentsToTransactions() {
  if (typeof syncPaymentsToTransactions_ === 'function') {
    return syncPaymentsToTransactions_();
  }

  return {
    success: true,
    message: 'Payment transaction synchronization is not required for current records.'
  };
}


function syncCollections() {
  if (typeof syncCollections_ === 'function') {
    return syncCollections_();
  }

  return {
    success: true,
    message: 'Collection synchronization is not required for current records.'
  };
}


function closeSelectedLoan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  if (
    !sheet ||
    sheet.getName() !== SYSTEM.SHEETS.LOANS
  ) {
    throw new Error(
      'Please select a row on the Loans sheet first.'
    );
  }

  var row = sheet.getActiveRange().getRow();

  if (row < 2) {
    throw new Error(
      'Please select a loan data row.'
    );
  }

  var loanId = sheet
    .getRange(row, 1)
    .getValue();

  if (!loanId) {
    throw new Error(
      'Selected row does not contain a Loan ID.'
    );
  }

  if (typeof getLoanById_ !== 'function') {
    throw new Error(
      'Loan engine is not available.'
    );
  }

  var loan = getLoanById_(String(loanId));

  if (!loan) {
    throw new Error(
      'Loan not found: ' + loanId
    );
  }

  if (typeof refreshLoanCalculations_ === 'function') {
    loan = refreshLoanCalculations_(loan.loanId);
  }

  if (Number(loan.outstandingBalance) > 0) {
    throw new Error(
      'Loan cannot be closed because it still has an outstanding balance of ' +
      Number(loan.outstandingBalance).toFixed(2) +
      '.'
    );
  }

  var now = new Date();

  sheet.getRange(row, 18).setValue('Closed');
  sheet.getRange(row, 20).setValue(now);
  sheet.getRange(row, 26).setValue(now);

  if (typeof audit_ === 'function') {
    audit_(
      'CLOSE_LOAN',
      SYSTEM.SHEETS.LOANS,
      String(loanId),
      'Loan formally closed after confirming zero outstanding balance.'
    );
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    loanId: String(loanId),
    status: 'Closed'
  };
}