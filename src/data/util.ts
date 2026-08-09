// Matches Hugo's urlize for the tags this site uses (lowercase, hyphenate),
// so /tags/lfx/ etc. keep their old URLs.
export const tagSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
