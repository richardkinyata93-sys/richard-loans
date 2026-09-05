function refreshDashboard() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.DASHBOARD);

  if (!sheet) {
    throw new Error('Dashboard sheet not found.');
  }

  var customers = getAllCustomers_();
  var loans = getAllLoans_();
  var payments = getAllPayments_();
  var collections = getAllCollections_();
  var interest = getAllInterest_();
  var transactions = getAllTransactions_();

  var totalCustomers = customers.length;
  var totalLoans = loans.length;

  var activeLoans = loans.filter(function(loan) {
    return String(loan.status).toLowerCase() === 'active';
  }).length;

  var overdueLoans = loans.filter(function(loan) {
    return String(loan.status).toLowerCase() === 'overdue';
  }).length;

  var paidLoans = loans.filter(function(loan) {
    return String(loan.status).toLowerCase() === 'paid';
  }).length;

  var closedLoans = loans.filter(function(loan) {
    return String(loan.status).toLowerCase() === 'closed';
  }).length;

  var principalDisbursed = loans.reduce(function(total, loan) {
    return total + (Number(loan.principal) || 0);
  }, 0);

  var interestCharged = interest.reduce(function(total, item) {
    return total + (Number(item.interestAmount) || 0);
  }, 0);

  var paymentsReceived = payments.reduce(function(total, payment) {
    return total + (Number(payment.amount) || 0);
  }, 0);

  var outstandingBalance = loans.reduce(function(total, loan) {
    return total + Math.max(
      0,
      Number(loan.outstandingBalance) || 0
    );
  }, 0);

  var overdueBalance = loans.reduce(function(total, loan) {

    if (String(loan.status).toLowerCase() === 'overdue') {
      return total + Math.max(
        0,
        Number(loan.outstandingBalance) || 0
      );
    }

    return total;

  }, 0);

  var totalCollections = collections.reduce(function(total, collection) {
    return total + (Number(collection.amountReceived) || 0);
  }, 0);

  var promisesOutstanding = collections.reduce(function(total, collection) {

    var promised = Number(collection.amountPromised) || 0;
    var received = Number(collection.amountReceived) || 0;

    return total + Math.max(
      0,
      promised - received
    );

  }, 0);

  var dashboard = {

    totalCustomers: totalCustomers,
    totalLoans: totalLoans,

    activeLoans: activeLoans,
    overdueLoans: overdueLoans,
    paidLoans: paidLoans,
    closedLoans: closedLoans,

    principalDisbursed: principalDisbursed,
    interestCharged: interestCharged,
    paymentsReceived: paymentsReceived,
    outstandingBalance: outstandingBalance,
    overdueBalance: overdueBalance,

    totalCollections: totalCollections,
    promisesOutstanding: promisesOutstanding,

    transactionCount: transactions.length,

    lastUpdated: new Date()

  };

  writeDashboardSheet_(dashboard);

  audit_(
    'DASHBOARD_REFRESH',
    SYSTEM.SHEETS.DASHBOARD,
    '',
    'Dashboard refreshed successfully.'
  );

  return dashboard;
}


function writeDashboardSheet_(data) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM.SHEETS.DASHBOARD);

  if (!sheet) {
    throw new Error('Dashboard sheet not found.');
  }

  sheet.clear();

  sheet.getRange('A1:H1')
    .merge()
    .setValue('LOAN MANAGEMENT SYSTEM')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('A2:H2')
    .merge()
    .setValue('Business Dashboard')
    .setFontSize(12)
    .setHorizontalAlignment('center');

  sheet.getRange('A4:B4')
    .merge()
    .setValue('CUSTOMERS & LOANS')
    .setFontWeight('bold');

  var operational = [
    ['Total Customers', data.totalCustomers],
    ['Total Loans', data.totalLoans],
    ['Active Loans', data.activeLoans],
    ['Overdue Loans', data.overdueLoans],
    ['Paid Loans', data.paidLoans],
    ['Closed Loans', data.closedLoans]
  ];

  sheet.getRange(5, 1, operational.length, 2)
    .setValues(operational);

  sheet.getRange('D4:E4')
    .merge()
    .setValue('FINANCIAL SUMMARY')
    .setFontWeight('bold');

  var financial = [
    ['Principal Disbursed', data.principalDisbursed],
    ['Interest Charged', data.interestCharged],
    ['Payments Received', data.paymentsReceived],
    ['Outstanding Balance', data.outstandingBalance],
    ['Overdue Balance', data.overdueBalance],
    ['Collections Received', data.totalCollections],
    ['Promises Outstanding', data.promisesOutstanding]
  ];

  sheet.getRange(5, 4, financial.length, 2)
    .setValues(financial);

  sheet.getRange('G4:H4')
    .merge()
    .setValue('SYSTEM INFORMATION')
    .setFontWeight('bold');

  var systemInfo = [
    ['Transactions', data.transactionCount],
    ['Last Updated', data.lastUpdated]
  ];

  sheet.getRange(5, 7, systemInfo.length, 2)
    .setValues(systemInfo);

  sheet.getRange('E5:E11')
    .setNumberFormat('#,##0.00');

  sheet.getRange('H6')
    .setNumberFormat('yyyy-mm-dd hh:mm:ss');

  sheet.getRange('A4:H11')
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );

  sheet.getRange('A4:H4')
    .setFontWeight('bold');

  sheet.setFrozenRows(4);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 30);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 30);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 150);

  sheet.getRange('A13:H13')
    .merge()
    .setValue(
      'Dashboard values are generated from Customers, Loans, Payments, Interest Ledger, Collections and Transactions.'
    )
    .setFontStyle('italic')
    .setWrap(true);
}


function testDashboard() {

  var result = refreshDashboard();

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}
function getDashboardData() {
  return refreshDashboard();
}