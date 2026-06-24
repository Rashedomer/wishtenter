const prisma = require('../prisma/client');
const { createStripeClient } = require('../utils/stripeClient');

async function checkStripe() {
  try {
    const profiles = await prisma.profile.findMany({
      include: { user: true }
    });
    
    console.log(`Found ${profiles.length} profiles.`);
    const stripeClient = createStripeClient();
    
    for (const profile of profiles) {
      console.log(`\n----------------------------------------`);
      console.log(`User ID: ${profile.userId}`);
      console.log(`Username: ${profile.username}`);
      console.log(`Display Name: ${profile.displayName}`);
      console.log(`Stripe Account ID: ${profile.stripeAccountId}`);
      console.log(`Stripe Onboarding Complete (DB): ${profile.stripeOnboardingComplete}`);
      
      if (profile.stripeAccountId) {
        if (!stripeClient) {
          console.log(`Stripe client not configured.`);
          continue;
        }
        try {
          const account = await stripeClient.accounts.retrieve(profile.stripeAccountId);
          console.log(`Stripe Account details:`);
          console.log(`  Country: ${account.country}`);
          console.log(`  Email: ${account.email}`);
          console.log(`  Details Submitted: ${account.details_submitted}`);
          console.log(`  Charges Enabled: ${account.charges_enabled}`);
          console.log(`  Payouts Enabled: ${account.payouts_enabled}`);
          console.log(`  Default Currency: ${account.default_currency}`);
          console.log(`  Requirements:`, JSON.stringify(account.requirements, null, 2));
        } catch (stripeErr) {
          console.error(`  Error retrieving Stripe account ${profile.stripeAccountId}:`, stripeErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Error checking Stripe:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkStripe();
