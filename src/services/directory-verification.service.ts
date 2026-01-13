// Business Verification Service
import db from '../config/database';
import { VerificationStatus, DocumentType } from '../types/directory';

export class DirectoryVerificationService {
  /**
   * Upload verification document
   */
  async uploadDocument(
    businessId: string,
    documentType: DocumentType,
    fileUrl: string,
    fileName: string,
    uploadedBy: string,
    isWatermarked: boolean = false,
    watermarkedUrl?: string
  ): Promise<any> {
    const query = `
      INSERT INTO business_verification_documents (
        business_id, document_type, file_url, file_name, uploaded_by,
        is_watermarked, watermarked_url, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      businessId,
      documentType,
      fileUrl,
      fileName,
      uploadedBy,
      isWatermarked,
      watermarkedUrl || null,
      VerificationStatus.PENDING,
    ]);

    return result.rows[0];
  }

  /**
   * Get verification documents for business
   */
  async getDocuments(businessId: string): Promise<any[]> {
    const query = `
      SELECT * FROM business_verification_documents
      WHERE business_id = $1 AND deleted_at IS NULL
      ORDER BY document_type ASC, created_at DESC
    `;

    const result = await db.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Get required documents for verification
   */
  getRequiredDocuments(): DocumentType[] {
    return [
      DocumentType.ID_PROOF,
      DocumentType.BUSINESS_PROOF,
      DocumentType.LOCATION_PROOF,
      DocumentType.COMMUNITY_PROOF,
    ];
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(businessId: string): Promise<any> {
    const query = `
      SELECT
        bp.verification_status,
        bp.verified_at,
        COUNT(DISTINCT CASE WHEN bvd.verification_status = $2 THEN bvd.id END) as approved_docs,
        COUNT(DISTINCT bvd.id) as total_docs
      FROM business_profiles bp
      LEFT JOIN business_verification_documents bvd ON bp.id = bvd.business_id
      WHERE bp.id = $1
      GROUP BY bp.id, bp.verification_status, bp.verified_at
    `;

    const result = await db.query(query, [businessId, VerificationStatus.VERIFIED]);
    return result.rows[0] || null;
  }

  /**
   * Verify business (admin)
   */
  async verifyBusiness(
    businessId: string,
    verifiedBy: string,
    approve: boolean,
    rejectionReason?: string
  ): Promise<any> {
    const status = approve ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const query = `
      UPDATE business_profiles
      SET verification_status = $1,
          verified_by = $2,
          verification_date = CURRENT_TIMESTAMP,
          rejection_reason = $3,
          last_active = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [
      status,
      verifiedBy,
      rejectionReason || null,
      businessId,
    ]);

    // Mark documents as verified
    if (approve) {
      await this.approveDocuments(businessId, verifiedBy);
    }

    return result.rows[0];
  }

  /**
   * Approve all documents
   */
  private async approveDocuments(businessId: string, verifiedBy: string): Promise<void> {
    const query = `
      UPDATE business_verification_documents
      SET verification_status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP
      WHERE business_id = $3 AND verification_status = $4
    `;

    await db.query(query, [
      VerificationStatus.VERIFIED,
      verifiedBy,
      businessId,
      VerificationStatus.PENDING,
    ]);
  }

  /**
   * Verify specific document
   */
  async verifyDocument(
    documentId: string,
    verify: boolean,
    verifiedBy: string,
    rejectionReason?: string
  ): Promise<any> {
    const status = verify ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const query = `
      UPDATE business_verification_documents
      SET verification_status = $1,
          verified_by = $2,
          verified_at = CURRENT_TIMESTAMP,
          rejection_reason = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [status, verifiedBy, rejectionReason || null, documentId]);

    return result.rows[0];
  }

  /**
   * Request document re-upload
   */
  async requestReupload(documentId: string, reason: string): Promise<void> {
    const query = `
      UPDATE business_verification_documents
      SET verification_status = $1, rejection_reason = $2
      WHERE id = $3
    `;

    await db.query(query, [VerificationStatus.REJECTED, reason, documentId]);
  }

  /**
   * Add fraud flag to document
   */
  async flagDocument(documentId: string, flag: string): Promise<void> {
    const query = `
      UPDATE business_verification_documents
      SET fraud_flags = array_append(fraud_flags, $1)
      WHERE id = $2
      AND NOT fraud_flags @> ARRAY[$1]
    `;

    await db.query(query, [flag, documentId]);
  }

  /**
   * Get pending verifications (admin)
   */
  async getPendingVerifications(limit: number = 50, offset: number = 0): Promise<any> {
    const query = `
      SELECT bp.*, bc.category_name, 
        COUNT(bvd.id) as total_documents,
        COUNT(DISTINCT CASE WHEN bvd.verification_status = $1 THEN bvd.id END) as verified_documents
      FROM business_profiles bp
      LEFT JOIN business_categories bc ON bp.category_id = bc.id
      LEFT JOIN business_verification_documents bvd ON bp.id = bvd.business_id
      WHERE bp.verification_status = $2 AND bp.deleted_at IS NULL
      GROUP BY bp.id, bc.category_name
      ORDER BY bp.created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [
      VerificationStatus.VERIFIED,
      VerificationStatus.PENDING,
      limit,
      offset,
    ]);

    return result.rows;
  }

  /**
   * Get verification statistics (admin)
   */
  async getVerificationStats(): Promise<any> {
    const query = `
      SELECT
        COUNT(CASE WHEN verification_status = $1 THEN 1 END) as pending,
        COUNT(CASE WHEN verification_status = $2 THEN 1 END) as verified,
        COUNT(CASE WHEN verification_status = $3 THEN 1 END) as rejected,
        COUNT(*) as total
      FROM business_profiles
      WHERE deleted_at IS NULL
    `;

    const result = await db.query(query, [
      VerificationStatus.PENDING,
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED,
    ]);

    return result.rows[0];
  }

  /**
   * Check document completion
   */
  async checkDocumentCompletion(businessId: string): Promise<{ complete: boolean; percentage: number }> {
    const required = this.getRequiredDocuments().length;

    const query = `
      SELECT COUNT(*) as uploaded
      FROM business_verification_documents
      WHERE business_id = $1
      AND document_type = ANY($2)
      AND deleted_at IS NULL
    `;

    const result = await db.query(query, [businessId, required]);
    const uploaded = parseInt(result.rows[0].uploaded) || 0;
    const percentage = (uploaded / required) * 100;

    return {
      complete: uploaded === required,
      percentage: Math.round(percentage),
    };
  }

  /**
   * Block business (admin)
   */
  async blockBusiness(businessId: string, reason: string): Promise<any> {
    const query = `
      UPDATE business_profiles
      SET is_blocked = true, blocked_reason = $1, blocked_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [reason, businessId]);
    return result.rows[0];
  }

  /**
   * Unblock business (admin)
   */
  async unblockBusiness(businessId: string): Promise<any> {
    const query = `
      UPDATE business_profiles
      SET is_blocked = false, blocked_reason = NULL, blocked_at = NULL
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [businessId]);
    return result.rows[0];
  }
}

export default new DirectoryVerificationService();
