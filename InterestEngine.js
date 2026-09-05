/************************************************************
 * INTEREST ENGINE
 * Loan Management System
 *
 * Interest model:
 *
 * Period 0:
 *   Initial interest at loan disbursement.
 *
 * Period 1:
 *   After 30 completed days, interest on current
 *   outstanding balance.
 *
 * Period 2:
 *   After 60 completed days, interest on current
 *   outstanding balance.
 *
 * Example at 40%:
 *   100,000
 *   140,000
 *   196,000
 *   274,400
 *   384,160
 *
 * Duplicate protection:
 *   Loan ID + Period Number
 ************************************************************/


/**
 * Get all interest ledger records.
 */
function getAllInterest_() {

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
        12
      )
      .getValues();

  return values

    .filter(function(row) {

      return String(
        row[0] || ''
      ).trim() !== '';

    })

    .map(function(row) {

      return interestRowToObject_(
        row
      );

    });
}


/**
 * Convert Interest Ledger row to object.
 */
function interestRowToObject_(row) {

  return {

    interestId:
      row[0],

    loanId:
      row[1],

    customerId:
      row[2],

    interestDate:
      row[3],

    periodNumber:
      Number(row[4]) || 0,

    openingBalance:
      Number(row[5]) || 0,

    interestRate:
      Number(row[6]) || 0,

    interestAmount:
      Number(row[7]) || 0,

    closingBalance:
      Number(row[8]) || 0,

    notes:
      row[9],

    createdBy:
      row[10],

    createdAt:
      row[11]
  };
}


/**
 * Generate the next Interest ID.
 *
 * Format:
 * INT-00001
 */
function generateInterestId_() {

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

  var lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return 'INT-00001';
  }

  var ids =
    sheet
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

    var match =
      String(id)
        .match(/^INT-(\d+)$/i);

    if (match) {

      highest =
        Math.max(
          highest,
          Number(match[1])
        );
    }
  });

  return 'INT-' +
    String(highest + 1)
      .padStart(5, '0');
}


/**
 * Check whether an interest period already exists.
 *
 * Unique key:
 * Loan ID + Period Number
 */
function interestPeriodExists_(
  loanId,
  periodNumber
) {

  loanId =
    String(
      loanId || ''
    ).trim();

  periodNumber =
    Number(periodNumber);

  if (!loanId) {
    return false;
  }

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
        12
      )
      .getValues();

  for (
    var i = 0;
    i < values.length;
    i++
  ) {

    var existingLoan =
      String(
        values[i][1] || ''
      ).trim();

    var existingPeriod =
      Number(values[i][4]);

    if (
      existingLoan === loanId &&
      existingPeriod === periodNumber
    ) {

      return true;
    }
  }

  return false;
}


/**
 * Get one specific interest period.
 */
function getInterestPeriod_(
  loanId,
  periodNumber
) {

  loanId =
    String(
      loanId || ''
    ).trim();

  periodNumber =
    Number(periodNumber);

  var records =
    getAllInterest_();

  for (
    var i = 0;
    i < records.length;
    i++
  ) {

    if (
      String(
        records[i].loanId
      ).trim() === loanId &&
      Number(
        records[i].periodNumber
      ) === periodNumber
    ) {

      return records[i];
    }
  }

  return null;
}


/**
 * Ensure the initial interest ledger record exists.
 *
 * Period 0 represents the initial 30-day interest
 * charged at loan origination.
 */
function ensureInitialInterestLedger_(
  loan
) {

  if (!loan) {
    throw new Error(
      'Loan is required.'
    );
  }

  var loanId =
    String(
      loan.loanId || ''
    ).trim();

  if (!loanId) {
    throw new Error(
      'Loan ID is missing.'
    );
  }

  /*
   * If period 0 already exists, do nothing.
   */
  var existing =
    getInterestPeriod_(
      loanId,
      0
    );

  if (existing) {
    return {
      created: false,
      record: existing
    };
  }

  var principal =
    Number(
      loan.principal
    ) || 0;

  if (principal <= 0) {
    throw new Error(
      'Loan principal must be greater than zero.'
    );
  }

  var rate =
    Number(
      loan.interestRate
    ) || 0;

  /*
   * Store rate internally as decimal.
   *
   * 40% = 0.40
   */
  if (rate > 1) {
    rate = rate / 100;
  }

  var initialInterest =
    Number(
      loan.initialInterest
    );

  /*
   * If Initial Interest is unavailable,
   * calculate it from principal and stored rate.
   */
  if (
    isNaN(initialInterest) ||
    initialInterest < 0
  ) {

    initialInterest =
      principal * rate;
  }

  initialInterest =
    Math.round(
      initialInterest * 100
    ) / 100;

  var closingBalance =
    Math.round(
      (
        principal +
        initialInterest
      ) * 100
    ) / 100;

  var interestId =
    generateInterestId_();

  var interestDate =
    loan.disbursementDate
      ? toDate_(
          loan.disbursementDate,
          'disbursement date'
        )
      : new Date();

  var currentUser =
    typeof getCurrentUser_ ===
    'function'
      ? getCurrentUser_()
      : 'Administrator';

  var createdAt =
    new Date();

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.INTEREST
    );

  if (!sheet) {
    throw new Error(
      'Interest Ledger sheet not found.'
    );
  }

  /*
   * Final duplicate check before writing.
   */
  if (
    interestPeriodExists_(
      loanId,
      0
    )
  ) {

    return {
      created: false,
      record:
        getInterestPeriod_(
          loanId,
          0
        )
    };
  }

  sheet.appendRow([

    interestId,

    loanId,

    loan.customerId || '',

    interestDate,

    0,

    principal,

    rate,

    initialInterest,

    closingBalance,

    'Initial interest',

    currentUser,

    createdAt

  ]);

  /*
   * Create financial transaction.
   *
   * Interest increases the receivable.
   */
  if (
    typeof createTransaction_ ===
    'function'
  ) {

    createTransaction_({

      transactionDate:
        interestDate,

      transactionType:
        'Interest',

      loanId:
        loanId,

      customerId:
        loan.customerId || '',

      referenceId:
        interestId,

      amount:
        initialInterest,

      direction:
        'IN',

      description:
        'Initial interest for loan ' +
        loanId

    });
  }

  /*
   * Audit.
   */
  if (
    typeof audit_ ===
    'function'
  ) {

    audit_(
      'CREATE_INTEREST',
      SYSTEM.SHEETS.INTEREST,
      interestId,
      'Initial interest of ' +
        initialInterest.toFixed(2) +
        ' created for loan ' +
        loanId
    );
  }

  SpreadsheetApp.flush();

  return {
    created: true,
    record:
      getInterestPeriod_(
        loanId,
        0
      )
  };
}


/**
 * Calculate the date for an interest period.
 *
 * Period 0 = disbursement date
 * Period 1 = disbursement + 30 days
 * Period 2 = disbursement + 60 days
 */
function calculateInterestPeriodDate_(
  disbursementDate,
  periodNumber
) {

  var date =
    toDate_(
      disbursementDate,
      'disbursement date'
    );

  var period =
    Number(periodNumber) || 0;

  return new Date(
    date.getTime() +
      (
        period *
        30 *
        24 *
        60 *
        60 *
        1000
      )
  );
}


/**
 * Determine how many complete 30-day periods
 * have elapsed since disbursement.
 */
function getCompletedInterestPeriods_(
  loan
) {

  if (
    !loan ||
    !loan.disbursementDate
  ) {
    return 0;
  }

  var disbursement =
    toDate_(
      loan.disbursementDate,
      'disbursement date'
    );

  var now =
    new Date();

  var elapsed =
    now.getTime() -
    disbursement.getTime();

  if (elapsed < 0) {
    return 0;
  }

  return Math.floor(
    elapsed /
      (
        30 *
        24 *
        60 *
        60 *
        1000
      )
  );
}


/**
 * Process ONE additional interest period.
 *
 * Period must be >= 1.
 */
function processOneInterestPeriod_(
  loan,
  periodNumber
) {

  if (!loan) {
    throw new Error(
      'Loan is required.'
    );
  }

  var loanId =
    String(
      loan.loanId || ''
    ).trim();

  if (!loanId) {
    throw new Error(
      'Loan ID is missing.'
    );
  }

  periodNumber =
    Number(periodNumber);

  if (
    isNaN(periodNumber) ||
    periodNumber < 1
  ) {

    throw new Error(
      'Additional interest period must be 1 or greater.'
    );
  }

  /*
   * First duplicate check.
   */
  if (
    interestPeriodExists_(
      loanId,
      periodNumber
    )
  ) {

    return {
      created: false,
      skipped: true,
      reason:
        'Interest period already exists.',
      loanId:
        loanId,
      periodNumber:
        periodNumber
    };
  }

  /*
   * Refresh loan calculations before calculating
   * interest.
   *
   * This ensures payments made before the interest
   * event reduce the outstanding balance first.
   */
  if (
    typeof refreshLoanCalculations_ ===
    'function'
  ) {

    loan =
      refreshLoanCalculations_(
        loanId
      );
  }

  var openingBalance =
    Number(
      loan.outstandingBalance
    ) || 0;

  /*
   * Never charge interest when nothing is owed.
   */
  if (openingBalance <= 0) {

    return {
      created: false,
      skipped: true,
      reason:
        'Loan has no outstanding balance.',
      loanId:
        loanId,
      periodNumber:
        periodNumber
    };
  }

  /*
   * Get loan-specific interest rate.
   *
   * Existing loans must retain their own rate.
   */
  var rate =
    Number(
      loan.interestRate
    ) || 0;

  if (rate > 1) {
    rate = rate / 100;
  }

  /*
   * Calculate interest on CURRENT outstanding balance.
   */
  var interestAmount =
    openingBalance * rate;

  interestAmount =
    Math.round(
      interestAmount * 100
    ) / 100;

  if (interestAmount <= 0) {

    return {
      created: false,
      skipped: true,
      reason:
        'Calculated interest is zero.',
      loanId:
        loanId,
      periodNumber:
        periodNumber
    };
  }

  var closingBalance =
    Math.round(
      (
        openingBalance +
        interestAmount
      ) * 100
    ) / 100;

  var interestDate =
    calculateInterestPeriodDate_(
      loan.disbursementDate,
      periodNumber
    );

  var interestId =
    generateInterestId_();

  var currentUser =
    typeof getCurrentUser_ ===
    'function'
      ? getCurrentUser_()
      : 'Administrator';

  var createdAt =
    new Date();

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  var sheet =
    ss.getSheetByName(
      SYSTEM.SHEETS.INTEREST
    );

  if (!sheet) {
    throw new Error(
      'Interest Ledger sheet not found.'
    );
  }

  /*
   * Final duplicate check immediately before
   * inserting the record.
   */
  if (
    interestPeriodExists_(
      loanId,
      periodNumber
    )
  ) {

    return {
      created: false,
      skipped: true,
      reason:
        'Interest period already exists.',
      loanId:
        loanId,
      periodNumber:
        periodNumber
    };
  }

  /*
   * Write immutable interest ledger event.
   */
  sheet.appendRow([

    interestId,

    loanId,

    loan.customerId || '',

    interestDate,

    periodNumber,

    openingBalance,

    rate,

    interestAmount,

    closingBalance,

    '30-day compounded interest',

    currentUser,

    createdAt

  ]);

  /*
   * Create corresponding financial transaction.
   */
  if (
    typeof createTransaction_ ===
    'function'
  ) {

    createTransaction_({

      transactionDate:
        interestDate,

      transactionType:
        'Interest',

      loanId:
        loanId,

      customerId:
        loan.customerId || '',

      referenceId:
        interestId,

      amount:
        interestAmount,

      direction:
        'IN',

      description:
        'Period ' +
        periodNumber +
        ' interest for loan ' +
        loanId

    });
  }

  /*
   * Recalculate the loan after interest.
   */
  if (
    typeof refreshLoanCalculations_ ===
    'function'
  ) {

    refreshLoanCalculations_(
      loanId
    );
  }

  /*
   * Audit.
   */
  if (
    typeof audit_ ===
    'function'
  ) {

    audit_(
      'CREATE_INTEREST',
      SYSTEM.SHEETS.INTEREST,
      interestId,
      'Period ' +
        periodNumber +
        ' interest of ' +
        interestAmount.toFixed(2) +
        ' charged on loan ' +
        loanId
    );
  }

  SpreadsheetApp.flush();

  return {
    created: true,
    skipped: false,
    interestId:
      interestId,
    loanId:
      loanId,
    periodNumber:
      periodNumber,
    openingBalance:
      openingBalance,
    interestRate:
      rate,
    interestAmount:
      interestAmount,
    closingBalance:
      closingBalance,
    interestDate:
      interestDate
  };
}


/**
 * Main interest engine.
 *
 * Processes:
 *   Period 0 = initial interest
 *   Period 1+ = completed 30-day periods
 *
 * Missing periods are processed in order.
 */
function runInterestEngine_() {

  var lock =
    LockService.getScriptLock();

  /*
   * Prevent two interest processes from running
   * simultaneously.
   */
  lock.waitLock(30000);

  try {

    if (
      typeof getAllLoans_ !==
      'function'
    ) {

      throw new Error(
        'Loan engine is not available.'
      );
    }

    var loans =
      getAllLoans_();

    var results = [];

    loans.forEach(
      function(loan) {

        var loanId =
          String(
            loan.loanId || ''
          ).trim();

        if (!loanId) {
          return;
        }

        var status =
          String(
            loan.status || ''
          ).trim();

        /*
         * These statuses must not receive
         * new interest processing.
         */
        if (
          status === 'Application' ||
          status === 'Approved' ||
          status === 'Closed' ||
          status === 'Written Off' ||
          status === 'Paid'
        ) {

          results.push({

            loanId:
              loanId,

            status:
              'Skipped',

            reason:
              'Loan status is ' +
              status

          });

          return;
        }

        if (
          !loan.disbursementDate
        ) {

          results.push({

            loanId:
              loanId,

            status:
              'Skipped',

            reason:
              'No disbursement date.'

          });

          return;
        }

        var disbursement =
          toDate_(
            loan.disbursementDate,
            'disbursement date'
          );

        if (
          disbursement >
          new Date()
        ) {

          results.push({

            loanId:
              loanId,

            status:
              'Skipped',

            reason:
              'Disbursement date is in the future.'

          });

          return;
        }

        /*
         * Ensure initial interest exists.
         */
        var initialResult =
          ensureInitialInterestLedger_(
            loan
          );

        /*
         * Refresh after initial interest so
         * outstanding balance is accurate.
         */
        if (
          typeof refreshLoanCalculations_ ===
          'function'
        ) {

          loan =
            refreshLoanCalculations_(
              loanId
            );
        }

        /*
         * If fully paid, do not add additional
         * interest.
         */
        if (
          Number(
            loan.outstandingBalance
          ) <= 0
        ) {

          results.push({

            loanId:
              loanId,

            status:
              'Paid',

            initialCreated:
              initialResult.created,

            additionalPeriods:
              0

          });

          return;
        }

        /*
         * Determine completed 30-day periods.
         */
        var completedPeriods =
          getCompletedInterestPeriods_(
            loan
          );

        var processed =
          [];

        /*
         * Process every missing period in order.
         */
        for (
          var period = 1;
          period <= completedPeriods;
          period++
        ) {

          /*
           * Stop if loan became fully paid.
           */
          if (
            Number(
              loan.outstandingBalance
            ) <= 0
          ) {
            break;
          }

          var periodResult =
            processOneInterestPeriod_(
              loan,
              period
            );

          processed.push(
            periodResult
          );

          /*
           * Refresh balance after every
           * interest event.
           */
          if (
            typeof refreshLoanCalculations_ ===
            'function'
          ) {

            loan =
              refreshLoanCalculations_(
                loanId
              );
          }
        }

        results.push({

          loanId:
            loanId,

          status:
            'Processed',

          completedPeriods:
            completedPeriods,

          initialCreated:
            initialResult.created,

          additionalPeriods:
            processed

        });
      }
    );

    return {

      success: true,

      processedAt:
        new Date(),

      loanCount:
        loans.length,

      results:
        results

    };

  } finally {

    lock.releaseLock();
  }
}


/**
 * Public test entry point.
 *
 * IMPORTANT:
 * This runs the real interest engine.
 *
 * It may create Interest Ledger records for
 * existing eligible loans.
 */
function testInterestEngine() {

  var result =
    runInterestEngine_();

  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}


/**
 * Get interest records for a loan.
 */
function getInterestForLoan_(
  loanId
) {

  loanId =
    String(
      loanId || ''
    ).trim();

  if (!loanId) {
    return [];
  }

  var records =
    getAllInterest_();

  return records.filter(
    function(record) {

      return String(
        record.loanId || ''
      ).trim() === loanId;

    }
  );
}

function testInterestPeriod1() {

  var loan = getLoanById_('LON-00001');

  if (!loan) {
    throw new Error(
      'Test loan LON-00001 was not found.'
    );
  }

  /*
   * Confirm Period 0 exists first.
   */
  var period0 =
    getInterestPeriod_(
      'LON-00001',
      0
    );

  if (!period0) {
    throw new Error(
      'Period 0 does not exist. Run testInterestEngine first.'
    );
  }

  /*
   * We temporarily use a copy of the loan
   * with a simulated disbursement date 30 days ago.
   *
   * The actual Loans sheet is NOT changed.
   */
  var simulatedLoan =
    Object.assign({}, loan);

  var originalDate =
    toDate_(
      loan.disbursementDate,
      'disbursement date'
    );

  simulatedLoan.disbursementDate =
    new Date(
      new Date().getTime() -
      (
        30 *
        24 *
        60 *
        60 *
        1000
      )
    );

  /*
   * Calculate what Period 1 should be.
   *
   * Current outstanding after Period 0:
   * MWK 140,000
   *
   * 40% interest:
   * MWK 56,000
   *
   * New balance:
   * MWK 196,000
   */
  var openingBalance =
    Number(
      loan.outstandingBalance
    ) || 0;

  var rate =
    Number(
      loan.interestRate
    ) || 0;

  var expectedInterest =
    Math.round(
      openingBalance *
      rate *
      100
    ) / 100;

  var expectedClosing =
    Math.round(
      (
        openingBalance +
        expectedInterest
      ) * 100
    ) / 100;

  /*
   * Process Period 1 using the real engine.
   *
   * We temporarily pass the simulated loan.
   */
  var result =
    processOneInterestPeriod_(
      simulatedLoan,
      1
    );

  /*
   * Read the actual ledger record created.
   */
  var period1 =
    getInterestPeriod_(
      'LON-00001',
      1
    );

  return {

    success: true,

    loanId:
      'LON-00001',

    period0Exists:
      true,

    period1Created:
      result.created === true,

    expectedOpeningBalance:
      openingBalance,

    expectedInterest:
      expectedInterest,

    expectedClosingBalance:
      expectedClosing,

    actualInterest:
      period1
        ? period1.interestAmount
        : null,

    actualClosingBalance:
      period1
        ? period1.closingBalance
        : null,

    originalDisbursementDate:
      originalDate,

    note:
      'The actual loan disbursement date was not changed.'

  };
}

function testInterestPeriod2() {

  var loan = getLoanById_('LON-00001');

  if (!loan) {
    throw new Error(
      'Test loan LON-00001 was not found.'
    );
  }

  var period1 =
    getInterestPeriod_(
      'LON-00001',
      1
    );

  if (!period1) {
    throw new Error(
      'Period 1 does not exist. Run testInterestPeriod1 first.'
    );
  }

  /*
   * Period 2 should start from Period 1 closing balance:
   *
   * 140,000 + 56,000 = 196,000
   */
  var openingBalance =
    Number(
      period1.closingBalance
    ) || 0;

  var rate =
    Number(
      loan.interestRate
    ) || 0;

  if (rate > 1) {
    rate = rate / 100;
  }

  var expectedInterest =
    Math.round(
      openingBalance *
      rate *
      100
    ) / 100;

  var expectedClosing =
    Math.round(
      (
        openingBalance +
        expectedInterest
      ) * 100
    ) / 100;

  /*
   * Process Period 2 using the real engine.
   */
  var result =
    processOneInterestPeriod_(
      loan,
      2
    );

  var period2 =
    getInterestPeriod_(
      'LON-00001',
      2
    );

  return {

    success: true,

    loanId:
      'LON-00001',

    period1ClosingBalance:
      openingBalance,

    expectedOpeningBalance:
      openingBalance,

    expectedInterest:
      expectedInterest,

    expectedClosingBalance:
      expectedClosing,

    actualInterest:
      period2
        ? period2.interestAmount
        : null,

    actualClosingBalance:
      period2
        ? period2.closingBalance
        : null,

    period2Created:
      result.created === true

  };
}

function testInterestAfterPayment() {

  var loan = getLoanById_('LON-00001');

  if (!loan) {
    throw new Error(
      'Test loan LON-00001 was not found.'
    );
  }

  /*
   * Confirm the payment exists.
   */
  var payments =
    getPaymentsForLoan_('LON-00001');

  if (!payments || payments.length === 0) {
    throw new Error(
      'No payment was found for LON-00001.'
    );
  }

  /*
   * Refresh the loan so the current outstanding
   * balance is accurate.
   */
  loan =
    refreshLoanCalculations_(
      'LON-00001'
    );

  var openingBalance =
    Number(
      loan.outstandingBalance
    ) || 0;

  /*
   * We expect:
   *
   * 274,400 - 74,400 = 200,000
   */
  if (openingBalance !== 200000) {
    throw new Error(
      'Expected outstanding balance of MWK 200,000, but found MWK ' +
      openingBalance
    );
  }

  var rate =
    Number(
      loan.interestRate
    ) || 0;

  if (rate > 1) {
    rate = rate / 100;
  }

  /*
   * Expected next interest:
   *
   * 200,000 × 40% = 80,000
   */
  var expectedInterest =
    Math.round(
      openingBalance *
      rate *
      100
    ) / 100;

  var expectedClosing =
    Math.round(
      (
        openingBalance +
        expectedInterest
      ) * 100
    ) / 100;

  /*
   * Create the next interest event.
   *
   * We use Period 3 because Periods 0, 1 and 2
   * already exist in this controlled test.
   */
  var result =
    processOneInterestPeriod_(
      loan,
      3
    );

  var period3 =
    getInterestPeriod_(
      'LON-00001',
      3
    );

  return {

    success: true,

    loanId:
      'LON-00001',

    paymentApplied:
      true,

    openingBalanceAfterPayment:
      openingBalance,

    expectedInterest:
      expectedInterest,

    expectedClosingBalance:
      expectedClosing,

    actualInterest:
      period3
        ? period3.interestAmount
        : null,

    actualClosingBalance:
      period3
        ? period3.closingBalance
        : null,

    period3Created:
      result.created === true,

    verification:
      (
        period3 &&
        period3.interestAmount === expectedInterest &&
        period3.closingBalance === expectedClosing
      )
        ? 'PASS'
        : 'CHECK REQUIRED'

  };
}

function getInterestForLoan_(loanId) {

  if (!loanId) {
    throw new Error('Loan ID is required.');
  }

  var allInterest = getAllInterest_();

  return allInterest.filter(function(item) {

    return String(item.loanId).trim() ===
           String(loanId).trim();

  });
}