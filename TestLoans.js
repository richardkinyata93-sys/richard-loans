function testLoanSystem() {

  var customer = getCustomerById_('CUS-00001');

  if (!customer) {
    throw new Error(
      'CUS-00001 does not exist. Create a customer first.'
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

  Logger.log(JSON.stringify(result, null, 2));
}