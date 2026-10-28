import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { env } from '../../config/env';
import { UserModel } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { MedicineModel } from '../../models/Medicine';
import { InventoryModel } from '../../models/Inventory';

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

async function getAdminStats() {
  const [totalUsers, totalPharmacies, totalMedicines, approvedPharmacies, pendingPharmacies] = await Promise.all([
    UserModel.countDocuments(),
    PharmacyModel.countDocuments(),
    MedicineModel.countDocuments({ is_active: true }),
    PharmacyModel.countDocuments({ status: 'approved', is_active: true }),
    PharmacyModel.countDocuments({ status: 'pending' }),
  ]);

  return {
    total_users: totalUsers,
    total_pharmacies: totalPharmacies,
    total_medicines: totalMedicines,
    approved_pharmacies: approvedPharmacies,
    pending_pharmacies: pendingPharmacies,
  };
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

  // admin
  return `${base}

You are assisting an ADMINISTRATOR.
- Provide authorized system-wide analytics, pharmacy summaries, and inventory reports.
- Identify patterns like repeated low-stock conditions across pharmacies.
- Clearly distinguish verified facts from estimates.
- Do NOT bypass existing authorization workflows or reveal restricted operation details.`;
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

    // Admin only
    case 'get_admin_stats':
      if (role !== 'admin') throw new Error('Access denied');
      return getAdminStats();
    case 'get_system_low_stock_report':
      if (role !== 'admin') throw new Error('Access denied');
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

  const adminTools = [
    ...staffTools,
    {
      name: 'get_admin_stats',
      description: 'Get system-wide statistics: total users, pharmacies, medicines',
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

  // Build history for multi-turn conversation — last 6 messages for speed
  const chatHistory = history.slice(-6).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.parts }],
  }));

  const chat = model.startChat({ history: chatHistory });

  let response: GenerateContentResult = await chat.sendMessage(message);
  let result = response.response;

  // Agentic tool call loop (max 2 rounds for fast response)
  let rounds = 0;
  while (rounds < 2) {
    const functionCalls = result.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    // Execute all function calls
    const toolResults = await Promise.all(
      functionCalls.map(async (call) => {
        try {
          const data = await dispatchTool(call.name, call.args as Record<string, unknown>, role, pharmacyId);
          return { name: call.name, response: { result: data } };
        } catch (err: unknown) {
          const e = err as Error;
          return { name: call.name, response: { error: e.message } };
        }
      })
    );

    // Send tool results back to model
    response = await chat.sendMessage(
      toolResults.map(r => ({ functionResponse: r })) as any
    );
    result = response.response;
    rounds++;
  }

  const text = result.text();
  if (!text) throw new Error('AI returned an empty response');
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
  const primaryModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = 'gemini-2.5-flash';

  try {
    return await runChatWithModel(genAI, primaryModel, role, message, history, pharmacyId);
  } catch (err: any) {
    // If the configured model has fetch failed, 503 spike, or 404, fallback to gemini-2.5-flash
    if (primaryModel !== fallbackModel) {
      console.warn(`[AI] Primary model ${primaryModel} failed (${err?.message || err?.status}), falling back to ${fallbackModel}`);
      return await runChatWithModel(genAI, fallbackModel, role, message, history, pharmacyId);
    }
    throw err;
  }
}
