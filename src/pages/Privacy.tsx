// src/pages/Privacy.tsx
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">← Back</Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-gray-600">Last updated: January 1, 2025</p>
        </header>

        {/* Table of contents */}
        <nav aria-label="Table of contents" className="mb-8 rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Table of contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-700">
            <li><a href="#overview" className="hover:underline">1) Overview</a></li>
            <li><a href="#information-we-collect" className="hover:underline">2) Information We Collect</a></li>
            <li><a href="#how-we-use-information" className="hover:underline">3) How We Use Information</a></li>
            <li><a href="#ai-processing" className="hover:underline">4) AI Processing & Third Parties</a></li>
            <li><a href="#data-sharing" className="hover:underline">5) Information Sharing</a></li>
            <li><a href="#data-security" className="hover:underline">6) Data Security</a></li>
            <li><a href="#data-retention" className="hover:underline">7) Data Retention</a></li>
            <li><a href="#your-rights" className="hover:underline">8) Your Rights & Choices</a></li>
            <li><a href="#childrens-privacy" className="hover:underline">9) Children's Privacy</a></li>
            <li><a href="#international-users" className="hover:underline">10) International Users</a></li>
            <li><a href="#california-privacy" className="hover:underline">11) California Privacy Rights</a></li>
            <li><a href="#changes-to-policy" className="hover:underline">12) Changes to This Policy</a></li>
            <li><a href="#contact" className="hover:underline">13) Contact Information</a></li>
          </ul>
        </nav>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 id="overview" className="text-lg font-semibold text-gray-900">1) Overview</h2>
            <p className="mt-2">This Privacy Policy explains how NeuraFit ("we," "us," or "our") collects, uses, shares, and protects your personal information when you use our AI-powered workout application and services ("Services"). We are committed to protecting your privacy and being transparent about our data practices.</p>
            <p className="mt-2">By using our Services, you consent to the collection and use of your information as described in this Privacy Policy.</p>
          </section>

          <section>
            <h2 id="information-we-collect" className="text-lg font-semibold text-gray-900">2) Information We Collect</h2>
            <p className="mt-2">We collect several types of information to provide and improve our Services:</p>

            <h3 className="mt-4 font-semibold text-gray-900">Account Information</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Email address and display name from your chosen authentication provider (Google)</li>
              <li>Profile picture (if provided by your authentication provider)</li>
              <li>Account creation and last login timestamps</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Fitness Profile Information</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Fitness experience level (beginner, intermediate, expert)</li>
              <li>Fitness goals (weight loss, muscle building, strength, etc.)</li>
              <li>Available equipment preferences</li>
              <li>Physical characteristics (height and weight ranges for personalization)</li>
              <li>Injury information and limitations (only what you choose to disclose)</li>
              <li>Gender (optional, for workout customization)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Workout and Usage Data</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Generated workout plans and exercise selections</li>
              <li>Workout completion status and progress tracking</li>
              <li>Exercise preferences and modifications</li>
              <li>App usage patterns and feature interactions</li>
              <li>Session duration and frequency of use</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Technical Information</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Device type, operating system, and app version</li>
              <li>IP address and approximate geographic location</li>
              <li>Browser type and language preferences</li>
              <li>Crash reports and error logs for app stability</li>
              <li>Performance metrics and analytics data</li>
            </ul>
          </section>

          <section>
            <h2 id="how-we-use-information" className="text-lg font-semibold text-gray-900">3) How We Use Your Information</h2>
            <p className="mt-2">We use your information for the following purposes:</p>

            <h3 className="mt-4 font-semibold text-gray-900">Core Service Delivery</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Generate personalized AI workout recommendations</li>
              <li>Customize exercise difficulty and progressions</li>
              <li>Provide safety recommendations based on disclosed injuries</li>
              <li>Save and sync your workout history across devices</li>
              <li>Enable account authentication and access control</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Service Improvement</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Analyze usage patterns to improve AI recommendations</li>
              <li>Identify and fix technical issues and bugs</li>
              <li>Develop new features and enhance user experience</li>
              <li>Conduct research to improve workout effectiveness</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Communication and Support</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Respond to your questions and support requests</li>
              <li>Send important service updates and security notifications</li>
              <li>Provide information about new features (with your consent)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Legal and Security</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Comply with legal obligations and law enforcement requests</li>
              <li>Protect against fraud, abuse, and security threats</li>
              <li>Enforce our Terms of Service and other policies</li>
            </ul>
          </section>

          <section>
            <h2 id="ai-processing" className="text-lg font-semibold text-gray-900">4) AI Processing and Third-Party Services</h2>
            <p className="mt-2">NeuraFit uses artificial intelligence to generate personalized workout recommendations. Here's how this works:</p>

            <h3 className="mt-4 font-semibold text-gray-900">AI Workout Generation</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Your fitness profile data is processed by AI models to create personalized workouts</li>
              <li>We use third-party AI services (such as OpenAI's GPT models) to generate workout content</li>
              <li>Only necessary information is sent to AI providers (fitness level, goals, equipment, injuries)</li>
              <li>Personal identifiers (name, email) are not included in AI processing requests</li>
              <li>AI providers may temporarily process your data but do not store it for their own purposes</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Third-Party Services</h3>
            <p className="mt-2">We work with trusted third-party providers for:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Authentication:</strong> Google Firebase for secure sign-in</li>
              <li><strong>Data Storage:</strong> Google Cloud Firestore for secure data storage</li>
              <li><strong>AI Processing:</strong> OpenAI and similar providers for workout generation</li>
              <li><strong>Analytics:</strong> Privacy-focused analytics to improve our service</li>
              <li><strong>Hosting:</strong> Secure cloud hosting providers</li>
            </ul>
            <p className="mt-2">All third-party providers are bound by strict data processing agreements and security requirements.</p>
          </section>

          <section>
            <h2 id="data-sharing" className="text-lg font-semibold text-gray-900">5) Information Sharing and Disclosure</h2>
            <p className="mt-2">We do not sell, rent, or trade your personal information. We may share your information only in the following limited circumstances:</p>

            <h3 className="mt-4 font-semibold text-gray-900">Service Providers</h3>
            <p className="mt-2">We share information with trusted third-party service providers who help us operate our Services, including cloud hosting, data storage, AI processing, and analytics providers. These providers are contractually bound to protect your information and use it only for the services they provide to us.</p>

            <h3 className="mt-4 font-semibold text-gray-900">Legal Requirements</h3>
            <p className="mt-2">We may disclose your information if required by law, court order, or government regulation, or if we believe disclosure is necessary to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Comply with legal processes or law enforcement requests</li>
              <li>Protect the rights, property, or safety of NeuraFit, our users, or the public</li>
              <li>Prevent fraud, abuse, or security threats</li>
              <li>Enforce our Terms of Service</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Business Transfers</h3>
            <p className="mt-2">In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity, subject to the same privacy protections outlined in this policy.</p>

            <h3 className="mt-4 font-semibold text-gray-900">Aggregated Data</h3>
            <p className="mt-2">We may share aggregated, anonymized data that cannot identify individual users for research, analytics, or business purposes.</p>
          </section>

          <section>
            <h2 id="data-security" className="text-lg font-semibold text-gray-900">6) Data Security</h2>
            <p className="mt-2">We implement comprehensive security measures to protect your personal information:</p>

            <h3 className="mt-4 font-semibold text-gray-900">Technical Safeguards</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Encryption of data in transit and at rest using industry-standard protocols</li>
              <li>Secure authentication through trusted providers (Google Firebase)</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and monitoring systems</li>
              <li>Secure cloud infrastructure with enterprise-grade security</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Organizational Safeguards</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Limited access to personal data on a need-to-know basis</li>
              <li>Employee training on data protection and privacy practices</li>
              <li>Incident response procedures for potential security breaches</li>
              <li>Regular review and updates of security policies</li>
            </ul>

            <p className="mt-2">While we implement strong security measures, no system is completely secure. You can help protect your account by using a strong password and keeping your login credentials confidential.</p>
          </section>

          <section>
            <h2 id="data-retention" className="text-lg font-semibold text-gray-900">7) Data Retention</h2>
            <p className="mt-2">We retain your personal information for as long as necessary to provide our Services and fulfill the purposes outlined in this Privacy Policy. Specific retention periods include:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Retained until you delete your account</li>
              <li><strong>Fitness Profile:</strong> Retained to provide personalized recommendations</li>
              <li><strong>Workout History:</strong> Retained to track your progress and improve recommendations</li>
              <li><strong>Technical Data:</strong> Typically retained for 12-24 months for analytics and debugging</li>
              <li><strong>Support Communications:</strong> Retained for 3 years for quality assurance</li>
            </ul>
            <p className="mt-2">When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal compliance.</p>
          </section>

          <section>
            <h2 id="your-rights" className="text-lg font-semibold text-gray-900">8) Your Rights and Choices</h2>
            <p className="mt-2">You have several rights regarding your personal information:</p>

            <h3 className="mt-4 font-semibold text-gray-900">Access and Control</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> View and update your profile information within the app</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-900">Communication Preferences</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Opt out of promotional communications (service notifications will continue)</li>
              <li>Control push notification settings through your device</li>
            </ul>

            <p className="mt-2">To exercise these rights, contact us at support@neurafit.app. We will respond to your request within 30 days.</p>
          </section>

          <section>
            <h2 id="childrens-privacy" className="text-lg font-semibold text-gray-900">9) Children's Privacy</h2>
            <p className="mt-2">Our Services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately so we can delete such information.</p>
            <p className="mt-2">If you are between 13 and 18 years old, you may only use our Services with the involvement and consent of a parent or guardian.</p>
          </section>

          <section>
            <h2 id="international-users" className="text-lg font-semibold text-gray-900">10) International Data Transfers</h2>
            <p className="mt-2">Your information may be transferred to and processed in countries other than your own, including the United States, where our servers and service providers are located. These countries may have different data protection laws than your country.</p>
            <p className="mt-2">We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards, including:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Standard contractual clauses approved by relevant authorities</li>
              <li>Adequacy decisions by regulatory bodies</li>
              <li>Certification schemes and codes of conduct</li>
            </ul>
          </section>

          <section>
            <h2 id="california-privacy" className="text-lg font-semibold text-gray-900">11) California Privacy Rights (CCPA)</h2>
            <p className="mt-2">If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Right to Know:</strong> Request information about the personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> We do not sell personal information, so no opt-out is necessary</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at support@neurafit.app with "California Privacy Request" in the subject line.</p>
          </section>

          <section>
            <h2 id="changes-to-policy" className="text-lg font-semibold text-gray-900">12) Changes to This Privacy Policy</h2>
            <p className="mt-2">We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Posting the updated policy in our app with a new "Last Updated" date</li>
              <li>Sending you an email notification (for significant changes)</li>
              <li>Providing an in-app notification when you next use our Services</li>
            </ul>
            <p className="mt-2">Your continued use of our Services after the effective date of changes constitutes acceptance of the updated Privacy Policy.</p>
          </section>

          <section>
            <h2 id="contact" className="text-lg font-semibold text-gray-900">13) Contact Information</h2>
            <p className="mt-2">If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>General Privacy Inquiries:</strong> support@neurafit.app</li>
              <li><strong>Data Protection Officer:</strong> privacy@neurafit.app</li>
              <li><strong>California Privacy Requests:</strong> Use subject line "California Privacy Request"</li>
              <li><strong>GDPR Requests:</strong> Use subject line "GDPR Data Request"</li>
            </ul>
            <p className="mt-2">We will respond to your inquiry within 30 days (or sooner as required by applicable law). For formal legal notices regarding privacy matters, please contact us at legal@neurafit.app.</p>
          </section>

          <footer className="pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              See also our <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</Link> for information about your responsibilities when using NeuraFit.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}