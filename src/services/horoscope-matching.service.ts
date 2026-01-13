// Backend/src/services/horoscope-matching.service.ts
// Horoscope compatibility matching algorithm implementation

import { db } from '../config/database';
import { HoroscopeMatch } from '../types/marriage';

export class HoroscopeMatchingService {
  /**
   * Calculate complete horoscope match between two profiles
   */
  async calculateMatch(profile1Id: string, profile2Id: string): Promise<HoroscopeMatch> {
    try {
      // Fetch both profiles with horoscope data
      const profile1 = await this.getProfileHoroscope(profile1Id);
      const profile2 = await this.getProfileHoroscope(profile2Id);

      if (!profile1 || !profile2) {
        throw new Error('One or both profiles do not have horoscope data');
      }

      // Calculate each porutham
      const scores = {
        dinaPorutham: this.calculateDinaPorutham(profile1, profile2),
        ganaPorutham: this.calculateGanaPorutham(profile1, profile2),
        yoniPorutham: this.calculateYoniPorutham(profile1, profile2),
        rasiPorutham: this.calculateRasiPorutham(profile1, profile2),
        rajjuPorutham: this.calculateRajjuPorutham(profile1, profile2),
        vasyaPorutham: this.calculateVasyaPorutham(profile1, profile2),
        mahendraPouthram: this.calculateMahendraPouthram(profile1, profile2),
        striDirghaPorutham: this.calculateStriDirghaPorutham(profile1, profile2),
        vedhaPorutham: this.calculateVedhaPorutham(profile1, profile2),
        bhakutPorutham: this.calculateBhakutPorutham(profile1, profile2),
      };

      // Calculate total
      const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
      const percentage = (totalScore / 45) * 100;
      const rating = this.getRating(percentage);

      // Save to database
      const matchId = require('uuid').v4();

      const query = `
        INSERT INTO horoscope_matches (
          id, profile1_id, profile2_id,
          dina_porutham, gana_porutham, yoni_porutham, rasi_porutham, rajju_porutham,
          vasya_porutham, mahendra_porutham, stri_dirgha_porutham, vedha_porutham, bhakut_porutham,
          total_score, percentage, rating, created_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, NOW()
        )
        ON CONFLICT (profile1_id, profile2_id) DO UPDATE SET
          dina_porutham = EXCLUDED.dina_porutham,
          gana_porutham = EXCLUDED.gana_porutham,
          yoni_porutham = EXCLUDED.yoni_porutham,
          rasi_porutham = EXCLUDED.rasi_porutham,
          rajju_porutham = EXCLUDED.rajju_porutham,
          vasya_porutham = EXCLUDED.vasya_porutham,
          mahendra_porutham = EXCLUDED.mahendra_porutham,
          stri_dirgha_porutham = EXCLUDED.stri_dirgha_porutham,
          vedha_porutham = EXCLUDED.vedha_porutham,
          bhakut_porutham = EXCLUDED.bhakut_porutham,
          total_score = EXCLUDED.total_score,
          percentage = EXCLUDED.percentage,
          rating = EXCLUDED.rating
        RETURNING *;
      `;

      const result = await db.query(query, [
        matchId,
        profile1Id,
        profile2Id,
        scores.dinaPorutham,
        scores.ganaPorutham,
        scores.yoniPorutham,
        scores.rasiPorutham,
        scores.rajjuPorutham,
        scores.vasyaPorutham,
        scores.mahendraPouthram,
        scores.striDirghaPorutham,
        scores.vedhaPorutham,
        scores.bhakutPorutham,
        totalScore,
        percentage,
        rating,
      ]);

      return this.formatMatch(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to calculate match: ${error.message}`);
    }
  }

  /**
   * Get stored horoscope match
   */
  async getMatch(profile1Id: string, profile2Id: string): Promise<HoroscopeMatch | null> {
    try {
      const result = await db.query(
        `SELECT * FROM horoscope_matches
         WHERE (profile1_id = $1 AND profile2_id = $2)
         OR (profile1_id = $2 AND profile2_id = $1)`,
        [profile1Id, profile2Id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatMatch(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to get match: ${error.message}`);
    }
  }

  /**
   * Dina Porutham (0-4 points)
   * Matching of star/nakshatras
   */
  private calculateDinaPorutham(profile1: any, profile2: any): number {
    const nakshatras1 = this.getNakshatraIndex(profile1.natchathiram);
    const nakshatras2 = this.getNakshatraIndex(profile2.natchathiram);

    const difference = Math.abs(nakshatras1 - nakshatras2);

    // Rules for Dina Porutham
    if (difference === 0) return 0; // Same nakshatra - no match
    if (difference === 2 || difference === 4 || difference === 7 || difference === 9 || difference === 11) {
      return 4; // Excellent
    }
    if (difference === 1 || difference === 3 || difference === 5 || difference === 8 || difference === 10 || difference === 12) {
      return 2; // Average
    }
    if (difference === 6) return 0; // No match
    return 2;
  }

  /**
   * Gana Porutham (0-6 points)
   * Matching of temperament/nature
   */
  private calculateGanaPorutham(profile1: any, profile2: any): number {
    const gana1 = this.getGana(profile1.natchathiram);
    const gana2 = this.getGana(profile2.natchathiram);

    // Gana compatibility matrix
    if (gana1 === gana2) return 6; // Same gana - excellent
    if ((gana1 === 'dev' && gana2 === 'manushya') || (gana1 === 'manushya' && gana2 === 'dev')) {
      return 4; // Good
    }
    if ((gana1 === 'dev' && gana2 === 'rakshasa') || (gana1 === 'rakshasa' && gana2 === 'dev')) {
      return 0; // No match
    }
    if ((gana1 === 'manushya' && gana2 === 'rakshasa') || (gana1 === 'rakshasa' && gana2 === 'manushya')) {
      return 2; // Below average
    }
    return 2;
  }

  /**
   * Yoni Porutham (0-4 points)
   * Matching of animal nature/sexual compatibility
   */
  private calculateYoniPorutham(profile1: any, profile2: any): number {
    const yoni1 = this.getYoni(profile1.natchathiram);
    const yoni2 = this.getYoni(profile2.natchathiram);

    // Compatible yoni pairs
    const compatiblePairs = [
      ['ashva', 'ashva'],
      ['gaj', 'gaj'],
      ['mesh', 'mesh'],
      ['simha', 'simha'],
      ['sarpa', 'sarpa'],
      ['shvan', 'shvan'],
      ['marjara', 'marjara'],
      ['nakra', 'nakra'],
    ];

    const isPair = compatiblePairs.some(
      pair => (yoni1 === pair[0] && yoni2 === pair[1]) || (yoni1 === pair[1] && yoni2 === pair[0])
    );

    if (isPair) return 4; // Perfect match
    if (this.areYoniNeutral(yoni1, yoni2)) return 2; // Neutral
    return 0; // Incompatible
  }

  /**
   * Rasi Porutham (0-7 points)
   * Matching of zodiac signs
   */
  private calculateRasiPorutham(profile1: any, profile2: any): number {
    const rasi1 = this.getRasiIndex(profile1.raasi);
    const rasi2 = this.getRasiIndex(profile2.raasi);

    if (rasi1 === rasi2) return 0; // Same rasi - no compatibility

    const difference = Math.abs(rasi1 - rasi2);

    // Rasi compatibility rules
    if (difference === 5 || difference === 7) return 7; // Excellent
    if (difference === 2 || difference === 9 || difference === 10 || difference === 12) return 4; // Good
    if (difference === 3 || difference === 6 || difference === 11) return 2; // Average
    if (difference === 8) return 0; // Enemy rasi - no match
    if (difference === 4) return 2; // Quatra - below average

    return 2;
  }

  /**
   * Rajju Porutham (0-8 points)
   * Matching of longevity/lifespan
   */
  private calculateRajjuPorutham(profile1: any, profile2: any): number {
    const rajju1 = this.getRajju(profile1.natchathiram);
    const rajju2 = this.getRajju(profile2.natchathiram);

    // If same rajju - it's called "rajju dosha" - no match
    if (rajju1 === rajju2) return 0;

    // Different rajju - good compatibility
    return 8;
  }

  /**
   * Vasya Porutham (0-2 points)
   * Matching of control/domination in relationship
   */
  private calculateVasyaPorutham(profile1: any, profile2: any): number {
    const vasya1 = this.getVasya(profile1.natchathiram);
    const vasya2 = this.getVasya(profile2.natchathiram);

    // Vasya categories: Chatushpada, Manushya, Jalachara

    // Same vasya - excellent
    if (vasya1 === vasya2) return 2;

    // Different vasya - no match
    return 0;
  }

  /**
   * Mahendra Porutham (0-5 points)
   * Matching for prosperity/wealth
   */
  private calculateMahendraPouthram(profile1: any, profile2: any): number {
    const nakshatras1 = this.getNakshatraIndex(profile1.natchathiram);
    const nakshatras2 = this.getNakshatraIndex(profile2.natchathiram);

    const difference = Math.abs(nakshatras1 - nakshatras2);

    // Mahendra porutham rules
    if (difference === 7) return 5; // Perfect
    if (difference === 4 || difference === 9) return 3; // Good
    if (difference === 1 || difference === 2 || difference === 11 || difference === 12) return 1; // Average
    return 0;
  }

  /**
   * Stri Dirgha Porutham (0-3 points)
   * Matching for longevity of female
   */
  private calculateStriDirghaPorutham(profile1: any, profile2: any): number {
    // Female is profile1, male is profile2
    const femaleNakshatra = this.getNakshatraIndex(profile1.natchathiram);
    const maleNakshatra = this.getNakshatraIndex(profile2.natchathiram);

    const difference = Math.abs(femaleNakshatra - maleNakshatra);

    // Rules for female longevity
    if (difference >= 3 && difference <= 11) return 3; // Good
    if (difference === 1 || difference === 2 || difference === 12) return 1; // Below average
    return 0;
  }

  /**
   * Vedha Porutham (0-2 points)
   * Matching for harmony/understanding
   */
  private calculateVedhaPorutham(profile1: any, profile2: any): number {
    const nakshatras1 = this.getNakshatraIndex(profile1.natchathiram);
    const nakshatras2 = this.getNakshatraIndex(profile2.natchathiram);

    // Vedha pairs (nakshatras that oppose each other)
    const vedhaPairs = [
      [1, 14],
      [2, 15],
      [3, 16],
      [4, 17],
      [5, 18],
      [6, 19],
      [7, 20],
      [8, 21],
      [9, 22],
      [10, 23],
      [11, 24],
      [12, 25],
      [13, 26],
    ];

    const hasVedha = vedhaPairs.some(
      pair => (nakshatras1 === pair[0] && nakshatras2 === pair[1]) ||
              (nakshatras1 === pair[1] && nakshatras2 === pair[0])
    );

    return hasVedha ? 0 : 2; // No vedha = good match
  }

  /**
   * Bhakut Porutham (0-4 points)
   * Matching for sexual/physical compatibility
   */
  private calculateBhakutPorutham(profile1: any, profile2: any): number {
    const nakshatras1 = this.getNakshatraIndex(profile1.natchathiram);
    const nakshatras2 = this.getNakshatraIndex(profile2.natchathiram);

    const difference = Math.abs(nakshatras1 - nakshatras2);

    // Bhakut compatibility rules
    if (difference === 7) return 4; // Excellent
    if (difference === 2 || difference === 12) return 2; // Good
    if (difference === 1 || difference === 3 || difference === 4 || difference === 5 || difference === 9 || difference === 10 || difference === 11) {
      return 1; // Below average
    }
    if (difference === 6 || difference === 8) return 0; // No match
    return 1;
  }

  /**
   * Get rating based on compatibility percentage
   */
  private getRating(percentage: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (percentage >= 85) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
  }

  /**
   * Helper: Get nakshatra index (1-27)
   */
  private getNakshatraIndex(nakshatraName: string): number {
    const nakshatras = [
      'ashwini', 'bharani', 'krittika', 'rohini', 'mrigashirsha', 'ardra', 'punarvasu',
      'pushyami', 'aslesha', 'magha', 'purva phalguni', 'uttara phalguni', 'hasta',
      'chitra', 'swati', 'vishakha', 'anuradha', 'jyeshtha', 'mula', 'purvashadha',
      'uttrashadha', 'sravana', 'dhanishta', 'shatabhisha', 'purva bhadrapada', 'uttara bhadrapada', 'revati',
    ];

    return nakshatras.indexOf(nakshatraName.toLowerCase()) + 1;
  }

  /**
   * Helper: Get Gana (dev, manushya, rakshasa)
   */
  private getGana(nakshatraName: string): string {
    const ganaNakshatras: { [key: string]: string } = {
      ashwini: 'dev', bharani: 'manushya', krittika: 'rakshasa', rohini: 'rakshasa',
      mrigashirsha: 'dev', ardra: 'rakshasa', punarvasu: 'dev', pushyami: 'dev',
      aslesha: 'rakshasa', magha: 'rakshasa', 'purva phalguni': 'rakshasa',
      'uttara phalguni': 'rakshasa', hasta: 'dev', chitra: 'dev', swati: 'rakshasa',
      vishakha: 'rakshasa', anuradha: 'manushya', jyeshtha: 'rakshasa', mula: 'rakshasa',
      purvashadha: 'manushya', uttrashadha: 'manushya', sravana: 'dev', dhanishta: 'rakshasa',
      shatabhisha: 'rakshasa', 'purva bhadrapada': 'rakshasa', 'uttara bhadrapada': 'dev', revati: 'dev',
    };

    return ganaNakshatras[nakshatraName.toLowerCase()] || 'dev';
  }

  /**
   * Helper: Get Yoni
   */
  private getYoni(nakshatraName: string): string {
    const yoniNakshatras: { [key: string]: string } = {
      ashwini: 'ashva', bharani: 'gaj', krittika: 'mesh', rohini: 'snake',
      mrigashirsha: 'sarpa', ardra: 'shvan', punarvasu: 'marjara', pushyami: 'sheep',
      aslesha: 'snake', magha: 'lion', 'purva phalguni': 'rat', 'uttara phalguni': 'cow',
      hasta: 'buffalo', chitra: 'tiger', swati: 'buffalo', vishakha: 'tiger',
      anuradha: 'deer', jyeshtha: 'lion', mula: 'dog', purvashadha: 'monkey',
      uttrashadha: 'monkey', sravana: 'monkey', dhanishta: 'lion', shatabhisha: 'horse',
      'purva bhadrapada': 'lion', 'uttara bhadrapada': 'cow', revati: 'elephant',
    };

    return yoniNakshatras[nakshatraName.toLowerCase()] || 'unknown';
  }

  /**
   * Helper: Get Rasi index (1-12)
   */
  private getRasiIndex(rasiName: string): number {
    const rasis = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    return rasis.indexOf(rasiName.toLowerCase()) + 1;
  }

  /**
   * Helper: Get Rajju
   */
  private getRajju(nakshatraName: string): string {
    const rajjuNakshatras: { [key: string]: string } = {
      ashwini: 'head', bharani: 'head', krittika: 'head', rohini: 'neck', mrigashirsha: 'neck',
      ardra: 'neck', punarvasu: 'neck', pushyami: 'chest', aslesha: 'chest', magha: 'chest',
      'purva phalguni': 'waist', 'uttara phalguni': 'waist', hasta: 'waist', chitra: 'waist',
      swati: 'waist', vishakha: 'hip', anuradha: 'hip', jyeshtha: 'hip', mula: 'hip',
      purvashadha: 'hip', uttrashadha: 'thigh', sravana: 'thigh', dhanishta: 'thigh',
      shatabhisha: 'legs', 'purva bhadrapada': 'legs', 'uttara bhadrapada': 'feet', revati: 'feet',
    };

    return rajjuNakshatras[nakshatraName.toLowerCase()] || 'unknown';
  }

  /**
   * Helper: Get Vasya
   */
  private getVasya(nakshatraName: string): string {
    const vasyaNakshatras: { [key: string]: string } = {
      ashwini: 'manushya', bharani: 'chatushpada', krittika: 'manushya', rohini: 'chatushpada',
      mrigashirsha: 'chatushpada', ardra: 'manushya', punarvasu: 'manushya', pushyami: 'chatushpada',
      aslesha: 'jalachara', magha: 'manushya', 'purva phalguni': 'chatushpada',
      'uttara phalguni': 'manushya', hasta: 'chatushpada', chitra: 'jalachara', swati: 'manushya',
      vishakha: 'manushya', anuradha: 'chatushpada', jyeshtha: 'manushya', mula: 'chatushpada',
      purvashadha: 'jalachara', uttrashadha: 'manushya', sravana: 'manushya', dhanishta: 'manushya',
      shatabhisha: 'chatushpada', 'purva bhadrapada': 'manushya', 'uttara bhadrapada': 'jalachara', revati: 'chatushpada',
    };

    return vasyaNakshatras[nakshatraName.toLowerCase()] || 'manushya';
  }

  /**
   * Helper: Check if two yonis are neutral
   */
  private areYoniNeutral(yoni1: string, yoni2: string): boolean {
    const neutralPairs = [
      ['ashva', 'gaj'],
      ['mesh', 'sarpa'],
      ['lion', 'tiger'],
      ['monkey', 'deer'],
    ];

    return neutralPairs.some(
      pair => (yoni1 === pair[0] && yoni2 === pair[1]) || (yoni1 === pair[1] && yoni2 === pair[0])
    );
  }

  /**
   * Helper: Get profile horoscope data
   */
  private async getProfileHoroscope(profileId: string): Promise<any> {
    const result = await db.query(
      `SELECT natchathiram, raasi FROM marriage_profiles WHERE id = $1`,
      [profileId]
    );

    return result.rows[0] || null;
  }

  /**
   * Helper: Format match result
   */
  private formatMatch(row: any): HoroscopeMatch {
    return {
      id: row.id,
      profile1Id: row.profile1_id,
      profile2Id: row.profile2_id,
      dinaPorutham: row.dina_porutham,
      ganaPorutham: row.gana_porutham,
      yoniPorutham: row.yoni_porutham,
      rasiPorutham: row.rasi_porutham,
      rajjuPorutham: row.rajju_porutham,
      vasyaPorutham: row.vasya_porutham,
      mahendraPouthram: row.mahendra_porutham,
      striDirghaPorutham: row.stri_dirgha_porutham,
      vedhaPorutham: row.vedha_porutham,
      bhakutPorutham: row.bhakut_porutham,
      totalScore: row.total_score,
      percentage: row.percentage,
      rating: row.rating,
      calculatedAt: row.created_at,
      createdAt: row.created_at,
    };
  }
}
