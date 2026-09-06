/*******************************************************
 * WEB APP CONTROLLER
 * Loan Management System
 *
 * This file is the bridge between:
 *
 * Web App
 *     ↓
 * WebApp.gs
 *     ↓
 * Business Logic
 *     ↓
 * Google Sheets
 *
 * IMPORTANT:
 * - Do not put business calculations here.
 * - Do not duplicate functions from other .gs files.
 * - Financial logic remains in Loans, Payments,
 *   Interest, Transactions and Collections files.
 *******************************************************/


/**
 * =====================================================
 * WEB APP ENTRY POINT
 * =====================================================
 */

function doGet() {

  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Loan Management System')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/**
 * =====================================================
 * HTML INCLUDE
 * =====================================================
 */

function include(filename) {

  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}


/**
 * =====================================================
 * CUSTOMERS API
 * =====================================================
 */


/**
 * Get all customers.
 */
function getCustomers() {

  try {

    var customers =
      getAllCustomers_();

    return {
      success: true,
      data:
        makeWebSafe_(customers || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get one customer.
 */
function getCustomer(customerId) {

  try {

    if (!customerId) {

      throw new Error(
        'Customer ID is required.'
      );

    }

    var customer =
      getCustomerById_(customerId);

    if (!customer) {

      throw new Error(
        'Customer not found.'
      );

    }

    return {
      success: true,
      data:
        makeWebSafe_(customer)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Search customers.
 */
function searchCustomers(query) {

  try {

    var result =
      searchCustomers_(query || '');

    return {
      success: true,
      data:
        makeWebSafe_(result || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Create customer from Web App.
 */
function createCustomerFromWebApp(data) {

  try {

    var result =
      createCustomer(data || {});

    return {
      success: true,
      data:
        makeWebSafe_(result || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * LOANS API
 * =====================================================
 */


/**
 * Get all loans.
 */
function getLoans() {

  try {

    var loans =
      getAllLoans_();

    return {
      success: true,
      data:
        makeWebSafe_(loans || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get one loan.
 */
function getLoan(loanId) {

  try {

    if (!loanId) {

      throw new Error(
        'Loan ID is required.'
      );

    }

    var loan =
      getLoanById_(loanId);

    if (!loan) {

      throw new Error(
        'Loan not found.'
      );

    }

    /*
     * Refresh calculated values before returning
     * the loan to the frontend.
     */
    try {

      loan =
        refreshLoanCalculations_(loanId);

    } catch (refreshError) {

      /*
       * If the refresh function returns an object
       * or is unavailable in an older backend,
       * keep the original loan object.
       */

    }

    return {
      success: true,
      data:
        makeWebSafe_(loan)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get loans belonging to a customer.
 */
function getCustomerLoans(customerId) {

  try {

    if (!customerId) {

      throw new Error(
        'Customer ID is required.'
      );

    }

    var loans =
      getLoansForCustomer_(customerId);

    return {
      success: true,
      data:
        makeWebSafe_(loans || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Create loan from Web App.
 */
function createLoanFromWebApp(data) {

  try {

    var result =
      createLoan(data || {});

    return {
      success: true,
      data:
        makeWebSafe_(result || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * PAYMENTS API
 * =====================================================
 */


/**
 * Get all payments.
 */
function getPayments() {

  try {

    var payments =
      typeof getAllPayments_ === 'function'
        ? getAllPayments_()
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(payments || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get payments for one loan.
 */
function getLoanPayments(loanId) {

  try {

    if (!loanId) {

      throw new Error(
        'Loan ID is required.'
      );

    }

    var payments =
      typeof getPaymentsForLoan_ === 'function'
        ? getPaymentsForLoan_(loanId)
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(payments || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Record payment from Web App.
 */
function recordPaymentFromWebApp(data) {

  try {

    var result =
      recordPayment(data || {});

    return {
      success: true,
      data:
        makeWebSafe_(result || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * COLLECTIONS API
 * =====================================================
 */


/**
 * Get all collections.
 */
function getCollections() {

  try {

    var collections =
      typeof getAllCollections_ === 'function'
        ? getAllCollections_()
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(collections || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get collections for a loan.
 */
function getLoanCollections(loanId) {

  try {

    if (!loanId) {

      throw new Error(
        'Loan ID is required.'
      );

    }

    var collections =
      typeof getCollectionsForLoan_ === 'function'
        ? getCollectionsForLoan_(loanId)
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(collections || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Record collection activity from Web App.
 */
function recordCollectionFromWebApp(data) {

  try {

    var result =
      recordCollection(data || {});

    return {
      success: true,
      data:
        makeWebSafe_(result || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * INTEREST API
 * =====================================================
 */


/**
 * Get all interest ledger records.
 */
function getInterest() {

  try {

    var interest =
      typeof getAllInterest_ === 'function'
        ? getAllInterest_()
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(interest || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get interest records for one loan.
 */
function getLoanInterest(loanId) {

  try {

    if (!loanId) {

      throw new Error(
        'Loan ID is required.'
      );

    }

    var allInterest =
      typeof getAllInterest_ === 'function'
        ? getAllInterest_()
        : [];

    var result =
      allInterest.filter(function(item) {

        return String(item.loanId)
          .trim()
          .toUpperCase() ===
          String(loanId)
            .trim()
            .toUpperCase();

      });

    return {
      success: true,
      data:
        makeWebSafe_(result)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Run interest processing from Web App.
 */
function runInterestProcessingFromWebApp() {

  try {

    var result =
      processInterest();

    return {
      success: true,
      data:
        makeWebSafe_(result || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * TRANSACTIONS API
 * =====================================================
 */


/**
 * Get all transactions.
 */
function getTransactions() {

  try {

    var transactions =
      typeof getAllTransactions_ === 'function'
        ? getAllTransactions_()
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(transactions || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Get transactions for one loan.
 */
function getLoanTransactions(loanId) {

  try {

    if (!loanId) {

      throw new Error(
        'Loan ID is required.'
      );

    }

    var transactions =
      typeof getTransactionsForLoan_ === 'function'
        ? getTransactionsForLoan_(loanId)
        : [];

    return {
      success: true,
      data:
        makeWebSafe_(transactions || [])
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * REPORTS API
 * =====================================================
 */


/**
 * Generate dashboard/report summary.
 */
function getReports() {

  try {

    var dashboard =
      refreshDashboard();

    return {
      success: true,
      data:
        makeWebSafe_(dashboard || {})
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * AUDIT API
 * =====================================================
 */


/**
 * Get Audit Log records.
 */
function getAuditLog() {

  try {

    var ss =
      SpreadsheetApp.getActiveSpreadsheet();

    var sheetName =
      (
        typeof SYSTEM !== 'undefined' &&
        SYSTEM.SHEETS
      )
        ? SYSTEM.SHEETS.AUDIT
        : 'Audit Log';

    var sheet =
      ss.getSheetByName(sheetName);

    if (!sheet) {

      return {
        success: true,
        data: []
      };

    }

    var lastRow =
      sheet.getLastRow();

    var lastColumn =
      sheet.getLastColumn();

    if (lastRow < 2) {

      return {
        success: true,
        data: []
      };

    }

    var values =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          lastColumn
        )
        .getValues();

    var result =
      values.map(function(row) {

        return {

          auditId:
            row[0],

          timestamp:
            makeWebSafe_(row[1]),

          user:
            row[2],

          action:
            row[3],

          sheetName:
            row[4],

          recordId:
            row[5],

          description:
            row[6]

        };

      });

    return {
      success: true,
      data:
        makeWebSafe_(result)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * SETTINGS API
 * =====================================================
 */


/**
 * Get system settings.
 */
function getSystemSettings() {

  try {

    var ss =
      SpreadsheetApp.getActiveSpreadsheet();

    var sheetName =
      (
        typeof SYSTEM !== 'undefined' &&
        SYSTEM.SHEETS
      )
        ? SYSTEM.SHEETS.SETTINGS
        : 'Settings';

    var sheet =
      ss.getSheetByName(sheetName);

    if (!sheet) {

      return {
        success: true,
        data: {}
      };

    }

    var lastRow =
      sheet.getLastRow();

    if (lastRow < 2) {

      return {
        success: true,
        data: {}
      };

    }

    var values =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          2
        )
        .getValues();

    var settings = {};

    values.forEach(function(row) {

      var key =
        String(row[0] || '').trim();

      if (key) {

        settings[key] =
          makeWebSafe_(row[1]);

      }

    });

    return {
      success: true,
      data:
        makeWebSafe_(settings)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * SYSTEM INFORMATION
 * =====================================================
 */

function getSystemInfo() {

  try {

    var ss =
      SpreadsheetApp.getActiveSpreadsheet();

    var sheets =
      ss.getSheets();

    var sheetNames =
      sheets.map(function(sheet) {

        return sheet.getName();

      });

    return {
      success: true,
      data: {

        systemName:
          'Loan Management System',

        version:
          typeof SYSTEM !== 'undefined'
            ? SYSTEM.VERSION
            : '1.0.0',

        currency:
          typeof SYSTEM !== 'undefined'
            ? SYSTEM.CURRENCY
            : 'MWK',

        businessName:
          typeof getSetting_ === 'function'
            ? getSetting_('Business Name', 'My Loan Business')
            : 'My Loan Business',

        administrator:
          typeof getCurrentUser_ === 'function'
            ? getCurrentUser_()
            : 'Administrator',

        timezone:
          typeof SYSTEM !== 'undefined'
            ? SYSTEM.TIMEZONE
            : Session.getScriptTimeZone(),

        spreadsheetName:
          ss.getName(),

        spreadsheetId:
          ss.getId(),

        sheetCount:
          sheets.length,

        sheets:
          sheetNames,

        timestamp:
          new Date().toISOString()

      }
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * AUTOMATION API
 * =====================================================
 */


/**
 * Get automation status.
 */
function getWebAppAutomationStatus() {

  try {

    var result =
      typeof getAutomationStatus === 'function'
        ? getAutomationStatus()
        : {
            active: false
          };

    return {
      success: true,
      data:
        makeWebSafe_(result)
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Create daily automation from Web App.
 */
function createDailyAutomation() {

  try {

    var result =
      createDailyTrigger();

    return {
      success: true,
      data:
        makeWebSafe_(
          result || {
            status: 'Success'
          }
        )
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * Remove daily automation from Web App.
 */
function removeDailyAutomation() {

  try {

    var result =
      removeDailyTrigger();

    return {
      success: true,
      data:
        makeWebSafe_(
          result || {
            status: 'Success'
          }
        )
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * SYSTEM HEALTH CHECK
 * =====================================================
 */

function getSystemHealth() {

  try {

    var ss =
      SpreadsheetApp.getActiveSpreadsheet();

    var requiredSheets = [

      'Dashboard',
      'Customers',
      'Loans',
      'Payments',
      'Interest Ledger',
      'Transactions',
      'Collections',
      'Settings',
      'Lists',
      'Audit Log'

    ];

    var missingSheets = [];

    requiredSheets.forEach(function(name) {

      if (!ss.getSheetByName(name)) {

        missingSheets.push(name);

      }

    });

    return {
      success: true,
      data: {

        healthy:
          missingSheets.length === 0,

        missingSheets:
          missingSheets,

        spreadsheet:
          ss.getName(),

        timestamp:
          new Date().toISOString()

      }
    };

  } catch (error) {

    return {
      success: false,
      error: error.message,
      message: error.message
    };
  }
}


/**
 * =====================================================
 * TEST FUNCTIONS
 * =====================================================
 */

function testWebAppInformation() {

  var health =
    getSystemHealth();

  var info =
    getSystemInfo();

  Logger.log(
    '========== SYSTEM HEALTH =========='
  );

  Logger.log(
    JSON.stringify(
      health,
      null,
      2
    )
  );

  Logger.log(
    '========== SYSTEM INFORMATION =========='
  );

  Logger.log(
    JSON.stringify(
      info,
      null,
      2
    )
  );

  Logger.log(
    '========== DASHBOARD =========='
  );

  var dashboard =
    getDashboardData();

  Logger.log(
    JSON.stringify(
      dashboard,
      null,
      2
    )
  );

  return {

    health:
      health,

    info:
      info,

    dashboard:
      dashboard

  };
}


function testCustomersAPI() {

  Logger.log(
    '========== CUSTOMER API TEST =========='
  );

  try {

    var customers =
      getCustomers();

    Logger.log(
      'getCustomers() result:'
    );

    Logger.log(
      JSON.stringify(
        customers,
        null,
        2
      )
    );

    Logger.log(
      'Customer count:'
    );

    if (
      customers &&
      customers.data
    ) {

      Logger.log(
        customers.data.length
      );

    } else {

      Logger.log(
        'NO DATA ARRAY FOUND'
      );

    }

    return customers;

  } catch (error) {

    Logger.log(
      'CUSTOMER API ERROR:'
    );

    Logger.log(
      error.message
    );

    return {

      success: false,

      error:
        error.message,

      message:
        error.message

    };
  }
}


function testGetCustomersDirectly() {

  var result =
    getCustomers();

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}


/**
 * Read-only HTTP boundary for the separate Vercel frontend.
 *
 * Financial write operations remain unavailable here until an
 * authenticated API layer is implemented.
 */
function doPost(event) {

  var allowedMethods = {
    getDashboardData: true,
    getSystemInfo: true,
    getSystemHealth: true,
    getCustomers: true,
    getLoans: true,
    getPayments: true,
    getCollections: true,
    getInterest: true,
    getTransactions: true,
    getReports: true,
    getAuditLog: true,
    getSystemSettings: true,
    getWebAppAutomationStatus: true
  };

  try {

    var body =
      event &&
      event.postData &&
      event.postData.contents
        ? JSON.parse(event.postData.contents)
        : {};

    var method =
      String(body.method || '').trim();

    var args =
      Array.isArray(body.args)
        ? body.args
        : [];

    if (!allowedMethods[method]) {
      throw new Error(
        'HTTP method is not available.'
      );
    }

    var handler =
      typeof globalThis[method] === 'function'
        ? globalThis[method]
        : null;

    if (!handler) {
      throw new Error(
        'HTTP method is not implemented.'
      );
    }

    var result =
      handler.apply(null, args);

    return ContentService
      .createTextOutput(
        JSON.stringify(result)
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  } catch (error) {

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          error: error.message
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );
  }
}


function testAllWebAppAPIs() {

  var tests = [

    [
      'getCustomers',
      function() {
        return getCustomers();
      }
    ],

    [
      'getLoans',
      function() {
        return getLoans();
      }
    ],

    [
      'getPayments',
      function() {
        return getPayments();
      }
    ],

    [
      'getCollections',
      function() {
        return getCollections();
      }
    ],

    [
      'getInterest',
      function() {
        return getInterest();
      }
    ],

    [
      'getTransactions',
      function() {
        return getTransactions();
      }
    ],

    [
      'getReports',
      function() {
        return getReports();
      }
    ],

    [
      'getSystemSettings',
      function() {
        return getSystemSettings();
      }
    ],

    [
      'getSystemInfo',
      function() {
        return getSystemInfo();
      }
    ],

    [
      'getSystemHealth',
      function() {
        return getSystemHealth();
      }
    ]

  ];


  tests.forEach(function(test) {

    var name =
      test[0];

    try {

      var result =
        test[1]();

      console.log(

        '========== ' +
        name +
        ' ==========\n' +

        JSON.stringify(
          result,
          null,
          2
        )

      );

    } catch (error) {

      console.error(

        '========== ' +
        name +
        ' ERROR ==========\n' +

        error.message

      );

    }

  });
}


/**
 * Temporary diagnostic ping.
 */
function testWebAppPing() {

  var result = {

    success:
      true,

    message:
      'Web app server is responding',

    time:
      new Date().toISOString()

  };

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}