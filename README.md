# DineConnect — WhatsApp Restaurant Order Bot & Operations Dashboard

**DineConnect** is an automated restaurant order-taking bot and live operations dashboard. Customers interact via WhatsApp to browse categorized menus, check stock availability, customize items, and place confirmed orders. Restaurant staff manage live order flows, update menu offerings, toggle stock in real time, and inspect real-time WhatsApp conversation transcripts.

---

## Tech Stack & Architecture

- **Frontend / Dashboard**: Next.js (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Recharts
- **Agent Layer**: Official Google Agent Development Kit for TypeScript (`@google/adk` v2.0) + Gemini (`gemini-2.5-flash`)
- **WhatsApp Bridge**: Baileys v7 (`@whiskeysockets/baileys` 7.0.0-rc14) with multi-device file auth state and automatic reconnection
- **Database Layer**: SQLite with `better-sqlite3` (WAL mode enabled, multi-tenant schema, order idempotency, and customer uniqueness constraints)
- **API**: Next.js REST API routes reading directly from the local SQLite database

```
               [Customer WhatsApp]
                       │ (WhatsApp Protocol)
                       ▼
        [Baileys v7 Bot Service (Node Process)]
                       │ (ADK InMemoryRunner)
                       ▼
      [Google ADK LlmAgent + Gemini 2.5 Flash]
                       │ (FunctionTools)
                       ▼
             [SQLite DB (better-sqlite3)]
                       ▲
                       │ (REST API Routes)
                       ▼
        [Next.js Operations Dashboard UI]
```

---

## Getting Started

### 1. Prerequisites
- **Node.js 20.0.0 or later**
- **npm**
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Environment Configuration
Copy `.env.example` to `.env` and provide your Google Gemini API key:

```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DEFAULT_RESTAURANT_ID=burger-joint
SQLITE_DB_PATH=./data/dineconnect.db
ENABLE_WHATSAPP=true
WHATSAPP_AUTH_DIR=./data/whatsapp-auth
```

### 3. Seed Database
Initialize the SQLite schema and seed "The Burger Joint" (`burger-joint`) with sample burgers, sides, drinks, desserts, test customers, and initial orders:

```bash
npm run db:seed
```

### 4. Run the Dashboard
Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running the WhatsApp Bot

The WhatsApp socket runs as a persistent background Node service:

```bash
npm run bot
```

### Linking WhatsApp (QR Scan Flow)
1. On first run, a QR code will be rendered in your terminal.
2. Open WhatsApp on your mobile phone.
3. Go to **Settings > Linked devices > Link a device**.
4. Scan the QR code in the terminal.
5. Once connected, credentials are saved in `./data/whatsapp-auth`. Subsequent restarts connect automatically without re-scanning.

---

## Testing the Agent in Isolation

You can run the ADK order agent test suite against Gemini directly without linking WhatsApp:

```bash
npm run test:agent
```

This verifies:
1. Category-specific menu retrieval via `get_menu`.
2. Out-of-stock item handling and automatic alternative recommendations via `check_item_availability`.
3. Disambiguation on incomplete inputs.
4. Mid-order modifications and cart recalculations via `calculate_order_total`.
5. Address confirmation and atomic order persistence via `save_order`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js dashboard at `http://localhost:3000` |
| `npm run bot` | Starts the standalone Baileys WhatsApp bot process |
| `npm run db:seed` | Initializes schema and seeds restaurant, menu, and sample orders |
| `npm run test:agent` | Runs ADK Agent isolation tests |
| `npm run build` | Compiles Next.js production build |
| `npm start` | Starts Next.js production server |

---

## REST API Endpoints

- `GET /api/stats?restaurantId=burger-joint` — Dashboard KPIs, live service flow status counts, and top items
- `GET /api/orders?restaurantId=burger-joint&status=confirmed` — List orders with filters
- `GET /api/orders/[id]` — Order details by ID
- `PATCH /api/orders/[id]` — Update order status (`pending`, `confirmed`, `preparing`, `completed`, `cancelled`)
- `GET /api/menu?restaurantId=burger-joint` — Fetch menu items
- `POST /api/menu` — Create new menu item
- `PATCH /api/menu/[restaurantId]/[itemId]` — Update item details or toggle availability
- `DELETE /api/menu/[restaurantId]/[itemId]` — Delete menu item
- `GET /api/conversations?restaurantId=burger-joint` — List recent customer conversations
- `GET /api/conversations?customerPhone=+15551234567` — Get full message transcript for a customer
- `GET /api/whatsapp/status` — WhatsApp bridge credentials & connection health

---

## Edge Case Handling

1. **Unavailable Items**: If a customer requests a sold-out item (e.g., *Jalapeño Fire Burger*), the bot queries `check_item_availability`, informs the customer politely, and recommends available alternatives in the same category.
2. **Ambiguous / Missing Quantities**: The bot explicitly asks for clarification rather than assuming quantity 1 silently.
3. **Mid-Conversation Modifications**: Customers can add items, remove items, or adjust quantities; the ADK agent updates the existing session without creating duplicate orders.
4. **Order Idempotency**: `save_order` utilizes an `idempotency_key` unique to the customer session attempt to prevent duplicate order rows on retry.
5. **Customer Uniqueness**: Database enforces `UNIQUE(restaurant_id, phone_number)` on the `customers` table.
6. **Session Inactivity Timeout**: Inactive sessions expire after 30 minutes to ensure a fresh cart state on return.
7. **Zero-Data Empty States**: All dashboard pages render clean, informative empty states matching the design reference when no orders exist.
