// src/pages/Terms.tsx
import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">← Back</Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-gray-600">Last updated: January 1, 2025</p>
        </header>

        {/* Table of contents */}
        <nav aria-label="Table of contents" className="mb-8 rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Table of contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-700">
            <li><a href="#acceptance-of-terms" className="hover:underline">1) Acceptance of Terms</a></li>
            <li><a href="#not-medical-advice" className="hover:underline">2) Not Medical Advice</a></li>
            <li><a href="#ai-limitations" className="hover:underline">3) AI Technology & Limitations</a></li>
            <li><a href="#eligibility-and-accounts" className="hover:underline">4) Eligibility & Accounts</a></li>
            <li><a href="#user-responsibilities-and-safety" className="hover:underline">5) User Responsibilities & Safety</a></li>
            <li><a href="#acceptable-use" className="hover:underline">6) Acceptable Use Policy</a></li>
            <li><a href="#intellectual-property" className="hover:underline">7) Intellectual Property</a></li>
            <li><a href="#privacy" className="hover:underline">8) Privacy & Data Protection</a></li>
            <li><a href="#disclaimers" className="hover:underline">9) Disclaimers</a></li>
            <li><a href="#limitation-of-liability" className="hover:underline">10) Limitation of Liability</a></li>
            <li><a href="#indemnification" className="hover:underline">11) Indemnification</a></li>
            <li><a href="#modifications" className="hover:underline">12) Modifications</a></li>
            <li><a href="#governing-law" className="hover:underline">13) Governing Law</a></li>
            <li><a href="#subscriptions-billing" className="hover:underline">14) Subscriptions & Billing</a></li>
            <li><a href="#termination" className="hover:underline">15) Account Termination</a></li>
            <li><a href="#arbitration" className="hover:underline">16) Dispute Resolution</a></li>
            <li><a href="#contact" className="hover:underline">17) Contact Information</a></li>
          </ul>
        </nav>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 id="acceptance-of-terms" className="text-lg font-semibold text-gray-900">1) Acceptance of Terms</h2>
            <p className="mt-2">These Terms of Service ("Terms") govern your access to and use of the NeuraFit application and services ("Services"). By creating an account, signing in, or using the Services, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Services.</p>
          </section>

          <section>
            <h2 id="not-medical-advice" className="text-lg font-semibold text-gray-900">2) Not Medical Advice</h2>
            <p className="mt-2"><strong>IMPORTANT:</strong> NeuraFit provides AI-generated workout content for informational and educational purposes only. The Services do not provide medical, health, fitness, or nutritional advice. Our AI-generated workouts are not a substitute for professional medical advice, diagnosis, or treatment.</p>
            <p className="mt-2">Always consult with a physician, certified personal trainer, or other qualified health professional before starting any fitness program, especially if you:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Have any medical conditions, injuries, or physical limitations</li>
              <li>Are pregnant or nursing</li>
              <li>Are taking medications that may affect your ability to exercise</li>
              <li>Have not exercised regularly in the past six months</li>
              <li>Are over 35 years old and beginning a new exercise program</li>
            </ul>
            <p className="mt-2">If you experience pain, dizziness, shortness of breath, chest pain, or other adverse symptoms during exercise, stop immediately and seek medical attention.</p>
          </section>

          <section>
            <h2 id="ai-limitations" className="text-lg font-semibold text-gray-900">3) AI Technology and Limitations</h2>
            <p className="mt-2">NeuraFit uses artificial intelligence to generate personalized workout recommendations based on the information you provide. You acknowledge and understand that:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>AI-generated content may be inaccurate, incomplete, or inappropriate for your specific circumstances</li>
              <li>The AI cannot assess your real-time physical condition, form, or safety</li>
              <li>AI recommendations are based solely on the data you input and may not account for all relevant factors</li>
              <li>The AI is not a substitute for professional coaching, supervision, or medical guidance</li>
              <li>You are solely responsible for evaluating the suitability and safety of any recommended exercises</li>
            </ul>
            <p className="mt-2">You agree to use your own judgment and consult with qualified professionals when determining whether to follow AI-generated recommendations.</p>
          </section>

          <section>
            <h2 id="eligibility-and-accounts" className="text-lg font-semibold text-gray-900">4) Eligibility & Account Requirements</h2>
            <p className="mt-2">You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the Services. If you are under 18, you represent that you have your parent's or guardian's permission to use the Services.</p>
            <p className="mt-2">You are responsible for:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality and security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate, complete, and current information</li>
              <li>Promptly updating your information when it changes</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 id="user-responsibilities-and-safety" className="text-lg font-semibold text-gray-900">5) User Responsibilities & Safety</h2>
            <p className="mt-2">By using the Services, you agree to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Exercise at your own risk and within your physical capabilities</li>
              <li>Perform proper warm-up and cool-down routines</li>
              <li>Use appropriate form, technique, and safety precautions</li>
              <li>Use properly maintained equipment and exercise in safe environments</li>
              <li>Choose weights, intensities, and progressions appropriate for your fitness level</li>
              <li>Modify, skip, or stop any exercise that feels unsafe or causes discomfort</li>
              <li>Stay hydrated and take appropriate rest periods</li>
              <li>Comply with all applicable laws, gym policies, and facility guidelines</li>
              <li>Provide accurate information about your fitness level, injuries, and limitations</li>
            </ul>
            <p className="mt-2"><strong>You acknowledge that physical exercise involves inherent risks of injury, and you voluntarily assume all such risks.</strong></p>
          </section>

          <section>
            <h2 id="acceptable-use" className="text-lg font-semibold text-gray-900">6) Acceptable Use Policy</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Use the Services for any unlawful purpose or in violation of these Terms</li>
              <li>Reverse engineer, decompile, or attempt to extract source code from the Services</li>
              <li>Use automated systems (bots, scrapers) to access or abuse the Services</li>
              <li>Upload, transmit, or distribute harmful content, malware, or viruses</li>
              <li>Engage in harassment, hate speech, or discrimination</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Use the Services to compete with or create derivative products</li>
              <li>Share your account credentials with others</li>
            </ul>
          </section>

          <section>
            <h2 id="intellectual-property" className="text-lg font-semibold text-gray-900">7) Intellectual Property Rights</h2>
            <p className="mt-2">The Services, including all content, features, functionality, software, text, graphics, logos, images, and trademarks, are owned by NeuraFit or its licensors and are protected by copyright, trademark, and other intellectual property laws.</p>
            <p className="mt-2">Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services solely for your personal, non-commercial purposes. This license does not include any right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Resell, redistribute, or commercially exploit the Services</li>
              <li>Modify, adapt, or create derivative works</li>
              <li>Remove or alter any proprietary notices</li>
              <li>Use our trademarks or branding without permission</li>
            </ul>
          </section>

          <section>
            <h2 id="privacy" className="text-lg font-semibold text-gray-900">8) Privacy and Data Protection</h2>
            <p className="mt-2">Your privacy is important to us. Your use of the Services is governed by our <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>, which explains how we collect, use, and protect your information. By using the Services, you consent to our data practices as described in the Privacy Policy.</p>
          </section>

          <section>
            <h2 id="disclaimers" className="text-lg font-semibold text-gray-900">9) Disclaimers</h2>
            <p className="mt-2">THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE ACCURATE, RELIABLE, ERROR-FREE, UNINTERRUPTED, OR SAFE.</p>
            <p className="mt-2">WE SPECIFICALLY DISCLAIM ANY WARRANTIES REGARDING THE SAFETY, EFFECTIVENESS, OR SUITABILITY OF AI-GENERATED WORKOUT RECOMMENDATIONS FOR YOUR PARTICULAR CIRCUMSTANCES.</p>
          </section>

          <section>
            <h2 id="limitation-of-liability" className="text-lg font-semibold text-gray-900">10) Limitation of Liability</h2>
            <p className="mt-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEURAFIT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO PERSONAL INJURY, PROPERTY DAMAGE, LOST PROFITS, OR DATA LOSS, ARISING FROM YOUR USE OF THE SERVICES.</p>
            <p className="mt-2">OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICES SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.</p>
          </section>

          <section>
            <h2 id="indemnification" className="text-lg font-semibold text-gray-900">11) Indemnification</h2>
            <p className="mt-2">You agree to indemnify, defend, and hold harmless NeuraFit, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from or relating to your use of the Services, violation of these Terms, or infringement of any rights of another.</p>
          </section>

          <section>
            <h2 id="modifications" className="text-lg font-semibold text-gray-900">12) Modifications to Terms</h2>
            <p className="mt-2">We may update these Terms from time to time to reflect changes in our Services, legal requirements, or business practices. We will notify you of material changes by posting the updated Terms in the app or by other reasonable means. Your continued use of the Services after changes become effective constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 id="governing-law" className="text-lg font-semibold text-gray-900">13) Governing Law and Jurisdiction</h2>
            <p className="mt-2">These Terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles. Any disputes arising from these Terms or the Services shall be subject to the exclusive jurisdiction of the state and federal courts located in San Francisco County, California, except as provided in the arbitration clause below.</p>
          </section>

          <section>
            <h2 id="subscriptions-billing" className="text-lg font-semibold text-gray-900">14) Subscriptions and Billing</h2>
            <p className="mt-2">Some features may be offered on a paid subscription basis. By purchasing a subscription, you authorize us to charge your payment method on a recurring basis until you cancel. Key terms include:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Auto-renewal:</strong> Subscriptions automatically renew at the current price unless canceled before the renewal date</li>
              <li><strong>Cancellation:</strong> You may cancel at any time; access continues through the end of the current billing period</li>
              <li><strong>Refunds:</strong> Handled according to platform policies (App Store/Google Play) and applicable law</li>
              <li><strong>Price changes:</strong> We may change prices with advance notice; changes apply at your next renewal</li>
              <li><strong>Taxes:</strong> Additional taxes may apply based on your location</li>
            </ul>
          </section>

          <section>
            <h2 id="termination" className="text-lg font-semibold text-gray-900">15) Account Termination</h2>
            <p className="mt-2">You may terminate your account at any time by contacting us or using the account deletion feature in the app. Upon termination:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Your access to the Services will be immediately suspended</li>
              <li>Your personal data will be deleted within 30 days (except as required for legal compliance)</li>
              <li>Any active subscriptions will be canceled according to the platform's refund policy</li>
              <li>These Terms will remain in effect for any claims or disputes that arose before termination</li>
            </ul>
            <p className="mt-2">We may suspend or terminate your account if you violate these Terms, engage in harmful behavior, or for other legitimate business reasons. We will provide reasonable notice when possible.</p>
          </section>

          <section>
            <h2 id="arbitration" className="text-lg font-semibold text-gray-900">16) Dispute Resolution and Arbitration</h2>
            <p className="mt-2">Most disputes can be resolved informally by contacting us at support@neurafit.app. For disputes that cannot be resolved informally, you and NeuraFit agree to resolve them through binding arbitration rather than in court, except for small claims court matters and injunctive relief.</p>
            <p className="mt-2"><strong>Class Action Waiver:</strong> You and NeuraFit agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.</p>
          </section>

          <section>
            <h2 id="contact" className="text-lg font-semibold text-gray-900">17) Contact Information</h2>
            <p className="mt-2">If you have questions about these Terms or need to contact us for any reason, please reach out to us:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Email:</strong> support@neurafit.app</li>
              <li><strong>Legal Inquiries:</strong> legal@neurafit.app</li>
              <li><strong>Response Time:</strong> We typically respond within 48 hours</li>
            </ul>
            <p className="mt-2">For formal legal notices, please send correspondence to our registered address, which can be obtained by contacting us at the email addresses above.</p>
          </section>

          <footer className="pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              See also our <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link> for information about how we handle your data.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
