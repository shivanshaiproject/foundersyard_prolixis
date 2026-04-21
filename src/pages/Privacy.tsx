import { Shield, Eye, Lock, Database, UserCheck, Cookie, Bell, Mail, AlertTriangle, FileText } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Privacy Policy
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Your <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Privacy</span> Matters
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FoundersYard ("we", "our", "us") is committed to protecting your privacy.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last Updated: December 13, 2025
            </p>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. Information We Collect */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">1. Information We Collect</h2>
              </div>
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1.1 User-Provided Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Name</li>
                    <li>Email</li>
                    <li>Password (encrypted)</li>
                    <li>Profile information</li>
                    <li>Posts, comments, likes</li>
                    <li>Device/browser details</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1.2 Automatically Collected Data</h3>
                  <p className="mb-2">Our systems automatically log:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>IP address</li>
                    <li>Login timestamps</li>
                    <li>Device ID</li>
                    <li>Session tokens</li>
                    <li>Error logs</li>
                    <li>Usage analytics</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1.3 Optional Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Interests & sectors</li>
                    <li>Location (if allowed)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. How We Use Your Data */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <Eye className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold">2. How We Use Your Data</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>We use your data to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Operate the platform</li>
                  <li>Display personalized content</li>
                  <li>Improve ranking algorithms</li>
                  <li>Detect spam & harmful behavior</li>
                  <li>Secure the platform from abuse</li>
                  <li>Respond to legal or moderation requests</li>
                  <li>Communicate updates or alerts</li>
                </ul>
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="font-semibold text-emerald-600">
                    We do not sell your data to third parties.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Data Storage & Security */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">3. Data Storage & Security</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Your data is stored securely on our servers. We use:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encryption at rest</li>
                  <li>Encryption in transit</li>
                  <li>Role-based access control (RLS policies)</li>
                  <li>Edge Functions for secure backend logic</li>
                </ul>
              </div>
            </div>

            {/* 4. Sharing of Data */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <UserCheck className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">4. Sharing of Data</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>We may share anonymized data with:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Analytics partners</li>
                  <li>Advertising partners</li>
                  <li>Legal authorities (if obligated)</li>
                </ul>
                <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="font-semibold text-destructive">We never share:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Passwords</li>
                    <li>Private messages</li>
                    <li>Contact details</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 5. User Rights */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-purple-500/10">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold">5. User Rights</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>You may:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your data</li>
                  <li>Edit your profile</li>
                  <li>Delete your account</li>
                  <li>Request data export</li>
                </ul>
                <p className="mt-4">
                  Deletion permanently removes personal data except where legal retention is required.
                </p>
              </div>
            </div>

            {/* 6. Cookies & Tracking */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                  <Cookie className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold">6. Cookies & Tracking</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>We use cookies for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Login sessions</li>
                  <li>Personalization</li>
                  <li>Analytics</li>
                </ul>
              </div>
            </div>

            {/* 7. Protection Against Abuse */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">7. Protection Against Abuse</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>We use automated systems to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Detect spam</li>
                  <li>Enforce rate limits</li>
                  <li>Block harmful content</li>
                  <li>Ban abusive accounts</li>
                  <li>Identify devices of banned users</li>
                </ul>
              </div>
            </div>

            {/* 8. Children's Privacy */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-pink-500/10">
                  <Bell className="w-6 h-6 text-pink-600" />
                </div>
                <h2 className="text-xl font-bold">8. Children's Privacy</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="font-medium">
                  FoundersYard is not for users under 18.
                </p>
                <p>
                  We do not knowingly collect data from minors. If we discover that a user is under 18, their account will be terminated.
                </p>
              </div>
            </div>

            {/* 9. Changes to Policy */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-teal-500/10">
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold">9. Changes to Policy</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We may update this policy anytime. Continued use = acceptance.
                </p>
                <p>
                  We will notify users of significant changes via email or platform notification.
                </p>
              </div>
            </div>

            {/* 10. Contact */}
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 text-center">
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">10. Contact</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-4">
                For privacy questions, please contact us:
              </p>
              <a href="mailto:ceo@prolixis.com" className="text-primary font-semibold hover:underline text-lg">
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
