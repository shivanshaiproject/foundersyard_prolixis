import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Calendar, MapPin, Users, Video, Clock, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const upcomingEvents = [
  {
    title: 'Founder Networking Night',
    date: 'Coming Soon',
    time: '6:00 PM IST',
    location: 'Bangalore',
    type: 'In-Person',
    attendees: 50,
    description: 'Connect with fellow founders over drinks and snacks. No pitches, just real conversations.',
  },
  {
    title: 'Fundraising Masterclass',
    date: 'Coming Soon',
    time: '3:00 PM IST',
    location: 'Online',
    type: 'Virtual',
    attendees: 200,
    description: 'Learn from founders who have successfully raised Series A. Q&A included.',
  },
  {
    title: 'AI Founders Meetup',
    date: 'Coming Soon',
    time: '5:00 PM IST',
    location: 'Delhi NCR',
    type: 'In-Person',
    attendees: 40,
    description: 'Exclusive meetup for AI/ML founders. Share learnings and explore collaborations.',
  },
];

const eventTypes = [
  {
    icon: Users,
    title: 'Networking Events',
    description: 'Casual meetups to connect with founders in your city',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Video,
    title: 'Virtual Workshops',
    description: 'Learn from experts without leaving your desk',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: Sparkles,
    title: 'VIP Exclusives',
    description: 'Premium events for VIP members only',
    color: 'bg-purple-500/10 text-purple-600',
  },
];

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Founder Events & Meetups – FoundersYard</title>
        <meta name="description" content="Join virtual and in-person founder events, networking nights, workshops, and meetups across India. Connect with startup founders at FoundersYard events." />
        <link rel="canonical" href="https://foundersyard.in/events" />
        <meta property="og:title" content="Founder Events & Meetups | FoundersYard" />
        <meta property="og:url" content="https://foundersyard.in/events" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Events
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Connect <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">in person</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join virtual and in-person events designed for founders. 
              Network, learn, and grow with your community.
            </p>
          </div>

          {/* Event Types */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid sm:grid-cols-3 gap-6">
              {eventTypes.map((type) => (
                <div
                  key={type.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 hover:border-primary/30 transition-colors"
                >
                  <div className={`p-3 rounded-2xl w-fit mb-4 ${type.color}`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="max-w-6xl mx-auto mb-20">
            <h2 className="text-2xl font-bold mb-8 text-center">Upcoming Events</h2>
            <div className="space-y-6">
              {upcomingEvents.map((event) => (
                <div
                  key={event.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 lg:p-8 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.type === 'Virtual' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {event.type}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-accent text-foreground text-xs font-medium">
                          {event.date}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{event.title}</h3>
                      <p className="text-muted-foreground mb-4">{event.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees} spots</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button className="rounded-full" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Host Event CTA */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 lg:p-12 text-center">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Want to host an event?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                We're always looking for founders to host meetups and workshops. 
                Share your expertise with the community.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="rounded-full px-8 group">
                  Join to Host Events
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
