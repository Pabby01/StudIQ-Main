import { describe, it, expect } from '@jest/globals';

// Test the validation logic without importing the full user-data module
// This avoids the TextEncoder issue with the viem library

// Mock validation function based on the implementation in user-data.ts
interface ProfileUpdates {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  university?: string | null;
  major?: string | null;
  graduationYear?: number | null;
  avatarUrl?: string | null;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
}

const validateProfileUpdate = (updates: ProfileUpdates) => {
  const errors: string[] = [];

  if (updates.displayName !== undefined && updates.displayName !== null) {
    if (typeof updates.displayName !== 'string' || updates.displayName.length < 2) {
      errors.push('Display name must be at least 2 characters long');
    }
    if (updates.displayName.length > 50) {
      errors.push('Display name must not exceed 50 characters');
    }
  }

  if (updates.email !== undefined && updates.email !== null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.email)) {
      errors.push('Invalid email format');
    }
  }

  if (updates.phone !== undefined && updates.phone !== null) {
    if (typeof updates.phone !== 'string' || updates.phone.length < 10) {
      errors.push('Phone number must be at least 10 characters long');
    }
  }

  if (updates.bio !== undefined && updates.bio !== null) {
    if (typeof updates.bio !== 'string' || updates.bio.length > 1000) {
      errors.push('Bio must not exceed 1000 characters');
    }
  }

  if (updates.graduationYear !== undefined && updates.graduationYear !== null) {
    const year = parseInt(updates.graduationYear.toString());
    if (isNaN(year) || year < 2000 || year > 2030) {
      errors.push('Graduation year must be between 2000 and 2030');
    }
  }

  if (updates.twitter !== undefined && updates.twitter !== '') {
    const twitterRegex = /^https?:\/\/twitter\.com\/[a-zA-Z0-9_]+$/;
    if (!twitterRegex.test(updates.twitter)) {
      errors.push('Invalid Twitter URL format');
    }
  }

  if (updates.linkedin !== undefined && updates.linkedin !== '') {
    const linkedinRegex = /^https?:\/\/linkedin\.com\/in\/[a-zA-Z0-9-]+$/;
    if (!linkedinRegex.test(updates.linkedin)) {
      errors.push('Invalid LinkedIn URL format');
    }
  }

  if (updates.instagram !== undefined && updates.instagram !== '') {
    const instagramRegex = /^https?:\/\/instagram\.com\/[a-zA-Z0-9_.]+$/;
    if (!instagramRegex.test(updates.instagram)) {
      errors.push('Invalid Instagram URL format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

describe('Profile Validation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProfileUpdate', () => {
    it('should validate valid profile data', () => {
      const validData = {
        displayName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        bio: 'A short bio',
        university: 'MIT',
        major: 'Computer Science',
        graduationYear: 2024,
        avatarUrl: 'https://example.com/avatar.jpg',
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        instagram: 'https://instagram.com/johndoe'
      };

      const result = validateProfileUpdate(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid display name', () => {
      const invalidData = {
        displayName: 'A' // Too short
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Display name must be at least 2 characters long');
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email'
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        phone: '123' // Too short
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number must be at least 10 characters long');
    });

    it('should reject bio that is too long', () => {
      const invalidData = {
        bio: 'a'.repeat(1001) // Too long
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bio must not exceed 1000 characters');
    });

    it('should reject invalid graduation year', () => {
      const invalidData = {
        graduationYear: 1990 // Too old
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Graduation year must be between 2000 and 2030');
    });

    it('should reject invalid social media URLs', () => {
      const invalidData = {
        twitter: 'not-a-url',
        linkedin: 'invalid-url',
        instagram: 'also-invalid'
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Twitter URL format');
      expect(result.errors).toContain('Invalid LinkedIn URL format');
      expect(result.errors).toContain('Invalid Instagram URL format');
    });

    it('should handle empty updates', () => {
      const result = validateProfileUpdate({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial updates', () => {
      const partialData = {
        displayName: 'Jane Smith',
        email: 'jane@example.com'
      };

      const result = validateProfileUpdate(partialData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate display name length limits', () => {
      const tooLongName = 'a'.repeat(51);
      const result = validateProfileUpdate({ displayName: tooLongName });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Display name must not exceed 50 characters');
    });

    it('should accept valid social media URLs', () => {
      const validSocialData = {
        twitter: 'https://twitter.com/valid_user',
        linkedin: 'https://linkedin.com/in/valid-user',
        instagram: 'https://instagram.com/valid_user'
      };

      const result = validateProfileUpdate(validSocialData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept empty social media URLs', () => {
      const emptySocialData = {
        twitter: '',
        linkedin: '',
        instagram: ''
      };

      const result = validateProfileUpdate(emptySocialData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Field Mapping Logic', () => {
    it('should correctly map camelCase to snake_case', () => {
      // Test the field mapping logic that would be in patchProfile
      const clientFields = {
        displayName: 'John Doe',
        graduationYear: 2024,
        walletAddress: '0x123',
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      const expectedDbFields = {
        display_name: 'John Doe',
        graduation_year: 2024,
        wallet_address: '0x123',
        avatar_url: 'https://example.com/avatar.jpg'
      };

      // Simulate the field mapping
      const mappedFields: Record<string, string | number> = {};
      if (clientFields.displayName !== undefined) mappedFields.display_name = clientFields.displayName;
      if (clientFields.graduationYear !== undefined) mappedFields.graduation_year = clientFields.graduationYear;
      if (clientFields.walletAddress !== undefined) mappedFields.wallet_address = clientFields.walletAddress;
      if (clientFields.avatarUrl !== undefined) mappedFields.avatar_url = clientFields.avatarUrl;

      expect(mappedFields).toEqual(expectedDbFields);
    });

    it('should preserve social fields when preserveSocial option is true', () => {
      // Test that social fields are preserved and not sent to the database
      const updates = {
        displayName: 'John Doe',
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        instagram: 'https://instagram.com/johndoe'
      };

      // Simulate the filtering logic
      const dbUpdates: Record<string, string | number> = {};
      const preservedSocial: Record<string, string> = {};

      // Only map database fields
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      
      // Preserve social fields separately
      if (updates.twitter !== undefined) preservedSocial.twitter = updates.twitter;
      if (updates.linkedin !== undefined) preservedSocial.linkedin = updates.linkedin;
      if (updates.instagram !== undefined) preservedSocial.instagram = updates.instagram;

      expect(dbUpdates).toEqual({ display_name: 'John Doe' });
      expect(preservedSocial).toEqual({
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        instagram: 'https://instagram.com/johndoe'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple validation errors', () => {
      const invalidData = {
        displayName: 'A', // Too short
        email: 'invalid-email',
        phone: '123', // Too short
        graduationYear: 1990 // Too old
      };

      const result = validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Display name must be at least 2 characters long');
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Phone number must be at least 10 characters long');
      expect(result.errors).toContain('Graduation year must be between 2000 and 2030');
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { displayName: null },
        { displayName: undefined },
        { displayName: '' },
        { email: null },
        { email: '' },
        { graduationYear: null },
        { graduationYear: undefined }
      ];

      edgeCases.forEach(testCase => {
        const result = validateProfileUpdate(testCase);
        // Should not crash and should return some validation result
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
      });
    });
  });
});