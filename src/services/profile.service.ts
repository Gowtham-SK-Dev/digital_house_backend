import { PostgresDB } from '@config/database';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  AdminVerificationRequest, 
  ProfileViewResponse,
  PrivacyLevel,
  ProfilePrivacy
} from '@types/index';
import { generateId } from '@utils/helpers';

/**
 * User Profile Service
 * Handles profile creation, updates, retrieval, and privacy controls
 */
export class ProfileService {
  /**
   * Initialize profile table (run once during setup)
   */
  static async initializeProfileTable(): Promise<void> {
    const pool = PostgresDB.getPool();
    
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          photo VARCHAR(500),
          location VARCHAR(255),
          work VARCHAR(255),
          bio TEXT,
          marital_status VARCHAR(50),
          interests TEXT[],
          business_info JSONB,
          skills TEXT[],
          verified BOOLEAN DEFAULT FALSE,
          verification_date TIMESTAMP,
          verification_notes TEXT,
          privacy JSONB DEFAULT '{"photo":"public","work":"friends","maritalStatus":"friends","interests":"public","businessInfo":"friends","skills":"public","bio":"public","location":"friends"}',
          last_profile_update TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(verified);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
      `);
      
      console.log('✓ Profile table initialized');
    } catch (error) {
      console.error('Error initializing profile table:', error);
      throw error;
    }
  }

  /**
   * Create a new profile for a user
   */
  static async createProfile(userId: string, userData: any): Promise<UserProfile> {
    const pool = PostgresDB.getPool();
    const profileId = generateId();
    
    try {
      const defaultPrivacy: ProfilePrivacy = {
        photo: 'public',
        work: 'friends',
        maritalStatus: 'friends',
        interests: 'public',
        businessInfo: 'friends',
        skills: 'public',
        bio: 'public',
        location: 'friends'
      };

      const result = await pool.query(
        `INSERT INTO user_profiles 
        (id, user_id, first_name, last_name, photo, privacy, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          profileId,
          userId,
          userData.firstName || '',
          userData.lastName || '',
          userData.profilePicture || null,
          JSON.stringify(defaultPrivacy)
        ]
      );

      return this.mapDbToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Get profile by user ID
   */
  static async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const pool = PostgresDB.getPool();
    
    try {
      const result = await pool.query(
        `SELECT p.*, u.email, u.phone, u.created_at, u.updated_at
         FROM user_profiles p
         JOIN users u ON p.user_id = u.id
         WHERE p.user_id = $1`,
        [userId]
      );

      return result.rows.length > 0 ? this.mapDbToProfile(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Get public profile view with privacy controls
   */
  static async getProfileView(
    profileUserId: string, 
    viewerUserId?: string
  ): Promise<ProfileViewResponse> {
    const profile = await this.getProfileByUserId(profileUserId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Check if viewer has full access
    const hasFullAccess = !viewerUserId || viewerUserId === profileUserId || 
                          await this.checkIfFriends(viewerUserId, profileUserId);

    // Apply privacy filters
    const filtered = this.applyPrivacyFilters(profile, hasFullAccess, profile.privacy);

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photo: filtered.photo,
      location: filtered.location,
      bio: filtered.bio,
      work: filtered.work,
      maritalStatus: filtered.maritalStatus,
      interests: filtered.interests,
      businessInfo: filtered.businessInfo,
      skills: filtered.skills,
      verified: profile.verified,
      posts: profile.posts,
      followers: profile.followers,
      following: profile.following,
      isFollowing: profile.isFollowing,
      lastProfileUpdate: profile.lastProfileUpdate,
      hasFullAccess,
      hiddenFields: this.getHiddenFields(profile, hasFullAccess, profile.privacy)
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: UpdateProfileRequest
  ): Promise<UserProfile> {
    const pool = PostgresDB.getPool();
    
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updatedPrivacy = {
        ...profile.privacy,
        ...updates.privacy
      };

      const result = await pool.query(
        `UPDATE user_profiles 
         SET 
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          photo = COALESCE($3, photo),
          location = COALESCE($4, location),
          work = COALESCE($5, work),
          bio = COALESCE($6, bio),
          marital_status = COALESCE($7, marital_status),
          interests = COALESCE($8, interests),
          business_info = COALESCE($9, business_info),
          skills = COALESCE($10, skills),
          privacy = $11,
          last_profile_update = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $12
         RETURNING *`,
        [
          updates.firstName,
          updates.lastName,
          updates.photo,
          updates.location,
          updates.work,
          updates.bio,
          updates.maritalStatus,
          updates.interests ? JSON.stringify(updates.interests) : null,
          updates.businessInfo ? JSON.stringify(updates.businessInfo) : null,
          updates.skills ? JSON.stringify(updates.skills) : null,
          JSON.stringify(updatedPrivacy),
          userId
        ]
      );

      return this.mapDbToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Admin: Verify/Unverify user profile
   */
  static async verifyProfile(
    adminId: string,
    request: AdminVerificationRequest
  ): Promise<UserProfile> {
    const pool = PostgresDB.getPool();
    
    try {
      // Check if admin has permission (this should be checked in the route handler)
      const result = await pool.query(
        `UPDATE user_profiles 
         SET 
          verified = $1,
          verification_date = $2,
          verification_notes = $3,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4
         RETURNING *`,
        [
          request.verified,
          request.verified ? new Date() : null,
          request.verificationNotes,
          request.userId
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }

      return this.mapDbToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error verifying profile:', error);
      throw error;
    }
  }

  /**
   * Get pending verification profiles (Admin only)
   */
  static async getPendingVerifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ profiles: UserProfile[]; total: number }> {
    const pool = PostgresDB.getPool();
    
    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM user_profiles WHERE verified = FALSE`
      );

      const result = await pool.query(
        `SELECT p.*, u.email, u.phone, u.created_at, u.updated_at
         FROM user_profiles p
         JOIN users u ON p.user_id = u.id
         WHERE p.verified = FALSE
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        profiles: result.rows.map(row => this.mapDbToProfile(row)),
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      throw error;
    }
  }

  /**
   * Search profiles by location or interests
   */
  static async searchProfiles(
    searchQuery: string,
    filters?: {
      location?: string;
      interests?: string[];
      verified?: boolean;
    },
    viewerUserId?: string
  ): Promise<ProfileViewResponse[]> {
    const pool = PostgresDB.getPool();
    
    try {
      let query = `
        SELECT p.*, u.email, u.phone, u.created_at, u.updated_at
        FROM user_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR p.bio ILIKE $1)
      `;
      const params: any[] = [`%${searchQuery}%`];
      let paramCount = 2;

      if (filters?.location) {
        query += ` AND p.location ILIKE $${paramCount}`;
        params.push(`%${filters.location}%`);
        paramCount++;
      }

      if (filters?.verified !== undefined) {
        query += ` AND p.verified = $${paramCount}`;
        params.push(filters.verified);
        paramCount++;
      }

      query += ` LIMIT 20`;

      const result = await pool.query(query, params);

      return result.rows.map(row => {
        const profile = this.mapDbToProfile(row);
        const hasFullAccess = !viewerUserId || viewerUserId === profile.id;
        return this.buildProfileView(profile, hasFullAccess);
      });
    } catch (error) {
      console.error('Error searching profiles:', error);
      throw error;
    }
  }

  // =============== Helper Methods ===============

  private static mapDbToProfile(dbRow: any): UserProfile {
    return {
      id: dbRow.id,
      email: dbRow.email,
      phone: dbRow.phone,
      firstName: dbRow.first_name,
      lastName: dbRow.last_name,
      profilePicture: dbRow.photo,
      location: dbRow.location,
      work: dbRow.work,
      bio: dbRow.bio,
      maritalStatus: dbRow.marital_status,
      interests: dbRow.interests || [],
      businessInfo: dbRow.business_info,
      skills: dbRow.skills || [],
      verified: dbRow.verified,
      verificationDate: dbRow.verification_date,
      verificationNotes: dbRow.verification_notes,
      privacy: dbRow.privacy || {},
      lastProfileUpdate: dbRow.last_profile_update,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private static applyPrivacyFilters(
    profile: UserProfile,
    hasFullAccess: boolean,
    privacy: ProfilePrivacy
  ): any {
    if (hasFullAccess) {
      return {
        photo: profile.profilePicture,
        location: profile.location,
        work: profile.work,
        maritalStatus: profile.maritalStatus,
        interests: profile.interests,
        businessInfo: profile.businessInfo,
        skills: profile.skills,
        bio: profile.bio
      };
    }

    return {
      photo: privacy.photo !== 'private' ? profile.profilePicture : null,
      location: privacy.location !== 'private' ? profile.location : null,
      work: privacy.work !== 'private' ? profile.work : null,
      maritalStatus: privacy.maritalStatus !== 'private' ? profile.maritalStatus : null,
      interests: privacy.interests !== 'private' ? profile.interests : undefined,
      businessInfo: privacy.businessInfo !== 'private' ? profile.businessInfo : null,
      skills: privacy.skills !== 'private' ? profile.skills : undefined,
      bio: privacy.bio !== 'private' ? profile.bio : null
    };
  }

  private static getHiddenFields(
    profile: UserProfile,
    hasFullAccess: boolean,
    privacy: ProfilePrivacy
  ): string[] {
    if (hasFullAccess) return [];

    const hidden: string[] = [];
    const privacyRules = privacy;

    Object.entries(privacyRules).forEach(([field, level]) => {
      if (level === 'private') {
        hidden.push(field);
      }
    });

    return hidden;
  }

  private static buildProfileView(
    profile: UserProfile,
    hasFullAccess: boolean
  ): ProfileViewResponse {
    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photo: hasFullAccess ? profile.profilePicture : profile.profilePicture,
      location: hasFullAccess ? profile.location : profile.location,
      bio: hasFullAccess ? profile.bio : profile.bio,
      work: hasFullAccess ? profile.work : profile.work,
      maritalStatus: hasFullAccess ? profile.maritalStatus : profile.maritalStatus,
      interests: hasFullAccess ? profile.interests : profile.interests,
      businessInfo: hasFullAccess ? profile.businessInfo : profile.businessInfo,
      skills: hasFullAccess ? profile.skills : profile.skills,
      verified: profile.verified,
      posts: profile.posts,
      followers: profile.followers,
      following: profile.following,
      isFollowing: profile.isFollowing,
      lastProfileUpdate: profile.lastProfileUpdate,
      hasFullAccess,
      hiddenFields: this.getHiddenFields(profile, hasFullAccess, profile.privacy)
    };
  }

  private static async checkIfFriends(
    userId1: string,
    userId2: string
  ): Promise<boolean> {
    // This would check the followers/following table
    // For now, returning false - implement based on your relationships table
    return false;
  }
}
