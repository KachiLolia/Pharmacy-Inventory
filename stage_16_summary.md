# Stage 16: WhatsApp Agent, Actions

## Objective
Enable the AI Agent to perform real, state-changing actions directly against the database from WhatsApp, while enforcing strict confirmation guardrails and detailed audit logging.

## Work Completed

1. **AI SDK & Model Update**
   - Installed `@ai-sdk/google` and successfully migrated the agent to use `gemini-1.5-flash` to take advantage of the free API key.

2. **Action Tools (`lib/ai/whatsapp-agent.ts`)**
   - Added `add_drug`: Creates a new drug in the `drugs` table.
   - Added `restock_drug`: Creates a new batch record connected to an existing drug.
   - Added `update_price`: Updates or inserts a record in `otc_listings` to override the online price.
   - Added `archive_drug`: Soft-deletes a drug by setting `is_active` to false.

3. **Confirmation-before-Execute Workflow**
   - Updated the `SYSTEM_PROMPT` to enforce the safety flow requested in PRD Section 5.2.
   - If a user attempts to change data, Gemini is strictly instructed to **NOT** execute the tool immediately. Instead, it must summarize the intended action to the user (e.g., "You want to restock Paracetamol by 50 units. Reply YES to confirm") and wait. It uses the `whatsapp_sessions` memory context to verify the user's explicit confirmation in the subsequent message before triggering the tool.

4. **Audit Logging Integration**
   - Every executed action writes directly to the `audit_logs` table.
   - We inject `{ channel: 'whatsapp' }` into the `details` JSONB column for every action, meaning any changes made by the AI can be clearly distinguished from changes made via the dashboard.

## Next Steps
We are now ready for **Stage 17: Hardening**, which includes enabling the regulatory PCN licence fields for the public storefront and doing a final security review of the shared stock functions!
