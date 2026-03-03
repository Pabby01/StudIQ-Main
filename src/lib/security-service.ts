export const securityService = {
  sanitizeText(input: string): string {
    return input.replace(/[<>]/g, '');
  },
  sanitizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.toString();
    } catch {
      return '';
    }
  },
  isSafeInput(input: string): boolean {
    return !/[<>]/.test(input);
  },
};

export default securityService;
