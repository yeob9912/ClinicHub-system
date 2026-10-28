import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { env } from '../../config/env';
import { UserModel } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { MedicineModel } from '../../models/Medicine';
import { InventoryModel } from '../../models/Inventory';
import { ComplaintModel } from '../../models/Complaint';

export type AiRole = 'patient' | 'pharmacy_staff' | 'admin';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

// ─── Tool Implementations (authorized DB queries) ────────────────────────────

async function searchPharmacies(query: { name?: string; city?: string; limit?: number }) {
  const filter: Record<string, unknown> = { status: 'approved', is_active: true };
  if (query.name) filter.name = { $regex: query.name, $options: 'i' };
  if (query.city) filter.city = { $regex: query.city, $options: 'i' };

  const pharmacies = await PharmacyModel.find(filter)
    .select('name address city phone email opening_hours rating latitude longitude')
    .limit(query.limit ?? 5)
    .lean();

  return pharmacies.map(p => ({
    id: p._id.toString(),
    name: p.name,
    address: p.address,
    city: p.city,
    phone: p.phone,
    email: p.email,
    rating: p.rating,
    opening_hours: p.opening_hours,
    coordinates: p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : null,
  }));
}

async function checkMedicineAvailability(medicineName: string) {
  const medicine = await MedicineModel.findOne({
    $text: { $search: medicineName },
    is_active: true,
  }).lean() ?? await MedicineModel.findOne({
    name: { $regex: medicineName, $options: 'i' },
    is_active: true,
  }).lean();

  if (!medicine) return { found: false, medicine_name: medicineName, pharmacies: [] };

  const inventories = await InventoryModel.find({
    medicine_id: medicine._id,
    in_stock: true,
  })
    .populate('pharmacy_id', 'name address city phone status is_active')
    .limit(8)
    .lean();

  const pharmacies = inventories
    .filter((inv: any) => inv.pharmacy_id?.status === 'approved' && inv.pharmacy_id?.is_active)
    .map((inv: any) => ({
      pharmacy_name: inv.pharmacy_id?.name,
      pharmacy_address: inv.pharmacy_id?.address,
      pharmacy_city: inv.pharmacy_id?.city,
      pharmacy_phone: inv.pharmacy_id?.phone,
      price: inv.price,
      currency: inv.currency,
      stock_quantity: inv.stock_quantity,
    }));

  return {
    found: true,
    medicine_name: medicine.name,
    generic_name: medicine.generic_name,
    description: medicine.description,
    usage_info: medicine.usage_info,
    requires_rx: medicine.requires_rx,
    pharmacies,
  };
}

async function getStaffInventory(pharmacyId: string) {
  const inventory = await InventoryModel.find({ pharmacy_id: pharmacyId })
    .populate('medicine_id', 'name generic_name category dosage_form')
    .lean();

  return inventory.map((item: any) => ({
    medicine_name: item.medicine_id?.name ?? 'Unknown',
    generic_name: item.medicine_id?.generic_name,
    category: item.medicine_id?.category,
    stock_quantity: item.stock_quantity,
    low_stock_threshold: item.low_stock_threshold,
    in_stock: item.in_stock,
    price: item.price,
    currency: item.currency,
    is_low_stock: item.stock_quantity <= item.low_stock_threshold,
    last_updated: item.last_updated,
  }));
}

async function getLowStockItems(pharmacyId: string) {
  const inventory = await InventoryModel.find({ pharmacy_id: pharmacyId })
    .populate('medicine_id', 'name generic_name category')
    .lean();

  return inventory
    .filter((item: any) => item.stock_quantity <= item.low_stock_threshold)
    .map((item: any) => ({
      medicine_name: item.medicine_id?.name ?? 'Unknown',
      stock_quantity: item.stock_quantity,
      low_stock_threshold: item.low_stock_threshold,
      units_below_threshold: item.low_stock_threshold - item.stock_quantity,
    }))
    .sort((a: any, b: any) => a.stock_quantity - b.stock_quantity);
}

// ─── Administrator AI System-Wide Management & Analytics (FR-47 through FR-57) ───

// FR-48: User Statistics
async function getAdminUserStatistics(timeRange?: string) {
  const [
    totalUsers,
    totalPatients,
    totalStaff,
    totalAdmins,
    activeUsers,
    inactiveUsers,
  ] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ role: 'patient' }),
    UserModel.countDocuments({ role: 'pharmacy_staff' }),
    UserModel.countDocuments({ role: 'admin' }),
    UserModel.countDocuments({ is_active: true }),
    UserModel.countDocuments({ is_active: false }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [registeredThisMonth, registeredLast30Days, registeredLast7Days] = await Promise.all([
    UserModel.countDocuments({ created_at: { $gte: startOfMonth } }),
    UserModel.countDocuments({ created_at: { $gte: thirtyDaysAgo } }),
    UserModel.countDocuments({ created_at: { $gte: sevenDaysAgo } }),
  ]);

  return {
    total_registered_users: totalUsers,
    total_customers: totalPatients,
    total_pharmacy_staff: totalStaff,
    total_administrators: totalAdmins,
    active_accounts: activeUsers,
    inactive_accounts: inactiveUsers,
    new_registrations_this_month: registeredThisMonth,
    new_registrations_last_30_days: registeredLast30Days,
    new_registrations_last_7_days: registeredLast7Days,
  };
}

// FR-49: Pharmacy Statistics & Comparisons
async function getAdminPharmacyStatistics() {
  const [
    totalPharmacies,
    approvedCount,
    pendingCount,
    rejectedCount,
    suspendedCount,
    activeCount,
    inactiveCount,
  ] = await Promise.all([
    PharmacyModel.countDocuments(),
    PharmacyModel.countDocuments({ status: 'approved' }),
    PharmacyModel.countDocuments({ status: 'pending' }),
    PharmacyModel.countDocuments({ status: 'rejected' }),
    PharmacyModel.countDocuments({ status: 'suspended' }),
    PharmacyModel.countDocuments({ is_active: true }),
    PharmacyModel.countDocuments({ is_active: false }),
  ]);

  const allPharmacies = await PharmacyModel.find()
    .select('name address city phone email status is_active rating ratings_count latitude longitude opening_hours')
    .lean();

  const incompletePharmacies = allPharmacies
    .filter(p => !p.phone || !p.email || !p.address || !p.city || p.latitude === undefined || p.latitude === null || !p.opening_hours)
    .map(p => ({
      name: p.name,
      status: p.status,
      missing_fields: [
        !p.phone && 'phone',
        !p.email && 'email',
        !p.address && 'address',
        !p.city && 'city',
        (p.latitude === undefined || p.latitude === null) && 'coordinates',
        !p.opening_hours && 'opening_hours',
      ].filter(Boolean) as string[],
    }));

  const topRated = allPharmacies
    .filter(p => p.status === 'approved' && p.is_active)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      city: p.city,
      rating: p.rating,
      ratings_count: p.ratings_count,
    }));

  return {
    total_registered_pharmacies: totalPharmacies,
    approved_pharmacies: approvedCount,
    pending_pharmacies: pendingCount,
    rejected_pharmacies: rejectedCount,
    suspended_pharmacies: suspendedCount,
    active_pharmacies: activeCount,
    inactive_pharmacies: inactiveCount,
    top_rated_pharmacies: topRated,
    pharmacies_with_incomplete_info_count: incompletePharmacies.length,
    incomplete_pharmacies: incompletePharmacies.slice(0, 10),
  };
}

// FR-50: Medicine and Inventory Statistics
async function getAdminMedicineInventoryStats() {
  const [
    totalMedicines,
    activeMedicines,
    inactiveMedicines,
    rxRequiredMedicines,
    otcMedicines,
    totalInventoryRecords,
    inStockRecords,
    outOfStockRecords,
  ] = await Promise.all([
    MedicineModel.countDocuments(),
    MedicineModel.countDocuments({ is_active: true }),
    MedicineModel.countDocuments({ is_active: false }),
    MedicineModel.countDocuments({ requires_rx: true }),
    MedicineModel.countDocuments({ requires_rx: false }),
    InventoryModel.countDocuments(),
    InventoryModel.countDocuments({ stock_quantity: { $gt: 0 } }),
    InventoryModel.countDocuments({ stock_quantity: 0 }),
  ]);

  const lowStockInventories = await InventoryModel.find({
    $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] },
  })
    .populate('medicine_id', 'name generic_name')
    .populate('pharmacy_id', 'name city status is_active')
    .limit(25)
    .lean();

  const lowStockPharmacies = lowStockInventories
    .filter((inv: any) => inv.pharmacy_id?.status === 'approved' && inv.pharmacy_id?.is_active)
    .map((inv: any) => ({
      medicine_name: inv.medicine_id?.name ?? 'Unknown',
      pharmacy_name: inv.pharmacy_id?.name ?? 'Unknown',
      pharmacy_city: inv.pharmacy_id?.city ?? 'Unknown',
      stock_quantity: inv.stock_quantity,
      low_stock_threshold: inv.low_stock_threshold,
      status: inv.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock',
    }));

  return {
    total_registered_medicines: totalMedicines,
    active_medicines: activeMedicines,
    inactive_medicines: inactiveMedicines,
    prescription_required_medicines: rxRequiredMedicines,
    over_the_counter_medicines: otcMedicines,
    total_inventory_records: totalInventoryRecords,
    in_stock_inventory_records: inStockRecords,
    out_of_stock_inventory_records: outOfStockRecords,
    total_low_stock_items: lowStockPharmacies.length,
    low_stock_items_by_pharmacy: lowStockPharmacies.slice(0, 10),
    data_limitation_notice:
      'Medicine expiration dates are currently not tracked in the database schema (the system records stock quantities, price history, and low-stock threshold levels).',
  };
}

// FR-51: System Activity
async function getAdminSystemActivity(limit = 6) {
  const [recentUsers, recentPharmacies, recentInventoryUpdates, recentComplaints] = await Promise.all([
    UserModel.find()
      .select('full_name role created_at')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean(),
    PharmacyModel.find()
      .select('name city status created_at')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean(),
    InventoryModel.find()
      .populate('medicine_id', 'name')
      .populate('pharmacy_id', 'name')
      .sort({ last_updated: -1 })
      .limit(limit)
      .lean(),
    ComplaintModel.find()
      .select('pharmacy_name issue category status priority created_at')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean(),
  ]);

  return {
    recent_user_registrations: recentUsers.map(u => ({
      name: u.full_name,
      role: u.role,
      registered_at: u.created_at,
    })),
    recent_pharmacy_registrations: recentPharmacies.map(p => ({
      name: p.name,
      city: p.city,
      status: p.status,
      registered_at: p.created_at,
    })),
    recent_inventory_updates: recentInventoryUpdates.map((inv: any) => ({
      medicine: inv.medicine_id?.name ?? 'Unknown',
      pharmacy: inv.pharmacy_id?.name ?? 'Unknown',
      stock_quantity: inv.stock_quantity,
      price: inv.price,
      updated_at: inv.last_updated,
    })),
    recent_complaints_feedback: recentComplaints.map(c => ({
      pharmacy: c.pharmacy_name,
      issue: c.issue,
      category: c.category,
      status: c.status,
      date: c.created_at,
    })),
  };
}

// FR-47 & FR-52: Overall System Overview
async function getAdminSystemOverview() {
  const [users, pharmacies, inventory, activity] = await Promise.all([
    getAdminUserStatistics(),
    getAdminPharmacyStatistics(),
    getAdminMedicineInventoryStats(),
    getAdminSystemActivity(4),
  ]);

  return {
    system_overview: {
      platform: 'ClinicHub Smart Pharmacy System',
      users: {
        total: users.total_registered_users,
        customers: users.total_customers,
        staff: users.total_pharmacy_staff,
        admins: users.total_administrators,
        new_this_month: users.new_registrations_this_month,
      },
      pharmacies: {
        total: pharmacies.total_registered_pharmacies,
        approved: pharmacies.approved_pharmacies,
        pending: pharmacies.pending_pharmacies,
        active: pharmacies.active_pharmacies,
        incomplete: pharmacies.pharmacies_with_incomplete_info_count,
      },
      medicines_and_inventory: {
        total_medicines: inventory.total_registered_medicines,
        total_inventory_records: inventory.total_inventory_records,
        in_stock: inventory.in_stock_inventory_records,
        out_of_stock: inventory.out_of_stock_inventory_records,
        low_stock_items: inventory.total_low_stock_items,
      },
      recent_activity_summary: {
        newest_user: activity.recent_user_registrations[0] ?? null,
        newest_pharmacy: activity.recent_pharmacy_registrations[0] ?? null,
      },
      compliance_notes: {
        data_source: 'Live authenticated MongoDB records (strictly verified, no double counting)',
        privacy: 'Credential hashes and private tokens are excluded from all reporting',
      },
    },
  };
}

async function getAdminStats() {
  return getAdminSystemOverview();
}

async function getSystemLowStockReport(limit = 20) {
  const inventory = await InventoryModel.find()
    .populate('medicine_id', 'name generic_name')
    .populate('pharmacy_id', 'name city status is_active')
    .lean();

  return inventory
    .filter((item: any) =>
      item.stock_quantity <= item.low_stock_threshold &&
      (item.pharmacy_id as any)?.status === 'approved' &&
      (item.pharmacy_id as any)?.is_active
    )
    .slice(0, limit)
    .map((item: any) => ({
      medicine_name: (item.medicine_id as any)?.name ?? 'Unknown',
      pharmacy_name: (item.pharmacy_id as any)?.name ?? 'Unknown',
      pharmacy_city: (item.pharmacy_id as any)?.city,
      stock_quantity: item.stock_quantity,
      low_stock_threshold: item.low_stock_threshold,
    }));
}

// ─── System Prompts ──────────────────────────────────────────────────────────

function getSystemPrompt(role: AiRole, pharmacyId?: string): string {
  const base = `You are ClinicHub AI, an intelligent assistant for the ClinicHub Smart Pharmacy platform.
You ONLY answer questions related to ClinicHub and its features: pharmacy search, medicine availability, inventory management, and system analytics.
For unrelated questions, politely decline and guide the user back to supported ClinicHub features.
Never invent data. If you cannot verify something, say so clearly.
Be fast, direct, and concise. Format answers in short bullet points. Avoid unnecessary conversational filler.`;

  if (role === 'patient') {
    return `${base}

You are assisting a CUSTOMER.
- Help them find pharmacies and check medicine availability.
- Provide pharmacy details such as location, contact info, and opening hours.
- Offer general medicine information but never diagnose or prescribe.
- Do NOT reveal inventory management tools, stock quantities, or admin analytics.`;
  }

  if (role === 'pharmacy_staff') {
    return `${base}

You are assisting a PHARMACY STAFF member.
${pharmacyId ? `Their authorized pharmacy ID is: ${pharmacyId}` : ''}
- Help them check their authorized pharmacy inventory, low-stock medicines, and restocking needs.
- Provide inventory summaries and restocking suggestions based on stock data.
- Do NOT reveal another pharmacy's private inventory.
- Do NOT perform or approve inventory changes — direct staff to the inventory management workflow.
- Do NOT reveal admin-only analytics.`;
  }

  // admin — Comprehensive System-Wide Management & Analytics (FR-47 through FR-57)
  return `${base}

You are assisting an authenticated ADMINISTRATOR (Role: Administrator).
You have full authorized access to system-wide management tools and live database analytics.

CRITICAL INSTRUCTIONS FOR ADMINISTRATOR REQUESTS:
1. System Overview (FR-47, FR-52):
   - When asked for an overall summary, overview, or general report of ClinicHub, call "get_admin_system_overview".
   - Report user counts, pharmacy approvals/activity, medicine totals, and inventory health.

2. User Statistics (FR-48, FR-53):
   - When asked "How many users are registered?", "How many staff members are registered?", or about new registrations this month, call "get_admin_user_statistics".
   - Clearly report distinct numbers: Total Users, Customers (Patients), Pharmacy Staff, and Administrators.
   - Report active vs inactive account counts.

3. Pharmacy Statistics (FR-49, FR-53):
   - When asked "How many pharmacies are active?", or about pharmacy approvals, incomplete profiles, or top-rated pharmacies, call "get_admin_pharmacy_statistics".
   - Report total registered, approved, pending, active, and pharmacies missing contact/address/coordinate information.

4. Medicine & Inventory Statistics (FR-50, FR-53):
   - When asked "How many medicines are recorded?", "Which pharmacies have low stock?", or about out-of-stock items, call "get_admin_medicine_inventory_stats" or "get_system_low_stock_report".
   - Distinguish prescription-required (Rx) medicines from Over-the-Counter (OTC).
   - If asked about expiration dates: State clearly that medicine expiration dates are not tracked in the current database schema (system tracks quantities and low-stock thresholds) (FR-55).

5. System Activity (FR-51):
   - When asked about recent activity, recent registrations, or recent updates, call "get_admin_system_activity".
   - Summarize newest user registrations, pharmacy signups, inventory changes, and customer feedback/complaints.

6. Accuracy & Privacy (FR-54, FR-55, FR-57):
   - Always base statistics on database records retrieved via your tools. Avoid double-counting.
   - If a requested metric is not stored in the system, explain this limitation clearly rather than guessing.
   - Never disclose credentials, password hashes, or security tokens. Format responses cleanly with bold labels and bullet points.`;
}

// ─── Tool Dispatcher ─────────────────────────────────────────────────────────

async function dispatchTool(
  toolName: string,
  args: Record<string, unknown>,
  role: AiRole,
  pharmacyId?: string
): Promise<unknown> {
  // Enforce role-level access for each tool
  switch (toolName) {
    // Customer + all roles
    case 'search_pharmacies':
      return searchPharmacies({
        name: args.name as string | undefined,
        city: args.city as string | undefined,
        limit: args.limit as number | undefined,
      });
    case 'check_medicine_availability':
      return checkMedicineAvailability(args.medicine_name as string);

    // Staff + admin
    case 'get_staff_inventory':
      if (role === 'patient') throw new Error('Access denied');
      return getStaffInventory((args.pharmacy_id as string | undefined) ?? pharmacyId ?? '');
    case 'get_low_stock_items':
      if (role === 'patient') throw new Error('Access denied');
      return getLowStockItems((args.pharmacy_id as string | undefined) ?? pharmacyId ?? '');

    // Administrator Only (FR-56 Strict Authorization)
    case 'get_admin_system_overview':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminSystemOverview();

    case 'get_admin_user_statistics':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminUserStatistics(args.time_range as string | undefined);

    case 'get_admin_pharmacy_statistics':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminPharmacyStatistics();

    case 'get_admin_medicine_inventory_stats':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminMedicineInventoryStats();

    case 'get_admin_system_activity':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminSystemActivity(args.limit as number | undefined);

    case 'get_admin_stats':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getAdminStats();

    case 'get_system_low_stock_report':
      if (role !== 'admin') throw new Error('Access denied: Administrator authorization required');
      return getSystemLowStockReport(args.limit as number | undefined);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── Tool Definitions (role-filtered) ────────────────────────────────────────

function getToolsForRole(role: AiRole) {
  const customerTools = [
    {
      name: 'search_pharmacies',
      description: 'Search for approved pharmacies by name or city',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pharmacy name to search for' },
          city: { type: 'string', description: 'City to search in' },
          limit: { type: 'number', description: 'Maximum number of results (default 5)' },
        },
      },
    },
    {
      name: 'check_medicine_availability',
      description: 'Check which pharmacies have a specific medicine in stock',
      parameters: {
        type: 'object',
        properties: {
          medicine_name: { type: 'string', description: 'Name of the medicine to search for' },
        },
        required: ['medicine_name'],
      },
    },
  ];

  const staffTools = [
    ...customerTools,
    {
      name: 'get_staff_inventory',
      description: 'Get inventory details for the authorized pharmacy',
      parameters: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string', description: 'Pharmacy ID (optional, uses staff authorized pharmacy)' },
        },
      },
    },
    {
      name: 'get_low_stock_items',
      description: 'Get medicines that are at or below the low-stock threshold for the pharmacy',
      parameters: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string', description: 'Pharmacy ID (optional)' },
        },
      },
    },
  ];

  // FR-47 through FR-57: Full Administrator Tools Suite
  const adminTools = [
    ...staffTools,
    {
      name: 'get_admin_system_overview',
      description: 'Get a comprehensive, high-level overview of the entire ClinicHub system: users, pharmacies, medicines, and inventory',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_admin_user_statistics',
      description: 'Retrieve detailed user statistics: total registered, customers, staff, administrators, active/inactive counts, and new registrations this month',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', description: 'Optional time range filter: this_month, last_30_days, last_7_days, or all_time' },
        },
      },
    },
    {
      name: 'get_admin_pharmacy_statistics',
      description: 'Retrieve system-wide pharmacy statistics: total registered, approved/pending/suspended counts, active vs inactive, top-rated pharmacies, and pharmacies with incomplete profile data',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_admin_medicine_inventory_stats',
      description: 'Retrieve medicine and inventory statistics: total medicines, in-stock/out-of-stock records, low-stock medicines across all pharmacies, and prescription (Rx) requirements',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_admin_system_activity',
      description: 'Summarize recent system activity: recent user signups, recent pharmacy registrations, recent inventory updates, and recent complaints/feedback',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum items to retrieve per category (default 6)' },
        },
      },
    },
    {
      name: 'get_admin_stats',
      description: 'Get system-wide overview statistics (users, pharmacies, medicines)',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_system_low_stock_report',
      description: 'Get a system-wide report of all medicines below low-stock threshold across all pharmacies',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum results (default 20)' },
        },
      },
    },
  ];

  if (role === 'patient') return customerTools;
  if (role === 'pharmacy_staff') return staffTools;
  return adminTools;
}

// ─── Main Chat Handler ───────────────────────────────────────────────────────

async function runChatWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  role: AiRole,
  message: string,
  history: ChatMessage[],
  pharmacyId?: string
): Promise<string> {
  const tools = getToolsForRole(role);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: getSystemPrompt(role, pharmacyId),
    tools: [{ functionDeclarations: tools as any }],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.2,
    },
  });

  // Build contents array using compatible role 'user' and 'model'
  const contents: any[] = history.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.parts }],
  }));

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Helper to safely call generateContent and handle 'model output error' from SDK
  const safeGenerate = async (payload: { contents: any[] }): Promise<any> => {
    try {
      const res = await model.generateContent(payload);
      return res.response;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      // SDK throws this when model returns empty candidate (no text, no tool call)
      if (msg.includes('model output error') || msg.includes('model output must contain')) {
        // Retry once with an explicit instruction to produce a text answer
        const retryContents = [
          ...payload.contents,
          {
            role: 'user' as const,
            parts: [{ text: 'Please provide a clear text answer based on the data above.' }],
          },
        ];
        try {
          const retryRes = await model.generateContent({ contents: retryContents });
          return retryRes.response;
        } catch {
          return null;
        }
      }
      throw err;
    }
  };

  // Call model
  let response = await safeGenerate({ contents });

  // Agentic tool call loop (max 2 rounds for fast response)
  let rounds = 0;
  while (rounds < 2) {
    if (!response) break;
    const functionCalls = response.functionCalls?.();
    if (!functionCalls || functionCalls.length === 0) break;

    // Add model candidate response to contents
    const candidate = response.candidates?.[0];
    if (candidate?.content) {
      contents.push(candidate.content);
    } else {
      contents.push({
        role: 'model',
        parts: functionCalls.map((call: any) => ({ functionCall: call })),
      });
    }

    // Execute all function calls
    const toolResults = await Promise.all(
      functionCalls.map(async (call: any) => {
        try {
          const data = await dispatchTool(call.name, call.args as Record<string, unknown>, role, pharmacyId);
          return { name: call.name, response: { result: data } };
        } catch (err: unknown) {
          const e = err as Error;
          return { name: call.name, response: { error: e.message } };
        }
      })
    );

    // Send tool results back with role: 'user'
    // NOTE: gemini-3.8-flash rejects role: 'function' (causing 400 Bad Request).
    // Role 'user' with functionResponse part is accepted by both Gemini 3.8 and Gemini 2.5!
    contents.push({
      role: 'user',
      parts: toolResults.map((r: any) => ({ functionResponse: r })),
    });

    response = await safeGenerate({ contents });
    rounds++;
  }

  // Extract text safely — guard against null response or empty text
  let text: string | undefined;
  try {
    text = response?.text?.();
  } catch {
    text = undefined;
  }

  if (!text) {
    return 'I have retrieved the requested data. Please try rephrasing your question or ask for a specific metric.';
  }
  return text;
}

export async function handleAiChat(
  userId: string,
  role: AiRole,
  message: string,
  history: ChatMessage[],
  pharmacyId?: string
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw Object.assign(new Error('AI assistant is not configured on this server'), {
      statusCode: 503,
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash';

  // Attempt with gemini-3.8-flash, with 1 retry on temporary 503 spikes or network drops (fetch failed)
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        // Wait 1.5s before retry
        await new Promise((r) => setTimeout(r, 1500));
      }
      return await runChatWithModel(genAI, modelName, role, message, history, pharmacyId);
    } catch (err: any) {
      lastError = err;
      const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
      const isFetchFailed = err?.message?.includes('fetch failed');
      const isRetryable = is503 || isFetchFailed;

      if (!isRetryable) {
        throw err;
      }
      console.warn(
        `[AI] Attempt ${attempt + 1} for ${modelName} encountered ${
          isFetchFailed ? 'network drop (fetch failed)' : '503 capacity spike'
        }. Retrying...`
      );
    }
  }

  // Gracefully handle specific API errors instead of crashing with 500
  if (lastError?.message?.includes('fetch failed')) {
    return 'A temporary network connection issue occurred while contacting Google Gemini servers. Please try sending your message again.';
  }

  if (lastError?.status === 503 || lastError?.message?.includes('503') || lastError?.message?.includes('UNAVAILABLE')) {
    return "Google's servers are currently experiencing temporary high demand for gemini-3.8-flash. Please send your question again in a moment.";
  }

  if (lastError?.status === 429 || lastError?.message?.includes('429') || lastError?.message?.includes('quota')) {
    return 'The Gemini daily API request limit for this project has been reached. Please check your Google AI Studio plan or try again later.';
  }

  throw lastError;
}
