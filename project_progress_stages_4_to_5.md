# Project Progress Summary: Pharmacy Inventory System
**Stages Completed: 4 and 5 (Part 1)**

Following the successful implementation of the core identity and physical batch systems in Stages 1-3, we have successfully developed the inventory control and point-of-sale infrastructure.

---

## ⚖️ Stage 4: Stock Adjustments & Audit Trails

### Granular Stock Correction
- **Batch-Level Adjustments:** Admins can manually increase or decrease physical stock directly on a specific batch (e.g., to record damaged goods or correct auditing errors).
- **Invariants & Safety:** Strict validations prevent stock from ever dropping below zero. Crucially, the system prevents any adjustment that would drop the stock below the currently "reserved" quantity held in pending POS carts.

### Immutable Audit Trail
- **Reason Logging:** Every adjustment requires selecting a specific reason (Audit Correction, Damage/Breakage, Expiry, or Data Entry Error).
- **Ledger System:** Built an immutable history ledger. It records the exact admin who made the change (using their identifiable name/email), the timestamp, the previous quantity, the mathematical adjustment applied, and the resulting quantity.

---

## 🛒 Stage 5: Point of Sale (Part 1) & FEFO Engine

### The FEFO (First-Expire-First-Out) Engine
- **Algorithmic Routing:** Built a powerful backend engine that processes POS carts. It automatically evaluates all active batches for a requested drug, sorts them by expiry date, and deducts from the oldest batch first. If the oldest batch doesn't have enough stock, it automatically spills over into the next oldest batch.
- **Price Freezing:** Because pricing is tied to batches, the system intelligently captures the specific `unit_price` of the exact batch that was allocated. This freezes the price of the transaction even if the admin changes batch pricing later.

### Stock Reservation Architecture
- **Safe Concurrency:** Implemented a robust reservation system. When a prescription is created, the system increments `reserved_quantity` on the batches rather than immediately deducting `quantity_remaining`. 
- **Available Stock Formula:** `Available Stock = Quantity Remaining - Reserved Quantity`. This ensures multiple cashiers cannot accidentally sell the same physical box of medicine before payment is finalized.

### POS UI & UX Refinements
- **Frictionless Data Entry:** Refined the POS cart based on operational feedback. The quantity input box starts completely empty, allowing cashiers to instantly type large numbers (like `30` or `120`) without fighting with click-to-increment buttons or dealing with auto-deletions on zero.
- **Dynamic Calculation:** The UI instantly calculates and displays the subtotal for each line item as the cashier types, without needing to hit a "Preview" button first.

---

## 🧬 Data Modeling Enhancements

### Manufacturer / Brand Separation
- **The "Same Drug, Different Price" Problem:** Addressed a critical real-world pharmacy scenario where a generic drug (e.g., Vitamin C) has multiple brands (Emzor, Nature's Field) with distinct pricing.
- **Hybrid Approach:** Added a required `manufacturer` field to the Drug Catalog. The catalog now elegantly displays the brand alongside the dose.
- **Search Optimization:** The POS search automatically indexes the manufacturer, ensuring staff can instantly filter down to the exact brand a customer requests.

### Configuration Defaults
- Enforced strict global defaults into the drug creation forms: **Low Stock Threshold** automatically defaults to `50` units, and **Expiry Warning** automatically defaults to `90` days, ensuring robust alerts without manual data entry fatigue.
