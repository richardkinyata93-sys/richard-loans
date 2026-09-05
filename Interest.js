/*******************************************************
 * INTEREST ENGINE
 * Stage 4
 *
 * Interest rules:
 * - Period 0 = initial interest at loan origination.
 * - Every completed 30-day period creates one
 *   additional interest event.
 * - Additional interest is calculated on the
 *   current outstanding balance.
 * - No interest is charged when outstanding is zero.
 * - Loan ID + Period Number prevents duplicates.
 *******************************************************/


/**
 * Generate the next Interest ID.
 *
 * Format:
 * INT-00001
 */
function legacyGenerateInterestId_() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.INTEREST
  );

  if (!sheet) {
    throw new Error('Interest Ledger sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return SYSTEM.PREFIXES.INTEREST + '00001';
  }

  var values = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  var highest = 0;

  for (var i = 0; i < values.length; i++) {

    var id = String(values[i][0] || '').trim();

    var match = id.match(/^INT-(\d+)$/i);

    if (match) {

      var number = Number(match[1]);

      if (number > highest) {
        highest = number;
      }
    }
  }

  return SYSTEM.PREFIXES.INTEREST +
    String(highest + 1).padStart(5, '0');
}


/**
 * Check whether a particular loan already has
 * a particular interest period.
 *
 * This is the main duplicate-protection mechanism.
 */
function legacyInterestEntryExists_(
  loanId,
  periodNumber
) {

  if (!loanId) {
    return false;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.INTEREST
  );

  if (!sheet) {
    throw new Error('Interest Ledger sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return false;
  }

  var data = sheet
    .getRange(2, 1, lastRow - 1, 12)
    .getValues();

  var searchLoanId =
    String(loanId).trim();

  var searchPeriod =
    Number(periodNumber);

  for (var i = 0; i < data.length; i++) {

    var existingLoanId =
      String(data[i][1] || '').trim();

    var existingPeriod =
      Number(data[i][4]);

    if (
      existingLoanId === searchLoanId &&
      existingPeriod === searchPeriod
    ) {
      return true;
    }
  }

  return false;
}


/**
 * Get all interest ledger entries.
 */
function legacyGetAllInterestEntries_() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.INTEREST
  );

  if (!sheet) {
    throw new Error('Interest Ledger sheet not found.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var data = sheet
    .getRange(2, 1, lastRow - 1, 12)
    .getValues();

  var entries = [];

  for (var i = 0; i < data.length; i++) {

    if (!data[i][0]) {
      continue;
    }

    entries.push({

      interestId: data[i][0],

      loanId: data[i][1],

      customerId: data[i][2],

      interestDate: data[i][3],

      periodNumber: data[i][4],

      openingBalance: data[i][5],

      interestRate: data[i][6],

      interestAmount: data[i][7],

      closingBalance: data[i][8],

      notes: data[i][9],

      createdBy: data[i][10],

      createdAt: data[i][11]

    });
  }

  return entries;
}


/**
 * Get interest entries for a loan.
 */
function legacyGetInterestForLoan_(loanId) {

  if (!loanId) {
    return [];
  }

  var entries =
    legacyGetAllInterestEntries_();

  var searchLoanId =
    String(loanId).trim();

  return entries.filter(
    function(entry) {

      return String(
        entry.loanId || ''
      ).trim() === searchLoanId;

    }
  );
}


/**
 * Create an interest ledger entry.
 *
 * This function also creates the corresponding
 * financial transaction.
 */
function legacyCreateInterestEntry_(data) {

  if (!data) {
    throw new Error(
      'Interest information is required.'
    );
  }

  var loanId =
    String(data.loanId || '').trim();

  if (!loanId) {
    throw new Error('Loan ID is required.');
  }

  var customerId =
    String(data.customerId || '').trim();

  if (!customerId) {
    throw new Error('Customer ID is required.');
  }

  var periodNumber =
    Number(data.periodNumber);

  if (
    isNaN(periodNumber) ||
    periodNumber < 0 ||
    Math.floor(periodNumber) !== periodNumber
  ) {
    throw new Error(
      'Interest period number must be a whole number of zero or greater.'
    );
  }

  var openingBalance =
    requirePositiveNumber_(
      data.openingBalance,
      'Opening balance'
    );

  var interestRate =
    Number(data.interestRate);

  if (
    isNaN(interestRate) ||
    interestRate < 0
  ) {
    throw new Error(
      'Interest rate cannot be negative.'
    );
  }

  var interestAmount =
    Number(data.interestAmount);

  if (
    isNaN(interestAmount) ||
    interestAmount < 0
  ) {
    throw new Error(
      'Interest amount cannot be negative.'
    );
  }

  var closingBalance =
    Number(data.closingBalance);

  if (
    isNaN(closingBalance) ||
    closingBalance < 0
  ) {
    throw new Error(
      'Closing balance is invalid.'
    );
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(
    SYSTEM.SHEETS.INTEREST
  );

  if (!sheet) {
    throw new Error(
      'Interest Ledger sheet not found.'
    );
  }

  /**
   * Duplicate protection.
   */
  if (
    legacyInterestEntryExists_(
      loanId,
      periodNumber
    )
  ) {

    throw new Error(
      'Interest period ' +
      periodNumber +
      ' already exists for loan ' +
      loanId +
      '.'
    );
  }

  var interestId =
    legacyGenerateInterestId_();

  var interestDate =
    data.interestDate
      ? toDate_(
          data.interestDate,
          'interest date'
        )
      : new Date();

  var notes =
    String(data.notes || '').trim();

  var now = new Date();

  var user =
    getCurrentUser_();

  sheet.appendRow([

    interestId,

    loanId,

    customerId,

    interestDate,

    periodNumber,

    openingBalance,

    interestRate,

    interestAmount,

    closingBalance,

    notes,

    user,

    now

  ]);

  /**
   * Create financial transaction.
   *
   * Interest is not cash received.
   * In this V1 ledger, IN means the receivable
   * increased.
   */
  createTransaction_({

    transactionDate: interestDate,

    transactionType: 'Interest',

    loanId: loanId,

    customerId: customerId,

    referenceId: interestId,

    amount: interestAmount,

    direction: 'IN',

    description:
      'Interest charged - Period ' +
      periodNumber

  });

  audit_(
    'Created Interest',
    SYSTEM.SHEETS.INTEREST,
    interestId,
    'Interest charged on loan ' +
      loanId +
      ' for period ' +
      periodNumber +
      ': ' +
      interestAmount
  );

  return {

    success: true,

    interestId: interestId,

    loanId: loanId,

    customerId: customerId,

    periodNumber: periodNumber,

    openingBalance: openingBalance,

    interestRate: interestRate,

    interestAmount: interestAmount,

    closingBalance: closingBalance

  };
}


/**
 * Ensure Period 0 exists for a loan.
 *
 * Important:
 * Stage 2 already puts Initial Interest directly
 * into the Loans sheet.
 *
 * Therefore this function does NOT charge the
 * borrower again.
 *
 * It simply creates the missing ledger record
 * representing the original interest.
 */
function legacyEnsureInitialInterestLedger_(loan) {

  if (!loan) {
    throw new Error('Loan information is required.');
  }

  var loanId =
    String(loan.loanId || '').trim();

  if (!loanId) {
    throw new Error('Loan ID is required.');
  }

  /**
   * If Period 0 already exists, do nothing.
   */
  if (
    legacyInterestEntryExists_(
      loanId,
      0
    )
  ) {

    return {
      success: true,
      created: false,
      message:
        'Initial interest ledger already exists.'
    };
  }

  var principal =
    Number(loan.principal || 0);

  var rate =
    Number(loan.interestRate || 0);

  var initialInterest =
    Number(loan.initialInterest || 0);

  if (
    principal <= 0 ||
    initialInterest < 0
  ) {

    return {
      success: false,
      created: false,
      message:
        'Loan does not contain valid initial interest data.'
    };
  }

  var closingBalance =
    principal + initialInterest;

  var interestDate =
    loan.disbursementDate
      ? toDate_(
          loan.disbursementDate,
          'disbursement date'
        )
      : new Date();

  var result =
    legacyCreateInterestEntry_({

      loanId: loanId,

      customerId:
        loan.customerId,

      interestDate:
        interestDate,

      periodNumber: 0,

      openingBalance:
        principal,

      interestRate:
        rate,

      interestAmount:
        initialInterest,

      closingBalance:
        closingBalance,

      notes:
        'Initial interest recorded from loan origination.'

    });

  return {
    success: true,
    created: true,
    result: result
  };
}


/**
 * Calculate how many 30-day periods have completed
 * since loan disbursement.
 *
 * Period 0 = origination.
 *
 * Period 1 = 30 days after disbursement.
 * Period 2 = 60 days after disbursement.
 * etc.
 */
function legacyCalculateCompletedInterestPeriods_(
  disbursementDate,
  today
) {

  var start =
    toDate_(
      disbursementDate,
      'disbursement date'
    );

  var end =
    today
      ? toDate_(today, 'current date')
      : new Date();

  var milliseconds =
    end.getTime() -
    start.getTime();

  if (milliseconds <= 0) {
    return 0;
  }

  var days =
    Math.floor(
      milliseconds /
      (1000 * 60 * 60 * 24)
    );

  return Math.floor(days / 30);
}


/**
 * Process additional interest for one loan.
 *
 * This is the main compounding function.
 */
function legacyProcessInterestForLoan_(loanId) {

  var lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    var loan =
      getLoanById_(loanId);

    if (!loan) {
      throw new Error(
        'Loan not found: ' + loanId
      );
    }

    /**
     * Do not process interest on a loan
     * with zero outstanding.
     */
    var currentOutstanding =
      Number(
        loan.outstandingBalance || 0
      );

    /**
     * First make sure Period 0 exists.
     *
     * This does not double-charge it.
     */
    legacyEnsureInitialInterestLedger_(loan);

    if (currentOutstanding <= 0) {

      return {

        success: true,

        loanId: loanId,

        periodsProcessed: 0,

        message:
          'Loan has no outstanding balance.'

      };
    }

    /**
     * Only process loans that have actually
     * been disbursed.
     */
    if (!loan.disbursementDate) {

      return {

        success: true,

        loanId: loanId,

        periodsProcessed: 0,

        message:
          'Loan has no disbursement date.'

      };
    }

    var completedPeriods =
      legacyCalculateCompletedInterestPeriods_(
        loan.disbursementDate,
        new Date()
      );

    /**
     * We need to find the highest period already
     * recorded.
     */
    var entries =
      legacyGetInterestForLoan_(loanId);

    var highestPeriod = -1;

    for (var i = 0; i < entries.length; i++) {

      var p =
        Number(entries[i].periodNumber);

      if (p > highestPeriod) {
        highestPeriod = p;
      }
    }

    /**
     * Period 0 should now exist.
     */
    if (highestPeriod < 0) {
      highestPeriod = 0;
    }

    var periodsProcessed = 0;

    var currentBalance =
      Number(
        getLoanById_(loanId).outstandingBalance || 0
      );

    /**
     * Process every missing completed period.
     *
     * Example:
     *
     * completedPeriods = 3
     * highestPeriod = 0
     *
     * Process:
     * Period 1
     * Period 2
     * Period 3
     */
    for (
      var period = highestPeriod + 1;
      period <= completedPeriods;
      period++
    ) {

      /**
       * If the loan has been fully paid before
       * this period, stop.
       */
      if (currentBalance <= 0) {
        break;
      }

      /**
       * Double-check duplicate protection.
       */
      if (
        legacyInterestEntryExists_(
          loanId,
          period
        )
      ) {
        continue;
      }

      var rate =
        Number(loan.interestRate || 0);

      var interestAmount =
        currentBalance * rate;

      /**
       * Round to two decimal places.
       */
      interestAmount =
        Math.round(
          interestAmount * 100
        ) / 100;

      var closingBalance =
        currentBalance +
        interestAmount;

      var disbursement =
        toDate_(
          loan.disbursementDate,
          'disbursement date'
        );

      var interestDate =
        new Date(disbursement);

      interestDate.setDate(
        interestDate.getDate() +
        (period * 30)
      );

      legacyCreateInterestEntry_({

        loanId: loan.loanId,

        customerId: loan.customerId,

        interestDate: interestDate,

        periodNumber: period,

        openingBalance: currentBalance,

        interestRate: rate,

        interestAmount: interestAmount,

        closingBalance: closingBalance,

        notes:
          'Automatic 30-day compound interest.'

      });

      /**
       * The next period compounds on the new
       * balance.
       */
      currentBalance =
        closingBalance;

      periodsProcessed++;
    }

    /**
     * Recalculate the loan after all interest
     * events have been processed.
     */
    refreshLoanCalculations_(loanId);

    var refreshedLoan =
      getLoanById_(loanId);

    return {

      success: true,

      loanId: loanId,

      periodsProcessed:
        periodsProcessed,

      outstandingBalance:
        refreshedLoan
          ? refreshedLoan.outstandingBalance
          : currentBalance

    };

  } finally {

    lock.releaseLock();

  }
}


/**
 * Process interest for all applicable loans.
 *
 * This is the function that will eventually
 * be run automatically every day.
 */
function legacyProcessInterest_() {

  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.LOANS
    );

  if (!sheet) {
    throw new Error(
      'Loans sheet not found.'
    );
  }

  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {

      success: true,

      loansChecked: 0,

      loansProcessed: 0,

      totalInterestAdded: 0

    };
  }

  var loans =
    getAllLoans_();

  var loansChecked = 0;
  var loansProcessed = 0;
  var totalInterestAdded = 0;

  var results = [];

  for (var i = 0; i < loans.length; i++) {

    var loan =
      loans[i];

    loansChecked++;

    /**
     * Only process loans that are financially
     * active.
     */
    var status =
      String(
        loan.status || ''
      ).trim();

    if (
      status !== 'Active' &&
      status !== 'Disbursed' &&
      status !== 'Due' &&
      status !== 'Overdue'
    ) {
      continue;
    }

    var beforeBalance =
      Number(
        loan.outstandingBalance || 0
      );

    if (beforeBalance <= 0) {
      continue;
    }

    try {

      var result =
        legacyProcessInterestForLoan_(
          loan.loanId
        );

      if (
        result &&
        result.periodsProcessed > 0
      ) {

        loansProcessed++;

        var afterBalance =
          Number(
            result.outstandingBalance || 0
          );

        totalInterestAdded +=
          Math.max(
            0,
            afterBalance - beforeBalance
          );
      }

      results.push(result);

    } catch (error) {

      results.push({

        success: false,

        loanId:
          loan.loanId,

        error:
          error.message

      });

    }
  }

  return {

    success: true,

    loansChecked:
      loansChecked,

    loansProcessed:
      loansProcessed,

    totalInterestAdded:
      Math.round(
        totalInterestAdded * 100
      ) / 100,

    results:
      results

  };
}


/**
 * Test the interest engine without creating
 * a fake loan or charging a customer.
 *
 * It checks whether the engine can:
 * - find the Interest Ledger
 * - generate the next Interest ID
 * - read the interest settings
 */
function testInterestEngine_() {

  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.INTEREST
    );

  if (!sheet) {
    throw new Error(
      'Interest Ledger sheet not found.'
    );
  }

  var nextId =
    legacyGenerateInterestId_();

  var defaultRate =
    Number(
      getSetting_(
        'Default Interest Rate',
        0.40
      )
    );

  var defaultTerm =
    Number(
      getSetting_(
        'Default Loan Term',
        30
      )
    );

  Logger.log(
    'Interest Engine OK.'
  );

  Logger.log(
    'Next Interest ID: ' +
    nextId
  );

  Logger.log(
    'Default Interest Rate: ' +
    defaultRate
  );

  Logger.log(
    'Default Loan Term: ' +
    defaultTerm
  );

  return {

    success: true,

    nextInterestId:
      nextId,

    defaultInterestRate:
      defaultRate,

    defaultLoanTerm:
      defaultTerm

  };
}