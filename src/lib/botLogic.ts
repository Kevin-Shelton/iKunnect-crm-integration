// Simple Bot Logic Framework
import { GHLMCPClient } from './crmMcp';
import { Contact, Message } from '../types/crm';

export interface BotContext {
  contactId: string;
  conversationId: string;
  contact?: Contact;
  lastMessage?: Message;
  sessionData?: Record<string, any>;
}

export interface BotResponse {
  message: string;
  actions?: BotAction[];
  metadata?: Record<string, any>;
}

export interface BotAction {
  type: 'create_opportunity' | 'schedule_followup' | 'transfer_to_human' | 'collect_info';
  data: Record<string, any>;
}

export class SimpleBotLogic {
  private ghlClient: GHLMCPClient;
  private greetings: string[];
  private farewells: string[];
  private fallbackResponses: string[];

  constructor(ghlClient: GHLMCPClient) {
    this.ghlClient = ghlClient;
    
    this.greetings = [
      "Hello! Welcome to our chat. How can I help you today?",
      "Hi there! I'm here to assist you. What can I do for you?",
      "Welcome! I'm your virtual assistant. How may I help you?",
      "Hello! Thanks for reaching out. What would you like to know?"
    ];

    this.farewells = [
      "Thank you for chatting with us! Have a great day!",
      "It was pleasure helping you. Feel free to reach out anytime!",
      "Goodbye! Don't hesitate to contact us if you need anything else.",
      "Thanks for your time. We're here whenever you need us!"
    ];

    this.fallbackResponses = [
      "I understand you're looking for help. Let me connect you with a human representative who can better assist you.",
      "That's a great question! I'd like to transfer you to one of our specialists who can provide more detailed information.",
      "I want to make sure you get the best help possible. Let me get a human agent to assist you with this.",
      "Thanks for your patience. I'm going to connect you with someone who can give you a more comprehensive answer."
    ];
  }

  /**
   * Process incoming message and generate bot response
   */
  async processMessage(userMessage: string, context: BotContext): Promise<BotResponse> {
    const message = userMessage.toLowerCase().trim();
    
    console.log('[Bot Logic] Processing message:', { message, contactId: context.contactId });

    // Greeting detection
    if (this.isGreeting(message)) {
      return this.handleGreeting(context);
    }

    // Farewell detection
    if (this.isFarewell(message)) {
      return this.handleFarewell(context);
    }

    // FAQ handling
    const faqResponse = this.handleFAQ(message, context);
    if (faqResponse) {
      return faqResponse;
    }

    // Contact information collection
    if (this.needsContactInfo(message, context)) {
      return this.handleContactInfoCollection(message, context);
    }

    // Business inquiry detection
    if (this.isBusinessInquiry(message)) {
      return this.handleBusinessInquiry(message, context);
    }

    // Default: transfer to human
    return this.handleFallback(context);
  }

  private isGreeting(message: string): boolean {
    const greetingWords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'begin'];
    return greetingWords.some(word => message.includes(word));
  }

  private isFarewell(message: string): boolean {
    const farewellWords = ['bye', 'goodbye', 'thanks', 'thank you', 'done', 'finished', 'end'];
    return farewellWords.some(word => message.includes(word));
  }

  private handleGreeting(context: BotContext): BotResponse {
    const greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
    
    let personalizedGreeting = greeting;
    if (context.contact?.firstName) {
      personalizedGreeting = `Hi ${context.contact.firstName}! ${greeting.substring(greeting.indexOf('!') + 1).trim()}`;
    }

    return {
      message: personalizedGreeting,
      metadata: { intent: 'greeting', personalized: !!context.contact?.firstName }
    };
  }

  private handleFarewell(context: BotContext): BotResponse {
    const farewell = this.farewells[Math.floor(Math.random() * this.farewells.length)];
    
    return {
      message: farewell,
      actions: [
        {
          type: 'schedule_followup',
          data: { 
            delay: '24h', 
            message: 'Following up on our conversation. Is there anything else I can help you with?' 
          }
        }
      ],
      metadata: { intent: 'farewell' }
    };
  }

  private handleFAQ(message: string, context: BotContext): BotResponse | null {
    // Business hours
    if (message.includes('hours') || message.includes('open') || message.includes('closed')) {
      return {
        message: "Our business hours are Monday through Friday, 9 AM to 6 PM EST. However, you can reach out to us anytime through this chat, and we'll get back to you as soon as possible!",
        metadata: { intent: 'business_hours' }
      };
    }

    // Pricing
    if (message.includes('price') || message.includes('cost') || message.includes('pricing') || message.includes('how much')) {
      return {
        message: "I'd be happy to discuss pricing with you! Our pricing varies based on your specific needs and requirements. Let me connect you with one of our sales specialists who can provide you with a customized quote.",
        actions: [
          {
            type: 'transfer_to_human',
            data: { department: 'sales', reason: 'pricing_inquiry' }
          }
        ],
        metadata: { intent: 'pricing_inquiry' }
      };
    }

    // Services
    if (message.includes('service') || message.includes('what do you do') || message.includes('help with')) {
      return {
        message: "We offer a comprehensive range of services to help businesses grow and succeed. Our main areas include marketing automation, CRM solutions, lead generation, and customer engagement tools. What specific area are you most interested in learning about?",
        metadata: { intent: 'services_inquiry' }
      };
    }

    // Contact information
    if (message.includes('contact') || message.includes('phone') || message.includes('email') || message.includes('address')) {
      return {
        message: "You can reach us through this chat anytime, or contact us directly at:\n\n📧 Email: support@company.com\n📞 Phone: (555) 123-4567\n🏢 Address: 123 Business St, Suite 100, City, State 12345\n\nIs there a specific way you'd prefer to be contacted?",
        metadata: { intent: 'contact_info' }
      };
    }

    return null;
  }

  private needsContactInfo(message: string, context: BotContext): boolean {
    const hasBasicInfo = context.contact?.email || context.contact?.phone;
    const isProvidingInfo = message.includes('@') || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(message);
    
    return !hasBasicInfo || isProvidingInfo;
  }

  private handleContactInfoCollection(message: string, context: BotContext): BotResponse {
    // Extract email
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    
    // Extract phone
    const phoneMatch = message.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);

    if (emailMatch || phoneMatch) {
      return {
        message: "Thank you for providing your contact information! I've updated your profile. This will help us serve you better. How else can I assist you today?",
        actions: [
          {
            type: 'collect_info',
            data: {
              email: emailMatch ? emailMatch[0] : undefined,
              phone: phoneMatch ? phoneMatch[0] : undefined
            }
          }
        ],
        metadata: { intent: 'contact_collection', extracted: { email: !!emailMatch, phone: !!phoneMatch } }
      };
    }

    if (!context.contact?.email && !context.contact?.phone) {
      return {
        message: "To better assist you, could you please provide your email address or phone number? This helps us keep track of our conversation and follow up appropriately.",
        metadata: { intent: 'request_contact_info' }
      };
    }

    return {
      message: "I have your contact information on file. How can I help you today?",
      metadata: { intent: 'contact_acknowledged' }
    };
  }

  private isBusinessInquiry(message: string): boolean {
    const businessKeywords = [
      'demo', 'trial', 'quote', 'proposal', 'meeting', 'consultation',
      'interested', 'business', 'company', 'solution', 'help my business',
      'lead generation', 'marketing', 'crm', 'automation'
    ];
    
    return businessKeywords.some(keyword => message.includes(keyword));
  }

  private handleBusinessInquiry(message: string, context: BotContext): BotResponse {
    return {
      message: "That sounds like a great opportunity! I'd love to learn more about your business needs and see how we can help. Let me connect you with one of our business development specialists who can provide you with detailed information and potentially schedule a demo or consultation.",
      actions: [
        {
          type: 'create_opportunity',
          data: {
            title: 'Chat Inquiry - Business Interest',
            status: 'new',
            source: 'chat_bot',
            notes: `Customer inquiry: ${message}`
          }
        },
        {
          type: 'transfer_to_human',
          data: { department: 'business_development', reason: 'business_inquiry' }
        }
      ],
      metadata: { intent: 'business_inquiry', opportunity_created: true }
    };
  }

  private handleFallback(context: BotContext): BotResponse {
    const fallback = this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
    
    return {
      message: fallback,
      actions: [
        {
          type: 'transfer_to_human',
          data: { department: 'general_support', reason: 'complex_inquiry' }
        }
      ],
      metadata: { intent: 'fallback', requires_human: true }
    };
  }

  /**
   * Execute bot actions (create opportunities, schedule follow-ups, etc.)
   */
  async executeActions(actions: BotAction[], context: BotContext): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        console.error(`[Bot Logic] Failed to execute action ${action.type}:`, error);
      }
    }
  }

  private async executeAction(action: BotAction, context: BotContext): Promise<void> {
    switch (action.type) {
      case 'create_opportunity':
        await this.createOpportunity(action.data, context);
        break;
      
      case 'collect_info':
        await this.updateContactInfo(action.data, context);
        break;
      
      case 'transfer_to_human':
        await this.initiateHumanTransfer(action.data, context);
        break;
      
      case 'schedule_followup':
        await this.scheduleFollowup(action.data, context);
        break;
      
      default:
        console.warn(`[Bot Logic] Unknown action type: ${action.type}`);
    }
  }

  private async createOpportunity(data: any, context: BotContext): Promise<void> {
    const opportunityData = {
      contactId: context.contactId,
      title: data.title || 'Chat Bot Generated Opportunity',
      status: data.status || 'new',
      notes: data.notes || 'Generated from chat bot interaction',
      ...data
    };

    const result = await this.ghlClient.createOpportunity(opportunityData);
    
    if (result.success) {
      console.log('[Bot Logic] Opportunity created:', result.data?.id);
    } else {
      console.error('[Bot Logic] Failed to create opportunity:', result.error);
    }
  }

  private async updateContactInfo(data: any, context: BotContext): Promise<void> {
    const updateData: any = {};
    
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.name) updateData.name = data.name;

    if (Object.keys(updateData).length > 0) {
      const result = await this.ghlClient.upsertContact({
        ...updateData,
        // Include existing contact ID to ensure update
        ...(context.contact?.id && { id: context.contact.id })
      });

      if (result.success) {
        console.log('[Bot Logic] Contact updated with new information');
      } else {
        console.error('[Bot Logic] Failed to update contact:', result.error);
      }
    }
  }

  private async initiateHumanTransfer(data: any, context: BotContext): Promise<void> {
    // In a real implementation, this would integrate with your support system
    // For now, we'll just log the transfer request
    console.log('[Bot Logic] Human transfer requested:', {
      contactId: context.contactId,
      conversationId: context.conversationId,
      department: data.department,
      reason: data.reason
    });

    // Could send a message to the conversation indicating transfer
    await this.ghlClient.sendMessage({
      conversationId: context.conversationId,
      body: `Transfer requested to ${data.department || 'support team'}. A human agent will be with you shortly.`,
      channel: 'chat'
    });
  }

  private async scheduleFollowup(data: any, context: BotContext): Promise<void> {
    // In a real implementation, this would integrate with your scheduling system
    console.log('[Bot Logic] Follow-up scheduled:', {
      contactId: context.contactId,
      delay: data.delay,
      message: data.message
    });
  }
}

export default SimpleBotLogic;

