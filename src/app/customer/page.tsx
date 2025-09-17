'use client';

import React from 'react';
import { MessageCircle, Phone, Mail, MapPin, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function CustomerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">iK</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">iKunnect</h1>
                <p className="text-sm text-gray-500">Customer Experience Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </Button>
              <Link href="/customer/chat">
                <Button size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Live Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your
              <span className="text-blue-600"> Customer Experience</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect with your customers through intelligent conversations, powered by AI and delivered by expert agents.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/customer/chat">
                <Button size="lg" className="text-lg px-8 py-3">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Start Live Chat
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Learn More
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-gray-500">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-medium">4.9/5 Customer Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">Instant Response</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose iKunnect?
            </h2>
            <p className="text-lg text-gray-600">
              Experience the future of customer communication
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Instant Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect with our expert agents instantly. Get real-time support for all your questions and concerns.
                </p>
                <Badge className="mt-4" variant="secondary">
                  Average response: 30 seconds
                </Badge>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>AI-Powered Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our agents are enhanced with AI to provide faster, more accurate responses to your inquiries.
                </p>
                <Badge className="mt-4" variant="secondary">
                  95% First Contact Resolution
                </Badge>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>24/7 Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We&apos;re here whenever you need us. Round-the-clock support for your peace of mind.
                </p>
                <Badge className="mt-4" variant="secondary">
                  Always Online
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Experience our new custom chat interface with AI-powered suggestions
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/customer/chat">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Chat Now
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-blue-600">
              <Phone className="w-5 h-5 mr-2" />
              Request Callback
            </Button>
          </div>

          {/* Custom Chat Instructions */}
          <div className="mt-12 p-6 bg-blue-700 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-3">
              💬 New Custom Chat Experience
            </h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Our new chat interface features:
            </p>
            <ul className="text-blue-100 text-sm mt-3 space-y-1 text-left">
              <li>• Direct connection to n8n (no GHL delays)</li>
              <li>• Real-time AI suggestions for faster responses</li>
              <li>• Multi-language support with automatic detection</li>
              <li>• Live updates via Supabase Realtime</li>
              <li>• Optimistic UI for instant message display</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
              <p className="text-sm text-gray-500">Available 24/7</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600">support@ikunnect.com</p>
              <p className="text-sm text-gray-500">Response within 1 hour</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Office Location</h3>
              <p className="text-gray-600">123 Business Ave</p>
              <p className="text-sm text-gray-500">New York, NY 10001</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">iK</span>
              </div>
              <span className="text-xl font-bold">iKunnect</span>
            </div>
            <p className="text-gray-400 mb-6">
              Transforming customer experiences through intelligent conversations
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white">Contact Us</a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © 2025 iKunnect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

