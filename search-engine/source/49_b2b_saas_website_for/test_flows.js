// Test runner for business logic integration flows
// Covers all 8 tasks using the provided SDK-style interfaces

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and initialize
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure (implementation assumed in BusinessLogic)
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "channels": [
        {
          "id": "production_website",
          "name": "Production Website",
          "channel_type": "website",
          "description": "Live customer-facing website widget for lead capture and support",
          "is_active": true,
          "created_at": "2025-01-10T10:00:00Z"
        },
        {
          "id": "staging_website",
          "name": "Staging Website",
          "channel_type": "website",
          "description": "Test environment website widget used for QA",
          "is_active": false,
          "created_at": "2025-02-05T09:30:00Z"
        },
        {
          "id": "support_email",
          "name": "Support Email",
          "channel_type": "email",
          "description": "Shared support inbox for incoming email tickets",
          "is_active": true,
          "created_at": "2024-11-15T14:20:00Z"
        }
      ],
      "chat_message_templates": [
        {
          "id": "greeting_website_default",
          "name": "Default website greeting",
          "content": "Hi there! How can we help you today?",
          "template_type": "greeting",
          "is_default": true
        },
        {
          "id": "greeting_lead_gen",
          "name": "Lead generation greeting",
          "content": "Hi! Im your virtual assistant. I can help with pricing and demos.",
          "template_type": "greeting",
          "is_default": false
        },
        {
          "id": "offline_standard",
          "name": "Standard offline message",
          "content": "Were offline right now, but leave your details and well get back to you.",
          "template_type": "offline",
          "is_default": true
        }
      ],
      "email_templates": [
        {
          "id": "urgent_support_ack",
          "name": "Urgent support acknowledgement",
          "description": "Automated acknowledgement for new urgent support tickets",
          "subject_template": "[URGENT] Weve received your request (Ticket {{ticket_id}})",
          "body_template": "Hi {{customer_first_name}},\n\nWeve logged your urgent request (Ticket {{ticket_id}}). Our team is reviewing it now and will respond as soon as possible.\n\nBest regards,\nSupport Team",
          "use_ai_generation": true,
          "default_sender_address": "support@demo-company.test",
          "is_active": true
        },
        {
          "id": "standard_support_ack",
          "name": "Standard support acknowledgement",
          "description": "Default acknowledgement for non-urgent support tickets",
          "subject_template": "Weve received your request (Ticket {{ticket_id}})",
          "body_template": "Hi {{customer_first_name}},\n\nThanks for reaching out. Weve received your request (Ticket {{ticket_id}}) and will get back to you shortly.\n\nBest,\nSupport Team",
          "use_ai_generation": false,
          "default_sender_address": "support@demo-company.test",
          "is_active": true
        },
        {
          "id": "sales_pricing_reply",
          "name": "Sales pricing follow-up",
          "description": "Follow-up email for pricing and quote requests",
          "subject_template": "Pricing details for {{company_name}}",
          "body_template": "Hi {{customer_first_name}},\n\nThanks for your interest in our AI customer communication platform. Based on what you shared, heres a summary of pricing options we recommend.\n\n{{ai_generated_pricing_summary}}\n\nBest regards,\nSales Team",
          "use_ai_generation": true,
          "default_sender_address": "sales@demo-company.test",
          "is_active": true
        }
      ],
      "inboxes": [
        {
          "id": "general",
          "name": "General",
          "description": "Default inbox for uncategorized conversations",
          "default_priority": "normal",
          "channel_ids": [
            "production_website",
            "staging_website"
          ],
          "is_default": true,
          "is_active": true
        },
        {
          "id": "sales",
          "name": "Sales",
          "description": "Inbox for pricing, quotes, and demo requests",
          "default_priority": "normal",
          "channel_ids": [
            "production_website",
            "sales_email"
          ],
          "is_default": false,
          "is_active": true
        },
        {
          "id": "support",
          "name": "Support",
          "description": "Inbox for technical issues and customer support",
          "default_priority": "high",
          "channel_ids": [
            "support_email",
            "whatsapp_support",
            "production_website"
          ],
          "is_default": false,
          "is_active": true
        }
      ],
      "integrations": [
        {
          "id": "demo_crm_sandbox_integration",
          "name": "Demo CRM Sandbox",
          "provider_key": "demo_crm_sandbox",
          "type": "crm",
          "status": "disconnected",
          "api_key": "",
          "environment": "sandbox",
          "sync_new_conversations": false,
          "auto_create_contacts": false,
          "created_at": "2025-01-20T12:00:00Z",
          "updated_at": "2025-01-20T12:00:00Z"
        },
        {
          "id": "other_crm_reporting",
          "name": "Legacy CRM Reporting",
          "provider_key": "other_crm",
          "type": "analytics",
          "status": "connected",
          "api_key": "REDACTED-LEGACY-KEY",
          "environment": "production",
          "sync_new_conversations": false,
          "auto_create_contacts": false,
          "created_at": "2024-09-01T09:00:00Z",
          "updated_at": "2025-01-05T16:30:00Z"
        }
      ],
      "knowledge_bases": [
        {
          "id": "main_kb",
          "name": "Main Knowledge Base",
          "description": "Public help center used by bots and the website",
          "default_visibility": "public",
          "is_active": true,
          "created_at": "2024-10-10T08:45:00Z"
        },
        {
          "id": "internal_kb",
          "name": "Internal Playbooks",
          "description": "Internal-only articles for support and sales teams",
          "default_visibility": "internal",
          "is_active": true,
          "created_at": "2024-11-01T10:15:00Z"
        }
      ],
      "pricing_plans": [
        {
          "id": "starter_monthly",
          "name": "Starter Monthly",
          "description": "Entry-level plan for small teams getting started with shared inboxes.",
          "billing_type": "monthly",
          "price_per_month": 39,
          "original_annual_price": null,
          "includes_ai_assistant": false,
          "included_seats": 3,
          "is_active": true,
          "is_recommended": false
        },
        {
          "id": "starter_annual",
          "name": "Starter Annual",
          "description": "Discounted annual plan for small teams without AI automation.",
          "billing_type": "annual",
          "price_per_month": 29,
          "original_annual_price": 348,
          "includes_ai_assistant": false,
          "included_seats": 3,
          "is_active": true,
          "is_recommended": false
        },
        {
          "id": "team_ai_annual",
          "name": "Team AI Annual",
          "description": "AI-powered plan for growing teams that need automation and AI assistance.",
          "billing_type": "annual",
          "price_per_month": 189,
          "original_annual_price": 2268,
          "includes_ai_assistant": true,
          "included_seats": 5,
          "is_active": true,
          "is_recommended": true
        }
      ],
      "agents": [
        {
          "id": "alex_support",
          "full_name": "Alex Support",
          "email": "alex.support@example.test",
          "role": "agent",
          "assigned_inbox_ids": [
            "support"
          ],
          "permissions": [
            "assigned_inboxes_only"
          ],
          "working_hours_type": "custom",
          "working_hours": [
            {
              "day_of_week": "monday",
              "start_time": "08:00",
              "end_time": "16:00"
            },
            {
              "day_of_week": "tuesday",
              "start_time": "08:00",
              "end_time": "16:00"
            },
            {
              "day_of_week": "wednesday",
              "start_time": "08:00",
              "end_time": "16:00"
            },
            {
              "day_of_week": "thursday",
              "start_time": "08:00",
              "end_time": "16:00"
            },
            {
              "day_of_week": "friday",
              "start_time": "08:00",
              "end_time": "16:00"
            }
          ],
          "timezone": "America/New_York",
          "status": "active",
          "created_at": "2026-02-20T10:00:00Z"
        },
        {
          "id": "jordan_admin",
          "full_name": "Jordan Admin",
          "email": "jordan.admin@example.test",
          "role": "admin",
          "assigned_inbox_ids": [
            "general",
            "sales",
            "support",
            "billing"
          ],
          "permissions": [
            "view_all_conversations",
            "manage_routing",
            "manage_bots"
          ],
          "working_hours_type": "default",
          "working_hours": [],
          "timezone": "America/New_York",
          "status": "active",
          "created_at": "2024-10-15T09:30:00Z"
        },
        {
          "id": "casey_sales",
          "full_name": "Casey Sales",
          "email": "casey.sales@example.test",
          "role": "agent",
          "assigned_inbox_ids": [
            "sales"
          ],
          "permissions": [
            "assigned_inboxes_only"
          ],
          "working_hours_type": "default",
          "working_hours": [],
          "timezone": "America/Los_Angeles",
          "status": "active",
          "created_at": "2025-03-10T14:15:00Z"
        }
      ],
      "bots": [
        {
          "id": "website_lead_assistant",
          "name": "Website Lead Assistant",
          "type": "website_chatbot",
          "channel_id": "production_website",
          "template_name": "Lead Generation",
          "status": "active",
          "greeting_message": "Hi! Im your virtual assistant. I can help with pricing and demos. First, whats your full name, company, and work email?",
          "audience_rule_ids": [
            "audience_us_only"
          ],
          "flow_step_ids": [
            "step_greeting",
            "step_full_name",
            "step_company_name",
            "step_work_email",
            "step_estimated_budget",
            "step_end"
          ],
          "availability_enabled": true,
          "business_hours": [
            {
              "day_of_week": "monday",
              "start_time": "09:00",
              "end_time": "17:00"
            },
            {
              "day_of_week": "tuesday",
              "start_time": "09:00",
              "end_time": "17:00"
            },
            {
              "day_of_week": "wednesday",
              "start_time": "09:00",
              "end_time": "17:00"
            },
            {
              "day_of_week": "thursday",
              "start_time": "09:00",
              "end_time": "17:00"
            },
            {
              "day_of_week": "friday",
              "start_time": "09:00",
              "end_time": "17:00"
            }
          ],
          "timezone": "America/New_York",
          "offline_message_template_id": "offline_standard",
          "show_to_new_visitors_only": true,
          "repeat_after_days": 30,
          "use_knowledge_base": true,
          "knowledge_source_preference": "knowledge_base_first_then_history",
          "created_at": "2026-02-25T13:00:00Z",
          "updated_at": "2026-02-28T16:30:00Z"
        },
        {
          "id": "whatsapp_support_bot",
          "name": "WhatsApp Support Bot",
          "type": "messaging_bot",
          "channel_id": "whatsapp_support",
          "template_name": "Support Triage",
          "status": "active",
          "greeting_message": "Youve reached our WhatsApp support. Tell us briefly whats going wrong, and well help you troubleshoot.",
          "audience_rule_ids": [],
          "flow_step_ids": [
            "wa_step_greeting",
            "wa_step_issue_category",
            "wa_step_collect_email",
            "wa_step_suggest_article"
          ],
          "availability_enabled": false,
          "business_hours": [],
          "timezone": "UTC",
          "offline_message_template_id": "offline_weekend",
          "show_to_new_visitors_only": false,
          "repeat_after_days": 0,
          "use_knowledge_base": true,
          "knowledge_source_preference": "knowledge_base_only",
          "created_at": "2025-12-10T10:20:00Z",
          "updated_at": "2026-01-05T09:00:00Z"
        },
        {
          "id": "email_urgent_auto_reply_bot",
          "name": "Email Urgent Auto-Reply Bot",
          "type": "email_bot",
          "channel_id": "support_email",
          "template_name": "Urgent Ticket Auto-Reply",
          "status": "active",
          "greeting_message": "",
          "audience_rule_ids": [],
          "flow_step_ids": [
            "email_step_detect_urgent",
            "email_step_send_ack"
          ],
          "availability_enabled": true,
          "business_hours": [
            {
              "day_of_week": "monday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "tuesday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "wednesday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "thursday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "friday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "saturday",
              "start_time": "00:00",
              "end_time": "23:59"
            },
            {
              "day_of_week": "sunday",
              "start_time": "00:00",
              "end_time": "23:59"
            }
          ],
          "timezone": "UTC",
          "offline_message_template_id": "offline_standard",
          "show_to_new_visitors_only": false,
          "repeat_after_days": 0,
          "use_knowledge_base": false,
          "knowledge_source_preference": "conversation_history_only",
          "created_at": "2025-11-01T12:00:00Z",
          "updated_at": "2025-11-15T09:45:00Z"
        }
      ],
      "knowledge_base_articles": [
        {
          "id": "kb_pricing_plans_overview",
          "knowledge_base_id": "main_kb",
          "title": "Pricing and plans overview",
          "slug": "pricing-and-plans-overview",
          "content": "This article explains our pricing and plans overview for the AI customer communications platform. We offer several pricing tiers, including Starter, Team AI, Growth AI, and Scale AI. Each plans pricing is shown as an equivalent price per month, with discounts for annual billing. Higher tiers unlock more advanced AI automation and additional seats.",
          "visibility": "public",
          "keywords": [
            "pricing",
            "plans",
            "billing"
          ],
          "status": "published",
          "created_at": "2024-10-10T09:00:00Z",
          "updated_at": "2025-08-01T10:15:00Z"
        },
        {
          "id": "kb_how_to_start_free_trial",
          "knowledge_base_id": "main_kb",
          "title": "How to start a free trial",
          "slug": "how-to-start-a-free-trial",
          "content": "To start a free trial, visit the Pricing page and choose the plan you want to test. Click the \"Start trial\" button under the selected plan, complete the signup form, and confirm your email. Your trial will begin immediately, giving you full access to AI assistant features where included. During the trial period you can switch plans or cancel at any time. This process applies whether you select a monthly option or an annual plan with a trial.",
          "visibility": "public",
          "keywords": [
            "trial",
            "getting_started",
            "signup"
          ],
          "status": "published",
          "created_at": "2024-10-11T11:30:00Z",
          "updated_at": "2025-01-20T14:00:00Z"
        },
        {
          "id": "kb_support_hours_response_times",
          "knowledge_base_id": "main_kb",
          "title": "Our support hours and response times",
          "slug": "our-support-hours-and-response-times",
          "content": "Our standard support hours are Monday to Friday, 08:0018:00 in the America/New_York timezone. During these support hours, we aim to respond to urgent issues within 1 hour and to normal-priority tickets within one business day. Outside of support hours, you can still contact us using the website chatbot or email; well follow up as soon as our team is back online.",
          "visibility": "public",
          "keywords": [
            "support hours",
            "response_times",
            "sla"
          ],
          "status": "published",
          "created_at": "2024-10-12T08:45:00Z",
          "updated_at": "2025-03-05T09:10:00Z"
        }
      ],
      "knowledge_base_settings": [
        {
          "id": "main_kb_settings",
          "knowledge_base_id": "main_kb",
          "use_for_ai_answers": true,
          "preferred_source": "knowledge_base_first_then_history",
          "apply_to_bots": true,
          "last_updated": "2026-02-28T12:00:00Z"
        },
        {
          "id": "internal_kb_settings",
          "knowledge_base_id": "internal_kb",
          "use_for_ai_answers": false,
          "preferred_source": "conversation_history_only",
          "apply_to_bots": false,
          "last_updated": "2025-12-01T09:30:00Z"
        }
      ],
      "conversations": [
        {
          "id": "conv_001_lead_high_budget",
          "ticket_id": "LEAD-2026-0001",
          "channel": "website_chat",
          "subject": "Enterprise pricing inquiry from website",
          "customer_email": "cfo@bigco.test",
          "customer_full_name": "Dana CFO",
          "company_name": "BigCo Manufacturing",
          "tags": [
            "lead",
            "website",
            "us",
            "high_budget"
          ],
          "assigned_inbox_id": "sales",
          "priority": "normal",
          "first_customer_message_text": "Hi, Im interested in pricing for an enterprise plan for our US team.",
          "messages": [
            {
              "id": "m1",
              "sender_type": "customer",
              "sender_id": "visitor_1001",
              "text": "Hi, Im interested in pricing for an enterprise plan for our US team.",
              "created_at": "2026-02-20T14:05:00Z"
            },
            {
              "id": "m2",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Hi! Im your virtual assistant. I can help with pricing and demos. First, whats your full name, company, and work email?",
              "created_at": "2026-02-20T14:05:05Z"
            },
            {
              "id": "m3",
              "sender_type": "customer",
              "sender_id": "visitor_1001",
              "text": "Im Dana CFO from BigCo Manufacturing, email cfo@bigco.test.",
              "created_at": "2026-02-20T14:05:25Z"
            },
            {
              "id": "m4",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Thanks Dana. What is your estimated monthly budget (USD)?",
              "created_at": "2026-02-20T14:05:30Z"
            },
            {
              "id": "m5",
              "sender_type": "customer",
              "sender_id": "visitor_1001",
              "text": "Around $8,000 per month.",
              "created_at": "2026-02-20T14:05:45Z"
            },
            {
              "id": "m6",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Great, Ill route you to our Sales team so they can follow up with enterprise pricing and a demo.",
              "created_at": "2026-02-20T14:05:55Z"
            }
          ],
          "ai_messages_percentage": 50,
          "ai_resolved": false,
          "resolution_channel": "human",
          "budget_estimate": 8000,
          "source_bot_id": "website_lead_assistant",
          "created_at": "2026-02-20T14:05:00Z",
          "resolved_at": null
        },
        {
          "id": "conv_002_lead_low_budget",
          "ticket_id": "LEAD-2026-0002",
          "channel": "website_chat",
          "subject": "Website lead: small team pricing",
          "customer_email": "founder@startup.test",
          "customer_full_name": "Riley Founder",
          "company_name": "EarlyStage AI",
          "tags": [
            "lead",
            "website",
            "us",
            "low_budget"
          ],
          "assigned_inbox_id": "general",
          "priority": "normal",
          "first_customer_message_text": "Hi, Im checking pricing for a small startup.",
          "messages": [
            {
              "id": "m1",
              "sender_type": "customer",
              "sender_id": "visitor_1002",
              "text": "Hi, Im checking pricing for a small startup.",
              "created_at": "2026-02-21T16:20:00Z"
            },
            {
              "id": "m2",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Hi! Im your virtual assistant. I can help with pricing and demos. First, whats your full name, company, and work email?",
              "created_at": "2026-02-21T16:20:03Z"
            },
            {
              "id": "m3",
              "sender_type": "customer",
              "sender_id": "visitor_1002",
              "text": "Im Riley Founder from EarlyStage AI, email founder@startup.test.",
              "created_at": "2026-02-21T16:20:20Z"
            },
            {
              "id": "m4",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Thanks Riley. What is your estimated monthly budget (USD)?",
              "created_at": "2026-02-21T16:20:25Z"
            },
            {
              "id": "m5",
              "sender_type": "customer",
              "sender_id": "visitor_1002",
              "text": "About $1,500 per month.",
              "created_at": "2026-02-21T16:20:40Z"
            },
            {
              "id": "m6",
              "sender_type": "ai",
              "sender_id": "website_lead_assistant",
              "text": "Got it! Ill share your details with our team and theyll follow up soon.",
              "created_at": "2026-02-21T16:20:50Z"
            }
          ],
          "ai_messages_percentage": 50,
          "ai_resolved": false,
          "resolution_channel": "human",
          "budget_estimate": 1500,
          "source_bot_id": "website_lead_assistant",
          "created_at": "2026-02-21T16:20:00Z",
          "resolved_at": null
        },
        {
          "id": "conv_003_urgent_bug_email",
          "ticket_id": "SUP-1001",
          "channel": "email",
          "subject": "[URGENT] Dashboard error for all users",
          "customer_email": "ops@saas-co.test",
          "customer_full_name": "Morgan Ops",
          "company_name": "SaaS Co",
          "tags": [
            "urgent",
            "bug",
            "production"
          ],
          "assigned_inbox_id": "support",
          "priority": "urgent",
          "first_customer_message_text": "Our dashboard shows an error and is not working for all of our users.",
          "messages": [
            {
              "id": "m1",
              "sender_type": "customer",
              "sender_id": "customer_ops",
              "text": "Our dashboard shows an error and is not working for all of our users.",
              "created_at": "2026-02-18T09:10:00Z"
            },
            {
              "id": "m2",
              "sender_type": "ai",
              "sender_id": "email_urgent_auto_reply_bot",
              "text": "Hi Morgan, weve logged your urgent request (Ticket SUP-1001). Our team will respond shortly.",
              "created_at": "2026-02-18T09:19:00Z"
            },
            {
              "id": "m3",
              "sender_type": "agent",
              "sender_id": "alex_support",
              "text": "Hi Morgan, we see the error and are rolling out a fix. Well update you within 30 minutes.",
              "created_at": "2026-02-18T09:25:00Z"
            },
            {
              "id": "m4",
              "sender_type": "agent",
              "sender_id": "alex_support",
              "text": "The issue is resolved now. Please refresh the dashboard and confirm.",
              "created_at": "2026-02-18T09:45:00Z"
            },
            {
              "id": "m5",
              "sender_type": "customer",
              "sender_id": "customer_ops",
              "text": "Confirmed, its working again. Thanks for the quick fix.",
              "created_at": "2026-02-18T09:50:00Z"
            }
          ],
          "ai_messages_percentage": 20,
          "ai_resolved": false,
          "resolution_channel": "human",
          "budget_estimate": 0,
          "source_bot_id": "email_urgent_auto_reply_bot",
          "created_at": "2026-02-18T09:10:00Z",
          "resolved_at": "2026-02-18T09:50:00Z"
        }
      ],
      "automation_actions": [
        {
          "id": "act_urgent_wait_10min",
          "automation_rule_id": "auto_urgent_support_reply",
          "action_type": "wait",
          "delay_minutes": 10,
          "position": 1
        },
        {
          "id": "act_urgent_generate_ai_reply",
          "automation_rule_id": "auto_urgent_support_reply",
          "action_type": "generate_ai_reply",
          "email_template_id": "urgent_support_ack",
          "sender_address": "support@demo-company.test",
          "subject_template": "[URGENT] Weve received your request (Ticket {{ticket_id}})",
          "body_template": "Hi {{customer_first_name}}, weve logged your urgent request (Ticket {{ticket_id}}). Our team will respond shortly.",
          "send_without_review": true,
          "position": 2
        },
        {
          "id": "act_standard_support_reply",
          "automation_rule_id": "auto_standard_support_reply",
          "action_type": "send_email",
          "email_template_id": "standard_support_ack",
          "sender_address": "support@demo-company.test",
          "subject_template": "Weve received your request (Ticket {{ticket_id}})",
          "body_template": "Hi {{customer_first_name}},\n\nThanks for reaching out. Weve received your request (Ticket {{ticket_id}}) and will get back to you shortly.\n\nBest,\nSupport Team",
          "send_without_review": true,
          "position": 1
        }
      ],
      "automations": [
        {
          "id": "auto_urgent_support_reply",
          "name": "Urgent email auto-reply",
          "description": "Sends an AI-generated acknowledgement for new urgent email conversations within 10 minutes.",
          "trigger_type": "new_conversation_created",
          "status": "active",
          "condition_group_ids": [
            "condgrp_channel_email",
            "condgrp_tag_urgent"
          ],
          "action_ids": [
            "act_urgent_wait_10min",
            "act_urgent_generate_ai_reply"
          ],
          "created_at": "2026-02-15T10:00:00Z",
          "updated_at": "2026-02-28T09:30:00Z"
        },
        {
          "id": "auto_standard_support_reply",
          "name": "Standard support acknowledgement",
          "description": "Sends a standard acknowledgement email for non-urgent support conversations.",
          "trigger_type": "new_conversation_created",
          "status": "inactive",
          "condition_group_ids": [
            "condgrp_channel_email",
            "condgrp_tag_not_urgent"
          ],
          "action_ids": [
            "act_standard_support_reply"
          ],
          "created_at": "2025-11-10T11:15:00Z",
          "updated_at": "2026-01-05T08:45:00Z"
        },
        {
          "id": "auto_sales_pricing_followup",
          "name": "Sales pricing follow-up draft",
          "description": "Drafts an AI-powered pricing follow-up email for conversations tagged with pricing or quote.",
          "trigger_type": "message_received",
          "status": "active",
          "condition_group_ids": [
            "condgrp_channel_email_or_chat",
            "condgrp_tag_pricing_or_quote"
          ],
          "action_ids": [
            "act_sales_pricing_followup_ai"
          ],
          "created_at": "2025-12-01T09:00:00Z",
          "updated_at": "2026-02-20T14:10:00Z"
        }
      ],
      "dashboard_widgets": [
        {
          "id": "widget_ai_resolution_30_days",
          "report_id": "report_ai_resolution_30_days",
          "title": "AI Resolution - 30 days",
          "row": 1,
          "column": 1,
          "width": 3,
          "created_at": "2026-02-28T12:10:00Z"
        },
        {
          "id": "widget_conversation_volume_30_days",
          "report_id": "report_conversation_volume_30_days",
          "title": "Conversation Volume - 30 days",
          "row": 1,
          "column": 4,
          "width": 3,
          "created_at": "2026-02-28T12:12:00Z"
        },
        {
          "id": "widget_channel_mix_overview",
          "report_id": "report_channel_mix_overview",
          "title": "Channel Mix Overview",
          "row": 2,
          "column": 1,
          "width": 6,
          "created_at": "2026-02-28T12:15:00Z"
        }
      ],
      "condition_groups": [
        {
          "id": "condgrp_channel_email",
          "owner_type": "automation_rule",
          "owner_id": "auto_urgent_support_reply",
          "logic_within_group": "and",
          "connector_with_previous": "none",
          "condition_ids": [
            "cond_channel_equals_email"
          ]
        },
        {
          "id": "condgrp_tag_urgent",
          "owner_type": "automation_rule",
          "owner_id": "auto_urgent_support_reply",
          "logic_within_group": "and",
          "connector_with_previous": "and",
          "condition_ids": [
            "cond_tags_contains_urgent"
          ]
        },
        {
          "id": "condgrp_tag_not_urgent",
          "owner_type": "automation_rule",
          "owner_id": "auto_standard_support_reply",
          "logic_within_group": "and",
          "connector_with_previous": "none",
          "condition_ids": [
            "cond_tags_not_contains_urgent"
          ]
        }
      ],
      "analytics_reports": [
        {
          "id": "report_ai_resolution_30_days",
          "name": "AI Resolution - 30 days",
          "description": "AI resolution rate by channel over the last 30 days for conversations where AI handled at least 80% of messages.",
          "report_type": "ai_performance",
          "primary_metric": "ai_resolution_rate",
          "secondary_metrics": [
            "ai_resolved_conversations"
          ],
          "date_range_type": "last_30_days",
          "filter_condition_group_id": "condgrp_report_ai_coverage_80",
          "group_by": [
            "channel"
          ],
          "sort_by_field": "ai_resolved_conversations",
          "sort_order": "descending",
          "is_pinned": true,
          "created_at": "2026-02-28T12:00:00Z",
          "updated_at": "2026-02-28T12:05:00Z"
        },
        {
          "id": "report_conversation_volume_30_days",
          "name": "Conversation Volume - 30 days",
          "description": "Total conversation volume by channel over the last 30 days.",
          "report_type": "conversations",
          "primary_metric": "conversation_volume",
          "secondary_metrics": [
            "ai_resolved_conversations"
          ],
          "date_range_type": "last_30_days",
          "group_by": [
            "channel"
          ],
          "sort_by_field": "conversation_volume",
          "sort_order": "descending",
          "is_pinned": true,
          "created_at": "2026-02-28T12:06:00Z",
          "updated_at": "2026-02-28T12:06:00Z"
        },
        {
          "id": "report_channel_mix_overview",
          "name": "Channel Mix Overview",
          "description": "Breakdown of conversation volume and AI-resolved conversations by channel.",
          "report_type": "conversations",
          "primary_metric": "conversation_volume",
          "secondary_metrics": [
            "ai_resolved_conversations",
            "ai_resolution_rate"
          ],
          "date_range_type": "last_30_days",
          "group_by": [
            "channel"
          ],
          "sort_by_field": "conversation_volume",
          "sort_order": "descending",
          "is_pinned": true,
          "created_at": "2026-02-28T12:07:00Z",
          "updated_at": "2026-02-28T12:07:00Z"
        }
      ],
      "routing_rules": [
        {
          "id": "routing_pricing_vs_technical",
          "name": "Pricing vs Technical Routing",
          "description": "Routes pricing-related messages to Sales with normal priority and technical issue messages to Support with high priority.",
          "status": "active",
          "evaluation_event": "on_first_customer_message",
          "schedule": "always_on",
          "scope": "global",
          "condition_group_ids": [
            "condgrp_route_pricing_keywords",
            "condgrp_route_technical_keywords"
          ],
          "branch_actions": [
            {
              "condition_group_id": "condgrp_route_pricing_keywords",
              "assign_inbox_id": "sales",
              "priority": "normal"
            },
            {
              "condition_group_id": "condgrp_route_technical_keywords",
              "assign_inbox_id": "support",
              "priority": "high"
            }
          ],
          "order": 1,
          "created_at": "2026-02-18T14:00:00Z",
          "updated_at": "2026-02-18T14:10:00Z"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:14:54.419168"
      }
    };

    // Copy all generated data into localStorage using storage keys
    const set = (key, value) => {
      localStorage.setItem(key, JSON.stringify(value || []));
    };

    set('channels', generatedData.channels);
    set('inboxes', generatedData.inboxes);
    set('bots', generatedData.bots);
    set('chat_message_templates', generatedData.chat_message_templates);
    set('email_templates', generatedData.email_templates);
    set('automations', generatedData.automations);
    set('automation_actions', generatedData.automation_actions);
    set('conversations', generatedData.conversations);
    set('routing_rules', generatedData.routing_rules);
    set('analytics_reports', generatedData.analytics_reports);
    set('dashboard_widgets', generatedData.dashboard_widgets);
    set('integrations', generatedData.integrations);
    set('knowledge_bases', generatedData.knowledge_bases);
    set('knowledge_base_articles', generatedData.knowledge_base_articles);
    set('knowledge_base_settings', generatedData.knowledge_base_settings);
    set('agents', generatedData.agents);
    set('pricing_plans', generatedData.pricing_plans);

    // Entities not present in Generated Data -> initialize as empty arrays
    set('bot_flow_steps', []);
    set('targeting_rules', []);
    set('condition_groups', generatedData.condition_groups || []);
    set('conditions', []);
    set('integration_field_mappings', []);
    set('trial_signups', []);
  }

  // Run all flow tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1ConfigureWebsiteLeadAssistant();
    this.testTask2UrgentEmailAutoReply();
    this.testTask3PricingVsTechnicalRouting();
    this.testTask4AiResolutionReport30Days();
    this.testTask5ConnectDemoCrmIntegration();
    this.testTask6KnowledgeBaseAiAnswers();
    this.testTask7SupportAgentAccessRestriction();
    this.testTask8CheapestAnnualAiPlanTrial();

    return this.results;
  }

  // Task 1: Configure AI website chatbot for US visitors and lead capture
  testTask1ConfigureWebsiteLeadAssistant() {
    const testName = 'Task 1 - Configure Website Lead Assistant bot';
    console.log('Testing:', testName);

    try {
      // Load existing bots and find Website Lead Assistant (from generated data)
      const botsOverview = this.logic.getBotsOverview();
      this.assert(Array.isArray(botsOverview), 'Bots overview should be an array');

      let websiteEntry = botsOverview.find(
        (entry) => entry.bot && entry.bot.name === 'Website Lead Assistant'
      );

      // If not present for some reason, create basics using builder state
      if (!websiteEntry) {
        const builderStateNew = this.logic.getBotBuilderState();
        const prodChannel = (builderStateNew.channels || []).find(
          (ch) => ch.name === 'Production Website'
        );
        this.assert(prodChannel, 'Production Website channel should exist');

        const createResult = this.logic.createOrUpdateBotBasics(
          null,
          'Website Lead Assistant',
          'website_chatbot',
          prodChannel.id,
          'Lead Generation',
          "Hi! Im your virtual assistant. I can help with pricing and demos. First, whats your full name, company, and work email?"
        );
        this.assert(createResult && createResult.success === true, 'Should create Website Lead Assistant bot');
        websiteEntry = {
          bot: createResult.bot,
          channel: prodChannel,
          status: createResult.bot.status,
          conversationsLast7Days: 0,
          aiResolutionRate: 0
        };
      }

      const botId = websiteEntry.bot.id;

      // Load builder state for this bot to get channels, inboxes, templates
      const builderState = this.logic.getBotBuilderState(botId);
      this.assert(builderState && builderState.bot, 'Bot builder state should load for Website Lead Assistant');

      const channels = builderState.channels || [];
      const productionChannel = channels.find((ch) => ch.name === 'Production Website');
      this.assert(productionChannel, 'Production Website channel should be available in builder state');

      // Update bot basics to ensure correct name, type, channel, and greeting
      const basicsResult = this.logic.createOrUpdateBotBasics(
        botId,
        'Website Lead Assistant',
        'website_chatbot',
        productionChannel.id,
        'Lead Generation',
        "Hi! Im your virtual assistant. I can help with pricing and demos. First, whats your full name, company, and work email?"
      );
      this.assert(basicsResult && basicsResult.success === true, 'Bot basics should be saved');
      const bot = basicsResult.bot;
      this.assert(bot.name === 'Website Lead Assistant', 'Bot name should be Website Lead Assistant');
      this.assert(bot.type === 'website_chatbot', 'Bot type should be website_chatbot');
      this.assert(bot.channel_id === productionChannel.id, 'Bot should be attached to Production Website channel');

      // Configure targeting: All visitors where country = United States
      const targetingResult = this.logic.configureBotTargetingRules(
        bot.id,
        'all_visitors',
        [
          {
            logicWithinGroup: 'and',
            connectorWithPrevious: 'none',
            conditions: [
              {
                field: 'country',
                operator: 'equals',
                value: 'United States',
                values: []
              }
            ]
          }
        ],
        true
      );
      this.assert(targetingResult && targetingResult.success === true, 'Targeting rules should be configured');
      this.assert(
        targetingResult.targetingRule &&
          targetingResult.targetingRule.base_audience === 'all_visitors',
        'Base audience should be all visitors'
      );

      // Configure conversation flow with required questions and high-budget routing
      const inboxes = builderState.inboxes || [];
      const salesInbox = inboxes.find((i) => i.name === 'Sales');
      const generalInbox = inboxes.find((i) => i.name === 'General');
      this.assert(salesInbox, 'Sales inbox should exist');
      this.assert(generalInbox, 'General inbox should exist');

      const flowResult = this.logic.configureBotFlow(bot.id, [
        {
          stepType: 'question',
          label: 'Full name',
          fieldKey: 'full_name',
          questionType: 'text',
          required: true,
          order: 1,
          promptText: 'What is your full name?'
        },
        {
          stepType: 'question',
          label: 'Company name',
          fieldKey: 'company_name',
          questionType: 'text',
          required: true,
          order: 2,
          promptText: 'What is your company name?'
        },
        {
          stepType: 'question',
          label: 'Work email',
          fieldKey: 'work_email',
          questionType: 'email',
          required: true,
          order: 3,
          promptText: 'What is your work email?'
        },
        {
          stepType: 'question',
          label: 'Estimated monthly budget (USD)',
          fieldKey: 'budget_estimate',
          questionType: 'numeric',
          required: false,
          order: 4,
          promptText: 'What is your estimated monthly budget (USD)?',
          conditionActions: [
            {
              comparisonOperator: 'greater_than',
              comparisonValue: 5000,
              actionType: 'assign_inbox',
              targetInboxId: salesInbox.id,
              targetPriority: 'normal'
            }
          ]
        }
      ]);

      this.assert(flowResult && flowResult.success === true, 'Bot flow should be configured');
      const steps = flowResult.steps || [];
      this.assert(steps.length >= 4, 'Bot flow should contain at least 4 steps');

      const fullNameStep = steps.find((s) => s.field_key === 'full_name' || s.fieldKey === 'full_name');
      const companyStep = steps.find((s) => s.field_key === 'company_name' || s.fieldKey === 'company_name');
      const emailStep = steps.find((s) => s.field_key === 'work_email' || s.fieldKey === 'work_email');
      const budgetStep = steps.find((s) => s.field_key === 'budget_estimate' || s.fieldKey === 'budget_estimate');

      this.assert(fullNameStep && fullNameStep.required === true, 'Full name question should be required');
      this.assert(companyStep && companyStep.required === true, 'Company name question should be required');
      this.assert(emailStep && emailStep.required === true, 'Work email question should be required');
      this.assert(!!budgetStep, 'Budget estimate question should exist');

      const condActions = budgetStep.condition_actions || budgetStep.conditionActions || [];
      const highBudgetAction = condActions.find(
        (a) =>
          (a.comparison_operator === 'greater_than' || a.comparisonOperator === 'greater_than') &&
          (a.comparison_value === 5000 || a.comparisonValue === 5000)
      );
      this.assert(!!highBudgetAction, 'High-budget conditional action should exist');
      const targetInboxId = highBudgetAction.target_inbox_id || highBudgetAction.targetInboxId;
      this.assert(targetInboxId === salesInbox.id, 'High-budget leads should route to Sales inbox');

      // Configure availability and behavior (Mon-Fri 09:00-17:00, New York, offline message, new visitors only, repeat after 30 days)
      const offlineTemplates = builderState.offlineMessageTemplates || [];
      let offlineTemplate = offlineTemplates.find((t) => t.template_type === 'offline');
      if (!offlineTemplate && offlineTemplates.length > 0) {
        offlineTemplate = offlineTemplates[0];
      }
      this.assert(offlineTemplate, 'Offline message template should be available');

      const availabilityResult = this.logic.configureBotAvailabilityAndBehavior(
        bot.id,
        true,
        [
          { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 'tuesday', startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 'wednesday', startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 'thursday', startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 'friday', startTime: '09:00', endTime: '17:00' }
        ],
        'America/New_York',
        offlineTemplate.id,
        true,
        30
      );
      this.assert(availabilityResult && availabilityResult.success === true, 'Bot availability should be configured');

      // Ensure KB usage is enabled
      const kbUsageResult = this.logic.configureBotKnowledgeBaseUsage(
        bot.id,
        true,
        'knowledge_base_first_then_history'
      );
      this.assert(kbUsageResult && kbUsageResult.success === true, 'Bot KB usage should be configured');

      // Activate bot
      const activateResult = this.logic.activateBot(bot.id, 'active');
      this.assert(activateResult && activateResult.success === true, 'Bot should be activated');
      this.assert(activateResult.bot.status === 'active', 'Bot status should be active');

      // Final verification via overview
      const botsOverviewAfter = this.logic.getBotsOverview();
      const botAfter = botsOverviewAfter.find((entry) => entry.bot.id === bot.id);
      this.assert(botAfter, 'Website Lead Assistant should appear in bots overview');
      this.assert(
        botAfter.channel && botAfter.channel.id === productionChannel.id,
        'Bot should be attached to Production Website channel in overview'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Automation for urgent email auto-reply within 10 minutes
  testTask2UrgentEmailAutoReply() {
    const testName = 'Task 2 - Urgent email auto-reply automation';
    console.log('Testing:', testName);

    try {
      // Initialize automation editor for a new rule
      const editorState = this.logic.getAutomationEditorState();
      this.assert(editorState && Array.isArray(editorState.emailTemplates), 'Automation editor state should load');

      const urgentTemplate = editorState.emailTemplates.find(
        (t) => t.name === 'Urgent support acknowledgement' || /Urgent support/i.test(t.name)
      );
      this.assert(urgentTemplate, 'Urgent support acknowledgement email template should be available');

      // Define actions: wait 10 minutes then generate AI reply
      const actions = [
        {
          actionType: 'wait',
          position: 1,
          delayMinutes: 10
        },
        {
          actionType: 'generate_ai_reply',
          position: 2,
          emailTemplateId: urgentTemplate.id,
          senderAddress: 'support@demo-company.test',
          subjectTemplate: '[URGENT] Weve received your request (Ticket {{ticket_id}})',
          bodyTemplate:
            'Hi {{customer_first_name}}, weve logged your urgent request (Ticket {{ticket_id}}). Our team will respond shortly.',
          sendWithoutReview: true
        }
      ];

      // Conditions: channel = email AND tags includes urgent
      const conditions = [
        {
          field: 'channel',
          operator: 'equals',
          value: 'email',
          values: []
        },
        {
          field: 'tags',
          operator: 'includes',
          value: 'urgent',
          values: []
        }
      ];

      const saveResult = this.logic.saveAutomationRule(
        null,
        'Urgent email auto-reply - Test',
        'Sends an AI-generated acknowledgement for new urgent email conversations within 10 minutes.',
        'new_conversation_created',
        'active',
        conditions,
        actions
      );

      this.assert(saveResult && saveResult.success === true, 'Automation rule should be saved');
      const rule = saveResult.automationRule;
      const savedActions = saveResult.actions || [];

      this.assert(rule.trigger_type === 'new_conversation_created', 'Trigger type should be new_conversation_created');
      this.assert(rule.status === 'active', 'Automation rule status should be active');

      const waitAction = savedActions.find(
        (a) => a.action_type === 'wait' || a.actionType === 'wait'
      );
      const generateAction = savedActions.find(
        (a) => a.action_type === 'generate_ai_reply' || a.actionType === 'generate_ai_reply'
      );

      this.assert(waitAction, 'Wait action should exist');
      this.assert(
        waitAction.delay_minutes === 10 || waitAction.delayMinutes === 10,
        'Wait duration should be 10 minutes'
      );

      this.assert(generateAction, 'Generate AI reply action should exist');
      const genTemplateId = generateAction.email_template_id || generateAction.emailTemplateId;
      this.assert(genTemplateId === urgentTemplate.id, 'Generate action should use urgent support template');
      const sendWithoutReview =
        generateAction.send_without_review !== undefined
          ? generateAction.send_without_review
          : generateAction.sendWithoutReview;
      this.assert(sendWithoutReview === true, 'AI reply should be sent without human review');
      const subjectTemplate =
        generateAction.subject_template || generateAction.subjectTemplate || '';
      this.assert(
        subjectTemplate.indexOf('[URGENT]') !== -1,
        'Subject should contain [URGENT] prefix'
      );

      // Ensure rule can be toggled and appears in overview
      const toggleResult = this.logic.toggleAutomationStatus(rule.id, 'active');
      this.assert(toggleResult && toggleResult.success === true, 'Should be able to toggle automation to active');
      this.assert(toggleResult.automationRule.status === 'active', 'Toggled automation should be active');

      const overview = this.logic.getAutomationsOverview();
      this.assert(Array.isArray(overview), 'Automations overview should be an array');
      const overviewEntry = overview.find((e) => e.automationRule.id === rule.id);
      this.assert(overviewEntry, 'Urgent email auto-reply - Test should appear in overview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Routing rule for pricing vs technical messages
  testTask3PricingVsTechnicalRouting() {
    const testName = 'Task 3 - Pricing vs Technical Routing rule';
    console.log('Testing:', testName);

    try {
      // Initialize routing rule editor to obtain inboxes
      const editorState = this.logic.getRoutingRuleEditorState();
      this.assert(editorState && Array.isArray(editorState.inboxes), 'Routing rule editor state should load');

      const inboxes = editorState.inboxes;
      const salesInbox = inboxes.find((i) => i.name === 'Sales');
      const supportInbox = inboxes.find((i) => i.name === 'Support');
      this.assert(salesInbox, 'Sales inbox should be available');
      this.assert(supportInbox, 'Support inbox should be available');

      // Condition groups for pricing and technical keywords
      const conditionGroups = [
        {
          groupIndex: 0,
          logicWithinGroup: 'or',
          connectorWithPrevious: 'none',
          conditions: [
            {
              field: 'message_text',
              operator: 'contains_any_of',
              value: '',
              values: ['price', 'pricing', 'quote']
            }
          ]
        },
        {
          groupIndex: 1,
          logicWithinGroup: 'or',
          connectorWithPrevious: 'or',
          conditions: [
            {
              field: 'message_text',
              operator: 'contains_any_of',
              value: '',
              values: ['bug', 'error', 'not working']
            }
          ]
        }
      ];

      const branchActions = [
        {
          conditionGroupIndex: 0,
          targetInboxId: salesInbox.id,
          priority: 'normal'
        },
        {
          conditionGroupIndex: 1,
          targetInboxId: supportInbox.id,
          priority: 'high'
        }
      ];

      const saveResult = this.logic.saveRoutingRule(
        null,
        'Pricing vs Technical Routing - Test',
        'Routes pricing keywords to Sales (normal) and technical issues to Support (high).',
        'active',
        'on_first_customer_message',
        'always_on',
        'global',
        conditionGroups,
        branchActions,
        1
      );

      this.assert(saveResult && saveResult.success === true, 'Routing rule should be saved');
      const rule = saveResult.routingRule;
      this.assert(rule.status === 'active', 'Routing rule should be active');
      this.assert(
        rule.evaluation_event === 'on_first_customer_message',
        'Evaluation event should be on_first_customer_message'
      );
      this.assert(rule.schedule === 'always_on', 'Routing rule schedule should be always_on');
      this.assert(rule.scope === 'global', 'Routing rule scope should be global');

      // Verify it appears in overview
      const overview = this.logic.getRoutingRulesOverview();
      this.assert(Array.isArray(overview), 'Routing rules overview should be an array');
      const overviewRule = overview.find((r) => r.id === rule.id);
      this.assert(overviewRule, 'New routing rule should appear in overview');

      // Reorder rules so this one is first
      const orderedRuleIds = [rule.id].concat(
        overview.filter((r) => r.id !== rule.id).map((r) => r.id)
      );

      const reorderResult = this.logic.reorderRoutingRules(orderedRuleIds);
      this.assert(reorderResult && reorderResult.success === true, 'Routing rules should be reorderable');
      const reorderedList = reorderResult.routingRules || [];
      this.assert(reorderedList[0].id === rule.id, 'New rule should be first in evaluation order');

      // Ensure status remains active
      const toggleResult = this.logic.toggleRoutingRuleStatus(rule.id, 'active');
      this.assert(toggleResult && toggleResult.success === true, 'Should be able to toggle routing rule to active');
      this.assert(toggleResult.routingRule.status === 'active', 'Routing rule status should be active');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Analytics report for 30-day AI resolution rate by channel
  testTask4AiResolutionReport30Days() {
    const testName = 'Task 4 - AI Resolution - 30 days report';
    console.log('Testing:', testName);

    try {
      // Initialize report builder
      const builderState = this.logic.getAnalyticsReportBuilderState();
      this.assert(builderState, 'Analytics report builder state should load');

      const availableReportTypes = builderState.availableReportTypes || [];
      const availableMetrics = builderState.availableMetrics || [];
      const availableGroupBy = builderState.availableGroupByDimensions || [];

      this.assert(
        availableReportTypes.includes('ai_performance'),
        'ai_performance should be an available report type'
      );
      this.assert(
        availableMetrics.includes('ai_resolution_rate'),
        'ai_resolution_rate should be an available metric'
      );
      this.assert(
        availableMetrics.includes('ai_resolved_conversations'),
        'ai_resolved_conversations should be an available metric'
      );
      this.assert(availableGroupBy.includes('channel'), 'channel should be an available group-by dimension');

      // Configure report definition
      const filterConditionGroup = {
        logicWithinGroup: 'and',
        conditions: [
          {
            field: 'ai_coverage',
            operator: 'greater_than_or_equal',
            value: '80'
          }
        ]
      };

      const saveResult = this.logic.saveAnalyticsReport(
        null,
        'AI Resolution - 30 days - Test',
        'AI resolution rate by channel over last 30 days with AI coverage >= 80%.',
        'ai_performance',
        'ai_resolution_rate',
        ['ai_resolved_conversations'],
        'last_30_days',
        null,
        null,
        filterConditionGroup,
        ['channel'],
        'ai_resolved_conversations',
        'descending',
        true
      );

      this.assert(saveResult && saveResult.success === true, 'Analytics report should be saved');
      const report = saveResult.report;
      const widget = saveResult.dashboardWidget;

      this.assert(report.name === 'AI Resolution - 30 days - Test', 'Report name should match');
      this.assert(report.report_type === 'ai_performance', 'Report type should be ai_performance');
      this.assert(report.primary_metric === 'ai_resolution_rate', 'Primary metric should be AI resolution rate');
      this.assert(report.date_range_type === 'last_30_days', 'Date range should be last_30_days');
      this.assert(Array.isArray(report.group_by) && report.group_by.includes('channel'), 'Report should be grouped by channel');
      this.assert(report.sort_by_field === 'ai_resolved_conversations', 'Report should sort by AI-resolved conversations');
      this.assert(report.sort_order === 'descending', 'Sort order should be descending');
      this.assert(report.is_pinned === true, 'Report should be pinned to dashboard');

      this.assert(widget && widget.report_id === report.id, 'Dashboard widget should reference the report');

      // Move widget to top row, first column
      const layoutResult = this.logic.updateDashboardWidgetLayout(
        widget.id,
        1,
        1,
        widget.width || 3
      );
      this.assert(layoutResult && layoutResult.success === true, 'Widget layout should be updatable');

      // Verify via dashboard
      const dashboard = this.logic.getAnalyticsDashboard();
      this.assert(dashboard && Array.isArray(dashboard.widgets), 'Analytics dashboard should load widgets');
      const widgetEntry = dashboard.widgets.find((w) => w.widget.id === widget.id);
      this.assert(widgetEntry, 'Pinned AI Resolution widget should appear on dashboard');
      this.assert(widgetEntry.widget.row === 1, 'AI Resolution widget should be on top row');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Connect Demo CRM Sandbox and map contact fields
  testTask5ConnectDemoCrmIntegration() {
    const testName = 'Task 5 - Connect Demo CRM Sandbox integration';
    console.log('Testing:', testName);

    try {
      const integrations = this.logic.getIntegrationsOverview();
      this.assert(Array.isArray(integrations), 'Integrations overview should be an array');

      const demoCrm = integrations.find(
        (i) => i.name === 'Demo CRM Sandbox' || i.provider_key === 'demo_crm_sandbox'
      );
      this.assert(demoCrm, 'Demo CRM Sandbox integration should exist');

      const integrationId = demoCrm.id;

      // Load config state to see available fields
      const configState = this.logic.getIntegrationConfigState(integrationId);
      this.assert(configState && configState.integration, 'Integration config state should load');

      const platformFields = configState.availablePlatformFields || [];
      const crmFieldsByObject = configState.availableCrmFieldsByObject || {};

      this.assert(platformFields.includes('Customer email'), 'Platform field Customer email should be available');
      this.assert(platformFields.includes('Customer full name'), 'Platform field Customer full name should be available');
      this.assert(platformFields.includes('Company name'), 'Platform field Company name should be available');

      const contactFields = crmFieldsByObject.contact || [];
      const accountFields = crmFieldsByObject.account || [];
      this.assert(contactFields.includes('Contact Email'), 'CRM Contact Email field should be available');
      this.assert(contactFields.includes('Contact Name'), 'CRM Contact Name field should be available');
      this.assert(accountFields.includes('Account Name'), 'CRM Account Name field should be available');

      // Configure integration: API key, sandbox, sync, auto-create, field mappings
      const fieldMappings = [
        {
          platformField: 'Customer email',
          crmObjectType: 'contact',
          crmField: 'Contact Email',
          isPrimary: true
        },
        {
          platformField: 'Customer full name',
          crmObjectType: 'contact',
          crmField: 'Contact Name',
          isPrimary: true
        },
        {
          platformField: 'Company name',
          crmObjectType: 'account',
          crmField: 'Account Name',
          isPrimary: true
        }
      ];

      const configureResult = this.logic.configureCrmIntegration(
        integrationId,
        'TEST-1234',
        'sandbox',
        true,
        true,
        fieldMappings
      );

      this.assert(configureResult && configureResult.success === true, 'CRM integration should be configured');
      const integration = configureResult.integration;
      const mappings = configureResult.fieldMappings || [];

      this.assert(integration.status === 'connected', 'Integration status should be connected');
      this.assert(integration.environment === 'sandbox', 'Integration environment should be sandbox');
      this.assert(integration.sync_new_conversations === true, 'Sync new conversations should be enabled');
      this.assert(integration.auto_create_contacts === true, 'Auto-create contacts should be enabled');
      this.assert(integration.api_key === 'TEST-1234', 'API key should be stored as TEST-1234');

      this.assert(mappings.length >= 3, 'At least 3 field mappings should be stored');
      const emailMapping = mappings.find((m) => m.platform_field === 'Customer email');
      const nameMapping = mappings.find((m) => m.platform_field === 'Customer full name');
      const companyMapping = mappings.find((m) => m.platform_field === 'Company name');

      this.assert(emailMapping && emailMapping.crm_field === 'Contact Email', 'Customer email should map to Contact Email');
      this.assert(nameMapping && nameMapping.crm_field === 'Contact Name', 'Customer full name should map to Contact Name');
      this.assert(companyMapping && companyMapping.crm_field === 'Account Name', 'Company name should map to Account Name');

      // Verify persistence via overview
      const integrationsAfter = this.logic.getIntegrationsOverview();
      const demoCrmAfter = integrationsAfter.find((i) => i.id === integration.id);
      this.assert(demoCrmAfter && demoCrmAfter.status === 'connected', 'Demo CRM Sandbox should be connected in overview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Knowledge base with 3 FAQ articles and AI answers enabled
  testTask6KnowledgeBaseAiAnswers() {
    const testName = 'Task 6 - Knowledge base FAQ articles and AI answers';
    console.log('Testing:', testName);

    try {
      const kbOverview = this.logic.getKnowledgeBaseOverview();
      this.assert(kbOverview && Array.isArray(kbOverview.knowledgeBases), 'Knowledge base overview should load');

      const mainKb = kbOverview.knowledgeBases.find(
        (kb) => kb.name === 'Main Knowledge Base' || kb.default_visibility === 'public'
      );
      this.assert(mainKb, 'Main Knowledge Base should exist');

      const kbId = mainKb.id;

      const articlesState = this.logic.getKnowledgeBaseArticles(kbId);
      this.assert(articlesState && Array.isArray(articlesState.articles), 'KB articles should load');

      const articles = articlesState.articles;
      const pricingArticle = articles.find((a) => /pricing/i.test(a.title));
      const trialArticle = articles.find((a) => /trial/i.test(a.title));
      const supportHoursArticle = articles.find((a) => /support hours/i.test(a.title));

      this.assert(pricingArticle, 'Pricing article should exist');
      this.assert(trialArticle, 'Trial article should exist');
      this.assert(supportHoursArticle, 'Support hours article should exist');

      this.assert(pricingArticle.visibility === 'public', 'Pricing article should be public');
      this.assert(trialArticle.visibility === 'public', 'Trial article should be public');
      this.assert(supportHoursArticle.visibility === 'public', 'Support hours article should be public');

      // Update one article via API to exercise article update flow
      const updateResult = this.logic.createOrUpdateKnowledgeBaseArticle(
        pricingArticle.id,
        kbId,
        pricingArticle.title,
        pricingArticle.content,
        pricingArticle.visibility,
        pricingArticle.keywords || ['pricing'],
        'published'
      );
      this.assert(updateResult && updateResult.success === true, 'KB article update should succeed');

      // Verify KB settings for AI answers
      const kbSettings = this.logic.getKnowledgeBaseSettingsState(kbId);
      this.assert(kbSettings, 'Knowledge base settings should load');

      // Ensure AI answers are enabled and KB-first preference is set
      const updatedSettings = this.logic.updateKnowledgeBaseSettings(
        kbId,
        true,
        'knowledge_base_first_then_history',
        true
      );
      this.assert(updatedSettings.use_for_ai_answers === true, 'Use for AI answers should be enabled');
      this.assert(
        updatedSettings.preferred_source === 'knowledge_base_first_then_history',
        'Preferred source should be KB first, then history'
      );
      this.assert(updatedSettings.apply_to_bots === true, 'Settings should apply to bots');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Support agent user restricted to Support inbox with working hours
  testTask7SupportAgentAccessRestriction() {
    const testName = 'Task 7 - Support agent access and working hours';
    console.log('Testing:', testName);

    try {
      const overview = this.logic.getUsersAndTeamOverview();
      this.assert(overview && Array.isArray(overview.agents), 'Users & team overview should load');

      const agents = overview.agents;
      const alex = agents.find((a) => a.email === 'alex.support@example.test');
      this.assert(alex, 'Agent Alex Support should exist');

      this.assert(alex.role === 'agent', 'Alex role should be agent');
      this.assert(
        Array.isArray(alex.assigned_inbox_ids) && alex.assigned_inbox_ids.length === 1,
        'Alex should be assigned to exactly one inbox'
      );

      const supportInbox = (overview.inboxes || []).find((i) => i.name === 'Support');
      this.assert(supportInbox, 'Support inbox should exist');
      this.assert(
        alex.assigned_inbox_ids.includes(supportInbox.id),
        'Alex should be assigned only to Support inbox'
      );

      this.assert(alex.working_hours_type === 'custom', 'Alex should use custom working hours');
      const wh = alex.working_hours || [];
      const days = wh.map((d) => d.day_of_week || d.dayOfWeek);
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
        const entry = wh.find(
          (d) => (d.day_of_week || d.dayOfWeek) === day
        );
        this.assert(entry, 'Working hours should include ' + day);
        const start = entry.start_time || entry.startTime;
        const end = entry.end_time || entry.endTime;
        this.assert(start === '08:00', day + ' start time should be 08:00');
        this.assert(end === '16:00', day + ' end time should be 16:00');
      });

      // Verify Alex is listed under Support inbox team members
      const inboxSettings = this.logic.getInboxSettings(supportInbox.id);
      this.assert(inboxSettings && Array.isArray(inboxSettings.teamMembers), 'Support inbox settings should load');

      let isMember = inboxSettings.teamMembers.some((m) => m.id === alex.id);

      // If not yet assigned in inbox settings, add Alex via updateInboxTeamMembers
      if (!isMember) {
        const updatedMemberIds = inboxSettings.teamMembers.map((m) => m.id).concat([alex.id]);
        const updateResult = this.logic.updateInboxTeamMembers(
          supportInbox.id,
          updatedMemberIds
        );
        this.assert(updateResult && updateResult.success === true, 'Inbox team members should be updatable');
        isMember = (updateResult.teamMembers || []).some((m) => m.id === alex.id);
      }

      this.assert(isMember, 'Alex should be listed as a Support inbox team member');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose cheapest annual AI plan with >=5 seats and start trial
  testTask8CheapestAnnualAiPlanTrial() {
    const testName = 'Task 8 - Cheapest annual AI plan trial signup';
    console.log('Testing:', testName);

    try {
      const plans = this.logic.getPricingPlans('annual');
      this.assert(Array.isArray(plans), 'Annual pricing plans should load');

      // Filter: under $400/month, includes AI assistant, at least 5 seats
      const eligiblePlans = plans.filter(
        (p) =>
          typeof p.price_per_month === 'number' &&
          p.price_per_month < 400 &&
          p.includes_ai_assistant === true &&
          p.included_seats >= 5
      );
      this.assert(eligiblePlans.length > 0, 'There should be at least one eligible annual AI plan under $400 with >=5 seats');

      // Choose the cheapest eligible plan based on actual data
      let cheapestPlan = eligiblePlans[0];
      eligiblePlans.forEach((p) => {
        if (p.price_per_month < cheapestPlan.price_per_month) {
          cheapestPlan = p;
        }
      });

      // Start trial for selected plan
      const trialStart = this.logic.startTrialForPlan(cheapestPlan.id);
      this.assert(trialStart && trialStart.plan && trialStart.trialSignup, 'Trial should start for selected plan');

      const plan = trialStart.plan;
      const trial = trialStart.trialSignup;

      this.assert(plan.id === cheapestPlan.id, 'Returned plan should match selected cheapest plan');
      this.assert(trial.plan_id === cheapestPlan.id, 'Trial signup should reference the selected plan');

      // Submit trial signup form with required fields
      const submitResult = this.logic.submitTrialSignupForm(
        trial.id,
        'Example AI Customer Co',
        '51_100',
        'owner@example.test',
        'Owner',
        true
      );

      this.assert(submitResult, 'Trial signup submission should return updated record');
      this.assert(
        submitResult.company_name === 'Example AI Customer Co',
        'Company name should be stored from trial form'
      );
      this.assert(
        submitResult.company_size === '51_100',
        'Company size should be set to 51_100 (51–100 employees)'
      );
      this.assert(
        submitResult.email === 'owner@example.test',
        'Owner email should be stored from trial form'
      );
      this.assert(submitResult.use_ai_features === true, 'Use AI features flag should be enabled');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result-recording methods
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('[32m                                           ');
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
