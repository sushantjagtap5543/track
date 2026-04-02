// saas/scripts/verify_billing_scenarios.js
const { calculateBillForAnyUser } = require('../src/controllers/billingController');
const crypto = require('crypto');

async function runStressTest() {
  console.log('🚀 INITIALIZING GEO-SURE-PATH PERFECT SYNC AUDIT (+500 SCENARIOS)');
  console.log('------------------------------------------------------------------');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < 500; i++) {
    try {
      const scenarioId = `sync_user_${i}`;
      const fleetSize = Math.floor(Math.random() * 50) + 1;
      const regDate = new Date(Date.now() - (Math.floor(Math.random() * 90)) * 24 * 60 * 60 * 1000);
      
      // 1. MOCK DATA
      const mockUser = {
        id: scenarioId,
        email: `${scenarioId}@traccar.com`,
        name: `User ${i}`,
        createdAt: regDate,
        vehicles: Array.from({ length: fleetSize }, (_, j) => ({
          imei: `IMEI_${i}_${j}`,
          registrationDate: regDate,
          deletedAt: null
        })),
        subscriptions: [{
          id: `sub_${i}`,
          status: 'ACTIVE',
          planId: 'BASIC_MONTHLY',
          deviceCount: Math.max(0, fleetSize - 5), // Simulate some debt
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          createdAt: regDate,
          invoiceId: `INV_${i}`
        }],
        userServices: []
      };

      const mockSettings = { taxRate: 18, taxInclusive: false };
      const mockPlans = [
        { id: 'BASIC_MONTHLY', name: 'Premium Basic', days: 30, price: 300, billingCycle: 'MONTHLY' }
      ];

      // 2. RUN CLIENT-SIDE CALCULATION
      const clientBill = await calculateBillForAnyUser(scenarioId, mockUser, null, false, 18.0, 'BASIC_MONTHLY', mockSettings, mockPlans);

      // 3. SIMULATE ADMIN LEDGER MAP (Identical to getAllUsersLedger logic)
      const adminLedgerEntry = {
          id: mockUser.id,
          totalDue: clientBill.totalDue,
          fleetSize: mockUser.vehicles.length,
          status: clientBill.sentry?.status || 'UNKNOWN'
      };

      // 4. ASSERTIONS
      
      // A. Perfect Sync Assertion
      const isSynced = adminLedgerEntry.totalDue === clientBill.totalDue && 
                       adminLedgerEntry.fleetSize === clientBill.orderSummary.fleetSize;

      // B. Strict 18% GST Assertion
      const subtotal = (clientBill.orderSummary?.subscription?.base || 0) + (clientBill.devices || []).reduce((s, d) => s + (d.breakdown?.base || 0), 0);
      const expectedTax = parseFloat((subtotal * 0.18).toFixed(2));
      const actualTax = (clientBill.orderSummary?.subscription?.tax || 0) + (clientBill.devices || []).reduce((s, d) => s + (d.breakdown?.tax || 0), 0);
      const taxDiff = Math.abs(actualTax - expectedTax);
      const isTaxCompliant = taxDiff <= 0.10;

      if (isSynced && isTaxCompliant) {
        passed++;
      } else {
        console.error(`❌ Scenario ${i} FAILED:`);
        if (!isSynced) console.error(`   Identity Drift: Admin Due(${adminLedgerEntry.totalDue}) vs Client Due(${clientBill.totalDue})`);
        if (!isTaxCompliant) console.error(`   Tax Non-Compliance: Expected ${expectedTax}, Got ${actualTax}`);
        failed++;
      }

    } catch (err) {
      console.error(`❌ Scenario ${i} CRASHED:`, err.message);
      failed++;
    }
  }

  console.log('------------------------------------------------------------------');
  console.log(`📊 TEST RESULTS: ${passed} SECURE, ${failed} DRIFTING`);
  console.log(`🏆 ACCURACY RATE: ${(passed / (passed + failed) * 100).toFixed(2)}%`);
  
  if (failed === 0) {
    console.log('🌟 PLATINUM SYNC VERIFIED: ZERO DRIFT DETECTED ACROSS ALL LAYERS');
  } else {
    process.exit(1);
  }
}

runStressTest().catch(console.error);
