import { Heart, Sparkles, Ban, Lock, UserX, AlertTriangle, Shield, Copyright, Megaphone, Flag, Mail } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Community Guidelines
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Our <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Community</span> Standards
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our goal is to maintain a high-signal, respectful network for founders.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last Updated: December 13, 2025
            </p>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. Be Respectful */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">1. Be Respectful</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  No harassment, abuse, discrimination, hate speech, or personal attacks.
                </p>
                <p>
                  Treat every member of the community with dignity and professionalism. We're all here to grow together.
                </p>
              </div>
            </div>

            {/* 2. High-Signal Only */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold">2. High-Signal Only</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Low-effort content, spam, AI-generated junk, or irrelevant posts are prohibited.
                </p>
                <p>
                  Share content that provides genuine value to the founder community. Quality over quantity.
                </p>
              </div>
            </div>

            {/* 3. No NSFW or Political Content */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-destructive/10">
                  <Ban className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-xl font-bold">3. No NSFW or Political Content</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p className="font-medium">
                  Absolutely no explicit, sexual, or political discussions.
                </p>
                <p>
                  Keep the focus on building, growing, and supporting each other as founders.
                </p>
              </div>
            </div>

            {/* 4. Protect Confidentiality */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">4. Protect Confidentiality</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>Do NOT share:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Internal company documents</li>
                  <li>Trade secrets</li>
                  <li>Investor or salary numbers</li>
                  <li>Private founder conversations</li>
                  <li>Screenshots from Slack/WhatsApp</li>
                </ul>
                <p className="mt-4">
                  Respect the privacy of conversations and information shared in confidence.
                </p>
              </div>
            </div>

            {/* 5. No Misrepresentation */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <UserX className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">5. No Misrepresentation</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  No fake revenue, fake traction, fake investor interest, or misleading claims.
                </p>
                <p>
                  Be authentic. The founder community thrives on trust and genuine connections.
                </p>
              </div>
            </div>

            {/* 6. No Scam or Fraudulent Behavior */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">6. No Scam or Fraudulent Behavior</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  No hiring scams, false offers, fundraising scams, or phishing attempts.
                </p>
                <p>
                  Any fraudulent activity will result in immediate permanent ban and may be reported to authorities.
                </p>
              </div>
            </div>

            {/* 7. No Defamation */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-purple-500/10">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold">7. No Defamation</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Do NOT insult or spread accusations against individuals or companies.
                </p>
                <p>
                  Constructive criticism is welcome, but personal attacks and unfounded allegations are not.
                </p>
              </div>
            </div>

            {/* 8. Protect IP */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-teal-500/10">
                  <Copyright className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold">8. Protect IP</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Do not upload copyrighted or stolen material.
                </p>
                <p>
                  Respect intellectual property rights. Only share content you have the right to share.
                </p>
              </div>
            </div>

            {/* 9. No Spam or Promotions */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                  <Megaphone className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold">9. No Spam or Promotions</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  No excessive self-promotion, link dumping, or irrelevant advertising.
                </p>
                <p>
                  Share your journey authentically, but don't turn the community into your marketing channel.
                </p>
              </div>
            </div>

            {/* 10. Reporting Misconduct */}
            <div className="rounded-[24px] bg-card border border-border/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-500/10">
                  <Flag className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold">10. Reporting Misconduct</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Users may report content that violates these guidelines.
                </p>
                <p>
                  FoundersYard will investigate and take appropriate action. We take all reports seriously and handle them confidentially.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 text-center">
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Questions About Our Guidelines?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-4">
                If you have questions about these Community Guidelines, please contact us.
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
