import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

// ─── Reusable Schema Objects ──────────────────────────────────────────────────

const components = {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Supabase JWT access token. Obtain via `POST /auth/login` or `POST /auth/register`. ' +
        'Include in all protected requests as: `Authorization: Bearer <token>`',
    },
  },

  schemas: {
    // ── Primitives & Reusables ───────────────────────────────────────────────
    UUID: {
      type: 'string',
      format: 'uuid',
      example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    },
    ISOTimestamp: {
      type: 'string',
      format: 'date-time',
      example: '2024-06-15T10:30:00.000Z',
    },
    DayHours: {
      type: 'object',
      required: ['open', 'close', 'closed'],
      properties: {
        open: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '08:00' },
        close: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '20:00' },
        closed: { type: 'boolean', example: false },
      },
    },
    OperatingHours: {
      type: 'object',
      required: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      properties: {
        mon: { $ref: '#/components/schemas/DayHours' },
        tue: { $ref: '#/components/schemas/DayHours' },
        wed: { $ref: '#/components/schemas/DayHours' },
        thu: { $ref: '#/components/schemas/DayHours' },
        fri: { $ref: '#/components/schemas/DayHours' },
        sat: { $ref: '#/components/schemas/DayHours' },
        sun: { $ref: '#/components/schemas/DayHours' },
      },
    },
    PaginationMeta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 240 },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 20 },
        totalPages: { type: 'integer', example: 12 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false },
      },
    },
    ValidationError: {
      type: 'object',
      properties: {
        field: { type: 'string', example: 'email' },
        message: { type: 'string', example: 'Invalid email format' },
      },
    },

    // ── Response Envelopes ───────────────────────────────────────────────────
    SuccessResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
        message: { type: 'string', example: 'Operation successful' },
      },
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Validation failed' },
        details: {
          type: 'array',
          items: { $ref: '#/components/schemas/ValidationError' },
        },
      },
    },
    UnauthorizedResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'UNAUTHORIZED' },
        message: { type: 'string', example: 'Missing or invalid JWT token' },
      },
    },
    ForbiddenResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'FORBIDDEN' },
        message: { type: 'string', example: 'Insufficient permissions' },
      },
    },
    NotFoundResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Resource not found' },
      },
    },
    ConflictResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'CONFLICT' },
        message: { type: 'string', example: 'Resource already exists' },
      },
    },
    TooManyRequestsResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        data: { type: 'null', example: null },
        error: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
        message: { type: 'string', example: 'Too many requests. Please slow down.' },
      },
    },

    // ── Domain Schemas ───────────────────────────────────────────────────────
    UserPreferences: {
      type: 'object',
      properties: {
        notifications: { type: 'boolean', example: true },
        default_radius_km: { type: 'integer', minimum: 1, maximum: 50, example: 10 },
      },
    },
    User: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        auth_id: { $ref: '#/components/schemas/UUID' },
        email: { type: 'string', format: 'email', example: 'patient@example.com' },
        phone: { type: 'string', example: '+2348012345678', nullable: true },
        full_name: { type: 'string', example: 'Adaeze Okonkwo' },
        avatar_url: { type: 'string', format: 'uri', nullable: true },
        role: { type: 'string', enum: ['patient', 'pharmacy_staff', 'admin'], example: 'patient' },
        is_active: { type: 'boolean', example: true },
        preferences: { $ref: '#/components/schemas/UserPreferences' },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
        updated_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    Session: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'Short-lived JWT. Store in memory only — never in localStorage.',
          example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refresh_token: {
          type: 'string',
          description: 'Long-lived token. Store in httpOnly cookie.',
          example: 'v1.refresh.abc123...',
        },
        expires_in: { type: 'integer', example: 3600 },
        expires_at: { type: 'integer', description: 'Unix timestamp', example: 1718453400 },
      },
    },
    Pharmacy: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        owner_id: { $ref: '#/components/schemas/UUID' },
        name: { type: 'string', example: 'HealthFirst Pharmacy' },
        slug: { type: 'string', example: 'healthfirst-pharmacy' },
        address: { type: 'string', example: '14 Broad Street, Lagos Island' },
        city: { type: 'string', example: 'Lagos' },
        state: { type: 'string', example: 'Lagos State', nullable: true },
        country: { type: 'string', example: 'NG' },
        latitude: { type: 'number', format: 'double', example: 6.4541 },
        longitude: { type: 'number', format: 'double', example: 3.3947 },
        phone: { type: 'string', example: '+2341234567890' },
        email: { type: 'string', format: 'email', example: 'info@healthfirst.ng', nullable: true },
        website: { type: 'string', format: 'uri', example: 'https://healthfirst.ng', nullable: true },
        operating_hours: { $ref: '#/components/schemas/OperatingHours' },
        logo_url: { type: 'string', format: 'uri', nullable: true },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'suspended', 'rejected'],
          example: 'approved',
        },
        rejection_reason: { type: 'string', nullable: true },
        is_active: { type: 'boolean', example: true },
        distance_km: {
          type: 'number',
          format: 'double',
          description: 'Populated in geo-search queries',
          example: 1.42,
          nullable: true,
        },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
        updated_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    MedicineCategory: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        name: { type: 'string', example: 'Antibiotics' },
        slug: { type: 'string', example: 'antibiotics' },
        description: { type: 'string', nullable: true },
        icon_url: { type: 'string', format: 'uri', nullable: true },
        sort_order: { type: 'integer', example: 1 },
        is_active: { type: 'boolean', example: true },
        medicine_count: { type: 'integer', example: 42, description: 'Only present when include_count=true' },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    Medicine: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        name: { type: 'string', example: 'Amoxicillin' },
        generic_name: { type: 'string', example: 'Amoxicillin trihydrate', nullable: true },
        brand_names: {
          type: 'array',
          items: { type: 'string' },
          example: ['Amoxil', 'Trimox', 'Wymox'],
        },
        category_id: { $ref: '#/components/schemas/UUID' },
        category: { $ref: '#/components/schemas/MedicineCategory' },
        description: { type: 'string', nullable: true },
        usage_info: { type: 'string', nullable: true },
        side_effects: { type: 'string', nullable: true },
        manufacturer: { type: 'string', example: 'GSK Nigeria', nullable: true },
        dosage_form: {
          type: 'string',
          enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch', 'other'],
          example: 'capsule',
          nullable: true,
        },
        strength: { type: 'string', example: '500mg', nullable: true },
        requires_rx: {
          type: 'boolean',
          example: true,
          description: 'Whether a prescription is required',
        },
        image_url: { type: 'string', format: 'uri', nullable: true },
        nafdac_number: { type: 'string', example: 'A4-1234', nullable: true },
        is_active: { type: 'boolean', example: true },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
        updated_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    InventoryItem: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        pharmacy_id: { $ref: '#/components/schemas/UUID' },
        medicine_id: { $ref: '#/components/schemas/UUID' },
        medicine: { $ref: '#/components/schemas/Medicine' },
        price: { type: 'number', format: 'double', example: 1250.0 },
        previous_price: { type: 'number', format: 'double', example: 1450.0, nullable: true },
        currency: { type: 'string', example: 'NGN' },
        stock_quantity: { type: 'integer', example: 45 },
        in_stock: { type: 'boolean', example: true },
        low_stock_threshold: { type: 'integer', example: 10 },
        last_updated: { $ref: '#/components/schemas/ISOTimestamp' },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    PharmacyAvailability: {
      type: 'object',
      description: 'Price & stock availability for a medicine at a specific pharmacy',
      properties: {
        pharmacy_id: { $ref: '#/components/schemas/UUID' },
        pharmacy_name: { type: 'string', example: 'HealthFirst Pharmacy' },
        address: { type: 'string', example: '14 Broad Street, Lagos Island' },
        latitude: { type: 'number', format: 'double', example: 6.4541 },
        longitude: { type: 'number', format: 'double', example: 3.3947 },
        phone: { type: 'string', example: '+2341234567890' },
        operating_hours: { $ref: '#/components/schemas/OperatingHours' },
        logo_url: { type: 'string', format: 'uri', nullable: true },
        price: { type: 'number', format: 'double', example: 1250.0 },
        currency: { type: 'string', example: 'NGN' },
        previous_price: { type: 'number', format: 'double', nullable: true, example: 1450.0 },
        stock_quantity: { type: 'integer', example: 45 },
        in_stock: { type: 'boolean', example: true },
        last_updated: { $ref: '#/components/schemas/ISOTimestamp' },
        distance_km: { type: 'number', format: 'double', example: 1.42 },
        is_cheapest: {
          type: 'boolean',
          example: false,
          description: 'True if this is the lowest price among in-stock pharmacies in the search radius',
        },
      },
    },
    WatchlistItem: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        user_id: { $ref: '#/components/schemas/UUID' },
        medicine_id: { $ref: '#/components/schemas/UUID' },
        pharmacy_id: { $ref: '#/components/schemas/UUID', nullable: true },
        medicine: { $ref: '#/components/schemas/Medicine' },
        notify_price_change: { type: 'boolean', example: true },
        notify_back_in_stock: { type: 'boolean', example: true },
        target_price: {
          type: 'number',
          format: 'double',
          nullable: true,
          example: 1000.0,
          description: 'Alert triggered when price drops to or below this value',
        },
        current_inventory: {
          nullable: true,
          type: 'object',
          properties: {
            price: { type: 'number', example: 1250.0 },
            stock_quantity: { type: 'integer', example: 12 },
            in_stock: { type: 'boolean', example: true },
            last_updated: { $ref: '#/components/schemas/ISOTimestamp' },
          },
        },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },
    Notification: {
      type: 'object',
      properties: {
        id: { $ref: '#/components/schemas/UUID' },
        user_id: { $ref: '#/components/schemas/UUID' },
        type: {
          type: 'string',
          enum: ['price_drop', 'back_in_stock', 'price_increase', 'pharmacy_approved', 'pharmacy_rejected', 'system'],
          example: 'price_drop',
        },
        title: { type: 'string', example: 'Price Dropped!' },
        body: { type: 'string', example: 'Amoxicillin price reduced from ₦1450 to ₦1250 at HealthFirst Pharmacy.' },
        data: {
          type: 'object',
          description: 'Contextual metadata: medicine_id, pharmacy_id, old_price, new_price, etc.',
          example: { medicine_id: 'a0eebc99-...', pharmacy_id: 'b1eebc99-...', old_price: 1450, new_price: 1250 },
        },
        is_read: { type: 'boolean', example: false },
        read_at: { $ref: '#/components/schemas/ISOTimestamp', nullable: true },
        created_at: { $ref: '#/components/schemas/ISOTimestamp' },
      },
    },

    // ── Request Bodies ───────────────────────────────────────────────────────
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'full_name'],
      properties: {
        email: { type: 'string', format: 'email', example: 'patient@example.com' },
        password: {
          type: 'string',
          minLength: 8,
          description: 'Min 8 chars, at least 1 uppercase letter and 1 digit',
          example: 'SecurePass1',
        },
        full_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Adaeze Okonkwo' },
        phone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+2348012345678' },
        role: { type: 'string', enum: ['patient', 'pharmacy_staff'], default: 'patient' },
        pharmacy: {
          type: 'object',
          description: 'Required when role=pharmacy_staff',
          required: ['name', 'address', 'city', 'latitude', 'longitude', 'phone', 'operating_hours'],
          properties: {
            name: { type: 'string', example: 'HealthFirst Pharmacy' },
            address: { type: 'string', example: '14 Broad Street, Lagos Island' },
            city: { type: 'string', example: 'Lagos' },
            state: { type: 'string', example: 'Lagos State' },
            country: { type: 'string', default: 'NG', example: 'NG' },
            latitude: { type: 'number', format: 'double', example: 6.4541 },
            longitude: { type: 'number', format: 'double', example: 3.3947 },
            phone: { type: 'string', example: '+2341234567890' },
            email: { type: 'string', format: 'email' },
            website: { type: 'string', format: 'uri' },
            operating_hours: { $ref: '#/components/schemas/OperatingHours' },
          },
        },
      },
    },
    LoginRequest: {
      type: 'object',
      description: 'Provide either email+password OR phone+otp',
      properties: {
        email: { type: 'string', format: 'email', example: 'patient@example.com' },
        password: { type: 'string', example: 'SecurePass1' },
        phone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+2348012345678' },
        otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
        remember: { type: 'boolean', default: false, description: 'Extend refresh token to 30 days' },
      },
    },
    AddInventoryRequest: {
      type: 'object',
      required: ['medicine_id', 'price', 'stock_quantity'],
      properties: {
        medicine_id: { $ref: '#/components/schemas/UUID' },
        price: { type: 'number', format: 'double', minimum: 0, example: 1250.0 },
        currency: { type: 'string', minLength: 3, maxLength: 3, default: 'NGN', example: 'NGN' },
        stock_quantity: { type: 'integer', minimum: 0, example: 50 },
        low_stock_threshold: { type: 'integer', minimum: 0, default: 10, example: 10 },
      },
    },
    UpdateInventoryRequest: {
      type: 'object',
      description: 'At least one field is required',
      properties: {
        price: { type: 'number', format: 'double', minimum: 0, example: 1100.0 },
        stock_quantity: { type: 'integer', minimum: 0, example: 35 },
        low_stock_threshold: { type: 'integer', minimum: 0, example: 5 },
      },
    },
    BulkInventoryRequest: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 100,
          items: {
            type: 'object',
            required: ['medicine_id', 'price', 'stock_quantity'],
            properties: {
              medicine_id: { $ref: '#/components/schemas/UUID' },
              price: { type: 'number', format: 'double', minimum: 0, example: 1250.0 },
              stock_quantity: { type: 'integer', minimum: 0, example: 30 },
              low_stock_threshold: { type: 'integer', minimum: 0, default: 10, example: 10 },
            },
          },
        },
      },
    },
    AddWatchlistRequest: {
      type: 'object',
      required: ['medicine_id'],
      properties: {
        medicine_id: { $ref: '#/components/schemas/UUID' },
        pharmacy_id: {
          $ref: '#/components/schemas/UUID',
          description: 'Specific pharmacy to watch. Omit to watch at ANY pharmacy.',
        },
        notify_price_change: { type: 'boolean', default: true },
        notify_back_in_stock: { type: 'boolean', default: true },
        target_price: {
          type: 'number',
          format: 'double',
          example: 1000.0,
          description: 'Only alert when price drops to or below this value',
        },
      },
    },
    CreateMedicineRequest: {
      type: 'object',
      required: ['name', 'category_id'],
      properties: {
        name: { type: 'string', example: 'Amoxicillin' },
        generic_name: { type: 'string', example: 'Amoxicillin trihydrate' },
        brand_names: { type: 'array', items: { type: 'string' }, example: ['Amoxil', 'Wymox'] },
        category_id: { $ref: '#/components/schemas/UUID' },
        description: { type: 'string' },
        usage_info: { type: 'string', example: 'Take with food every 8 hours' },
        side_effects: { type: 'string', example: 'Nausea, diarrhoea, rash' },
        manufacturer: { type: 'string', example: 'GSK Nigeria' },
        dosage_form: { type: 'string', enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream'] },
        strength: { type: 'string', example: '500mg' },
        requires_rx: { type: 'boolean', default: false },
        nafdac_number: { type: 'string', example: 'A4-1234' },
      },
    },
  },

  // ── Response Shortcuts ─────────────────────────────────────────────────────
  responses: {
    Unauthorized: {
      description: 'Missing or invalid JWT token',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/UnauthorizedResponse' } } },
    },
    Forbidden: {
      description: 'Authenticated but insufficient role/permissions',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ForbiddenResponse' } } },
    },
    NotFound: {
      description: 'Resource not found',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundResponse' } } },
    },
    Conflict: {
      description: 'Duplicate resource or conflicting state',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } },
    },
    ValidationError: {
      description: 'Request validation failed',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    TooManyRequests: {
      description: 'Rate limit exceeded',
      headers: {
        'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until limit resets' },
      },
      content: { 'application/json': { schema: { $ref: '#/components/schemas/TooManyRequestsResponse' } } },
    },
  },

  // ── Parameters ─────────────────────────────────────────────────────────────
  parameters: {
    PageParam: {
      in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number (1-indexed)',
    },
    LimitParam: {
      in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      description: 'Items per page',
    },
    PharmacyIdPath: {
      in: 'path', name: 'pharmacy_id', required: true,
      schema: { $ref: '#/components/schemas/UUID' },
      description: 'Pharmacy UUID',
    },
    MedicineIdPath: {
      in: 'path', name: 'id', required: true,
      schema: { $ref: '#/components/schemas/UUID' },
      description: 'Medicine UUID',
    },
    UserIdPath: {
      in: 'path', name: 'id', required: true,
      schema: { $ref: '#/components/schemas/UUID' },
      description: 'User UUID',
    },
    InventoryIdPath: {
      in: 'path', name: 'inventory_id', required: true,
      schema: { $ref: '#/components/schemas/UUID' },
      description: 'Inventory record UUID',
    },
  },
};

// ─── Full Paths Definition ────────────────────────────────────────────────────

const paths: Record<string, unknown> = {
  // ═══ AUTH ═════════════════════════════════════════════════════════════════

  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user account',
      description:
        'Creates a new patient or pharmacy_staff account. ' +
        'When `role=pharmacy_staff`, a `pharmacy` object is required — the pharmacy is created with `status=pending` ' +
        'and admin is notified for approval. Supabase sends a confirmation email after registration.',
      operationId: 'register',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
            examples: {
              simplePatient: {
                summary: 'Simple patient registration (recommended for quick test)',
                value: {
                  email: 'test.user@gmail.com',
                  password: 'SecurePass1',
                  full_name: 'Test User',
                  role: 'patient',
                },
              },
              pharmacyStaff: {
                summary: 'Pharmacy staff registration',
                value: {
                  email: 'staff.user@gmail.com',
                  password: 'SecurePass1',
                  full_name: 'Pharmacy Staff',
                  role: 'pharmacy_staff',
                  pharmacy: {
                    name: 'HealthFirst Pharmacy',
                    address: '14 Broad Street, Lagos Island',
                    city: 'Lagos',
                    country: 'NG',
                    latitude: 6.4541,
                    longitude: 3.3947,
                    phone: '+2341234567890',
                    operating_hours: {
                      mon: { open: '08:00', close: '20:00', closed: false },
                      tue: { open: '08:00', close: '20:00', closed: false },
                      wed: { open: '08:00', close: '20:00', closed: false },
                      thu: { open: '08:00', close: '20:00', closed: false },
                      fri: { open: '08:00', close: '20:00', closed: false },
                      sat: { open: '09:00', close: '18:00', closed: false },
                      sun: { open: '00:00', close: '00:00', closed: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Account created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/SuccessResponse' }],
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          id: { $ref: '#/components/schemas/UUID' },
                          email: { type: 'string', example: 'patient@example.com' },
                          full_name: { type: 'string', example: 'Adaeze Okonkwo' },
                          role: { type: 'string', example: 'patient' },
                        },
                      },
                      session: {
                        allOf: [{ $ref: '#/components/schemas/Session' }],
                        nullable: true,
                        description: 'null when email confirmation is required (check email_confirmation_required)',
                      },
                      email_confirmation_required: {
                        type: 'boolean',
                        example: false,
                        description: 'true when Supabase project requires email confirmation before login',
                      },
                    },
                  },
                },
              },
              example: {
                success: true,
                message: 'Account created successfully',
                data: {
                  user: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'patient@example.com', full_name: 'Adaeze Okonkwo', role: 'patient' },
                  session: { access_token: 'eyJ...', refresh_token: 'v1.refresh...', expires_in: 3600, expires_at: 1718453400 },
                  email_confirmation_required: false,
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        409: { $ref: '#/components/responses/Conflict' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with email+password or phone+OTP',
      description:
        'Returns JWT access and refresh tokens. ' +
        'Store `access_token` **in memory only** (never localStorage). ' +
        'Store `refresh_token` in an httpOnly cookie. ' +
        'Set `remember=true` to extend the refresh token lifetime to 30 days.',
      operationId: 'login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              emailLogin: {
                summary: 'Email + password (quick test)',
                value: { email: 'test.user@gmail.com', password: 'SecurePass1', remember: false },
              },
              phoneLogin: {
                summary: 'Phone + OTP',
                value: { phone: '+2348012345678', otp: '123456' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                      session: {
                        allOf: [{ $ref: '#/components/schemas/Session' }],
                        nullable: true,
                        description: 'null when email confirmation is required (check email_confirmation_required)',
                      },
                      email_confirmation_required: {
                        type: 'boolean',
                        example: false,
                        description: 'true when Supabase project requires email confirmation before login',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { description: 'Invalid credentials or expired OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout and revoke all sessions',
      description:
        'Revokes **all active sessions** for the authenticated user via Supabase Admin API. ' +
        'Identity is taken from the `Authorization: Bearer` header — no request body is needed. ' +
        'Always returns 200 even if the session was already expired, to avoid leaking session state.',
      operationId: 'logout',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Logged out successfully',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'object', properties: { message: { type: 'string', example: 'Logged out successfully' } } } } },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Exchanges a valid refresh token for a new access_token + refresh_token pair.',
      operationId: 'refreshToken',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refresh_token'],
              properties: { refresh_token: { type: 'string', example: 'v1.refresh.abc123...' } },
            },
            examples: {
              simple: {
                summary: 'Use refresh token from /auth/login response',
                value: { refresh_token: 'v1.refresh.abc123...' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'New tokens issued',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Session' },
                },
              },
            },
          },
        },
        401: { description: 'Refresh token expired or revoked', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Send password reset email',
      description:
        'Sends a password reset link to the registered email. ' +
        '**Always returns 200** to prevent email enumeration attacks, regardless of whether the address exists.',
      operationId: 'forgotPassword',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email', example: 'patient@example.com' },
                redirect_to: { type: 'string', format: 'uri', example: 'https://app.smartpharmacy.com/reset-password' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Reset email sent (if account exists)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Complete password reset',
      description: 'Completes the password reset flow using the token from the reset email link.',
      operationId: 'resetPassword',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'new_password'],
              properties: {
                token: { type: 'string', description: 'Reset token from email link' },
                new_password: { type: 'string', minLength: 8, description: 'Min 8 chars, 1 uppercase, 1 digit', example: 'NewSecure1' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Password updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        400: { description: 'Token expired, already used, or password too weak', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/auth/send-otp': {
    post: {
      tags: ['Auth'],
      summary: 'Send SMS OTP',
      description: 'Sends a 6-digit OTP to the specified phone number. Valid for 5 minutes. Use with `POST /auth/login` phone+otp flow.',
      operationId: 'sendOtp',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['phone'],
              properties: { phone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+2348012345678' } },
            },
            examples: {
              simple: {
                summary: 'Simple OTP request',
                value: { phone: '+2348012345678' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'OTP sent successfully',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { message: { type: 'string' }, expires_in: { type: 'integer', example: 300 } } } } },
            },
          },
        },
        400: { description: 'Invalid phone number or SMS provider error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  // ═══ USERS ════════════════════════════════════════════════════════════════

  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get own profile',
      description: 'Returns the full profile of the currently authenticated user.',
      operationId: 'getMyProfile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Update own profile',
      description: 'Partially updates the authenticated user profile. Only provided fields are updated.',
      operationId: 'updateMyProfile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                full_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Adaeze Okonkwo-Eze' },
                phone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+2348099887766' },
                avatar_url: { type: 'string', format: 'uri', description: 'Must be a valid Supabase Storage URL' },
                preferences: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'boolean' },
                    default_radius_km: { type: 'integer', minimum: 1, maximum: 50 },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Profile updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { description: 'Phone number already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } } },
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Request account deletion',
      description:
        'Sets `is_active=false` and schedules permanent deletion after **30 days**. ' +
        '⚠️ Pharmacy staff accounts with active approved pharmacies cannot be deleted — transfer or suspend the pharmacy first.',
      operationId: 'deleteMyAccount',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Account scheduled for deletion', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { description: 'Active pharmacy must be transferred first', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/users/me/avatar': {
    post: {
      tags: ['Users'],
      summary: 'Upload profile avatar',
      description: 'Uploads a new profile picture. Replaces any existing avatar. Stored in Supabase Storage `avatars` bucket.',
      operationId: 'uploadAvatar',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['avatar'],
              properties: {
                avatar: { type: 'string', format: 'binary', description: 'JPEG / PNG / WebP. Max 2 MB.' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Avatar uploaded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'object', properties: { avatar_url: { type: 'string', format: 'uri', example: 'https://xxxx.supabase.co/storage/v1/object/public/avatars/uuid/photo.jpg' } } },
                },
              },
            },
          },
        },
        400: { description: 'Invalid file type or size exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // ═══ PHARMACIES ═══════════════════════════════════════════════════════════

  '/pharmacies/nearby': {
    get: {
      tags: ['Pharmacies'],
      summary: 'Find nearby pharmacies',
      description:
        'Returns approved pharmacies within the specified radius of the given coordinates, sorted by distance. ' +
        'Uses PostGIS ST_DWithin for geo-radius filtering.',
      operationId: 'getNearbyPharmacies',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'lat', required: true, schema: { type: 'number', format: 'double', minimum: -90, maximum: 90 }, example: 6.4541, description: 'User latitude' },
        { in: 'query', name: 'lng', required: true, schema: { type: 'number', format: 'double', minimum: -180, maximum: 180 }, example: 3.3947, description: 'User longitude' },
        { in: 'query', name: 'radius', schema: { type: 'number', default: 5, maximum: 50 }, description: 'Search radius in km (default: 5, max: 50)' },
        { in: 'query', name: 'city', schema: { type: 'string' }, description: 'Filter by city name (alternative to coordinates)' },
        { $ref: '#/components/parameters/PageParam' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: {
        200: {
          description: 'List of nearby pharmacies with distance',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Pharmacy' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid coordinates', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/pharmacies/{id}': {
    get: {
      tags: ['Pharmacies'],
      summary: 'Get pharmacy details',
      description: 'Returns full details for an approved pharmacy including owner info and medicine count.',
      operationId: 'getPharmacyById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' }, description: 'Pharmacy UUID' },
      ],
      responses: {
        200: { description: 'Pharmacy details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Pharmacy' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Pharmacies'],
      summary: 'Update pharmacy details',
      description: 'Updates the pharmacy. Only the **owner** can call this endpoint. Cannot change `status` via this endpoint.',
      operationId: 'updatePharmacy',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'HealthFirst Pharmacy Ltd.' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                latitude: { type: 'number', format: 'double' },
                longitude: { type: 'number', format: 'double' },
                phone: { type: 'string' },
                email: { type: 'string', format: 'email' },
                website: { type: 'string', format: 'uri' },
                operating_hours: { $ref: '#/components/schemas/OperatingHours' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Pharmacy updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Pharmacy' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/pharmacies': {
    post: {
      tags: ['Pharmacies'],
      summary: 'Register a new pharmacy',
      description:
        'Registers a pharmacy. **Requires `pharmacy_staff` role.** ' +
        'The pharmacy is created with `status=pending`. An admin receives a notification to review it. ' +
        'One pharmacy per pharmacy_staff account.',
      operationId: 'createPharmacy',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'address', 'city', 'latitude', 'longitude', 'phone', 'operating_hours'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 150, example: 'CityPharm Lagos' },
                address: { type: 'string', example: '5 Marina Road, Victoria Island' },
                city: { type: 'string', example: 'Lagos' },
                state: { type: 'string', example: 'Lagos State' },
                country: { type: 'string', default: 'NG' },
                latitude: { type: 'number', format: 'double', example: 6.4281 },
                longitude: { type: 'number', format: 'double', example: 3.4219 },
                phone: { type: 'string', example: '+2349011223344' },
                email: { type: 'string', format: 'email' },
                website: { type: 'string', format: 'uri' },
                operating_hours: { $ref: '#/components/schemas/OperatingHours' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Pharmacy registered (pending approval)', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Pharmacy' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        409: { description: 'User already has a pharmacy registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } } },
      },
    },
  },

  '/pharmacies/{id}/logo': {
    post: {
      tags: ['Pharmacies'],
      summary: 'Upload pharmacy logo',
      description: 'Uploads or replaces the pharmacy logo. Only the **owner** can call this.',
      operationId: 'uploadPharmacyLogo',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' } }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['logo'],
              properties: { logo: { type: 'string', format: 'binary', description: 'JPEG / PNG / WebP. Max 5 MB.' } },
            },
          },
        },
      },
      responses: {
        200: { description: 'Logo uploaded', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { logo_url: { type: 'string', format: 'uri' } } } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ═══ MEDICINES ════════════════════════════════════════════════════════════

  '/medicines/search': {
    get: {
      tags: ['Medicines'],
      summary: 'Full-text search for medicines',
      description:
        'Searches medicines using PostgreSQL GIN-indexed `tsvector` across name, generic_name, brand_names, and description. ' +
        'Results are ranked by relevance (`ts_rank`). Saves to the user\'s search history.',
      operationId: 'searchMedicines',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'q', required: true, schema: { type: 'string', minLength: 2 }, example: 'amoxicillin', description: 'Search query (min 2 characters)' },
        { in: 'query', name: 'category_id', schema: { $ref: '#/components/schemas/UUID' }, description: 'Filter by medicine category' },
        { in: 'query', name: 'requires_rx', schema: { type: 'boolean' }, description: 'Filter prescription-required medicines' },
        { $ref: '#/components/parameters/PageParam' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: {
        200: {
          description: 'Search results with relevance ranking',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        400: { description: 'Query string missing or too short', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/medicines/categories': {
    get: {
      tags: ['Medicines'],
      summary: 'List medicine categories',
      description: 'Returns all active medicine categories, ordered by `sort_order`. Optionally includes medicine count per category.',
      operationId: 'getMedicineCategories',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'include_count', schema: { type: 'boolean', default: false }, description: 'Include medicine count per category' },
      ],
      responses: {
        200: {
          description: 'Category list',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/MedicineCategory' } } } },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/medicines': {
    get: {
      tags: ['Medicines'],
      summary: 'Browse all medicines',
      description: 'Returns all active medicines with optional filtering by category or prescription requirement. Use for category browsing.',
      operationId: 'listMedicines',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'category_id', schema: { $ref: '#/components/schemas/UUID' } },
        { in: 'query', name: 'requires_rx', schema: { type: 'boolean' } },
        { in: 'query', name: 'sort', schema: { type: 'string', enum: ['name', 'created_at'], default: 'name' } },
        { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        200: { description: 'Medicine list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/medicines/{id}': {
    get: {
      tags: ['Medicines'],
      summary: 'Get medicine details',
      description: 'Returns full medicine details including category, brand names, usage info, and side effects.',
      operationId: 'getMedicineById',
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/MedicineIdPath' }],
      responses: {
        200: { description: 'Medicine details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Medicine' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/medicines/{id}/availability': {
    get: {
      tags: ['Medicines'],
      summary: 'Price comparison across pharmacies',
      description:
        'Returns a ranked list of pharmacies carrying this medicine within the search radius, with pricing, stock levels, and distance. ' +
        'Calls the `find_pharmacies_with_medicine` PostGIS RPC. ' +
        'The `is_cheapest` flag marks the lowest-priced in-stock pharmacy.',
      operationId: 'getMedicineAvailability',
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/MedicineIdPath' },
        { in: 'query', name: 'lat', required: true, schema: { type: 'number', format: 'double' }, example: 6.4541 },
        { in: 'query', name: 'lng', required: true, schema: { type: 'number', format: 'double' }, example: 3.3947 },
        { in: 'query', name: 'radius', schema: { type: 'number', default: 10, maximum: 50 }, description: 'Search radius in km' },
        { in: 'query', name: 'sort_by', schema: { type: 'string', enum: ['distance', 'price', 'price_desc'], default: 'distance' } },
        { in: 'query', name: 'in_stock_only', schema: { type: 'boolean', default: false }, description: 'Return only pharmacies with stock > 0' },
        { $ref: '#/components/parameters/PageParam' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: {
        200: {
          description: 'Price comparison results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  medicine: {
                    type: 'object',
                    properties: {
                      id: { $ref: '#/components/schemas/UUID' },
                      name: { type: 'string', example: 'Amoxicillin' },
                      generic_name: { type: 'string' },
                      strength: { type: 'string' },
                      dosage_form: { type: 'string' },
                      requires_rx: { type: 'boolean' },
                    },
                  },
                  data: { type: 'array', items: { $ref: '#/components/schemas/PharmacyAvailability' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        400: { description: 'Missing lat/lng', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  // ═══ INVENTORY ════════════════════════════════════════════════════════════

  '/pharmacies/{pharmacy_id}/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'List pharmacy inventory',
      description:
        'Returns the full stock list for a pharmacy with pricing, stock levels, and medicine details. ' +
        'Restricted to the **pharmacy owner** and **admins**.',
      operationId: 'listInventory',
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PharmacyIdPath' },
        { in: 'query', name: 'in_stock', schema: { type: 'boolean' }, description: 'Filter to in-stock items only' },
        { in: 'query', name: 'low_stock', schema: { type: 'boolean' }, description: 'Filter to items below low_stock_threshold' },
        { in: 'query', name: 'category_id', schema: { $ref: '#/components/schemas/UUID' } },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by medicine name' },
        { in: 'query', name: 'sort', schema: { type: 'string', enum: ['medicine_name', 'price', 'stock_quantity', 'last_updated'], default: 'last_updated' } },
        { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        { $ref: '#/components/parameters/PageParam' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 50, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Inventory list with summary stats',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: {
                    type: 'object',
                    properties: {
                      total_items: { type: 'integer', example: 120 },
                      in_stock_count: { type: 'integer', example: 98 },
                      out_of_stock_count: { type: 'integer', example: 22 },
                      low_stock_count: { type: 'integer', example: 7 },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    post: {
      tags: ['Inventory'],
      summary: 'Add medicine to inventory',
      description:
        'Adds a medicine to the pharmacy\'s stock. ' +
        '`in_stock` is automatically computed from `stock_quantity > 0` by a DB trigger. ' +
        'Triggers a Supabase Realtime broadcast on the `inventory` channel.',
      operationId: 'addInventoryItem',
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/PharmacyIdPath' }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddInventoryRequest' } } } },
      responses: {
        201: { description: 'Inventory item added', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/InventoryItem' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        409: { description: 'Medicine already in this pharmacy\'s inventory', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } } },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  '/pharmacies/{pharmacy_id}/inventory/bulk': {
    post: {
      tags: ['Inventory'],
      summary: 'Bulk upsert inventory items',
      description:
        'Adds or updates up to **100 inventory items** in a single request. ' +
        'By default (`partial=false`) the entire batch is rolled back on any error. ' +
        'Set `?partial=true` to commit successful items and collect errors.',
      operationId: 'bulkUpsertInventory',
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PharmacyIdPath' },
        { in: 'query', name: 'partial', schema: { type: 'boolean', default: false }, description: 'Allow partial success — commit successful items, collect errors' },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BulkInventoryRequest' } } } },
      responses: {
        200: {
          description: 'Bulk operation result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      updated: { type: 'integer', example: 8 },
                      created: { type: 'integer', example: 2 },
                      errors: {
                        type: 'array',
                        items: { type: 'object', properties: { medicine_id: { type: 'string' }, error: { type: 'string' } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/pharmacies/{pharmacy_id}/inventory/{inventory_id}': {
    patch: {
      tags: ['Inventory'],
      summary: 'Update inventory item',
      description:
        'Updates price, stock quantity, or threshold for a single item. ' +
        'A price change triggers the `notify_inventory_watchers` DB trigger which creates ' +
        '`price_drop` or `price_increase` notifications for watching users.',
      operationId: 'updateInventoryItem',
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PharmacyIdPath' },
        { $ref: '#/components/parameters/InventoryIdPath' },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateInventoryRequest' } } } },
      responses: {
        200: {
          description: 'Updated. `previous_price` is populated when price changed.',
          content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/InventoryItem' } } } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
    delete: {
      tags: ['Inventory'],
      summary: 'Remove medicine from inventory',
      description: 'Permanently removes the inventory record. The medicine itself is not affected.',
      operationId: 'deleteInventoryItem',
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PharmacyIdPath' },
        { $ref: '#/components/parameters/InventoryIdPath' },
      ],
      responses: {
        204: { description: 'Deleted successfully (no response body)' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ═══ WATCHLIST ════════════════════════════════════════════════════════════

  '/watchlist': {
    get: {
      tags: ['Watchlist & Notifications'],
      summary: 'Get watchlist',
      description: 'Returns the authenticated user\'s watchlist with current price and stock snapshots.',
      operationId: 'getWatchlist',
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
      responses: {
        200: { description: 'Watchlist items', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/WatchlistItem' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Watchlist & Notifications'],
      summary: 'Add item to watchlist',
      description:
        'Watches a medicine for price drops or back-in-stock events. ' +
        'Leave `pharmacy_id` null to watch the medicine across **all** pharmacies. ' +
        'Set `target_price` to only alert when price drops to or below that value.',
      operationId: 'addToWatchlist',
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddWatchlistRequest' } } } },
      responses: {
        201: { description: 'Added to watchlist', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/WatchlistItem' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        409: { description: 'Already watching this medicine+pharmacy combination', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } } },
      },
    },
  },

  '/watchlist/{id}': {
    delete: {
      tags: ['Watchlist & Notifications'],
      summary: 'Remove from watchlist',
      operationId: 'removeFromWatchlist',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' }, description: 'Watchlist entry UUID' }],
      responses: {
        204: { description: 'Removed (no response body)' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ═══ NOTIFICATIONS ════════════════════════════════════════════════════════

  '/notifications': {
    get: {
      tags: ['Watchlist & Notifications'],
      summary: 'Get notifications',
      description:
        'Returns the user\'s notification inbox, newest first. ' +
        'Notification types: `price_drop`, `back_in_stock`, `price_increase`, `pharmacy_approved`, `pharmacy_rejected`, `system`.',
      operationId: 'getNotifications',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'is_read', schema: { type: 'boolean' }, description: 'Filter by read status. Omit for all.' },
        { in: 'query', name: 'type', schema: { type: 'string', enum: ['price_drop', 'back_in_stock', 'price_increase', 'pharmacy_approved', 'pharmacy_rejected', 'system'] } },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        200: {
          description: 'Notification inbox',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                  unread_count: { type: 'integer', example: 3 },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/notifications/read-all': {
    patch: {
      tags: ['Watchlist & Notifications'],
      summary: 'Mark all notifications as read',
      description: 'Bulk-marks all unread notifications as read in a single operation.',
      operationId: 'markAllNotificationsRead',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'All notifications marked as read', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { updated: { type: 'integer', example: 5 } } } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/notifications/{id}/read': {
    patch: {
      tags: ['Watchlist & Notifications'],
      summary: 'Mark notification as read',
      operationId: 'markNotificationRead',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' }, description: 'Notification UUID' }],
      responses: {
        200: {
          description: 'Notification marked as read',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { id: { type: 'string' }, is_read: { type: 'boolean', example: true }, read_at: { $ref: '#/components/schemas/ISOTimestamp' } } } } },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ═══ ADMIN ════════════════════════════════════════════════════════════════

  '/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List all users',
      description: '**Admin only.** Paginated list of all users with role and status filters.',
      operationId: 'adminListUsers',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'role', schema: { type: 'string', enum: ['patient', 'pharmacy_staff', 'admin'] } },
        { in: 'query', name: 'is_active', schema: { type: 'boolean' } },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by name or email' },
        { in: 'query', name: 'sort', schema: { type: 'string', enum: ['created_at', 'full_name', 'email'], default: 'created_at' } },
        { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        200: { description: 'User list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/User' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/users/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update user role or status',
      description: '**Admin only.** Update a user\'s role or activate/deactivate their account. Admins cannot change their own role.',
      operationId: 'adminUpdateUser',
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/UserIdPath' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['patient', 'pharmacy_staff', 'admin'] },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'User updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
        400: { description: 'Cannot change own admin role', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/admin/pharmacies': {
    get: {
      tags: ['Admin'],
      summary: 'List all pharmacies (any status)',
      description: '**Admin only.** Includes pending, approved, suspended, and rejected pharmacies. Includes owner info and inventory count.',
      operationId: 'adminListPharmacies',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'approved', 'suspended', 'rejected'] } },
        { in: 'query', name: 'city', schema: { type: 'string' } },
        { in: 'query', name: 'search', schema: { type: 'string' } },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        200: { description: 'Pharmacy list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Pharmacy' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/pharmacies/{id}/approve': {
    patch: {
      tags: ['Admin'],
      summary: 'Approve a pending pharmacy',
      description: '**Admin only.** Approves the pharmacy and notifies the owner. Pharmacy must be in `pending` status.',
      operationId: 'adminApprovePharmacy',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' } }],
      responses: {
        200: { description: 'Pharmacy approved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', example: 'approved' }, approved_at: { type: 'string' }, approved_by: { type: 'string' } } } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { description: 'Pharmacy is not in pending status', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/admin/pharmacies/{id}/reject': {
    patch: {
      tags: ['Admin'],
      summary: 'Reject a pharmacy',
      description: '**Admin only.** Rejects the pharmacy with a mandatory reason. Owner is notified.',
      operationId: 'adminRejectPharmacy',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 10, maxLength: 500, example: 'Incomplete documentation — please resubmit with valid NAFDAC licence.' } } } } },
      },
      responses: {
        200: { description: 'Pharmacy rejected', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', example: 'rejected' }, rejection_reason: { type: 'string' } } } } } } } },
        400: { description: 'Missing reason or invalid pharmacy state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/admin/pharmacies/{id}/suspend': {
    patch: {
      tags: ['Admin'],
      summary: 'Suspend an approved pharmacy',
      description: '**Admin only.** Suspends an approved pharmacy. The pharmacy\'s inventory is retained but it will not appear in any search results.',
      operationId: 'adminSuspendPharmacy',
      security: [{ BearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { $ref: '#/components/schemas/UUID' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 5, maxLength: 500 } } } } },
      },
      responses: {
        200: { description: 'Pharmacy suspended', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', example: 'suspended' } } } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/admin/medicines': {
    get: {
      tags: ['Admin'],
      summary: 'List all medicines (including inactive)',
      description: '**Admin only.** View all medicines regardless of `is_active` status.',
      operationId: 'adminListMedicines',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'is_active', schema: { type: 'boolean', default: true } },
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        200: { description: 'Medicine list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create a new medicine',
      description: '**Admin only.** Adds a medicine to the global catalogue. The `search_vector` is auto-computed by a DB trigger.',
      operationId: 'adminCreateMedicine',
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMedicineRequest' } } } },
      responses: {
        201: { description: 'Medicine created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Medicine' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        409: { description: 'Medicine name already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConflictResponse' } } } },
      },
    },
  },

  '/admin/medicines/{id}': {
    put: {
      tags: ['Admin'],
      summary: 'Update a medicine',
      description: '**Admin only.** Updates any field on a medicine. All fields are optional. Setting `is_active=false` soft-deletes the medicine.',
      operationId: 'adminUpdateMedicine',
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/MedicineIdPath' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                generic_name: { type: 'string' },
                brand_names: { type: 'array', items: { type: 'string' } },
                category_id: { $ref: '#/components/schemas/UUID' },
                description: { type: 'string' },
                usage_info: { type: 'string' },
                side_effects: { type: 'string' },
                manufacturer: { type: 'string' },
                dosage_form: { type: 'string' },
                strength: { type: 'string' },
                requires_rx: { type: 'boolean' },
                nafdac_number: { type: 'string' },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Medicine updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Medicine' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Dashboard statistics',
      description: '**Admin only.** Returns system-wide counts and metrics. Use `period` to control the time window for new/recent counts.',
      operationId: 'adminGetStats',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'period', schema: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' }, description: 'Time window for "new this period" counts' },
      ],
      responses: {
        200: {
          description: 'Dashboard statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      users: { type: 'object', properties: { total: { type: 'integer' }, new_this_period: { type: 'integer' }, by_role: { type: 'object' } } },
                      pharmacies: { type: 'object', properties: { total: { type: 'integer' }, pending: { type: 'integer' }, approved: { type: 'integer' }, suspended: { type: 'integer' } } },
                      medicines: { type: 'object', properties: { total: { type: 'integer' }, categories: { type: 'integer' } } },
                      inventory: { type: 'object', properties: { total_items: { type: 'integer' }, in_stock_count: { type: 'integer' } } },
                      searches: { type: 'object', properties: { total_this_period: { type: 'integer' } } },
                      notifications: { type: 'object', properties: { sent_this_period: { type: 'integer' } } },
                    },
                  },
                },
              },
              example: {
                success: true,
                data: {
                  users: { total: 4820, new_this_period: 312, by_role: { patient: 4700, pharmacy_staff: 115, admin: 5 } },
                  pharmacies: { total: 115, pending: 3, approved: 108, suspended: 4 },
                  medicines: { total: 892, categories: 18 },
                  inventory: { total_items: 23400, in_stock_count: 21000 },
                  searches: { total_this_period: 18200 },
                  notifications: { sent_this_period: 5600 },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/activity': {
    get: {
      tags: ['Admin'],
      summary: 'Recent activity feed',
      description: '**Admin only.** Returns a timestamped feed of recent system events for admin monitoring.',
      operationId: 'adminGetActivity',
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'type', schema: { type: 'string', enum: ['user_registered', 'pharmacy_registered', 'inventory_update', 'medicine_added'] } },
        { $ref: '#/components/parameters/PageParam' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 50, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Activity feed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', example: 'pharmacy_registered' },
                        actor: { type: 'string', example: 'Chukwuemeka Obi' },
                        target: { type: 'string', example: 'CityPharm Lagos' },
                        timestamp: { $ref: '#/components/schemas/ISOTimestamp' },
                        metadata: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};

// ─── Swagger-Jsdoc Options ────────────────────────────────────────────────────

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Smart Pharmacy Locator & Price Comparison API',
      version: '1.0.0',
      description: `
## Overview
The **Smart Pharmacy Locator API** helps patients find medicines near them, compare prices across pharmacies, and receive real-time alerts when prices drop or items come back in stock.

## Authentication
All protected endpoints require a **Supabase JWT** in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`
Obtain tokens via \`POST /auth/login\` or \`POST /auth/register\`.

## Response Format
All responses follow a consistent envelope:
\`\`\`json
// Success
{ "success": true,  "data": {...}, "message": "...", "meta": { ...pagination } }

// Error
{ "success": false, "data": null, "error": "ERROR_CODE", "message": "...", "details": [...] }
\`\`\`

## Rate Limits
| Route | Window | Limit |
|---|---|---|
| POST /auth/login, /auth/register | 15 min | 10 |
| POST /auth/forgot-password | 60 min | 3 per email |
| GET /medicines/search | 1 min | 60 |
| GET /pharmacies/nearby | 1 min | 60 |
| POST/PATCH /inventory | 1 min | 30 |
| All other authenticated | 1 min | 120 |

## Roles
| Role | Capabilities |
|---|---|
| \`patient\` | Search medicines, compare prices, manage watchlist |
| \`pharmacy_staff\` | All patient capabilities + manage own pharmacy inventory |
| \`admin\` | All capabilities + approve/reject pharmacies, manage medicine catalogue |

## Realtime
Subscribe to live updates via Supabase Realtime:
- **inventory** channel → price/stock changes
- **notifications:{user_id}** channel → new notifications
      `.trim(),
      contact: {
        name: 'Smart Pharmacy API Support',
        email: 'api@smartpharmacy.com',
        url: 'https://smartpharmacy.com/support',
      },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Development' },
      { url: 'https://staging-api.smartpharmacy.com/api/v1', description: 'Staging' },
      { url: 'https://api.smartpharmacy.com/api/v1', description: 'Production' },
    ],
    tags: [
      { name: 'Auth', description: 'Registration, login, session management, password reset, OTP' },
      { name: 'Users', description: 'User profile management and avatar upload' },
      { name: 'Pharmacies', description: 'Pharmacy discovery, registration, and management' },
      { name: 'Medicines', description: 'Medicine search, browsing, and cross-pharmacy price comparison' },
      { name: 'Inventory', description: 'Pharmacy stock and price management (pharmacy staff only)' },
      { name: 'Watchlist & Notifications', description: 'Price-drop alerts and notification inbox' },
      { name: 'Admin', description: 'Admin-only: user management, pharmacy approval, catalogue management, and analytics' },
    ],
    components,
    paths,
  },
  apis: [], // paths defined inline above — no file scanning needed
};

export const swaggerSpec = swaggerJsdoc(options);
