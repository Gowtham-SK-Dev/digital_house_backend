// Business Directory Service - Core Business Logic
import db from '../config/database';
import {
  BusinessProfile,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchFilters,
  BusinessSearchResponse,
  VerificationStatus,
  DocumentType,
  LocationCoordinates,
} from '../types/directory';

export class DirectoryService {
  /**
   * Create a new business profile
   */
  async createBusiness(
    ownerId: string,
    data: CreateBusinessRequest
  ): Promise<BusinessProfile> {
    const query = `
      INSERT INTO business_profiles (
        owner_id, business_name, category_id, description, experience_years,
        address, city, district, state, pincode, location_coordinates,
        working_hours, contact_mode, phone, email, whatsapp, website,
        price_range, service_area, home_delivery, verification_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const result = await db.query(query, [
      ownerId,
      data.businessName,
      data.categoryId,
      data.description || null,
      data.experienceYears,
      data.address || null,
      data.city,
      data.district,
      data.state,
      data.pincode,
      data.locationCoordinates ? JSON.stringify(data.locationCoordinates) : null,
      JSON.stringify(data.workingHours),
      data.contactMode,
      data.phone,
      data.email || null,
      data.whatsapp || null,
      data.website || null,
      data.priceRange || null,
      data.serviceArea || null,
      data.homeDelivery || false,
      VerificationStatus.PENDING,
    ]);

    return result.rows[0];
  }

  /**
   * Get business by ID
   */
  async getBusinessById(businessId: string): Promise<BusinessProfile | null> {
    const query = `
      SELECT * FROM business_profiles 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await db.query(query, [businessId]);
    return result.rows[0] || null;
  }

  /**
   * Get all businesses by owner
   */
  async getBusinessesByOwner(ownerId: string): Promise<BusinessProfile[]> {
    const query = `
      SELECT * FROM business_profiles 
      WHERE owner_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [ownerId]);
    return result.rows;
  }

  /**
   * Update business profile
   */
  async updateBusiness(
    businessId: string,
    ownerId: string,
    data: UpdateBusinessRequest
  ): Promise<BusinessProfile | null> {
    const business = await this.getBusinessById(businessId);
    if (!business || business.ownerId !== ownerId) {
      return null;
    }

    const fields = [];
    const values = [businessId];
    let paramCount = 2;

    if (data.businessName !== undefined) {
      fields.push(`business_name = $${paramCount++}`);
      values.push(data.businessName);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.city !== undefined) {
      fields.push(`city = $${paramCount++}`);
      values.push(data.city);
    }
    if (data.district !== undefined) {
      fields.push(`district = $${paramCount++}`);
      values.push(data.district);
    }
    if (data.state !== undefined) {
      fields.push(`state = $${paramCount++}`);
      values.push(data.state);
    }
    if (data.pincode !== undefined) {
      fields.push(`pincode = $${paramCount++}`);
      values.push(data.pincode);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.workingHours !== undefined) {
      fields.push(`working_hours = $${paramCount++}`);
      values.push(JSON.stringify(data.workingHours));
    }
    if (data.homeDelivery !== undefined) {
      fields.push(`home_delivery = $${paramCount++}`);
      values.push(data.homeDelivery);
    }
    if (data.visibility !== undefined) {
      fields.push(`visibility = $${paramCount++}`);
      values.push(data.visibility);
    }

    if (fields.length === 0) return business;

    const query = `
      UPDATE business_profiles 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Search and filter businesses
   */
  async searchBusinesses(filters: BusinessSearchFilters): Promise<BusinessSearchResponse> {
    let query = `
      SELECT bp.*, bc.category_name,
      COUNT(*) OVER() as total
      FROM business_profiles bp
      LEFT JOIN business_categories bc ON bp.category_id = bc.id
      WHERE bp.deleted_at IS NULL AND bp.is_blocked = false
    `;
    const values: any[] = [];
    let paramCount = 1;

    // Verification filter
    if (filters.verifiedOnly) {
      query += ` AND bp.verification_status = $${paramCount++}`;
      values.push(VerificationStatus.VERIFIED);
    } else {
      query += ` AND bp.verification_status IN ('verified')`;
    }

    // Search query
    if (filters.searchQuery) {
      query += ` AND (
        to_tsvector('english', bp.business_name) @@ plainto_tsquery('english', $${paramCount++})
        OR to_tsvector('english', bp.description) @@ plainto_tsquery('english', $${paramCount})
      )`;
      values.push(filters.searchQuery);
    }

    // Category filter
    if (filters.categoryId) {
      query += ` AND bp.category_id = $${paramCount++}`;
      values.push(filters.categoryId);
    }

    // Location filters
    if (filters.city) {
      query += ` AND LOWER(bp.city) = LOWER($${paramCount++})`;
      values.push(filters.city);
    }
    if (filters.district) {
      query += ` AND LOWER(bp.district) = LOWER($${paramCount++})`;
      values.push(filters.district);
    }
    if (filters.state) {
      query += ` AND LOWER(bp.state) = LOWER($${paramCount++})`;
      values.push(filters.state);
    }

    // Price range filter
    if (filters.priceRange) {
      query += ` AND bp.price_range = $${paramCount++}`;
      values.push(filters.priceRange);
    }

    // Home delivery filter
    if (filters.homeDelivery) {
      query += ` AND bp.home_delivery = true`;
    }

    // Rating filter
    if (filters.rating) {
      query += ` AND bp.average_rating >= $${paramCount++}`;
      values.push(filters.rating);
    }

    // Sorting
    let orderBy = 'bp.created_at DESC';
    if (filters.sortBy === 'rating') {
      orderBy = 'bp.average_rating DESC, bp.total_reviews DESC';
    } else if (filters.sortBy === 'inquiries') {
      orderBy = 'bp.total_inquiries DESC';
    } else if (filters.sortBy === 'name') {
      orderBy = 'bp.business_name ASC';
    }

    query += ` ORDER BY ${orderBy}`;

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;

    return {
      businesses: result.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Get nearby businesses (within radius)
   */
  async getNearbyBusinesses(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<BusinessProfile[]> {
    const query = `
      SELECT *,
      (6371 * acos(cos(radians($1)) * cos(radians(location_coordinates->>'latitude'))
      * cos(radians(location_coordinates->>'longitude') - radians($2))
      + sin(radians($1)) * sin(radians(location_coordinates->>'latitude')))) AS distance
      FROM business_profiles
      WHERE deleted_at IS NULL 
      AND is_blocked = false
      AND verification_status = $3
      AND location_coordinates IS NOT NULL
      HAVING distance < $4
      ORDER BY distance ASC
    `;

    const result = await db.query(query, [
      latitude,
      longitude,
      VerificationStatus.VERIFIED,
      radiusKm,
    ]);

    return result.rows;
  }

  /**
   * Increment inquiry count
   */
  async incrementInquiryCount(businessId: string): Promise<void> {
    const query = `
      UPDATE business_profiles 
      SET total_inquiries = total_inquiries + 1, last_active = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [businessId]);
  }

  /**
   * Update average rating
   */
  async updateAverageRating(businessId: string): Promise<void> {
    const query = `
      UPDATE business_profiles
      SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM business_reviews
        WHERE business_id = $1 
        AND moderation_status = 'approved'
        AND deleted_at IS NULL
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM business_reviews
        WHERE business_id = $1
        AND moderation_status = 'approved'
        AND deleted_at IS NULL
      )
      WHERE id = $1
    `;
    await db.query(query, [businessId]);
  }

  /**
   * Add fraud flag
   */
  async addFraudFlag(businessId: string, flag: string): Promise<void> {
    const query = `
      UPDATE business_profiles
      SET fraud_flags = array_append(fraud_flags, $1)
      WHERE id = $2
      AND NOT fraud_flags @> ARRAY[$1]
    `;
    await db.query(query, [flag, businessId]);
  }

  /**
   * Check for fraud indicators
   */
  detectFraudIndicators(
    businessName: string,
    description: string,
    phone: string,
    email: string
  ): string[] {
    const flags: string[] = [];

    // Check for external links
    const linkPattern = /(http|https):\/\/|www\./gi;
    if (linkPattern.test(description)) {
      flags.push('external_links_in_description');
    }

    // Check for multiple phone numbers
    const phonePattern = /(\d{10}|\d{3}-\d{3}-\d{4})/g;
    const phoneMatches = description.match(phonePattern);
    if (phoneMatches && phoneMatches.length > 1) {
      flags.push('multiple_phone_numbers');
    }

    // Check for suspicious keywords
    const suspiciousKeywords = [
      'earn money',
      'get rich',
      'guaranteed',
      'free money',
      'no investment',
    ];
    const suspicious = suspiciousKeywords.some((keyword) =>
      description.toLowerCase().includes(keyword)
    );
    if (suspicious) {
      flags.push('suspicious_keywords');
    }

    return flags;
  }

  /**
   * Soft delete business
   */
  async deleteBusiness(businessId: string, ownerId: string): Promise<boolean> {
    const business = await this.getBusinessById(businessId);
    if (!business || business.ownerId !== ownerId) {
      return false;
    }

    const query = `
      UPDATE business_profiles 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [businessId]);
    return result.rows.length > 0;
  }

  /**
   * Get business statistics
   */
  async getBusinessStats(businessId: string): Promise<any> {
    const query = `
      SELECT
        bp.total_inquiries,
        bp.total_reviews,
        bp.average_rating,
        COUNT(DISTINCT br.id) as approved_reviews,
        COUNT(DISTINCT bi.id) as inquiries_this_month,
        (
          SELECT COUNT(*)
          FROM business_inquiries
          WHERE business_id = $1 AND status = 'completed'
        ) as completed_inquiries
      FROM business_profiles bp
      LEFT JOIN business_reviews br ON bp.id = br.business_id AND br.moderation_status = 'approved'
      LEFT JOIN business_inquiries bi ON bp.id = bi.business_id 
        AND DATE_TRUNC('month', bi.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE bp.id = $1
      GROUP BY bp.id, bp.total_inquiries, bp.total_reviews, bp.average_rating
    `;

    const result = await db.query(query, [businessId]);
    return result.rows[0] || null;
  }

  /**
   * Add service to business
   */
  async addService(
    businessId: string,
    serviceName: string,
    description?: string,
    price?: number
  ): Promise<any> {
    const query = `
      INSERT INTO business_services (business_id, service_name, description, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      businessId,
      serviceName,
      description || null,
      price || null,
    ]);

    return result.rows[0];
  }

  /**
   * Get services for business
   */
  async getServices(businessId: string): Promise<any[]> {
    const query = `
      SELECT * FROM business_services
      WHERE business_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Get public business categories
   */
  async getCategories(): Promise<any[]> {
    const query = `
      SELECT id, category_name, icon_url, slug
      FROM business_categories
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY category_name ASC
    `;

    const result = await db.query(query);
    return result.rows;
  }
}

export default new DirectoryService();
