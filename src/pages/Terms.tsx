import { FileText, UserCheck, Shield, AlertTriangle, Ban, Scale, RefreshCw, Mail, Gavel, Users, Lock, BookOpen, Globe, AlertCircle, ShieldCheck, FileWarning, DollarSign, Building, UserX } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Terms of Service
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Terms & <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Conditions</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Please read these terms carefully before using FoundersYard
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last Updated: December 13, 2025
            </p>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. Acceptance of Terms */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  By accessing or using FoundersYard ("the Platform"), you agree to comply with these Terms & Conditions ("Terms").
                  If you do not agree, do not use the Platform.
                </p>
                <p>
                  We may update these Terms at any time. Continued use constitutes acceptance of the updated Terms.
                </p>
              </div>
            </div>

            {/* 2. Eligibility & Account Registration */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold">2. Eligibility & Account Registration</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>To use FoundersYard, you must:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Be at least 18 years of age</li>
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Not share your account with others</li>
                  <li>Not create multiple or false accounts</li>
                  <li>Not use VPNs or deceptive tools to evade restrictions</li>
                </ul>
                <p className="mt-4 font-medium">
                  You are solely responsible for all activities under your account.
                </p>
              </div>
            </div>

            {/* 3. User Content & Ownership */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">3. User Content & Ownership</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>You retain ownership of the content you create. By posting content, you grant FoundersYard a worldwide, non-exclusive, royalty-free license to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Display</li>
                  <li>Store</li>
                  <li>Distribute</li>
                  <li>Reproduce</li>
                  <li>Modify (for formatting only)</li>
                </ul>
                <p className="mt-4">
                  We may remove or restrict content that violates these Terms. FoundersYard does not own or endorse user-generated content.
                </p>
              </div>
            </div>

            {/* 4. Community Guidelines */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">4. Community Guidelines</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>All users must:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Communicate respectfully and professionally</li>
                  <li>Post original, valuable content relevant to founders</li>
                  <li>Avoid harassment, hate speech, or personal attacks</li>
                  <li>Respect intellectual property rights</li>
                  <li>Avoid leaking confidential or private information</li>
                  <li>Refrain from political, NSFW, or harmful content</li>
                </ul>
                <p className="mt-4 font-medium">
                  Violations may result in strikes or account suspension.
                </p>
              </div>
            </div>

            {/* 5. Prohibited Conduct */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-destructive/10">
                  <Ban className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-xl font-bold">5. Prohibited Conduct</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Users may not:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Post defamatory, false, misleading, or harmful content</li>
                  <li>Post NSFW, political, violent, or discriminatory material</li>
                  <li>Impersonate individuals or create fake identities</li>
                  <li>Spam, promote scams, or engage in fraudulent behavior</li>
                  <li>Scrape, harvest, or mine data</li>
                  <li>Upload malware or harmful code</li>
                  <li>Circumvent moderation or security systems</li>
                  <li>Post another company's confidential or internal data</li>
                  <li>Engage in financial solicitation or unverified fundraising</li>
                </ul>
                <p className="mt-4 font-medium text-destructive">
                  Any such behavior may result in immediate termination.
                </p>
              </div>
            </div>

            {/* 6. Strike System & Account Termination */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-purple-500/10">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold">6. Strike System & Account Termination</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>FoundersYard uses a Community Compliance Strike System (CCSS):</p>
                <div className="space-y-3 ml-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="font-semibold text-amber-600">Strike 1 — Warning</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      <li>Content removed</li>
                      <li>User notified</li>
                      <li>Monitoring increased</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <p className="font-semibold text-orange-600">Strike 2 — 7-Day Suspension</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      <li>Full login lockout</li>
                      <li>Posting disabled</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <p className="font-semibold text-destructive">Strike 3 — Permanent Ban</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      <li>Account permanently disabled</li>
                      <li>Device fingerprint + IP flagged</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-4">
                  We reserve the right to terminate accounts without prior warning in severe cases.
                </p>
              </div>
            </div>

            {/* 7. Platform Disclaimer */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold">7. Platform Disclaimer</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>FoundersYard is provided "as is" without warranties, including but not limited to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Accuracy of user-generated content</li>
                  <li>Reliability of business advice</li>
                  <li>Safety of interactions</li>
                  <li>Outcome of professional or hiring relationships</li>
                </ul>
                <p className="mt-4">We do not guarantee:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>That content is correct, complete, or trustworthy</li>
                  <li>That users are who they claim to be</li>
                  <li>That business or hiring interactions will be successful</li>
                  <li>That any investment, revenue, or financial claims are accurate</li>
                </ul>
              </div>
            </div>

            {/* 8. No Professional, Legal, or Financial Advice */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-red-500/10">
                  <Gavel className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">8. No Professional, Legal, or Financial Advice</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Content on FoundersYard may include:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Startup strategies</li>
                  <li>Funding discussions</li>
                  <li>Legal or tax insights</li>
                  <li>Hiring advice</li>
                  <li>Product recommendations</li>
                </ul>
                <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="font-semibold text-destructive">
                    NOTHING on FoundersYard constitutes professional, legal, investment, financial, or business advice.
                  </p>
                  <p className="mt-2 text-sm">
                    Users should consult qualified professionals before acting on any information.
                    FoundersYard is not liable for losses or damages resulting from actions taken based on platform content.
                  </p>
                </div>
              </div>
            </div>

            {/* 9. User Interactions & Third-Party Disputes */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-500/10">
                  <UserX className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold">9. No Liability for User Interactions</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>FoundersYard will not be responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Disputes between founders</li>
                  <li>Disputes between employers/employees</li>
                  <li>Co-founder conflicts</li>
                  <li>Contract disagreements</li>
                  <li>Hiring or firing decisions</li>
                  <li>Investor or partnership discussions</li>
                  <li>Fraudulent claims made by users</li>
                  <li>Offline or online meetings between users</li>
                </ul>
                <p className="mt-4 font-medium">
                  Users agree that FoundersYard has zero responsibility for the outcome of interactions formed through the platform. Users engage with others at their own risk.
                </p>
              </div>
            </div>

            {/* 10. Defamation, IP, Confidentiality */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-pink-500/10">
                  <Lock className="w-6 h-6 text-pink-600" />
                </div>
                <h2 className="text-xl font-bold">10. Defamation, IP, Confidentiality & Sensitive Content</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Users must not post:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Defaming statements about individuals or companies</li>
                  <li>Copyrighted material without permission</li>
                  <li>Private or confidential internal documents</li>
                  <li>Leaked funding, salary, or performance data</li>
                  <li>Sensitive founder/company information</li>
                </ul>
                <p className="mt-4">
                  FoundersYard is not responsible for such posts but may remove them upon notice.
                </p>
              </div>
            </div>

            {/* 11. Prohibited Content Disclaimer */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-slate-500/10">
                  <FileWarning className="w-6 h-6 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold">11. Prohibited Content Disclaimer (Safe Harbor)</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Users may not post:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Defamatory statements</li>
                  <li>False accusations</li>
                  <li>Unverified financial data</li>
                  <li>Private company information</li>
                  <li>Trade secrets</li>
                  <li>Copyrighted material without permission</li>
                  <li>Explicit or political content</li>
                  <li>Harmful or illegal material</li>
                </ul>
                <div className="mt-4 p-4 rounded-xl bg-muted border border-border">
                  <p className="font-semibold">
                    FoundersYard does not pre-screen content and is not liable for any defamatory, illegal, infringing, misleading, harmful, abusive, or inappropriate content posted by users. Responsibility lies solely with the individual who posted it.
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    This protects FoundersYard under Safe Harbor Laws.
                  </p>
                </div>
              </div>
            </div>

            {/* 12. Indemnification */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-teal-500/10">
                  <ShieldCheck className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold">12. Indemnification (Legal Shield)</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="font-semibold text-foreground">
                    Users agree to indemnify, defend, and hold harmless FoundersYard, its founders, employees, contractors, and affiliates from any claims, damages, liabilities, losses, or legal fees arising from:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                    <li>Their use of the platform</li>
                    <li>Their posted content</li>
                    <li>Their violation of these Terms</li>
                    <li>Disputes with other users</li>
                    <li>Any harm caused to third parties</li>
                  </ul>
                </div>
                <p className="mt-4 text-sm">
                  This clause protects FoundersYard from lawsuits arising from user actions.
                </p>
              </div>
            </div>

            {/* 13. Content Moderation Rights */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-cyan-500/10">
                  <AlertCircle className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold">13. Content Moderation Rights</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We reserve the right to remove, hide, or restrict any content, or suspend accounts at our sole discretion, even without explanation, if we believe such action is necessary to maintain community safety or compliance with law.
                </p>
                <p className="font-medium">
                  Moderation decisions are final.
                </p>
              </div>
            </div>

            {/* 14. Platform Not Liable for Business Outcomes */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-yellow-500/10">
                  <Building className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold">14. Platform Not Liable for Business Outcomes</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  FoundersYard does not verify the authenticity or accuracy of business claims, revenue numbers, fundraising updates, hiring notices, or user-reported achievements.
                </p>
                <p>
                  Users acknowledge that such statements may be incomplete, outdated, inaccurate, or misleading.
                </p>
                <p className="font-medium">
                  FoundersYard is not responsible for any losses arising from reliance on such information.
                </p>
              </div>
            </div>

            {/* 15. Data & Privacy */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-violet-500/10">
                  <BookOpen className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-bold">15. Data & Privacy</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  All data is handled according to our Privacy Policy. Users agree to our data usage and storage policies by using the Platform.
                </p>
              </div>
            </div>

            {/* 16. DMCA & IP Safe Harbor */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-rose-500/10">
                  <FileText className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold">16. DMCA & IP Violation Safe Harbor</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  If you believe content on FoundersYard infringes intellectual property rights, please submit a takedown request. We comply with DMCA-style removal procedures.
                </p>
              </div>
            </div>

            {/* 17. Limitation of Liability */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-green-500/10">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">17. Limitation of Liability</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>To the maximum extent permitted by law:</p>
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="font-semibold">
                    FoundersYard's total liability shall not exceed ₹1,000 or the amount paid by the user in the last 12 months, whichever is lower.
                  </p>
                </div>
                <p className="mt-4">
                  No claims for indirect, incidental, or punitive damages are allowed.
                </p>
              </div>
            </div>

            {/* 18. Governing Law & Jurisdiction */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">18. Governing Law & Jurisdiction</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  These Terms are governed by the laws of India. All disputes shall be resolved exclusively in the courts of Uttar Pradesh, India.
                </p>
                <p>
                  This prevents foreign lawsuits and ensures local jurisdiction.
                </p>
              </div>
            </div>

            {/* 19. Right to Access Suspension */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <Ban className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">19. Right to Access Suspension</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We may suspend or terminate access to the platform for any user who violates our rules or poses a risk to the community.
                </p>
              </div>
            </div>

            {/* 20. Termination by User & Final Disclaimer */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-gray-500/10">
                  <Scale className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-xl font-bold">20. Termination by User & Final Disclaimer</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Users may delete their accounts anytime. Deletion is permanent and irreversible.
                </p>
                <div className="mt-4 p-4 rounded-xl bg-muted border border-border">
                  <p className="font-semibold text-foreground">"At Your Own Risk" Disclaimer</p>
                  <p className="mt-2">
                    Users understand that all interactions, communications, and collaborations on FoundersYard are voluntary and at their own risk.
                  </p>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="font-semibold text-foreground">Final Liability Shield</p>
                  <p className="mt-2">
                    FoundersYard acts solely as a hosting and distribution platform for user-generated content. We are not responsible for what users choose to publish. All liability lies with the author of the content.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 text-center">
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Questions About These Terms?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-4">
                If you have questions about these Terms of Service, please contact us.
              </p>
              <a href="mailto:ceo@prolixis.com" className="text-primary font-semibold hover:underline">
                ceo@prolixis.com
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
