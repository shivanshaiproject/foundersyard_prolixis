import { HelpCircle, Mail, MessageSquare, Book, Users, Settings } from 'lucide-react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How do I create an account?',
        answer: 'Click on "Get Started" on the homepage and follow the registration process. You can sign up using your email address. Once registered, complete your profile to get the most out of FoundersYard.',
      },
      {
        question: 'How do I complete my profile?',
        answer: 'After signing up, go to Settings > Profile. Add your company name, role, bio, location, and areas of expertise. A complete profile helps other founders connect with you.',
      },
      {
        question: 'Is FoundersYard free to use?',
        answer: 'Yes! FoundersYard offers a free tier with access to the feed, forums, and networking features. We also offer VIP membership for additional benefits.',
      },
    ],
  },
  {
    category: 'Networking & Connections',
    questions: [
      {
        question: 'How do I connect with other founders?',
        answer: "Visit any founder's profile and click the \"Connect\" button. They'll receive a connection request, and once accepted, you'll be connected. You can also discover new founders through the Explore page.",
      },
      {
        question: 'What happens after someone accepts my connection?',
        answer: "Once connected, you'll see their posts in your feed and can engage with their content. You can also send direct messages to your connections.",
      },
      {
        question: 'How do I find founders in my industry?',
        answer: 'Use the Explore page to filter founders by sector (AI, SaaS, Fintech, etc.), location, or stage. You can also browse topic-specific discussions in Forums.',
      },
    ],
  },
  {
    category: 'Posts & Content',
    questions: [
      {
        question: 'How do I create a post?',
        answer: 'From your feed, use the post composer at the top to write your thoughts. You can add images, select a category, and share your post with the community. Posts are limited to 700 characters.',
      },
      {
        question: 'What are categories/topics?',
        answer: "Categories help organize content by subject matter (Tech, Funding, Growth, Product, Marketing, AI). You can filter posts by category and follow topics you're interested in.",
      },
      {
        question: 'How do I edit or delete my posts?',
        answer: 'Click the three-dot menu (⋯) on your post to see options for editing or deleting. Edited posts will show "(edited)" next to them.',
      },
    ],
  },
  {
    category: 'Forums',
    questions: [
      {
        question: 'What are Forums?',
        answer: 'Forums are dedicated spaces for in-depth discussions about specific topics like Tech, Funding, Growth, and more. You can start threads, reply to discussions, and engage with the community.',
      },
      {
        question: 'How do I start a forum thread?',
        answer: 'Navigate to Forums, select a category, and click "New Thread". Add a title, detailed description, and submit. Other founders can then reply to your thread.',
      },
    ],
  },
  {
    category: 'Account & Settings',
    questions: [
      {
        question: 'What does verification mean?',
        answer: 'Verified accounts have been confirmed to belong to notable founders or public figures. The verification badge (checkmark) appears next to their name.',
      },
      {
        question: 'How do I enable/disable notifications?',
        answer: "Go to Settings and toggle the \"Notifications\" switch. When enabled, you'll receive notifications for likes, comments, and network requests.",
      },
      {
        question: 'How do I delete my account?',
        answer: 'Contact our support team through the form below. Account deletion is permanent and will remove all your posts, comments, and connections.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Help Center & FAQ – FoundersYard</title>
        <meta name="description" content="Find answers to common questions about FoundersYard. Learn how to create an account, network with founders, post content, use forums, and manage your profile." />
        <link rel="canonical" href="https://foundersyard.in/help" />
        <meta property="og:title" content="FoundersYard Help Center" />
        <meta property="og:url" content="https://foundersyard.in/help" />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.flatMap(s => s.questions.map(q => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": { "@type": "Answer", "text": q.answer }
          })))
        })}</script>
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Help Center
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              How can we <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">help</span>?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our support team
            </p>
          </div>

          {/* Quick Links */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Book, title: 'Getting Started', desc: 'New to FoundersYard? Start here' },
                { icon: Users, title: 'Networking', desc: 'Connect with other founders' },
                { icon: MessageSquare, title: 'Posts & Forums', desc: 'Share and discuss ideas' },
                { icon: Settings, title: 'Account', desc: 'Manage your profile' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-card border border-border/50 p-6 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="p-3 rounded-2xl bg-accent w-fit mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-8">
              {faqs.map((section) => (
                <div key={section.category} className="rounded-[24px] bg-card border border-border/50 p-6">
                  <h3 className="font-semibold text-lg mb-4 text-foreground">{section.category}</h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {section.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${section.category}-${index}`} className="border border-border/30 rounded-xl px-4">
                        <AccordionTrigger className="text-left font-medium hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 lg:p-12 text-center">
              <Mail className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Can't find what you're looking for? Our support team is here to help. 
                We typically respond within 24 hours.
              </p>
              <Button size="lg" className="rounded-full px-8">
                <Mail className="w-5 h-5 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
