/*******************************************************
 * AUTOMATION ENGINE
 * Daily Interest Processing
 *******************************************************/


/**
 * Official interest processor.
 *
 * This is the ONE public processInterest()
 * function that the system should use.
 *
 * It calls the protected interest engine:
 * runInterestEngine_()
 */
function processInterest() {

  var result = runInterestEngine_();

  return result;
}


/**
 * Public function used by the Web App.
 */
function processInterestFromWebApp() {

  try {

    var result = processInterest();

    return {
      success: true,
      data: result
    };

  } catch (error) {

    return {
      success: false,
      message: error.message
    };
  }
}


/**
 * Create the daily automatic interest trigger.
 *
 * The trigger runs once every day.
 */
function createDailyTrigger() {

  // Remove existing interest triggers first.
  // This prevents duplicate daily triggers.
  removeDailyTrigger();

  ScriptApp.newTrigger('processInterest')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();

  audit_(
    'Created Daily Automation',
    'Automation',
    'DAILY-INTEREST',
    'Created daily interest processing trigger.'
  );

  return {
    success: true,
    message: 'Daily interest automation created successfully.'
  };
}


/**
 * Remove all daily interest triggers.
 */
function removeDailyTrigger() {

  var triggers = ScriptApp.getProjectTriggers();

  var removed = 0;

  for (var i = 0; i < triggers.length; i++) {

    var handler =
      triggers[i].getHandlerFunction();

    if (handler === 'processInterest') {

      ScriptApp.deleteTrigger(
        triggers[i]
      );

      removed++;
    }
  }

  return {
    success: true,
    removed: removed
  };
}


/**
 * Check whether daily interest automation
 * is currently installed.
 */
function getAutomationStatus() {

  var triggers =
    ScriptApp.getProjectTriggers();

  var interestTrigger = false;

  var triggerCount = 0;

  for (var i = 0; i < triggers.length; i++) {

    var handler =
      triggers[i].getHandlerFunction();

    if (handler === 'processInterest') {

      interestTrigger = true;
      triggerCount++;
    }
  }

  return {

    enabled: interestTrigger,

    triggerCount: triggerCount,

    message: interestTrigger
      ? 'Daily interest automation is active.'
      : 'Daily interest automation is not active.'

  };
}


/**
 * Manual wrapper for running interest processing.
 *
 * This is useful from the Apps Script menu.
 */
function runInterestProcessing() {

  return processInterest();
}


/**
 * Test automation status.
 *
 * This writes the result clearly into the
 * Apps Script execution log.
 */
function testAutomationStatus() {

  var result = getAutomationStatus();

  Logger.log('========================================');
  Logger.log('AUTOMATION STATUS TEST');
  Logger.log('========================================');

  Logger.log(
    'Enabled: ' +
    result.enabled
  );

  Logger.log(
    'Trigger Count: ' +
    result.triggerCount
  );

  Logger.log(
    'Message: ' +
    result.message
  );

  Logger.log('========================================');

  return result;
}