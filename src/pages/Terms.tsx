// src/pages/Terms.tsx
import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">← Back</Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </header>
        {/* Table of contents (draft pending counsel review) */}
        <nav aria-label="Table of contents" className="mb-8 rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Table of contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-700">
            <li><a href="#acceptance-of-terms" className="hover:underline">1) Acceptance of Terms</a></li>
            <li><a href="#not-medical-advice" className="hover:underline">2) Not Medical Advice</a></li>
            <li><a href="#ai-limitations" className="hover:underline">3) AI Limitations</a></li>
            <li><a href="#eligibility-and-accounts" className="hover:underline">4) Eligibility & Accounts</a></li>
            <li><a href="#user-responsibilities-and-safety" className="hover:underline">5) User Responsibilities & Safety</a></li>
            <li><a href="#acceptable-use" className="hover:underline">6) Acceptable Use</a></li>
            <li><a href="#intellectual-property" className="hover:underline">7) Intellectual Property</a></li>
            <li><a href="#privacy" className="hover:underline">8) Privacy</a></li>
            <li><a href="#disclaimers" className="hover:underline">9) Disclaimers</a></li>
            <li><a href="#limitation-of-liability" className="hover:underline">10) Limitation of Liability</a></li>
            <li><a href="#indemnification" className="hover:underline">11) Indemnification</a></li>
            <li><a href="#modifications" className="hover:underline">12) Modifications</a></li>
            <li><a href="#governing-law" className="hover:underline">13) Governing Law</a></li>
            <li><a href="#subscriptions-billing" className="hover:underline">14) Subscriptions & Billing</a></li>
            <li><a href="#arbitration" className="hover:underline">15) Dispute Resolution & Arbitration</a></li>
            <li><a href="#contact" className="hover:underline">16) Contact</a></li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">Draft — pending counsel review. Some clauses include placeholders to be finalized.</p>
        </nav>


        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 id="acceptance-of-terms" className="text-lg font-semibold text-gray-900">1) Acceptance of Terms</h2>
            <p className="mt-2">These Terms of Service ("Terms") govern your access to and use of the NeuraFit application and services ("Services"). By creating an account, signing in, or using the Services, you agree to be bound by these Terms.</p>
          </section>

          <section>
            <h2 id="not-medical-advice" className="text-lg font-semibold text-gray-900">2) Not Medical Advice</h2>
            <p className="mt-2">NeuraFit provides AI-assisted workout content for informational purposes only. The Services do not provide medical, health, or nutritional advice. Always consult a physician or qualified health professional before starting any fitness program, especially if you have medical conditions, past injuries, or concerns. If you experience pain, dizziness, shortness of breath, or other adverse symptoms, stop immediately and seek medical attention.</p>
          </section>

          <section>
            <h2 id="ai-limitations" className="text-lg font-semibold text-gray-900">3) AI Limitations</h2>
            <p className="mt-2">Our AI generates workouts based on the inputs you provide. The AI may be inaccurate, incomplete, or not fully context-aware. You remain responsible for evaluating suitability, selecting appropriate exercises, loads, and progressions, and using proper form and safety precautions. Do not rely on the AI as a substitute for professional coaching or supervision.</p>
          </section>

          <section>
            <h2 id="eligibility-and-accounts" className="text-lg font-semibold text-gray-900">4) Eligibility & Accounts</h2>
            <p className="mt-2">You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the Services. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to provide accurate, complete information and to keep it updated.</p>
          </section>

          <section>
            <h2 id="user-responsibilities-and-safety" className="text-lg font-semibold text-gray-900">5) User Responsibilities & Safety</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Warm up appropriately and use safe form and equipment.</li>
              <li>Choose loads and intensities within your capabilities.</li>
              <li>Modify or skip exercises that feel unsafe or inappropriate.</li>
              <li>Comply with all applicable laws, gym policies, and safety guidelines.</li>
            </ul>
          </section>

          <section>
            <h2 id="acceptable-use" className="text-lg font-semibold text-gray-900">6) Acceptable Use</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>No misuse, reverse engineering, scraping, or automated abuse of the Services.</li>
              <li>No uploading of harmful content, malware, or illegal material.</li>
              <li>No harassment, hate speech, or infringement of others’ rights.</li>
            </ul>
          </section>

          <section>
            <h2 id="intellectual-property" className="text-lg font-semibold text-gray-900">7) Intellectual Property</h2>
            <p className="mt-2">NeuraFit and its licensors own all rights in the Services, including text, graphics, logos, and software. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to use the Services for personal, non-commercial purposes.</p>
          </section>

          <section>
            <h2 id="privacy" className="text-lg font-semibold text-gray-900">8) Privacy</h2>
            <p className="mt-2">Your use of the Services is also governed by our <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>. By using the Services, you consent to our data practices described there.</p>
          </section>



          <section>
            <h2 id="disclaimers" className="text-lg font-semibold text-gray-900">9) Disclaimers</h2>
            <p className="mt-2">THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE ACCURATE, RELIABLE, ERROR-FREE, OR SAFE.</p>
          </section>

          <section>
            <h2 id="limitation-of-liability" className="text-lg font-semibold text-gray-900">10) Limitation of Liability</h2>
            <p className="mt-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEURAFIT AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS YOU PAID (IF ANY) FOR ACCESS TO THE SERVICES IN THE 12 MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY.</p>
          </section>

          <section>
            <h2 id="indemnification" className="text-lg font-semibold text-gray-900">11) Indemnification</h2>
            <p className="mt-2">You agree to indemnify and hold NeuraFit harmless from any claims, losses, liabilities, and expenses (including reasonable attorneys’ fees) arising from your use of the Services or violation of these Terms.</p>
          </section>

          <section>
            <h2 id="modifications" className="text-lg font-semibold text-gray-900">12) Modifications</h2>
            <p className="mt-2">We may update these Terms from time to time. Material changes will be effective upon posting or as otherwise indicated. Your continued use of the Services after changes become effective constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 id="governing-law" className="text-lg font-semibold text-gray-900">13) Governing Law</h2>
            <p className="mt-2">Subject to counsel review, these Terms will be governed by the laws of the State of California, U.S.A., without regard to conflict-of-law principles. Exclusive jurisdiction and venue shall lie in the state or federal courts located in San Francisco County, California, except as otherwise provided in the Arbitration section or where prohibited by law.</p>
          </section>

          <section>
            <h2 id="subscriptions-billing" className="text-lg font-semibold text-gray-900">14) Subscriptions & Billing</h2>
            <p className="mt-2">Some features may be offered on a paid, subscription basis. By starting a subscription, you authorize recurring charges until you cancel. Auto-renewal occurs at the then-current price unless you cancel before the renewal date. Trials convert to paid unless canceled prior to the end of the trial. Refunds are handled in accordance with platform policies (e.g., <span className="italic">App Store</span> / <span className="italic">Google Play</span>) and applicable law. Taxes may apply. Specific pricing, renewal periods, cancellation methods, and refund terms will be presented at purchase and are subject to counsel review.</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Cancellation: You may cancel at any time; access continues through the end of the current billing period.</li>
              <li>Price changes: We may change prices with advance notice; changes apply at your next renewal.</li>
              <li>Third-party storefronts: If purchased via a mobile app store, billing is managed by that storefront.</li>
            </ul>
          </section>

          <section>
            <h2 id="arbitration" className="text-lg font-semibold text-gray-900">15) Dispute Resolution & Arbitration; Class Action Waiver</h2>
            <p className="mt-2">To the fullest extent permitted by law, you and NeuraFit agree to resolve disputes through binding, individual arbitration administered by a reputable arbitration provider (e.g., AAA or JAMS) under its rules. The seat and venue of arbitration will be <span className="italic">[to be designated by counsel]</span>. You may opt out within <span className="italic">[30]</span> days of first acceptance by emailing support@neurafit.app with subject "Arbitration Opt-Out." Class actions and collective proceedings are not permitted. This section is a draft and subject to counsel review and jurisdiction-specific requirements.</p>
          </section>


          <section>
            <h2 id="contact" className="text-lg font-semibold text-gray-900">16) Contact</h2>
            <p className="mt-2">Questions about these Terms? Contact us at support@neurafit.app.</p>
          </section>
        </div>
      </div>
    </div>
  )
}

