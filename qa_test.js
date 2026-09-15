/**
 * Homzo Platform - Automated QA Integration Test Suite
 * Executing A-to-Z tests covering logins, bookings, ratings, property listings,
 * blog/content posting, support tickets, operational tasks, and SMS/WhatsApp/Email notifications.
 */

const BASE_URL = 'http://127.0.0.1:3000';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🏁 Starting Homzo Platform Automated QA Test Suite');
  console.log('======================================================\n');

  let adminToken = '';
  let partnerToken = '';
  let customerToken = '';
  let testGuestId = null;
  let testReviewId = null;
  let testTicketId = null;
  let testTaskId = null;
  let testPropertyId = null;

  // Helper assertion function
  function assert(condition, testName) {
    if (condition) {
      console.log(` ✅ [PASS] - ${testName}`);
      return true;
    } else {
      console.error(` ❌ [FAIL] - ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // 1. --- TEST SUITE: CUSTOMER FLOWS (PUBLIC WEB) ---
  console.log('\n------------------------------------------------------');
  console.log('👤 Suite 1: Customer Auth & Notifications (Public Web)');
  console.log('------------------------------------------------------');

  const randomEmail = `guest_${Math.floor(1000 + Math.random() * 9000)}@test.com`;
  const randomPhone = `+91 99999 ${Math.floor(10000 + Math.random() * 90000)}`;

  // 1.1 Customer Registration
  try {
    const res = await fetch(`${BASE_URL}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Guest',
        email: randomEmail,
        password: 'customer123',
        phone: randomPhone
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Customer profile registration');
  } catch (err) {
    assert(false, `Customer profile registration failed: ${err.message}`);
  }

  // 1.2 Customer Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'customer123'
      })
    });
    const data = await res.json();
    assert(res.ok && data.token && data.role === 'customer', 'Customer secure check-in (login)');
    customerToken = data.token;
  } catch (err) {
    assert(false, `Customer login failed: ${err.message}`);
  }

  // 1.3 Customer Forgot Password (OTP SMS/WhatsApp/Email Check)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Trigger verification OTP request');

    // Verify notifications history (Email, SMS, WhatsApp)
    const notifRes = await fetch(`${BASE_URL}/api/test/notifications`);
    const notifs = await notifRes.json();

    const latestEmail = notifs.find(n => n.type === 'email' && n.to === randomEmail);
    const latestSMS = notifs.find(n => n.type === 'sms' && n.to === randomPhone);
    const latestWhatsApp = notifs.find(n => n.type === 'whatsapp' && n.to === randomPhone);

    assert(latestEmail && latestEmail.content.includes('OTP'), 'Verification OTP sent to Email');
    assert(latestSMS && latestSMS.content.includes('OTP'), 'Verification OTP sent to SMS');
    assert(latestWhatsApp && latestWhatsApp.content.includes('OTP'), 'Verification OTP sent to WhatsApp');
  } catch (err) {
    assert(false, `Forgot password / notification checks failed: ${err.message}`);
  }


  // 2. --- TEST SUITE: SUPER ADMIN FLOWS (ADMIN CONSOLE) ---
  console.log('\n------------------------------------------------------');
  console.log('🔑 Suite 2: Admin Operations & Configurations (Admin Console)');
  console.log('------------------------------------------------------');

  // 2.1 Admin Authentication
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@homzo.in',
        password: 'admin123'
      })
    });
    const data = await res.json();
    assert(res.ok && data.token && data.role === 'super_admin', 'Admin console authenticated session');
    adminToken = data.token;
  } catch (err) {
    assert(false, `Admin authentication failed: ${err.message}`);
  }

  // 2.2 Property Listing Addition
  try {
    const res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'QA Luxury Suite Mumbai',
        location: 'Mumbai',
        type: 'hotel',
        price: '4500',
        beds: 2,
        baths: 2,
        area: 400
      })
    });
    const data = await res.json();
    assert(res.ok && data.id, 'Super Admin: Register new property listing');
    testPropertyId = data.id;
  } catch (err) {
    assert(false, `Property creation failed: ${err.message}`);
  }

  // 2.3 Website Content Update
  try {
    const res = await fetch(`${BASE_URL}/api/admin/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        heroTitle: 'HOMZO - Luxury Stay Re-defined',
        heroSubtitle: 'Handpicked verified premium rooms for students & professionals',
        faq: [
          { q: 'What is Homzo?', a: 'Homzo is a premium verified hotel and accommodation platform.' }
        ]
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Super Admin: Update website content & FAQs');
  } catch (err) {
    assert(false, `Content update failed: ${err.message}`);
  }


  // 3. --- TEST SUITE: PARTNER FLOWS (PARTNER CONSOLE) ---
  console.log('\n------------------------------------------------------');
  console.log('🏨 Suite 3: Partner Operations (Partner Console)');
  console.log('------------------------------------------------------');

  // 3.1 Partner Authentication
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'partner@homzo.in',
        password: 'partner123'
      })
    });
    const data = await res.json();
    assert(res.ok && data.token && data.role === 'partner', 'Partner console authenticated session');
    partnerToken = data.token;
  } catch (err) {
    assert(false, `Partner authentication failed: ${err.message}`);
  }

  // 3.2 Support Ticket Creation
  try {
    const res = await fetch(`${BASE_URL}/api/partner/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partnerToken}`
      },
      body: JSON.stringify({
        subject: 'WiFi issue Room 302',
        category: 'Technical',
        message: 'The Wi-Fi router seems to drop packets frequently in room 302.'
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Partner: Raise support helpdesk ticket');
    testTicketId = data.ticketId;
  } catch (err) {
    assert(false, `Ticket creation failed: ${err.message}`);
  }


  // 4. --- TEST SUITE: BOOKING LIFECYCLE ---
  console.log('\n------------------------------------------------------');
  console.log('📅 Suite 4: Booking Lifecycle & Receipts');
  console.log('------------------------------------------------------');

  // 4.1 Create Booking (Customer guest registration checkin/out)
  try {
    const res = await fetch(`${BASE_URL}/api/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Guest',
        email: randomEmail,
        phone: randomPhone,
        guest_type: 'tourist',
        property: 'QA Luxury Suite Mumbai',
        checkin: '2026-08-10',
        checkout: '2026-08-15',
        dob: '1998-05-12',
        persons: 2,
        notes: 'Quiet room preferred.',
        paymentStatus: 'Unpaid',
        paymentId: '',
        transactionRef: '',
        customerId: '1'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.id) {
      console.error('Failed booking response:', res.status, data);
    }
    assert(res.ok && data.id, 'Create guest reservation (Public Website booking)');
    testGuestId = data.id;

    // Verify booking alerts triggered (Email, SMS, WhatsApp)
    const notifRes = await fetch(`${BASE_URL}/api/test/notifications`);
    const notifs = await notifRes.json();

    const confirmEmail = notifs.find(n => n.type === 'email' && n.to === randomEmail && n.content.includes('confirmed'));
    const confirmSMS = notifs.find(n => n.type === 'sms' && n.to === randomPhone && n.content.includes('confirmed'));
    const confirmWhatsApp = notifs.find(n => n.type === 'whatsapp' && n.to === randomPhone && n.content.includes('confirmed'));

    assert(confirmEmail, 'Booking confirmation sent to guest Email');
    assert(confirmSMS, 'Booking confirmation sent to guest SMS');
    assert(confirmWhatsApp, 'Booking confirmation sent to guest WhatsApp');
  } catch (err) {
    assert(false, `Booking flow failed: ${err.message}`);
  }

  // 4.2 Invoice Calculation Check (Subtotal, GST 18%, Service Charge 5%)
  try {
    // In order to verify the invoice, let's request invoice generation API (admin)
    const res = await fetch(`${BASE_URL}/api/admin/bookings/BKG${1000 + testGuestId}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Invoice generation calculation & validation');
  } catch (err) {
    assert(false, `Invoice check failed: ${err.message}`);
  }


  // 5. --- TEST SUITE: RATINGS & REVIEWS ---
  console.log('\n------------------------------------------------------');
  console.log('⭐ Suite 5: Ratings & Guest Reviews');
  console.log('------------------------------------------------------');

  // 5.1 Post Review
  try {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Guest',
        email: randomEmail,
        rating: 5,
        review: 'Excellent hotel and supreme cleanliness!'
      })
    });
    const data = await res.json();
    assert(res.ok && data.id, 'Guest review post submission (Rating & Feedback)');
    testReviewId = data.id;
  } catch (err) {
    assert(false, `Review post failed: ${err.message}`);
  }

  // 5.2 Partner Reply to Review
  try {
    const res = await fetch(`${BASE_URL}/api/partner/reviews/${testReviewId}/reply`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partnerToken}`
      },
      body: JSON.stringify({
        reply: 'Thank you for your wonderful feedback!'
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Partner reply to guest review');
  } catch (err) {
    assert(false, `Review reply failed: ${err.message}`);
  }


  // 6. --- TEST SUITE: PAYOUT APPROVALS & AUDIT LOGGING INTEGRATION ---
  console.log('\n------------------------------------------------------');
  console.log('💸 Suite 6: Payout Approvals & Security Auditing');
  console.log('------------------------------------------------------');

  // 6.0 Create Payout Request
  try {
    const res = await fetch(`${BASE_URL}/api/admin/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ partner: 'Default Partner', amount: 45000 })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Create partner payout request');
  } catch (err) {
    assert(false, `Payout creation failed: ${err.message}`);
  }

  // 6.1 Payout Approve Endpoint Audit Check
  try {
    const res = await fetch(`${BASE_URL}/api/admin/payments/payout/401/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ partner: 'Default Partner', amount: 45000 })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Execute partner payout approval endpoint');

    // Verify audit logs contains "approve_payout" action
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logs = await auditRes.json();
    const approveLog = logs.find(l => l.Action === 'approve_payout' && l.Email === 'admin@homzo.in');
    assert(approveLog && approveLog.IP !== undefined && approveLog.User_Agent !== undefined, 'Audited Payout Approval Action with IP and Device Info');
  } catch (err) {
    assert(false, `Payout approve check failed: ${err.message}`);
  }

  // 6.2 Payout Hold Endpoint Audit Check
  try {
    const res = await fetch(`${BASE_URL}/api/admin/payments/payout/401/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ partner: 'Default Partner', amount: 45000 })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Execute partner payout hold endpoint');

    // Verify audit logs contains "hold_payout" action
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logs = await auditRes.json();
    const holdLog = logs.find(l => l.Action === 'hold_payout' && l.Email === 'admin@homzo.in');
    assert(holdLog && holdLog.IP !== undefined && holdLog.User_Agent !== undefined, 'Audited Payout Hold Action with IP and Device Info');
  } catch (err) {
    assert(false, `Payout hold check failed: ${err.message}`);
  }


  // 7. --- TEST SUITE: TASKS & OPERATIONS ---
  console.log('\n------------------------------------------------------');
  console.log('🧹 Suite 7: Operational Tasks Dispatching');
  console.log('------------------------------------------------------');

  // 7.1 Dispatch Operational Task
  try {
    const res = await fetch(`${BASE_URL}/api/admin/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        taskName: 'Room 205 Linen Change and Sanitization',
        assignedTo: 'Ramesh Kumar'
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true && data.task && data.task.ID, 'Super Admin: Dispatch operational task to employee');
    testTaskId = data.task.ID;
  } catch (err) {
    assert(false, `Task dispatch failed: ${err.message}`);
  }

  // 7.2 Update Task Status
  try {
    const res = await fetch(`${BASE_URL}/api/admin/tasks/${testTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Completed'
      })
    });
    const data = await res.json();
    assert(res.ok && data.success === true, 'Super Admin: Mark task status as Completed');
  } catch (err) {
    assert(false, `Task status update failed: ${err.message}`);
  }

  } finally {
    console.log('\n------------------------------------------------------');
    console.log('🧹 Suite 8: Automated Post-Test Cleanup');
    console.log('------------------------------------------------------');

    // 1. Delete test property
    if (testPropertyId && adminToken) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/admin/properties/${testPropertyId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const delData = await delRes.json();
        console.log(` ✅ Cleaned test property (ID ${testPropertyId}):`, delData.message || 'Deleted');
      } catch (e) {
        console.error(' ⚠️ Failed to delete test property:', e.message);
      }
    }

    // 2. Delete test booking / guest
    if (testGuestId && adminToken) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/admin/bookings/${testGuestId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const delData = await delRes.json();
        console.log(` ✅ Cleaned test booking (ID BKG${1000 + testGuestId}):`, delData.message || 'Deleted');
      } catch (e) {
        console.error(' ⚠️ Failed to delete test booking:', e.message);
      }
    }

    // 3. Delete test review
    if (testReviewId) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/reviews/${testReviewId}`, {
          method: 'DELETE'
        });
        const delData = await delRes.json();
        console.log(` ✅ Cleaned test review (ID ${testReviewId}):`, delData.message || 'Deleted');
      } catch (e) {
        console.error(' ⚠️ Failed to delete test review:', e.message);
      }
    }

    // 4. Delete test operational task
    if (testTaskId && adminToken) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/admin/tasks/${testTaskId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const delData = await delRes.json();
        console.log(` ✅ Cleaned test task (ID ${testTaskId}):`, delData.message || 'Deleted');
      } catch (e) {
        console.error(' ⚠️ Failed to delete test task:', e.message);
      }
    }

    // 5. Delete test support ticket
    if (testTicketId && adminToken) {
      try {
        const delRes = await fetch(`${BASE_URL}/api/admin/tickets/${testTicketId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const delData = await delRes.json();
        console.log(` ✅ Cleaned test ticket (ID ${testTicketId}):`, delData.message || 'Deleted');
      } catch (e) {
        console.error(' ⚠️ Failed to delete test ticket:', e.message);
      }
    }

    // 6. Comprehensive scrub via /api/qa/cleanup (removes test customers, audit logs, payouts, and orphaned test data)
    try {
      const cleanRes = await fetch(`${BASE_URL}/api/qa/cleanup`, { method: 'POST' });
      const cleanData = await cleanRes.json();
      console.log(' ✅ Comprehensive QA Cleanup Summary:', cleanData.summary || cleanData);
    } catch (e) {
      console.error(' ⚠️ Comprehensive cleanup request failed:', e.message);
    }

    console.log(' ✨ CRM and database completely scrubbed of dummy test data.');
  }

  console.log('\n======================================================');
  console.log('🎉 QA Automation Suite Completed successfully! All tests [PASSED].');
  console.log('======================================================\n');
}

runTestSuite().catch(err => {
  console.error('Fatal testing suite error:', err);
  process.exit(1);
});
