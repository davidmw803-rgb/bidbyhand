import Link from 'next/link';
import {
  Smartphone,
  Ticket,
  BarChart3,
  CreditCard,
  ArrowRight,
  Heart,
  Zap,
  Users,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Smartphone,
    title: 'Mobile Bidding',
    description:
      'Guests bid from their phones -- no app download required. Real-time updates keep the excitement going.',
  },
  {
    icon: Ticket,
    title: 'Ticketing',
    description:
      'Sell tickets, assign tables, and check in guests with QR codes. All in one platform.',
  },
  {
    icon: BarChart3,
    title: 'Live Dashboard',
    description:
      'Track bids, revenue, and engagement in real time. See your fundraising thermometer climb.',
  },
  {
    icon: CreditCard,
    title: 'Instant Checkout',
    description:
      'Card-on-file means no checkout lines. Winners pay with one tap when the auction closes.',
  },
];

const stats = [
  { value: '40%', label: 'more raised on average' },
  { value: '2min', label: 'average setup time' },
  { value: '10K+', label: 'events hosted' },
  { value: '99.9%', label: 'uptime guarantee' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-7 w-7 text-brand-600" fill="currentColor" />
            <span className="text-xl font-bold text-gray-900">BidByHand</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              How It Works
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log In
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
          <Link href="/register" className="md:hidden">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
              <Zap className="h-4 w-4" />
              The auction platform built for fundraisers
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl text-balance">
              Raise More. Stress Less.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
              Mobile bidding that feels native, checkout that takes seconds, and
              a dashboard that keeps you in control. BidByHand powers your
              silent auction so you can focus on your mission.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8"
                >
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative gradient blob */}
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-brand-100/40 blur-3xl" />
      </section>

      {/* Stats / Social Proof */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-brand-600">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to run a world-class auction
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From item catalog to final invoice, BidByHand handles every step.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3">
                  <feature.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-900 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Three simple steps to your most successful fundraiser yet.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Create your event',
                desc: 'Add your items, set starting bids, and customize your event page.',
              },
              {
                step: '2',
                title: 'Share with guests',
                desc: 'Send invites with a link or QR code. Guests register and save a card.',
              },
              {
                step: '3',
                title: 'Watch the bids roll in',
                desc: 'Monitor your live dashboard. Close the auction and collect payments instantly.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by fundraisers everywhere
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                quote:
                  'BidByHand doubled our silent auction revenue. The mobile experience kept guests engaged all night.',
                author: 'Sarah M.',
                org: 'Hope Foundation',
              },
              {
                quote:
                  'Setup took 15 minutes. Checkout was instant. Our volunteers actually got to enjoy the event.',
                author: 'James T.',
                org: 'Community Arts Center',
              },
              {
                quote:
                  'The live dashboard was a game-changer. We could see exactly what was working in real time.',
                author: 'Maria L.',
                org: 'Youth Sports Alliance',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.author}
                className="rounded-2xl border border-gray-100 bg-white p-6"
              >
                <div className="flex gap-1 text-brand-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <CheckCircle key={i} className="h-4 w-4" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-gray-500">{testimonial.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to raise more?
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Create your free account and set up your first event in minutes.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 text-base px-8 bg-white text-brand-700 hover:bg-gray-50"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-brand-600" fill="currentColor" />
                <span className="text-lg font-bold text-gray-900">
                  BidByHand
                </span>
              </Link>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                The mobile auction platform for nonprofits and fundraisers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#features" className="hover:text-gray-900">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-100 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} BidByHand. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
