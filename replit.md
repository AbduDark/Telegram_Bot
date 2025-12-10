# Overview

This project is a Mastra-based AI agent system featuring a Telegram bot for phone number lookups, supported by a dynamic subscription system. It operates in two modes: a full-featured Development Mode with Mastra and a lightweight Production Mode using an Express server. The system includes an admin panel for management and integrates with Telegram Stars for payments. The core business vision is to provide efficient and accessible phone number lookup services with tiered access and a robust payment and referral system.

## Project Ambitions
- To provide a reliable and scalable phone number lookup service via Telegram.
- To offer a flexible subscription model (VIP/Regular) with integrated Telegram Stars payments.
- To implement a referral system to drive user acquisition and engagement.
- To provide a comprehensive admin panel for easy management and monitoring.
- To support both development and production environments with feature parity.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework & Deployment
The system is built with TypeScript and utilizes the **Mastra Framework** for AI agent orchestration, workflows, and tools in **Development Mode**. For **Production Mode**, a lightweight Express server handles Telegram webhooks directly. Both modes maintain full feature parity.

## UI/UX Decisions
The **Admin Panel** is built with React and Tailwind CSS, featuring an Arabic RTL interface and a Black (#000000) + Gold (#D4AF37) color scheme for a professional and localized user experience.

## AI Agent Architecture
Mastra's Agent primitive is used to create AI-powered assistants. Agents combine LLM models with tools and instructions, supporting multi-provider LLMs (OpenAI, Groq, OpenRouter) and optional conversation memory (LibSQL). The primary agent is the `Telegram Bot Agent`, specialized in Arabic phone number lookups.

## Workflow Architecture
Inngest-integrated workflows orchestrate multi-step processes with typed data flows, validated by Zod schemas. Workflows support sequential, parallel, conditional, and looping execution, with state persistence in PostgreSQL for reliability. Key workflows include the `Telegram Bot Workflow` for message processing and lookup.

## Tool System
Typed, reusable tools extend agent capabilities. All tool inputs/outputs are strictly validated with Zod schemas. The `Phone Lookup Tool` is a core component, normalizing phone numbers and searching across various tables.

## Trigger System & Webhooks
API-based triggers route external events to workflows. Telegram webhooks are automatically configured on server startup (using `/api/webhooks/telegram/action` for Mastra, `/webhook` for production) to process incoming messages, callback queries, and pre-checkout queries.

## Payment Integration
The system integrates with **Telegram Stars** for subscription management. It handles `pre_checkout_query` for payment validation and `successful_payment` for automatic subscription activation (VIP/Regular, 1, 3, 6, 12 months), updating the `user_subscriptions` table and sending confirmations.

## Data Storage
A **unified MySQL database** manages user subscriptions and lookup data. Dynamic table access is implemented based on subscription type: Regular users access `facebook_accounts`, while VIP users access `facebook_accounts`, `contacts`, and other designated tables. PostgreSQL is used for workflow state management.

## Logging & Observability
**Pino** provides structured JSON logging with configurable levels and context propagation. **OpenTelemetry** is integrated for distributed tracing, and the Inngest Dashboard offers real-time workflow monitoring.

## Admin Panel Features
The Admin Panel provides:
- **Dashboard**: Real-time statistics (users, subscriptions, revenue, searches).
- **User Management**: View and manage user profiles.
- **Subscriptions**: Manage VIP/Regular subscriptions.
- **Referral System**: Monitor referral statistics.
- **Search History**: Browse user search logs.
- **Settings**: Configure admin credentials.

# External Dependencies

## LLM Providers
- **OpenAI**: Primary LLM provider (GPT-4, GPT-4o-mini).
- **Groq**: Fast inference provider.
- **OpenRouter**: Multi-provider gateway.
- **Vercel AI SDK**: Unified interface for LLM providers.

## Workflow & Event Infrastructure
- **Inngest**: Event-driven workflow orchestration and execution.
- **Mastra Inngest Adapter**: Integration with Inngest.
- **Real-time Updates**: WebSocket-based monitoring via `@inngest/realtime`.

## Database & Storage
- **MySQL**: Main relational database for application data.
- **PostgreSQL Client (pg)**: For workflow state management.
- **Mastra PostgreSQL Adapter**: For PostgreSQL integration.
- **LibSQL**: Optional SQLite-compatible storage.

## Telegram Integration
- Direct HTTP calls to Telegram Bot API for webhook-based communication.

## Development Tools
- **Mastra CLI**: Development server and build tools.
- **TSX**: TypeScript execution.
- **Prettier**: Code formatting.
- **TypeScript**: Type checking and compilation.

## Monitoring & Observability
- **Pino**: Structured JSON logging.
- **OpenTelemetry**: Distributed tracing.

## Utilities & Libraries
- **Zod**: Schema validation.
- **Exa-js**: Search API client.
- **Dotenv**: Environment variable management.