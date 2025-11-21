# Overview

This is a Mastra-based AI agent system built with TypeScript, featuring a Telegram bot that performs phone number lookups with a dynamic subscription system. The project supports **two deployment modes**:

1. **Development Mode** (with Mastra): Full Mastra playground, agents, workflows, and monitoring tools for development and testing
2. **Production Mode** (without Mastra): Lightweight Express server with direct Telegram webhook handling for production deployment on VPS/dedicated servers

The system uses a single unified database with dynamic table access based on subscription type:
- **Regular users**: Search only in facebook_accounts table
- **VIP users**: Search in all available tables (facebook_accounts, contacts, and any future tables)
- **Payments**: Integrated with Telegram Stars for automatic subscription activation

## Deployment Modes

### Development Mode (`npm run dev`)
- **Mastra Playground UI** on port 5000
- Full agent and workflow monitoring
- Real-time debugging and testing tools
- Inngest workflow orchestration
- Best for: Local development, testing, and experimentation

### Production Mode (`npm start` or `npm run start:prod`)
- **Lightweight Express server** with Telegram webhooks
- Direct bot API integration (node-telegram-bot-api)
- No Mastra UI overhead
- Optimized for production deployment
- Best for: VPS, dedicated servers, and production environments

### Architecture Files
- **Development**: Uses Mastra framework (`src/mastra/` directory)
- **Production**: Uses standalone server (`src/production-server.ts` + `src/bot/` handlers)
- **Shared**: Database layer (`src/mastra/config/database.ts`) used by both modes

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Mastra Framework**: Central orchestration layer providing agents, workflows, tools, and memory management
- **Inngest Integration**: Event-driven workflow execution with retry logic, step memoization, and real-time monitoring
- **TypeScript + ES Modules**: Modern JavaScript with full type safety throughout

## Agent Architecture
The system uses Mastra's Agent primitive to create AI-powered assistants:

- **Agent Configuration**: Agents combine LLM models with tools and instructions
- **Tool Calling**: Agents can execute predefined tools (functions) with typed inputs/outputs
- **Multi-Provider Support**: OpenAI (GPT-4), Groq, and OpenRouter models supported
- **Memory System**: Optional conversation memory using LibSQL storage
- **Dynamic Agents**: Runtime context allows agents to modify their behavior, model selection, and available tools based on user properties

### Primary Agents
1. **Telegram Bot Agent** (`telegramBotAgent`): Arabic-speaking agent specialized in phone number lookups with structured response formatting
2. **Example Agent** (`exampleAgent`): Demonstration agent showing Mastra patterns with memory capabilities

## Workflow Architecture
Workflows orchestrate multi-step processes with typed data flows:

- **Step-Based Design**: Each step has validated input/output schemas (Zod)
- **Graph Execution**: Steps can execute sequentially (`.then()`), in parallel (`.parallel()`), conditionally (`.branch()`), or in loops (`.foreach()`, `.dowhile()`)
- **Suspend/Resume**: Workflows can pause at any step and resume later (human-in-the-loop pattern)
- **State Persistence**: Workflow snapshots stored in PostgreSQL for reliability
- **Inngest Runtime**: Production workflows run on Inngest with automatic retries and observability

### Key Workflows
- **Telegram Bot Workflow** (`telegramBotWorkflow`): Processes Telegram messages, validates phone numbers, executes agent lookup, and returns formatted results

## Tool System
Tools are typed, reusable functions that extend agent capabilities:

- **Zod Schema Validation**: All tool inputs/outputs are strictly typed
- **Context-Aware**: Tools receive validated context and can access Mastra integrations
- **Agent Integration**: Tools can be attached to agents or used directly in workflow steps
- **MCP Support**: Mastra supports Model Context Protocol (MCP) servers for extended tool capabilities

### Core Tools
1. **Phone Lookup Tool** (`phoneLookupTool`): Database query tool that normalizes phone numbers and searches across Facebook and Contacts tables with variant matching
2. **Example Tool** (`exampleTool`): Demonstration tool showing best practices

## Trigger System
API-based triggers route external events to workflows:

- **Telegram Triggers**: Webhook endpoint (`/webhooks/telegram/action`) processes incoming Telegram messages
- **Slack Triggers**: Framework for Slack integration (registered but not actively used)
- **Inngest Event Routing**: API routes automatically convert to Inngest event triggers in the middleware layer

## Payment Integration

### Telegram Stars
The system integrates with Telegram's built-in payment system (Telegram Stars) for subscription management:

#### Payment Webhooks
1. **Pre-checkout Handler** (`/webhooks/telegram/pre_checkout`)
   - Validates payment requests before processing
   - Automatically approves all valid pre-checkout queries
   - Returns approval to Telegram API via `answerPreCheckoutQuery`

2. **Successful Payment Handler** (`/webhooks/telegram/payment`)
   - Processes successful payments automatically
   - Extracts subscription type from `invoice_payload`:
     - Contains 'vip' → VIP subscription
     - Contains 'regular' → Regular subscription
   - Determines subscription duration (1, 3, 6, or 12 months)
   - Calls `addSubscription()` to activate/update user subscription
   - Sends confirmation message with subscription details in Arabic

#### Payment Flow
```
User initiates payment → Telegram sends pre_checkout_query 
→ System approves → User completes payment 
→ Telegram sends successful_payment → System activates subscription 
→ Confirmation sent to user
```

#### Subscription Activation
- Subscriptions are immediately activated upon successful payment
- System updates `user_subscriptions` table with:
  - Telegram user ID
  - Username
  - Subscription type (vip/regular)
  - Start and end dates
  - Active status
- User receives instant access to search features based on subscription level

## Data Storage

### MySQL Database (Unified)
- **Single Database Architecture**: All users (VIP and Regular) use the same database
- **Dynamic Table Access**: Access control based on subscription type via `TABLE_CONFIG`
  - Regular users: `facebook_accounts` table only
  - VIP users: `facebook_accounts` + `contacts` + future tables
- **Connection Pool**: Single MySQL connection pool managed by `dbPool`
- **Key Tables**:
  - `user_subscriptions`: Stores all subscription information (VIP and Regular)
  - `facebook_accounts`: Contains Facebook user data (name, phone, email, location, etc.)
  - `contacts`: Contains contact information (VIP only)
- **Extensibility**: New tables can be added to `TABLE_CONFIG.VIP_TABLES` for future expansion
- **Connection**: Configured via `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` environment variables

### PostgreSQL (Workflow Storage)
- `@mastra/pg` used only for workflow state management
- Stores workflow execution snapshots, step results, and suspend/resume state
- Configured via `DATABASE_URL` environment variable

### LibSQL (Optional)
- `@mastra/libsql` package available for SQLite-compatible embedded storage
- Currently configured but not actively used in production

## Logging & Observability

### Structured Logging
- **Pino Logger**: Production-grade JSON logging with configurable levels
- **Custom Logger Extension**: `ProductionPinoLogger` class extends Mastra's logger interface
- **Log Levels**: DEBUG, INFO, WARN, ERROR with ISO timestamp formatting
- **Context Propagation**: Logs include workflow IDs, step names, and execution context

### Telemetry & Monitoring
- **OpenTelemetry Integration**: Automatic instrumentation via `@opentelemetry/auto-instrumentations-node`
- **Trace Export**: OTLP gRPC and HTTP exporters configured for distributed tracing
- **Inngest Dashboard**: Real-time workflow execution monitoring with step-level visibility
- **Mastra Playground**: Local development UI for testing agents and workflows

## Runtime Context & Dependency Injection
Mastra's runtime context system enables:
- **Dynamic Configuration**: Pass runtime variables to agents and tools without code changes
- **Type-Safe Context**: Strongly-typed context objects defined with generics
- **User Personalization**: Configure agents based on user properties (tier, language, location)
- **API Integration**: Runtime context available in tool execution and workflow steps

## Error Handling Strategy

### Retry Logic
- **Inngest Workflows**: 3 retry attempts in production, 0 in development
- **Non-Retriable Errors**: `NonRetriableError` used for permanent failures
- **Graceful Degradation**: Missing phone numbers return user-friendly messages in Arabic

### Validation
- **Zod Schemas**: All data boundaries validated (workflow inputs, step outputs, tool parameters)
- **Phone Normalization**: Multiple format variants generated to maximize search success
- **Type Safety**: End-to-end TypeScript type checking

# External Dependencies

## LLM Providers
- **OpenAI**: Primary LLM provider (GPT-4, GPT-4o-mini) via `@ai-sdk/openai`
- **Groq**: Fast inference provider via `@ai-sdk/groq` (used by Telegram agent)
- **OpenRouter**: Multi-provider gateway via `@openrouter/ai-sdk-provider`
- **Vercel AI SDK**: Unified interface for all LLM providers (`ai` package)

## Workflow & Event Infrastructure
- **Inngest**: Event-driven workflow orchestration and execution (`inngest` + `@inngest/realtime`)
- **Mastra Inngest Adapter**: Integration layer (`@mastra/inngest`)
- **Real-time Updates**: WebSocket-based workflow monitoring via `@inngest/realtime`

## Database & Storage
- **PostgreSQL Client**: Native driver via `pg` package
- **Mastra PostgreSQL Adapter**: Workflow storage via `@mastra/pg`
- **LibSQL Support**: SQLite-compatible storage via `@mastra/libsql` (optional)

## Telegram Integration
- **Slack Web API**: `@slack/web-api` (Slack integration framework present but not primary)
- **Telegram Bot API**: Direct HTTP calls to Telegram (no dedicated SDK, webhook-based)

## Development Tools
- **Mastra CLI**: Development server and build tools (`mastra` package)
- **TSX**: TypeScript execution for Node.js (`tsx`)
- **Prettier**: Code formatting
- **TypeScript**: Type checking and compilation

## Monitoring & Observability
- **Pino**: Structured JSON logging (`pino`)
- **OpenTelemetry**: Distributed tracing and metrics collection
- **Mastra Loggers**: Framework logging integration (`@mastra/loggers`)

## Utilities & Libraries
- **Zod**: Schema validation (`zod`)
- **Exa-js**: Search API client (`exa-js`)
- **Dotenv**: Environment variable management (`dotenv`)

## Configuration Files
- Environment variables stored in `.env` (not in repository)
- TypeScript configuration: ES2022 target, ESM modules, bundler resolution
- Node.js version requirement: >=20.9.0