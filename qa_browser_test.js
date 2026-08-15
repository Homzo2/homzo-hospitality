const fs = require('fs');
const path = require('path');
const http = require('http');

const WEB_DIR = path.join(__dirname, 'customer_web');
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Helper: Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    req.on('error', (err) => {
      resolve({ statusCode: 500, data: err.message });
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Smart Path Resolution
function resolveAssetPath(pageName, assetPath) {
  // Decode URL encoding (like %20)
  let cleanPath = decodeURIComponent(assetPath).split('?')[0].split('#')[0].trim();
  
  if (!cleanPath) {
    return { ok: true };
  }

  if (
    cleanPath.startsWith('http') || 
    cleanPath.startsWith('//') || 
    cleanPath.startsWith('data:') || 
    cleanPath.startsWith('mailto:') || 
    cleanPath.startsWith('tel:') || 
    cleanPath.startsWith('javascript:')
  ) {
    return { ok: true };
  }
  
  // If it's a dynamic server route
  if (cleanPath === '/careers' || cleanPath === 'careers' || cleanPath === '/careers.html') {
    return { ok: true, file: path.join(WEB_DIR, 'careers.html') };
  }
  if (cleanPath.startsWith('/careers/job/') || cleanPath.startsWith('careers/job/') || cleanPath === '/careers/job/${job.ID}') {
    return { ok: true, file: path.join(WEB_DIR, 'job-details.html') };
  }
  
  // If page is job-details.html and asset starts with ../..
  if (pageName === 'job-details.html') {
    if (cleanPath.startsWith('../../')) {
      cleanPath = cleanPath.substring(6); // Remove '../../'
    } else if (cleanPath.startsWith('../')) {
      cleanPath = cleanPath.substring(3); // Remove '../'
    }
  }

  // Skip dynamic template variables in HTML templates
  if (cleanPath.includes('${') || cleanPath.includes('photoUrl')) {
    return { ok: true };
  }

  const resolved = path.resolve(WEB_DIR, cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath);
  if (fs.existsSync(resolved)) {
    return { ok: true, file: resolved };
  }
  
  return { ok: false, tried: resolved };
}

// Main Runner
async function runQA() {
  console.log('================================================================');
  console.log('🔍 HOMZO PUBLIC WEB A-TO-Z QA AUTOMATION SUITE (SMART PARSING)');
  console.log('================================================================');
  
  // 1. Scan for all HTML files
  const files = fs.readdirSync(WEB_DIR);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  console.log(`Found ${htmlFiles.length} HTML files to test in customer_web/.\n`);
  
  let totalIssues = 0;
  const reports = [];

  for (const htmlFile of htmlFiles) {
    if (htmlFile === 'color.html') {
      // Exclude utility color demo from core user pages QA
      continue;
    }

    const filePath = path.join(WEB_DIR, htmlFile);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Testing page: [${htmlFile}]`);
    const pageIssues = [];
    
    // Test 1.1: DOCTYPE and HTML layout structure
    if (!/<!DOCTYPE html>/i.test(content)) pageIssues.push('Missing <!DOCTYPE html>');
    if (!/<html/i.test(content)) pageIssues.push('Missing <html> tag');
    if (!/<head/i.test(content)) pageIssues.push('Missing <head> tag');
    if (!/<body/i.test(content)) pageIssues.push('Missing <body> tag');
    
    // Test 1.2: SEO Title
    const titleMatch = content.match(/<title>([^]*?)<\/title>/i);
    if (!titleMatch) {
      pageIssues.push('Missing <title> tag');
    } else if (!titleMatch[1].trim()) {
      pageIssues.push('Empty <title> tag');
    }
    
    // Test 1.3: SEO Meta Description
    const metaDescMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^]*?)["'][^>]*>/i) ||
                          content.match(/<meta[^>]*content=["']([^]*?)["'][^>]*name=["']description["'][^>]*>/i);
    if (!metaDescMatch) {
      pageIssues.push('Missing <meta name="description"> tag');
    } else if (!metaDescMatch[1].trim()) {
      pageIssues.push('Empty meta description content');
    }
    
    // Test 1.4: Single <h1> tag (SEO Best Practice)
    const h1Matches = content.match(/<h1[^>]*>[^]*?<\/h1>/gi) || [];
    if (h1Matches.length === 0) {
      pageIssues.push('SEO Warning: No <h1> tag found');
    } else if (h1Matches.length > 1) {
      pageIssues.push(`SEO Warning: Multiple <h1> tags found (${h1Matches.length} present)`);
    }
    
    // Test 1.5: Assets Integrity (CSS and JS exist)
    const cssMatches = content.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    for (const linkTag of cssMatches) {
      const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const res = resolveAssetPath(htmlFile, hrefMatch[1]);
        if (!res.ok) {
          pageIssues.push(`Broken CSS reference: "${hrefMatch[1]}" (Resolved path not found: ${res.tried})`);
        }
      }
    }
    
    const jsMatches = content.match(/<script[^>]*src=["']([^"']+)["'][^>]*>[^]*?<\/script>/gi) || [];
    for (const scriptTag of jsMatches) {
      const srcMatch = scriptTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const res = resolveAssetPath(htmlFile, srcMatch[1]);
        if (!res.ok) {
          pageIssues.push(`Broken JS reference: "${srcMatch[1]}" (Resolved path not found: ${res.tried})`);
        }
      }
    }
    
    // Test 1.6: Images Integrity (Verify source file exists)
    const imgMatches = content.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
    for (const imgTag of imgMatches) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const res = resolveAssetPath(htmlFile, srcMatch[1]);
        if (!res.ok) {
          pageIssues.push(`Broken Image reference: "${srcMatch[1]}" (Resolved path not found: ${res.tried})`);
        }
      }
    }

    // Test 1.7: Local Link Integrity (<a> tags checking)
    const aMatches = content.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    for (const aTag of aMatches) {
      const hrefMatch = aTag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const res = resolveAssetPath(htmlFile, hrefMatch[1]);
        if (!res.ok) {
          pageIssues.push(`Broken local page link: "${hrefMatch[1]}" (Resolved path not found: ${res.tried})`);
        }
      }
    }

    // Test 1.8: Unique interactive Element IDs
    const idMatches = content.match(/id=["']([^"']+)["']/g) || [];
    const idMap = {};
    for (const idAttr of idMatches) {
      const idMatch = idAttr.match(/id=["']([^"']+)["']/i);
      if (idMatch) {
        const elementId = idMatch[1];
        if (idMap[elementId]) {
          pageIssues.push(`Duplicate interactive ID found: "${elementId}"`);
        } else {
          idMap[elementId] = true;
        }
      }
    }
    
    // Output page status
    if (pageIssues.length === 0) {
      console.log('   ✅ PASS - No issues detected.');
    } else {
      console.log('   ❌ FAIL - Issues detected:');
      pageIssues.forEach(issue => {
        console.log(`      ↳ ${issue}`);
        totalIssues++;
      });
    }
    console.log('----------------------------------------------------------------');
    reports.push({ page: htmlFile, issues: pageIssues });
  }

  // 2. Perform Form API & Booking Workflow Verification (Direct API Integration testing)
  console.log('\n👤 Testing Suite 8: Dynamic Contact Form Integration (POST /api/inquiries)...');
  const inquiryPayload = JSON.stringify({
    name: 'QA Public Web Tester',
    email: 'qa@homzo.in',
    type: 'General Support',
    message: 'A-to-Z QA automation test payload for contact forms.'
  });
  
  const inquiryRes = await makeRequest(`${BASE_URL}/api/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(inquiryPayload)
    },
    body: inquiryPayload
  });
  
  if (inquiryRes.statusCode === 200 || inquiryRes.statusCode === 201) {
    console.log('   ✅ PASS - Contact inquiry endpoint accepted data successfully.');
  } else {
    console.log(`   ❌ FAIL - Contact inquiry endpoint failed with status ${inquiryRes.statusCode}: ${inquiryRes.data}`);
    totalIssues++;
  }

  console.log('\n📅 Testing Suite 9: Dynamic Guest Booking & Invoice Workflow (POST /api/guests)...');
  const bookingPayload = JSON.stringify({
    name: 'QA Public Web Guest',
    email: 'qa_guest@homzo.in',
    phone: '+91 99999 88888',
    guest_type: 'Student',
    property: 'Mumbai Premier Hotel 1',
    checkin: '2026-08-15',
    checkout: '2026-08-20',
    dob: '2000-01-01',
    persons: 2,
    notes: 'A-to-Z QA test reservation.',
    paymentStatus: 'Paid',
    paymentId: 'PAYID_QA_TEST_123',
    transactionRef: 'TXN_QA_TEST_123'
  });

  const bookingRes = await makeRequest(`${BASE_URL}/api/guests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bookingPayload)
    },
    body: bookingPayload
  });

  if (bookingRes.statusCode === 200 || bookingRes.statusCode === 201) {
    console.log('   ✅ PASS - Guest Booking endpoint processed and returned invoice.');
    try {
      const data = JSON.parse(bookingRes.data);
      console.log(`      ↳ Reservation created with Booking ID: BKG${1000 + data.id}`);
    } catch(e) {
      console.log('      ↳ Failed to parse reservation response JSON.');
      totalIssues++;
    }
  } else {
    console.log(`   ❌ FAIL - Guest Booking endpoint failed with status ${bookingRes.statusCode}: ${bookingRes.data}`);
    totalIssues++;
  }

  // 3. Print final report
  console.log('\n================================================================');
  console.log('🏁 QA AUTOMATION REPORT SUMMARY');
  console.log('================================================================');
  console.log(`Total Pages Inspected: ${htmlFiles.length - 1}`); // exclude color.html
  console.log(`Total Issues / Violations Found: ${totalIssues}`);
  console.log(`Final Status: ${totalIssues === 0 ? '🏆 PASSED' : '⚠️ FAILED'}`);
  console.log('================================================================\n');

  // Return exit code
  process.exit(totalIssues === 0 ? 0 : 1);
}

runQA();
