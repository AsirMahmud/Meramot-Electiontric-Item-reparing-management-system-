import emailValidator from 'deep-email-validator';

async function pingEmail(emailToPing: string) {
  console.log(`\n================================`);
  console.log(`[SMTP PING TEST] Checking: ${emailToPing}`);
  console.log(`================================`);
  
  try {
    const result = await emailValidator({
      email: emailToPing,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: true,
    });

    if (result.valid) {
      console.log(`✅ RESULT: The email exists and is deliverable!`);
    } else {
      console.log(`❌ RESULT: Email does not exist or is undeliverable.`);
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Details:`, result.validators[result.reason || 'smtp']?.reason || 'No detailed reason provided.');
    }
    
    // Print the full response for debugging purposes
    console.log(`\n[Raw Output from deep-email-validator]`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`💥 ERROR: Something went wrong during validation.`);
    console.error(error);
  }
}

// Test with a few different emails
async function runTests() {
  console.log("Starting email validation tests...");
  
  // 1. Test a valid Google email
  await pingEmail("test@gmail.com"); 

  // 2. Test a random non-existent Google email
  await pingEmail("this_email_definitely_does_not_exist_xyz123@gmail.com");

  // 3. Test a temporary/disposable email
  await pingEmail("test@mailinator.com");

  console.log(`\nTests finished.`);
}

runTests();
