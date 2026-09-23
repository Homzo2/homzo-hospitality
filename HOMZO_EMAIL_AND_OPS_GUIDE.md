# 🏨 HOMZO Hospitality — Zoho Email & Operations Architecture

**Document Created:** 24 September 2026  
**Status:** Saved & Ready for Review  
**Domain:** `homzo.co.in`

---

## 📌 1. Overview
Zoho Mail provides **5 Free Core User Accounts** on the custom domain `@homzo.co.in`.  
This document outlines the optimal email distribution designed for:
1. **Solo Operations (Present):** Smoothly managing bookings, inquiries, marketing, and finances as a single founder.
2. **Team Scalability (Future):** Seamless delegation to departmental hires without changing public-facing email addresses or losing historical data.

---

## 📬 2. The 5 Core Accounts (Departmental Blueprint)

| # | Primary Account Email | Role / Department | Function & Scope |
|---|---|---|---|
| 1 | **`rishabh@homzo.co.in`** | **Founder / Executive Office** | • Official statutory registrations (GST, MSME, Banking)<br>• Confidential contracts, legal documents, executive decisions<br>• Master account for SaaS tools and platforms |
| 2 | **`bookings@homzo.co.in`** | **Front Desk & Reservations** | • Automated guest booking confirmations & invoices<br>• OTA channel integrations (MakeMyTrip, Agoda, Booking.com)<br>• Pre-arrival check-in info, WiFi/door codes, stay modifications |
| 3 | **`support@homzo.co.in`** | **Guest Care & Escalations** | • 24/7 guest support during stay (amenities, cleanliness, room service)<br>• Refund, cancellation, and customer escalation management<br>• Guest review responses and feedback collection |
| 4 | **`partner@homzo.co.in`** | **Property Acquisition & Supply** | • Hotel owner onboarding, franchise requests, and inventory lease proposals<br>• Direct communication channel for the Admin Partner Portal (`/partner`)<br>• Property verification and owner payouts queries |
| 5 | **`accounts@homzo.co.in`** | **Finance, Billing & Payouts** | • Payment gateway settlements (Razorpay, Stripe, UPI)<br>• Monthly/weekly partner revenue disbursement reports<br>• Vendor invoices (laundry, toiletries, maintenance, utilities) |

---

## 💡 3. Marketing & Expansion Strategy (Zero Extra Cost)

Because Zoho Mail limits the free tier to 5 primary mailboxes, marketing is managed via **Zoho Free Email Aliases**:

### Option A: The "Free Alias + Send As" Setup *(Recommended)*
* Create **`marketing@homzo.co.in`** as an **Alias** under **`rishabh@homzo.co.in`**.
* **How it works:**
  1. Any influencer, ad network (Meta Ads, Google Ads), PR agency, or travel blogger sending email to `marketing@homzo.co.in` will land in your main inbox.
  2. In Zoho Mail, configure the **"Send Mail As"** identity for `marketing@homzo.co.in`.
  3. You can reply directly with the display name **"HOMZO Marketing Team <marketing@homzo.co.in>"**.
* **Bonus Aliases to create:**
  * `growth@homzo.co.in` → routes to `rishabh@`
  * `info@homzo.co.in` / `contact@homzo.co.in` → routes to `support@`
  * `stay@homzo.co.in` → routes to `bookings@`
  * `billing@homzo.co.in` → routes to `accounts@`

### Option B: Dedicated Marketing Box *(If outsourcing immediately)*
If an external agency or marketing intern requires isolated inbox access:
1. `rishabh@homzo.co.in` (Founder + Finance/Accounts)
2. `bookings@homzo.co.in` (Reservations & OTAs)
3. `support@homzo.co.in` (Guest Care)
4. `partner@homzo.co.in` (Supply & Hotel Owners)
5. `marketing@homzo.co.in` (Dedicated marketing account)

---

## 🚀 4. Action Plan for Tomorrow
1. **Create the remaining 4 mailboxes in Zoho Admin Console:**
   * `bookings@homzo.co.in`
   * `support@homzo.co.in`
   * `partner@homzo.co.in`
   * `accounts@homzo.co.in`
2. **Add Email Aliases in Zoho:**
   * Add `marketing@homzo.co.in` under `rishabh@homzo.co.in`.
   * Add `info@homzo.co.in` under `support@homzo.co.in`.
3. **Configure DNS Records (if not already verified):**
   * MX Records (Zoho mail routing)
   * SPF Record (`v=spf1 include:zoho.in ~all`)
   * DKIM Record (prevents emails from going to spam)
   * DMARC Record
4. **Connect to HOMZO Backend:**
   * Update transactional sender address in `.env` / `server.js` if needed.
