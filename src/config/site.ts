/**
 * Central site configuration.
 *
 * Every theme-level setting lives here — change values in this file to
 * customize the site without touching any component.
 */

export interface NavItem {
  label: string;
  /** Internal path ('/posts') or absolute URL (opens in a new tab) */
  href: string;
}

export interface SocialLink {
  name: string;
  icon:
    | 'github'
    | 'twitter'
    | 'linkedin'
    | 'instagram'
    | 'bluesky'
    | 'mastodon'
    | 'youtube'
    | 'dribbble'
    | 'facebook'
    | 'threads'
    | 'tiktok'
    | 'twitch'
    | 'discord'
    | 'telegram'
    | 'whatsapp'
    | 'reddit'
    | 'medium'
    | 'substack'
    | 'pinterest'
    | 'behance'
    | 'spotify'
    | 'gitlab'
    | 'stackoverflow'
    | 'codepen'
    | 'globe'
    | 'mail'
    | 'rss';
  href: string;
}

export interface SiteConfig {
  /** Site name, shown in the header and metadata */
  name: string;
  /** Default <title> for the homepage */
  title: string;
  /** Default meta description */
  description: string;
  /** Absolute production URL (no trailing slash) */
  url: string;
  /** Default locale for Open Graph */
  locale: string;
  /** Colour scheme used until the visitor picks one with the header toggle */
  colorScheme: 'dark' | 'light' | 'system';

  author: {
    name: string;
    email: string;
    /** Path to avatar image (in /public) or remote URL */
    avatar: string;
    /** One-line headline under your name on the homepage (null hides it) */
    tagline: string | null;
    /**
     * Short facts shown in one line under your name on the homepage,
     * separated by dots. Inline Markdown links, `code` and **bold** work.
     */
    info: string[];
  };

  /** Social icons on the homepage and in the footer — order is display order */
  social: SocialLink[];

  navigation: NavItem[];

  home: {
    /** Number of recent posts shown under the hero (0 hides the section) */
    recentPosts: number;
    /** Number of featured projects shown under the hero (0 hides the section) */
    featuredProjects: number;
  };

  posts: {
    postsPerPage: number;
    /** Include full rendered post HTML in the RSS feed */
    rssFullContent: boolean;
  };

  footer: {
    /** First year of the copyright range, e.g. 2020 → "© 2020 – 2026" */
    since: number | null;
    /** Extra text in the footer, e.g. a license notice */
    text: string | null;
    /** Show the "Powered by Astro & Mono" credit */
    credit: boolean;
  };

  /**
   * Demo / sales mode. When `purchaseUrl` is set, the header shows a small
   * "Get this theme" button. Leave it `null` on your own site.
   */
  theme: {
    purchaseUrl: string | null;
    purchaseLabel: string;
  };

  /** Optional analytics — leave `null` to disable */
  analytics: {
    /** Cloudflare Web Analytics token */
    cloudflareToken: string | null;
    /** Google Analytics 4 measurement id (G-XXXXXXX) */
    googleAnalyticsId: string | null;
  };

  /** Toggle whole features on/off */
  features: {
    posts: boolean;
    projects: boolean;
    tags: boolean;
    /** Animated starfield behind the page */
    starfield: boolean;
    /** Very faint screentone dot overlay over the page */
    halftone: boolean;
    /** Light/dark toggle in the header (system preference is used when hidden) */
    colorSchemeToggle: boolean;
    footer: boolean;
  };
}

/**
 * `/resume` is a server-side redirect (see `astro.config.ts` and
 * `public/_redirects`) so the short link stays shareable.
 */
export const RESUME_URL =
  'https://drive.google.com/file/d/1BbZS8mHuxcgBiR5ZlOw5_cPORrJ6X3wj/view?usp=sharing';

export const siteConfig: SiteConfig = {
  name: '@milinddethe15',
  title: 'Milind Dethe',
  description:
    'Platform and DevOps engineer working on Kubernetes, AWS, and cloud-native infrastructure. CKA certified. Ex-Atlan, LFX mentee at CNCF Thanos, Kubeflow contributor.',
  url: 'https://milinddethe15.tech',
  locale: 'en_US',
  colorScheme: 'dark',

  author: {
    name: 'Milind Dethe',
    email: 'milinddethe15@gmail.com',
    avatar: '/images/dp.jpg',
    tagline: 'Building boring, reliable infrastructure for the cloud-native world.',
    info: [
      '[IIT KGP](https://www.iitkgp.ac.in/) ’26',
      'Ex-[Atlan](https://atlan.com)',
      'LFX ’24 [Thanos](https://thanos.io)',
      '[CKA](https://www.cncf.io/training/certification/cka/)',
    ],
  },

  social: [
    { name: 'GitHub', icon: 'github', href: 'https://github.com/milinddethe15' },
    { name: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/milind-dethe/' },
    { name: 'X', icon: 'twitter', href: 'https://twitter.com/milinddethe15' },
    { name: 'Email', icon: 'mail', href: 'mailto:milinddethe15@gmail.com' },
  ],

  navigation: [
    { label: 'Posts', href: '/posts' },
    { label: 'Projects', href: '/projects' },
    { label: 'Resume', href: '/resume' },
  ],

  home: {
    recentPosts: 6,
    featuredProjects: 4,
  },

  posts: {
    // One page holds every post, the way the previous site listed them.
    postsPerPage: 30,
    // Post images are root-relative, so they would break in feed readers.
    rssFullContent: false,
  },

  footer: {
    since: null,
    text: null,
    credit: true,
  },

  theme: {
    purchaseUrl: null,
    purchaseLabel: 'Get this theme',
  },

  analytics: {
    cloudflareToken: '06221de30e1e4ec2870a1f8dc46d48ed',
    googleAnalyticsId: 'G-73ZGWNVCPE',
  },

  features: {
    posts: true,
    projects: true,
    tags: true,
    starfield: true,
    halftone: true,
    colorSchemeToggle: true,
    footer: true,
  },
};
