# Stage 15: WhatsApp Agent, Reporting

## Objective
Build an AI-powered conversational interface over WhatsApp that allows admins to query live business data directly from their phones.

## Work Completed

1. **Environment & Dependencies**
   - Installed the `ai`, `@ai-sdk/anthropic`, and `twilio` packages.
   
2. **Database Schema (`supabase/migrations/13_whatsapp_agent.sql`)**
   - Added a `whatsapp_number` field to the `app_users` table for securely linking incoming messages to admin profiles.
   - Created a `whatsapp_sessions` table to track conversational context (memory) for each user so Claude understands follow-up questions.

3. **Twilio Webhook (`app/api/whatsapp/route.ts`)**
   - Set up the main endpoint to receive incoming POST requests from the Twilio WhatsApp API.
   - Implemented a strict security check: if the incoming phone number is not attached to an active Admin in `app_users`, the system rejects the query and responds with an "Unauthorized" message.

4. **Claude AI Agent (`lib/ai/whatsapp-agent.ts`)**
   - Wired up the Vercel AI SDK to use `claude-3-5-sonnet-20240620`.
   - Supplied the agent with three Read-Only tools using Zod:
     - `get_metrics`: Queries the `prescriptions` table to calculate today's revenue and transaction counts.
     - `get_catalog`: Checks `drugs` and `batches` for stock levels.
     - `get_orders`: Retrieves the 10 most recent `otc_orders`.
   - Built a state-management wrapper to fetch previous messages from `whatsapp_sessions`, append the new query, and save Claude's response back to the database.

## Next Steps
We are now fully prepared for **Stage 16: WhatsApp Agent, Actions**, where we will add the ability for Claude to execute real, state-changing commands (like restocking drugs) with a confirmation step.
